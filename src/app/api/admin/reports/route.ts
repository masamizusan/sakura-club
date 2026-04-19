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

    const { data, error } = await supabaseAdmin
      .from('reports')
      .select(`
        *,
        reporter:profiles!reporter_id (nickname),
        reported:profiles!reported_id (nickname, gender, nationality)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    console.log('[admin/reports] GET:', { count: data?.length, error: error?.message })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ reports: data || [], count: data?.length || 0 })
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

    if (action === 'suspended' && reportedId) {
      await supabaseAdmin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', reportedId)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/reports] PATCH error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
