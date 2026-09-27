import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET /api/admin/verification?count_only=true
//   → 件数集計用の行（id, verification_status, ai_review_result）。集計は画面側で実施
// GET /api/admin/verification?tab=requires_review|auto_approved|manual_approved|rejected
//   → 身分証審査一覧（auto/manual の絞り込みは画面側で実施）
//
// 段階0: 管理画面がブラウザから profiles を直接読んでいた処理を、
// requireAdmin + service_role 経由に置き換えたもの。取得カラムは従来と同一。
type VerificationTab = 'requires_review' | 'auto_approved' | 'manual_approved' | 'rejected'

function parseTab(raw: string | null): VerificationTab | null {
  if (raw === 'requires_review' || raw === 'auto_approved' || raw === 'manual_approved' || raw === 'rejected') {
    return raw
  }
  return null
}

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

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(req.url)

    if (searchParams.get('count_only') === 'true') {
      const { data, error } = await serviceSupabase
        .from('profiles')
        .select('id, verification_status, ai_review_result')
        .in('verification_status', ['requires_review', 'approved', 'rejected'])

      if (error) {
        console.error('[admin/verification] count error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ rows: data ?? [] })
    }

    const tab = parseTab(searchParams.get('tab'))
    if (!tab) {
      return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
    }

    const status = tab === 'requires_review'
      ? 'requires_review'
      : tab === 'rejected'
        ? 'rejected'
        : 'approved'

    const { data, error } = await serviceSupabase
      .from('profiles')
      .select('id, name, age, nationality, avatar_url, verification_status, id_document_type, id_document_url, verification_submitted_at, ai_review_result, ai_review_flags')
      .eq('verification_status', status)
      .order('verification_submitted_at', { ascending: tab === 'requires_review' })

    if (error) {
      console.error('[admin/verification] list error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ rows: data ?? [] })
  } catch (e) {
    console.error('[admin/verification] GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
