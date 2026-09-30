import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// 完全に動的（キャッシュ無効）
export const dynamic = 'force-dynamic'
export const revalidate = 0

// no-cacheヘッダー
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

/**
 * GET /api/likes/remaining
 *
 * 今日の残りいいね回数を取得する
 * - 上限・使用数は DB 関数 get_like_quota（日付は Asia/Tokyo 基準）
 */
export async function GET(request: NextRequest) {
  console.log('🚀 [likes/remaining] API started')

  try {
    // cookies() from next/headers を使用（debug/session と同じ方式）
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    const cookieNames = allCookies.map(c => c.name)
    const hasSbCookies = cookieNames.some(name => name.startsWith('sb-'))

    console.log('🍪 [likes/remaining] Cookies:', {
      count: allCookies.length,
      hasSbCookies,
      names: cookieNames.filter(n => n.startsWith('sb-'))
    })

    // Supabaseクライアント作成（debug/session と完全一致）
    const supabase = createServerClient(
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

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('🔐 [likes/remaining] Auth result:', {
      hasUser: !!user,
      userId: user?.id?.slice(0, 8),
      error: authError?.message
    })

    if (!user) {
      console.log('❌ [likes/remaining] Auth failed:', authError?.message || 'user is null')
      return NextResponse.json({
        error: 'Authentication required',
        reason: authError?.message || 'getUser returned null',
        debug: { hasSbCookies, cookieCount: allCookies.length }
      }, { status: 401, headers: noCacheHeaders })
    }

    console.log('✅ [likes/remaining] Authenticated user:', user.id)

    // 段階2-B: 上限・使用数・残り回数は DB 関数 get_like_quota に一本化（日付区切りは JST）
    const { data: quota, error } = await supabase.rpc('get_like_quota')

    if (error || !quota) {
      console.error('[likes/remaining] get_like_quota error:', error?.message)
      return NextResponse.json({
        error: 'Database error',
        debug: { message: error?.message ?? 'no data' }
      }, { status: 500, headers: noCacheHeaders })
    }

    const { limit, used, remaining } = quota as { limit: number; used: number; remaining: number }

    console.log('✅ [likes/remaining] Result:', { used, remaining, limit })

    return NextResponse.json({
      remaining,
      used,
      limit
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error('[likes/remaining] unexpected error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      debug: { message: error instanceof Error ? error.message : String(error) }
    }, { status: 500, headers: noCacheHeaders })
  }
}
