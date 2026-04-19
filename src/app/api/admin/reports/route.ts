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
  try {
    const { reportId, action, reportedId } = await req.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabaseAdmin
      .from('reports')
      .update({ status: action })
      .eq('id', reportId)

    if (error) {
      console.error('[admin/reports] PATCH reports error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const now = new Date().toISOString()

    // 警告：通知を送信
    if (action === 'warned' && reportedId) {
      const { data: notifData, error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: reportedId,
          type: 'system',
          title: '⚠️ 通報への警告',
          message: 'あなたのアカウントが他のユーザーから通報され、規約違反として警告を受けました。今後同様の行為が続く場合、アカウントが停止される場合があります。',
          data: { action: 'warned' },
          is_read: false,
          created_at: now,
          updated_at: now,
        })
        .select()
      console.log('[admin/reports] 警告通知送信結果:', { notifData, notifError: notifError?.message, notifDetails: notifError?.details, notifCode: notifError?.code })
    }

    // アカウント停止：is_active=false + 通知
    if (action === 'suspended' && reportedId) {
      const { error: suspendError } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', reportedId)
      console.log('[admin/reports] アカウント停止:', { reportedId, suspendError: suspendError?.message })

      const { data: notifData, error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: reportedId,
          type: 'system',
          title: '🚫 アカウント停止',
          message: '規約違反のため、アカウントが停止されました。',
          data: { action: 'suspended' },
          is_read: false,
          created_at: now,
          updated_at: now,
        })
        .select()
      console.log('[admin/reports] 停止通知送信結果:', { notifData, notifError: notifError?.message, notifDetails: notifError?.details, notifCode: notifError?.code })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/reports] PATCH error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
