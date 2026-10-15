import type { SupportedLanguage } from '@/utils/language'

// 複数の画面で使う共通の短い文言（4 言語）
// translations.ts（保護対象）とは別に持つ。画面固有の文言は各ページの辞書に置く
export type CommonTextKey = 'loading' | 'pleaseWait'

export const COMMON_T: Record<SupportedLanguage, Record<CommonTextKey, string>> = {
  ja: {
    loading: '読み込み中...',
    pleaseWait: 'しばらくお待ちください...',
  },
  en: {
    loading: 'Loading...',
    pleaseWait: 'Please wait...',
  },
  ko: {
    loading: '불러오는 중...',
    pleaseWait: '잠시만 기다려 주세요...',
  },
  'zh-tw': {
    loading: '載入中...',
    pleaseWait: '請稍候...',
  },
}
