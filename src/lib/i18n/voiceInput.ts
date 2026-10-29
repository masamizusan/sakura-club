import type { SupportedLanguage } from '@/utils/language'

// #24: 音声入力（チャット画面）の文。表示言語はチャット画面のほかの文と同じ（画面の表示言語。無ければ日本語）
export type VoiceInputLabels = {
  listening: string
  transcribing: string
  notSupported: string
  silenceStopped: string
  retry: string
  limitStopped: string
  rateLimited: string
  failed: string
  cancel: string
  confirm: string
  close: string
}

const VOICE_INPUT_LABELS: Record<SupportedLanguage, VoiceInputLabels> = {
  ja: {
    listening: '聞き取り中…',
    transcribing: '文字起こし中...',
    notSupported: 'お使いのブラウザは音声入力に対応していません。',
    silenceStopped: '1分間言葉が聞き取れなかったため、音声入力を停止しました。ここまでの内容はメッセージ欄に入力されています。',
    retry: 'もう一度音声入力',
    limitStopped: '録音の上限（3分）に達したため停止しました。',
    rateLimited: '回数が多すぎます。しばらくしてからもう一度お試しください。',
    failed: 'うまく聞き取れませんでした。もう一度お試しください。',
    cancel: '取り消す',
    confirm: '文字にする',
    close: '閉じる',
  },
  en: {
    listening: 'Listening…',
    transcribing: 'Transcribing...',
    notSupported: 'Your browser does not support voice input.',
    silenceStopped: 'Voice input stopped because no speech was detected for 1 minute. What you said so far has been added to the message box.',
    retry: 'Try voice input again',
    limitStopped: 'Recording stopped because it reached the 3-minute limit.',
    rateLimited: 'Too many requests. Please wait a moment and try again.',
    failed: "We couldn't catch that. Please try again.",
    cancel: 'Cancel',
    confirm: 'Convert to text',
    close: 'Close',
  },
  ko: {
    listening: '듣는 중…',
    transcribing: '음성 변환 중...',
    notSupported: '브라우저가 음성 입력을 지원하지 않습니다.',
    silenceStopped: '1분 동안 음성이 인식되지 않아 음성 입력을 중지했습니다. 지금까지의 내용은 메시지 입력란에 입력되어 있습니다.',
    retry: '다시 음성 입력',
    limitStopped: '녹음 한도(3분)에 도달하여 중지했습니다.',
    rateLimited: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    failed: '잘 알아듣지 못했습니다. 다시 시도해 주세요.',
    cancel: '취소',
    confirm: '텍스트로 변환',
    close: '닫기',
  },
  'zh-tw': {
    listening: '聆聽中…',
    transcribing: '語音轉文字中...',
    notSupported: '您的瀏覽器不支援語音輸入。',
    silenceStopped: '因為 1 分鐘內都沒有聽到說話聲，已停止語音輸入。目前為止的內容已輸入到訊息欄。',
    retry: '再次語音輸入',
    limitStopped: '已達錄音上限（3 分鐘），已停止錄音。',
    rateLimited: '次數過多，請稍後再試。',
    failed: '無法辨識語音，請再試一次。',
    cancel: '取消',
    confirm: '轉成文字',
    close: '關閉',
  },
}

export function getVoiceInputLabels(language: SupportedLanguage): VoiceInputLabels {
  return VOICE_INPUT_LABELS[language] ?? VOICE_INPUT_LABELS.ja
}
