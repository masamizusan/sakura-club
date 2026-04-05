'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Send, ArrowLeft, Heart, User, Mic, Camera, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import { useLanguage } from '@/contexts/LanguageContext'
import { getNationalityLabel } from '@/utils/nationalityTranslations'
import { createClient } from '@/lib/supabase/client'

const messagesTranslations: Record<string, Record<string, string>> = {
  ja: {
    pageTitle: 'メッセージ',
    searchPlaceholder: '会話を検索...',
    noMessages: 'メッセージがありません',
    matchedOn: '{date} にマッチしました',
    messagePlaceholder: 'メッセージを入力...',
    yearsOld: '歳',
    online: 'オンライン',
    sendError: 'メッセージの送信に失敗しました。もう一度お試しください。',
    loading: '読み込み中...',
    translating: '翻訳中...',
    translateError: '翻訳に失敗しました',
    showOriginal: '原文を表示',
    showTranslation: '翻訳を表示',
    voiceNotSupported: 'お使いのブラウザは音声入力に対応していません。',
    stop: '停止',
    previewTranslation: '翻訳確認',
    verificationRequired: 'メッセージを送るには本人年齢確認が必要です',
    verificationPending: '年齢確認の審査中です。審査完了後にメッセージを送れます',
    registerId: '年齢確認を行う',
  },
  en: {
    pageTitle: 'Messages',
    searchPlaceholder: 'Search conversations...',
    noMessages: 'No messages yet',
    matchedOn: 'Matched on {date}',
    messagePlaceholder: 'Type a message...',
    yearsOld: 'y/o',
    online: 'Online',
    sendError: 'Failed to send message. Please try again.',
    loading: 'Loading...',
    translating: 'Translating...',
    translateError: 'Translation failed',
    showOriginal: 'Show original',
    showTranslation: 'Show translation',
    voiceNotSupported: 'Your browser does not support voice input.',
    stop: 'Stop',
    previewTranslation: 'Translate',
    verificationRequired: 'Age verification is required to send messages',
    verificationPending: 'Age verification is under review. You can send messages once approved.',
    registerId: 'Verify Age',
  },
  ko: {
    pageTitle: '메시지',
    searchPlaceholder: '대화 검색...',
    noMessages: '메시지가 없습니다',
    matchedOn: '{date}에 매칭되었습니다',
    messagePlaceholder: '메시지를 입력...',
    yearsOld: '세',
    online: '온라인',
    sendError: '메시지 전송에 실패했습니다. 다시 시도해주세요.',
    loading: '로딩 중...',
    translating: '번역 중...',
    translateError: '번역 실패',
    showOriginal: '원문 보기',
    showTranslation: '번역 보기',
    voiceNotSupported: '브라우저가 음성 입력을 지원하지 않습니다.',
    stop: '정지',
    previewTranslation: '번역 확인',
    verificationRequired: '메시지를 보내려면 나이 확인이 필요합니다',
    verificationPending: '나이 확인 심사 중입니다. 심사 완료 후 메시지를 보낼 수 있습니다.',
    registerId: '나이 확인하기',
  },
  'zh-tw': {
    pageTitle: '訊息',
    searchPlaceholder: '搜尋對話...',
    noMessages: '沒有訊息',
    matchedOn: '於 {date} 配對成功',
    messagePlaceholder: '輸入訊息...',
    yearsOld: '歲',
    online: '線上',
    sendError: '訊息發送失敗，請再試一次。',
    loading: '載入中...',
    translating: '翻譯中...',
    translateError: '翻譯失敗',
    showOriginal: '顯示原文',
    showTranslation: '顯示翻譯',
    voiceNotSupported: '您的瀏覽器不支援語音輸入。',
    stop: '停止',
    previewTranslation: '翻譯確認',
    verificationRequired: '發送訊息需要進行年齡確認',
    verificationPending: '年齡確認審查中。審查完成後即可發送訊息。',
    registerId: '進行年齡確認',
  },
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { currentLanguage } = useLanguage()
  const conversationId = params?.conversationId as string

  const [messages, setMessages] = useState<any[]>([])
  const [conversation, setConversation] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState<boolean>(true) // trueで初期化してフラッシュを防ぐ
  const [verificationStatus, setVerificationStatus] = useState<string>('unverified')

  // 翻訳関連のstate
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({})
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set())
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({})

  // 送信前翻訳プレビュー
  const [previewTranslation, setPreviewTranslation] = useState<string | null>(null)
  const [isTranslatingPreview, setIsTranslatingPreview] = useState(false)

  // 画像送信
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 音声入力（Whisper API + 無音検知）
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [volumeData, setVolumeData] = useState<number[]>([])
  const [isCancelled, setIsCancelled] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const isCancelledRef = useRef(false)

  // textarea ref
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自動スクロール用のref
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 画像選択処理
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // 画像送信処理
  const handleImageSend = async () => {
    if (!selectedImage || isUploadingImage) return
    setIsUploadingImage(true)
    try {
      const supabase = createClient()
      const fileName = `${Date.now()}_${selectedImage.name}`
      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(`${conversationId}/${fileName}`, selectedImage)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(data.path)

      // 画像URLをメッセージとして送信
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '', image_url: publicUrl }),
      })
      if (response.ok) {
        const result = await response.json()
        setMessages(prev => [...prev, result.data])
        setSelectedImage(null)
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Image upload error:', error)
    } finally {
      setIsUploadingImage(false)
    }
  }

  // 原文↔翻訳トグル
  const toggleTranslation = (messageId: string) => {
    setShowOriginal(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }))
  }

  // 翻訳関数
  const t = (key: string, params?: Record<string, string | number>) => {
    const lang = messagesTranslations[currentLanguage] ? currentLanguage : 'ja'
    let text = messagesTranslations[lang][key] || messagesTranslations['ja'][key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    return text
  }

  // ロケール取得
  const getLocale = () => {
    switch (currentLanguage) {
      case 'en': return 'en-US'
      case 'ko': return 'ko-KR'
      case 'zh-tw': return 'zh-TW'
      default: return 'ja-JP'
    }
  }

  // 現在のログインユーザーIDと認証状態を取得
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      // 身分証認証状態を取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_verified, verification_status')
        .eq('id', user.id)
        .single()

      if (profile) {
        setIsVerified(profile.is_verified === true)
        setVerificationStatus(profile.verification_status || 'unverified')
      }
    }
    fetchCurrentUser()
  }, [])

  // キャッシュから翻訳をまとめて取得
  const fetchCachedTranslations = async (msgs: any[]) => {
    if (!msgs || msgs.length === 0) return

    const messageIds = msgs.map(m => m.id)
    const supabase = createClient()

    const { data } = await supabase
      .from('message_translations')
      .select('message_id, translated_text')
      .in('message_id', messageIds)
      .eq('language', currentLanguage)

    if (data && data.length > 0) {
      const cached: Record<string, string> = {}
      data.forEach(t => {
        cached[t.message_id] = t.translated_text
      })
      setTranslatedMessages(prev => ({ ...prev, ...cached }))
    }
  }

  // 相手のメッセージを自動翻訳（未翻訳のみ）
  const autoTranslateMessages = async (msgs: any[], myId: string, existingTranslations?: Record<string, string>) => {
    const translations = existingTranslations || translatedMessages
    const partnerMessages = msgs.filter(m => m.senderId !== myId && !translations[m.id])

    for (const msg of partnerMessages) {
      try {
        const response = await fetch('/api/translate/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: msg.id,
            text: msg.content,
            targetLanguage: currentLanguage,
          }),
        })
        const result = await response.json()
        if (result.translatedText) {
          setTranslatedMessages(prev => ({
            ...prev,
            [msg.id]: result.translatedText
          }))
        }
        // キャッシュヒットでなければ300ms待機（レート制限対策）
        if (!result.cached) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      } catch (error) {
        console.error('Auto translation error:', error)
      }
    }
  }

  // メッセージ読み込み完了時にスクロール
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom()
    }
  }, [messages, isLoading])

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/messages/${conversationId}`)
        const result = await response.json()
        if (response.ok && result.messages) {
          setMessages(result.messages)
          setConversation(result.conversation || null)

          // キャッシュから翻訳を即座に取得
          const supabase = createClient()
          const messageIds = result.messages.map((m: any) => m.id)
          const { data: cachedData } = await supabase
            .from('message_translations')
            .select('message_id, translated_text')
            .in('message_id', messageIds)
            .eq('language', currentLanguage)

          const cachedTranslations: Record<string, string> = {}
          if (cachedData && cachedData.length > 0) {
            cachedData.forEach(t => {
              cachedTranslations[t.message_id] = t.translated_text
            })
            setTranslatedMessages(prev => ({ ...prev, ...cachedTranslations }))
          }

          // 未翻訳のメッセージだけ新たに翻訳
          if (currentUserId) {
            autoTranslateMessages(result.messages, currentUserId, cachedTranslations)
          }
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMessages()
  }, [conversationId, currentUserId])

  // 会話を開いたら新規マッチフラグを既読に更新
  useEffect(() => {
    if (!conversationId) return
    fetch('/api/conversations/seen', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId }),
    }).catch(() => {})
  }, [conversationId])

  // リアルタイムメッセージ受信
  useEffect(() => {
    if (!conversationId || !currentUserId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const newMessage = {
            id: payload.new.id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            image_url: payload.new.image_url || null,
            timestamp: payload.new.created_at,
            isRead: false,
          }
          // 自分が送ったメッセージは既に追加済みなのでスキップ
          if (newMessage.senderId === currentUserId) return

          setMessages(prev => [...prev, newMessage])

          // 相手のメッセージは自動翻訳
          autoTranslateMessages([newMessage], currentUserId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, currentLanguage])

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return
    try {
      setIsSending(true)
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      })
      const result = await response.json()
      if (response.ok) {
        setMessages(prev => [...prev, result.data])
        setNewMessage('')
        if (textareaRef.current) {
          textareaRef.current.style.height = '40px'
        }
      } else {
        alert(t('sendError'))
      }
    } catch (error) {
      console.error(error)
      alert(t('sendError'))
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })
  }

  const formatMatchDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(getLocale())
  }

  // 送信前の翻訳プレビュー
  const handlePreviewTranslation = async () => {
    if (!newMessage.trim()) return

    setIsTranslatingPreview(true)
    setPreviewTranslation(null)

    try {
      const response = await fetch('/api/translate/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: `preview-${Date.now()}`,
          text: newMessage.trim(),
          targetLanguage: currentLanguage === 'ja' ? 'en' : 'ja',
        }),
      })
      const result = await response.json()
      setPreviewTranslation(result.translatedText || null)
    } catch (error) {
      console.error('Preview translation error:', error)
    } finally {
      setIsTranslatingPreview(false)
    }
  }

  // 録音リソース解放（共通）
  const cleanupRecording = () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current)
      animationIdRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    setVolumeData([])
  }

  // 録音停止（確定→Whisper送信）
  const stopRecording = () => {
    isCancelledRef.current = false
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

  // 音声入力（Whisper API + 無音検知 + 波形表示）
  const handleVoiceInput = async () => {
    if (isRecording) {
      stopRecording()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      const chunks: BlobPart[] = []
      isCancelledRef.current = false

      // 無音検知 + 波形の設定
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let silenceStart: number | null = Date.now()

      const checkSilence = () => {
        analyser.getByteFrequencyData(dataArray)
        const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length

        // 波形データを蓄積（左→右に積み上げ）
        const currentVolume = volume / 255
        const newBar = Math.max(0.05, currentVolume)
        setVolumeData(prev => {
          const updated = [...prev, newBar]
          return updated.length > 40 ? updated.slice(-40) : updated
        })

        if (volume < 10) {
          if (silenceStart === null) silenceStart = Date.now()
          if (Date.now() - silenceStart >= 8000) {
            stopRecording()
            return
          }
        } else {
          silenceStart = null
        }

        animationIdRef.current = requestAnimationFrame(checkSilence)
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false)
        setVolumeData([])

        // キャンセル時はWhisper送信しない
        if (isCancelledRef.current || chunks.length === 0) return

        setIsTranscribing(true)
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('audio', blob, 'recording.webm')
        const whisperLang = currentLanguage === 'ja' ? 'ja'
          : currentLanguage === 'ko' ? 'ko'
          : currentLanguage === 'zh-tw' ? 'zh'
          : 'en'
        formData.append('language', whisperLang)

        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          })
          const data = await res.json()
          if (data.text) {
            setNewMessage(prev => prev ? prev + ' ' + data.text : data.text)
            setPreviewTranslation(null)
          }
        } catch (err) {
          console.error('Whisper transcription error:', err)
        } finally {
          setIsTranscribing(false)
          // textareaが再表示された後に高さ調整（複数回リトライで確実に反映）
          const adjustHeight = () => {
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto'
              textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
            }
          }
          setTimeout(adjustHeight, 100)
          setTimeout(adjustHeight, 300)
          setTimeout(adjustHeight, 500)
        }
      }

      mediaRecorder.start(250)
      setIsRecording(true)
      animationIdRef.current = requestAnimationFrame(checkSilence)
    } catch (err) {
      console.error('Microphone access error:', err)
      alert(t('voiceNotSupported'))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar className="w-64 hidden md:block" />
      <div className="md:ml-64 fixed inset-0 md:left-64 flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center space-x-3">
          <button onClick={() => router.push('/messages')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {conversation?.partnerAvatar ? (
            <img src={conversation.partnerAvatar} alt={conversation.partnerName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 bg-sakura-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-sakura-600" />
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{conversation?.partnerName || t('loading')}</p>
            {conversation && (
              <p className="text-sm text-gray-500">
                {conversation.partnerNationality && conversation.partnerNationality !== '未設定' && (
                  <>{getNationalityLabel(conversation.partnerNationality, currentLanguage)} · </>
                )}
                {conversation.partnerAge && <>{conversation.partnerAge}{t('yearsOld')}</>}
              </p>
            )}
          </div>
        </div>

        {/* メッセージ一覧 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl w-full mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-sakura-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {conversation?.matchedDate && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center bg-sakura-50 text-sakura-700 px-4 py-2 rounded-full text-sm">
                    <Heart className="w-4 h-4 mr-2 fill-current" />
                    {t('matchedOn', { date: formatMatchDate(conversation.matchedDate) })}
                  </div>
                </div>
              )}
              {messages.map((message) => {
                const isMyMessage = currentUserId && message.senderId === currentUserId
                const isTranslating = translatingIds.has(message.id)
                const hasTranslation = translatedMessages[message.id]

                return (
                  <div key={message.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                    {isMyMessage ? (
                      // 自分のメッセージ（翻訳機能なし）
                      <div className="max-w-[75%] px-4 py-2 rounded-2xl bg-sakura-100 text-sakura-900 break-words">
                        {message.image_url ? (
                          <img
                            src={message.image_url}
                            className="max-w-xs rounded-lg cursor-pointer"
                            onClick={() => window.open(message.image_url, '_blank')}
                            alt=""
                          />
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
                        <p className="text-xs mt-1 text-sakura-400">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    ) : (
                      // 相手のメッセージ（翻訳トグル付き）
                      <div
                        onClick={() => !message.image_url && toggleTranslation(message.id)}
                        className="max-w-[75%] px-4 py-2 rounded-2xl bg-white text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50 transition-all break-words"
                      >
                        {message.image_url ? (
                          <img
                            src={message.image_url}
                            className="max-w-xs rounded-lg cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); window.open(message.image_url, '_blank') }}
                            alt=""
                          />
                        ) : (
                          <>
                            {/* 翻訳中表示 */}
                            {isTranslating && (
                              <p className="text-xs text-gray-500 italic flex items-center mb-1">
                                <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1"></span>
                                {t('translating')}
                              </p>
                            )}

                            {/* 翻訳がある場合：デフォルトで翻訳表示、タップで原文表示 */}
                            {hasTranslation && !showOriginal[message.id] ? (
                              <>
                                <p className="text-sm">{translatedMessages[message.id]}</p>
                                <p className="text-xs text-blue-500 mt-1">{t('showOriginal')}</p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm">{message.content}</p>
                                {hasTranslation && (
                                  <p className="text-xs text-blue-500 mt-1">{t('showTranslation')}</p>
                                )}
                              </>
                            )}
                          </>
                        )}

                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
              {/* 自動スクロール用のアンカー */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 入力欄 */}
        {!isVerified ? (
          /* 未認証バナー */
          <div className="bg-yellow-50 border-t border-yellow-200 p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-800 flex-1">
                {verificationStatus === 'pending' || verificationStatus === 'requires_review'
                  ? t('verificationPending')
                  : t('verificationRequired')}
              </p>
              {verificationStatus !== 'pending' && verificationStatus !== 'requires_review' && (
                <Link
                  href="/verification"
                  className="text-xs bg-sakura-500 text-white px-4 py-2 rounded-full font-medium hover:bg-sakura-600 transition-colors flex-shrink-0"
                >
                  {t('registerId')}
                </Link>
              )}
            </div>
          </div>
        ) : (
        <div className="bg-white border-t border-gray-200 p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="max-w-2xl mx-auto">

            {/* 翻訳プレビュー表示 */}
            {(previewTranslation || isTranslatingPreview) && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-400 mb-1">
                  {currentLanguage === 'ja' ? '英語での表示：' : '日本語での表示：'}
                </p>
                {isTranslatingPreview ? (
                  <p className="text-sm text-gray-400 italic">{t('translating')}</p>
                ) : (
                  <p className="text-sm text-gray-700">{previewTranslation}</p>
                )}
              </div>
            )}

            {/* 画像プレビュー */}
            {imagePreview && (
              <div className="mb-3 relative inline-block">
                <img src={imagePreview} className="h-20 w-20 object-cover rounded-lg border border-gray-200" alt="" />
                <button
                  onClick={() => { setSelectedImage(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="absolute -top-2 -right-2 bg-gray-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >×</button>
              </div>
            )}

            {/* 入力エリア */}
            <div className="relative">
              {/* 録音中の波形オーバーレイ */}
              {isRecording && (
                <div className="flex items-center gap-3 px-4 py-3 bg-pink-50 border border-pink-200 rounded-lg">
                  {/* 波形（左〜中央） */}
                  <div className="flex-1 flex items-end justify-start gap-[2px] h-10 overflow-hidden">
                    {Array.from({ length: 40 - volumeData.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-[3px] rounded-full bg-pink-200" style={{ height: '4px' }} />
                    ))}
                    {volumeData.map((v, i) => (
                      <div
                        key={i}
                        className="w-[3px] rounded-full bg-pink-400"
                        style={{ height: `${Math.max(4, v * 40)}px` }}
                      />
                    ))}
                  </div>

                  {/* キャンセル・確定ボタンを右側に並べる */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={cancelRecording}
                      className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                      <span className="text-lg">✕</span>
                    </button>
                    <button
                      onClick={stopRecording}
                      className="p-2 rounded-full bg-pink-500 text-white hover:bg-pink-600"
                    >
                      <span className="text-lg">✓</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 文字起こし中の表示 */}
              {isTranscribing && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-pink-500">
                  <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                  {currentLanguage === 'ja' ? '文字起こし中...' : 'Transcribing...'}
                </div>
              )}

              {/* 通常の入力エリア（録音中・文字起こし中は非表示） */}
              {!isRecording && !isTranscribing && (
              <div className="flex items-end space-x-2">
              {/* カメラボタン */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 hover:text-sakura-600 p-2 flex-shrink-0"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {imagePreview ? (
                // 画像選択時は送信ボタンのみ表示
                <Button onClick={handleImageSend} disabled={isUploadingImage} variant="sakura" className="flex-shrink-0">
                  {isUploadingImage ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              ) : (
                // 通常の入力欄・マイク・翻訳確認・送信ボタン
                <>
                  <textarea
                    ref={textareaRef}
                    placeholder={t('messagePlaceholder')}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value)
                      setPreviewTranslation(null)
                      e.target.style.height = 'auto'
                      e.target.style.height = `${e.target.scrollHeight}px`
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    rows={1}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{
                      resize: 'none',
                      minHeight: '40px',
                    }}
                  />

                  {/* マイクボタン */}
                  <Button
                    onClick={handleVoiceInput}
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0 text-gray-500 border-gray-300 hover:bg-gray-50"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>

                  {/* 翻訳確認ボタン */}
                  <Button
                    onClick={handlePreviewTranslation}
                    disabled={!newMessage.trim() || isTranslatingPreview}
                    variant="outline"
                    size="sm"
                    className="text-sakura-600 border-sakura-300 hover:bg-sakura-50 flex-shrink-0"
                  >
                    {isTranslatingPreview ? (
                      <div className="w-4 h-4 border-2 border-sakura-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      t('previewTranslation')
                    )}
                  </Button>

                  {/* 送信ボタン */}
                  <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || isSending}
                    variant="sakura"
                    className="flex-shrink-0"
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </>
              )}
              </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
