/**
 * ブロック機能 UI の4言語ラベル集。
 *
 * messages page（カスタムモーダル）と profile page（window.confirm）の
 * 両方から参照される。
 *
 * 注: profile page は現状 window.confirm() 直接呼び出しで、messages page
 * のカスタムモーダルにある重要警告3つ（解除不可・非通知・全ページ非表示）が
 * 欠落している。UI 統一は別タスクで対応予定（2026/05/16 調査報告 9.1 参照）。
 * 本ファイルはそれを見越して modalSubheading / noteNotNotified / noteHidden
 * を独立キーで持ち、将来 profile 側カスタムモーダル化時にそのまま流用可能。
 *
 * API 互換性メモ:
 *   POST /api/blocks の payload は { blocked_id: string }（UUID のみ）で
 *   言語非依存。多言語化による API 影響はゼロ。Pattern B 判断は不要。
 *
 * 翻訳品質メモ:
 *   ko / zh-tw は機械翻訳ベース。ネイティブレビューは別タスクで対応予定。
 */

import type { SupportedLanguage } from '@/utils/language'

export const BLOCK_I18N_LABELS: Record<
  SupportedLanguage,
  {
    // メニュー・モーダル
    menuItem: string         // メニューの「ブロックする」
    modalHeading: string     // モーダル見出し「ブロックしますか？」
    modalSubheading: string  // 「ブロックは解除できません。」（重要警告）
    noteNotNotified: string  // 「※ブロックした事はお相手ユーザーには通知されません。」
    noteHidden: string       // 「※ブロックすると自分やお相手から全てのページで非表示となります。」
    cancelButton: string     // 「キャンセル」
    confirmButton: string    // モーダルの「ブロックする」（実行）

    // profile page の window.confirm 用（messages のモーダルとは別文言）
    confirmDialogText: string  // 「このユーザーをブロックしますか？」

    // alert
    alertSuccess: string           // 「ブロックしました」（profile page）
    alertFailedPrefix: string      // 「ブロックに失敗しました: 」
    alertExceptionGeneric: string  // 「エラーが発生しました」
  }
> = {
  ja: {
    menuItem: 'ブロックする',
    modalHeading: 'ブロックしますか？',
    modalSubheading: 'ブロックは解除できません。',
    noteNotNotified: '※ブロックした事はお相手ユーザーには通知されません。',
    noteHidden: '※ブロックすると自分やお相手から全てのページで非表示となります。',
    cancelButton: 'キャンセル',
    confirmButton: 'ブロックする',
    confirmDialogText: 'このユーザーをブロックしますか？',
    alertSuccess: 'ブロックしました',
    alertFailedPrefix: 'ブロックに失敗しました: ',
    alertExceptionGeneric: 'エラーが発生しました',
  },
  en: {
    menuItem: 'Block',
    modalHeading: 'Block this user?',
    modalSubheading: 'This action cannot be undone.',
    noteNotNotified: 'The other user will not be notified that you blocked them.',
    noteHidden: 'Once blocked, you and the other user will be hidden from each other across all pages.',
    cancelButton: 'Cancel',
    confirmButton: 'Block',
    confirmDialogText: 'Block this user?',
    alertSuccess: 'User blocked.',
    alertFailedPrefix: 'Failed to block: ',
    alertExceptionGeneric: 'An error occurred',
  },
  ko: {
    menuItem: '차단',
    modalHeading: '차단하시겠습니까?',
    modalSubheading: '차단은 해제할 수 없습니다.',
    noteNotNotified: '※차단 사실은 상대방에게 알려지지 않습니다.',
    noteHidden: '※차단하면 모든 페이지에서 서로 표시되지 않습니다.',
    cancelButton: '취소',
    confirmButton: '차단',
    confirmDialogText: '이 사용자를 차단하시겠습니까?',
    alertSuccess: '차단되었습니다.',
    alertFailedPrefix: '차단에 실패했습니다: ',
    alertExceptionGeneric: '오류가 발생했습니다',
  },
  'zh-tw': {
    menuItem: '封鎖',
    modalHeading: '確定要封鎖嗎？',
    modalSubheading: '封鎖後將無法解除。',
    noteNotNotified: '※對方不會收到您封鎖的通知。',
    noteHidden: '※封鎖後，您與對方在所有頁面將互不顯示。',
    cancelButton: '取消',
    confirmButton: '封鎖',
    confirmDialogText: '要封鎖這位用戶嗎？',
    alertSuccess: '已封鎖。',
    alertFailedPrefix: '封鎖失敗：',
    alertExceptionGeneric: '發生錯誤',
  },
}

/**
 * ブロック機能 UI のラベル集を言語に応じて取得。
 * 未対応言語は ja にフォールバック（per-page i18n パターンと整合）。
 */
export function getBlockI18nLabels(language: SupportedLanguage) {
  return BLOCK_I18N_LABELS[language] ?? BLOCK_I18N_LABELS.ja
}
