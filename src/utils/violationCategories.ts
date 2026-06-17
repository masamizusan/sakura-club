/**
 * AI フラグの違反カテゴリのローカライズ表記マップ。
 * messages/moderate/route.ts でフラグ生成時に使われる5カテゴリと一致する。
 *
 * 言語コードは src/utils/language.ts の SupportedLanguage に揃える
 * （'ja' | 'en' | 'ko' | 'zh-tw'）。
 */

import type { SupportedLanguage } from './language'

export type ViolationCategory =
  | 'money'
  | 'contact_exchange'
  | 'spam'
  | 'redirect'
  | 'inappropriate'
  | 'personal_info'

export const VIOLATION_LABELS: Record<SupportedLanguage, Record<ViolationCategory, string>> = {
  ja: {
    money: '金銭の要求・送金の勧誘',
    contact_exchange: '連絡先交換',
    spam: 'スパム・宣伝行為',
    redirect: '外部サイト・他サービスへの誘導',
    inappropriate: '不適切な内容',
    personal_info: '個人情報の交換誘導',
  },
  en: {
    money: 'Money requests or solicitation',
    contact_exchange: 'Contact Exchange',
    spam: 'Spam or promotional content',
    redirect: 'Redirect to external site or service',
    inappropriate: 'Inappropriate content',
    personal_info: 'Personal information exchange',
  },
  ko: {
    money: '금전 요구・송금 권유',
    contact_exchange: '연락처 교환',
    spam: '스팸・광고 행위',
    redirect: '외부 사이트・다른 서비스로 유도',
    inappropriate: '부적절한 내용',
    personal_info: '개인정보 교환 유도',
  },
  'zh-tw': {
    money: '金錢要求・匯款勸誘',
    contact_exchange: '聯絡方式交換',
    spam: '垃圾訊息・宣傳行為',
    redirect: '外部網站・其他服務引導',
    inappropriate: '不當內容',
    personal_info: '個人資訊交換引導',
  },
}

/**
 * カテゴリの安全な取得。未知のカテゴリは原文をそのまま返す（UI が空にならないよう保護）。
 */
export function getViolationLabel(
  lang: SupportedLanguage,
  category: string | null | undefined
): string {
  if (!category) return ''
  const map = VIOLATION_LABELS[lang] ?? VIOLATION_LABELS.ja
  return (map as Record<string, string>)[category] ?? category
}

/**
 * Intl.DateTimeFormat 用のロケール文字列を SupportedLanguage から導出。
 */
export function localeForLanguage(lang: SupportedLanguage): string {
  switch (lang) {
    case 'en': return 'en-US'
    case 'ko': return 'ko-KR'
    case 'zh-tw': return 'zh-TW'
    case 'ja':
    default: return 'ja-JP'
  }
}

const SNIPPET_LIMIT = 30

/**
 * メッセージ抜粋。30文字超は末尾に三点リーダ。null/undefined は空文字。
 */
export function truncateSnippet(content: string | null | undefined): string {
  if (!content) return ''
  if (content.length <= SNIPPET_LIMIT) return content
  return content.slice(0, SNIPPET_LIMIT) + '…'
}

/**
 * AIフラグ起因の警告通知本文を 4言語で生成する。
 */
export function buildFlagWarningNotification(args: {
  lang: SupportedLanguage
  formattedDate: string
  snippet: string
  category: string
}): { title: string; message: string } {
  const { lang, formattedDate, snippet, category } = args
  const categoryLabel = getViolationLabel(lang, category)

  switch (lang) {
    case 'en':
      return {
        title: '⚠️ Warning',
        message:
          `Your message "${snippet}" sent on ${formattedDate} has violated the Terms of Service, and a warning has been issued.\n\n` +
          `Violation: ${categoryLabel}\n\n` +
          `Repeated violations may result in account suspension.\n` +
          `Please adhere to the SAKURA CLUB community guidelines.`,
      }
    case 'ko':
      return {
        title: '⚠️ 경고',
        message:
          `${formattedDate}에 보낸 메시지 「${snippet}」가 이용약관을 위반하여 경고가 발행되었습니다.\n\n` +
          `위반 내용: ${categoryLabel}\n\n` +
          `향후 동일한 위반이 확인될 경우 계정 정지의 대상이 될 수 있습니다.\n` +
          `SAKURA CLUB 가이드라인 준수를 부탁드립니다.`,
      }
    case 'zh-tw':
      return {
        title: '⚠️ 警告',
        message:
          `${formattedDate} 發送的訊息「${snippet}」違反了使用條款，已發出警告。\n\n` +
          `違規內容：${categoryLabel}\n\n` +
          `若再次確認相同違規，帳號可能會被停權。\n` +
          `請遵守 SAKURA CLUB 的社群守則。`,
      }
    case 'ja':
    default:
      return {
        title: '⚠️ 警告',
        message:
          `${formattedDate} のメッセージ「${snippet}」が利用規約に違反したため、警告を発行しました。\n\n` +
          `違反内容: ${categoryLabel}\n\n` +
          `今後同様の違反が確認された場合、アカウント停止の対象となる可能性があります。\n` +
          `SAKURA CLUB のガイドライン遵守をお願いします。`,
      }
  }
}

/**
 * 通報起因の警告通知本文を 4言語で生成する。
 * 通報には対象メッセージID/AIカテゴリの紐付けがないため、
 * 通報の理由テキスト（reason）と通報日時を本文に含める。
 */
export function buildReportWarningNotification(args: {
  lang: SupportedLanguage
  formattedDate: string
  reason: string
}): { title: string; message: string } {
  const { lang, formattedDate, reason } = args

  switch (lang) {
    case 'en':
      return {
        title: '⚠️ Warning',
        message:
          `A report filed on ${formattedDate} has been reviewed and a warning has been issued for your account.\n\n` +
          `Reason: ${reason}\n\n` +
          `Repeated violations may result in account suspension.\n` +
          `Please adhere to the SAKURA CLUB community guidelines.`,
      }
    case 'ko':
      return {
        title: '⚠️ 경고',
        message:
          `${formattedDate}에 접수된 신고가 검토되어 회원님의 계정에 경고가 발행되었습니다.\n\n` +
          `사유: ${reason}\n\n` +
          `향후 동일한 위반이 확인될 경우 계정 정지의 대상이 될 수 있습니다.\n` +
          `SAKURA CLUB 가이드라인 준수를 부탁드립니다.`,
      }
    case 'zh-tw':
      return {
        title: '⚠️ 警告',
        message:
          `${formattedDate} 收到的舉報經審查後，已對您的帳號發出警告。\n\n` +
          `理由：${reason}\n\n` +
          `若再次確認相同違規，帳號可能會被停權。\n` +
          `請遵守 SAKURA CLUB 的社群守則。`,
      }
    case 'ja':
    default:
      return {
        title: '⚠️ 警告',
        message:
          `${formattedDate} に提出された通報を確認し、あなたのアカウントに警告を発行しました。\n\n` +
          `理由: ${reason}\n\n` +
          `今後同様の違反が確認された場合、アカウント停止の対象となる可能性があります。\n` +
          `SAKURA CLUB のガイドライン遵守をお願いします。`,
      }
  }
}

// 通報UIラジオの日本語値 → 内部キー
export type ReportReasonKey =
  | 'spam' | 'money' | 'inappropriate' | 'redirect'
  | 'impersonation' | 'other'

// 通報UIで表示する日本語表示文字列 → 内部キーへのマップ。
// プロパティの宣言順が UI の表示順序を兼ねる（Object.keys() は挿入順を保証）。
// 通報モーダル UI（messages / profile page）から Object.keys() でループされる。
export const REPORT_REASON_JA_TO_KEY: Record<string, ReportReasonKey> = {
  '業者・スパム': 'spam',
  '金銭の要求': 'money',
  '不適切なメッセージ': 'inappropriate',
  '他サービスへの誘導': 'redirect',
  'なりすまし': 'impersonation',
  'その他': 'other',
}

export const REPORT_REASON_LABELS: Record<SupportedLanguage, Record<ReportReasonKey, string>> = {
  ja: {
    spam: 'スパム・宣伝行為',
    money: '金銭の要求・送金の勧誘',
    inappropriate: '不適切な内容',
    redirect: '他サービスへの誘導',
    impersonation: 'なりすまし',
    other: 'その他',
  },
  en: {
    spam: 'Spam or promotional content',
    money: 'Money requests or solicitation',
    inappropriate: 'Inappropriate content',
    redirect: 'Redirect to other service',
    impersonation: 'Impersonation',
    other: 'Other',
  },
  ko: {
    spam: '스팸・광고 행위',
    money: '금전 요구・송금 권유',
    inappropriate: '부적절한 내용',
    redirect: '다른 서비스로 유도',
    impersonation: '사칭',
    other: '기타',
  },
  'zh-tw': {
    spam: '垃圾訊息・宣傳行為',
    money: '金錢要求・匯款勸誘',
    inappropriate: '不當內容',
    redirect: '其他服務引導',
    impersonation: '冒充身分',
    other: '其他',
  },
}

/**
 * 通報理由(reports.reason、日本語固定文字列)を受信者言語に翻訳する。
 * 未知の値(古い手入力フリーテキスト等)は原文をそのまま返す safety valve あり。
 */
export function localizeReportReason(
  lang: SupportedLanguage,
  raw: string | null | undefined
): string {
  if (!raw) return ''
  const key = REPORT_REASON_JA_TO_KEY[raw]
  if (!key) return raw
  return REPORT_REASON_LABELS[lang][key]
}
