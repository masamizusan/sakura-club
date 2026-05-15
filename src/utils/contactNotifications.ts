/**
 * お問い合わせ受領通知の4言語テンプレート + 組み立てヘルパー。
 *
 * /api/contact が問い合わせ送信者本人宛に作成する notifications レコードの
 * title / message を、受信者の言語（getLanguageFromNationality で解決）に
 * 応じてローカライズする。
 *
 * 重要:
 *   - 問い合わせ本文（inquiryBody）は翻訳しない（原文保持が正しい）
 *   - 過去通知の遡及更新は行わない（履歴証跡として日本語のまま保持。
 *     reports.reason ローカライズ（commit 1c32150e）と同じ方針）
 */

import type { SupportedLanguage } from './language'
import { localizeContactCategory } from './contactCategories'

export const CONTACT_NOTIFICATION_TEMPLATES: Record<
  SupportedLanguage,
  {
    titlePrefix: string
    titleSeparator: string
    bodyIntro: string
    contentLabel: string
  }
> = {
  ja: {
    titlePrefix: 'お問い合わせを受け付けました',
    titleSeparator: '：',
    bodyIntro: '以下のお問い合わせを受け付けました。通常2〜3営業日以内にご返答いたします。',
    contentLabel: '【内容】',
  },
  en: {
    titlePrefix: 'Inquiry received',
    titleSeparator: ': ',
    bodyIntro: 'We have received your inquiry below. We typically reply within 2 to 3 business days.',
    contentLabel: '[Details]',
  },
  ko: {
    titlePrefix: '문의가 접수되었습니다',
    titleSeparator: ': ',
    bodyIntro: '아래 문의를 접수했습니다. 보통 2~3 영업일 이내에 답변 드립니다.',
    contentLabel: '[내용]',
  },
  'zh-tw': {
    titlePrefix: '已收到您的諮詢',
    titleSeparator: '：',
    bodyIntro: '已收到以下諮詢內容。通常會在 2 至 3 個工作天內回覆。',
    contentLabel: '【內容】',
  },
}

/**
 * 受領通知の title / message を組み立てる。
 *
 * @param lang          受信者の言語（getLanguageFromNationality で解決済み）
 * @param categoryValue 問い合わせカテゴリ value（Pattern B により日本語固定）
 * @param inquiryBody   ユーザーが入力した問い合わせ本文（原文保持・無加工）
 */
export function buildContactReceiptNotification(
  lang: SupportedLanguage,
  categoryValue: string,
  inquiryBody: string,
): { title: string; message: string } {
  const template = CONTACT_NOTIFICATION_TEMPLATES[lang] ?? CONTACT_NOTIFICATION_TEMPLATES.ja
  const categoryLabel = localizeContactCategory(lang, categoryValue)

  const title = `${template.titlePrefix}${template.titleSeparator}${categoryLabel}`
  const message = `${template.bodyIntro}\n\n${template.contentLabel}\n${inquiryBody}`

  return { title, message }
}
