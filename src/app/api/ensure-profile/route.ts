import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * 🛡️ プロフィール確保API（RLS準拠版）
 *
 * 目的:
 * - ユーザーのプロフィール存在を確認・作成
 * - 新規登録→プロフィール編集の遷移を保証
 *
 * 🔒 SECURITY:
 * - userIdをリクエストから受け取らない（偽装不可能）
 * - authUser.idのみを使用
 * - ユーザーセッションクライアントでRLSが効く
 */

export async function POST(request: NextRequest) {
  try {
    // 🔒 ユーザーセッションクライアント（RLS有効）
    const supabase = createServerClient(request)
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    // 未認証チェック
    if (authError || !authUser) {
      console.warn('🚨 ensureProfile API: 認証失敗', {
        authError: authError?.message,
        hasAuthUser: !!authUser
      })
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 🔒 CRITICAL: userIdはauthUser.idのみを使用（リクエストからは受け取らない）
    const userId = authUser.id
    const userEmail = authUser.email

    console.log('✅ ensureProfile API: 認証OK', {
      userId: userId?.slice(0, 8),
      email: userEmail
    })

    // 1. 既存プロフィールの確認（user_idベース）
    const { data: existingProfile, error: searchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('🚨 ensureProfile API: Search error', searchError)
      return NextResponse.json(
        { error: `Search failed: ${searchError.message}` },
        { status: 500 }
      )
    }

    // 2. 既存プロフィールがある場合
    if (existingProfile) {
      console.log('✅ ensureProfile API: Profile already exists', {
        profileId: existingProfile.id?.slice(0, 8),
        hasEmail: !!existingProfile.email
      })

      // emailがnullの場合は更新
      if (!existingProfile.email && userEmail) {
        console.log('📧 API: 既存プロフィールのemail更新')

        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({ email: userEmail })
          .eq('id', existingProfile.id)
          .select('*')
          .single()

        if (updateError) {
          console.warn('⚠️ API: email更新失敗（RLS拒否の可能性）:', updateError)
          // 更新失敗でも既存プロフィールを返す
          return NextResponse.json({
            success: true,
            profile: existingProfile,
            reason: 'Profile exists (email update blocked by RLS)'
          })
        }

        return NextResponse.json({
          success: true,
          profile: updatedProfile,
          reason: 'Profile exists and email updated'
        })
      }

      return NextResponse.json({
        success: true,
        profile: existingProfile,
        reason: 'Profile already exists'
      })
    }

    // 3. Legacy profile（id = auth.uid）の確認・移行
    const { data: legacyProfile, error: legacyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (!legacyError && legacyProfile) {
      console.log('🔧 ensureProfile API: Migrating legacy profile')

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ user_id: userId })
        .eq('id', userId)
        .select('*')
        .single()

      if (updateError) {
        console.error('🚨 ensureProfile API: Legacy migration failed (RLS)', updateError)
        return NextResponse.json(
          { error: `Legacy migration failed: ${updateError.message}` },
          { status: 500 }
        )
      }

      console.log('✅ ensureProfile API: Legacy profile migrated')
      return NextResponse.json({
        success: true,
        profile: updatedProfile,
        reason: 'Legacy profile migrated'
      })
    }

    // 4. 新規プロフィール作成（ユーザーセッションクライアント経由 = RLS適用）
    console.log('🆕 ensureProfile API: Creating new profile with user session')

    const newProfileData = {
      user_id: userId,
      email: userEmail || null,
      created_at: new Date().toISOString(),
      name: null,
      gender: null,
      birth_date: null,
      language_skills: []
    }

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(newProfileData)
      .select('*')
      .single()

    if (insertError) {
      console.error('🚨 ensureProfile API: Insert failed (RLS may block)', insertError)
      return NextResponse.json(
        { error: `Insert failed: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ ensureProfile API: New profile created', {
      profileId: newProfile.id?.slice(0, 8),
      userId: newProfile.user_id?.slice(0, 8)
    })

    return NextResponse.json({
      success: true,
      profile: newProfile,
      reason: 'New profile created'
    })

  } catch (error) {
    console.error('🚨 ensureProfile API: Unexpected error', error)
    return NextResponse.json(
      { error: `Unexpected error: ${error}` },
      { status: 500 }
    )
  }
}
