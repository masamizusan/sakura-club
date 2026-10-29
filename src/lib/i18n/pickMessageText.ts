import { detectScriptLang } from '@/lib/translation/detectScript'

// #15 第2段階：相手のメッセージにどの文を出すかを決める（チャット画面とメッセージ一覧で共通）
// readLang = 自分が読む言語（自分の国籍の言語。translationLang.ts の getLangFromNationality）
//   1. 送信時の訳があり、translated_lang が readLang と同じ → 送信時の訳
//   2. readLang の受け手側の訳（message_translations）がある → それ
//   3. 原文がもともと readLang（文字の種類で判定できる ja / ko だけ）→ 原文。翻訳 API も呼ばない
//   4. それ以外 → 原文を出しておき、readLang で訳す（needsTranslation = true）
// translated_lang が NULL の行（#15 より前の訳）は言語が分からないので「合わない」扱い（2〜4 へ）
// 自分のメッセージには使わない（自分のメッセージは常に原文）

export type PickableMessage = {
  content: string | null | undefined
  translated_content?: string | null
  translated_lang?: string | null
}

export type PickedMessageText = {
  text: string | null
  source: 'sent' | 'receiver' | 'original'
  needsTranslation: boolean
}

export function pickMessageText(
  message: PickableMessage,
  readLang: string,
  receiverTranslation?: string | null,
): PickedMessageText {
  if (message.translated_content && message.translated_lang === readLang) {
    return { text: message.translated_content, source: 'sent', needsTranslation: false }
  }
  if (receiverTranslation) {
    return { text: receiverTranslation, source: 'receiver', needsTranslation: false }
  }

  const content = message.content ?? null
  // 文字が空のメッセージ（画像だけなど）は訳さない（翻訳 API が 400 を返すため。#59）
  if (typeof content !== 'string' || content.trim() === '') {
    return { text: content, source: 'original', needsTranslation: false }
  }
  if (detectScriptLang(content) === readLang) {
    return { text: content, source: 'original', needsTranslation: false }
  }
  return { text: content, source: 'original', needsTranslation: true }
}
