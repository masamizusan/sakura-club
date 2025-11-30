/**
 * 統一されたプロフィール完成度計算関数
 * マイページとプロフィール編集画面で同じロジックを使用
 */

// ✨ 言語情報の完了判定（統一スロット）- 言語＋レベルが両方セットされているときだけ true
type LanguageSkill = {
  language?: string
  level?: string
}

// FIX: language info completion - シンプルに language_skills のみをチェック
function hasLanguageInfo(profileData: any): boolean {
  // 望んでいる仕様: language_skills を優先して見る
  // 最低 1件の language_skills 要素があり、language !== 'none' かつ level !== 'none' のペアが存在すれば「入力済み」
  
  const skills = profileData.language_skills as LanguageSkill[] | undefined
  
  // language_skills が存在しない、または空配列の場合は未入力扱い
  if (!Array.isArray(skills) || skills.length === 0) {
    return false
  }
  
  // 最低1つの有効なペア（language !== 'none' && level !== 'none'）があれば完成
  return skills.some((skill) => {
    if (!skill) return false
    
    const lang = skill.language
    const level = skill.level
    
    // FIX: none は常に「未入力扱い」
    return (
      lang !== undefined &&
      lang !== null &&
      lang !== '' &&
      lang !== 'none' &&
      level !== undefined &&
      level !== null &&
      level !== '' &&
      level !== 'none'
    )
  })
}

// 専用カラム優先、city JSONフォールバックのヘルパー関数
function getFieldFromDedicatedColumnOrCity(profileData: any, fieldName: string): any {
  // 専用カラムの値を優先
  if (profileData[fieldName] !== null && profileData[fieldName] !== undefined && profileData[fieldName] !== '') {
    return profileData[fieldName]
  }

  // フォールバック: city JSONから取得
  try {
    const cityData = typeof profileData.city === 'string' ? JSON.parse(profileData.city) : profileData.city
    if (cityData && cityData[fieldName]) {
      return cityData[fieldName]
    }
  } catch (e) {
    // JSON parse error - ignore and return null
  }

  return null
}

// 新形式のcity JSONから市区町村名を取得
function getCityFromNewFormat(cityJson: string | null): string | null {
  if (!cityJson) return null
  
  try {
    const cityData = typeof cityJson === 'string' ? JSON.parse(cityJson) : cityJson
    return cityData?.city || null
  } catch (e) {
    // JSON parse error - try to return as is if it's a simple string
    return typeof cityJson === 'string' && cityJson !== '' ? cityJson : null
  }
}

export interface ProfileCompletionResult {
  completion: number
  completedFields: number
  totalFields: number
  requiredCompleted: number
  requiredTotal: number
  optionalCompleted: number
  optionalTotal: number
  hasImages: boolean
}

export function calculateProfileCompletion(
  profileData: any,
  imageArray?: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>,
  isForeignMale: boolean = false,
  isNewUser: boolean = false
): ProfileCompletionResult {

  // 必須・オプションフィールドの定義
  let requiredFields = []
  let optionalFields = []

  if (isForeignMale) {
    // 外国人男性の必須フィールド（8個） - language_info を統一スロットとして追加
    requiredFields = [
      'nickname', 'gender', 'age', 'birth_date', 'nationality',
      'hobbies', 'self_introduction', 'language_info'
    ]

    // 外国人男性のオプションフィールド（8個）
    optionalFields = [
      'occupation', 'height', 'body_type', 'marital_status',
      'personality', 'visit_schedule', 'travel_companion', 'planned_prefectures'
    ]
  } else {
    // 日本人女性の必須フィールド（7個） - 言語情報は不要
    requiredFields = [
      'nickname', 'age', 'birth_date', 'prefecture',
      'hobbies', 'self_introduction'
    ]

    // 日本人女性のオプションフィールド（7個）- 言語情報をオプションに追加
    optionalFields = [
      'occupation', 'height', 'body_type', 'marital_status',
      'personality', 'city', 'language_info'
    ]
  }

  // 必須フィールドの完成チェック

  const completedRequired = requiredFields.filter(field => {
    let value

    // フィールド名のマッピング（マイページとプロフィール編集の差異を吸収）
    switch (field) {
      case 'nickname':
        value = profileData.name || profileData.nickname
        break
      case 'birth_date':
        value = profileData.birth_date || profileData.date_of_birth
        break
      case 'prefecture':
        value = profileData.residence || profileData.prefecture
        break
      case 'hobbies':
        value = profileData.hobbies || profileData.interests
        break
      case 'self_introduction':
        value = profileData.bio || profileData.self_introduction
        break
      case 'planned_prefectures':
        value = profileData.planned_prefectures
        break
      case 'language_info':
        // ✨ 統一された言語情報スロット
        return hasLanguageInfo(profileData)
      default:
        value = profileData[field]
    }

    // 値の有効性チェック
    if (Array.isArray(value)) {
      return value.length > 0
    }

    // 国籍の特別チェック：空文字、null、undefined、選択プレースホルダーを除外
    if (field === 'nationality') {
      const isValid = value && value !== '' && value !== '国籍を選択' && value !== 'none' && value !== null && value !== undefined
      return isValid
    }


    // FIX: none を統一的に未入力扱い
    return value !== null && value !== undefined && value !== '' && value !== 'none'
  })

  // オプションフィールドの完成チェック
  const completedOptional = optionalFields.filter(field => {
    let value = profileData[field]

    // フィールド別の特別な処理
    switch (field) {
      case 'personality':
        value = profileData.personality || []
        // nullまたはundefinedの場合は空配列に変換
        if (!Array.isArray(value)) {
          value = []
        }
        break
      case 'visit_schedule':
        // 外国人男性の訪問予定時期
        value = profileData.visit_schedule
        break
      case 'travel_companion':
        // 外国人男性の同行者
        value = profileData.travel_companion
        break
      case 'planned_prefectures':
        // 外国人男性の行く予定の都道府県
        value = profileData.planned_prefectures || []
        break
      case 'occupation':
      case 'height':
      case 'body_type':
      case 'marital_status':
        // 専用カラム優先、city JSONフォールバック
        value = getFieldFromDedicatedColumnOrCity(profileData, field)
        break
      case 'city':
        // cityフィールドは新形式（{"city": "武蔵野市"}）から取得
        value = getCityFromNewFormat(profileData.city)
        break
      case 'language_info':
        // ✨ 日本人女性のオプション言語情報スロット
        return hasLanguageInfo(profileData)
      default:
        value = profileData[field]
    }

    // 値の有効性チェック
    if (Array.isArray(value)) {
      return value.length > 0
    }

    // 無効な値を除外（空文字、null、undefined、'none'、未選択系の値）
    if (!value || value === '' || value === 'none' || value === 'no-entry' || value === 'noEntry' ||
        value === '選択してください' || value === '未選択' ||
        value === '国籍を選択' || value === '都道府県を選択') {
      return false
    }

    return true
  })

  // 画像の有無チェック
  const hasImages = checkImagePresence(profileData, imageArray, isNewUser)

  // 完成度計算
  const totalFields = requiredFields.length + optionalFields.length + 1 // +1 for images
  const imageCompletionCount = hasImages ? 1 : 0
  const completedFields = completedRequired.length + completedOptional.length + imageCompletionCount
  const completion = Math.round((completedFields / totalFields) * 100)

  // ✨ デバッグ用ログ（一時的）
  const incompleteRequired = requiredFields.filter(field => {
    if (field === 'language_info') return !hasLanguageInfo(profileData)
    
    let value
    switch (field) {
      case 'nickname': value = profileData.name || profileData.nickname; break
      case 'birth_date': value = profileData.birth_date || profileData.date_of_birth; break
      case 'prefecture': value = profileData.residence || profileData.prefecture; break
      case 'hobbies': value = profileData.hobbies || profileData.interests; break
      case 'self_introduction': value = profileData.bio || profileData.self_introduction; break
      case 'planned_prefectures': value = profileData.planned_prefectures; break
      default: value = profileData[field]
    }
    
    if (Array.isArray(value)) return value.length === 0
    if (field === 'nationality') return !value || value === '' || value === '国籍を選択' || value === 'none'
    return !value || value === '' || value === null || value === undefined
  })

  const incompleteOptional = optionalFields.filter(field => {
    let value = profileData[field]
    
    switch (field) {
      case 'personality': 
        value = profileData.personality || []
        return !Array.isArray(value) || value.length === 0
      case 'occupation':
      case 'height':
      case 'body_type':
      case 'marital_status':
        value = getFieldFromDedicatedColumnOrCity(profileData, field)
        return !value || value === '' || value === 'none'
      case 'city':
        value = getCityFromNewFormat(profileData.city)
        return !value
      case 'language_info':
        // ✨ 言語情報の完成度チェック（オプション用）
        return !hasLanguageInfo(profileData)
      default:
        return !value || value === '' || value === 'none'
    }
  })

  // ✨ 言語情報の詳細デバッグ情報を追加
  const languageInfoResult = hasLanguageInfo(profileData)
  const skills = profileData.language_skills
  
  // FIX: 修正済み仕様に基づくデバッグ情報
  // 各スキルの個別検証結果も表示
  const skillsValidationDetails = Array.isArray(skills) ? skills.map((skill, index) => ({
    index,
    language: skill?.language || 'undefined',
    level: skill?.level || 'undefined',
    isValid: skill && skill.language !== 'none' && skill.level !== 'none' &&
             skill.language !== undefined && skill.language !== null && skill.language !== '' &&
             skill.level !== undefined && skill.level !== null && skill.level !== ''
  })) : []

  console.log('🔍 ProfileCompletion Debug', {
    completedRequired: completedRequired.length,
    totalRequired: requiredFields.length,
    completedOptional: completedOptional.length,  
    totalOptional: optionalFields.length,
    hasImages,
    totalFields,
    completedFields,
    completion: `${completion}%`,
    // FIX: 修正済み言語情報の詳細分析
    languageInfo: {
      hasLanguageInfo: languageInfoResult,
      language_skills: skills,
      skillsValidationDetails: skillsValidationDetails,
      validSkillsCount: skillsValidationDetails.filter(s => s.isValid).length
    },
    incompleteRequired,
    incompleteOptional,
    isForeignMale,
    isNewUser,
    // 🎯 テストケース確認用
    testCaseResults: {
      caseA_allNone: skills && skills.length === 1 && skills[0]?.language === 'none' && skills[0]?.level === 'none',
      caseB_validPair: skills && skills.some((s: any) => s?.language !== 'none' && s?.level !== 'none'),
      caseC_shouldMaintain100: languageInfoResult && completedRequired.length === requiredFields.length && hasImages
    }
  })

  // 完成度計算完了

  return {
    completion,
    completedFields,
    totalFields,
    requiredCompleted: completedRequired.length,
    requiredTotal: requiredFields.length,
    optionalCompleted: completedOptional.length,
    optionalTotal: optionalFields.length,
    hasImages
  }
}

/**
 * 画像の存在チェック（CLAUDE.mdの完璧な実装に基づく）
 */
function checkImagePresence(
  profileData: any,
  imageArray?: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>,
  isNewUser: boolean = false
): boolean {
  // 1. 引数で渡された画像配列
  const hasImagesInArray = imageArray && imageArray.length > 0

  // 2. プロフィールデータの avatar_url（新規ユーザーは除外）
  const hasImagesInProfile = !isNewUser && profileData && profileData.avatar_url &&
    profileData.avatar_url !== null && profileData.avatar_url !== ''

  // 3. user.avatarUrl（フォールバック、新規ユーザーは除外）
  const hasImagesInUser = !isNewUser && profileData.avatarUrl &&
    profileData.avatarUrl !== null && profileData.avatarUrl !== ''

  // 5. テストモード専用: profile_image フィールド（新規ユーザーは除外）
  const hasImagesInTestMode = !isNewUser && profileData && profileData.profile_image &&
    profileData.profile_image !== null && profileData.profile_image !== ''

  // 4. セッションストレージからの画像（ブラウザ環境でのみ、新規ユーザーは除外）
  let hasImagesInSession = false
  if (typeof window !== 'undefined' && !isNewUser) {
    try {
      const profileImages = window.sessionStorage.getItem('currentProfileImages')
      if (profileImages) {
        const parsedImages = JSON.parse(profileImages)
        hasImagesInSession = Array.isArray(parsedImages) && parsedImages.length > 0
      }
    } catch (e) {
      // セッションストレージエラーは無視
    }
  }

  // 5. localStorageからの画像（fromMyPage遷移用のみ、新規ユーザーは完全除外）
  let hasImagesInLocalStorage = false
  if (typeof window !== 'undefined' && !isNewUser) {
    // fromMyPageフラグがある場合のみlocalStorageを確認
    const urlParams = new URLSearchParams(window.location.search)
    const isFromMyPage = urlParams.get('fromMyPage') === 'true'
    
    if (isFromMyPage) {
      try {
        const localImages = window.localStorage.getItem('currentProfileImages')
        if (localImages) {
          const parsedLocalImages = JSON.parse(localImages)
          hasImagesInLocalStorage = Array.isArray(parsedLocalImages) && parsedLocalImages.length > 0
        }
      } catch (e) {
        // localStorage読み込みエラーは無視
      }
    }
  }

  const result = !!(hasImagesInArray || hasImagesInProfile || hasImagesInSession || hasImagesInUser || hasImagesInTestMode || hasImagesInLocalStorage)

  // デバッグログ
  console.log('🖼️ 画像検出デバッグ:', {
    imageArray: imageArray ? `${imageArray.length} images` : 'undefined',
    hasImagesInArray,
    hasImagesInProfile: isNewUser ? `SKIPPED (new user)` : hasImagesInProfile,
    hasImagesInUser: isNewUser ? `SKIPPED (new user)` : hasImagesInUser,
    hasImagesInTestMode,
    hasImagesInSession,
    hasImagesInLocalStorage: isNewUser ? `SKIPPED (new user)` : hasImagesInLocalStorage,
    isNewUser,
    sessionStorageSkipped: isNewUser ? 'YES (new user)' : 'NO',
    profileDataSkipped: isNewUser ? 'YES (new user)' : 'NO',
    localStorageSkipped: isNewUser ? 'YES (new user)' : 'NO',
    profileData_avatar_url: profileData?.avatar_url,
    profileData_avatarUrl: profileData?.avatarUrl,
    profileData_profile_image: profileData?.profile_image,
    finalResult: result
  })

  // CLAUDE.mdの完璧な実装：4つのフォールバック方法
  return result
}