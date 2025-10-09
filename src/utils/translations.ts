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
    gender: string
    birthDate: string
    prefecture: string
    city: string
    occupation: string
    height: string
    bodyType: string
    maritalStatus: string
    hobbies: string
    customCulture: string
    personality: string
    editTitle: string
    profileCompletion: string
    requiredInfo: string
    optionalInfo: string
    foreignMaleTitle: string
    japaneseFemaleTitle: string
    foreignMaleSubtitle: string
    japaneseFemaleSubtitle: string
    defaultSubtitle: string
    selfIntroduction: string
    selfIntroPlaceholder: string
    selfIntroNote: string
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

  // 性別
  gender: {
    male: string
    female: string
  }

  // 体型
  bodyType: {
    noEntry: string
    slim: string
    average: string
    muscular: string
    plump: string
  }

  // 婚姻状況
  maritalStatus: {
    none: string
    single: string
    married: string
  }

  // 職業
  occupations: {
    noEntry: string
    housewife: string
    student: string
    companyEmployee: string
    publicServant: string
    selfEmployed: string
    freelance: string
    partTime: string
    other: string
  }

  // 日本文化・趣味
  japaneseHobbies: {
    anime: string
    manga: string
    games: string
    jpop: string
    travel: string
    food: string
    language: string
    history: string
    martialArts: string
    tea: string
    kimono: string
    festivals: string
    temples: string
    nature: string
    technology: string
    fashion: string
  }

  // 性格
  personalities: {
    cheerful: string
    calm: string
    serious: string
    funny: string
    kind: string
    active: string
    creative: string
    thoughtful: string
  }

  // エラーメッセージ
  errors: {
    required: string
    tooLong: string
    tooShort: string
    invalidAge: string
    invalidHeight: string
    selectAtLeastOne: string
    selectMaxItems: string
  }

  // 共通ボタン・アクション
  common: {
    save: string
    cancel: string
    preview: string
    edit: string
    select: string
    clear: string
    back: string
    close: string
    confirm: string
    loading: string
    complete: string
    optional: string
    required: string
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
      maxSelection: 'まで選択できます',
      gender: '性別',
      birthDate: '生年月日',
      prefecture: '都道府県',
      city: '市区町村',
      occupation: '職業',
      height: '身長',
      bodyType: '体型',
      maritalStatus: '婚姻状況',
      hobbies: '体験したい日本文化',
      customCulture: 'その他の日本文化',
      personality: '性格',
      editTitle: 'プロフィール編集',
      profileCompletion: 'プロフィール完成度',
      requiredInfo: '必須項目',
      optionalInfo: '任意項目',
      foreignMaleTitle: '外国人男性プロフィール編集',
      japaneseFemaleTitle: '日本人女性プロフィール編集',
      foreignMaleSubtitle: '日本人女性との出会いに向けて、あなたの情報を更新してください',
      japaneseFemaleSubtitle: '外国人男性との出会いに向けて、あなたの情報を更新してください',
      defaultSubtitle: 'あなたの情報を更新してください',
      selfIntroduction: '自己紹介文',
      selfIntroPlaceholder: 'あなたの魅力や日本文化への興味について教えてください（100文字以上1000文字以内で入力してください）',
      selfIntroNote: '自己紹介は100文字以上1000文字以内で入力してください。'
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
    gender: {
      male: '男性',
      female: '女性'
    },
    bodyType: {
      noEntry: '記入しない',
      slim: 'スリム',
      average: '普通',
      muscular: '筋肉質',
      plump: 'ぽっちゃり'
    },
    maritalStatus: {
      none: '記入しない',
      single: '独身',
      married: '既婚'
    },
    occupations: {
      noEntry: '記入しない',
      housewife: '主婦',
      student: '学生',
      companyEmployee: '会社員',
      publicServant: '公務員',
      selfEmployed: '自営業',
      freelance: 'フリーランス',
      partTime: 'パート・アルバイト',
      other: 'その他'
    },
    japaneseHobbies: {
      anime: 'アニメ',
      manga: 'マンガ',
      games: 'ゲーム',
      jpop: 'J-POP',
      travel: '日本旅行',
      food: '日本料理',
      language: '日本語学習',
      history: '日本の歴史',
      martialArts: '武道',
      tea: '茶道',
      kimono: '着物',
      festivals: '祭り',
      temples: '寺社仏閣',
      nature: '日本の自然',
      technology: '日本の技術',
      fashion: '日本のファッション'
    },
    personalities: {
      cheerful: '明るい',
      calm: '落ち着いている',
      serious: '真面目',
      funny: 'ユーモアがある',
      kind: '優しい',
      active: 'アクティブ',
      creative: 'クリエイティブ',
      thoughtful: '思いやりがある'
    },
    errors: {
      required: 'この項目は必須です',
      tooLong: '文字数が多すぎます',
      tooShort: '文字数が足りません',
      invalidAge: '有効な年齢を入力してください',
      invalidHeight: '有効な身長を入力してください',
      selectAtLeastOne: '1つ以上選択してください',
      selectMaxItems: '選択できる数を超えています'
    },
    common: {
      save: '保存',
      cancel: 'キャンセル',
      preview: 'プレビュー',
      edit: '編集',
      select: '選択',
      clear: 'クリア',
      back: '戻る',
      close: '閉じる',
      confirm: '確認',
      loading: '読み込み中...',
      complete: '完了',
      optional: '任意',
      required: '必須'
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
      maxSelection: 'can be selected',
      gender: 'Gender',
      birthDate: 'Date of Birth',
      prefecture: 'Prefecture',
      city: 'City',
      occupation: 'Occupation',
      height: 'Height',
      bodyType: 'Body Type',
      maritalStatus: 'Marital Status',
      hobbies: 'Japanese Culture Interests',
      customCulture: 'Other Japanese Culture',
      personality: 'Personality',
      editTitle: 'Edit Profile',
      profileCompletion: 'Profile Completion',
      requiredInfo: 'Required Information',
      optionalInfo: 'Optional Information',
      foreignMaleTitle: 'Foreign Male Profile Edit',
      japaneseFemaleTitle: 'Japanese Female Profile Edit',
      foreignMaleSubtitle: 'Update your information to meet Japanese women',
      japaneseFemaleSubtitle: 'Update your information to meet foreign men',
      defaultSubtitle: 'Update your information',
      selfIntroduction: 'Self Introduction',
      selfIntroPlaceholder: 'Tell us about your charm and interest in Japanese culture (100-1000 characters)',
      selfIntroNote: 'Please write your self-introduction in 100-1000 characters.'
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
    gender: {
      male: 'Male',
      female: 'Female'
    },
    bodyType: {
      noEntry: 'Not specified',
      slim: 'Slim',
      average: 'Average',
      muscular: 'Muscular',
      plump: 'Plump'
    },
    maritalStatus: {
      none: 'Not specified',
      single: 'Single',
      married: 'Married'
    },
    occupations: {
      noEntry: 'Not specified',
      housewife: 'Housewife',
      student: 'Student',
      companyEmployee: 'Company Employee',
      publicServant: 'Public Servant',
      selfEmployed: 'Self-employed',
      freelance: 'Freelance',
      partTime: 'Part-time',
      other: 'Other'
    },
    japaneseHobbies: {
      anime: 'Anime',
      manga: 'Manga',
      games: 'Games',
      jpop: 'J-POP',
      travel: 'Japan Travel',
      food: 'Japanese Cuisine',
      language: 'Japanese Language',
      history: 'Japanese History',
      martialArts: 'Martial Arts',
      tea: 'Tea Ceremony',
      kimono: 'Kimono',
      festivals: 'Festivals',
      temples: 'Temples & Shrines',
      nature: 'Japanese Nature',
      technology: 'Japanese Technology',
      fashion: 'Japanese Fashion'
    },
    personalities: {
      cheerful: 'Cheerful',
      calm: 'Calm',
      serious: 'Serious',
      funny: 'Funny',
      kind: 'Kind',
      active: 'Active',
      creative: 'Creative',
      thoughtful: 'Thoughtful'
    },
    errors: {
      required: 'This field is required',
      tooLong: 'Too many characters',
      tooShort: 'Not enough characters',
      invalidAge: 'Please enter a valid age',
      invalidHeight: 'Please enter a valid height',
      selectAtLeastOne: 'Please select at least one',
      selectMaxItems: 'Maximum selection exceeded'
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      preview: 'Preview',
      edit: 'Edit',
      select: 'Select',
      clear: 'Clear',
      back: 'Back',
      close: 'Close',
      confirm: 'Confirm',
      loading: 'Loading...',
      complete: 'Complete',
      optional: 'Optional',
      required: 'Required'
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
      maxSelection: '까지 선택 가능',
      gender: '성별',
      birthDate: '생년월일',
      prefecture: '현',
      city: '시',
      occupation: '직업',
      height: '키',
      bodyType: '체형',
      maritalStatus: '혼인 상태',
      hobbies: '체험하고 싶은 일본 문화',
      customCulture: '기타 일본 문화',
      personality: '성격',
      editTitle: '프로필 편집',
      profileCompletion: '프로필 완성도',
      requiredInfo: '필수 정보',
      optionalInfo: '선택 정보',
      foreignMaleTitle: '외국인 남성 프로필 편집',
      japaneseFemaleTitle: '일본인 여성 프로필 편집',
      foreignMaleSubtitle: '일본 여성과의 만남을 위해 정보를 업데이트하세요',
      japaneseFemaleSubtitle: '외국인 남성과의 만남을 위해 정보를 업데이트하세요',
      defaultSubtitle: '정보를 업데이트하세요',
      selfIntroduction: '자기소개',
      selfIntroPlaceholder: '당신의 매력과 일본 문화에 대한 관심에 대해 알려주세요 (100자 이상 1000자 이내)',
      selfIntroNote: '자기소개는 100자 이상 1000자 이내로 작성해 주세요.'
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
    gender: {
      male: '남성',
      female: '여성'
    },
    bodyType: {
      noEntry: '기입하지 않음',
      slim: '슬림',
      average: '보통',
      muscular: '근육질',
      plump: '통통'
    },
    maritalStatus: {
      none: '기입하지 않음',
      single: '미혼',
      married: '기혼'
    },
    occupations: {
      noEntry: '기입하지 않음',
      housewife: '주부',
      student: '학생',
      companyEmployee: '회사원',
      publicServant: '공무원',
      selfEmployed: '자영업',
      freelance: '프리랜서',
      partTime: '아르바이트',
      other: '기타'
    },
    japaneseHobbies: {
      anime: '애니메이션',
      manga: '만화',
      games: '게임',
      jpop: 'J-POP',
      travel: '일본 여행',
      food: '일본 요리',
      language: '일본어 학습',
      history: '일본 역사',
      martialArts: '무도',
      tea: '다도',
      kimono: '기모노',
      festivals: '축제',
      temples: '절과 신사',
      nature: '일본의 자연',
      technology: '일본의 기술',
      fashion: '일본 패션'
    },
    personalities: {
      cheerful: '밝은',
      calm: '차분한',
      serious: '진지한',
      funny: '유머러스한',
      kind: '친절한',
      active: '활동적인',
      creative: '창의적인',
      thoughtful: '사려깊은'
    },
    errors: {
      required: '이 항목은 필수입니다',
      tooLong: '글자 수가 너무 많습니다',
      tooShort: '글자 수가 부족합니다',
      invalidAge: '유효한 나이를 입력하세요',
      invalidHeight: '유효한 키를 입력하세요',
      selectAtLeastOne: '하나 이상 선택하세요',
      selectMaxItems: '최대 선택 수를 초과했습니다'
    },
    common: {
      save: '저장',
      cancel: '취소',
      preview: '미리보기',
      edit: '편집',
      select: '선택',
      clear: '지우기',
      back: '뒤로',
      close: '닫기',
      confirm: '확인',
      loading: '로딩 중...',
      complete: '완료',
      optional: '선택사항',
      required: '필수'
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
      maxSelection: '最多可選擇',
      gender: '性別',
      birthDate: '出生日期',
      prefecture: '都道府縣',
      city: '市區',
      occupation: '職業',
      height: '身高',
      bodyType: '體型',
      maritalStatus: '婚姻狀態',
      hobbies: '想體驗的日本文化',
      customCulture: '其他日本文化',
      personality: '性格',
      editTitle: '編輯個人資料',
      profileCompletion: '個人資料完成度',
      requiredInfo: '必填資訊',
      optionalInfo: '選填資訊',
      foreignMaleTitle: '外國男性個人資料編輯',
      japaneseFemaleTitle: '日本女性個人資料編輯',
      foreignMaleSubtitle: '為了與日本女性相遇，請更新您的資訊',
      japaneseFemaleSubtitle: '為了與外國男性相遇，請更新您的資訊',
      defaultSubtitle: '請更新您的資訊',
      selfIntroduction: '自我介紹',
      selfIntroPlaceholder: '請介紹您的魅力和對日本文化的興趣（100-1000字）',
      selfIntroNote: '請在100-1000字內寫自我介紹。'
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
    gender: {
      male: '男性',
      female: '女性'
    },
    bodyType: {
      noEntry: '不填寫',
      slim: '瘦',
      average: '中等',
      muscular: '肌肉結實',
      plump: '豐滿'
    },
    maritalStatus: {
      none: '不填寫',
      single: '單身',
      married: '已婚'
    },
    occupations: {
      noEntry: '不填寫',
      housewife: '家庭主婦',
      student: '學生',
      companyEmployee: '上班族',
      publicServant: '公務員',
      selfEmployed: '自雇',
      freelance: '自由工作者',
      partTime: '兼職',
      other: '其他'
    },
    japaneseHobbies: {
      anime: '動畫',
      manga: '漫畫',
      games: '遊戲',
      jpop: 'J-POP',
      travel: '日本旅遊',
      food: '日式料理',
      language: '日語學習',
      history: '日本歷史',
      martialArts: '武道',
      tea: '茶道',
      kimono: '和服',
      festivals: '祭典',
      temples: '寺廟神社',
      nature: '日本自然',
      technology: '日本技術',
      fashion: '日式時尚'
    },
    personalities: {
      cheerful: '開朗',
      calm: '沉穩',
      serious: '認真',
      funny: '幽默',
      kind: '善良',
      active: '活躍',
      creative: '創意',
      thoughtful: '體貼'
    },
    errors: {
      required: '此欄位為必填',
      tooLong: '字數過多',
      tooShort: '字數不足',
      invalidAge: '請輸入有效的年齡',
      invalidHeight: '請輸入有效的身高',
      selectAtLeastOne: '請至少選擇一項',
      selectMaxItems: '超過最大選擇數量'
    },
    common: {
      save: '保存',
      cancel: '取消',
      preview: '預覽',
      edit: '編輯',
      select: '選擇',
      clear: '清除',
      back: '返回',
      close: '關閉',
      confirm: '確認',
      loading: '載入中...',
      complete: '完成',
      optional: '選填',
      required: '必填'
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