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
      .select('*')
      .eq('reviewed', false)
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!data || data.length === 0) {
      return NextResponse.json({ flags: [], count: 0 })
    }

    // message_id から messages + sender profile を2ステップで取得（FKなしでも動作）
    const messageIds = data.map((f: { message_id: string }) => f.message_id).filter(Boolean)
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, content, sender_id')
      .in('id', messageIds)

    const senderIds = (messages || []).map((m: { sender_id: string }) => m.sender_id).filter(Boolean)
    const { data: profiles } = senderIds.length > 0
      ? await supabaseAdmin.from('profiles').select('id, name, gender, nationality').in('id', senderIds)
      : { data: [] }

    const messageMap: Record<string, { content: string; sender_id: string }> = {}
    for (const m of messages || []) {
      messageMap[m.id] = { content: m.content, sender_id: m.sender_id }
    }
    const profileMap: Record<string, { name: string; gender: string; nationality: string }> = {}
    for (const p of profiles || []) {
      profileMap[p.id] = { name: p.name ?? '', gender: p.gender ?? '', nationality: p.nationality ?? '' }
    }

    const enriched = data.map((f: { message_id: string }) => {
      const msg = messageMap[f.message_id] ?? null
      const profile = msg ? profileMap[msg.sender_id] ?? null : null
      return {
        ...f,
        messages: msg ? { content: msg.content, sender_id: msg.sender_id, profiles: profile } : null,
      }
    })

    return NextResponse.json({ flags: enriched, count: enriched.length })
  } catch (e) {
    console.error('[admin/flags] GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { flagId, action } = await req.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ① flagId → message_id → sender_id をサーバーサイドで解決
    const { data: flagRow, error: flagFetchError } = await supabaseAdmin
      .from('message_flags')
      .select('message_id')
      .eq('id', flagId)
      .maybeSingle()

    if (flagFetchError) {
      console.error('[admin/flags] flagRow fetch error:', flagFetchError.message)
    }

    let senderId: string | null = null
    if (flagRow?.message_id) {
      const { data: msgRow } = await supabaseAdmin
        .from('messages')
        .select('sender_id')
        .eq('id', flagRow.message_id)
        .maybeSingle()
      senderId = msgRow?.sender_id ?? null
    }

    // ② フラグを確認済み + ステータス更新
    const { error: updateError } = await supabaseAdmin
      .from('message_flags')
      .update({ reviewed: true, status: action })
      .eq('id', flagId)

    if (updateError) {
      console.error('[admin/flags] PATCH flags error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // ③ 警告通知を送信
    if (action === 'warned' && senderId) {
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: senderId,
          type: 'warning',
          title: '⚠️ 警告',
          message: 'あなたのメッセージが規約違反として警告を受けました。今後同様の行為が続く場合、アカウントが停止される場合があります。',
          is_read: false,
        })
      if (notifError) console.error('[admin/flags] 警告通知エラー:', notifError.message)
    }

    // ④ アカウント停止：is_active=false + 停止通知
    if (action === 'suspended' && senderId) {
      const { error: suspendError } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', senderId)
      if (suspendError) console.error('[admin/flags] 停止エラー:', suspendError.message)

      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: senderId,
          type: 'suspended',
          title: '🚫 アカウント停止',
          message: '規約違反のため、アカウントが停止されました。',
          is_read: false,
        })
      if (notifError) console.error('[admin/flags] 停止通知エラー:', notifError.message)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/flags] PATCH error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
