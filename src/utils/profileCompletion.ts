/**
 * 統一されたプロフィール完成度計算関数
 * マイページとプロフィール編集画面で同じロジックを使用
 */

// ✨ 新機能: 使用言語＋言語レベルのチェック関数
const hasValidLanguageSkills = (profileData: any): boolean => {
  // 1. 新しい language_skills を優先（空文字・null・未選択を除外）
  if (profileData.language_skills && Array.isArray(profileData.language_skills) && profileData.language_skills.length > 0) {
    return profileData.language_skills.some((skill: any) => 
      skill.language && skill.language !== '' && skill.level && skill.level !== '' && skill.level !== 'none'
    )
  }
  
  // 2. 既存フィールドをフォールバックとして使用（後方互換性）
  const hasJapaneseLevel = profileData.japanese_level && profileData.japanese_level !== 'none' && profileData.japanese_level !== ''
  const hasEnglishLevel = profileData.english_level && profileData.english_level !== 'none' && profileData.english_level !== ''
  
  return hasJapaneseLevel || hasEnglishLevel
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
    // 外国人男性の必須フィールド（7個） - genderを追加
    requiredFields = [
      'nickname', 'gender', 'age', 'birth_date', 'nationality',
      'hobbies', 'self_introduction'
    ]

    // 外国人男性のオプションフィールド（9個）
    optionalFields = [
      'occupation', 'height', 'body_type', 'marital_status',
      'personality', 'visit_schedule', 'travel_companion', 'planned_prefectures', 'language_skills'
    ]
  } else {
    // 日本人女性の必須フィールド（6個）
    requiredFields = [
      'nickname', 'age', 'birth_date', 'prefecture',
      'hobbies', 'self_introduction'
    ]

    // 日本人女性のオプションフィールド（7個）
    optionalFields = [
      'occupation', 'height', 'body_type', 'marital_status',
      'personality', 'city', 'language_skills'
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

    return value !== null && value !== undefined && value !== ''
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
      case 'language_skills':
        // ✨ 新機能: 使用言語＋言語レベルのチェック
        return hasValidLanguageSkills(profileData)
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