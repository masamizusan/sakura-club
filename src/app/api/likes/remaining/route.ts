import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/likes/remaining
 *
 * 今日の残りいいね回数を取得する
 * - 1日10回の制限
 * - 日付はAsia/Tokyo基準
 *
 * @returns { remaining: number, used: number, limit: number }
 */

const DAILY_LIMIT = 10

/**
 * Asia/Tokyo基準で今日の開始時刻（UTC）を取得
 */
function getTodayStartUTC(): Date {
  // 現在のUTC時刻
  const now = new Date()

  // Asia/Tokyo = UTC+9
  // 日本時間の00:00:00をUTCに変換
  const jstOffset = 9 * 60 * 60 * 1000 // 9時間 in ms

  // 日本時間での今日の日付を取得
  const jstNow = new Date(now.getTime() + jstOffset)
  const jstYear = jstNow.getUTCFullYear()
  const jstMonth = jstNow.getUTCMonth()
  const jstDate = jstNow.getUTCDate()

  // 日本時間の今日00:00:00をUTCに変換（= UTC 15:00 前日）
  const todayStartJST = new Date(Date.UTC(jstYear, jstMonth, jstDate, 0, 0, 0, 0))
  const todayStartUTC = new Date(todayStartJST.getTime() - jstOffset)

  return todayStartUTC
}

export async function GET(request: NextRequest) {
  try {
    // 認証
    const authHeader = request.headers.get('Authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    let supabase
    let authUser

    if (bearerToken) {
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${bearerToken}` } } }
      )
      const result = await supabase.auth.getUser(bearerToken)
      authUser = result.data?.user
      if (result.error || !authUser) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
      }
    } else {
      supabase = createServerClient(request)
      const result = await supabase.auth.getUser()
      authUser = result.data?.user
      if (result.error || !authUser) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
      }
    }

    const userId = authUser.id

    // 今日の開始時刻（UTC）を取得
    const todayStartUTC = getTodayStartUTC()

    // 今日のいいね数をカウント
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('liker_id', userId)
      .gte('created_at', todayStartUTC.toISOString())

    if (error) {
      console.error('[likes/remaining] count error:', error)
      return NextResponse.json({ error: 'いいね数の取得に失敗しました' }, { status: 500 })
    }

    const used = count || 0
    const remaining = Math.max(0, DAILY_LIMIT - used)

    return NextResponse.json({
      remaining,
      used,
      limit: DAILY_LIMIT
    })

  } catch (error) {
    console.error('[likes/remaining] unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
