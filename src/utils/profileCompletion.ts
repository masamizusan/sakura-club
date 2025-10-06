/**
 * 統一されたプロフィール完成度計算関数
 * マイページとプロフィール編集画面で同じロジックを使用
 */

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
    // 外国人男性の必須フィールド（6個）
    requiredFields = [
      'nickname', 'age', 'birth_date', 'nationality',
      'hobbies', 'self_introduction'
    ]

    // 外国人男性のオプションフィールド（10個）
    optionalFields = [
      'occupation', 'height', 'body_type', 'marital_status',
      'personality', 'visit_schedule', 'travel_companion', 'planned_prefectures', 'japanese_level', 'planned_stations'
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
      'personality', 'city', 'english_level'
    ]
  }

  // 必須フィールドの完成チェック
  console.log(`🔍 必須フィールドチェック開始:`, {
    requiredFields,
    profileDataKeys: Object.keys(profileData),
    isForeignMale
  })

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
        value = profileData.interests || profileData.hobbies
        console.log(`🔍 hobbies フィールド検証:`, {
          field,
          'profileData.interests': profileData.interests,
          'profileData.hobbies': profileData.hobbies,
          'final value': value,
          'isArray': Array.isArray(value),
          'length': Array.isArray(value) ? value.length : 'not array'
        })
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
      console.log(`🔍 国籍フィールド検証 [${field}]:`, {
        value,
        isValid,
        type: typeof value
      })
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
      default:
        value = profileData[field]
    }

    // 値の有効性チェック
    if (Array.isArray(value)) {
      return value.length > 0
    }

    // 無効な値を除外（空文字、null、undefined、'none'、未選択系の値）
    if (!value || value === '' || value === 'none' || value === 'no-entry' ||
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

  // 🔍 詳細デバッグ: どの項目が完成済みかを表示
  console.log('🔍 完成度計算詳細:', {
    '必須完成項目': completedRequired,
    'オプション完成項目': completedOptional,
    '画像完成': hasImages,
    '必須完成数': completedRequired.length,
    'オプション完成数': completedOptional.length,
    '画像完成数': imageCompletionCount,
    '総完成数': completedFields,
    '総項目数': totalFields,
    '完成度': `${completion}%`,
    isNewUser
  })

  // 外国人男性の詳細デバッグ
  if (isForeignMale) {
    console.log('🌍 外国人男性プロフィール完成度詳細:', {
      requiredFields,
      optionalFields,
      completedRequired: completedRequired,
      completedOptional: completedOptional,
      requiredTotal: requiredFields.length,
      optionalTotal: optionalFields.length,
      totalFields,
      completedFields,
      completion: `${completion}%`,
      hasImages,
      profileData_nationality: profileData?.nationality,
      profileData_planned_prefectures: profileData?.planned_prefectures,
      // 詳細データ確認
      profileData_occupation: profileData?.occupation,
      profileData_height: profileData?.height,
      profileData_body_type: profileData?.body_type,
      profileData_marital_status: profileData?.marital_status,
      profileData_personality: profileData?.personality,
      profileData_visit_schedule: profileData?.visit_schedule,
      profileData_travel_companion: profileData?.travel_companion,
      // どのフィールドが完成済みかの詳細
      completedRequiredDetail: completedRequired.map(field => `${field}: ${JSON.stringify(profileData[field])}`),
      completedOptionalDetail: completedOptional.map(field => `${field}: ${JSON.stringify(profileData[field])}`)
    })
  }

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

  // 2. プロフィールデータの avatar_url
  const hasImagesInProfile = profileData && profileData.avatar_url &&
    profileData.avatar_url !== null && profileData.avatar_url !== ''

  // 3. user.avatarUrl（フォールバック）
  const hasImagesInUser = profileData.avatarUrl &&
    profileData.avatarUrl !== null && profileData.avatarUrl !== ''

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

  const result = !!(hasImagesInArray || hasImagesInProfile || hasImagesInSession || hasImagesInUser)

  // デバッグログ
  console.log('🖼️ 画像検出デバッグ:', {
    imageArray: imageArray ? `${imageArray.length} images` : 'undefined',
    hasImagesInArray,
    hasImagesInProfile,
    hasImagesInUser,
    hasImagesInSession,
    isNewUser,
    sessionStorageSkipped: isNewUser ? 'YES (new user)' : 'NO',
    profileData_avatar_url: profileData?.avatar_url,
    profileData_avatarUrl: profileData?.avatarUrl,
    finalResult: result
  })

  // CLAUDE.mdの完璧な実装：4つのフォールバック方法
  return result
}