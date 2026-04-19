import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET /api/admin/flags           → フラグ一覧取得
// GET /api/admin/flags?count_only=true → 件数のみ
// PATCH /api/admin/flags         → フラグアクション（確認済み・停止）
export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const countOnly = req.nextUrl.searchParams.get('count_only') === 'true'

    if (countOnly) {
      const { count, error } = await supabaseAdmin
        .from('message_flags')
        .select('id', { count: 'exact', head: true })
        .eq('reviewed', false)
      if (error) {
        console.error('[admin/flags] count error:', error)
        return NextResponse.json({ count: 0 })
      }
      return NextResponse.json({ count: count || 0 })
    }

    const { data, error } = await supabaseAdmin
      .from('message_flags')
      .select(`*, messages(content, sender_id, profiles(name, gender, nationality))`)
      .eq('reviewed', false)
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })

    console.log('[admin/flags] GET:', { count: data?.length, error: error?.message })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ flags: data || [], count: data?.length || 0 })
  } catch (e) {
    console.error('[admin/flags] GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { flagId, action, senderId } = await req.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // フラグを確認済み + ステータス更新
    const { error } = await supabaseAdmin
      .from('message_flags')
      .update({ reviewed: true, status: action })
      .eq('id', flagId)

    if (error) {
      console.error('[admin/flags] PATCH flags error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const now = new Date().toISOString()

    // 警告：通知を送信
    if (action === 'warned' && senderId) {
      const { data: notifData, error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: senderId,
          type: 'system',
          title: '⚠️ メッセージへの警告',
          message: 'あなたのメッセージが規約違反として警告を受けました。今後同様の行為が続く場合、アカウントが停止される場合があります。',
          data: { action: 'warned' },
          is_read: false,
          created_at: now,
          updated_at: now,
        })
        .select()
      console.log('[admin/flags] 警告通知送信結果:', { notifData, notifError: notifError?.message, notifDetails: notifError?.details, notifCode: notifError?.code })
    }

    // アカウント停止：is_active=false + 通知
    if (action === 'suspended' && senderId) {
      const { error: suspendError } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', senderId)
      console.log('[admin/flags] アカウント停止:', { senderId, suspendError: suspendError?.message })

      const { data: notifData, error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: senderId,
          type: 'system',
          title: '🚫 アカウント停止',
          message: '規約違反のため、アカウントが停止されました。',
          data: { action: 'suspended' },
          is_read: false,
          created_at: now,
          updated_at: now,
        })
        .select()
      console.log('[admin/flags] 停止通知送信結果:', { notifData, notifError: notifError?.message, notifDetails: notifError?.details, notifCode: notifError?.code })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/flags] PATCH error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
