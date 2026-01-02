/**
 * 🔗 profiles と auth.uid の確実な紐付けを保証するユーティリティ
 * 
 * 目的:
 * - profiles.user_id = auth.uid が必ず成立することを保証
 * - 406エラーと isNewUser 誤判定を根本的に解消
 * - DB存在ベースの安全な profile 管理
 */

import { SupabaseClient, User } from '@supabase/supabase-js'

export interface ProfileData {
  id: string
  user_id: string
  created_at: string
  email?: string
  name?: string
  gender?: string
  birth_date?: string
  // その他既存フィールドは必要に応じて追加
  [key: string]: any
}

/**
 * ユーザーの profiles レコードを確実に取得・作成する
 * 
 * @param supabase - Supabaseクライアント
 * @param user - 認証済みユーザー
 * @returns ProfileData | null
 */
export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User | null
): Promise<ProfileData | null> {
  if (!user?.id) {
    console.log('🚫 ensureProfileForUser: No user provided')
    return null
  }

  try {
    console.log('🔍 ensureProfileForUser: Checking profile for user', user.id)

    // 1. user_id ベースでprofiles検索（統一ルール）
    const { data: existingProfile, error: searchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle() // 0件でもエラーにしない

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('🚨 ensureProfileForUser: Search error', searchError)
      return null
    }

    // 2. プロフィールが既に存在する場合はそれを返す
    if (existingProfile) {
      console.log('✅ ensureProfileForUser: Profile found', {
        profileId: existingProfile.id,
        userId: existingProfile.user_id,
        hasName: !!existingProfile.name
      })
      return existingProfile
    }

    // 3. 既存データ救済: id = auth.uid の行があるかチェック
    console.log('🔍 ensureProfileForUser: Checking legacy profile by id')
    const { data: legacyProfile, error: legacyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (!legacyError && legacyProfile) {
      console.log('🔧 ensureProfileForUser: Found legacy profile, updating user_id')
      
      // legacy profile に user_id を設定
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ user_id: user.id })
        .eq('id', user.id)
        .select('*')
        .single()

      if (updateError) {
        console.error('🚨 ensureProfileForUser: Legacy update failed', updateError)
      } else {
        console.log('✅ ensureProfileForUser: Legacy profile updated')
        return updatedProfile
      }
    }

    // 4. 新規プロフィール作成
    console.log('🆕 ensureProfileForUser: Creating new profile')
    
    const newProfileData = {
      user_id: user.id,
      email: user.email,
      created_at: new Date().toISOString(),
      // 最小限の初期値（UIバリデーションと整合）
      name: null,
      gender: null,
      birth_date: null
    }

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(newProfileData)
      .select('*')
      .single()

    if (insertError) {
      console.error('🚨 ensureProfileForUser: Insert failed', insertError)
      return null
    }

    console.log('✅ ensureProfileForUser: New profile created', {
      profileId: newProfile.id,
      userId: newProfile.user_id
    })

    return newProfile

  } catch (error) {
    console.error('🚨 ensureProfileForUser: Unexpected error', error)
    return null
  }
}

/**
 * プロフィールの存在確認のみ（作成はしない）
 * isNewUser判定などで使用
 */
export async function checkProfileExists(
  supabase: SupabaseClient,
  user: User | null
): Promise<boolean> {
  if (!user?.id) return false

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('🚨 checkProfileExists: Error', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('🚨 checkProfileExists: Unexpected error', error)
    return false
  }
}