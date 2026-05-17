/**
 * /matches ページの絞り込みモーダル UI ラベル 4言語辞書。
 *
 * 直近の reportModalI18n.ts / blockI18n.ts と同じ per-util Dict + getter パターン。
 * 未対応言語は ja にフォールバック。
 * ko / zh-tw は機械翻訳ベース、ネイティブレビューは別タスク。
 */

import type { SupportedLanguage } from '@/utils/language'

export interface SearchFilterI18nLabels {
  // ボタン・バッジ
  filterBtnLabel: string
  filterAppliedBadge: string

  // モーダルヘッダー・フッター
  modalTitle: string
  closeAria: string
  reset: string
  search: string

  // 年齢セクション
  ageRange: string
  yearsOldSuffix: string
  ageRangeReadout: string  // "{min}{suffix} 〜 {max}{suffix}" 等

  // 国籍セクション
  nationality: string
  nationalitySelectedCount: string  // 「{count}件選択中」等
  nationalityNoneSelected: string

  // 婚姻状態セクション
  maritalStatus: string
  maritalAll: string
  maritalSingle: string
  maritalMarried: string

  // 都道府県セクション
  prefecture: string
  prefectureResidenceHint: string       // 日本人女性検索時
  prefecturePlannedVisitHint: string    // 外国人男性検索時
  prefectureSelectedCount: string
  prefectureNoneSelected: string

  // 最終アクティブセクション
  lastActive: string
  lastActiveAll: string
  lastActive24h: string
  lastActive7d: string
}

export const SEARCH_FILTER_I18N: Record<SupportedLanguage, SearchFilterI18nLabels> = {
  ja: {
    filterBtnLabel: '絞り込み',
    filterAppliedBadge: '適用中',
    modalTitle: '絞り込み',
    closeAria: '閉じる',
    reset: '条件をリセット',
    search: 'お相手を検索',
    ageRange: '年齢',
    yearsOldSuffix: '歳',
    ageRangeReadout: '{min}歳 〜 {max}歳',
    nationality: '国籍',
    nationalitySelectedCount: '{count}件選択中',
    nationalityNoneSelected: 'すべて',
    maritalStatus: '婚姻状態',
    maritalAll: 'すべて',
    maritalSingle: '独身',
    maritalMarried: '既婚',
    prefecture: '都道府県',
    prefectureResidenceHint: '相手の居住地で絞り込み',
    prefecturePlannedVisitHint: '相手の訪問予定地で絞り込み',
    prefectureSelectedCount: '{count}件選択中',
    prefectureNoneSelected: 'すべて',
    lastActive: '最終アクティブ',
    lastActiveAll: 'すべて',
    lastActive24h: '24時間以内',
    lastActive7d: '1週間以内',
  },
  en: {
    filterBtnLabel: 'Filters',
    filterAppliedBadge: 'Active',
    modalTitle: 'Filters',
    closeAria: 'Close',
    reset: 'Reset filters',
    search: 'Search',
    ageRange: 'Age',
    yearsOldSuffix: '',
    ageRangeReadout: '{min} – {max}',
    nationality: 'Nationality',
    nationalitySelectedCount: '{count} selected',
    nationalityNoneSelected: 'All',
    maritalStatus: 'Marital status',
    maritalAll: 'All',
    maritalSingle: 'Single',
    maritalMarried: 'Married',
    prefecture: 'Prefecture',
    prefectureResidenceHint: 'Filter by their place of residence',
    prefecturePlannedVisitHint: 'Filter by prefectures they plan to visit',
    prefectureSelectedCount: '{count} selected',
    prefectureNoneSelected: 'All',
    lastActive: 'Last active',
    lastActiveAll: 'All',
    lastActive24h: 'Within 24 hours',
    lastActive7d: 'Within 1 week',
  },
  ko: {
    filterBtnLabel: '필터',
    filterAppliedBadge: '적용 중',
    modalTitle: '필터',
    closeAria: '닫기',
    reset: '조건 초기화',
    search: '상대 찾기',
    ageRange: '나이',
    yearsOldSuffix: '세',
    ageRangeReadout: '{min}세 ~ {max}세',
    nationality: '국적',
    nationalitySelectedCount: '{count}개 선택',
    nationalityNoneSelected: '전체',
    maritalStatus: '결혼 상태',
    maritalAll: '전체',
    maritalSingle: '미혼',
    maritalMarried: '기혼',
    prefecture: '도도부현',
    prefectureResidenceHint: '상대방 거주지로 필터링',
    prefecturePlannedVisitHint: '상대방 방문 예정 지역으로 필터링',
    prefectureSelectedCount: '{count}개 선택',
    prefectureNoneSelected: '전체',
    lastActive: '최근 접속',
    lastActiveAll: '전체',
    lastActive24h: '24시간 이내',
    lastActive7d: '1주일 이내',
  },
  'zh-tw': {
    filterBtnLabel: '篩選',
    filterAppliedBadge: '已套用',
    modalTitle: '篩選條件',
    closeAria: '關閉',
    reset: '重設條件',
    search: '搜尋對象',
    ageRange: '年齡',
    yearsOldSuffix: '歲',
    ageRangeReadout: '{min}歲 ~ {max}歲',
    nationality: '國籍',
    nationalitySelectedCount: '已選擇 {count} 項',
    nationalityNoneSelected: '全部',
    maritalStatus: '婚姻狀態',
    maritalAll: '全部',
    maritalSingle: '未婚',
    maritalMarried: '已婚',
    prefecture: '都道府縣',
    prefectureResidenceHint: '依對方居住地篩選',
    prefecturePlannedVisitHint: '依對方預計前往地篩選',
    prefectureSelectedCount: '已選擇 {count} 項',
    prefectureNoneSelected: '全部',
    lastActive: '最後上線',
    lastActiveAll: '全部',
    lastActive24h: '24 小時內',
    lastActive7d: '1 週內',
  },
}

export function getSearchFilterI18n(language: SupportedLanguage): SearchFilterI18nLabels {
  return SEARCH_FILTER_I18N[language] ?? SEARCH_FILTER_I18N.ja
}
