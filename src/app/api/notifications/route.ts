import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// 通知取得のクエリスキーマ
const getNotificationsSchema = z.object({
  limit: z.number().optional().default(20),
  offset: z.number().optional().default(0),
  unread_only: z.boolean().optional().default(false),
})

// 通知作成のスキーマ
const createNotificationSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum(['match', 'message', 'experience_invitation', 'experience_reminder', 'review_request', 'system']),
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  data: z.record(z.any()).optional().default({}),
})

// GET: 通知一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
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

    // ベースクエリ
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

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
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

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

// POST: 新しい通知作成（システム内部用）
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // 認証ユーザーの取得（管理者権限チェックは省略）
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // リクエストボディの解析
    const body = await request.json()
    
    // バリデーション
    const validationResult = createNotificationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'バリデーションエラー',
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { user_id, type, title, message, data } = validationResult.data

    // 通知の作成
    const { data: newNotification, error: createError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        message,
        data,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error('Notification creation error:', createError)
      return NextResponse.json(
        { error: '通知の作成に失敗しました' },
        { status: 500 }
      )
    }

    // フロントエンド用の形式で返す
    const formattedNotification = {
      id: newNotification.id,
      type: newNotification.type,
      title: newNotification.title,
      message: newNotification.message,
      data: newNotification.data || {},
      isRead: newNotification.is_read,
      createdAt: newNotification.created_at,
      updatedAt: newNotification.updated_at,
    }

    return NextResponse.json({
      message: '通知が正常に作成されました',
      notification: formattedNotification
    }, { status: 201 })

  } catch (error) {
    console.error('Notification POST error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PUT: 通知の既読状態を更新
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    
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
        is_read: mark_as_read,
        updated_at: new Date().toISOString()
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