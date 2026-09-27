import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET /api/admin/leave-surveys                    → 退会者アンケート一覧（最大50件、新しい順）
// GET /api/admin/leave-surveys?count_only=true    → 件数のみ
// GET /api/admin/leave-surveys?page=2             → ページネーション（10件刻み）
//
// 注: requireAdmin で管理者判定後、service_role でバイパスして取得。
const PAGE_SIZE = 10

export async function GET(req: NextRequest) {
  try {
    // 段階0: 管理者のみ許可（未ログイン 401 / 非管理者 403）
    const admin = await requireAdmin()
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.message, code: admin.code },
        { status: admin.httpStatus }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const countOnly = req.nextUrl.searchParams.get('count_only') === 'true'

    if (countOnly) {
      const { count, error } = await supabaseAdmin
        .from('leave_surveys')
        .select('id', { count: 'exact', head: true })
      if (error) {
        console.error('[admin/leave-surveys] count error:', error.message)
        return NextResponse.json({ count: 0 })
      }
      return NextResponse.json({ count: count || 0 })
    }

    const pageParam = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10)
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
    const offset = (page - 1) * PAGE_SIZE

    const { data, error, count } = await supabaseAdmin
      .from('leave_surveys')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      console.error('[admin/leave-surveys] list error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      surveys: data ?? [],
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
      hasMore: (count ?? 0) > offset + PAGE_SIZE,
    })
  } catch (e) {
    console.error('[admin/leave-surveys] unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
