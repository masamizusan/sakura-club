import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET /api/admin/reports           → 通報一覧取得
// GET /api/admin/reports?count_only=true → 件数のみ
// PATCH /api/admin/reports         → 通報アクション（対応済み・停止）
export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const countOnly = req.nextUrl.searchParams.get('count_only') === 'true'

    if (countOnly) {
      const { count, error } = await supabaseAdmin
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (error) {
        console.error('[admin/reports] count error:', error)
        return NextResponse.json({ count: 0 })
      }
      return NextResponse.json({ count: count || 0 })
    }

    // JOIN を使わずシンプルに取得（FK制約がなくてもOK）
    const { data, error } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    console.log('[admin/reports] GET:', { count: data?.length, error: error?.message })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!data || data.length === 0) {
      return NextResponse.json({ reports: [], count: 0 })
    }

    // reporter / reported のプロフィールを別クエリで取得してマージ
    const allUserIds = Array.from(new Set([
      ...data.map((r: { reporter_id: string }) => r.reporter_id),
      ...data.map((r: { reported_id: string }) => r.reported_id),
    ]))

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, gender, nationality')
      .in('id', allUserIds)

    console.log('[admin/reports] profiles取得:', profiles?.length, profiles?.[0])

    const profileMap: Record<string, { name: string; gender: string; nationality: string }> = {}
    for (const p of profiles || []) {
      profileMap[p.id] = { name: p.name ?? '', gender: p.gender ?? '', nationality: p.nationality ?? '' }
    }

    const enriched = data.map((r: { reporter_id: string; reported_id: string }) => ({
      ...r,
      reporter: profileMap[r.reporter_id] ? { name: profileMap[r.reporter_id].name } : null,
      reported: profileMap[r.reported_id] ?? null,
    }))

    return NextResponse.json({ reports: enriched, count: enriched.length })
  } catch (e) {
    console.error('[admin/reports] GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  console.log('[reports PATCH] リクエスト受信:', body)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { reportId, action, reportedId } = body

  // Step1: reportsテーブルを更新
  const { error: updateError } = await supabaseAdmin
    .from('reports')
    .update({ status: action })
    .eq('id', reportId)

  console.log('[reports PATCH] report更新:', { updateError: updateError?.message })
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Step2: 通知を書き込む（contentカラムで試みる）
  if ((action === 'warned' || action === 'suspended') && reportedId) {
    const warningText = action === 'warned'
      ? 'あなたのアカウントが他のユーザーから通報され、規約違反として警告を受けました。今後同様の行為が続く場合、アカウントが停止される場合があります。'
      : '規約違反のため、アカウントが停止されました。'

    // まず content カラムで試みる
    const { data: notif, error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: reportedId,
        type: 'system',
        content: warningText,
        is_read: false,
      })
      .select()

    console.log('[reports PATCH] 通知書き込み(content):', { notif, notifError: notifError?.message, notifCode: notifError?.code, notifDetails: notifError?.details })

    // content で失敗した場合は message+title でも試みる
    if (notifError) {
      const now = new Date().toISOString()
      const title = action === 'warned' ? '⚠️ 通報への警告' : '🚫 アカウント停止'
      const { data: notif2, error: notifError2 } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: reportedId,
          type: 'system',
          title,
          message: warningText,
          data: { action },
          is_read: false,
          created_at: now,
          updated_at: now,
        })
        .select()
      console.log('[reports PATCH] 通知書き込み(message+title):', { notif2, notifError2: notifError2?.message, notifCode2: notifError2?.code })
    }
  }

  // Step3: アカウント停止
  if (action === 'suspended' && reportedId) {
    const { error: suspendError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: false })
      .eq('id', reportedId)

    console.log('[reports PATCH] アカウント停止:', { suspendError: suspendError?.message })
  }

  return NextResponse.json({ ok: true, reportedId, action })
}
