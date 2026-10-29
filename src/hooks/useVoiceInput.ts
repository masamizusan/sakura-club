'use client'

import { useEffect, useRef, useState } from 'react'
import type { SupportedLanguage } from '@/utils/language'
import { getVoiceInputLabels } from '@/lib/i18n/voiceInput'

// #24: チャット画面の音声入力（録音 → まとめて文字起こし）。チャット画面（保護対象）から切り出したもの
// 録音（MediaRecorder：webm/opus、使えなければ mp4）・波形（Safari 向けの対策入り）・止め方・文字起こし（/api/transcribe）を受け持つ
// 止め方：✓（文字にする）／✕（取り消し）／無音が 60 秒続いたら自動停止／3 分（または送れる大きさの上限）で自動停止
// 文字が届いたときの処理（入力欄に足すなど）は呼び出し側が onTranscript で決める。自動では送らない

// 無音で自動停止するまでの時間と、無音とみなす音量（0〜255 の平均）
const SILENCE_STOP_MS = 60 * 1000
const SILENCE_VOLUME_THRESHOLD = 10
// 録音の長さの上限
const MAX_RECORDING_MS = 3 * 60 * 1000
// 録音のビットレート（3 分で約 1.4MB。Vercel の本文の上限 約 4.5MB に収めるため）
const AUDIO_BITS_PER_SECOND = 64000
// 送る音声の大きさの上限（ビットレートの指定が効かないブラウザでも、本文の上限を超えないように止める）
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

// 録音のあとに出すお知らせ
//   silence：無音で自動停止した / limit：上限で自動停止した / rateLimited：回数制限（429）/ failed：失敗・文字が空
export type VoiceInputNotice = 'silence' | 'limit' | 'rateLimited' | 'failed'
type StopReason = 'manual' | 'silence' | 'limit'

type UseVoiceInputOptions = {
  language: SupportedLanguage
  onTranscript: (text: string) => void
}

export function useVoiceInput({ language, onTranscript }: UseVoiceInputOptions) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [volumeData, setVolumeData] = useState<number[]>([])
  const [notice, setNotice] = useState<VoiceInputNotice | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const limitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCancelledRef = useRef(false)
  const stopReasonRef = useRef<StopReason>('manual')
  const isMountedRef = useRef(true)
  // 録音中に言語・呼び出し側の処理が変わっても、最新のものを使う
  const languageRef = useRef(language)
  languageRef.current = language
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  // 録音リソース解放（共通）
  const cleanupRecording = () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current)
      animationIdRef.current = null
    }
    if (limitTimerRef.current) {
      clearTimeout(limitTimerRef.current)
      limitTimerRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    if (isMountedRef.current) setVolumeData([])
  }

  // 画面を離れたときは、マイク・AudioContext・タイマーを必ず止める（文字起こしは送らない）
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      isCancelledRef.current = true
      cleanupRecording()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 録音停止（確定→文字起こし）
  const stopRecording = (reason: StopReason = 'manual') => {
    isCancelledRef.current = false
    stopReasonRef.current = reason
    cleanupRecording()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  // 録音キャンセル（テキスト反映なし）
  const cancelRecording = () => {
    isCancelledRef.current = true
    cleanupRecording()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  // 録音開始（無音検知 + 波形表示）
  const startRecording = async () => {
    setNotice(null)

    try {
      // 波形・無音検知用の AudioContext は、ボタン操作の直後（マイク許可を待つ前）に作って動かす
      // Safari は操作から時間が空くと suspended のまま動かないことがあるため
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      const audioContext = new AudioCtx()
      audioContextRef.current = audioContext
      const resumePromise = audioContext.state === 'suspended'
        ? audioContext.resume().catch(() => {})
        : Promise.resolve()

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      // Chrome は webm;opus、Safari は mp4 をサポート。両方を試して使えるものを選ぶ
      const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
      // #24: ビットレートを指定して、3 分でも送れる大きさに収める
      const mediaRecorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType, audioBitsPerSecond: AUDIO_BITS_PER_SECOND })
        : new MediaRecorder(stream, { audioBitsPerSecond: AUDIO_BITS_PER_SECOND })
      mediaRecorderRef.current = mediaRecorder
      const chunks: BlobPart[] = []
      let recordedBytes = 0
      isCancelledRef.current = false
      stopReasonRef.current = 'manual'

      // 無音検知 + 波形の設定
      await resumePromise
      if (audioContext.state === 'suspended') {
        await audioContext.resume().catch(() => {})
      }
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      // Safari は出口（destination）までつながっていないと解析に音が流れないことがあるため、
      // 音量 0 の経路で destination までつなぐ（スピーカーから音は出ない）
      const silentGain = audioContext.createGain()
      silentGain.gain.value = 0
      analyser.connect(silentGain)
      silentGain.connect(audioContext.destination)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let silenceStart: number | null = null
      // 解析が実際に音を拾えているか（一度でも 0 以外の値が来たか）
      // 拾えていない間は無音の自動停止を使わない（話していても止まるのを防ぐ）
      let hasAnalyserSignal = false
      // 波形の描画用（無音判定には使わない）: 直近の最大音量に合わせて表示を自動拡大する
      // Safari は同じ声でも解析値が小さく出るため、端末判定ではなく実測値に合わせて拡大率を決める
      const WAVE_MIN_PEAK = 0.12     // これより小さい音は拡大しすぎない（雑音でバーが伸びるのを防ぐ）
      const WAVE_PEAK_DECAY = 0.995  // 最大値を少しずつ下げて、声が小さくなっても追従させる
      const WAVE_MAX_RATIO = 0.85    // 一番大きい声でも上限の 85% に収める（振り切れ防止）
      const WAVE_MIN_BAR = 0.05      // バーの最小の高さ（無音のときもこの高さ）
      let wavePeak = WAVE_MIN_PEAK

      const checkSilence = () => {
        analyser.getByteFrequencyData(dataArray)
        const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        if (!hasAnalyserSignal && dataArray.some(v => v > 0)) {
          hasAnalyserSignal = true
        }

        // 波形データを蓄積（左→右に積み上げ）
        // #24: 無音とみなす音量（しきい値未満）は最小の高さで描き、拡大の基準（wavePeak）にも使わない
        // （iPhone では小さな雑音まで拡大されて、話していないのに波形が高く見えたため）
        let newBar = WAVE_MIN_BAR
        if (volume >= SILENCE_VOLUME_THRESHOLD) {
          const currentVolume = volume / 255
          wavePeak = Math.max(currentVolume, wavePeak * WAVE_PEAK_DECAY, WAVE_MIN_PEAK)
          newBar = Math.max(WAVE_MIN_BAR, Math.min(1, currentVolume / wavePeak) * WAVE_MAX_RATIO)
        }
        setVolumeData(prev => {
          const updated = [...prev, newBar]
          return updated.length > 40 ? updated.slice(-40) : updated
        })

        if (!hasAnalyserSignal) {
          silenceStart = null
        } else if (volume < SILENCE_VOLUME_THRESHOLD) {
          if (silenceStart === null) silenceStart = Date.now()
          if (Date.now() - silenceStart >= SILENCE_STOP_MS) {
            stopRecording('silence')
            return
          }
        } else {
          silenceStart = null
        }

        animationIdRef.current = requestAnimationFrame(checkSilence)
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
          recordedBytes += e.data.size
          // 送れる大きさの上限に近づいたら、3 分の上限と同じ扱いで止める
          if (recordedBytes >= MAX_UPLOAD_BYTES && mediaRecorder.state !== 'inactive') {
            stopRecording('limit')
          }
        }
      }

      mediaRecorder.onstop = async () => {
        if (!isMountedRef.current) return
        setIsRecording(false)
        setVolumeData([])

        // キャンセル時は文字起こしに送らない
        if (isCancelledRef.current || chunks.length === 0) return

        const stopReason = stopReasonRef.current
        setIsTranscribing(true)
        const actualMimeType = mediaRecorder.mimeType || 'audio/webm'
        const blob = new Blob(chunks, { type: actualMimeType })
        const fileExtension = actualMimeType.includes('mp4') ? 'mp4' : 'webm'
        const formData = new FormData()
        formData.append('audio', blob, `recording.${fileExtension}`)
        const currentLanguage = languageRef.current
        const whisperLang = currentLanguage === 'ja' ? 'ja'
          : currentLanguage === 'ko' ? 'ko'
          : currentLanguage === 'zh-tw' ? 'zh'
          : 'en'
        formData.append('language', whisperLang)

        let text: string | null = null
        let failure: VoiceInputNotice | null = null
        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          })
          if (res.status === 429) {
            failure = 'rateLimited'
          } else if (!res.ok) {
            failure = 'failed'
          } else {
            const data = await res.json()
            if (typeof data.text === 'string' && data.text.trim() !== '') {
              text = data.text
            } else {
              failure = 'failed'
            }
          }
        } catch (err) {
          console.error('Whisper transcription error:', err)
          failure = 'failed'
        }

        if (!isMountedRef.current) return
        setIsTranscribing(false)
        if (text) {
          onTranscriptRef.current(text)
        }
        // 失敗のお知らせを優先。成功したときは、自動停止した理由だけを知らせる
        setNotice(
          failure
            ?? (stopReason === 'silence' ? 'silence' : stopReason === 'limit' ? 'limit' : null)
        )
      }

      mediaRecorder.start(250)
      setIsRecording(true)
      animationIdRef.current = requestAnimationFrame(checkSilence)
      // 長さの上限で自動停止
      limitTimerRef.current = setTimeout(() => {
        limitTimerRef.current = null
        stopRecording('limit')
      }, MAX_RECORDING_MS)
    } catch (err) {
      console.error('Microphone access error:', err)
      // マイク許可前に作った AudioContext などを解放する
      cleanupRecording()
      alert(getVoiceInputLabels(languageRef.current).notSupported)
    }
  }

  // マイクボタン：録音中なら止めて文字にする、そうでなければ録音を始める
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
      return
    }
    startRecording()
  }

  return {
    isRecording,
    isTranscribing,
    volumeData,
    notice,
    startRecording,
    stopRecording: () => stopRecording('manual'),
    cancelRecording,
    toggleRecording,
    dismissNotice: () => setNotice(null),
  }
}

export type VoiceInput = ReturnType<typeof useVoiceInput>
