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
    companyEmployee: string
    publicServant: string
    executiveManager: string
    freelance: string
    selfEmployed: string
    doctor: string
    nurse: string
    teacher: string
    engineer: string
    designer: string
    sales: string
    marketing: string
    researcher: string
    consultant: string
    finance: string
    legal: string
    serviceIndustry: string
    retail: string
    manufacturing: string
    student: string
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

  // 性格特性
  personality: {
    gentle: string
    calm: string
    lonely: string
    composed: string
    caring: string
    humble: string
    cool: string
    honest: string
    bright: string
    friendly: string
    helpful: string
    considerate: string
    responsible: string
    decisive: string
    sociable: string
    competitive: string
    passionate: string
    indoor: string
    active: string
    intellectual: string
    meticulous: string
    optimistic: string
    shy: string
    attentive: string
    refreshing: string
    natural: string
    ownPace: string
  }

  // 日本文化カテゴリ
  cultureCategories: {
    traditional: string
    food: string
    seasonal: string
    modernCulture: string
    craftmanship: string
  }

  // 日本文化アイテム
  culture: {
    // 伝統文化
    teaCeremony: string
    flowerArrangement: string
    calligraphy: string
    kimono: string
    wagashi: string
    pottery: string
    origami: string
    bonsai: string
    shrinesTemples: string
    sealCollection: string
    zen: string

    // 食文化
    sushi: string
    tempura: string
    unagi: string
    gyudon: string
    tonkatsu: string
    ramen: string
    okonomiyaki: string
    takoyaki: string
    curry: string
    conbiniFood: string
    potatoChips: string
    dashi: string
    miso: string
    tofu: string
    umeboshi: string
    pickles: string
    sake: string
    shochu: string
    soba: string
    udon: string

    // 季節・自然・行事
    cherryBlossom: string
    autumnLeaves: string
    hotSprings: string
    festivals: string
    fireworks: string
    snowScape: string
    fourSeasons: string
    bonDance: string

    // 現代カルチャー
    anime: string
    manga: string
    cosplay: string
    japaneseGames: string
    jpop: string
    karaoke: string
    japaneseMov: string
    drama: string
    vocaloid: string
    idolCulture: string

    // 工芸・職人技
    lacquerware: string
    goldLeaf: string
    paperMaking: string
    dyeing: string
    swordSmithing: string
    woodworking: string
    sugarCrafts: string
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
      single: '未婚',
      married: '既婚'
    },
    occupations: {
      noEntry: '記入しない',
      companyEmployee: '会社員',
      publicServant: '公務員',
      executiveManager: '経営者・役員',
      freelance: 'フリーランス',
      selfEmployed: '自営業',
      doctor: '医師',
      nurse: '看護師',
      teacher: '教師・講師',
      engineer: 'エンジニア',
      designer: 'デザイナー',
      sales: '営業',
      marketing: 'マーケティング',
      researcher: '研究者',
      consultant: 'コンサルタント',
      finance: '金融',
      legal: '法律関係',
      serviceIndustry: 'サービス業',
      retail: '小売業',
      manufacturing: '製造業',
      student: '学生',
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
    personality: {
      gentle: '優しい',
      calm: '穏やか',
      lonely: '寂しがりや',
      composed: '落ち着いている',
      caring: '思いやりがある',
      humble: '謙虚',
      cool: '冷静',
      honest: '素直',
      bright: '明るい',
      friendly: '親しみやすい',
      helpful: '面倒見が良い',
      considerate: '気が利く',
      responsible: '責任感がある',
      decisive: '決断力がある',
      sociable: '社交的',
      competitive: '負けず嫌い',
      passionate: '熱血',
      indoor: 'インドア',
      active: 'アクティブ',
      intellectual: '知的',
      meticulous: '几帳面',
      optimistic: '楽観的',
      shy: 'シャイ',
      attentive: 'マメ',
      refreshing: 'さわやか',
      natural: '天然',
      ownPace: 'マイペース'
    },
    cultureCategories: {
      traditional: '伝統文化',
      food: '食文化',
      seasonal: '季節・自然・行事',
      modernCulture: '現代カルチャー',
      craftmanship: '工芸・職人技'
    },
    culture: {
      teaCeremony: '茶道',
      flowerArrangement: '華道',
      calligraphy: '書道',
      kimono: '着物・浴衣',
      wagashi: '和菓子',
      pottery: '陶芸',
      origami: '折り紙',
      bonsai: '盆栽',
      shrinesTemples: '神社仏閣',
      sealCollection: '御朱印集め',
      zen: '禅',
      sushi: '寿司',
      tempura: '天ぷら',
      unagi: 'うなぎ',
      gyudon: '牛丼',
      tonkatsu: 'とんかつ',
      ramen: 'ラーメン',
      okonomiyaki: 'お好み焼き',
      takoyaki: 'たこ焼き',
      curry: 'カレーライス',
      conbiniFood: 'コンビニフード',
      potatoChips: 'ポテトチップス',
      dashi: '出汁',
      miso: '味噌',
      tofu: '豆腐',
      umeboshi: '梅干し',
      pickles: '漬物',
      sake: '日本酒',
      shochu: '焼酎',
      soba: 'そば',
      udon: 'うどん',
      cherryBlossom: '桜見物',
      autumnLeaves: '紅葉狩り',
      hotSprings: '温泉',
      festivals: '祭り',
      fireworks: '花火大会',
      snowScape: '雪景色',
      fourSeasons: '日本の四季',
      bonDance: '盆踊り',
      anime: 'アニメ',
      manga: 'マンガ',
      cosplay: 'コスプレ',
      japaneseGames: '日本のゲーム',
      jpop: 'J-POP',
      karaoke: 'カラオケ',
      japaneseMov: '日本映画',
      drama: 'ドラマ',
      vocaloid: 'ボーカロイド',
      idolCulture: 'アイドル文化',
      lacquerware: '漆器',
      goldLeaf: '金箔貼り',
      paperMaking: '和紙漉き',
      dyeing: '染物',
      swordSmithing: '刀鍛冶',
      woodworking: '木工',
      sugarCrafts: '飴細工'
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
      companyEmployee: 'Company Employee',
      publicServant: 'Public Servant',
      executiveManager: 'Executive/Manager',
      freelance: 'Freelance',
      selfEmployed: 'Self-employed',
      doctor: 'Doctor',
      nurse: 'Nurse',
      teacher: 'Teacher/Instructor',
      engineer: 'Engineer',
      designer: 'Designer',
      sales: 'Sales',
      marketing: 'Marketing',
      researcher: 'Researcher',
      consultant: 'Consultant',
      finance: 'Finance',
      legal: 'Legal',
      serviceIndustry: 'Service Industry',
      retail: 'Retail',
      manufacturing: 'Manufacturing',
      student: 'Student',
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
    personality: {
      gentle: 'Gentle',
      calm: 'Calm',
      lonely: 'Lonely',
      composed: 'Composed',
      caring: 'Caring',
      humble: 'Humble',
      cool: 'Cool-headed',
      honest: 'Honest',
      bright: 'Bright',
      friendly: 'Friendly',
      helpful: 'Helpful',
      considerate: 'Considerate',
      responsible: 'Responsible',
      decisive: 'Decisive',
      sociable: 'Sociable',
      competitive: 'Competitive',
      passionate: 'Passionate',
      indoor: 'Indoor',
      active: 'Active',
      intellectual: 'Intellectual',
      meticulous: 'Meticulous',
      optimistic: 'Optimistic',
      shy: 'Shy',
      attentive: 'Attentive',
      refreshing: 'Refreshing',
      natural: 'Natural',
      ownPace: 'Own pace'
    },
    cultureCategories: {
      traditional: 'Traditional Culture',
      food: 'Food Culture',
      seasonal: 'Seasonal & Events',
      modernCulture: 'Modern Culture',
      craftmanship: 'Crafts & Artisanship'
    },
    culture: {
      teaCeremony: 'Tea Ceremony',
      flowerArrangement: 'Flower Arrangement',
      calligraphy: 'Calligraphy',
      kimono: 'Kimono/Yukata',
      wagashi: 'Wagashi',
      pottery: 'Pottery',
      origami: 'Origami',
      bonsai: 'Bonsai',
      shrinesTemples: 'Shrines & Temples',
      sealCollection: 'Temple Seal Collection',
      zen: 'Zen',
      sushi: 'Sushi',
      tempura: 'Tempura',
      unagi: 'Unagi',
      gyudon: 'Gyudon',
      tonkatsu: 'Tonkatsu',
      ramen: 'Ramen',
      okonomiyaki: 'Okonomiyaki',
      takoyaki: 'Takoyaki',
      curry: 'Japanese Curry',
      conbiniFood: 'Convenience Store Food',
      potatoChips: 'Japanese Potato Chips',
      dashi: 'Dashi',
      miso: 'Miso',
      tofu: 'Tofu',
      umeboshi: 'Umeboshi',
      pickles: 'Japanese Pickles',
      sake: 'Sake',
      shochu: 'Shochu',
      soba: 'Soba',
      udon: 'Udon',
      cherryBlossom: 'Cherry Blossom Viewing',
      autumnLeaves: 'Autumn Leaves Viewing',
      hotSprings: 'Hot Springs',
      festivals: 'Festivals',
      fireworks: 'Fireworks Display',
      snowScape: 'Snow Scenery',
      fourSeasons: 'Four Seasons',
      bonDance: 'Bon Dance',
      anime: 'Anime',
      manga: 'Manga',
      cosplay: 'Cosplay',
      japaneseGames: 'Japanese Games',
      jpop: 'J-POP',
      karaoke: 'Karaoke',
      japaneseMov: 'Japanese Movies',
      drama: 'Japanese Drama',
      vocaloid: 'Vocaloid',
      idolCulture: 'Idol Culture',
      lacquerware: 'Lacquerware',
      goldLeaf: 'Gold Leaf Application',
      paperMaking: 'Japanese Paper Making',
      dyeing: 'Traditional Dyeing',
      swordSmithing: 'Sword Smithing',
      woodworking: 'Woodworking',
      sugarCrafts: 'Sugar Crafts'
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
      companyEmployee: '회사원',
      publicServant: '공무원',
      executiveManager: '경영자·임원',
      freelance: '프리랜서',
      selfEmployed: '자영업',
      doctor: '의사',
      nurse: '간호사',
      teacher: '교사·강사',
      engineer: '엔지니어',
      designer: '디자이너',
      sales: '영업',
      marketing: '마케팅',
      researcher: '연구원',
      consultant: '컨설턴트',
      finance: '금융',
      legal: '법률 관련',
      serviceIndustry: '서비스업',
      retail: '소매업',
      manufacturing: '제조업',
      student: '학생',
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
    personality: {
      gentle: '상냥한',
      calm: '차분한',
      lonely: '외로움을 타는',
      composed: '침착한',
      caring: '배려하는',
      humble: '겸손한',
      cool: '냉정한',
      honest: '솔직한',
      bright: '밝은',
      friendly: '친근한',
      helpful: '도움이 되는',
      considerate: '신경 쓰는',
      responsible: '책임감 있는',
      decisive: '결단력 있는',
      sociable: '사교적인',
      competitive: '승부욕 강한',
      passionate: '열정적인',
      indoor: '인도어',
      active: '활동적인',
      intellectual: '지적인',
      meticulous: '꼼꼼한',
      optimistic: '낙천적인',
      shy: '수줍은',
      attentive: '세심한',
      refreshing: '상쾌한',
      natural: '천연',
      ownPace: '마이페이스'
    },
    cultureCategories: {
      traditional: '전통 문화',
      food: '음식 문화',
      seasonal: '계절 & 행사',
      modernCulture: '현대 문화',
      craftmanship: '공예 & 장인 기술'
    },
    culture: {
      teaCeremony: '다도',
      flowerArrangement: '화도',
      calligraphy: '서도',
      kimono: '기모노/유카타',
      wagashi: '와가시',
      pottery: '도예',
      origami: '종이접기',
      bonsai: '분재',
      shrinesTemples: '신사불각',
      sealCollection: '고슈인 수집',
      zen: '선',
      sushi: '스시',
      tempura: '템푸라',
      unagi: '우나기',
      gyudon: '규동',
      tonkatsu: '돈가스',
      ramen: '라멘',
      okonomiyaki: '오코노미야키',
      takoyaki: '타코야키',
      curry: '일본식 카레',
      conbiniFood: '편의점 음식',
      potatoChips: '일본 감자칩',
      dashi: '다시',
      miso: '미소',
      tofu: '두부',
      umeboshi: '우메보시',
      pickles: '일본 절임',
      sake: '사케',
      shochu: '소주',
      soba: '소바',
      udon: '우동',
      cherryBlossom: '벚꽃 구경',
      autumnLeaves: '단풍 구경',
      hotSprings: '온천',
      festivals: '축제',
      fireworks: '불꽃축제',
      snowScape: '설경',
      fourSeasons: '사계절',
      bonDance: '본 춤',
      anime: '애니메이션',
      manga: '만화',
      cosplay: '코스프레',
      japaneseGames: '일본 게임',
      jpop: 'J-POP',
      karaoke: '노래방',
      japaneseMov: '일본 영화',
      drama: '드라마',
      vocaloid: '보컬로이드',
      idolCulture: '아이돌 문화',
      lacquerware: '칠기',
      goldLeaf: '금박 작업',
      paperMaking: '일본 종이 만들기',
      dyeing: '염색',
      swordSmithing: '도검 제작',
      woodworking: '목공',
      sugarCrafts: '설탕 공예'
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
      companyEmployee: '上班族',
      publicServant: '公務員',
      executiveManager: '經營者·主管',
      freelance: '自由工作者',
      selfEmployed: '自雇',
      doctor: '醫師',
      nurse: '護理師',
      teacher: '教師·講師',
      engineer: '工程師',
      designer: '設計師',
      sales: '業務',
      marketing: '行銷',
      researcher: '研究員',
      consultant: '顧問',
      finance: '金融',
      legal: '法律相關',
      serviceIndustry: '服務業',
      retail: '零售業',
      manufacturing: '製造業',
      student: '學生',
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
    personality: {
      gentle: '溫柔',
      calm: '沉靜',
      lonely: '容易寂寞',
      composed: '沉穩',
      caring: '貼心',
      humble: '謙遜',
      cool: '冷靜',
      honest: '率直',
      bright: '開朗',
      friendly: '親切',
      helpful: '樂於助人',
      considerate: '體貼',
      responsible: '有責任感',
      decisive: '有決斷力',
      sociable: '社交能力強',
      competitive: '不服輸',
      passionate: '熱情',
      indoor: '室內派',
      active: '活躍',
      intellectual: '知性',
      meticulous: '一絲不苟',
      optimistic: '樂觀',
      shy: '害羞',
      attentive: '細心',
      refreshing: '清新',
      natural: '天然',
      ownPace: '按自己的節奏'
    },
    cultureCategories: {
      traditional: '傳統文化',
      food: '飲食文化',
      seasonal: '季節與活動',
      modernCulture: '現代文化',
      craftmanship: '工藝與職人技術'
    },
    culture: {
      teaCeremony: '茶道',
      flowerArrangement: '華道',
      calligraphy: '書道',
      kimono: '和服/浴衣',
      wagashi: '和菓子',
      pottery: '陶藝',
      origami: '摺紙',
      bonsai: '盆栽',
      shrinesTemples: '神社佛閣',
      sealCollection: '御朱印收集',
      zen: '禪',
      sushi: '壽司',
      tempura: '天婦羅',
      unagi: '鰻魚',
      gyudon: '牛丼',
      tonkatsu: '豬排',
      ramen: '拉麵',
      okonomiyaki: '大阪燒',
      takoyaki: '章魚燒',
      curry: '日式咖哩',
      conbiniFood: '便利商店食品',
      potatoChips: '日式洋芋片',
      dashi: '高湯',
      miso: '味噌',
      tofu: '豆腐',
      umeboshi: '梅乾',
      pickles: '日式漬菜',
      sake: '日本酒',
      shochu: '燒酒',
      soba: '蕎麥麵',
      udon: '烏龍麵',
      cherryBlossom: '賞櫻',
      autumnLeaves: '賞楓',
      hotSprings: '溫泉',
      festivals: '祭典',
      fireworks: '煙火大會',
      snowScape: '雪景',
      fourSeasons: '四季',
      bonDance: '盆舞',
      anime: '動畫',
      manga: '漫畫',
      cosplay: '角色扮演',
      japaneseGames: '日本遊戲',
      jpop: 'J-POP',
      karaoke: 'KTV',
      japaneseMov: '日本電影',
      drama: '日劇',
      vocaloid: '初音未來',
      idolCulture: '偶像文化',
      lacquerware: '漆器',
      goldLeaf: '金箔裝飾',
      paperMaking: '和紙製作',
      dyeing: '染物',
      swordSmithing: '鍛刀',
      woodworking: '木工',
      sugarCrafts: '糖藝'
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