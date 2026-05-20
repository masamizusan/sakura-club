/**
 * /matches ページの絞り込みモーダルで扱うフィルタ条件の型定義。
 *
 * - nationalityValues: 共通定数 NATIONALITY_OPTIONS の dbValue 配列
 *   (例: ['アメリカ','ドイツ','その他'])。空配列 = 国籍絞り込みなし。
 *   日本人女性検索時は呼び出し側で空のまま送らない運用。
 *   2026/05/20 に ISO ベース (`nationalityIso`) から dbValue ベースへ移行
 *   (signup と SSOT 統合、「その他」が ISO を持たないため)。
 * - ageMin/ageMax: 18-80 のレンジスライダー値。
 * - maritalStatus: 'all' | 'single' | 'married'。'all' は NULL を含む全件。
 * - prefectures: 日本語表記の都道府県名配列(例: ['東京都','大阪府'])。
 *   自分が日本人女性なら相手の planned_prefectures、外国人男性なら相手の residence と突合。
 * - lastActive: updated_at を最終アクティブの近似として 24h / 7d / すべて。
 */

export type MaritalStatusFilter = 'all' | 'single' | 'married'
export type LastActiveFilter = 'all' | '24h' | '7d'

export interface SearchFilters {
  nationalityValues: string[]
  ageMin: number
  ageMax: number
  maritalStatus: MaritalStatusFilter
  prefectures: string[]
  lastActive: LastActiveFilter
}

export const DEFAULT_FILTERS: SearchFilters = {
  nationalityValues: [],
  ageMin: 18,
  ageMax: 80,
  maritalStatus: 'all',
  prefectures: [],
  lastActive: 'all',
}

export const AGE_MIN_LIMIT = 18
export const AGE_MAX_LIMIT = 80

export function isFilterActive(f: SearchFilters): boolean {
  return (
    f.nationalityValues.length > 0 ||
    f.ageMin !== AGE_MIN_LIMIT ||
    f.ageMax !== AGE_MAX_LIMIT ||
    f.maritalStatus !== 'all' ||
    f.prefectures.length > 0 ||
    f.lastActive !== 'all'
  )
}
