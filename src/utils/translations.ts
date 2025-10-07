/**
 * 基本的な翻訳辞書
 * 段階的実装: Phase 1 - プロフィール編集画面の主要項目のみ
 */

import { SupportedLanguage } from './language'

type TranslationKeys = {
  // プロフィール編集画面の基本項目
  profile: {
    nickname: string
    age: string
    nationality: string
    plannedPrefectures: string
    plannedStations: string
    visitSchedule: string
    travelCompanion: string
    japaneseLevel: string
    englishLevel: string
    selectPrefectures: string
    selectStations: string
    selectedCount: string
    maxSelection: string
  }

  // 言語レベル
  levels: {
    none: string
    beginner: string
    elementary: string
    intermediate: string
    upperIntermediate: string
    advanced: string
    native: string
  }

  // 訪問予定時期
  schedule: {
    undecided: string
    noEntry: string
    year2024: string
    year2025: string
    beyond2025: string
    beyond2026: string
  }

  // 同行者
  companion: {
    noEntry: string
    alone: string
    friend: string
    family: string
    partner: string
  }

  // 共通ボタン・アクション
  common: {
    save: string
    cancel: string
    preview: string
    edit: string
    select: string
    clear: string
  }
}

const translations: Record<SupportedLanguage, TranslationKeys> = {
  ja: {
    profile: {
      nickname: 'ニックネーム',
      age: '年齢',
      nationality: '国籍',
      plannedPrefectures: '行く予定の都道府県',
      plannedStations: '訪問予定の駅（任意）',
      visitSchedule: '訪問予定時期',
      travelCompanion: '同行者',
      japaneseLevel: '日本語レベル',
      englishLevel: '英語レベル',
      selectPrefectures: '都道府県を選択',
      selectStations: '駅を選択',
      selectedCount: '選択済み',
      maxSelection: 'まで選択できます'
    },
    levels: {
      none: '記入しない',
      beginner: '初級（日常会話は難しい）',
      elementary: '初級上（基本的な日常会話ができる）',
      intermediate: '中級（日常会話は問題ない）',
      upperIntermediate: '中級上（複雑な話題も理解できる）',
      advanced: '上級（流暢に話せる）',
      native: 'ネイティブレベル'
    },
    schedule: {
      undecided: 'まだ決まっていない',
      noEntry: '記入しない',
      year2024: '2024年',
      year2025: '2025年',
      beyond2025: '2025年以降',
      beyond2026: '2026年以降'
    },
    companion: {
      noEntry: '記入しない',
      alone: '一人で',
      friend: '友人と',
      family: '家族と',
      partner: 'パートナーと'
    },
    common: {
      save: '保存',
      cancel: 'キャンセル',
      preview: 'プレビュー',
      edit: '編集',
      select: '選択',
      clear: 'クリア'
    }
  },

  en: {
    profile: {
      nickname: 'Nickname',
      age: 'Age',
      nationality: 'Nationality',
      plannedPrefectures: 'Planned Prefectures',
      plannedStations: 'Planned Stations (Optional)',
      visitSchedule: 'Visit Schedule',
      travelCompanion: 'Travel Companion',
      japaneseLevel: 'Japanese Level',
      englishLevel: 'English Level',
      selectPrefectures: 'Select Prefectures',
      selectStations: 'Select Stations',
      selectedCount: 'selected',
      maxSelection: 'can be selected'
    },
    levels: {
      none: 'Not specified',
      beginner: 'Beginner (Daily conversation is difficult)',
      elementary: 'Elementary (Basic daily conversation)',
      intermediate: 'Intermediate (Daily conversation is fine)',
      upperIntermediate: 'Upper Intermediate (Can understand complex topics)',
      advanced: 'Advanced (Fluent)',
      native: 'Native level'
    },
    schedule: {
      undecided: 'Not decided yet',
      noEntry: 'Not specified',
      year2024: '2024',
      year2025: '2025',
      beyond2025: '2025 or later',
      beyond2026: '2026 or later'
    },
    companion: {
      noEntry: 'Not specified',
      alone: 'Alone',
      friend: 'With friends',
      family: 'With family',
      partner: 'With partner'
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      preview: 'Preview',
      edit: 'Edit',
      select: 'Select',
      clear: 'Clear'
    }
  },

  ko: {
    profile: {
      nickname: '닉네임',
      age: '나이',
      nationality: '국적',
      plannedPrefectures: '방문 예정 현(都道府県)',
      plannedStations: '방문 예정 역 (선택사항)',
      visitSchedule: '방문 예정 시기',
      travelCompanion: '동행자',
      japaneseLevel: '일본어 수준',
      englishLevel: '영어 수준',
      selectPrefectures: '현 선택',
      selectStations: '역 선택',
      selectedCount: '선택됨',
      maxSelection: '까지 선택 가능'
    },
    levels: {
      none: '기입하지 않음',
      beginner: '초급 (일상 대화가 어려움)',
      elementary: '초급상 (기본적인 일상 대화 가능)',
      intermediate: '중급 (일상 대화는 문제없음)',
      upperIntermediate: '중급상 (복잡한 주제도 이해 가능)',
      advanced: '상급 (유창하게 대화 가능)',
      native: '네이티브 수준'
    },
    schedule: {
      undecided: '아직 정하지 않음',
      noEntry: '기입하지 않음',
      year2024: '2024년',
      year2025: '2025년',
      beyond2025: '2025년 이후',
      beyond2026: '2026년 이후'
    },
    companion: {
      noEntry: '기입하지 않음',
      alone: '혼자서',
      friend: '친구와',
      family: '가족과',
      partner: '파트너와'
    },
    common: {
      save: '저장',
      cancel: '취소',
      preview: '미리보기',
      edit: '편집',
      select: '선택',
      clear: '지우기'
    }
  },

  'zh-tw': {
    profile: {
      nickname: '暱稱',
      age: '年齡',
      nationality: '國籍',
      plannedPrefectures: '預計前往的都道府縣',
      plannedStations: '預計拜訪車站（選填）',
      visitSchedule: '預計拜訪時期',
      travelCompanion: '同行者',
      japaneseLevel: '日語程度',
      englishLevel: '英語程度',
      selectPrefectures: '選擇都道府縣',
      selectStations: '選擇車站',
      selectedCount: '已選擇',
      maxSelection: '最多可選擇'
    },
    levels: {
      none: '不填寫',
      beginner: '初級（日常對話有困難）',
      elementary: '初級上（可進行基本日常對話）',
      intermediate: '中級（日常對話沒問題）',
      upperIntermediate: '中級上（可理解複雜話題）',
      advanced: '高級（流利對話）',
      native: '母語程度'
    },
    schedule: {
      undecided: '尚未決定',
      noEntry: '不填寫',
      year2024: '2024年',
      year2025: '2025年',
      beyond2025: '2025年以後',
      beyond2026: '2026年以後'
    },
    companion: {
      noEntry: '不填寫',
      alone: '一個人',
      friend: '與朋友',
      family: '與家人',
      partner: '與伴侶'
    },
    common: {
      save: '保存',
      cancel: '取消',
      preview: '預覽',
      edit: '編輯',
      select: '選擇',
      clear: '清除'
    }
  }
}

/**
 * 翻訳を取得する関数
 */
export function getTranslation(language: SupportedLanguage, key: string): string {
  const keys = key.split('.')
  let value: any = translations[language]

  for (const k of keys) {
    value = value?.[k]
  }

  return value || key // 翻訳が見つからない場合はキーをそのまま返す
}

/**
 * React Hook風のヘルパー関数
 */
export function useTranslation(language: SupportedLanguage) {
  return {
    t: (key: string) => getTranslation(language, key),
    language
  }
}

export default translations