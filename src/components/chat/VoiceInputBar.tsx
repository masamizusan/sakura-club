'use client'

import type { VoiceInput } from '@/hooks/useVoiceInput'
import type { VoiceInputLabels } from '@/lib/i18n/voiceInput'

// #24: チャット画面の音声入力の表示（チャット画面から切り出したもの）
// 録音中：波形 ＋「聞き取り中…」＋ ✕（取り消し）・✓（文字にする）
// 文字起こし中：スピナー ＋「文字起こし中...」
// 録音のあと：お知らせ（無音・上限で自動停止した／回数制限／失敗）。✕ で閉じる。無音のときは「もう一度音声入力」
export default function VoiceInputBar({ voice, labels }: { voice: VoiceInput; labels: VoiceInputLabels }) {
  const { isRecording, isTranscribing, volumeData, notice } = voice

  if (isRecording) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-[#fdf6ef] border border-[#d4a89a] rounded-lg">
        {/* 波形（左〜中央） */}
        <div className="flex-1 flex items-end justify-start gap-[2px] h-10 overflow-hidden">
          {Array.from({ length: 40 - volumeData.length }).map((_, i) => (
            <div key={`empty-${i}`} className="w-[3px] rounded-full bg-[#d4a89a]" style={{ height: '4px' }} />
          ))}
          {volumeData.map((v, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-[#8b1a2e]"
              style={{ height: `${Math.max(4, v * 40)}px` }}
            />
          ))}
        </div>

        <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-sub)' }}>
          {labels.listening}
        </span>

        {/* キャンセル・確定ボタンを右側に並べる */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={voice.cancelRecording}
            aria-label={labels.cancel}
            className="p-2 rounded-full transition-colors"
            style={{ color: 'var(--color-text-sub)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#ede0d4')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            <span className="text-lg">✕</span>
          </button>
          <button
            onClick={voice.stopRecording}
            aria-label={labels.confirm}
            className="p-2 rounded-full bg-[#8b1a2e] text-white hover:bg-[#6e1525]"
          >
            <span className="text-lg">✓</span>
          </button>
        </div>
      </div>
    )
  }

  if (isTranscribing) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-sm" style={{ color: 'var(--color-primary)' }}>
        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        {labels.transcribing}
      </div>
    )
  }

  if (!notice) return null

  const noticeText = {
    silence: labels.silenceStopped,
    limit: labels.limitStopped,
    rateLimited: labels.rateLimited,
    failed: labels.failed,
  }[notice]

  return (
    <div
      role="status"
      className="flex items-start gap-2 mb-2 px-3 py-2 rounded-lg text-sm"
      style={{ backgroundColor: '#fdf6ef', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
    >
      <div className="flex-1">
        <p>{noticeText}</p>
        {notice === 'silence' && (
          <button
            onClick={voice.startRecording}
            className="mt-1 underline text-[#8b1a2e]"
          >
            {labels.retry}
          </button>
        )}
      </div>
      <button
        onClick={voice.dismissNotice}
        aria-label={labels.close}
        className="flex-shrink-0 px-1"
        style={{ color: 'var(--color-text-sub)' }}
      >
        ✕
      </button>
    </div>
  )
}
