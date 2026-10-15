import { getLanguageFromNationality, type SupportedLanguage } from '@/utils/language'

// #15 第1段階：チャットの翻訳先・読む言語を国籍から決める
// 国籍（DB には日本語の国名で保存）→ 言語：日本→ja、韓国→ko、台湾→zh-tw、それ以外・空→en
// 判定は utils/language.ts の getLanguageFromNationality をそのまま使う

export const TRANSLATION_LANGS: readonly SupportedLanguage[] = ['ja', 'en', 'ko', 'zh-tw']

export function isTranslationLang(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && (TRANSLATION_LANGS as readonly string[]).includes(value)
}

export function getLangFromNationality(nationality: string | null | undefined): SupportedLanguage {
  return getLanguageFromNationality(nationality)
}

// 送信前の確認（プレビュー）の見出し：訳した言語の名前を出す
const PREVIEW_LABELS: Record<SupportedLanguage, string> = {
  en: 'English:',
  ja: '日本語：',
  ko: '한국어:',
  'zh-tw': '繁體中文：',
}

export function getPreviewLabelForLang(lang: SupportedLanguage): string {
  return PREVIEW_LABELS[lang] ?? PREVIEW_LABELS.en
}
