import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// no-cacheヘッダー
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

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
 * - Cookie方式とBearer方式の両方をサポート
 */

export async function POST(request: NextRequest) {
  console.log('🚀 [ensure-profile] API started')

  try {
    // 🔒 Authorization Bearer からアクセストークンを取得
    const authHeader = request.headers.get('Authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    let supabase
    let authUser
    let authError

    if (bearerToken) {
      // Bearer方式: トークンから直接 Supabase client を生成（RLS有効）
      console.log('🔐 [ensure-profile] Using Bearer token')
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
      // Cookie方式: cookies() from next/headers（debug/sessionと同じ方式）
      console.log('🍪 [ensure-profile] Using cookies')
      const cookieStore = cookies()
      const allCookies = cookieStore.getAll()
      const hasSbCookies = allCookies.some(c => c.name.startsWith('sb-'))

      console.log('🍪 [ensure-profile] Cookies:', {
        count: allCookies.length,
        hasSbCookies
      })

      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              // Route Handlerでは設定不要
            },
          },
        }
      )
      const result = await supabase.auth.getUser()
      authUser = result.data?.user
      authError = result.error
    }

    console.log('🔐 [ensure-profile] Auth result:', {
      hasUser: !!authUser,
      userId: authUser?.id?.slice(0, 8),
      error: authError?.message
    })

    // 未認証チェック
    if (authError || !authUser) {
      console.warn('🚨 [ensure-profile] Auth failed')
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401, headers: noCacheHeaders }
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
        { status: 500, headers: noCacheHeaders }
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
          .maybeSingle()

        if (updateError) {
          console.warn('⚠️ API: email更新失敗（RLS拒否の可能性）:', updateError)
          // 更新失敗でも既存プロフィールを返す
          return NextResponse.json({
            success: true,
            profile: existingProfile,
            reason: 'Profile exists (email update blocked by RLS)'
          }, { headers: noCacheHeaders })
        }

        return NextResponse.json({
          success: true,
          profile: updatedProfile,
          reason: 'Profile exists and email updated'
        }, { headers: noCacheHeaders })
      }

      return NextResponse.json({
        success: true,
        profile: existingProfile,
        reason: 'Profile already exists'
      }, { headers: noCacheHeaders })
    }

    // 🔒 Legacy id fallback 完全撤廃（混線の温床）

    // 3. 新規プロフィール作成（ユーザーセッションクライアント経由 = RLS適用）
    console.log('🆕 ensureProfile API: Creating new profile with user session')

    const newProfileData = {
      id: userId,
      user_id: userId,
      email: userEmail || null,
      created_at: new Date().toISOString(),
      name: null,
      gender: null,
      birth_date: null,
      language_skills: []
    }

    // UPSERT: 既に行があれば更新、無ければ作成（onConflict: id）
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .upsert(newProfileData, { onConflict: 'id' })
      .select('*')
      .maybeSingle()

    if (insertError) {
      console.error('🚨 ensureProfile API: Insert failed (RLS may block)', insertError)
      return NextResponse.json(
        { error: `Insert failed: ${insertError.message}` },
        { status: 500, headers: noCacheHeaders }
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
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error('🚨 [ensure-profile] Unexpected error:', error)
    return NextResponse.json(
      { error: `Unexpected error: ${error}` },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
