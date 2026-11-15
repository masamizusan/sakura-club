import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'

// 通知取得のクエリスキーマ
const getNotificationsSchema = z.object({
  limit: z.number().optional().default(20),
  offset: z.number().optional().default(0),
  unread_only: z.boolean().optional().default(false),
})

// S1: ブロック相手（自分がブロックした・自分をブロックした）の id の一覧。読めなければ空（今までどおり全部出す）
async function getBlockedUserIds(userId: string): Promise<string[]> {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabaseAdmin
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
  if (error) {
    console.error('[notifications] blocks fetch failed:', error.message)
    return []
  }
  const ids = new Set<string>()
  for (const b of data ?? []) ids.add(b.blocker_id === userId ? b.blocked_id : b.blocker_id)
  return Array.from(ids)
}

// S1: 相手のある通知（match の data.matched_user_id・さくらいいねの data.from_user_id）のうち、ブロック相手のものを
// 問い合わせの中で除く（取ったあとで除くと 20 件ずつの区切りがずれるため）。
// 相手の id が無い通知（運営からの通知など）は残す：「id が空、または一覧に無い」の形にする（not.in だけだと空の行も消える）
// get_badge_counts（stage21）と同じ基準
function excludeBlockedNotifications<T extends { or: (filters: string) => T }>(query: T, blockedIds: string[]): T {
  if (blockedIds.length === 0) return query
  const list = `(${blockedIds.join(',')})`
  // 2 つの条件を 1 つの or=(and(or(…),or(…))) にまとめる（PostgREST の入れ子の論理式）
  return query.or(
    `and(or(data->>matched_user_id.is.null,data->>matched_user_id.not.in.${list}),` +
    `or(data->>from_user_id.is.null,data->>from_user_id.not.in.${list}))`
  )
}

// GET: 通知一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(request)
    const { searchParams } = new URL(request.url)
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // クエリパラメータの取得とバリデーション
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    // S1: ブロック相手（両方向）の id。自分をブロックした人の行は RLS で読めないため service_role で読む（likes/received と同じ）
    const blockedIds = await getBlockedUserIds(user.id)

    // ベースクエリ
    let query = excludeBlockedNotifications(
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id),
      blockedIds
    ).order('created_at', { ascending: false })

    // 未読のみフィルター
    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1)

    const { data: notifications, error } = await query

    if (error) {
      console.error('Notifications fetch error:', error)
      return NextResponse.json(
        { error: '通知の取得に失敗しました' },
        { status: 500 }
      )
    }

    // 未読通知数も取得
    const { count: unreadCount } = await excludeBlockedNotifications(
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false),
      blockedIds
    )

    // フロントエンド用のデータ形式に変換
    const formattedNotifications = notifications?.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      isRead: notification.is_read,
      createdAt: notification.created_at,
      updatedAt: notification.updated_at,
    })) || []

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount: unreadCount || 0,
      total: formattedNotifications.length,
      hasMore: formattedNotifications.length === limit
    })

  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PUT: 通知の既読状態を更新
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(request)
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notification_ids, mark_as_read } = body

    if (!Array.isArray(notification_ids) || typeof mark_as_read !== 'boolean') {
      return NextResponse.json(
        { error: '無効なリクエストです' },
        { status: 400 }
      )
    }

    // 通知の既読状態を更新
    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        is_read: mark_as_read
      })
      .eq('user_id', user.id)
      .in('id', notification_ids)

    if (updateError) {
      console.error('Notification update error:', updateError)
      return NextResponse.json(
        { error: '通知の更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '通知が正常に更新されました'
    })

  } catch (error) {
    console.error('Notification PUT error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}