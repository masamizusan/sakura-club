/**
 * 🔗 profiles と auth.uid の確実な紐付けを保証するユーティリティ
 * 
 * 目的:
 * - profiles.user_id = auth.uid が必ず成立することを保証
 * - 406エラーと isNewUser 誤判定を根本的に解消
 * - DB存在ベースの安全な profile 管理
 */

import { SupabaseClient, User } from '@supabase/supabase-js'
import { logger } from '@/utils/logger'

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
    logger.warn('[ENSURE_PROFILE] no user')
    return {
      success: false,
      profile: null,
      reason: 'No user provided',
      canContinue: false
    }
  }

  try {
    logger.debug('[ENSURE_PROFILE] check:', user.id?.slice(0, 8))

    // 1. user_id ベースでprofiles検索（統一ルール）
    const { data: existingProfile, error: searchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle() // 0件でもエラーにしない

    if (searchError && searchError.code !== 'PGRST116') {
      logger.error('[ENSURE_PROFILE] search error:', searchError.message)
      return {
        success: false,
        profile: null,
        reason: `Search error: ${searchError.message}`,
        canContinue: true
      }
    }

    // 2. プロフィールが既に存在する場合
    if (existingProfile) {
      // 既存プロフィールのemailがnullの場合は更新
      if (!existingProfile.email) {
        let signupEmail: string | null = null
        if (typeof window !== 'undefined') {
          signupEmail = sessionStorage.getItem('sc_signup_email')
          if (signupEmail) {
            sessionStorage.removeItem('sc_signup_email')
          }
        }
        const finalEmail = signupEmail || user.email || `test-${user.id.substring(0, 8)}@test.sakura-club.local`

        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({ email: finalEmail })
          .eq('user_id', user.id)
          .select('*')
          .maybeSingle()

        if (updateError) {
          return {
            success: true,
            profile: existingProfile,
            reason: 'Profile found (email update failed)',
            canContinue: true
          }
        }

        return {
          success: true,
          profile: updatedProfile,
          reason: 'Profile found and email updated',
          canContinue: true
        }
      }

      return {
        success: true,
        profile: existingProfile,
        reason: 'Profile found',
        canContinue: true
      }
    }

    // 3. 新規プロフィール作成（常にAPI経由 - RLS安全）
    logger.debug('[ENSURE_PROFILE] creating new via API')

    // ブラウザ環境では常にAPI経由（RLS問題を回避）
    if (typeof window !== 'undefined') {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        const accessToken = currentSession?.access_token

        const apiResponse = await fetch('/api/ensure-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          },
          credentials: 'include', // cookie認証を含める
          body: JSON.stringify({})
        })

        if (apiResponse.ok) {
          const apiResult = await apiResponse.json()
          if (apiResult.success && apiResult.profile) {
            logger.debug('[ENSURE_PROFILE] API success:', apiResult.profile.id?.slice(0, 8))
            return {
              success: true,
              profile: apiResult.profile,
              reason: 'API経由で作成成功',
              canContinue: true
            }
          }
        } else {
          const errorData = await apiResponse.json().catch(() => ({}))
          logger.error('[ENSURE_PROFILE] API failed:', errorData.error)
          return {
            success: false,
            profile: null,
            reason: `API failed: ${errorData.error || apiResponse.status}`,
            canContinue: true // 失敗しても画面は表示可能
          }
        }
      } catch (apiError) {
        logger.error('[ENSURE_PROFILE] API error:', apiError)
        return {
          success: false,
          profile: null,
          reason: `API error: ${apiError}`,
          canContinue: true
        }
      }
    }

    // サーバーサイドの場合のみ直接操作（API Route内など）
    let signupEmail: string | null = null
    const profileEmail = signupEmail || user.email || `test-${user.id.substring(0, 8)}@test.sakura-club.local`

    const newProfileData = {
      id: user.id,
      user_id: user.id,
      email: profileEmail,
      created_at: new Date().toISOString(),
      name: null,
      gender: null,
      birth_date: null,
      avatar_url: null,
      language_skills: []
    }

    const { upsertProfile } = await import('@/utils/saveProfileToDb')
    const saveResult = await upsertProfile(
      supabase,
      user.id,
      newProfileData,
      'ensureProfileForUser/serverSide',
      ['id']
    )

    if (!saveResult.success) {
      logger.error('[ENSURE_PROFILE] server insert failed:', saveResult.error)
      return {
        success: false,
        profile: null,
        reason: `Server insert failed: ${saveResult.error}`,
        canContinue: true
      }
    }

    const newProfile = saveResult.data?.[0]
    logger.debug('[ENSURE_PROFILE] server created:', newProfile?.id?.slice(0, 8))

    return {
      success: true,
      profile: newProfile,
      reason: 'Server-side profile created',
      canContinue: true
    }

  } catch (error) {
    logger.error('[ENSURE_PROFILE] unexpected error')
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
      logger.error('[CHECK_PROFILE] error')
      return false
    }

    return !!data
  } catch (error) {
    logger.error('[CHECK_PROFILE] unexpected error')
    return false
  }
}