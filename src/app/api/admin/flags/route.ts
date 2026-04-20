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

    console.log('[admin/flags] GET:', { count: data?.length, error: error?.message })
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
  const body = await req.json()
  console.log('[flags PATCH] リクエスト受信:', body)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { flagId, action } = body

  // Step1: flagIdからmessage_idを取得
  const { data: flag, error: flagError } = await supabaseAdmin
    .from('message_flags')
    .select('message_id')
    .eq('id', flagId)
    .single()

  console.log('[flags PATCH] flag取得:', { flag, flagError: flagError?.message })
  if (flagError || !flag) {
    return NextResponse.json({ error: 'flag not found', flagError: flagError?.message }, { status: 404 })
  }

  // Step2: message_idからsender_idを取得
  const { data: message, error: messageError } = await supabaseAdmin
    .from('messages')
    .select('sender_id')
    .eq('id', flag.message_id)
    .single()

  console.log('[flags PATCH] message取得:', { message, messageError: messageError?.message })
  if (messageError || !message) {
    return NextResponse.json({ error: 'message not found', messageError: messageError?.message }, { status: 404 })
  }

  const senderId = message.sender_id
  console.log('[flags PATCH] senderId確定:', senderId)

  // Step3: フラグを更新
  const { error: updateError } = await supabaseAdmin
    .from('message_flags')
    .update({ reviewed: true, status: action })
    .eq('id', flagId)

  console.log('[flags PATCH] flag更新:', { updateError: updateError?.message })

  // Step4: 通知を書き込む（notifications実テーブルに合わせてcontentカラムを使用）
  if (action === 'warned' || action === 'suspended') {
    const warningText = action === 'warned'
      ? 'あなたのメッセージが規約違反として警告を受けました。今後同様の行為が続く場合、アカウントが停止される場合があります。'
      : '規約違反のため、アカウントが停止されました。'

    // まず content カラムで試みる（moderate/route.tsと同じパターン）
    const { data: notif, error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: senderId,
        type: action === 'warned' ? 'system' : 'system',
        content: warningText,
        is_read: false,
      })
      .select()

    console.log('[flags PATCH] 通知書き込み(content):', { notif, notifError: notifError?.message, notifCode: notifError?.code, notifDetails: notifError?.details })

    // content で失敗した場合は message+title でも試みる
    if (notifError) {
      const now = new Date().toISOString()
      const title = action === 'warned' ? '⚠️ メッセージへの警告' : '🚫 アカウント停止'
      const { data: notif2, error: notifError2 } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: senderId,
          type: 'system',
          title,
          message: warningText,
          data: { action },
          is_read: false,
          created_at: now,
          updated_at: now,
        })
        .select()
      console.log('[flags PATCH] 通知書き込み(message+title):', { notif2, notifError2: notifError2?.message, notifCode2: notifError2?.code })
    }
  }

  // Step5: アカウント停止
  if (action === 'suspended') {
    const { error: suspendError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: false })
      .eq('id', senderId)

    console.log('[flags PATCH] アカウント停止:', { suspendError: suspendError?.message })
  }

  return NextResponse.json({ ok: true, senderId, action })
}
