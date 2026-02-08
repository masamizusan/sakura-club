import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// 完全に動的（キャッシュ無効）
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/debug/session
 *
 * セッションがAPIに届いているかを確認するデバッグAPI
 * - sb- で始まるcookieの存在確認
 * - supabase.auth.getUser() の結果確認
 */
export async function GET(request: NextRequest) {
  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }

  try {
    // 方法1: request.cookies から取得
    const requestCookies = request.cookies.getAll()
    const requestCookieNames = requestCookies.map(c => c.name)
    const hasSbCookiesFromRequest = requestCookieNames.some(name => name.startsWith('sb-'))

    // 方法2: next/headers の cookies() から取得
    const cookieStore = cookies()
    const headerCookies = cookieStore.getAll()
    const headerCookieNames = headerCookies.map(c => c.name)
    const hasSbCookiesFromHeaders = headerCookieNames.some(name => name.startsWith('sb-'))

    // Supabase クライアント作成（request.cookies版）
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Route Handlerでは設定不要
          },
        },
      }
    )

    // 認証ユーザー取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      cookies: {
        fromRequest: {
          names: requestCookieNames,
          hasSbCookies: hasSbCookiesFromRequest,
          count: requestCookies.length
        },
        fromHeaders: {
          names: headerCookieNames,
          hasSbCookies: hasSbCookiesFromHeaders,
          count: headerCookies.length
        }
      },
      auth: {
        hasUser: !!user,
        userId: user?.id || null,
        email: user?.email || null,
        error: authError?.message || null
      },
      env: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    }, { headers: noCacheHeaders })

  } catch (error) {
    return NextResponse.json({
      error: 'Debug API error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers: noCacheHeaders })
  }
}
