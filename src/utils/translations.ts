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
    // プロフィール完成度メッセージ
    itemsCompleted: string
    calculating: string
    completionLow: string
    completionMedium: string
    completionHigh: string
    completionPerfect: string
    requiredForPublication: string
  }

  // プレースホルダーテキスト
  placeholders: {
    nickname: string
    age: string
    height: string
    city: string
    selectOccupation: string
    selectNationality: string
    selectPrefectures: string
    selectBodyType: string
    selectMaritalStatus: string
    selectJapaneseLevel: string
    selectEnglishLevel: string
    selectVisitSchedule: string
    selectTravelCompanion: string
    enterCustomCulture: string
  }

  // ボタンラベル
  buttons: {
    save: string
    cancel: string
    add: string
    remove: string
    edit: string
    delete: string
    upload: string
    preview: string
    back: string
    next: string
    complete: string
    selectAll: string
    clearAll: string
    confirm: string
  }

  // エラーメッセージ
  errors: {
    required: string
    nicknameRequired: string
    nicknameMaxLength: string
    genderRequired: string
    birthDateRequired: string
    ageMinimum: string
    ageMaximum: string
    heightMinimum: string
    heightMaximum: string
    hobbiesMinimum: string
    hobbiesMaximum: string
    customCultureMaxLength: string
    selfIntroMinimum: string
    selfIntroMaximum: string
    nationalityRequired: string
    prefecturesMinimum: string
    cityRequired: string
    saveFailed: string
    loadFailed: string
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
    houseHusband: string
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
    sweets: string
    arts: string
    seasonal: string
    lifestyle: string
    craftmanship: string
    modernCulture: string
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
    gardenWalk: string

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

    // スイーツ
    matchaSweets: string
    dango: string
    taiyaki: string
    obanyaki: string
    warabimochi: string
    candiedApple: string
    cottonCandy: string
    dagashi: string
    conbiniSweets: string

    // 芸能・スポーツ
    sumo: string
    kendo: string
    judo: string
    karate: string
    kyudo: string
    aikido: string
    naginata: string
    kabuki: string
    noh: string
    japaneseDance: string
    hogaku: string
    enka: string
    taiko: string

    // 暮らし・空間
    shoji: string
    fusuma: string
    tatami: string
    oldHouseCafe: string
    sento: string
    showaRetro: string
    waModernInterior: string

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

  // 写真アップロード関連
  photos: {
    profilePhotos: string
    maxPhotos: string
    main: string
    addPhoto: string
    mainPhotoNote: string
    fileSizeNote: string
    editingNote: string
    fileSizeError: string
    fileTypeError: string
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
      selfIntroNote: '自己紹介は100文字以上1000文字以内で入力してください。',
      // プロフィール完成度メッセージ
      itemsCompleted: '項目入力済み',
      calculating: '計算中...',
      completionLow: '基本情報をもう少し入力してみましょう',
      completionMedium: '詳細情報を追加してプロフィールを充実させましょう',
      completionHigh: 'あと少しで完璧なプロフィールです！',
      completionPerfect: '素晴らしい！完璧なプロフィールです✨',
      requiredForPublication: '（プロフィール公開に必要な項目）'
    },

    placeholders: {
      nickname: 'ニックネーム',
      age: '25',
      height: '160',
      city: '市区町村名を入力',
      selectOccupation: '職業を選択',
      selectNationality: '国籍を選択',
      selectPrefectures: '都道府県を選択',
      selectBodyType: '体型を選択',
      selectMaritalStatus: '婚姻状況を選択',
      selectJapaneseLevel: '日本語レベルを選択',
      selectEnglishLevel: '英語レベルを選択',
      selectVisitSchedule: '訪問予定時期を選択',
      selectTravelCompanion: '同行者を選択',
      enterCustomCulture: 'その他の日本文化を入力（任意）'
    },

    buttons: {
      save: '保存',
      cancel: 'キャンセル',
      add: '追加',
      remove: '削除',
      edit: '編集',
      delete: '削除',
      upload: 'アップロード',
      preview: 'プレビュー',
      back: '戻る',
      next: '次へ',
      complete: '完了',
      selectAll: '全て選択',
      clearAll: '全てクリア',
      confirm: '確定'
    },

    errors: {
      required: 'この項目は必須です',
      nicknameRequired: 'ニックネームを入力してください',
      nicknameMaxLength: 'ニックネームは20文字以内で入力してください',
      genderRequired: '性別を選択してください',
      birthDateRequired: '生年月日を入力してください',
      ageMinimum: '18歳以上である必要があります',
      ageMaximum: '99歳以下で入力してください',
      heightMinimum: '身長は120cm以上で入力してください',
      heightMaximum: '身長は250cm以下で入力してください',
      hobbiesMinimum: '日本文化を1つ以上選択してください',
      hobbiesMaximum: '日本文化は8つまで選択できます',
      customCultureMaxLength: 'その他の日本文化は100文字以内で入力してください',
      selfIntroMinimum: '自己紹介は100文字以上で入力してください',
      selfIntroMaximum: '自己紹介は1000文字以内で入力してください',
      nationalityRequired: '国籍を選択してください',
      prefecturesMinimum: '行く予定の都道府県を少なくとも1つ選択してください',
      cityRequired: '都道府県を入力してください',
      saveFailed: '保存に失敗しました',
      loadFailed: '読み込みに失敗しました'
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
      housewife: '主婦',
      houseHusband: '主夫',
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
      sweets: 'スイーツ',
      arts: '芸能・スポーツ',
      seasonal: '季節・自然',
      lifestyle: '暮らし・空間',
      craftmanship: '工芸・職人技',
      modernCulture: '現代カルチャー'
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
      gardenWalk: '日本庭園散策',
      matchaSweets: '抹茶スイーツ',
      dango: '団子',
      taiyaki: 'たい焼き',
      obanyaki: '大判焼き',
      warabimochi: 'わらび餅',
      candiedApple: 'りんご飴',
      cottonCandy: 'わたあめ',
      dagashi: '駄菓子',
      conbiniSweets: 'コンビニスイーツ',
      sumo: '相撲',
      kendo: '剣道',
      judo: '柔道',
      karate: '空手',
      kyudo: '弓道',
      aikido: '合気道',
      naginata: '薙刀',
      kabuki: '歌舞伎',
      noh: '能',
      japaneseDance: '日本舞踊',
      hogaku: '邦楽',
      enka: '演歌',
      taiko: '太鼓',
      shoji: '障子',
      fusuma: '襖の張り替え',
      tatami: '畳',
      oldHouseCafe: '古民家カフェ',
      sento: '銭湯',
      showaRetro: '昭和レトロ家電',
      waModernInterior: '和モダンインテリア',
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
    },
    
    photos: {
      profilePhotos: 'プロフィール写真',
      maxPhotos: '最大',
      main: 'メイン',
      addPhoto: '写真を追加',
      mainPhotoNote: '1枚目がメイン写真として表示されます',
      fileSizeNote: '各写真は5MB以下にしてください',
      editingNote: 'トリミングやぼかし加工ができます',
      fileSizeError: '画像ファイルは5MB以下にしてください',
      fileTypeError: '対応している画像ファイルを選択してください (JPEG, PNG, WebP, HEIC)'
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
      selfIntroNote: 'Please write your self-introduction in 100-1000 characters.',
      // プロフィール完成度メッセージ
      itemsCompleted: 'items completed',
      calculating: 'Calculating...',
      completionLow: 'Please fill in a bit more basic information',
      completionMedium: 'Add more details to enhance your profile',
      completionHigh: 'Almost there! Just a few more details',
      completionPerfect: 'Excellent! You have a perfect profile ✨',
      requiredForPublication: '(Required for profile publication)'
    },

    placeholders: {
      nickname: 'Nickname',
      age: '25',
      height: '160',
      city: 'Enter city name',
      selectOccupation: 'Select occupation',
      selectNationality: 'Select nationality',
      selectPrefectures: 'Select prefectures',
      selectBodyType: 'Select body type',
      selectMaritalStatus: 'Select marital status',
      selectJapaneseLevel: 'Select Japanese level',
      selectEnglishLevel: 'Select English level',
      selectVisitSchedule: 'Select visit schedule',
      selectTravelCompanion: 'Select travel companion',
      enterCustomCulture: 'Enter other Japanese culture (optional)'
    },

    buttons: {
      save: 'Save',
      cancel: 'Cancel',
      add: 'Add',
      remove: 'Remove',
      edit: 'Edit',
      delete: 'Delete',
      upload: 'Upload',
      preview: 'Preview',
      back: 'Back',
      next: 'Next',
      complete: 'Complete',
      selectAll: 'Select All',
      clearAll: 'Clear All',
      confirm: 'Confirm'
    },

    errors: {
      required: 'This field is required',
      nicknameRequired: 'Please enter your nickname',
      nicknameMaxLength: 'Nickname must be 20 characters or less',
      genderRequired: 'Please select your gender',
      birthDateRequired: 'Please enter your date of birth',
      ageMinimum: 'Must be 18 years or older',
      ageMaximum: 'Must be 99 years or younger',
      heightMinimum: 'Height must be 120cm or more',
      heightMaximum: 'Height must be 250cm or less',
      hobbiesMinimum: 'Please select at least one Japanese culture',
      hobbiesMaximum: 'You can select up to 8 Japanese cultures',
      customCultureMaxLength: 'Other Japanese culture must be 100 characters or less',
      selfIntroMinimum: 'Self introduction must be at least 100 characters',
      selfIntroMaximum: 'Self introduction must be 1000 characters or less',
      nationalityRequired: 'Please select your nationality',
      prefecturesMinimum: 'Please select at least one prefecture to visit',
      cityRequired: 'Please enter prefecture',
      saveFailed: 'Failed to save',
      loadFailed: 'Failed to load'
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
      houseHusband: 'House Husband',
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
      sweets: 'Japanese Sweets',
      arts: 'Arts & Sports',
      seasonal: 'Seasonal & Nature',
      lifestyle: 'Lifestyle & Space',
      craftmanship: 'Crafts & Artisanship',
      modernCulture: 'Modern Culture'
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
      gardenWalk: 'Japanese Garden Walk',
      matchaSweets: 'Matcha Sweets',
      dango: 'Dango',
      taiyaki: 'Taiyaki',
      obanyaki: 'Obanyaki',
      warabimochi: 'Warabimochi',
      candiedApple: 'Candied Apple',
      cottonCandy: 'Cotton Candy',
      dagashi: 'Dagashi',
      conbiniSweets: 'Convenience Store Sweets',
      sumo: 'Sumo',
      kendo: 'Kendo',
      judo: 'Judo',
      karate: 'Karate',
      kyudo: 'Kyudo',
      aikido: 'Aikido',
      naginata: 'Naginata',
      kabuki: 'Kabuki',
      noh: 'Noh',
      japaneseDance: 'Japanese Dance',
      hogaku: 'Hogaku',
      enka: 'Enka',
      taiko: 'Taiko',
      shoji: 'Shoji',
      fusuma: 'Fusuma',
      tatami: 'Tatami',
      oldHouseCafe: 'Old House Cafe',
      sento: 'Sento',
      showaRetro: 'Showa Retro',
      waModernInterior: 'Wa-Modern Interior',
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
    },
    
    photos: {
      profilePhotos: 'Profile Photos',
      maxPhotos: 'Max',
      main: 'Main',
      addPhoto: 'Add Photo',
      mainPhotoNote: 'The first photo will be displayed as your main photo',
      fileSizeNote: 'Please keep each photo under 5MB',
      editingNote: 'You can crop and blur your photos',
      fileSizeError: 'Please keep image files under 5MB',
      fileTypeError: 'Please select a supported image file (JPEG, PNG, WebP, HEIC)'
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
      selfIntroNote: '자기소개는 100자 이상 1000자 이내로 작성해 주세요.',
      // 프로필 완성도 메시지
      itemsCompleted: '항목 완료',
      calculating: '계산 중...',
      completionLow: '기본 정보를 조금 더 입력해 주세요',
      completionMedium: '세부 정보를 추가하여 프로필을 충실하게 만들어 주세요',
      completionHigh: '조금만 더! 몇 가지 세부사항만 남았습니다',
      completionPerfect: '훌륭합니다! 완벽한 프로필입니다 ✨',
      requiredForPublication: '(프로필 공개에 필요한 항목)'
    },

    placeholders: {
      nickname: '닉네임',
      age: '25',
      height: '160',
      city: '시명을 입력하세요',
      selectOccupation: '직업 선택',
      selectNationality: '국적 선택',
      selectPrefectures: '현 선택',
      selectBodyType: '체형 선택',
      selectMaritalStatus: '혼인 상태 선택',
      selectJapaneseLevel: '일본어 수준 선택',
      selectEnglishLevel: '영어 수준 선택',
      selectVisitSchedule: '방문 예정 시기 선택',
      selectTravelCompanion: '동행자 선택',
      enterCustomCulture: '기타 일본 문화 입력 (선택사항)'
    },

    buttons: {
      save: '저장',
      cancel: '취소',
      add: '추가',
      remove: '제거',
      edit: '편집',
      delete: '삭제',
      upload: '업로드',
      preview: '미리보기',
      back: '뒤로',
      next: '다음',
      complete: '완료',
      selectAll: '모두 선택',
      clearAll: '모두 지우기',
      confirm: '확인'
    },

    errors: {
      required: '이 항목은 필수입니다',
      nicknameRequired: '닉네임을 입력해 주세요',
      nicknameMaxLength: '닉네임은 20자 이내로 입력해 주세요',
      genderRequired: '성별을 선택해 주세요',
      birthDateRequired: '생년월일을 입력해 주세요',
      ageMinimum: '18세 이상이어야 합니다',
      ageMaximum: '99세 이하로 입력해 주세요',
      heightMinimum: '키는 120cm 이상으로 입력해 주세요',
      heightMaximum: '키는 250cm 이하로 입력해 주세요',
      hobbiesMinimum: '일본 문화를 1개 이상 선택해 주세요',
      hobbiesMaximum: '일본 문화는 8개까지 선택할 수 있습니다',
      customCultureMaxLength: '기타 일본 문화는 100자 이내로 입력해 주세요',
      selfIntroMinimum: '자기소개는 100자 이상으로 입력해 주세요',
      selfIntroMaximum: '자기소개는 1000자 이내로 입력해 주세요',
      nationalityRequired: '국적을 선택해 주세요',
      prefecturesMinimum: '방문 예정 현을 최소 1개 선택해 주세요',
      cityRequired: '현을 입력해 주세요',
      saveFailed: '저장에 실패했습니다',
      loadFailed: '로드에 실패했습니다'
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
      houseHusband: '주부남',
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
      sweets: '스위츠',
      arts: '예능·스포츠',
      seasonal: '계절·자연',
      lifestyle: '생활·공간',
      craftmanship: '공예·장인 기술',
      modernCulture: '현대 문화'
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
      gardenWalk: '일본 정원 산책',
      matchaSweets: '말차 디저트',
      dango: '단고',
      taiyaki: '타이야키',
      obanyaki: '오반야키',
      warabimochi: '와라비모치',
      candiedApple: '사과엿',
      cottonCandy: '솜사탕',
      dagashi: '다가시',
      conbiniSweets: '편의점 디저트',
      sumo: '스모',
      kendo: '검도',
      judo: '유도',
      karate: '가라테',
      kyudo: '궁도',
      aikido: '합기도',
      naginata: '나기나타',
      kabuki: '가부키',
      noh: '노',
      japaneseDance: '일본 무용',
      hogaku: '일본 전통음악',
      enka: '엔카',
      taiko: '북',
      shoji: '쇼지',
      fusuma: '후스마',
      tatami: '다다미',
      oldHouseCafe: '고민가 카페',
      sento: '센토',
      showaRetro: '쇼와 레트로',
      waModernInterior: '와 모던 인테리어',
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
    },
    
    photos: {
      profilePhotos: '프로필 사진',
      maxPhotos: '최대',
      main: '메인',
      addPhoto: '사진 추가',
      mainPhotoNote: '첫 번째 사진이 메인 사진으로 표시됩니다',
      fileSizeNote: '각 사진은 5MB 이하로 해주세요',
      editingNote: '크롭 및 흐림 효과 편집이 가능합니다',
      fileSizeError: '이미지 파일은 5MB 이하로 해주세요',
      fileTypeError: '지원하는 이미지 파일을 선택해 주세요 (JPEG, PNG, WebP, HEIC)'
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
      selfIntroNote: '請在100-1000字內寫自我介紹。',
      // 個人資料完成度訊息
      itemsCompleted: '項目已完成',
      calculating: '計算中...',
      completionLow: '請再多填寫一些基本資訊',
      completionMedium: '請增加詳細資訊來豐富您的個人資料',
      completionHigh: '就快完成了！還差一些細節',
      completionPerfect: '太棒了！您有一個完美的個人資料 ✨',
      requiredForPublication: '（個人資料公開所需項目）'
    },

    placeholders: {
      nickname: '暱稱',
      age: '25',
      height: '160',
      city: '請輸入市區名稱',
      selectOccupation: '選擇職業',
      selectNationality: '選擇國籍',
      selectPrefectures: '選擇都道府縣',
      selectBodyType: '選擇體型',
      selectMaritalStatus: '選擇婚姻狀態',
      selectJapaneseLevel: '選擇日語程度',
      selectEnglishLevel: '選擇英語程度',
      selectVisitSchedule: '選擇拜訪時期',
      selectTravelCompanion: '選擇同行者',
      enterCustomCulture: '輸入其他日本文化（選填）'
    },

    buttons: {
      save: '儲存',
      cancel: '取消',
      add: '新增',
      remove: '移除',
      edit: '編輯',
      delete: '刪除',
      upload: '上傳',
      preview: '預覽',
      back: '返回',
      next: '下一步',
      complete: '完成',
      selectAll: '全選',
      clearAll: '全部清除',
      confirm: '確認'
    },

    errors: {
      required: '此欄位為必填',
      nicknameRequired: '請輸入暱稱',
      nicknameMaxLength: '暱稱請在20字以內',
      genderRequired: '請選擇性別',
      birthDateRequired: '請輸入出生日期',
      ageMinimum: '必須年滿18歲',
      ageMaximum: '請輸入99歲以下',
      heightMinimum: '身高請輸入120cm以上',
      heightMaximum: '身高請輸入250cm以下',
      hobbiesMinimum: '請至少選擇一項日本文化',
      hobbiesMaximum: '最多可選擇8項日本文化',
      customCultureMaxLength: '其他日本文化請在100字以內',
      selfIntroMinimum: '自我介紹請至少100字',
      selfIntroMaximum: '自我介紹請在1000字以內',
      nationalityRequired: '請選擇國籍',
      prefecturesMinimum: '請至少選擇一個預計前往的都道府縣',
      cityRequired: '請輸入都道府縣',
      saveFailed: '儲存失敗',
      loadFailed: '載入失敗'
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
      houseHusband: '家庭主夫',
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
      sweets: '甜點',
      arts: '藝能·運動',
      seasonal: '季節·自然',
      lifestyle: '生活·空間',
      craftmanship: '工藝·職人技術',
      modernCulture: '現代文化'
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
      gardenWalk: '日本庭園散步',
      matchaSweets: '抹茶甜點',
      dango: '團子',
      taiyaki: '鯛魚燒',
      obanyaki: '大判燒',
      warabimochi: '蕨餅',
      candiedApple: '蘋果糖',
      cottonCandy: '棉花糖',
      dagashi: '駄菓子',
      conbiniSweets: '便利商店甜點',
      sumo: '相撲',
      kendo: '劍道',
      judo: '柔道',
      karate: '空手道',
      kyudo: '弓道',
      aikido: '合氣道',
      naginata: '薙刀',
      kabuki: '歌舞伎',
      noh: '能劇',
      japaneseDance: '日本舞踊',
      hogaku: '邦樂',
      enka: '演歌',
      taiko: '太鼓',
      shoji: '障子',
      fusuma: '襖',
      tatami: '榻榻米',
      oldHouseCafe: '古民家咖啡廳',
      sento: '錢湯',
      showaRetro: '昭和復古',
      waModernInterior: '和風現代室內設計',
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
    },
    
    photos: {
      profilePhotos: '個人資料照片',
      maxPhotos: '最多',
      main: '主要',
      addPhoto: '新增照片',
      mainPhotoNote: '第一張照片將顯示為您的主要照片',
      fileSizeNote: '請將每張照片保持在5MB以下',
      editingNote: '您可以裁剪和模糊您的照片',
      fileSizeError: '請將圖片檔案保持在5MB以下',
      fileTypeError: '請選擇支援的圖片檔案 (JPEG, PNG, WebP, HEIC)'
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