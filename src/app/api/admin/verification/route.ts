import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// GET /api/admin/verification?count_only=true
//   → タブごとの件数（#21：行は返さず、件数だけを DB で数える）
// GET /api/admin/verification?tab=requires_review|auto_approved|manual_approved|rejected
//   → 身分証審査一覧（auto/manual の絞り込みは画面側で実施）
//     #21：各行に身分証画像の署名付き URL（signed_url）を付けて返す（まとめて 1 回で作る）
//
// 段階0: 管理画面がブラウザから profiles を直接読んでいた処理を、
// requireAdmin + service_role 経由に置き換えたもの。取得カラムは従来と同一。
// 署名付き URL の有効期限・保存パスの形は signed-url/route.ts と同じ
// identity-documents の保存パス: `${user.id}/${Date.now()}.${ext}`（verification/review/route.ts で id_document_url に保存）
const SIGNED_URL_EXPIRES_IN = 3600
const IDENTITY_DOC_PATH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^/\\]+$/i
const IDENTITY_DOC_BUCKET_SEGMENT = '/identity-documents/'

// id_document_url（パス、または Storage の URL）から保存パスを取り出す。形が正しくなければ null
function toIdentityDocPath(value: string | null | undefined): string | null {
  if (!value) return null
  let path = value
  const bucketIndex = value.indexOf(IDENTITY_DOC_BUCKET_SEGMENT)
  if (bucketIndex !== -1) {
    path = value.slice(bucketIndex + IDENTITY_DOC_BUCKET_SEGMENT.length).split(/[?#]/)[0]
    try {
      path = decodeURIComponent(path)
    } catch {
      return null
    }
  }
  // signed-url/route.ts と同じく `{UUID}/{ファイル名}` 形式のみ許可
  if (!IDENTITY_DOC_PATH_REGEX.test(path) || path.includes('..')) return null
  return path
}

// #21: 処理時間の計測。段階ごとの ms を Server-Timing ヘッダーで返す（個人情報は入れない）
function createTimer() {
  const startedAt = Date.now()
  const entries: Array<[string, number]> = []
  return {
    async measure<T>(name: string, fn: () => PromiseLike<T>): Promise<T> {
      const t0 = Date.now()
      try {
        return await fn()
      } finally {
        entries.push([name, Date.now() - t0])
      }
    },
    header(): string {
      return [...entries, ['total', Date.now() - startedAt] as [string, number]]
        .map(([name, ms]) => `${name};dur=${ms}`)
        .join(', ')
    },
  }
}

type VerificationTab = 'requires_review' | 'auto_approved' | 'manual_approved' | 'rejected'

function parseTab(raw: string | null): VerificationTab | null {
  if (raw === 'requires_review' || raw === 'auto_approved' || raw === 'manual_approved' || raw === 'rejected') {
    return raw
  }
  return null
}

export async function GET(req: NextRequest) {
  const timer = createTimer()
  const respond = (body: unknown, init?: { status?: number }) =>
    NextResponse.json(body, { status: init?.status, headers: { 'Server-Timing': timer.header() } })

  try {
    // 段階0: 管理者のみ許可（未ログイン 401 / 非管理者 403）
    const admin = await timer.measure('auth', () => requireAdmin())
    if (!admin.ok) {
      return respond(
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
      // #21: 件数だけを同時に数える。AI 自動承認＝承認済みで ai_review_result.auto_approve が true（JSON の true）、
      // 手動承認＝承認済みのそれ以外（画面の従来の分け方 `ai?.auto_approve === true` と同じ）
      const countOf = () => serviceSupabase.from('profiles').select('id', { count: 'exact', head: true })
      const [requiresResult, approvedResult, autoResult, rejectedResult] = await timer.measure('db', () => Promise.all([
        countOf().eq('verification_status', 'requires_review'),
        countOf().eq('verification_status', 'approved'),
        countOf().eq('verification_status', 'approved').eq('ai_review_result->auto_approve', true),
        countOf().eq('verification_status', 'rejected'),
      ]))

      const countError = requiresResult.error ?? approvedResult.error ?? autoResult.error ?? rejectedResult.error
      if (countError) {
        console.error('[admin/verification] count error:', countError.message)
        return respond({ error: countError.message }, { status: 500 })
      }

      const approved = approvedResult.count ?? 0
      const autoApproved = autoResult.count ?? 0
      return respond({
        counts: {
          requires_review: requiresResult.count ?? 0,
          auto_approved: autoApproved,
          manual_approved: Math.max(approved - autoApproved, 0),
          rejected: rejectedResult.count ?? 0,
        },
      })
    }

    const tab = parseTab(searchParams.get('tab'))
    if (!tab) {
      return respond({ error: 'Invalid tab' }, { status: 400 })
    }

    const status = tab === 'requires_review'
      ? 'requires_review'
      : tab === 'rejected'
        ? 'rejected'
        : 'approved'

    const { data, error } = await timer.measure('db', () => serviceSupabase
      .from('profiles')
      .select('id, name, age, nationality, avatar_url, verification_status, id_document_type, id_document_url, verification_submitted_at, ai_review_result, ai_review_flags')
      .eq('verification_status', status)
      .order('verification_submitted_at', { ascending: tab === 'requires_review' }))

    if (error) {
      console.error('[admin/verification] list error:', error.message)
      return respond({ error: error.message }, { status: 500 })
    }

    const rows = data ?? []

    // #21: 身分証画像の署名付き URL を、全行分まとめて 1 回で作る
    // 失敗した行は signed_url: null（一覧は壊さない）。失敗はサーバーのログに出す
    const signedUrlByPath = new Map<string, string>()
    const paths = Array.from(new Set(rows.map(r => toIdentityDocPath(r.id_document_url)).filter((p): p is string => p !== null)))
    const invalidCount = rows.filter(r => r.id_document_url && !toIdentityDocPath(r.id_document_url)).length
    if (invalidCount > 0) {
      console.error('[admin/verification] invalid id_document_url:', invalidCount)
    }
    if (paths.length > 0) {
      try {
        const { data: signed, error: signError } = await timer.measure('sign', () => serviceSupabase.storage
          .from('identity-documents')
          .createSignedUrls(paths, SIGNED_URL_EXPIRES_IN))
        if (signError) {
          console.error('[admin/verification] signed urls error:', signError.message)
        }
        let failedCount = 0
        for (const item of signed ?? []) {
          if (item.path && item.signedUrl && !item.error) {
            signedUrlByPath.set(item.path, item.signedUrl)
          } else {
            failedCount++
          }
        }
        if (failedCount > 0) {
          console.error('[admin/verification] signed url failed for some rows:', failedCount)
        }
      } catch (e) {
        console.error('[admin/verification] signed urls exception:', e instanceof Error ? e.message : e)
      }
    }

    return respond({
      rows: rows.map(r => {
        const path = toIdentityDocPath(r.id_document_url)
        return { ...r, signed_url: path ? signedUrlByPath.get(path) ?? null : null }
      }),
    })
  } catch (e) {
    console.error('[admin/verification] GET error:', e)
    return respond({ error: 'Internal server error' }, { status: 500 })
  }
}
