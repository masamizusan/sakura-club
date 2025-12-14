/**
 * 統一されたプロフィール完成度計算関数
 * マイページとプロフィール編集画面で同じロジックを使用
 */

// ✨ 統一された言語スキル型を使用
import { LanguageSkill, hasValidLanguageSkills } from '@/types/profile'

// 🚨 CRITICAL: self_introduction仮文言定義（未入力扱いにする）
const DEFAULT_SELF_INTRODUCTIONS = [
  "後でプロフィールを詳しく書きます。",
  "後ほど入力します",
  "後で入力します"
]

// 🔧 言語スキル抽出関数（フォールバック付き）- 一元化されたロジック
function extractLanguageSkills(data: any): LanguageSkill[] {
  console.log('🔍 extractLanguageSkills: 入力データ', {
    language_skills: data.language_skills,
    japanese_level: data.japanese_level,
    english_level: data.english_level
  })

  // 1) まず新しい language_skills を優先
  if (Array.isArray(data.language_skills) && data.language_skills.length > 0) {
    const validSkills = data.language_skills.filter((skill: any) => 
      skill && skill.language && skill.level && 
      skill.language !== 'none' && skill.level !== 'none'
    )
    if (validSkills.length > 0) {
      console.log('🔍 extractLanguageSkills: using existing language_skills', validSkills)
      return validSkills
    }
  }

  // 2) レガシーフィールドからのフォールバック構築
  const skills: LanguageSkill[] = []

  if (data.japanese_level && data.japanese_level !== 'none') {
    skills.push({ language: 'ja', level: data.japanese_level })
    console.log('🔍 extractLanguageSkills: added japanese_level fallback', data.japanese_level)
  }

  if (data.english_level && data.english_level !== 'none') {
    skills.push({ language: 'en', level: data.english_level })
    console.log('🔍 extractLanguageSkills: added english_level fallback', data.english_level)
  }

  console.log('🔍 extractLanguageSkills: final constructed skills', skills)
  return skills
}

/**
 * 🚨 CRITICAL: 言語情報完成度判定（厳密版）
 * プレースホルダー行 {language:"none", level:"none"} では完成扱いしない
 */
function hasLanguageInfo(profileData: any): boolean {
  const skills = extractLanguageSkills(profileData)
  
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
  
  const hasValidSkill = validSkills.length > 0
  
  console.log('🔍 hasLanguageInfo: 厳密判定', {
    originalSkills: skills,
    validSkills: validSkills,
    hasValidSkill,
    originalLanguageSkills: profileData.language_skills,
    japanese_level: profileData.japanese_level,
    english_level: profileData.english_level
  })
  
  return hasValidSkill
}

// 専用カラム優先、city JSONフォールバック + 未入力値除外のヘルパー関数
function getFieldFromDedicatedColumnOrCity(profileData: any, fieldName: string): any {
  // 専用カラムの値を優先（未入力扱いの値を除外）
  if (profileData[fieldName] !== null && 
      profileData[fieldName] !== undefined && 
      profileData[fieldName] !== '' &&
      profileData[fieldName] !== 'none') {
    return profileData[fieldName]
  }

  // フォールバック: city JSONから取得（未入力扱いの値を除外）
  try {
    const cityData = typeof profileData.city === 'string' ? JSON.parse(profileData.city) : profileData.city
    if (cityData && cityData[fieldName] && cityData[fieldName] !== 'none') {
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

// 🚨 CRITICAL: Supabase を personality の唯一の真実とする統一化
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

// 🧱 Field configuration per user type
const FIELD_CONFIG = {
  'foreign-male': {
    required: [
      'nickname', 'gender', 'age', 'birth_date', 'nationality',
      'hobbies', 'self_introduction', 'language_info', 'planned_prefectures'
    ],
    optional: [
      'occupation', 'height', 'body_type', 'marital_status', 
      'personality', 'visit_schedule', 'travel_companion', 'profile_images'
    ]
  },
  'japanese-female': {
    required: [], // TODO: 後日実装
    optional: []  // TODO: 後日実装
  }
} as const

/**
 * 🚨 CRITICAL: 統一された正規化関数（全画面で必ずこれを使用）
 * すべての画面で同じ正規化ロジックを使い、ズレを完全に排除
 */
export function normalizeProfile(rawProfile: any, userType: UserType): NormalizedProfile {
  console.log('🧱 NORMALIZE PROFILE - INPUT:', {
    userType,
    raw_personality: rawProfile?.personality,
    raw_hobbies: rawProfile?.hobbies,
    raw_language_skills: rawProfile?.language_skills,
    raw_planned_prefectures: rawProfile?.planned_prefectures
  })

  // 🚨 personality の統一正規化
  let normalizedPersonality: string[] = []
  if (rawProfile?.personality === null || rawProfile?.personality === undefined) {
    normalizedPersonality = []
  } else if (typeof rawProfile?.personality === 'string') {
    normalizedPersonality = [rawProfile.personality]
  } else if (Array.isArray(rawProfile?.personality)) {
    normalizedPersonality = rawProfile.personality
  } else {
    normalizedPersonality = []
  }

  // 🚨 language_skills の統一正規化
  let normalizedLanguageSkills: any[] = []
  if (Array.isArray(rawProfile?.language_skills)) {
    // 既存のlanguage_skills配列をフィルタリング
    normalizedLanguageSkills = rawProfile.language_skills.filter((skill: any) => 
      skill && 
      skill.language && skill.level && 
      skill.language !== '' && skill.level !== '' &&
      skill.language !== 'none' && skill.level !== 'none'
    )
  } else if (rawProfile?.japanese_level || rawProfile?.english_level) {
    // レガシーフィールドから構築
    if (rawProfile?.japanese_level && rawProfile.japanese_level !== 'none') {
      normalizedLanguageSkills.push({ language: 'ja', level: rawProfile.japanese_level })
    }
    if (rawProfile?.english_level && rawProfile.english_level !== 'none') {
      normalizedLanguageSkills.push({ language: 'en', level: rawProfile.english_level })
    }
  }

  // 🚨 hobbies の統一正規化
  const normalizedHobbies = Array.isArray(rawProfile?.hobbies) 
    ? rawProfile.hobbies 
    : (Array.isArray(rawProfile?.interests) ? rawProfile.interests : [])

  // 🚨 planned_prefectures の統一正規化
  const normalizedPlannedPrefectures = Array.isArray(rawProfile?.planned_prefectures) 
    ? rawProfile.planned_prefectures 
    : []

  // 🚨 visit_schedule / travel_companion の統一正規化（未入力扱いの明確化）
  const normalizedVisitSchedule = rawProfile?.visit_schedule && 
    rawProfile.visit_schedule !== '' && 
    rawProfile.visit_schedule !== 'no-entry' && 
    rawProfile.visit_schedule !== 'noEntry'
    ? rawProfile.visit_schedule 
    : null
  const normalizedTravelCompanion = rawProfile?.travel_companion && 
    rawProfile.travel_companion !== '' && 
    rawProfile.travel_companion !== 'noEntry' && 
    rawProfile.travel_companion !== 'no-entry'
    ? rawProfile.travel_companion 
    : null

  const normalized: NormalizedProfile = {
    // 必須フィールド
    nickname: rawProfile?.name || rawProfile?.nickname,
    gender: rawProfile?.gender,
    age: rawProfile?.age,
    birth_date: rawProfile?.birth_date || rawProfile?.date_of_birth,
    nationality: rawProfile?.nationality,
    prefecture: userType === 'foreign-male' ? undefined : (rawProfile?.residence || rawProfile?.prefecture),
    hobbies: normalizedHobbies,
    self_introduction: (() => {
      const rawSelfIntro = rawProfile?.bio || rawProfile?.self_introduction || ''
      const isDefaultText = DEFAULT_SELF_INTRODUCTIONS.includes(rawSelfIntro)
      const finalValue = isDefaultText ? '' : rawSelfIntro
      
      // 🔍 仮文言除外ログ
      console.log('🔍 SELF_INTRODUCTION NORMALIZATION:', {
        rawBio: rawProfile?.bio,
        rawSelfIntro: rawProfile?.self_introduction,
        combinedRaw: rawSelfIntro,
        isDefaultText: isDefaultText,
        finalNormalizedValue: finalValue,
        willBeEmpty: finalValue === ''
      })
      
      return finalValue
    })(),

    // オプションフィールド（専用カラム優先）
    occupation: getFieldFromDedicatedColumnOrCity(rawProfile, 'occupation'),
    height: getFieldFromDedicatedColumnOrCity(rawProfile, 'height'),
    body_type: getFieldFromDedicatedColumnOrCity(rawProfile, 'body_type'),
    marital_status: getFieldFromDedicatedColumnOrCity(rawProfile, 'marital_status'),
    
    // 🚨 CRITICAL: 統一正規化の結果を使用
    personality: normalizedPersonality,
    language_skills: normalizedLanguageSkills,
    planned_prefectures: normalizedPlannedPrefectures,
    visit_schedule: normalizedVisitSchedule,
    travel_companion: normalizedTravelCompanion,
    
    city: getCityFromNewFormat(rawProfile?.city),

    // 画像
    avatar_url: rawProfile?.avatar_url,
    avatarUrl: rawProfile?.avatarUrl,
    profile_image: rawProfile?.profile_image
  }

  console.log('🧱 NORMALIZE PROFILE - OUTPUT:', {
    userType,
    normalized_personality: normalized.personality,
    normalized_personality_length: normalized.personality?.length || 0,
    normalized_hobbies_length: normalized.hobbies?.length || 0,
    normalized_language_skills_length: normalized.language_skills?.length || 0,
    normalized_planned_prefectures_length: normalized.planned_prefectures?.length || 0,
    prefecture_value: normalized.prefecture,
    prefecture_forced_undefined: userType === 'foreign-male' ? 'YES' : 'NO',
    source: 'Unified normalization logic'
  })

  return normalized
}

/**
 * 🚨 CRITICAL: Edit画面用 - DBプロフィールとstate値を適切にマージ
 * stateが空の場合はDBの値を優先、stateが入力済みの場合はstateを優先
 */
export function buildProfileForCompletion(
  dbProfile: any,
  selectedHobbies: string[],
  selectedPersonality: string[], 
  languageSkills: any[]
): any {
  console.log('🔧 BUILD PROFILE FOR COMPLETION - INPUT:', {
    dbProfile_hobbies: dbProfile?.hobbies,
    dbProfile_culture_tags: dbProfile?.culture_tags,
    dbProfile_personality: dbProfile?.personality,
    dbProfile_language_skills: dbProfile?.language_skills,
    selectedHobbies_state: selectedHobbies,
    selectedPersonality_state: selectedPersonality,
    languageSkills_state: languageSkills,
    languageSkills_state_length: languageSkills.length,
    languageSkills_has_dummy: languageSkills.some(s => s.language === 'none' && s.level === 'none')
  })

  // 🚨 CRITICAL: state優先のマージルール（言語スキルは厳密チェック）
  // 🔧 FIX: culture_tags → hobbies マッピング（DBではculture_tagsに保存されている）
  const dbHobbies = dbProfile?.hobbies || dbProfile?.culture_tags || []
  const mergedHobbies = selectedHobbies.length > 0 ? selectedHobbies : dbHobbies
  const mergedPersonality = selectedPersonality.length > 0 ? selectedPersonality : (dbProfile?.personality ?? [])
  
  // 🎯 言語スキルの厳密な有効性チェック（none/noneダミー行を除外）
  const hasValidLanguageSkillsInState = languageSkills.length > 0 && languageSkills.some(s => 
    s && 
    typeof s.language === "string" && 
    typeof s.level === "string" &&
    s.language !== "none" && 
    s.level !== "none" && 
    s.language.trim() !== "" && 
    s.level.trim() !== ""
  )
  
  const mergedLanguageSkills = hasValidLanguageSkillsInState ? languageSkills : (dbProfile?.language_skills ?? [])

  const builtProfile = {
    ...dbProfile,
    hobbies: mergedHobbies,
    personality: mergedPersonality,
    language_skills: mergedLanguageSkills
  }
  
  // 🚨 CRITICAL: foreign-maleでprefectureが混入していないことを確認
  console.log('🔧 BUILD PROFILE - PREFECTURE CHECK:', {
    originalProfilePrefecture: dbProfile?.prefecture,
    builtProfilePrefecture: builtProfile.prefecture,
    prefectureFromState: builtProfile.residence || builtProfile.prefecture,
    willCausePrefectureContamination: !!(builtProfile.prefecture || builtProfile.residence)
  })

  console.log('🔧 BUILD PROFILE FOR COMPLETION - OUTPUT:', {
    merged_hobbies: mergedHobbies,
    merged_hobbies_length: mergedHobbies.length,
    merged_personality: mergedPersonality,  
    merged_personality_length: mergedPersonality.length,
    merged_language_skills: mergedLanguageSkills,
    merged_language_skills_length: mergedLanguageSkills.length,
    hasValidLanguageSkillsInState: hasValidLanguageSkillsInState,
    hobbies_source: selectedHobbies.length > 0 ? 'selectedHobbies state' : 'dbProfile fallback',
    personality_source: selectedPersonality.length > 0 ? 'selectedPersonality state' : 'dbProfile fallback',
    language_skills_source: hasValidLanguageSkillsInState ? 'languageSkills state (VALID)' : 'dbProfile fallback (state has dummy/none only)'
  })

  return builtProfile
}

/**
 * 🧮 CRITICAL: 完全統合された completion 計算関数（1つの関数で完結）
 * すべての画面でこの1つの関数を呼び出し、別計算は一切行わない
 */
export function calculateCompletion(
  profile: NormalizedProfile,
  userType: UserType,
  imageArray?: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>,
  isNewUser: boolean = false,
  persistedProfile?: any
): ProfileCompletionResult {
  
  if (userType !== 'foreign-male') {
    console.warn(`⚠️ UserType ${userType} is not implemented yet. Returning dummy result.`)
    // 🛡️ エラーを投げずに、ダミー結果を返してクラッシュを防ぐ
    return {
      completion: 0,
      completedFields: 0,
      totalFields: 10,
      requiredCompleted: 0,
      requiredTotal: 5,
      optionalCompleted: 0,
      optionalTotal: 5,
      requiredFieldStatus: {},
      hasImages: false
    }
  }

  // 🔍 必須項目の完全ログ出力（prefecture混入チェック）
  const requiredFields = FIELD_CONFIG[userType].required
  const optionalFields = FIELD_CONFIG[userType].optional
  
  console.log('🔍 REQUIRED FIELDS DEFINITION (foreign-male):', {
    requiredFields: requiredFields,
    requiredCount: requiredFields.length,
    hasPlannedPrefecturesInRequired: requiredFields.includes('planned_prefectures'),
    shouldBe9Fields: requiredFields.length === 9
  })

  console.log('🧮 CALCULATE COMPLETION - INPUT:', {
    userType,
    personality: profile.personality,
    hobbies: profile.hobbies,
    language_skills: profile.language_skills,
    planned_prefectures: profile.planned_prefectures,
    prefecture: profile.prefecture,
    nickname: profile.nickname,
    gender: profile.gender,
    age: profile.age,
    birth_date: profile.birth_date,
    nationality: profile.nationality,
    self_introduction: profile.self_introduction
  })

  // ① 必須項目チェック（全詳細ログ付き）
  const requiredFieldStatus: Record<string, boolean> = {}
  const completedRequired = requiredFields.filter(field => {
    let isCompleted = false
    let fieldValue = null
    switch (field) {
      case 'nickname':
        fieldValue = profile.nickname
        isCompleted = !!(profile.nickname && profile.nickname !== '')
        break
      case 'gender':
        fieldValue = profile.gender
        isCompleted = !!(profile.gender && profile.gender !== '')
        break
      case 'age':
        fieldValue = profile.age
        isCompleted = !!(profile.age && profile.age > 0)
        break
      case 'birth_date':
        fieldValue = profile.birth_date
        isCompleted = !!(profile.birth_date && profile.birth_date !== '')
        break
      case 'nationality':
        fieldValue = profile.nationality
        isCompleted = !!(profile.nationality && profile.nationality !== '' && profile.nationality !== '国籍を選択' && profile.nationality !== 'none')
        break
      case 'hobbies':
        fieldValue = profile.hobbies
        const persistedHobbies = persistedProfile?.hobbies || persistedProfile?.interests
        // 🚨 CRITICAL: 確定値優先判定（編集中draft空でもDB値があれば完了扱い）
        isCompleted = (
          (Array.isArray(profile.hobbies) && profile.hobbies.length > 0) ||
          (Array.isArray(persistedHobbies) && persistedHobbies.length > 0)
        )
        
        // 🔍 hobbies確定値優先判定ログ
        console.log('🔍 HOBBIES PERSISTED VALUE CHECK:', {
          draftValue: profile.hobbies,
          persistedValue: persistedHobbies,
          draftHasItems: Array.isArray(profile.hobbies) && profile.hobbies.length > 0,
          persistedHasItems: Array.isArray(persistedHobbies) && persistedHobbies.length > 0,
          finalIsCompleted: isCompleted
        })
        break
      case 'self_introduction':
        fieldValue = profile.self_introduction
        const isDefaultSelfIntro = DEFAULT_SELF_INTRODUCTIONS.includes(fieldValue || '')
        // 🚨 CRITICAL: 仮文言は未入力扱い
        isCompleted = !!(
          profile.self_introduction && 
          profile.self_introduction.trim() !== '' &&
          !isDefaultSelfIntro
        )
        
        // 🔍 self_introduction完成度判定ログ
        console.log('🔍 SELF_INTRODUCTION COMPLETION CHECK:', {
          value: fieldValue,
          isEmpty: !fieldValue || fieldValue.trim() === '',
          isDefaultText: isDefaultSelfIntro,
          isCompleted: isCompleted,
          defaultTexts: DEFAULT_SELF_INTRODUCTIONS
        })
        break
      case 'language_info':
        fieldValue = profile.language_skills
        const persistedLanguageSkills = persistedProfile?.language_skills
        
        // 🚨 CRITICAL: 寛容判定で既存必須項目を保護
        const draftHasValidLanguage = hasLanguageInfo(profile)
        const persistedHasValidLanguage = persistedLanguageSkills ? hasLanguageInfo({language_skills: persistedLanguageSkills}) : false
        
        // 🎯 特別ロジック: 言語選択中（level未選択）でも他必須項目を減算しない
        const hasLanguageSelected = Array.isArray(profile.language_skills) && 
          profile.language_skills.length > 0 &&
          profile.language_skills.some((s: any) => s && s.language && s.language !== 'none' && s.language.trim() !== '')
          
        const hasPersistedLanguageSelected = Array.isArray(persistedLanguageSkills) &&
          persistedLanguageSkills.length > 0 &&
          persistedLanguageSkills.some((s: any) => s && s.language && s.language !== 'none' && s.language.trim() !== '')
        
        // 🎯 厳密判定: 完全な言語+レベルのみ真の完了
        isCompleted = draftHasValidLanguage || persistedHasValidLanguage
        
        // 🔍 language_info保護的判定ログ
        console.log('🔍 LANGUAGE_INFO PROTECTIVE CHECK:', {
          draftValue: profile.language_skills,
          persistedValue: persistedLanguageSkills,
          draftHasValidLanguage: draftHasValidLanguage,
          persistedHasValidLanguage: persistedHasValidLanguage,
          hasLanguageSelected: hasLanguageSelected,
          hasPersistedLanguageSelected: hasPersistedLanguageSelected,
          finalIsCompleted: isCompleted,
          protectionActive: !draftHasValidLanguage && !persistedHasValidLanguage && (hasLanguageSelected || hasPersistedLanguageSelected)
        })
        break
      case 'planned_prefectures':
        fieldValue = profile.planned_prefectures
        const persistedPlannedPrefectures = persistedProfile?.planned_prefectures
        // 🚨 CRITICAL: 確定値優先判定（編集中draft空でもDB値があれば完了扱い）
        isCompleted = (
          (Array.isArray(profile.planned_prefectures) && profile.planned_prefectures.length > 0) ||
          (Array.isArray(persistedPlannedPrefectures) && persistedPlannedPrefectures.length > 0)
        )
        
        // 🔍 planned_prefectures確定値優先判定ログ
        console.log('🔍 PLANNED_PREFECTURES PERSISTED VALUE CHECK:', {
          draftValue: profile.planned_prefectures,
          persistedValue: persistedPlannedPrefectures,
          draftHasItems: Array.isArray(profile.planned_prefectures) && profile.planned_prefectures.length > 0,
          persistedHasItems: Array.isArray(persistedPlannedPrefectures) && persistedPlannedPrefectures.length > 0,
          finalIsCompleted: isCompleted
        })
        break
      default:
        isCompleted = false
    }
    
    // 🔍 全項目の判定詳細ログ
    console.log(`🔍 REQUIRED FIELD CHECK [${field}]:`, {
      value: fieldValue,
      isCompleted: isCompleted,
      type: typeof fieldValue,
      isArray: Array.isArray(fieldValue),
      length: Array.isArray(fieldValue) ? fieldValue.length : 'N/A'
    })
    
    requiredFieldStatus[field] = isCompleted
    return isCompleted
  })
  
  // 🎯 CRITICAL: 言語入力時の完成度低下防止ロジック
  let stabilizedCompletedCount = completedRequired.length
  
  // 言語選択中（level未完了）で他必須項目が影響を受ける場合の保護
  const languageInfoCompleted = requiredFieldStatus['language_info']
  const hasLanguageSelected = Array.isArray(profile.language_skills) && 
    profile.language_skills.length > 0 &&
    profile.language_skills.some((s: any) => s && s.language && s.language !== 'none' && s.language.trim() !== '')
  const hasPersistedLanguageSelected = Array.isArray(persistedProfile?.language_skills) &&
    persistedProfile.language_skills.length > 0 &&
    persistedProfile.language_skills.some((s: any) => s && s.language && s.language !== 'none' && s.language.trim() !== '')
    
  const languageInProgress = !languageInfoCompleted && (hasLanguageSelected || hasPersistedLanguageSelected)
  
  if (languageInProgress) {
    // 🛡️ 言語選択中は必須項目数を保護（他項目の達成状態は維持）
    const nonLanguageCompleted = completedRequired.filter(field => field !== 'language_info')
    stabilizedCompletedCount = nonLanguageCompleted.length
    
    console.log('🛡️ LANGUAGE INPUT PROTECTION ACTIVE:', {
      originalCompletedCount: completedRequired.length,
      protectedCompletedCount: stabilizedCompletedCount,
      languageInProgress: languageInProgress,
      hasLanguageSelected: hasLanguageSelected,
      hasPersistedLanguageSelected: hasPersistedLanguageSelected
    })
  }

  // 🔍 6/9になる問題の核心特定ログ
  const trueKeys = Object.entries(requiredFieldStatus)
    .filter(([_, isCompleted]) => isCompleted === true)
    .map(([field]) => field)
  
  console.log('🚨 REQUIRED COMPLETION SUMMARY:', {
    completedRequired: completedRequired,
    originalCompletedCount: completedRequired.length,
    stabilizedCompletedCount: stabilizedCompletedCount,
    totalRequired: requiredFields.length,
    percentage: Math.round((stabilizedCompletedCount / requiredFields.length) * 50),
    languageInProgress: languageInProgress,
    protectionActive: languageInProgress && stabilizedCompletedCount !== completedRequired.length
  })
  
  // 🔍 6項目目特定：必須項目の詳細状況
  console.log('✅ REQUIRED TRUE KEYS (完了済み必須項目):', trueKeys)
  console.table(requiredFieldStatus)
  console.log('[REQUIRED FIELD STATUS JSON]:', JSON.stringify(requiredFieldStatus, null, 2))

  // ② 任意項目チェック
  const completedOptional = optionalFields.filter(field => {
    switch (field) {
      case 'occupation':
        return !!(profile.occupation && profile.occupation !== '' && profile.occupation !== 'none')
      case 'height':
        return !!(profile.height && profile.height > 0)
      case 'body_type':
        return !!(profile.body_type && profile.body_type !== '' && profile.body_type !== 'none')
      case 'marital_status':
        return !!(profile.marital_status && profile.marital_status !== '' && profile.marital_status !== 'none')
      case 'personality':
        return Array.isArray(profile.personality) && profile.personality.length > 0
      case 'visit_schedule':
        return !!(profile.visit_schedule && profile.visit_schedule !== '' && profile.visit_schedule !== 'no-entry' && profile.visit_schedule !== 'noEntry')
      case 'travel_companion':
        return !!(profile.travel_companion && profile.travel_companion !== '' && profile.travel_companion !== 'no-entry' && profile.travel_companion !== 'noEntry')
      case 'profile_images':
        return checkImagePresence(profile, imageArray, isNewUser)
      default:
        return false
    }
  })

  // ③ 最終スコア計算（必須項目部分完了対応 + 言語入力時保護）
  const requiredScore = Math.round((stabilizedCompletedCount / requiredFields.length) * 50)
  const optionalScore = Math.round((completedOptional.length / optionalFields.length) * 50)
  const completion = Math.round(requiredScore + optionalScore)

  // 画像は任意項目 profile_images に統合されたため、別途加算不要
  const totalFields = requiredFields.length + optionalFields.length
  const completedFields = stabilizedCompletedCount + completedOptional.length

  // 画像存在チェック（compat用、任意項目内に統合済み）
  const hasImages = checkImagePresence(profile, imageArray, isNewUser)

  // ⑤ デバッグ用の詳細ログ出力（統一フォーマット）
  console.log('🚨 NEW UNIFIED SYSTEM ProfileCompletion Debug - foreign-male')
  console.log('='.repeat(60))
  console.log(`必須: ${stabilizedCompletedCount}/${requiredFields.length} = ${requiredScore}% (raw: ${completedRequired.length})`)
  console.log(`任意: ${completedOptional.length}/${optionalFields.length} = ${optionalScore}%`)
  console.log(`completion: ${completion}%`)
  
  // 🧪 必須フィールド個別ステータス（問題特定用）
  console.log('🧪 REQUIRED FIELD STATUS (foreign-male)', requiredFieldStatus)
  
  console.log(`personality: ${JSON.stringify(profile.personality)}`)
  console.log(`hobbies: ${JSON.stringify(profile.hobbies)}`)
  console.log(`language_skills: ${JSON.stringify(profile.language_skills)}`)
  console.log(`planned_prefectures: ${JSON.stringify(profile.planned_prefectures)}`)
  console.log('='.repeat(60))

  const result: ProfileCompletionResult = {
    completion,
    completedFields,
    totalFields,
    requiredCompleted: stabilizedCompletedCount,
    requiredTotal: requiredFields.length,
    optionalCompleted: completedOptional.length,
    optionalTotal: optionalFields.length,
    hasImages
  }

  console.log('🧮 CALCULATE COMPLETION - RESULT:', {
    userType,
    completion_percentage: result.completion,
    required_completed: `${result.requiredCompleted}/${result.requiredTotal}`,
    optional_completed: `${result.optionalCompleted}/${result.optionalTotal}`,
    has_images: result.hasImages
  })

  return result
}

/**
 * 🚨 DEPRECATED: 旧ロジック - 新統一システムへのリダイレクト
 * この関数は廃止予定。新ロジック (buildProfileForCompletion → normalizeProfile → calculateCompletion) を使用してください
 */
export function calculateProfileCompletion(
  profileData: any,
  imageArray?: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>,
  isForeignMale: boolean = false,
  isNewUser: boolean = false
): ProfileCompletionResult {

  console.warn('🚨 DEPRECATED: calculateProfileCompletion は廃止予定です。新統一システム (calculateCompletion) を使用してください')
  
  // 新統一システムにリダイレクト
  const builtProfile = buildProfileForCompletion(profileData, [], [], [])
  const normalized = normalizeProfile(builtProfile, isForeignMale ? 'foreign-male' : 'japanese-female')
  return calculateCompletion(normalized, isForeignMale ? 'foreign-male' : 'japanese-female', imageArray, isNewUser)

  /*
  // 🚨 以下のコードは廃止 - 新統一システムに移行済み
  // 🚨 CRITICAL FIX: japanese_level/english_level を完全に除外
  // これらのlegacyフィールドが重複カウントを引き起こすため削除
  const { japanese_level, english_level, ...cleanProfileData } = profileData || {}
  
  console.log('🚨 LEGACY FIELDS REMOVED:', {
    removed_japanese_level: japanese_level,
    removed_english_level: english_level,
    remaining_language_skills: cleanProfileData.language_skills
  })

  // 必須・オプションフィールドの定義
  let requiredFields = []
  let optionalFields = []

  if (isForeignMale) {
    // 🏆 外国人男性の必須フィールド（8個）- 合計17フィールドのうち8個が必須
    // UI上必ず表示され、100%達成には全て入力が必要
    requiredFields = [
      'nickname',         // ニックネーム
      'gender',           // 性別
      'age',              // 年齢  
      'birth_date',       // 生年月日
      'nationality',      // 国籍
      'hobbies',          // 日本文化（配列、最低1個選択）
      'self_introduction', // 自己紹介
      'language_info'     // 言語情報（統一スロット、language_skillsベース）
    ]

    // 🎯 外国人男性のオプションフィールド（8個）- 合計17フィールドのうち8個がオプション  
    // UI上表示され、入力すると完成度向上、空でも100%達成可能
    optionalFields = [
      'occupation',         // 職業
      'height',            // 身長
      'body_type',         // 体型
      'marital_status',    // 婚姻状況
      'personality',       // 性格（配列、selectedPersonalityベース）
      'visit_schedule',    // 訪問予定時期
      'travel_companion',  // 同行者
      'planned_prefectures' // 訪問予定都道府県（配列、selectedPlannedPrefecturesベース）
    ]
  } else {
    // 🚨 japanese-female は未実装 - foreign-male専用関数
    throw new Error('calculateProfileCompletion: japanese-female は未実装です。新しい統一システム(calculateCompletion)をご利用ください。')
  }

  // 必須フィールドの完成チェック

  const completedRequired = requiredFields.filter(field => {
    let value

    // フィールド名のマッピング（マイページとプロフィール編集の差異を吸収）
    switch (field) {
      case 'nickname':
        value = cleanProfileData.name || cleanProfileData.nickname
        break
      case 'birth_date':
        value = cleanProfileData.birth_date || cleanProfileData.date_of_birth
        break
      case 'prefecture':
        value = cleanProfileData.residence || cleanProfileData.prefecture
        break
      case 'hobbies':
        value = cleanProfileData.hobbies || cleanProfileData.interests
        break
      case 'self_introduction':
        value = cleanProfileData.bio || cleanProfileData.self_introduction
        break
      case 'planned_prefectures':
        value = cleanProfileData.planned_prefectures
        break
      case 'language_info':
        // ✨ 統一された言語情報スロット（cleanProfileDataを使用）
        return hasLanguageInfo(cleanProfileData)
      default:
        value = cleanProfileData[field]
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

  // オプションフィールドの完成チェック（詳細ログ付き）
  const optionalFieldStatus: Array<{ key: string, value: any, completed: boolean, reason: string }> = []
  
  const completedOptional = optionalFields.filter(field => {
    let value = cleanProfileData[field]
    let completed = false
    let reason = ''

    // フィールド別の特別な処理
    switch (field) {
      case 'personality':
        value = cleanProfileData.personality || []
        // nullまたはundefinedの場合は空配列に変換
        if (!Array.isArray(value)) {
          value = []
        }
        completed = Array.isArray(value) && value.length > 0
        reason = completed ? 'array has items' : `array empty or invalid: ${JSON.stringify(value)}`
        break
      case 'visit_schedule':
        // 外国人男性の訪問予定時期
        value = cleanProfileData.visit_schedule
        completed = value && value !== '' && value !== 'none' && value !== 'no-entry' && value !== 'noEntry'
        reason = completed ? 'valid schedule value' : `invalid schedule: ${value}`
        break
      case 'travel_companion':
        // 外国人男性の同行者
        value = cleanProfileData.travel_companion
        completed = value && value !== '' && value !== 'none' && value !== 'no-entry' && value !== 'noEntry'
        reason = completed ? 'valid companion value' : `invalid companion: ${value}`
        break
      case 'planned_prefectures':
        // 外国人男性の行く予定の都道府県
        value = cleanProfileData.planned_prefectures || []
        completed = Array.isArray(value) && value.length > 0
        reason = completed ? 'prefectures selected' : `no prefectures: ${JSON.stringify(value)}`
        break
      case 'occupation':
      case 'height':
      case 'body_type':
      case 'marital_status':
        // 専用カラム優先、city JSONフォールバック（cleanProfileDataを使用）
        value = getFieldFromDedicatedColumnOrCity(cleanProfileData, field)
        completed = value && value !== '' && value !== 'none'
        reason = completed ? `valid ${field} value` : `invalid ${field}: ${value}`
        break
      case 'city':
        // cityフィールドは新形式（{"city": "武蔵野市"}）から取得
        value = getCityFromNewFormat(cleanProfileData.city)
        completed = !!value
        reason = completed ? 'city specified' : `no city: ${value}`
        break
      case 'language_info':
        // ✨ 日本人女性のオプション言語情報スロット（cleanProfileDataを使用）
        completed = hasLanguageInfo(cleanProfileData)
        value = cleanProfileData.language_skills
        reason = completed ? 'valid language info' : 'no valid language info'
        // 早期リターンのため、ここでstatusを追加してreturn
        optionalFieldStatus.push({ key: field, value, completed, reason })
        return completed
      default:
        value = cleanProfileData[field]
        completed = value !== null && value !== undefined && value !== '' && value !== 'none'
        reason = completed ? 'default validation passed' : `default validation failed: ${value}`
    }
    
    // optionalFieldStatusに追加
    optionalFieldStatus.push({ key: field, value, completed, reason })

    // completedフラグを使用（上記のswitch文で設定済み）
    return completed
  })

  // 画像の有無チェック（cleanProfileDataを使用）
  const hasImages = checkImagePresence(cleanProfileData, imageArray, isNewUser)

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

  // ✨ 言語情報の詳細デバッグ情報を追加（cleanProfileDataを使用）
  const languageInfoResult = hasLanguageInfo(cleanProfileData)
  const skills = cleanProfileData.language_skills
  
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

  // 🚨 CRITICAL 100% → 94% 問題の詳細分析
  if (isForeignMale) {
    console.log('🚨🚨🚨 CRITICAL ProfileCompletion Debug - FOREIGN MALE 🚨🚨🚨')
    console.log('='.repeat(80))
    console.log('📊 完成度サマリ:')
    console.log(`   対象ユーザータイプ: foreign-male`)
    console.log(`   completion: ${completion}%`)
    console.log(`   totalFields: ${totalFields}`)
    console.log(`   completedFields: ${completedFields}`)
    console.log(`   requiredCompleted: ${completedRequired.length}/${requiredFields.length}`)
    console.log(`   optionalCompleted: ${completedOptional.length}/${optionalFields.length}`)
    console.log(`   画像: ${hasImages ? 'あり' : 'なし'}`)
    
    console.log('📋 オプションフィールドごとのステータス一覧:')
    optionalFieldStatus.forEach(({ key, value, completed, reason }) => {
      console.log(`   ${key}: ${completed ? '✅' : '❌'} | ${reason}`)
    })
    
    console.log('🔍 必須フィールド一覧:')
    requiredFields.forEach((field, index) => {
      const isCompleted = completedRequired.includes(field)
      console.log(`   ${index + 1}. ${field}: ${isCompleted ? '✅完了' : '❌未完了'}`)
    })
    
    console.log('🗣️ 言語情報詳細:')
    console.log(`   hasLanguageInfo結果: ${languageInfoResult}`)
    console.log(`   language_skills:`, skills)
    console.log(`   各スキル検証結果:`, skillsValidationDetails)
    console.log('='.repeat(80))
  }

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
  */
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