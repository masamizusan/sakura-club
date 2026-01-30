import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

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
 * - authUser.idのみを使用（JWTから取得）
 * - Authorization Bearerで認証（Cookie同期不要）
 * - ユーザーセッションクライアントでRLSが効く
 */

export async function POST(request: NextRequest) {
  try {
    // 🔒 Authorization Bearer からアクセストークンを取得
    const authHeader = request.headers.get('Authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    let supabase
    let authUser
    let authError

    if (bearerToken) {
      // Bearer方式: トークンから直接 Supabase client を生成（RLS有効）
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${bearerToken}` }
          }
        }
      )
      const result = await supabase.auth.getUser(bearerToken)
      authUser = result.data?.user
      authError = result.error
    } else {
      // フォールバック: Cookie方式（通常のブラウザセッション）
      supabase = createServerClient(request)
      const result = await supabase.auth.getUser()
      authUser = result.data?.user
      authError = result.error
    }

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
          .eq('user_id', userId)
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

    // 🔒 Legacy id fallback 完全撤廃（混線の温床）

    // 3. 新規プロフィール作成（ユーザーセッションクライアント経由 = RLS適用）
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
      .maybeSingle()

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
