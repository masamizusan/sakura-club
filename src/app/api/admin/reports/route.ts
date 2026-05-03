import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLanguageFromNationality } from '@/utils/language'
import {
  buildReportWarningNotification,
  localeForLanguage,
} from '@/utils/violationCategories'

export const dynamic = 'force-dynamic'

// GET /api/admin/reports                       → 未対応通報一覧（既定）
// GET /api/admin/reports?status=pending        → 未対応（status='pending'）
// GET /api/admin/reports?status=done           → 対応済み（status != 'pending'）
// GET /api/admin/reports?status=resolved       → 対応済みのうち「対応済み」のみ
// GET /api/admin/reports?status=warned         → 対応済みのうち「警告」のみ
// GET /api/admin/reports?status=suspended      → 対応済みのうち「停止」のみ
// GET /api/admin/reports?count_only=true       → 件数のみ（status クエリと併用可）
// PATCH /api/admin/reports                     → 通報アクション（対応済み・警告・停止）
type ReportStatusFilter = 'pending' | 'done' | 'resolved' | 'warned' | 'suspended'

function parseReportStatus(raw: string | null): ReportStatusFilter {
  if (raw === 'done' || raw === 'resolved' || raw === 'warned' || raw === 'suspended') {
    return raw
  }
  return 'pending'
}

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const countOnly = req.nextUrl.searchParams.get('count_only') === 'true'
    const status = parseReportStatus(req.nextUrl.searchParams.get('status'))

    if (countOnly) {
      let countQuery = supabaseAdmin
        .from('reports')
        .select('id', { count: 'exact', head: true })
      if (status === 'pending') {
        countQuery = countQuery.eq('status', 'pending')
      } else if (status === 'done') {
        countQuery = countQuery.neq('status', 'pending')
      } else {
        countQuery = countQuery.eq('status', status)
      }
      const { count, error } = await countQuery
      if (error) {
        console.error('[admin/reports] count error:', error)
        return NextResponse.json({ count: 0 })
      }
      return NextResponse.json({ count: count || 0 })
    }

    // JOIN を使わずシンプルに取得（FK制約がなくてもOK）
    let listQuery = supabaseAdmin.from('reports').select('*')
    if (status === 'pending') {
      listQuery = listQuery.eq('status', 'pending')
    } else if (status === 'done') {
      listQuery = listQuery.neq('status', 'pending')
    } else {
      listQuery = listQuery.eq('status', status)
    }
    const { data, error } = await listQuery.order('created_at', { ascending: false })

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

    // ① reportsテーブルから詳細取得（reason / created_at）→ ステータス更新
    const { data: reportRow } = await supabaseAdmin
      .from('reports')
      .select('reason, created_at')
      .eq('id', reportId)
      .maybeSingle()

    const { error: updateError } = await supabaseAdmin
      .from('reports')
      .update({ status: action })
      .eq('id', reportId)

    if (updateError) {
      console.error('[admin/reports] PATCH reports error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // ② 警告通知を送信（受信者の言語に応じてローカライズ + 通報日時/理由を含める）
    if (action === 'warned' && reportedId) {
      const { data: recipientProfile } = await supabaseAdmin
        .from('profiles')
        .select('nationality')
        .eq('id', reportedId)
        .maybeSingle()

      const lang = getLanguageFromNationality(recipientProfile?.nationality)
      const reportDate = reportRow?.created_at ? new Date(reportRow.created_at) : new Date()
      const formattedDate = new Intl.DateTimeFormat(localeForLanguage(lang), {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(reportDate)
      const reason = (reportRow?.reason ?? '').toString()

      const { title, message } = buildReportWarningNotification({
        lang,
        formattedDate,
        reason,
      })

      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: reportedId,
          type: 'warning',
          title,
          message,
          is_read: false,
        })
      if (notifError) console.error('[admin/reports] 警告通知エラー:', notifError.message)
    }

    // ③ アカウント停止：is_active=false + 停止通知
    if (action === 'suspended' && reportedId) {
      const { error: suspendError } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: false })
        .eq('id', reportedId)
      if (suspendError) console.error('[admin/reports] 停止エラー:', suspendError.message)

      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: reportedId,
          type: 'suspended',
          title: '🚫 アカウント停止',
          message: '規約違反のため、アカウントが停止されました。',
          is_read: false,
        })
      if (notifError) console.error('[admin/reports] 停止通知エラー:', notifError.message)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/reports] PATCH error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
