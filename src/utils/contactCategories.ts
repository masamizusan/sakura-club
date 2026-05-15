/**
 * お問い合わせカテゴリの value 一覧と4言語ラベルマップ。
 *
 * value は Pattern B により日本語固定（API リクエスト・DB 保存値は日本語のまま、
 * 表示文言のみ4言語化）。フォーム選択肢と通知本文（受領通知）の両方で参照する。
 *
 * 同期義務（カテゴリを追加・変更する場合は3箇所すべて確認）:
 *   - フォーム選択肢: src/app/mypage/contact/page.tsx
 *   - 通知ビルダー:   src/utils/contactNotifications.ts
 *   - API 受信側:     src/app/api/contact/route.ts
 *
 * 翻訳品質メモ:
 *   ko / zh-tw は機械翻訳ベース。ネイティブレビューは別タスクで対応予定。
 */

import type { SupportedLanguage } from './language'

export const CONTACT_CATEGORY_VALUES = [
  '登録・ログインについて',
  '課金・お支払いについて',
  'マッチング・メッセージについて',
  '年齢確認について',
  'アカウントの停止・削除について',
  'その他',
] as const

export type ContactCategoryValue = typeof CONTACT_CATEGORY_VALUES[number]

export const CONTACT_CATEGORY_LABELS: Record<SupportedLanguage, Record<ContactCategoryValue, string>> = {
  ja: {
    '登録・ログインについて': '登録・ログインについて',
    '課金・お支払いについて': '課金・お支払いについて',
    'マッチング・メッセージについて': 'マッチング・メッセージについて',
    '年齢確認について': '年齢確認について',
    'アカウントの停止・削除について': 'アカウントの停止・削除について',
    'その他': 'その他',
  },
  en: {
    '登録・ログインについて': 'Registration & Login',
    '課金・お支払いについて': 'Billing & Payment',
    'マッチング・メッセージについて': 'Matching & Messages',
    '年齢確認について': 'Age Verification',
    'アカウントの停止・削除について': 'Account Suspension & Deletion',
    'その他': 'Other',
  },
  ko: {
    '登録・ログインについて': '가입・로그인 관련',
    '課金・お支払いについて': '결제・지불 관련',
    'マッチング・メッセージについて': '매칭・메시지 관련',
    '年齢確認について': '연령 확인 관련',
    'アカウントの停止・削除について': '계정 정지・삭제 관련',
    'その他': '기타',
  },
  'zh-tw': {
    '登録・ログインについて': '註冊・登入相關',
    '課金・お支払いについて': '付費・支付相關',
    'マッチング・メッセージについて': '配對・訊息相關',
    '年齢確認について': '年齡驗證相關',
    'アカウントの停止・削除について': '帳號暫停・刪除相關',
    'その他': '其他',
  },
}

/**
 * カテゴリ value から表示ラベルを取得。
 * 未知のカテゴリ（フォーム更新と本ファイル更新が乖離した場合等）は
 * value をそのまま返してフォールバック（UI 空欄を防ぐ）。
 */
export function localizeContactCategory(
  lang: SupportedLanguage,
  categoryValue: string | null | undefined,
): string {
  if (!categoryValue) return ''
  const map = CONTACT_CATEGORY_LABELS[lang] ?? CONTACT_CATEGORY_LABELS.ja
  return (map as Record<string, string>)[categoryValue] ?? categoryValue
}
