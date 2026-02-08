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

const DAILY_LIMIT = 10

/**
 * Asia/Tokyo基準で今日の開始時刻（UTC）を取得
 */
function getTodayStartUTC(): Date {
  const now = new Date()
  const jstOffset = 9 * 60 * 60 * 1000
  const jstNow = new Date(now.getTime() + jstOffset)
  const jstYear = jstNow.getUTCFullYear()
  const jstMonth = jstNow.getUTCMonth()
  const jstDate = jstNow.getUTCDate()
  const todayStartJST = new Date(Date.UTC(jstYear, jstMonth, jstDate, 0, 0, 0, 0))
  const todayStartUTC = new Date(todayStartJST.getTime() - jstOffset)
  return todayStartUTC
}

/**
 * GET /api/likes/remaining
 *
 * 今日の残りいいね回数を取得する
 * - 1日10回の制限
 * - 日付はAsia/Tokyo基準
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

    const userId = user.id
    const todayStartUTC = getTodayStartUTC()

    // 今日のいいね数をカウント
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('liker_id', userId)
      .gte('created_at', todayStartUTC.toISOString())

    if (error) {
      console.error('[likes/remaining] count error:', error)
      return NextResponse.json({
        error: 'Database error',
        debug: { message: error.message }
      }, { status: 500, headers: noCacheHeaders })
    }

    const used = count || 0
    const remaining = Math.max(0, DAILY_LIMIT - used)

    console.log('✅ [likes/remaining] Result:', { used, remaining, limit: DAILY_LIMIT })

    return NextResponse.json({
      remaining,
      used,
      limit: DAILY_LIMIT
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error('[likes/remaining] unexpected error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      debug: { message: error instanceof Error ? error.message : String(error) }
    }, { status: 500, headers: noCacheHeaders })
  }
}
