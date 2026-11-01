/**
 * 🌸 SAKURA CLUB プロフィール完成度の計算
 *
 * - 項目は下の COMPLETION_FIELDS（1 つの表）で決める。男女の違いは表の for だけで表す
 *   - 日本人女性（userType 'japanese-female'）：14 項目
 *   - 外国人男性（それ以外の userType）：17 項目
 *   - 項目数は表から数える（固定の数字は持たない）
 * - 完成度 = Math.round(入力済みの項目数 / 項目数 * 100)（四捨五入）
 * - 必須/任意の区別はしない（戻り値の required* は互換のため、全項目の数を入れる）
 * - 入口：calculateCompletion（DB の値などから）、calculateCompletionFromForm（編集画面のフォームの値から）
 * - 新旧の結果を比べる手順：scripts/compare-completion.mjs
 */

import { logger } from '@/utils/logger'

// 自己紹介の仮の文（未入力扱いにする）
const DEFAULT_SELF_INTRODUCTIONS = [
  "後でプロフィールを詳しく書きます。",
  "後ほど入力します",
  "後で入力します"
]

// 選択式の項目で「未入力」を表す値
const NO_ENTRY_VALUES = ['none', 'no-entry', 'noEntry', 'forms.noEntry']

// 🌸 完成度の計算に使うプロフィールデータ型
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

// ---------------------------------------------------------------------------
// 判定（共通）
// ---------------------------------------------------------------------------

// 文字が入っている（trim：空白だけを未入力扱いにする、empty：未入力扱いの値の一覧）
function hasText(value: any, options: { trim?: boolean; empty?: readonly string[] } = {}): boolean {
  if (!value) return false
  if (options.trim && value.trim() === '') return false
  return !(options.empty ?? []).includes(value)
}

// 0 より大きい
function isPositive(value: any): boolean {
  return !!value && value > 0
}

// 1 個以上
function hasItems(value: any): boolean {
  return Array.isArray(value) && value.length > 0
}

/**
 * 専用：言語（厳密版）
 * プレースホルダー行 {language:"none", level:"none"} では完成扱いしない
 */
function isValidLanguageSkill(s: any): boolean {
  return !!s &&
    typeof s.language === "string" &&
    typeof s.level === "string" &&
    s.language !== "none" &&
    s.level !== "none" &&
    s.language.trim() !== "" &&
    s.level.trim() !== ""
}

function hasLanguageInfo(profileData: any): boolean {
  const skills = profileData.language_skills || []
  return Array.isArray(skills) && skills.filter(isValidLanguageSkill).length > 0
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
 * 専用：写真
 * 1. has_profile_image かつ fromMyPage かつ avatar_url があれば あり
 * 2. imageArray（フォームの状態）に url / originalUrl / avatar_url が空でない画像があれば あり
 * 3. avatar_url か profile_image が空でない文字列なら あり（data URI・HTTP・Storage のパスすべて）
 */
function hasProfileImages(profile: ProfileData, imageArray?: any[]): boolean {
  if ((profile as any).has_profile_image === true && (profile as any).fromMyPage && profile.avatar_url) {
    return true
  }

  if (Array.isArray(imageArray) && imageArray.some(img => {
    if (!img) return false
    const url = img.url || img.originalUrl || img.avatar_url
    return url && typeof url === 'string' && url.trim().length > 0
  })) {
    return true
  }

  const hasAvatar = typeof profile?.avatar_url === "string" && profile.avatar_url.trim().length > 0
  const hasProfileImage = typeof profile?.profile_image === "string" && profile.profile_image.trim().length > 0
  return hasAvatar || hasProfileImage
}

// ---------------------------------------------------------------------------
// 項目の表
// ---------------------------------------------------------------------------

type Gender = 'female' | 'male'

type CompletionField = {
  key: string
  for: readonly Gender[]
  isFilled: (profile: ProfileData, imageArray?: any[]) => boolean
}

const BOTH: readonly Gender[] = ['female', 'male']
const FEMALE: readonly Gender[] = ['female']
const MALE: readonly Gender[] = ['male']

export const COMPLETION_FIELDS: readonly CompletionField[] = [
  { key: 'nickname', for: BOTH, isFilled: p => hasText(p.nickname, { trim: true }) },
  { key: 'gender', for: BOTH, isFilled: p => hasText(p.gender) },
  { key: 'age', for: BOTH, isFilled: p => isPositive(p.age) },
  { key: 'birth_date', for: BOTH, isFilled: p => hasText(p.birth_date) },
  { key: 'residence', for: FEMALE, isFilled: p => hasText(p.residence, { trim: true }) },
  { key: 'nationality', for: MALE, isFilled: p => hasText(p.nationality, { empty: ['国籍を選択', 'none'] }) },
  // 自己紹介：仮の文はそのままの文字列で比べる（前後の空白は除かない）
  { key: 'self_introduction', for: BOTH, isFilled: p => hasText(p.self_introduction, { trim: true, empty: DEFAULT_SELF_INTRODUCTIONS }) },
  { key: 'occupation', for: BOTH, isFilled: p => hasText(p.occupation, { empty: ['none'] }) },
  { key: 'height', for: BOTH, isFilled: p => isPositive(p.height) },
  { key: 'body_type', for: BOTH, isFilled: p => hasText(p.body_type, { empty: ['none'] }) },
  { key: 'marital_status', for: BOTH, isFilled: p => hasText(p.marital_status, { empty: ['none'] }) },
  { key: 'language_skills', for: BOTH, isFilled: p => hasLanguageInfo(p) },
  { key: 'personality', for: BOTH, isFilled: p => hasItems(p.personality) },
  // 日本文化のタグ（C7 で culture_wish に入れ替える予定）
  { key: 'hobbies', for: BOTH, isFilled: p => hasItems(p.hobbies) },
  { key: 'planned_prefectures', for: MALE, isFilled: p => hasItems(p.planned_prefectures) },
  { key: 'visit_schedule', for: MALE, isFilled: p => hasText(p.visit_schedule, { empty: NO_ENTRY_VALUES }) },
  // 同行者だけ undecided（未定）も未入力扱い
  { key: 'travel_companion', for: MALE, isFilled: p => hasText(p.travel_companion, { empty: [...NO_ENTRY_VALUES, 'undecided'] }) },
  { key: 'profile_images', for: BOTH, isFilled: (p, images) => hasProfileImages(p, images) },
]

function genderOf(userType: string): Gender {
  return userType === 'japanese-female' ? 'female' : 'male'
}

function buildResult(profile: ProfileData, userType: string, imageArray?: any[]): ProfileCompletionResult {
  const gender = genderOf(userType)
  const fields = COMPLETION_FIELDS.filter(field => field.for.includes(gender))
  const completed = fields.filter(field => field.isFilled(profile, imageArray)).length
  const total = fields.length

  return {
    completion: Math.round((completed / total) * 100),
    completedFields: completed,
    totalFields: total,
    requiredCompleted: completed,
    requiredTotal: total,
    optionalCompleted: 0,
    optionalTotal: 0,
    hasImages: hasProfileImages(profile, imageArray),
    requiredFieldStatus: {}
  }
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

/**
 * 🌸 メインの完成度計算（DB の値などから）
 * isNewUser・persistedProfile は互換のために受け取るだけで使わない
 */
export function calculateCompletion(
  profile: NormalizedProfile,
  userType: UserType,
  imageArray?: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>,
  isNewUser: boolean = false,
  persistedProfile?: any
): ProfileCompletionResult {
  const enhancedProfile: ProfileData = {
    ...profile,
    profile_images: imageArray
  }
  return buildResult(enhancedProfile, userType, imageArray)
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
 * isNewUser は互換のために受け取るだけで使わない
 */
export function calculateCompletionFromForm(
  formValues: any,
  userType: 'foreign-male' | 'japanese-female',
  imageArray: any[] = [],
  isNewUser: boolean = false
): ProfileCompletionResult {
  const profileData: ProfileData = buildCompletionInputFromForm(formValues, imageArray)
  return buildResult(profileData, userType, imageArray)
}

// ---------------------------------------------------------------------------
// 互換のための関数（編集画面・マイページが読み込んでいるため残す）
// ---------------------------------------------------------------------------

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
 * フォーム値から完成度計算用オブジェクト作成
 * 🌸 画像状態を必ず含める（フォーム値だけに依存しない）
 */
export function buildCompletionInputFromForm(formValues: any, imageArray?: any[]) {
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
    // 有効な言語だけ（none/none は除く）
    language_skills: Array.isArray(formValues.language_skills)
      ? formValues.language_skills.filter(isValidLanguageSkill)
      : [],
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

    // 居住地（フォームの prefecture を residence として使う）
    prefecture: formValues.prefecture,
    residence: formValues.prefecture || formValues.residence || "",

    // 画像状態（state/ref から）
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
