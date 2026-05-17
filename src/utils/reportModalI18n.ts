/**
 * 通報モーダル UI と関連 alert の4言語ラベル集。
 *
 * messages page (src/app/messages/[conversationId]/page.tsx) と
 * profile page (src/app/profile/[id]/page.tsx) の両方から参照される。
 *
 * 将来モーダル本体を共有コンポーネント化（src/components/ReportModal.tsx）
 * する別タスク（2026/05/16 調査報告 9.2 ステップ2）でも、このラベル集は
 * そのまま再利用可能。
 *
 * 通報理由ボタンのラベルは REPORT_REASON_LABELS / localizeReportReason
 * （src/utils/violationCategories.ts）を再利用するため、本ファイルには含めない。
 *
 * 互換性メモ:
 *   /api/reports へ送信する `reason` フィールドは日本語文字列固定（Pattern B）。
 *   admin 側の localizeReportReason(lang, raw) による翻訳パス
 *   （commit 1c32150e）と既存 reports レコードの整合性を維持するため、
 *   表示ラベルだけを翻訳し、API payload は変更しない。
 *
 * 翻訳品質メモ:
 *   ko / zh-tw は機械翻訳ベース。ネイティブレビューは別タスクで対応予定。
 */

import type { SupportedLanguage } from '@/utils/language'

export const REPORT_MODAL_LABELS: Record<
  SupportedLanguage,
  {
    // メニュー・モーダル
    menuItem: string           // メニュー項目の「通報する」
    modalTitle: string         // モーダル見出し（menuItem と意図的に別キー）
    reasonGuide: string        // 「通報理由を選択してください」
    detailsPlaceholder: string // 「詳細（任意）」
    submitButton: string       // 「通報を送信」
    submitting: string         // 「送信中...」
    closeAriaLabel: string     // ✕ ボタンの aria-label

    // alert（window.alert() 直接表示）
    alertSuccess: string           // 「通報を受け付けました。ご協力ありがとうございます。」
    alertExceptionGeneric: string  // 「エラーが発生しました」
    alertFailedPrefix: string      // 「通報に失敗しました: 」の前置き（後ろにエラー詳細を連結）
  }
> = {
  ja: {
    menuItem: '通報する',
    modalTitle: '通報する',
    reasonGuide: '通報理由を選択してください',
    detailsPlaceholder: '詳細（任意）',
    submitButton: '通報を送信',
    submitting: '送信中...',
    closeAriaLabel: '閉じる',
    alertSuccess: '通報を受け付けました。ご協力ありがとうございます。',
    alertExceptionGeneric: 'エラーが発生しました',
    alertFailedPrefix: '通報に失敗しました: ',
  },
  en: {
    menuItem: 'Report',
    modalTitle: 'Report user',
    reasonGuide: 'Please select a reason for reporting',
    detailsPlaceholder: 'Details (optional)',
    submitButton: 'Submit report',
    submitting: 'Submitting...',
    closeAriaLabel: 'Close',
    alertSuccess: 'Your report has been received. Thank you for your help.',
    alertExceptionGeneric: 'An error occurred',
    alertFailedPrefix: 'Failed to submit report: ',
  },
  ko: {
    menuItem: '신고',
    modalTitle: '사용자 신고',
    reasonGuide: '신고 사유를 선택해 주세요',
    detailsPlaceholder: '상세 내용 (선택)',
    submitButton: '신고 보내기',
    submitting: '전송 중...',
    closeAriaLabel: '닫기',
    alertSuccess: '신고가 접수되었습니다. 협조해 주셔서 감사합니다.',
    alertExceptionGeneric: '오류가 발생했습니다',
    alertFailedPrefix: '신고 전송 실패: ',
  },
  'zh-tw': {
    menuItem: '檢舉',
    modalTitle: '檢舉用戶',
    reasonGuide: '請選擇檢舉理由',
    detailsPlaceholder: '詳細內容（選填）',
    submitButton: '送出檢舉',
    submitting: '傳送中...',
    closeAriaLabel: '關閉',
    alertSuccess: '已收到您的檢舉。感謝您的協助。',
    alertExceptionGeneric: '發生錯誤',
    alertFailedPrefix: '檢舉送出失敗：',
  },
}

/**
 * 通報モーダルのラベル集を言語に応じて取得。
 * 未対応言語は ja にフォールバック（per-page i18n パターンと整合）。
 */
export function getReportModalLabels(language: SupportedLanguage) {
  return REPORT_MODAL_LABELS[language] ?? REPORT_MODAL_LABELS.ja
}
