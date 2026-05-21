/**
 * マッチ成立モーダル UI の4言語ラベル集。
 *
 * profile/[id]/page.tsx の handleLike が `result.matched === true` を受けた時に
 * 表示する祝福モーダル専用。これまでの `window.alert('It's a match!...')` を
 * 置き換える(ブラウザネイティブ alert はボタン文言が OS 言語固定で多言語化不能、
 * かつブランド毀損のため)。
 *
 * 設計判断:
 *   - 旧 `matchedTexts`(profile/[id]/page.tsx L188-194 にあった4言語テキスト) を
 *     吸収して廃止する。同等内容はここに集約。
 *   - blockI18n.ts / reportModalI18n.ts と同じ per-util Dict + getter パターン。
 *   - 未対応言語は ja にフォールバック。
 *
 * 翻訳品質メモ:
 *   ja は旧 matchedTexts.ja の喜びトーンを維持しつつ、CTA 導線(メッセージを送る)
 *   が前提のため短文化。en/ko/zh-tw は自然な祝福表現+CTA 動詞に統一。
 *   将来ネイティブレビューは別タスク。
 */

import type { SupportedLanguage } from '@/utils/language'

export interface MatchModalLabels {
  heading: string             // 「マッチしました！」「It's a match!」等(深紅、Shippori Mincho B1)
  subheading: string          // 「メッセージを送って会話を始めましょう」等(控えめなグレー)
  sendMessageButton: string   // 主 CTA「メッセージを送る」(深紅 → /messages/{conversationId} 遷移)
  laterButton: string         // 副ボタン「あとで」(グレー、モーダル閉じるのみ)
  closeAriaLabel: string      // 右上 ✕ ボタンの aria-label
}

export const MATCH_MODAL_LABELS: Record<SupportedLanguage, MatchModalLabels> = {
  ja: {
    heading: 'マッチしました！',
    subheading: 'メッセージを送って会話を始めましょう',
    sendMessageButton: 'メッセージを送る',
    laterButton: 'あとで',
    closeAriaLabel: '閉じる',
  },
  en: {
    heading: "It's a match!",
    subheading: 'Send a message to start chatting',
    sendMessageButton: 'Send a message',
    laterButton: 'Later',
    closeAriaLabel: 'Close',
  },
  ko: {
    heading: '매칭되었습니다!',
    subheading: '메시지를 보내 대화를 시작해 보세요',
    sendMessageButton: '메시지 보내기',
    laterButton: '나중에',
    closeAriaLabel: '닫기',
  },
  'zh-tw': {
    heading: '配對成功！',
    subheading: '傳送訊息開始對話吧',
    sendMessageButton: '傳送訊息',
    laterButton: '稍後',
    closeAriaLabel: '關閉',
  },
}

/**
 * 言語に応じたマッチ成立モーダルラベルを返す。
 * 未対応言語は ja にフォールバック(per-util i18n パターンと整合)。
 */
export function getMatchModalLabels(language: SupportedLanguage): MatchModalLabels {
  return MATCH_MODAL_LABELS[language] ?? MATCH_MODAL_LABELS.ja
}
