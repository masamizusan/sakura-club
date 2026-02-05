/**
 * 🌸 SAKURA CLUB 完成度計算システム - 17項目固定仕様
 * 完成度 = floor(入力済み項目数 / 17 * 100)
 * 必須/任意の概念は一切使用しない
 */

// ✨ 統一された言語スキル型を使用
import { LanguageSkill, hasValidLanguageSkills } from '@/types/profile'
import { logger } from '@/utils/logger'

// 🚨 CRITICAL: self_introduction仮文言定義（未入力扱いにする）
const DEFAULT_SELF_INTRODUCTIONS = [
  "後でプロフィールを詳しく書きます。",
  "後ほど入力します",
  "後で入力します"
]

// 🌸 SAKURA CLUB 17項目計算用プロフィールデータ型
export interface ProfileData {
  nickname?: string
  gender?: string  
  age?: number
  birth_date?: string
  nationality?: string
  self_introduction?: string
  hobbies?: string[]
  language_skills?: any[]
  planned_prefectures?: string[]
  occupation?: string
  height?: number
  body_type?: string
  marital_status?: string
  personality?: string[]
  visit_schedule?: string
  travel_companion?: string
  city?: string | null
  residence?: string
  profile_images?: any[] | any
  // 画像関連フォールバック
  avatar_url?: string
  avatarUrl?: string
  profile_image?: string
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
  requiredFieldStatus?: Record<string, boolean>
}

export interface NormalizedProfile {
  // 必須フィールド
  nickname?: string
  gender?: string  
  age?: number
  birth_date?: string
  nationality?: string
  prefecture?: string
  hobbies?: string[]
  self_introduction?: string
  language_info?: any
  language_skills?: any[]      // 🆕 統一された言語スキル配列

  // オプションフィールド（Supabase専用カラム優先）
  occupation?: string
  height?: number
  body_type?: string
  marital_status?: string
  personality?: string[]       // 🚨 Supabaseのpersonality を最優先
  city?: string | null
  visit_schedule?: string
  travel_companion?: string
  planned_prefectures?: string[]

  // 画像関連
  avatar_url?: string
  avatarUrl?: string
  profile_image?: string
}

// 🧮 User type definitions for extensibility
export type UserType = 'foreign-male' | 'japanese-female'

/**
 * 🚨 CRITICAL: 言語情報完成度判定（厳密版）
 * プレースホルダー行 {language:"none", level:"none"} では完成扱いしない
 */
function hasLanguageInfo(profileData: any): boolean {
  const skills = profileData.language_skills || []
  
  // 厳密な有効性チェック：language ≠ 'none' かつ level ≠ 'none' かつ空文字でない
  const validSkills = Array.isArray(skills) ? skills.filter((s: any) =>
    s &&
    typeof s.language === "string" &&
    typeof s.level === "string" &&
    s.language !== "none" &&
    s.level !== "none" &&
    s.language.trim() !== "" &&
    s.level.trim() !== ""
  ) : []
  
  return validSkills.length > 0
}

/**
 * 🎯 完成度判定専用: 寛容な画像正規化関数（B案修正）
 * ユーザーが画像を追加した事実をカウントする（URL厳密性よりも存在を重視）
 */
export function normalizeImagesForCompletion(images?: any[]): Array<{ url: string; isMain: boolean; _hasFile?: boolean; _hasPreview?: boolean }> {
  if (!Array.isArray(images)) return []
  
  return images
    .filter(Boolean)
    .map((img) => {
      const url = img.url ?? img.publicUrl ?? img.previewUrl ?? img.preview ?? img.originalUrl ?? img.path ?? ''
      const hasFile = !!img.file // 新規追加直後
      const hasPreview = typeof url === 'string' && url.length > 0 // blob:含む
      const hasPath = !!img.path // 保存予定
      
      return { 
        url: url || 'pending-upload',
        isMain: Boolean(img.isMain),
        _hasFile: hasFile,
        _hasPreview: hasPreview,
        _hasPath: hasPath
      }
    })
    .filter((img) => img._hasFile || img._hasPreview || img._hasPath) // いずれかがあればOK
}

/**
 * 🎯 画像配列の正規化関数 - 型統一とbase64除外（保存/表示用）
 */
function normalizeImageArray(imageArray?: any[]): Array<{ url: string; isMain: boolean }> {
  if (!Array.isArray(imageArray)) return []
  
  return imageArray
    .map(img => {
      // string形式の場合
      if (typeof img === 'string') {
        return { url: img, isMain: false }
      }
      
      // object形式の場合
      if (img && typeof img === 'object') {
        const url = img.url || img.originalUrl || img.avatar_url || img.profile_image
        if (url && typeof url === 'string') {
          return { url, isMain: Boolean(img.isMain) }
        }
      }
      
      return null
    })
    .filter((img): img is { url: string; isMain: boolean } => {
      // null除外 + base64画像除外（data:image/...）
      if (!img || !img.url) return false
      return typeof img.url === 'string' &&
             img.url.trim() !== '' &&
             !img.url.startsWith('data:image/')  // 🚨 base64画像は無効として除外
    }) as Array<{ url: string; isMain: boolean }>
}

/**
 * プロフィール画像の有無を判定する関数（MyPage表示ロジック完全一致版）
 * 🚨 STEP3 FIX: MyPageの表示条件と完成度計算を完全統一
 */
function hasProfileImages(profile: ProfileData, imageArray?: any[], isNewUser: boolean = false): boolean {
  // 🔥 恒久修正: data URI、HTTP、Storage path全てOKとする（MyPageアバター安定化）
  const hasAvatar = typeof profile?.avatar_url === "string" && profile.avatar_url.trim().length > 0
  const hasProfileImage = typeof profile?.profile_image === "string" && profile.profile_image.trim().length > 0
  const imageCondition = hasAvatar || hasProfileImage

  // TASK3: 強制has_profile_image=true撤去 → 条件極小化
  const hasProfileImageFlag = (profile as any).has_profile_image === true
  if (hasProfileImageFlag) {
    const isFromMyPageRecovery = Boolean((profile as any).fromMyPage && profile.avatar_url)
    if (isFromMyPageRecovery) {
      return true
    }
  }

  // 優先度2: imageArray（フォーム状態）
  if (Array.isArray(imageArray) && imageArray.length > 0) {
    const validImages = imageArray.filter(img => {
      if (!img) return false
      const url = img.url || img.originalUrl || img.avatar_url
      return url && typeof url === 'string' && url.trim().length > 0
    })
    if (validImages.length > 0) {
      return true
    }
  }

  // 優先度3: 統一画像判定ロジック
  if (imageCondition) {
    return true
  }

  return false
}

/**
 * 🌸 SAKURA CLUB 仕様: 17項目固定完成度計算
 * - 必須/任意の概念は一切使用しない
 * - 常に17項目固定で計算
 * - 完成度 = floor(入力済み項目数 / 17 * 100)
 */
// 🛡️ CRITICAL FIX: 日本人女性用14項目計算関数（city除外で15→14項目に変更）
function calculateCompletion14Fields(profile: ProfileData, imageArray?: any[]): { completed: number; total: number; percentage: number } {
  let completedCount = 0
  const missingFields: string[] = [] // 🧩 MISSING FIELDS追跡用
  
  // 1. ニックネーム
  if (profile.nickname && profile.nickname.trim() !== '') {
    completedCount++
  } else {
    missingFields.push('nickname')
  }
  
  // 2. 性別
  if (profile.gender && profile.gender !== '') {
    completedCount++
  } else {
    missingFields.push('gender')
  }
  
  // 3. 年齢
  if (profile.age && profile.age > 0) {
    completedCount++
  } else {
    missingFields.push('age')
  }
  
  // 4. 生年月日
  if (profile.birth_date && profile.birth_date !== '') {
    completedCount++
  } else {
    missingFields.push('birth_date')
  }
  
  // 5. 都道府県（residence）
  if (profile.residence && profile.residence.trim() !== '') {
    completedCount++
  } else {
    missingFields.push('residence')
  }
  
  // 6. 自己紹介
  const isDefaultSelfIntro = DEFAULT_SELF_INTRODUCTIONS.includes(profile.self_introduction || '')
  if (profile.self_introduction && profile.self_introduction.trim() !== '' && !isDefaultSelfIntro) {
    completedCount++
  } else {
    missingFields.push('self_introduction')
  }
  
  
  // 8. 職業
  if (profile.occupation && profile.occupation !== '' && profile.occupation !== 'none') {
    completedCount++
  } else {
    missingFields.push('occupation')
  }
  
  // 9. 身長
  if (profile.height && profile.height > 0) {
    completedCount++
  } else {
    missingFields.push('height')
  }
  
  // 10. 体型
  if (profile.body_type && profile.body_type !== '' && profile.body_type !== 'none') {
    completedCount++
  } else {
    missingFields.push('body_type')
  }
  
  // 11. 結婚歴
  if (profile.marital_status && profile.marital_status !== '' && profile.marital_status !== 'none') {
    completedCount++
  } else {
    missingFields.push('marital_status')
  }
  
  // 12. 使用言語（language_skills）
  if (hasLanguageInfo(profile)) {
    completedCount++
  } else {
    missingFields.push('language_skills')
  }
  
  // 13. 性格（personality_tags）
  if (Array.isArray(profile.personality) && profile.personality.length > 0) {
    completedCount++
  } else {
    missingFields.push('personality_tags')
  }
  
  // 14. 共有したい日本文化（culture_tags）
  if (Array.isArray(profile.hobbies) && profile.hobbies.length > 0) {
    completedCount++
  } else {
    missingFields.push('culture_tags')
  }

  // 14. プロフィール画像
  const hasImagesResult = hasProfileImages(profile, imageArray)

  if (hasImagesResult) {
    completedCount++
  } else {
    missingFields.push('profile_images')
  }

  const percentage = Math.round((completedCount / 14) * 100)
  
  return {
    completed: completedCount,
    total: 14,
    percentage: percentage
  }
}

function calculateCompletion17Fields(profile: ProfileData, imageArray?: any[]): { completed: number; total: number; percentage: number } {
  let completedCount = 0
  const missingFields: string[] = [] // 🧩 MISSING FIELDS追跡用（外国人男性）
  
  // 1. ニックネーム
  if (profile.nickname && profile.nickname.trim() !== '') {
    completedCount++
  }
  
  // 2. 性別
  if (profile.gender && profile.gender !== '') {
    completedCount++
  }
  
  // 3. 年齢
  if (profile.age && profile.age > 0) {
    completedCount++
  }
  
  // 4. 生年月日
  if (profile.birth_date && profile.birth_date !== '') {
    completedCount++
  }
  
  // 5. 国籍
  if (profile.nationality && profile.nationality !== '' && profile.nationality !== '国籍を選択' && profile.nationality !== 'none') {
    completedCount++
  }
  
  // 6. 自己紹介
  const isDefaultSelfIntro = DEFAULT_SELF_INTRODUCTIONS.includes(profile.self_introduction || '')
  if (profile.self_introduction && profile.self_introduction.trim() !== '' && !isDefaultSelfIntro) {
    completedCount++
  }
  
  // 7. 趣味・興味
  if (Array.isArray(profile.hobbies) && profile.hobbies.length > 0) {
    completedCount++
  }
  
  // 8. 言語スキル
  if (hasLanguageInfo(profile)) {
    completedCount++
  }
  
  // 9. 予定都道府県
  if (Array.isArray(profile.planned_prefectures) && profile.planned_prefectures.length > 0) {
    completedCount++
  }
  
  // 10. 職業
  if (profile.occupation && profile.occupation !== '' && profile.occupation !== 'none') {
    completedCount++
  }
  
  // 11. 身長
  if (profile.height && profile.height > 0) {
    completedCount++
  }
  
  // 12. 体型
  if (profile.body_type && profile.body_type !== '' && profile.body_type !== 'none') {
    completedCount++
  }
  
  // 13. 結婚歴
  if (profile.marital_status && profile.marital_status !== '' && profile.marital_status !== 'none') {
    completedCount++
  }
  
  // 14. 性格
  if (Array.isArray(profile.personality) && profile.personality.length > 0) {
    completedCount++
  }
  
  // 15. 訪問予定（sentinel値除外修正）
  const visitScheduleFilled = profile.visit_schedule && 
    profile.visit_schedule !== '' && 
    profile.visit_schedule !== 'none' &&
    profile.visit_schedule !== 'no-entry' &&
    profile.visit_schedule !== 'noEntry' &&
    profile.visit_schedule !== 'forms.noEntry'
  if (visitScheduleFilled) {
    completedCount++
  }
  
  // 16. 旅行同伴者（sentinel値除外修正）
  const travelCompanionFilled = profile.travel_companion && 
    profile.travel_companion !== '' && 
    profile.travel_companion !== 'none' &&
    profile.travel_companion !== 'no-entry' &&
    profile.travel_companion !== 'noEntry' &&
    profile.travel_companion !== 'undecided' &&
    profile.travel_companion !== 'forms.noEntry'
  if (travelCompanionFilled) {
    completedCount++
  }
  
  // デバッグログ削除（本番ノイズ防止）
  
  // 17. プロフィール画像
  if (hasProfileImages(profile, imageArray)) {
    completedCount++
  }
  
  const percentage = Math.round((completedCount / 17) * 100)
  
  return {
    completed: completedCount,
    total: 17,
    percentage
  }
}

/**
 * 🌸 SAKURA CLUB メイン完成度計算関数
 * userType や 必須/任意 概念は使用せず、常に17項目固定で計算
 */
export function calculateCompletion(
  profile: NormalizedProfile,
  userType: UserType,
  imageArray?: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>,
  isNewUser: boolean = false,
  persistedProfile?: any
): ProfileCompletionResult {
  
  // 🛡️ CRITICAL FIX: 日本人女性は15項目、外国人男性は17項目で計算
  const enhancedProfile: ProfileData = {
    ...profile,
    profile_images: imageArray
  }
  
  // userTypeに応じた計算分岐（14項目固定維持）
  if (userType === 'japanese-female') {
    const result14 = calculateCompletion14Fields(enhancedProfile, imageArray)
    
    return {
      completion: result14.percentage,
      completedFields: result14.completed,
      totalFields: result14.total,
      requiredCompleted: result14.completed,
      requiredTotal: result14.total,
      optionalCompleted: 0,
      optionalTotal: 0,
      hasImages: hasProfileImages(enhancedProfile, imageArray),
      requiredFieldStatus: {}
    }
  } else {
    // 外国人男性は従来通り17項目
    const result17 = calculateCompletion17Fields(enhancedProfile, imageArray)
    
    return {
      completion: result17.percentage,
      completedFields: result17.completed,
      totalFields: result17.total,
      requiredCompleted: result17.completed,
      requiredTotal: result17.total,
      optionalCompleted: 0,
      optionalTotal: 0,
      hasImages: hasProfileImages(enhancedProfile, imageArray),
      requiredFieldStatus: {}
    }
  }
}

/**
 * Legacy関数 - 新システムへのリダイレクト
 */
export function calculateProfileCompletion(
  profileData: any,
  imageArray?: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>,
  isForeignMale: boolean = false,
  isNewUser: boolean = false
): ProfileCompletionResult {

  logger.warn('[COMPLETION] DEPRECATED: use calculateCompletion instead')
  
  // 新統一システムにリダイレクト
  const normalized: NormalizedProfile = { ...profileData }
  return calculateCompletion(normalized, isForeignMale ? 'foreign-male' : 'japanese-female', imageArray, isNewUser)
}

/**
 * フォーム値から完成度計算
 */
export function calculateCompletionFromForm(
  formValues: any,
  userType: 'foreign-male' | 'japanese-female',
  imageArray: any[] = [],
  isNewUser: boolean = false
) {
  const profileData: ProfileData = buildCompletionInputFromForm(formValues, imageArray)

  let calculationResult: { completed: number; total: number; percentage: number }

  if (userType === 'japanese-female') {
    calculationResult = calculateCompletion14Fields(profileData, imageArray)
  } else {
    calculationResult = calculateCompletion17Fields(profileData, imageArray)
  }

  const result: ProfileCompletionResult = {
    completion: calculationResult.percentage,
    completedFields: calculationResult.completed,
    totalFields: calculationResult.total,
    requiredCompleted: calculationResult.completed,
    requiredTotal: calculationResult.total,
    optionalCompleted: 0,
    optionalTotal: 0,
    hasImages: hasProfileImages(profileData, imageArray),
    requiredFieldStatus: {}
  }

  return result
}

/**
 * 正規化関数 - 旧システムとの互換性のため
 */
export function normalizeProfile(rawProfile: any, userType: UserType): NormalizedProfile {
  const normalized: NormalizedProfile = {
    ...rawProfile,
    // 基本的なフィールドマッピング
    nickname: rawProfile.nickname || rawProfile.name,
    self_introduction: rawProfile.self_introduction || rawProfile.bio,
    hobbies: rawProfile.hobbies || rawProfile.interests,
    // 画像関連
    avatar_url: rawProfile.avatar_url || rawProfile.avatarUrl
  }

  return normalized
}

/**
 * プロフィール構築関数 - 旧システムとの互換性のため
 */
export function buildProfileForCompletion(
  dbProfile: any,
  selectedHobbies: string[] = [],
  selectedPersonality: string[] = [],
  languageSkills: any[] = []
): any {
  return {
    ...dbProfile,
    hobbies: selectedHobbies.length > 0 ? selectedHobbies : (dbProfile?.hobbies || []),
    personality: selectedPersonality.length > 0 ? selectedPersonality : (dbProfile?.personality || []),
    language_skills: languageSkills.length > 0 ? languageSkills : (dbProfile?.language_skills || [])
  }
}

/**
 * フォーム値から完成度計算用オブジェクト作成 - 旧システムとの互換性のため
 * 🌸 画像状態を必ず含める（フォーム値だけに依存しない）
 */
export function buildCompletionInputFromForm(formValues: any, imageArray?: any[]) {
  // 🌸 TASK2: 画像の有無を必ずセット（state/ref を一次ソース）
  const imagesCount = Array.isArray(imageArray) ? imageArray.length : 0
  const hasImages = imagesCount > 0

  return {
    // 基本情報
    nickname: formValues.nickname,
    gender: formValues.gender,
    age: formValues.age,
    birth_date: formValues.birth_date,
    nationality: formValues.nationality,
    bio: formValues.bio,
    self_introduction: formValues.self_introduction,

    // 配列項目（空配列を明示的に設定）
    hobbies: Array.isArray(formValues.hobbies) ? formValues.hobbies : [],
    personality: Array.isArray(formValues.personality) ? formValues.personality : [],
    // 🔧 CRITICAL: 有効スキルのみ抽出（none/none除外）- 35%初期問題解決
    language_skills: (() => {
      const rawSkills = Array.isArray(formValues.language_skills) ? formValues.language_skills : []
      const validSkills = rawSkills.filter((s: any) =>
        s &&
        typeof s.language === "string" &&
        typeof s.level === "string" &&
        s.language !== "none" &&
        s.level !== "none" &&
        s.language.trim() !== "" &&
        s.level.trim() !== ""
      )
      return validSkills
    })(),
    planned_prefectures: Array.isArray(formValues.planned_prefectures) 
      ? formValues.planned_prefectures 
      : [],

    // オプション項目
    occupation: formValues.occupation,
    height: formValues.height,
    body_type: formValues.body_type,
    marital_status: formValues.marital_status,
    visit_schedule: formValues.visit_schedule,
    travel_companion: formValues.travel_companion,

    // ジオ情報（🔧 prefecture→residence統一変換）
    prefecture: formValues.prefecture,
    residence: formValues.prefecture || formValues.residence || "", // 🎯 A案修正: prefecture→residence変換
    
    // 🌸 TASK2: 画像状態を確実に含める（state/refから優先取得）
    has_profile_image: hasImages,
    profile_images: imageArray || [],
    // 画像関連フォールバック
    avatar_url: formValues.avatar_url,
    avatarUrl: formValues.avatarUrl
  }
}

/**
 * 安全装置関数 - 旧システムとの互換性のため
 */
export function sanitizeForCompletion(input: any) {
  const sanitized = {
    ...input,
    hobbies: Array.isArray(input.hobbies) ? input.hobbies : [],
    personality: Array.isArray(input.personality) ? input.personality : [],
    language_skills: Array.isArray(input.language_skills) ? input.language_skills : []
  }
  return sanitized
}