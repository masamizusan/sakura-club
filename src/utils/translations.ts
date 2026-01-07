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
    languages: string
    languageHelp: string
    languageLevel: {
      native: string
      beginner: string
      beginner_plus: string
      intermediate: string
      intermediate_plus: string
      advanced: string
    }
    languagePlaceholder: string
    languageLevelPlaceholder: string
    languageOptions: {
      ja: string
      en: string
      ko: string
      zh_tw: string
    }
    languageAddButton: string
    selectPrefectures: string
    selectStations: string
    selectedCount: string
    maxSelection: string
    prefectureSelectionRule: string
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
    requiredSection: string
    personalitySection: string
    cultureSection: string
    cultureSectionForeign: string
    // 選択項目の説明
    selectPersonalityNote: string
    selectCultureNote: string
    otherCultureLabel: string
    // 入力フィールドの説明
    birthDateReadonly: string
    birthDatePrivacy: string
    ageAutoCalculation: string
    japanVisitPlan: string
    cultureExperience: string
    cultureExperienceWant: string
    nicknameDescription: string
    updateProfile: string
    previewCheckButton: string
    previewAdvice: string
    selectPrefecturesWithCount: string
    // プレビュー画面用の翻訳
    bodyTypeLabel: string
    marriageStatus: string
    japaneseLanguage: string
    englishLanguage: string
    visitPlan: string
    companion: string
    plannedDestination: string
    plannedStationsLabel: string
    personalityLabel: string
    learnJapaneseCulture: string
    residence: string
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
    previewCheck: string
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
    prefecturesMaximum: string
    cityRequired: string
    saveFailed: string
    loadFailed: string
    // 新規登録用エラーメッセージ
    emailInvalid: string
    passwordMinLength: string
    passwordFormat: string
    locationRequired: string
    japaneseNationalityRequired: string
    japaneseLevelRequired: string
    englishLevelRequired: string
    plannedPrefecturesRequired: string
    languagePairRequired: string
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
    currentlyInJapan: string
    year2024: string
    year2025: string
    beyond2025: string
    beyond2026: string
    after: string
  }

  // 季節
  seasons: {
    spring: string
    summer: string
    autumn: string
    winter: string
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

  // 国籍・都道府県選択肢
  nationalities: {
    japan: string
    usa: string
    uk: string
    canada: string
    australia: string
    germany: string
    france: string
    netherlands: string
    italy: string
    spain: string
    sweden: string
    norway: string
    denmark: string
    korea: string
    china: string
    taiwan: string
    thailand: string
    singapore: string
    other: string
  }

  prefectures: {
    tokyo: string
    kanagawa: string
    chiba: string
    saitama: string
    osaka: string
    kyoto: string
    hyogo: string
    aichi: string
    fukuoka: string
    hokkaido: string
    miyagi: string
    hiroshima: string
    shizuoka: string
    ibaraki: string
    tochigi: string
    gunma: string
    niigata: string
    nagano: string
    yamanashi: string
    gifu: string
    mie: string
    shiga: string
    nara: string
    wakayama: string
    tottori: string
    shimane: string
    okayama: string
    yamaguchi: string
    tokushima: string
    kagawa: string
    ehime: string
    kochi: string
    saga: string
    nagasaki: string
    kumamoto: string
    oita: string
    miyazaki: string
    kagoshima: string
    okinawa: string
  }

  // 新規登録画面
  signup: {
    title: string
    backButton: string
    emailAddress: string
    emailPlaceholder: string
    password: string
    passwordPlaceholder: string
    passwordRequirement: string
    nickname: string
    nicknamePlaceholder: string
    nicknameNote: string
    gender: string
    male: string
    female: string
    genderNote: string
    birthDate: string
    birthDateNote: string
    nationality: string
    residence: string
    selectNationality: string
    selectPrefecture: string
    residenceNote: string
    genderSelectPrompt: string
    signupButton: string
    signingUp: string
    privacyNote: string
    loginPrompt: string
    loginLink: string
    ageRestriction: string
    signupFailed: string
    japaneseNationalityConfirm: string
    required: string
  }

  // ログイン画面
  login: {
    title: string
    subtitle: string
    emailAddress: string
    emailPlaceholder: string
    password: string
    passwordPlaceholder: string
    rememberMe: string
    forgotPassword: string
    loginButton: string
    loggingIn: string
    orDivider: string
    googleLogin: string
    facebookLogin: string
    signupPrompt: string
    signupLink: string
    securityNote: string
    loginFailed: string
    serverError: string
    errorPrefix: string
  }

  // 仮登録完了画面
  registerComplete: {
    title: string
    subtitle: string
    emailVerificationTitle: string
    emailVerificationDescription: string
    sentTo: string
    instructions: string
    troubleshootingTitle: string
    troubleshootingSpam: string
    troubleshootingEmailCheck: string
    troubleshootingDomain: string
    testModeTitle: string
    testModeDescription: string
    testModeButton: string
    loginButton: string
    backToHome: string
    helpNote: string
    errorTitle: string
    errorDescription: string
    backToSignup: string
  }

  // パスワードリセット画面
  resetPassword: {
    title: string
    subtitle: string
    newPassword: string
    newPasswordPlaceholder: string
    confirmPassword: string
    confirmPasswordPlaceholder: string
    updateButton: string
    updating: string
    successMessage: string
    invalidLinkError: string
    passwordMismatchError: string
    passwordTooShortError: string
    updateFailedError: string
    loadingText: string
  }

  verifyEmail: {
    loading: {
      title: string
      description: string
    }
    success: {
      title: string
      subtitle: string
      autoRedirectNotice: string
      autoRedirectTime: string
      proceedButton: string
    }
    error: {
      title: string
      expiredTitle: string
      description: string
      expiredDescription: string
      invalidUrlError: string
      verificationFailedError: string
      signupButton: string
      loginButton: string
    }
    loadingFallback: {
      title: string
      description: string
    }
  }

  // トップページ
  homepage: {
    // ヘッダー
    aboutService: string
    howItWorks: string
    safetyAndSecurity: string
    culturalExperience: string
    login: string
    signup: string
    
    // ヒーローセクション
    heroTitle: string
    heroSubtitle: string
    heroDescription: string
    getStartedFree: string
    loginHere: string
    
    // フィーチャーセクション
    safetyTitle: string
    safetyDescription: string
    culturalExchangeTitle: string
    culturalExchangeDescription: string
    internationalExchangeTitle: string
    internationalExchangeDescription: string
  }
  
  // 独立した言語関連オブジェクト
  languageOptions: {
    japanese: string
    english: string
    korean: string
    chineseTraditional: string
  }
  
  languageLevels: {
    native: string
    beginner: string
    beginnerPlus: string
    intermediate: string
    intermediatePlus: string
    advanced: string
  }

  // 言語レベル定義説明
  languageLevelDefinitions: {
    title: string
    beginner: string
    elementary: string
    intermediate: string
    upperIntermediate: string
    advanced: string
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
      languages: '使用言語',
      languageHelp: 'あなたが使用できる言語とそのレベルを選択してください（最低1つ必須）',
      languageLevel: {
        native: '母国語',
        beginner: '初級（日常会話は難しい）',
        beginner_plus: '初級上（基本的な日常会話ができる）',
        intermediate: '中級（日常会話は問題ない）',
        intermediate_plus: '中級上（雑談や複雑な話題も理解できる）',
        advanced: '上級（流暢に話せる）'
      },
      languagePlaceholder: '選択してください',
      languageLevelPlaceholder: '選択してください',
      languageOptions: {
        ja: '日本語',
        en: '英語',
        ko: '韓国語',
        zh_tw: '中国語（繁体字）'
      },
      languageAddButton: '＋ 使用言語を追加',
      selectPrefectures: '都道府県を選択',
      selectStations: '駅を選択',
      selectedCount: '選択済み',
      maxSelection: 'まで選択できます',
      prefectureSelectionRule: '1つ以上選択してください（最大3つまで）',
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
      japaneseFemaleSubtitle: '外国人男性との文化交流のために、あなたの情報を更新してください',
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
      requiredForPublication: '（プロフィール公開に必要な項目）',
      // プレビュー画面用の翻訳
      bodyTypeLabel: '体型',
      marriageStatus: '結婚',
      japaneseLanguage: '日本語',
      englishLanguage: '英語',
      visitPlan: '訪問予定',
      companion: '同行者',
      plannedDestination: '行く予定',
      plannedStationsLabel: '訪問予定駅',
      personalityLabel: '性格',
      learnJapaneseCulture: '学びたい日本文化',
      requiredSection: '必須情報',
      personalitySection: '性格',
      cultureSection: '共有したい日本文化',
      cultureSectionForeign: '学びたい日本文化',
      // 選択項目の説明
      selectPersonalityNote: 'あなたの性格を選択してください（最大5つまで）',
      selectCultureNote: '興味のある日本文化を選択してください（1つ以上8つまで）',
      otherCultureLabel: '上記にない日本文化があれば自由に記入してください（100文字以内）',
      // 入力フィールドの説明
      birthDateReadonly: '生年月日は仮登録時に設定済みのため変更できません',
      birthDatePrivacy: '※生年月日はお相手には表示されません。',
      ageAutoCalculation: '年齢は生年月日から自動計算されます',
      japanVisitPlan: '日本訪問計画',
      cultureExperience: '共有したい日本文化',
      cultureExperienceWant: '体験したい日本文化',
      nicknameDescription: 'プロフィールに表示される名前です',
      updateProfile: 'この内容でプロフィールを更新する',
      previewCheckButton: '',
      previewAdvice: '上のボタンでプレビューを確認してから保存してください',
      selectPrefecturesWithCount: '都道府県を選択',
      residence: '居住地'
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
      previewCheck: 'プレビューで確認',
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
      prefecturesMaximum: '行く予定の都道府県は最大3つまで選択できます',
      cityRequired: '都道府県を入力してください',
      saveFailed: '保存に失敗しました',
      loadFailed: '読み込みに失敗しました',
      // 新規登録用エラーメッセージ
      emailInvalid: '有効なメールアドレスを入力してください',
      passwordMinLength: 'パスワードは8文字以上で入力してください',
      passwordFormat: '半角英字と数字をどちらも含む必要があります',
      locationRequired: '居住地を選択してください',
      japaneseNationalityRequired: '日本国籍の確認が必要です',
      japaneseLevelRequired: '日本語レベルを選択してください',
      englishLevelRequired: '英語レベルを選択してください',
      plannedPrefecturesRequired: '行く予定の都道府県を1つ以上選択してください',
      languagePairRequired: '使用言語と言語レベルを1つ以上選択してください'
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
      currentlyInJapan: '現在日本にいる',
      year2024: '2024年',
      year2025: '2025年',
      beyond2025: '2025年以降',
      beyond2026: '2026年以降',
      after: '以降'
    },

    seasons: {
      spring: '春（3-5月）',
      summer: '夏（6-8月）',
      autumn: '秋（9-11月）',
      winter: '冬（12-2月）'
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
    },

    nationalities: {
      japan: '日本',
      usa: 'アメリカ',
      uk: 'イギリス',
      canada: 'カナダ',
      australia: 'オーストラリア',
      germany: 'ドイツ',
      france: 'フランス',
      netherlands: 'オランダ',
      italy: 'イタリア',
      spain: 'スペイン',
      sweden: 'スウェーデン',
      norway: 'ノルウェー',
      denmark: 'デンマーク',
      korea: '韓国',
      china: '中国',
      taiwan: '台湾',
      thailand: 'タイ',
      singapore: 'シンガポール',
      other: 'その他'
    },

    prefectures: {
      tokyo: '東京都',
      kanagawa: '神奈川県',
      chiba: '千葉県',
      saitama: '埼玉県',
      osaka: '大阪府',
      kyoto: '京都府',
      hyogo: '兵庫県',
      aichi: '愛知県',
      fukuoka: '福岡県',
      hokkaido: '北海道',
      miyagi: '宮城県',
      hiroshima: '広島県',
      shizuoka: '静岡県',
      ibaraki: '茨城県',
      tochigi: '栃木県',
      gunma: '群馬県',
      niigata: '新潟県',
      nagano: '長野県',
      yamanashi: '山梨県',
      gifu: '岐阜県',
      mie: '三重県',
      shiga: '滋賀県',
      nara: '奈良県',
      wakayama: '和歌山県',
      tottori: '鳥取県',
      shimane: '島根県',
      okayama: '岡山県',
      yamaguchi: '山口県',
      tokushima: '徳島県',
      kagawa: '香川県',
      ehime: '愛媛県',
      kochi: '高知県',
      saga: '佐賀県',
      nagasaki: '長崎県',
      kumamoto: '熊本県',
      oita: '大分県',
      miyazaki: '宮崎県',
      kagoshima: '鹿児島県',
      okinawa: '沖縄県'
    },

    signup: {
      title: '会員登録',
      backButton: '戻る',
      emailAddress: 'メールアドレス',
      emailPlaceholder: 'メールアドレス',
      password: 'パスワード',
      passwordPlaceholder: 'パスワード',
      passwordRequirement: '半角英字と数字をどちらも含む8文字以上',
      nickname: 'ニックネーム',
      nicknamePlaceholder: 'ニックネーム',
      nicknameNote: 'あとで変更可能です。迷ったらイニシャルでもOK',
      gender: '性別',
      male: '男性',
      female: '女性',
      genderNote: '登録した性別は変更できません',
      birthDate: '生年月日',
      birthDateNote: '※生年月日はお相手には表示されません。',
      nationality: '国籍',
      residence: '居住地',
      selectNationality: '国籍を選択',
      selectPrefecture: '都道府県を選択',
      residenceNote: '現在お住まいの都道府県を選択してください',
      genderSelectPrompt: 'まず性別を選択してください',
      signupButton: '無料で登録する',
      signingUp: '登録中...',
      privacyNote: 'ご利用者様の個人情報は厳重に管理いたします。\nこのサイトはreCAPTCHAによって保護されており、\nGoogleのプライバシーポリシーと利用規約が適用されます。',
      loginPrompt: '既にアカウントをお持ちの方は',
      loginLink: 'ログイン',
      ageRestriction: '18歳以上の方のみご利用いただけます',
      signupFailed: '登録に失敗しました。もう一度お試しください。',
      japaneseNationalityConfirm: '私は日本国籍の女性です',
      required: '必須'
    },

    login: {
      title: 'ログイン',
      subtitle: 'アカウントにログインして文化体験を楽しみましょう',
      emailAddress: 'メールアドレス',
      emailPlaceholder: 'your-email@example.com',
      password: 'パスワード',
      passwordPlaceholder: 'パスワードを入力',
      rememberMe: 'ログイン状態を保持する',
      forgotPassword: 'パスワードを忘れた方',
      loginButton: 'ログイン',
      loggingIn: 'ログイン中...',
      orDivider: 'または',
      googleLogin: 'Googleでログイン',
      facebookLogin: 'Facebookでログイン',
      signupPrompt: 'アカウントをお持ちでない方は',
      signupLink: '新規登録',
      securityNote: 'このサイトは安全性とプライバシーを重視しています。\nログイン情報は暗号化されて保護されます。',
      loginFailed: 'ログインに失敗しました。もう一度お試しください。',
      serverError: 'サーバー接続エラーです。環境設定を確認してください。',
      errorPrefix: 'エラー: '
    },

    registerComplete: {
      title: '仮登録完了',
      subtitle: 'このたびはご登録いただき、誠にありがとうございます。',
      emailVerificationTitle: 'メール認証のお願い',
      emailVerificationDescription: 'ご本人確認のため、メールアドレスに本登録URLを送らせていただいております。',
      sentTo: '送信先: ',
      instructions: 'メール本文に記載のあるURLにアクセスして本登録を完了させてください。',
      troubleshootingTitle: 'メールが確認できない場合',
      troubleshootingSpam: '迷惑メールフォルダ等をご確認ください。',
      troubleshootingEmailCheck: '再度ご登録のメールアドレスをご確認ください。',
      troubleshootingDomain: 'ドメイン指定や迷惑メール設定をしている場合は解除後、お問い合わせフォームよりご連絡ください。',
      testModeTitle: '開発者向けテスト機能',
      testModeDescription: 'メール認証をスキップしてプロフィール編集に進むことができます',
      testModeButton: '認証をスキップして続行（テスト用）',
      loginButton: 'ログイン画面へ',
      backToHome: 'トップページへ',
      helpNote: '※ メール認証は24時間以内に完了してください',
      errorTitle: 'エラーが発生しました',
      errorDescription: '登録情報が見つかりません。\n再度登録を行ってください。',
      backToSignup: '登録画面に戻る'
    },

    resetPassword: {
      title: 'パスワードリセット',
      subtitle: '新しいパスワードを設定してください。',
      newPassword: '新しいパスワード',
      newPasswordPlaceholder: '新しいパスワードを入力',
      confirmPassword: 'パスワード確認',
      confirmPasswordPlaceholder: 'パスワードを再入力',
      updateButton: 'パスワードを更新',
      updating: 'パスワード更新中...',
      successMessage: 'パスワードが正常に更新されました。',
      invalidLinkError: '無効なリセットリンクです。',
      passwordMismatchError: 'パスワードが一致しません。',
      passwordTooShortError: 'パスワードは8文字以上で入力してください。',
      updateFailedError: 'パスワードの更新に失敗しました。',
      loadingText: '読み込み中...'
    },

    verifyEmail: {
      loading: {
        title: 'メール認証中',
        description: '認証処理を行っています...\nしばらくお待ちください。'
      },
      success: {
        title: '本登録完了',
        subtitle: 'メールアドレスの認証が完了しました！\nSakura Clubへようこそ🌸',
        autoRedirectNotice: 'プロフィール編集画面に自動で移動します...',
        autoRedirectTime: '3秒後に自動転送',
        proceedButton: 'プロフィール編集へ進む'
      },
      error: {
        title: '認証エラー',
        expiredTitle: '認証期限切れ',
        description: '認証に失敗しました。もう一度お試しください。',
        expiredDescription: '認証URLの有効期限が切れています。再度登録を行ってください。',
        invalidUrlError: '認証URLが無効です',
        verificationFailedError: '認証に失敗しました。URLが無効または期限切れの可能性があります。',
        signupButton: '再登録する',
        loginButton: 'ログイン画面へ'
      },
      loadingFallback: {
        title: '読み込み中',
        description: 'しばらくお待ちください...'
      }
    },

    homepage: {
      // ヘッダー
      aboutService: 'サービスについて',
      howItWorks: '仕組み',
      safetyAndSecurity: '安心・安全',
      culturalExperience: '文化体験',
      login: 'ログイン',
      signup: '新規登録',
      
      // ヒーローセクション
      heroTitle: '文化体験を通じた',
      heroSubtitle: '真の出会い',
      heroDescription: '訪日外国人男性と日本人女性が、\n日本の食文化や伝統文化の体験を通じて\n自然な出会いを楽しめる、安心・安全なプラットフォームです。',
      getStartedFree: '無料で始める（女性無料）',
      loginHere: 'ログインはこちら',
      
      // フィーチャーセクション
      safetyTitle: '安心・安全',
      safetyDescription: '本人確認と審査制で\n安全な出会いを保証',
      culturalExchangeTitle: '文化交流',
      culturalExchangeDescription: '茶道・書道・料理など\n本物の日本文化を体験',
      internationalExchangeTitle: '国際交流',
      internationalExchangeDescription: '言語を学び合い\n国境を越えたつながり'
    },
    
    // 独立した言語関連オブジェクト
    languageOptions: {
      japanese: '日本語',
      english: '英語', 
      korean: '韓国語',
      chineseTraditional: '中国語（繁体字）'
    },
    
    languageLevels: {
      native: '母国語',
      beginner: '初級',
      beginnerPlus: '初級上',
      intermediate: '中級',
      intermediatePlus: '中級上',
      advanced: '上級'
    },

    languageLevelDefinitions: {
      title: '言語レベルの目安：',
      beginner: '初級：あいさつや簡単な自己紹介など、短い定型文でやり取りできる',
      elementary: '初級上：ゆっくりなら日常の簡単な会話ができる（買い物・道案内など）',
      intermediate: '中級：日常会話は概ね問題なく、多少複雑な話題でも会話を続けられる',
      upperIntermediate: '中級上：仕事や旅行などの実用的な会話を自然に行え、細かなニュアンスもある程度伝えられる',
      advanced: '上級：幅広い話題で自然に会話でき、抽象的な内容や微妙な表現も適切に伝えられる'
    }
  },

  en: {
    profile: {
      nickname: 'Nickname',
      age: 'Age',
      nationality: 'Nationality',
      plannedPrefectures: 'Prefectures You Plan to Visit',
      plannedStations: 'Planned Stations (Optional)',
      visitSchedule: 'Visit Schedule',
      travelCompanion: 'Travel Companion',
      japaneseLevel: 'Japanese Level',
      englishLevel: 'English Level',
      languages: 'Languages',
      languageHelp: 'Please select the languages you can use and their levels (at least one is required).',
      languageLevel: {
        native: 'Native language',
        beginner: 'Beginner (daily conversation is difficult)',
        beginner_plus: 'Upper beginner (can handle basic daily conversations)',
        intermediate: 'Intermediate (can handle everyday conversations)',
        intermediate_plus: 'Upper intermediate (can handle small talk and more complex topics)',
        advanced: 'Advanced (can speak fluently)'
      },
      languagePlaceholder: 'Select',
      languageLevelPlaceholder: 'Select',
      languageOptions: {
        ja: 'Japanese',
        en: 'English',
        ko: 'Korean',
        zh_tw: 'Chinese (Traditional)'
      },
      languageAddButton: '+ Add language',
      selectPrefectures: 'Select Prefectures',
      selectStations: 'Select Stations',
      selectedCount: 'selected',
      maxSelection: 'can be selected',
      prefectureSelectionRule: 'Please select at least 1 (up to 3 prefectures)',
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
      foreignMaleTitle: 'Edit Profile',
      japaneseFemaleTitle: 'Japanese Female Profile Edit',
      foreignMaleSubtitle: 'Update your information for better matches in Japan',
      japaneseFemaleSubtitle: 'Update your information for cultural exchange with foreign men',
      defaultSubtitle: 'Update your information',
      selfIntroduction: 'Self Introduction',
      selfIntroPlaceholder: 'Tell us about your charm and interest in Japanese culture (100-1000 characters)',
      selfIntroNote: 'Please write your self-introduction in 100-1000 characters.',
      // プロフィール完成度メッセージ
      itemsCompleted: 'items completed',
      calculating: 'Calculating...',
      completionLow: 'Please provide a little more basic information.',
      completionMedium: 'Add more details to enhance your profile',
      completionHigh: 'Almost there! Just a few more details',
      completionPerfect: 'Excellent! You have a perfect profile ✨',
      requiredForPublication: '(Required for profile publication)',
      // プレビュー画面用の翻訳
      bodyTypeLabel: 'Body Type',
      marriageStatus: 'Marriage',
      japaneseLanguage: 'Japanese',
      englishLanguage: 'English',
      visitPlan: 'Visit Plan',
      companion: 'Companion',
      plannedDestination: 'Planned Destination',
      plannedStationsLabel: 'Planned Stations',
      personalityLabel: 'Personality',
      learnJapaneseCulture: 'Japanese Culture to Learn',
      requiredSection: 'Required Information',
      personalitySection: 'Personality',
      cultureSection: 'Japanese Culture to Share',
      cultureSectionForeign: 'Japanese Culture to Learn',
      // 選択項目の説明
      selectPersonalityNote: 'Select your personality traits (max 5)',
      selectCultureNote: 'Select Japanese culture you want to experience (1-8 items)',
      otherCultureLabel: 'Other Japanese culture you want to experience (max 100 characters)',
      // 入力フィールドの説明
      birthDateReadonly: 'Birth date was set during temporary registration and cannot be changed',
      birthDatePrivacy: '※Your date of birth will not be shown to others.',
      ageAutoCalculation: 'Your age is automatically calculated from your date of birth.',
      japanVisitPlan: 'Japan Visit Plan',
      cultureExperience: 'Japanese Culture to Share',
      cultureExperienceWant: 'Japanese Culture to Experience',
      nicknameDescription: 'This is the name that will be displayed on your profile',
      updateProfile: 'Update Profile with This Information',
      previewCheckButton: '',
      previewAdvice: 'Please check preview with the button above before saving',
      selectPrefecturesWithCount: 'Select Prefectures',
      residence: 'Residence'
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
      previewCheck: 'Preview',
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
      prefecturesMaximum: 'You can select up to 3 prefectures',
      cityRequired: 'Please enter prefecture',
      saveFailed: 'Failed to save',
      loadFailed: 'Failed to load',
      // 新規登録用エラーメッセージ
      emailInvalid: 'Please enter a valid email address',
      passwordMinLength: 'Password must be at least 8 characters',
      passwordFormat: 'Must contain both letters and numbers',
      locationRequired: 'Please select your location',
      japaneseNationalityRequired: 'Japanese nationality confirmation is required',
      japaneseLevelRequired: 'Please select your Japanese level',
      englishLevelRequired: 'Please select your English level',
      plannedPrefecturesRequired: 'Please select at least one prefecture you plan to visit.',
      languagePairRequired: 'Please select at least one language and its level.'
    },
    levels: {
      none: 'Not set',
      beginner: 'Beginner (Daily conversation is difficult)',
      elementary: 'Elementary (Basic daily conversation)',
      intermediate: 'Intermediate (Daily conversation is fine)',
      upperIntermediate: 'Upper Intermediate (Can understand complex topics)',
      advanced: 'Advanced (Fluent)',
      native: 'Native level'
    },
    schedule: {
      undecided: 'Not decided yet',
      noEntry: 'Not set',
      currentlyInJapan: 'Currently in Japan',
      year2024: '2024',
      year2025: '2025',
      beyond2025: '2025 or later',
      beyond2026: '2026 or later',
      after: 'After'
    },

    seasons: {
      spring: 'Spring (Mar-May)',
      summer: 'Summer (Jun-Aug)',
      autumn: 'Autumn (Sep-Nov)',
      winter: 'Winter (Dec-Feb)'
    },
    companion: {
      noEntry: 'Not set',
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
      noEntry: 'Not set',
      slim: 'Slim',
      average: 'Average',
      muscular: 'Muscular',
      plump: 'Plump'
    },
    maritalStatus: {
      none: 'Not set',
      single: 'Single',
      married: 'Married'
    },
    occupations: {
      noEntry: 'Not set',
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
      lonely: 'Reserved',
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
      kimono: 'Kimono & Yukata',
      wagashi: 'Wagashi',
      pottery: 'Pottery',
      origami: 'Origami',
      bonsai: 'Bonsai',
      shrinesTemples: 'Shrines & Temples',
      sealCollection: 'Goshuin Collection',
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
      conbiniFood: 'Konbini Food',
      potatoChips: 'Japanese Chips',
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
      festivals: 'Attending Festivals',
      fireworks: 'Fireworks Display',
      snowScape: 'Snowy Scenery',
      fourSeasons: 'Four Seasons',
      bonDance: 'Bon Dance',
      gardenWalk: 'Japanese Garden Walk',
      matchaSweets: 'Matcha Sweets',
      dango: 'Dango',
      taiyaki: 'Taiyaki',
      obanyaki: 'Obanyaki',
      warabimochi: 'Warabimochi',
      candiedApple: 'Ringo Ame (Candied Apple)',
      cottonCandy: 'Cotton Candy',
      dagashi: 'Dagashi (Japanese Cheap Sweets)',
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
      hogaku: 'Hogaku (Traditional Japanese Music)',
      enka: 'Enka',
      taiko: 'Taiko',
      shoji: 'Shoji',
      fusuma: 'Fusuma',
      tatami: 'Tatami',
      oldHouseCafe: 'Kominka Café',
      sento: 'Sento',
      showaRetro: 'Showa Retro',
      waModernInterior: 'Japanese Modern Interior',
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
      sugarCrafts: 'Japanese Sugar Art'
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
    },

    nationalities: {
      japan: 'Japan',
      usa: 'United States',
      uk: 'United Kingdom',
      canada: 'Canada',
      australia: 'Australia',
      germany: 'Germany',
      france: 'France',
      netherlands: 'Netherlands',
      italy: 'Italy',
      spain: 'Spain',
      sweden: 'Sweden',
      norway: 'Norway',
      denmark: 'Denmark',
      korea: 'South Korea',
      china: 'China',
      taiwan: 'Taiwan',
      thailand: 'Thailand',
      singapore: 'Singapore',
      other: 'Other'
    },

    prefectures: {
      tokyo: 'Tokyo',
      kanagawa: 'Kanagawa',
      chiba: 'Chiba',
      saitama: 'Saitama',
      osaka: 'Osaka',
      kyoto: 'Kyoto',
      hyogo: 'Hyogo',
      aichi: 'Aichi',
      fukuoka: 'Fukuoka',
      hokkaido: 'Hokkaido',
      miyagi: 'Miyagi',
      hiroshima: 'Hiroshima',
      shizuoka: 'Shizuoka',
      ibaraki: 'Ibaraki',
      tochigi: 'Tochigi',
      gunma: 'Gunma',
      niigata: 'Niigata',
      nagano: 'Nagano',
      yamanashi: 'Yamanashi',
      gifu: 'Gifu',
      mie: 'Mie',
      shiga: 'Shiga',
      nara: 'Nara',
      wakayama: 'Wakayama',
      tottori: 'Tottori',
      shimane: 'Shimane',
      okayama: 'Okayama',
      yamaguchi: 'Yamaguchi',
      tokushima: 'Tokushima',
      kagawa: 'Kagawa',
      ehime: 'Ehime',
      kochi: 'Kochi',
      saga: 'Saga',
      nagasaki: 'Nagasaki',
      kumamoto: 'Kumamoto',
      oita: 'Oita',
      miyazaki: 'Miyazaki',
      kagoshima: 'Kagoshima',
      okinawa: 'Okinawa'
    },
    signup: {
      title: 'Sign Up',
      backButton: 'Back',
      emailAddress: 'Email Address',
      emailPlaceholder: 'Email Address',
      password: 'Password',
      passwordPlaceholder: 'Password',
      passwordRequirement: 'At least 8 characters with both letters and numbers',
      nickname: 'Nickname',
      nicknamePlaceholder: 'Nickname',
      nicknameNote: 'You can change this later. Initials are OK if undecided',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      genderNote: 'Gender cannot be changed after registration',
      birthDate: 'Date of Birth',
      birthDateNote: '※Date of birth is not shown to other users.',
      nationality: 'Nationality',
      residence: 'Residence',
      selectNationality: 'Select nationality',
      selectPrefecture: 'Select prefecture',
      residenceNote: 'Please select your current prefecture of residence',
      genderSelectPrompt: 'Please select gender first',
      signupButton: 'Register for Free',
      signingUp: 'Registering...',
      privacyNote: 'Your personal information is strictly managed.\nThis site is protected by reCAPTCHA and\nGoogle\'s Privacy Policy and Terms of Service apply.',
      loginPrompt: 'Already have an account?',
      loginLink: 'Log in',
      ageRestriction: 'Must be 18 years or older',
      signupFailed: 'Registration failed. Please try again.',
      japaneseNationalityConfirm: 'I am a Japanese national female',
      required: 'Required'
    },

    login: {
      title: 'Login',
      subtitle: 'Log in to your account to enjoy cultural experiences',
      emailAddress: 'Email Address',
      emailPlaceholder: 'your-email@example.com',
      password: 'Password',
      passwordPlaceholder: 'Enter your password',
      rememberMe: 'Keep me signed in',
      forgotPassword: 'Forgot your password?',
      loginButton: 'Log In',
      loggingIn: 'Logging in...',
      orDivider: 'or',
      googleLogin: 'Sign in with Google',
      facebookLogin: 'Sign in with Facebook',
      signupPrompt: 'Don\'t have an account?',
      signupLink: 'Sign Up',
      securityNote: 'This site prioritizes safety and privacy.\nYour login information is encrypted and protected.',
      loginFailed: 'Login failed. Please try again.',
      serverError: 'Server connection error. Please check environment settings.',
      errorPrefix: 'Error: '
    },

    registerComplete: {
      title: 'Registration Complete',
      subtitle: 'Thank you for registering with us.',
      emailVerificationTitle: 'Email Verification Required',
      emailVerificationDescription: 'For identity verification, we have sent a registration URL to your email address.',
      sentTo: 'Sent to: ',
      instructions: 'Please access the URL in the email to complete your registration.',
      troubleshootingTitle: 'If you cannot find the email',
      troubleshootingSpam: 'Please check your spam/junk folder.',
      troubleshootingEmailCheck: 'Please check your registered email address again.',
      troubleshootingDomain: 'If you have domain restrictions or spam filters, please disable them and contact us through the inquiry form.',
      testModeTitle: 'Developer Test Feature',
      testModeDescription: 'You can skip email verification and proceed to profile editing',
      testModeButton: 'Skip Verification and Continue (Test Only)',
      loginButton: 'Go to Login',
      backToHome: 'Back to Home',
      helpNote: '※ Please complete email verification within 24 hours',
      errorTitle: 'An Error Occurred',
      errorDescription: 'Registration information not found.\nPlease register again.',
      backToSignup: 'Back to Registration'
    },

    resetPassword: {
      title: 'Password Reset',
      subtitle: 'Please set a new password.',
      newPassword: 'New Password',
      newPasswordPlaceholder: 'Enter new password',
      confirmPassword: 'Confirm Password',
      confirmPasswordPlaceholder: 'Re-enter password',
      updateButton: 'Update Password',
      updating: 'Updating password...',
      successMessage: 'Password has been successfully updated.',
      invalidLinkError: 'Invalid reset link.',
      passwordMismatchError: 'Passwords do not match.',
      passwordTooShortError: 'Password must be at least 8 characters long.',
      updateFailedError: 'Failed to update password.',
      loadingText: 'Loading...'
    },

    verifyEmail: {
      loading: {
        title: 'Verifying Email',
        description: 'Processing verification...\nPlease wait.'
      },
      success: {
        title: 'Registration Complete',
        subtitle: 'Email verification completed!\nWelcome to Sakura Club🌸',
        autoRedirectNotice: 'Automatically redirecting to profile editing...',
        autoRedirectTime: 'Redirecting in 3 seconds',
        proceedButton: 'Proceed to Profile Edit'
      },
      error: {
        title: 'Verification Error',
        expiredTitle: 'Verification Expired',
        description: 'Verification failed. Please try again.',
        expiredDescription: 'Verification URL has expired. Please register again.',
        invalidUrlError: 'Invalid verification URL',
        verificationFailedError: 'Verification failed. URL may be invalid or expired.',
        signupButton: 'Register Again',
        loginButton: 'Go to Login'
      },
      loadingFallback: {
        title: 'Loading',
        description: 'Please wait...'
      }
    },

    homepage: {
      // ヘッダー
      aboutService: 'About Service',
      howItWorks: 'How It Works',
      safetyAndSecurity: 'Safety & Security',
      culturalExperience: 'Cultural Experience',
      login: 'Login',
      signup: 'Sign Up',
      
      // ヒーローセクション
      heroTitle: 'Authentic Connections Through',
      heroSubtitle: 'Cultural Experiences',
      heroDescription: 'A safe and secure platform where foreign men visiting Japan\nand Japanese women can enjoy natural encounters through\nexperiences of Japanese food culture and traditional culture.',
      getStartedFree: 'Get Started Free (Free for Women)',
      loginHere: 'Login Here',
      
      // フィーチャーセクション
      safetyTitle: 'Safety & Security',
      safetyDescription: 'Identity verification and\nscreening system ensures\nsafe encounters',
      culturalExchangeTitle: 'Cultural Exchange',
      culturalExchangeDescription: 'Experience authentic\nJapanese culture through\ntea ceremony, calligraphy, cooking',
      internationalExchangeTitle: 'International Exchange',
      internationalExchangeDescription: 'Learn languages together\nand build connections\nacross borders'
    },
    
    // 独立した言語関連オブジェクト
    languageOptions: {
      japanese: 'Japanese',
      english: 'English',
      korean: 'Korean',
      chineseTraditional: 'Chinese (Traditional)'
    },
    
    languageLevels: {
      native: 'Native language',
      beginner: 'Beginner',
      beginnerPlus: 'Upper beginner',
      intermediate: 'Intermediate',
      intermediatePlus: 'Upper intermediate',
      advanced: 'Advanced'
    },

    languageLevelDefinitions: {
      title: 'Language Level Guidelines:',
      beginner: 'Beginner: Can handle greetings and simple self-introductions using short set phrases.',
      elementary: 'Upper Beginner: Can manage simple everyday conversations if spoken slowly (shopping, asking directions, etc.).',
      intermediate: 'Intermediate: Can handle most everyday conversations and keep a conversation going even on somewhat complex topics.',
      upperIntermediate: 'Upper Intermediate: Can communicate naturally in practical situations such as work or travel, and convey nuances to some extent.',
      advanced: 'Advanced: Can converse naturally on a wide range of topics and express abstract ideas and subtle meanings appropriately.'
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
      languages: '사용 언어',
      languageHelp: '사용할 수 있는 언어와 그 수준을 선택해 주세요 (최소 1개 필수).',
      languageLevel: {
        native: '모국어',
        beginner: '초급 (일상 대화가 어렵다)',
        beginner_plus: '초급 상 (기본적인 일상 대화가 가능하다)',
        intermediate: '중급 (일상 대화에는 문제가 없다)',
        intermediate_plus: '중급 상 (잡담이나 복잡한 주제도 이해할 수 있다)',
        advanced: '고급 (유창하게 말할 수 있다)'
      },
      languagePlaceholder: '선택하세요',
      languageLevelPlaceholder: '선택하세요',
      languageOptions: {
        ja: '일본어',
        en: '영어',
        ko: '한국어',
        zh_tw: '중국어 (번체자)'
      },
      languageAddButton: '+ 사용 언어 추가',
      selectPrefectures: '현 선택',
      selectStations: '역 선택',
      selectedCount: '선택됨',
      maxSelection: '까지 선택 가능',
      prefectureSelectionRule: '최소 1개 이상 선택하세요 (최대 3개까지)',
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
      foreignMaleTitle: '프로필 편집',
      japaneseFemaleTitle: '일본인 여성 프로필 편집',
      foreignMaleSubtitle: '더 좋은 매칭을 위해 정보를 업데이트해 주세요',
      japaneseFemaleSubtitle: '외국인 남성과의 문화 교류를 위해 정보를 업데이트해 주세요',
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
      requiredForPublication: '(프로필 공개에 필요한 항목)',
      // プレビュー画面用の翻訳
      bodyTypeLabel: '체형',
      marriageStatus: '결혼',
      japaneseLanguage: '일본어',
      englishLanguage: '영어',
      visitPlan: '방문 예정',
      companion: '동행자',
      plannedDestination: '방문 예정',
      plannedStationsLabel: '방문 예정 역',
      personalityLabel: '성격',
      learnJapaneseCulture: '배우고 싶은 일본 문화',
      requiredSection: '필수 정보',
      personalitySection: '성격',
      cultureSection: '공유하고 싶은 일본 문화',
      cultureSectionForeign: '배우고 싶은 일본 문화',
      // 선택 항목 설명
      selectPersonalityNote: '귀하의 성격 특성을 선택해 주세요 (최대 5개)',
      selectCultureNote: '체험하고 싶은 일본 문화를 선택해 주세요 (1-8개 항목)',
      otherCultureLabel: '체험하고 싶은 기타 일본 문화 (최대 100자)',
      // 입력 필드 설명
      birthDateReadonly: '생년월일은 임시 등록 시 설정되어 변경할 수 없습니다',
      birthDatePrivacy: '※생년월일은 상대방에게 표시되지 않습니다.',
      ageAutoCalculation: '나이는 생년월일에서 자동으로 계산됩니다',
      japanVisitPlan: '일본 방문 계획',
      cultureExperience: '공유하고 싶은 일본 문화',
      cultureExperienceWant: '체험하고 싶은 일본 문화',
      nicknameDescription: '프로필에 표시될 이름입니다',
      updateProfile: '이 내용으로 프로필 업데이트',
      previewCheckButton: '',
      previewAdvice: '위 버튼으로 미리보기를 확인한 후 저장해 주세요',
      selectPrefecturesWithCount: '도도부현 선택',
      residence: '거주지'
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
      previewCheck: '미리보기 확인',
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
      prefecturesMaximum: '최대 3개의 현까지 선택할 수 있습니다',
      cityRequired: '현을 입력해 주세요',
      saveFailed: '저장에 실패했습니다',
      loadFailed: '로드에 실패했습니다',
      // 새 가입용 오류 메시지
      emailInvalid: '유효한 이메일 주소를 입력해 주세요',
      passwordMinLength: '비밀번호는 8자 이상으로 입력해 주세요',
      passwordFormat: '영문자와 숫자를 모두 포함해야 합니다',
      locationRequired: '거주지를 선택해 주세요',
      japaneseNationalityRequired: '일본 국적 확인이 필요합니다',
      japaneseLevelRequired: '일본어 레벨을 선택해 주세요',
      englishLevelRequired: '영어 레벨을 선택해 주세요',
      plannedPrefecturesRequired: '방문 예정인 도도부현을 1개 이상 선택해 주세요.',
      languagePairRequired: '사용 언어와 언어 레벨을 최소 1개 이상 선택해 주세요.'
    },
    levels: {
      none: '미입력',
      beginner: '초급 (일상 대화가 어려움)',
      elementary: '초급상 (기본적인 일상 대화 가능)',
      intermediate: '중급 (일상 대화는 문제없음)',
      upperIntermediate: '중급상 (복잡한 주제도 이해 가능)',
      advanced: '상급 (유창하게 대화 가능)',
      native: '네이티브 수준'
    },
    schedule: {
      undecided: '아직 정하지 않음',
      noEntry: '미입력',
      currentlyInJapan: '현재 일본에 있음',
      year2024: '2024년',
      year2025: '2025년',
      beyond2025: '2025년 이후',
      beyond2026: '2026년 이후',
      after: '년 이후'
    },

    seasons: {
      spring: '봄 (3-5월)',
      summer: '여름 (6-8월)',
      autumn: '가을 (9-11월)',
      winter: '겨울 (12-2월)'
    },
    companion: {
      noEntry: '미입력',
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
      noEntry: '미입력',
      slim: '슬림',
      average: '보통',
      muscular: '근육질',
      plump: '통통'
    },
    maritalStatus: {
      none: '미입력',
      single: '미혼',
      married: '기혼'
    },
    occupations: {
      noEntry: '미입력',
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
      lonely: '내향적인',
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
      indoor: '실내형',
      active: '활동적인',
      intellectual: '지적인',
      meticulous: '꼼꼼한',
      optimistic: '낙천적인',
      shy: '수줍은',
      attentive: '세심한',
      refreshing: '상쾌한',
      natural: '자연스러운 타입',
      ownPace: '자기 스타일이 뚜렷한'
    },
    cultureCategories: {
      traditional: '전통 문화',
      food: '음식 문화',
      sweets: '일본 디저트',
      arts: '예능·스포츠',
      seasonal: '계절·자연',
      lifestyle: '생활·공간',
      craftmanship: '공예·장인 기술',
      modernCulture: '현대 문화'
    },
    culture: {
      teaCeremony: '다도',
      flowerArrangement: '꽃꽂이/이케바나',
      calligraphy: '서예',
      kimono: '기모노/유카타',
      wagashi: '와가시',
      pottery: '도예',
      origami: '종이접기',
      bonsai: '분재',
      shrinesTemples: '신사와 사찰',
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
      shochu: '쇼추(일본식 소주)',
      soba: '소바',
      udon: '우동',
      cherryBlossom: '벚꽃 구경',
      autumnLeaves: '단풍 구경',
      hotSprings: '온천',
      festivals: '축제 가기',
      fireworks: '불꽃축제',
      snowScape: '설경',
      fourSeasons: '사계절',
      bonDance: '본오도리',
      gardenWalk: '일본 정원 산책',
      matchaSweets: '말차 디저트',
      dango: '단고',
      taiyaki: '타이야키',
      obanyaki: '오반야키',
      warabimochi: '와라비모치',
      candiedApple: '링고아메/사과 사탕',
      cottonCandy: '솜사탕',
      dagashi: '다가시',
      conbiniSweets: '편의점 디저트',
      sumo: '스모',
      kendo: '검도',
      judo: '유도',
      karate: '가라테',
      kyudo: '궁도',
      aikido: '아이키도',
      naginata: '나기나타',
      kabuki: '가부키',
      noh: '노',
      japaneseDance: '일본 무용',
      hogaku: '일본 전통음악',
      enka: '엔카',
      taiko: '태고(일본 북)',
      shoji: '쇼지',
      fusuma: '후스마',
      tatami: '다다미',
      oldHouseCafe: '고민가 카페',
      sento: '센토',
      showaRetro: '쇼와 레트로',
      waModernInterior: '재패니즈 모던 인테리어',
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
      fileSizeNote: '각 사진은 5MB 이내로 업로드해 주세요',
      editingNote: '사진을 자르거나 흐림 효과를 적용할 수 있습니다',
      fileSizeError: '이미지 파일은 5MB 이하로 해주세요',
      fileTypeError: '지원하는 이미지 파일을 선택해 주세요 (JPEG, PNG, WebP, HEIC)'
    },

    nationalities: {
      japan: '일본',
      usa: '미국',
      uk: '영국',
      canada: '캐나다',
      australia: '호주',
      germany: '독일',
      france: '프랑스',
      netherlands: '네덜란드',
      italy: '이탈리아',
      spain: '스페인',
      sweden: '스웨덴',
      norway: '노르웨이',
      denmark: '덴마크',
      korea: '한국',
      china: '중국',
      taiwan: '대만',
      thailand: '태국',
      singapore: '싱가포르',
      other: '기타'
    },

    prefectures: {
      tokyo: '도쿄도',
      kanagawa: '가나가와현',
      chiba: '치바현',
      saitama: '사이타마현',
      osaka: '오사카부',
      kyoto: '교토부',
      hyogo: '효고현',
      aichi: '아이치현',
      fukuoka: '후쿠오카현',
      hokkaido: '홋카이도',
      miyagi: '미야기현',
      hiroshima: '히로시마현',
      shizuoka: '시즈오카현',
      ibaraki: '이바라키현',
      tochigi: '도치기현',
      gunma: '군마현',
      niigata: '니가타현',
      nagano: '나가노현',
      yamanashi: '야마나시현',
      gifu: '기후현',
      mie: '미에현',
      shiga: '시가현',
      nara: '나라현',
      wakayama: '와카야마현',
      tottori: '돗토리현',
      shimane: '시마네현',
      okayama: '오카야마현',
      yamaguchi: '야마구치현',
      tokushima: '도쿠시마현',
      kagawa: '가가와현',
      ehime: '에히메현',
      kochi: '고치현',
      saga: '사가현',
      nagasaki: '나가사키현',
      kumamoto: '구마모토현',
      oita: '오이타현',
      miyazaki: '미야자키현',
      kagoshima: '가고시마현',
      okinawa: '오키나와현'
    },
    signup: {
      title: '회원가입',
      backButton: '돌아가기',
      emailAddress: '이메일 주소',
      emailPlaceholder: '이메일 주소',
      password: '비밀번호',
      passwordPlaceholder: '비밀번호',
      passwordRequirement: '영문자와 숫자를 모두 포함한 8자 이상',
      nickname: '닉네임',
      nicknamePlaceholder: '닉네임',
      nicknameNote: '나중에 변경 가능합니다. 고민되시면 이니셜도 괜찮아요',
      gender: '성별',
      male: '남성',
      female: '여성',
      genderNote: '등록 후 성별은 변경할 수 없습니다',
      birthDate: '생년월일',
      birthDateNote: '※생년월일은 상대방에게 표시되지 않습니다.',
      nationality: '국적',
      residence: '거주지',
      selectNationality: '국적 선택',
      selectPrefecture: '도도부현 선택',
      residenceNote: '현재 거주하고 계신 도도부현을 선택해 주세요',
      genderSelectPrompt: '먼저 성별을 선택해 주세요',
      signupButton: '무료 가입하기',
      signingUp: '가입 중...',
      privacyNote: '이용자님의 개인정보는 엄격히 관리됩니다.\n이 사이트는 reCAPTCHA로 보호되며,\nGoogle의 개인정보보호정책과 서비스 약관이 적용됩니다.',
      loginPrompt: '이미 계정이 있으신가요?',
      loginLink: '로그인',
      ageRestriction: '18세 이상만 이용할 수 있습니다',
      signupFailed: '가입에 실패했습니다. 다시 시도해 주세요.',
      japaneseNationalityConfirm: '저는 일본 국적의 여성입니다',
      required: '필수'
    },

    login: {
      title: '로그인',
      subtitle: '계정에 로그인하여 문화 체험을 즐겨보세요',
      emailAddress: '이메일 주소',
      emailPlaceholder: 'your-email@example.com',
      password: '비밀번호',
      passwordPlaceholder: '비밀번호를 입력하세요',
      rememberMe: '로그인 상태 유지',
      forgotPassword: '비밀번호를 잊으셨나요?',
      loginButton: '로그인',
      loggingIn: '로그인 중...',
      orDivider: '또는',
      googleLogin: 'Google로 로그인',
      facebookLogin: 'Facebook으로 로그인',
      signupPrompt: '계정이 없으신가요?',
      signupLink: '회원가입',
      securityNote: '이 사이트는 안전성과 개인정보 보호를 중시합니다.\n로그인 정보는 암호화되어 보호됩니다.',
      loginFailed: '로그인에 실패했습니다. 다시 시도해 주세요.',
      serverError: '서버 연결 오류입니다. 환경 설정을 확인해 주세요.',
      errorPrefix: '오류: '
    },

    registerComplete: {
      title: '가입 완료',
      subtitle: '등록해 주셔서 감사합니다.',
      emailVerificationTitle: '이메일 인증 요청',
      emailVerificationDescription: '본인 확인을 위해 이메일 주소로 본 등록 URL을 보내드렸습니다.',
      sentTo: '송신처: ',
      instructions: '이메일 본문에 기재된 URL에 접속하여 본 등록을 완료해 주세요.',
      troubleshootingTitle: '이메일을 확인할 수 없는 경우',
      troubleshootingSpam: '스팸 메일함 등을 확인해 주세요.',
      troubleshootingEmailCheck: '등록하신 이메일 주소를 다시 확인해 주세요.',
      troubleshootingDomain: '도메인 지정이나 스팸 메일 설정을 하고 있는 경우 해제 후 문의 양식으로 연락해 주세요.',
      testModeTitle: '개발자용 테스트 기능',
      testModeDescription: '이메일 인증을 건너뛰고 프로필 편집으로 진행할 수 있습니다',
      testModeButton: '인증을 건너뛰고 계속 (테스트용)',
      loginButton: '로그인 화면으로',
      backToHome: '홈페이지로',
      helpNote: '※ 이메일 인증은 24시간 이내에 완료해 주세요',
      errorTitle: '오류가 발생했습니다',
      errorDescription: '등록 정보를 찾을 수 없습니다.\n다시 등록해 주세요.',
      backToSignup: '등록 화면으로 돌아가기'
    },

    resetPassword: {
      title: '비밀번호 재설정',
      subtitle: '새로운 비밀번호를 설정해 주세요.',
      newPassword: '새로운 비밀번호',
      newPasswordPlaceholder: '새로운 비밀번호를 입력하세요',
      confirmPassword: '비밀번호 확인',
      confirmPasswordPlaceholder: '비밀번호를 다시 입력하세요',
      updateButton: '비밀번호 업데이트',
      updating: '비밀번호 업데이트 중...',
      successMessage: '비밀번호가 성공적으로 업데이트되었습니다.',
      invalidLinkError: '잘못된 재설정 링크입니다.',
      passwordMismatchError: '비밀번호가 일치하지 않습니다.',
      passwordTooShortError: '비밀번호는 8자 이상이어야 합니다.',
      updateFailedError: '비밀번호 업데이트에 실패했습니다.',
      loadingText: '로딩 중...'
    },

    verifyEmail: {
      loading: {
        title: '이메일 인증 중',
        description: '인증 처리 중입니다...\n잠시만 기다려 주세요.'
      },
      success: {
        title: '본등록 완료',
        subtitle: '이메일 주소 인증이 완료되었습니다!\n사쿠라 클럽에 오신 것을 환영합니다🌸',
        autoRedirectNotice: '프로필 편집 화면으로 자동 이동합니다...',
        autoRedirectTime: '3초 후 자동 전환',
        proceedButton: '프로필 편집으로 진행'
      },
      error: {
        title: '인증 오류',
        expiredTitle: '인증 기간 만료',
        description: '인증에 실패했습니다. 다시 시도해 주세요.',
        expiredDescription: '인증 URL의 유효기간이 만료되었습니다. 다시 등록해 주세요.',
        invalidUrlError: '인증 URL이 유효하지 않습니다',
        verificationFailedError: '인증에 실패했습니다. URL이 유효하지 않거나 기간이 만료되었을 가능성이 있습니다.',
        signupButton: '재등록하기',
        loginButton: '로그인 화면으로'
      },
      loadingFallback: {
        title: '로딩 중',
        description: '잠시만 기다려 주세요...'
      }
    },

    homepage: {
      // ヘッダー
      aboutService: '서비스 소개',
      howItWorks: '이용 방법',
      safetyAndSecurity: '안심·안전',
      culturalExperience: '문화 체험',
      login: '로그인',
      signup: '회원가입',
      
      // ヒーローセクション
      heroTitle: '문화 체험을 통한',
      heroSubtitle: '진정한 만남',
      heroDescription: '일본 방문 외국인 남성과 일본인 여성이\n일본의 음식 문화와 전통 문화 체험을 통해\n자연스러운 만남을 즐길 수 있는 안심·안전한 플랫폼입니다.',
      getStartedFree: '무료로 시작하기 (여성 무료)',
      loginHere: '로그인 하기',
      
      // フィーチャーセクション
      safetyTitle: '안심·안전',
      safetyDescription: '본인 확인과 심사제로\n안전한 만남을 보장',
      culturalExchangeTitle: '문화 교류',
      culturalExchangeDescription: '다도·서도·요리 등\n진짜 일본 문화를 체험',
      internationalExchangeTitle: '국제 교류',
      internationalExchangeDescription: '언어를 서로 배우며\n국경을 넘는 인연'
    },
    
    // 독립적인 언어 관련 객체
    languageOptions: {
      japanese: '일본어',
      english: '영어',
      korean: '한국어',
      chineseTraditional: '중국어 (번체자)'
    },
    
    languageLevels: {
      native: '모국어',
      beginner: '초급',
      beginnerPlus: '초급 상',
      intermediate: '중급',
      intermediatePlus: '중급 상',
      advanced: '고급'
    },

    languageLevelDefinitions: {
      title: '언어 수준 안내:',
      beginner: '초급: 인사나 간단한 자기소개 등 짧은 정형 문장으로 의사소통할 수 있습니다.',
      elementary: '초급 상: 천천히 말해주면 일상적인 간단한 대화가 가능합니다(쇼핑, 길 안내 등).',
      intermediate: '중급: 일상 대화는 대체로 문제없고, 다소 복잡한 주제도 대화를 이어갈 수 있습니다.',
      upperIntermediate: '중급 상: 업무나 여행 등 실용적인 상황에서 자연스럽게 대화할 수 있고, 미묘한 뉘앙스도 어느 정도 전달할 수 있습니다.',
      advanced: '상급: 다양한 주제로 자연스럽게 대화할 수 있으며, 추상적인 내용과 미묘한 표현도 적절히 전달할 수 있습니다.'
    }
  },

  'zh-tw': {
    profile: {
      nickname: '暱稱',
      age: '年齡',
      nationality: '國籍',
      plannedPrefectures: '預計前往的地區',
      plannedStations: '預計拜訪車站（選填）',
      visitSchedule: '預計拜訪時期',
      travelCompanion: '同行者',
      japaneseLevel: '日語程度',
      englishLevel: '英語程度',
      languages: '使用語言',
      languageHelp: '請選擇你可以使用的語言及程度（至少需選一項）。',
      languageLevel: {
        native: '母語',
        beginner: '初級（不太能進行日常會話）',
        beginner_plus: '初級以上（可以進行基本的日常會話）',
        intermediate: '中級（一般日常會話沒有問題）',
        intermediate_plus: '中級以上（可以聊天，也能理解較複雜的話題）',
        advanced: '高級（可以流利地說）'
      },
      languagePlaceholder: '請選擇',
      languageLevelPlaceholder: '請選擇',
      languageOptions: {
        ja: '日語',
        en: '英語',
        ko: '韓語',
        zh_tw: '中文（繁體）'
      },
      languageAddButton: '+ 新增使用語言',
      selectPrefectures: '選擇都道府縣',
      selectStations: '選擇車站',
      selectedCount: '已選擇',
      maxSelection: '最多可選擇',
      prefectureSelectionRule: '請選擇至少1個（最多3個都道府縣）',
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
      foreignMaleTitle: '編輯個人資料',
      japaneseFemaleTitle: '日本女性個人資料編輯',
      foreignMaleSubtitle: '為了更好的配對，請更新您的資訊',
      japaneseFemaleSubtitle: '為了與外國男性的文化交流，請更新您的資訊',
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
      requiredForPublication: '（個人資料公開所需項目）',
      // プレビュー画面用の翻訳
      bodyTypeLabel: '體型',
      marriageStatus: '婚姻',
      japaneseLanguage: '日語',
      englishLanguage: '英語',
      visitPlan: '拜訪預定',
      companion: '同行者',
      plannedDestination: '預定前往',
      plannedStationsLabel: '預定拜訪車站',
      personalityLabel: '個性',
      learnJapaneseCulture: '想學習的日本文化',
      requiredSection: '必填資訊',
      personalitySection: '個性',
      cultureSection: '想分享的日本文化',
      cultureSectionForeign: '想學習的日本文化',
      // 選擇項目說明
      selectPersonalityNote: '請選擇您的個性特質（最多5個）',
      selectCultureNote: '請選擇您想體驗的日本文化（1-8項）',
      otherCultureLabel: '您想體驗的其他日本文化（最多100字）',
      // 輸入欄位說明
      birthDateReadonly: '出生日期在臨時註冊時已設定，無法更改',
      birthDatePrivacy: '※出生日期不會顯示給其他人。',
      ageAutoCalculation: '年齡會從出生日期自動計算',
      japanVisitPlan: '日本拜訪計畫',
      cultureExperience: '想分享的日本文化',
      cultureExperienceWant: '想體驗的日本文化',
      nicknameDescription: '這是將在您的個人資料上顯示的名稱',
      updateProfile: '使用此信息更新個人檔案',
      previewCheckButton: '',
      previewAdvice: '請用上方按鈕確認預覽後再儲存',
      selectPrefecturesWithCount: '選擇都道府縣',
      residence: '居住地'
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
      previewCheck: '預覽確認',
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
      prefecturesMaximum: '最多可選擇3個都道府縣',
      cityRequired: '請輸入都道府縣',
      saveFailed: '儲存失敗',
      loadFailed: '載入失敗',
      emailInvalid: '請輸入正確的電子郵件地址',
      passwordMinLength: '密碼至少需要8個字符',
      passwordFormat: '密碼必須包含英文字母和數字',
      locationRequired: '請選擇居住地',
      japaneseNationalityRequired: '需要確認日本國籍',
      japaneseLevelRequired: '請選擇日語程度',
      englishLevelRequired: '請選擇英語程度',
      plannedPrefecturesRequired: '請至少選擇一個預定要前往的都道府縣。',
      languagePairRequired: '請至少選擇一種使用語言及其程度。'
    },
    levels: {
      none: '未填寫',
      beginner: '初級（日常對話有困難）',
      elementary: '初級上（可進行基本日常對話）',
      intermediate: '中級（日常對話沒問題）',
      upperIntermediate: '中級上（可理解複雜話題）',
      advanced: '高級（流利對話）',
      native: '母語程度'
    },
    schedule: {
      undecided: '尚未決定',
      noEntry: '未填寫',
      currentlyInJapan: '目前在日本',
      year2024: '2024年',
      year2025: '2025年',
      beyond2025: '2025年以後',
      beyond2026: '2026年以後',
      after: '年以後'
    },
    companion: {
      noEntry: '未填寫',
      alone: '一個人',
      friend: '與朋友',
      family: '與家人',
      partner: '與伴侶'
    },

    seasons: {
      spring: '春季 (3-5月)',
      summer: '夏季 (6-8月)',
      autumn: '秋季 (9-11月)',
      winter: '冬季 (12-2月)'
    },
    gender: {
      male: '男性',
      female: '女性'
    },
    bodyType: {
      noEntry: '未填寫',
      slim: '瘦',
      average: '中等',
      muscular: '肌肉結實',
      plump: '豐滿'
    },
    maritalStatus: {
      none: '未填寫',
      single: '單身',
      married: '已婚'
    },
    occupations: {
      noEntry: '未填寫',
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
      indoor: '偏好室內活動',
      active: '活躍',
      intellectual: '知性',
      meticulous: '一絲不苟',
      optimistic: '樂觀',
      shy: '害羞',
      attentive: '細心',
      refreshing: '清新',
      natural: '自然派',
      ownPace: '我行我素'
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
      kimono: '和服與浴衣',
      wagashi: '和菓子',
      pottery: '陶藝',
      origami: '摺紙',
      bonsai: '盆栽',
      shrinesTemples: '神社與寺廟',
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
      conbiniFood: '便利商店美食',
      potatoChips: '日式洋芋片',
      dashi: '日式高湯',
      miso: '味噌',
      tofu: '豆腐',
      umeboshi: '梅干',
      pickles: '日式釃菜',
      sake: '日本酒',
      shochu: '燒酎',
      soba: '蕎麥麵',
      udon: '烏龍麵',
      cherryBlossom: '賞櫻',
      autumnLeaves: '賞楓',
      hotSprings: '溫泉',
      festivals: '逛祭典',
      fireworks: '煙火大會',
      snowScape: '雪景',
      fourSeasons: '四季',
      bonDance: '盆舞',
      gardenWalk: '日本庭園散步',
      matchaSweets: '抹茶甜點',
      dango: '團子',
      taiyaki: '鯛魚燒',
      obanyaki: '今川燒',
      warabimochi: '蕨餅',
      candiedApple: '蘋果糖',
      cottonCandy: '棉花糖',
      dagashi: '駄菓子',
      conbiniSweets: '超商甜點',
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
      waModernInterior: '和風現代設計',
      anime: '動畫',
      manga: '漫畫',
      cosplay: '角色扮演',
      japaneseGames: '日本遊戲',
      jpop: 'J-POP',
      karaoke: 'KTV',
      japaneseMov: '日本電影',
      drama: '日劇',
      vocaloid: 'Vocaloid',
      idolCulture: '偶像文化',
      lacquerware: '漆器',
      goldLeaf: '金箔裝飾',
      paperMaking: '和紙製作',
      dyeing: '染物',
      swordSmithing: '鍛刀',
      woodworking: '木工',
      sugarCrafts: '和菓子工藝'
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
      fileSizeNote: '每張照片請控制在 5MB 以內',
      editingNote: '您可以裁剪或套用模糊效果',
      fileSizeError: '請將圖片檔案保持在5MB以下',
      fileTypeError: '請選擇支援的圖片檔案 (JPEG, PNG, WebP, HEIC)'
    },

    nationalities: {
      japan: '日本',
      usa: '美國',
      uk: '英國',
      canada: '加拿大',
      australia: '澳洲',
      germany: '德國',
      france: '法國',
      netherlands: '荷蘭',
      italy: '義大利',
      spain: '西班牙',
      sweden: '瑞典',
      norway: '挪威',
      denmark: '丹麥',
      korea: '韓國',
      china: '中國',
      taiwan: '台灣',
      thailand: '泰國',
      singapore: '新加坡',
      other: '其他'
    },

    prefectures: {
      tokyo: '東京都',
      kanagawa: '神奈川縣',
      chiba: '千葉縣',
      saitama: '埼玉縣',
      osaka: '大阪府',
      kyoto: '京都府',
      hyogo: '兵庫縣',
      aichi: '愛知縣',
      fukuoka: '福岡縣',
      hokkaido: '北海道',
      miyagi: '宮城縣',
      hiroshima: '廣島縣',
      shizuoka: '靜岡縣',
      ibaraki: '茨城縣',
      tochigi: '栃木縣',
      gunma: '群馬縣',
      niigata: '新潟縣',
      nagano: '長野縣',
      yamanashi: '山梨縣',
      gifu: '岐阜縣',
      mie: '三重縣',
      shiga: '滋賀縣',
      nara: '奈良縣',
      wakayama: '和歌山縣',
      tottori: '鳥取縣',
      shimane: '島根縣',
      okayama: '岡山縣',
      yamaguchi: '山口縣',
      tokushima: '德島縣',
      kagawa: '香川縣',
      ehime: '愛媛縣',
      kochi: '高知縣',
      saga: '佐賀縣',
      nagasaki: '長崎縣',
      kumamoto: '熊本縣',
      oita: '大分縣',
      miyazaki: '宮崎縣',
      kagoshima: '鹿兒島縣',
      okinawa: '沖繩縣'
    },
    signup: {
      title: '會員註冊',
      backButton: '返回',
      emailAddress: '電子郵件地址',
      emailPlaceholder: '電子郵件地址',
      password: '密碼',
      passwordPlaceholder: '密碼',
      passwordRequirement: '半形英文字母和數字都要包含的8字符以上',
      nickname: '暱稱',
      nicknamePlaceholder: '暱稱',
      nicknameNote: '之後可以更改。猶豫的話用姓名縮寫也OK',
      gender: '性別',
      male: '男性',
      female: '女性',
      genderNote: '註冊後無法更改性別',
      birthDate: '出生日期',
      birthDateNote: '※出生日期不會顯示給其他用戶。',
      nationality: '國籍',
      residence: '居住地',
      selectNationality: '選擇國籍',
      selectPrefecture: '選擇都道府縣',
      residenceNote: '請選擇您目前居住的都道府縣',
      genderSelectPrompt: '請先選擇性別',
      signupButton: '免費註冊',
      signingUp: '註冊中...',
      privacyNote: '我們會嚴格管理您的個人資訊。\n本網站受reCAPTCHA保護，\n適用Google的隱私政策和服務條款。',
      loginPrompt: '已經有帳號了嗎？',
      loginLink: '登入',
      ageRestriction: '僅限18歲以上使用',
      signupFailed: '註冊失敗。請再試一次。',
      japaneseNationalityConfirm: '我是日本國籍的女性',
      required: '必填'
    },

    login: {
      title: '登入',
      subtitle: '登入您的帳戶以享受文化體驗',
      emailAddress: '電子郵件地址',
      emailPlaceholder: 'your-email@example.com',
      password: '密碼',
      passwordPlaceholder: '輸入您的密碼',
      rememberMe: '保持登入狀態',
      forgotPassword: '忘記密碼？',
      loginButton: '登入',
      loggingIn: '登入中...',
      orDivider: '或',
      googleLogin: '使用 Google 登入',
      facebookLogin: '使用 Facebook 登入',
      signupPrompt: '還沒有帳戶？',
      signupLink: '註冊',
      securityNote: '本網站重視安全性和隱私保護。\n您的登入資訊會被加密保護。',
      loginFailed: '登入失敗。請再試一次。',
      serverError: '伺服器連線錯誤。請檢查環境設定。',
      errorPrefix: '錯誤：'
    },

    registerComplete: {
      title: '註冊完成',
      subtitle: '感謝您的註冊。',
      emailVerificationTitle: '電子郵件驗證要求',
      emailVerificationDescription: '為了身份驗證，我們已將註冊URL發送至您的電子郵件地址。',
      sentTo: '發送至：',
      instructions: '請點擊電子郵件中的URL以完成註冊。',
      troubleshootingTitle: '如果找不到電子郵件',
      troubleshootingSpam: '請檢查您的垃圾郵件資料夾。',
      troubleshootingEmailCheck: '請再次確認您註冊的電子郵件地址。',
      troubleshootingDomain: '如果您設定了網域限制或垃圾郵件過濾，請解除後透過聯絡表單與我們聯繫。',
      testModeTitle: '開發者測試功能',
      testModeDescription: '您可以跳過電子郵件驗證，直接進入個人資料編輯',
      testModeButton: '跳過驗證繼續（僅限測試）',
      loginButton: '前往登入',
      backToHome: '返回首頁',
      helpNote: '※ 請在24小時內完成電子郵件驗證',
      errorTitle: '發生錯誤',
      errorDescription: '找不到註冊資訊。\n請重新註冊。',
      backToSignup: '返回註冊'
    },

    resetPassword: {
      title: '密碼重設',
      subtitle: '請設定新密碼。',
      newPassword: '新密碼',
      newPasswordPlaceholder: '輸入新密碼',
      confirmPassword: '確認密碼',
      confirmPasswordPlaceholder: '重新輸入密碼',
      updateButton: '更新密碼',
      updating: '更新密碼中...',
      successMessage: '密碼已成功更新。',
      invalidLinkError: '無效的重設連結。',
      passwordMismatchError: '密碼不一致。',
      passwordTooShortError: '密碼必須至少8個字元。',
      updateFailedError: '密碼更新失敗。',
      loadingText: '載入中...'
    },

    verifyEmail: {
      loading: {
        title: '郵件認證中',
        description: '正在處理認證...\n請稍候。'
      },
      success: {
        title: '註冊完成',
        subtitle: '電子郵件地址認證已完成！\n歡迎加入櫻花俱樂部🌸',
        autoRedirectNotice: '自動跳轉到個人資料編輯頁面...',
        autoRedirectTime: '3秒後自動跳轉',
        proceedButton: '前往個人資料編輯'
      },
      error: {
        title: '認證錯誤',
        expiredTitle: '認證已過期',
        description: '認證失敗，請重試。',
        expiredDescription: '認證連結已過期，請重新註冊。',
        invalidUrlError: '認證連結無效',
        verificationFailedError: '認證失敗。連結可能無效或已過期。',
        signupButton: '重新註冊',
        loginButton: '前往登入頁面'
      },
      loadingFallback: {
        title: '載入中',
        description: '請稍候...'
      }
    },

    homepage: {
      // ヘッダー
      aboutService: '服務介紹',
      howItWorks: '使用方法',
      safetyAndSecurity: '安心·安全',
      culturalExperience: '文化體驗',
      login: '登入',
      signup: '註冊',
      
      // ヒーローセクション
      heroTitle: '透過文化體驗的',
      heroSubtitle: '真摯相遇',
      heroDescription: '讓訪日外國男性與日本女性透過\n日本飲食文化和傳統文化體驗\n享受自然相遇的安心·安全平台。',
      getStartedFree: '免費開始 (女性免費)',
      loginHere: '前往登入',
      
      // フィーチャーセクション
      safetyTitle: '安心·安全',
      safetyDescription: '透過身份驗證和審查制\n保證安全的相遇',
      culturalExchangeTitle: '文化交流',
      culturalExchangeDescription: '透過茶道·書道·料理等\n體驗真正的日本文化',
      internationalExchangeTitle: '國際交流',
      internationalExchangeDescription: '互相學習語言\n跨越國界的連結'
    },
    
    // 獨立的語言相關物件
    languageOptions: {
      japanese: '日語',
      english: '英語',
      korean: '韓語',
      chineseTraditional: '中文（繁體）'
    },
    
    languageLevels: {
      native: '母語',
      beginner: '初級',
      beginnerPlus: '初級以上',
      intermediate: '中級',
      intermediatePlus: '中級以上',
      advanced: '高級'
    },

    languageLevelDefinitions: {
      title: '語言程度說明：',
      beginner: '初級：可以用簡短的固定表達進行問候與簡單自我介紹等交流。',
      elementary: '初級上：對方放慢語速時，可進行簡單的日常對話（購物、問路等）。',
      intermediate: '中級：基本能應對日常會話，也能在較複雜的話題上持續交流。',
      upperIntermediate: '中級上：能較自然地進行工作、旅行等實用情境的對話，並能在一定程度上傳達細微語氣與含義。',
      advanced: '上級：能圍繞廣泛話題自然交流，並能恰當表達抽象內容與微妙含義。'
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
 * React Hook風のヘルパー関数（従来版・後方互換性のため保持）
 */
export function useTranslation(language: SupportedLanguage) {
  return {
    t: (key: string) => getTranslation(language, key),
    language
  }
}

/**
 * 統一言語プロバイダー連携版のuseTranslation
 * LanguageContextと統合され、アプリ全体で統一された言語を使用
 */
export function useUnifiedTranslation() {
  // 動的インポートでサーキュラー依存を回避
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useLanguage } = require('@/contexts/LanguageContext')
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { currentLanguage } = useLanguage()
    
    return {
      t: (key: string) => getTranslation(currentLanguage, key),
      language: currentLanguage
    }
  } catch (error) {
    // フォールバック: LanguageProviderが利用できない場合（初期ロード時など）
    console.warn('LanguageProvider not available, falling back to Japanese')
    return {
      t: (key: string) => getTranslation('ja', key),
      language: 'ja' as SupportedLanguage
    }
  }
}

export default translations