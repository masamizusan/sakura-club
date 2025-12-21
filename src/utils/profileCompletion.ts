/**
 * 🌸 SAKURA CLUB 完成度計算システム - 17項目固定仕様
 * 完成度 = floor(入力済み項目数 / 17 * 100)
 * 必須/任意の概念は一切使用しない
 */

// ✨ 統一された言語スキル型を使用
import { LanguageSkill, hasValidLanguageSkills } from '@/types/profile'

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
 * プロフィール画像の有無を判定する関数
 * 🌸 has_profile_imageフラグを優先的に確認
 */
function hasProfileImages(profile: ProfileData, imageArray?: any[], isNewUser: boolean = false): boolean {
  // 🌸 TASK1: has_profile_imageフラグが設定されていればそれを優先
  if (typeof (profile as any).has_profile_image === 'boolean') {
    return (profile as any).has_profile_image
  }
  
  // 1. imageArray パラメータ優先
  if (Array.isArray(imageArray) && imageArray.length > 0) {
    return true
  }
  
  // 2. profile_images配列
  if (Array.isArray(profile.profile_images) && profile.profile_images.length > 0) {
    return true
  }
  
  // 3. その他の画像URLフィールド
  if (profile.avatar_url && profile.avatar_url !== '') {
    return true
  }
  
  if (profile.avatarUrl && profile.avatarUrl !== '') {
    return true
  }
  
  if (profile.profile_image && profile.profile_image !== '') {
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
function calculateCompletion17Fields(profile: ProfileData, imageArray?: any[]): { completed: number; total: number; percentage: number } {
  let completedCount = 0
  
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
  
  // 15. 訪問予定
  if (profile.visit_schedule && profile.visit_schedule !== '' && profile.visit_schedule !== 'none') {
    completedCount++
  }
  
  // 16. 旅行同伴者
  if (profile.travel_companion && profile.travel_companion !== '' && profile.travel_companion !== 'none') {
    completedCount++
  }
  
  // 17. プロフィール画像
  if (hasProfileImages(profile, imageArray)) {
    completedCount++
  }
  
  const percentage = Math.round((completedCount / 17) * 100)
  
  console.log('🌸 SAKURA CLUB COMPLETION:', {
    'TOTAL FIELDS': 17,
    'COMPLETED': completedCount,
    'COMPLETION': `${percentage}%`,
    'completionInput.has_profile_image': (profile as any).has_profile_image,
    'hasProfileImages_result': hasProfileImages(profile, imageArray),
    'completedFields内訳_画像': hasProfileImages(profile, imageArray) ? 'TRUE' : 'FALSE'
  })
  
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
  
  // 🌸 SAKURA CLUB 仕様: 17項目固定計算（userType/必須任意は無視）
  const enhancedProfile: ProfileData = {
    ...profile,
    profile_images: imageArray
  }
  
  const result17 = calculateCompletion17Fields(enhancedProfile, imageArray)
  
  // 🌸 SAKURA CLUB 仕様に従い、ProfileCompletionResult形式で返却
  return {
    completion: result17.percentage,
    completedFields: result17.completed,
    totalFields: result17.total,
    requiredCompleted: result17.completed, // 17項目固定では全て同じ扱い
    requiredTotal: result17.total,
    optionalCompleted: 0, // 必須/任意概念は廃止
    optionalTotal: 0,
    hasImages: hasProfileImages(enhancedProfile, imageArray),
    requiredFieldStatus: {} // 17項目固定では不要
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

  console.warn('🚨 DEPRECATED: calculateProfileCompletion は廃止予定です。新統一システム (calculateCompletion) を使用してください')
  
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
  console.log('🌟 calculateCompletionFromForm: 統一フロー開始', {
    userType,
    isNewUser,
    imageArray_length: imageArray.length
  })

  // 🌸 SAKURA CLUB 仕様: buildCompletionInputFromFormで画像状態を確実にセット
  const profileData: ProfileData = buildCompletionInputFromForm(formValues, imageArray)
  const result17 = calculateCompletion17Fields(profileData, imageArray)

  const result: ProfileCompletionResult = {
    completion: result17.percentage,
    completedFields: result17.completed,
    totalFields: result17.total,
    requiredCompleted: result17.completed,
    requiredTotal: result17.total,
    optionalCompleted: 0,
    optionalTotal: 0,
    hasImages: hasProfileImages(profileData, imageArray),
    requiredFieldStatus: {}
  }

  console.log('🌟 calculateCompletionFromForm: 統一フロー完了', {
    completion: result.completion,
    completedFields: result.completedFields,
    totalFields: result.totalFields,
    source: '17項目固定計算'
  })

  return result
}

/**
 * 正規化関数 - 旧システムとの互換性のため
 */
export function normalizeProfile(rawProfile: any, userType: UserType): NormalizedProfile {
  console.log('🧱 NORMALIZE PROFILE - INPUT:', {
    userType,
    rawProfileKeys: Object.keys(rawProfile || {})
  })

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
  console.log('🧱 BUILD PROFILE FOR COMPLETION - INPUT:', {
    dbProfile: !!dbProfile,
    selectedHobbies_length: selectedHobbies.length,
    selectedPersonality_length: selectedPersonality.length,
    languageSkills_length: languageSkills.length
  })

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
  // 🌸 TASK1: 画像の有無を必ずセット（state/ref を一次ソース）
  const imagesCount = Array.isArray(imageArray) ? imageArray.length : 0
  
  console.log('🌟 buildCompletionInputFromForm: フォーム値のみで入力オブジェクト作成', {
    nickname: formValues.nickname,
    hobbies_length: Array.isArray(formValues.hobbies) ? formValues.hobbies.length : 0,
    personality_length: Array.isArray(formValues.personality) ? formValues.personality.length : 0,
    language_skills_length: Array.isArray(formValues.language_skills) ? formValues.language_skills.length : 0,
    imagesCount: imagesCount,
    has_profile_image: imagesCount > 0
  })

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
    language_skills: Array.isArray(formValues.language_skills) ? formValues.language_skills : [],
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

    // ジオ情報
    prefecture: formValues.prefecture,
    city: formValues.city,
    
    // 🌸 TASK1: 画像状態を確実に含める
    has_profile_image: imagesCount > 0,
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
  console.log('🛡️ sanitizeForCompletion: 入力安全装置適用前', {
    hobbies: input.hobbies,
    personality: input.personality
  })

  const sanitized = {
    ...input,
    hobbies: Array.isArray(input.hobbies) ? input.hobbies : [],
    personality: Array.isArray(input.personality) ? input.personality : [],
    language_skills: Array.isArray(input.language_skills) ? input.language_skills : []
  }

  console.log('🛡️ sanitizeForCompletion: 安全装置適用後', {
    hobbies: sanitized.hobbies,
    personality: sanitized.personality
  })

  return sanitized
}