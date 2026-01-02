/**
 * 🔗 profiles と auth.uid の確実な紐付けを保証するユーティリティ
 * 
 * 目的:
 * - profiles.user_id = auth.uid が必ず成立することを保証
 * - 406エラーと isNewUser 誤判定を根本的に解消
 * - DB存在ベースの安全な profile 管理
 */

import { SupabaseClient, User } from '@supabase/supabase-js'

// AuthUserとUserの互換性のために型を拡張
type AuthUserCompatible = User | {
  id: string
  email?: string
  [key: string]: any
}

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

// 新規：ensureProfileForUser の結果型（遷移継続のため）
export interface EnsureProfileResult {
  success: boolean
  profile: ProfileData | null
  reason?: string
  canContinue: boolean // 画面表示可能かどうか
}

// テストモード判定ヘルパー
const isTestMode = (): boolean => {
  if (typeof window === 'undefined') return false
  const urlParams = new URLSearchParams(window.location.search)
  
  // マイページからの遷移の場合はテストモードではない
  if (urlParams.get('fromMyPage') === 'true') {
    return false
  }
  
  return !!(urlParams.get('type') || urlParams.get('gender') || urlParams.get('nickname') || 
           urlParams.get('birth_date') || urlParams.get('age') || urlParams.get('nationality'))
}

/**
 * 🆕 安全なプロフィール取得・作成（遷移継続保証版）
 * 
 * @param supabase - Supabaseクライアント
 * @param user - 認証済みユーザー
 * @returns EnsureProfileResult（失敗でも遷移可能）
 */
export async function ensureProfileForUserSafe(
  supabase: SupabaseClient,
  user: AuthUserCompatible | null
): Promise<EnsureProfileResult> {
  if (!user?.id) {
    console.log('🚫 ensureProfileForUser: No user provided')
    return {
      success: false,
      profile: null,
      reason: 'No user provided',
      canContinue: false
    }
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
      return {
        success: false,
        profile: null,
        reason: `Search error: ${searchError.message}`,
        canContinue: true // 検索失敗でも画面は表示可能
      }
    }

    // 2. プロフィールが既に存在する場合はそれを返す
    if (existingProfile) {
      console.log('✅ ensureProfileForUser: Profile found', {
        profileId: existingProfile.id,
        userId: existingProfile.user_id,
        hasName: !!existingProfile.name
      })
      return {
        success: true,
        profile: existingProfile,
        reason: 'Profile found',
        canContinue: true
      }
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
        return {
          success: false,
          profile: null,
          reason: `Legacy update failed: ${updateError.message}`,
          canContinue: true // 更新失敗でも画面は表示可能
        }
      } else {
        console.log('✅ ensureProfileForUser: Legacy profile updated')
        return {
          success: true,
          profile: updatedProfile,
          reason: 'Legacy profile updated',
          canContinue: true
        }
      }
    }

    // 4. 新規プロフィール作成
    console.log('🆕 ensureProfileForUser: Creating new profile')
    
    // 4-1. テストモードの場合は先にAPI経由で試行（RLS回避）
    const testMode = isTestMode()
    if (testMode) {
      console.log('🧪 テストモード検出 - API経由でプロフィール作成を試行')
      try {
        const apiResponse = await fetch('/api/ensure-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            isTestMode: true
          })
        })

        if (apiResponse.ok) {
          const apiResult = await apiResponse.json()
          if (apiResult.success && apiResult.profile) {
            console.log('✅ テストモード: API経由でプロフィール作成成功')
            return {
              success: true,
              profile: apiResult.profile,
              reason: 'テストモード - API経由で作成成功',
              canContinue: true
            }
          }
        }
        
        console.warn('⚠️ テストモード: API失敗、通常方法にフォールバック')
      } catch (apiError) {
        console.warn('⚠️ テストモード: API呼び出し失敗、通常方法にフォールバック:', apiError)
      }
    }

    // 4-2. 通常のクライアント側作成
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
      // 🔧 方針1: 403/406は想定内として扱い、遷移を止めない
      const is403 = insertError.code === '42501' || insertError.message?.includes('permission denied') || insertError.message?.includes('insufficient_privilege')
      const is406 = insertError.code === 'PGRST116' || insertError.message?.includes('No rows')
      
      console.error('🚨 ensureProfileForUser: Insert failed (継続可能)', {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        is403_RLS_suspected: is403,
        is406_no_rows: is406,
        testMode,
        next_action: is403 ? 'Check RLS policies or use service_role API' : 'Check data constraints'
      })
      
      return {
        success: false,
        profile: null,
        reason: is403 ? '403 RLS疑い - DBプロフィール作成失敗（RLSポリシーまたはAPI必要）' : 
                is406 ? '406 No rows - プロフィール作成失敗' : 
                `Insert failed: ${insertError.message}`,
        canContinue: true // 🔥 重要: DB失敗でも画面表示は継続
      }
    }

    console.log('✅ ensureProfileForUser: New profile created', {
      profileId: newProfile.id,
      userId: newProfile.user_id
    })

    return {
      success: true,
      profile: newProfile,
      reason: 'New profile created',
      canContinue: true
    }

  } catch (error) {
    console.error('🚨 ensureProfileForUser: Unexpected error (継続可能)', error)
    return {
      success: false,
      profile: null,
      reason: `Unexpected error: ${error}`,
      canContinue: true // 予期しないエラーでも画面は表示
    }
  }
}

/**
 * 🔄 既存のプロフィール取得関数（後方互換性維持）
 * 
 * @param supabase - Supabaseクライアント
 * @param user - 認証済みユーザー
 * @returns ProfileData | null
 */
export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: AuthUserCompatible | null
): Promise<ProfileData | null> {
  // 新しい安全な関数のラッパー（後方互換性のため）
  const result = await ensureProfileForUserSafe(supabase, user)
  
  // 従来通り、成功時にprofileを返し、失敗時にnullを返す
  return result.success ? result.profile : null
}

/**
 * プロフィールの存在確認のみ（作成はしない）
 * isNewUser判定などで使用
 */
export async function checkProfileExists(
  supabase: SupabaseClient,
  user: AuthUserCompatible | null
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