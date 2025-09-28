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
  isForeignMale: boolean = false
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

    // 外国人男性のオプションフィールド（8個）
    optionalFields = [
      'occupation', 'height', 'body_type', 'marital_status',
      'personality', 'visit_schedule', 'travel_companion', 'planned_prefectures'
    ]
  } else {
    // 日本人女性の必須フィールド（6個）
    requiredFields = [
      'nickname', 'age', 'birth_date', 'prefecture',
      'hobbies', 'self_introduction'
    ]

    // 日本人女性のオプションフィールド（6個）
    optionalFields = [
      'occupation', 'height', 'body_type', 'marital_status',
      'personality', 'city'
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
        value = profileData.interests || profileData.hobbies
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
    return value !== null && value !== undefined && value !== ''
  })

  // オプションフィールドの完成チェック
  const completedOptional = optionalFields.filter(field => {
    let value = profileData[field]

    // 特別な処理が必要なフィールド
    if (field === 'personality') {
      value = profileData.personality || []
    }

    // 値の有効性チェック
    if (Array.isArray(value)) {
      return value.length > 0
    }
    if (field === 'city') {
      return value && value !== '' && value !== 'none'
    }
    return value && value !== '' && value !== 'none'
  })

  // 画像の有無チェック
  const hasImages = checkImagePresence(profileData, imageArray)

  // 完成度計算
  const totalFields = requiredFields.length + optionalFields.length + 1 // +1 for images
  const imageCompletionCount = hasImages ? 1 : 0
  const completedFields = completedRequired.length + completedOptional.length + imageCompletionCount
  const completion = Math.round((completedFields / totalFields) * 100)

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
      profileData_travel_companion: profileData?.travel_companion
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
  imageArray?: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>
): boolean {
  // 1. 引数で渡された画像配列
  const hasImagesInArray = imageArray && imageArray.length > 0

  // 2. プロフィールデータの avatar_url
  const hasImagesInProfile = profileData && profileData.avatar_url &&
    profileData.avatar_url !== null && profileData.avatar_url !== ''

  // 3. user.avatarUrl（フォールバック）
  const hasImagesInUser = profileData.avatarUrl &&
    profileData.avatarUrl !== null && profileData.avatarUrl !== ''

  // 4. セッションストレージからの画像（ブラウザ環境でのみ）
  let hasImagesInSession = false
  if (typeof window !== 'undefined') {
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
    profileData_avatar_url: profileData?.avatar_url,
    profileData_avatarUrl: profileData?.avatarUrl,
    finalResult: result
  })

  // CLAUDE.mdの完璧な実装：4つのフォールバック方法
  return result
}