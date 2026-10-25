import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// #67: プロフィール写真の AI 審査の記録（profile_photo_flags）
// GET   /api/admin/profile-photo-flags?status=pending|done   → 一覧（画像の署名付き URL つき）
// GET   /api/admin/profile-photo-flags?count_only=true&status=pending → 件数のみ
// PATCH /api/admin/profile-photo-flags { flagId, action: 'resolved' } → 問題なし（確認済み）

const QUARANTINE_BUCKET = 'avatars-quarantine'
const AVATARS_BUCKET = 'avatars'
const IMAGE_SIGNED_URL_EXPIRES_IN = 3600

type FlagRow = {
  id: string
  user_id: string
  photo_path: string
  flag_type: string
  score: number
  detail: string | null
  status: string
  reviewed: boolean
  quarantined: boolean
  created_at: string
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.message, code: admin.code },
        { status: admin.httpStatus }
      )
    }

    const supabaseAdmin = createAdminClient()
    const isDone = req.nextUrl.searchParams.get('status') === 'done'

    if (req.nextUrl.searchParams.get('count_only') === 'true') {
      const { count, error } = await supabaseAdmin
        .from('profile_photo_flags')
        .select('id', { count: 'exact', head: true })
        .eq('reviewed', isDone)
      if (error) {
        console.error('[admin/profile-photo-flags] count error:', error.message)
        return NextResponse.json({ count: 0 })
      }
      return NextResponse.json({ count: count || 0 })
    }

    const { data, error } = await supabaseAdmin
      .from('profile_photo_flags')
      .select('id, user_id, photo_path, flag_type, score, detail, status, reviewed, quarantined, created_at')
      .eq('reviewed', isDone)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) {
      console.error('[admin/profile-photo-flags] list error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const rows = (data ?? []) as FlagRow[]
    if (rows.length === 0) {
      return NextResponse.json({ flags: [] })
    }

    // 送信者（写真の持ち主）
    const userIds = Array.from(new Set(rows.map(r => r.user_id)))
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, gender, nationality')
      .in('id', userIds)
    if (profilesError) {
      console.error('[admin/profile-photo-flags] profiles error:', profilesError.message)
    }
    const profileById = new Map((profiles ?? []).map(p => [p.id, p]))

    // 画像の署名付き URL（隔離済みは隔離先、それ以外は avatars）をまとめて作る
    const signAll = async (bucket: string, paths: string[]) => {
      const urls = new Map<string, string>()
      if (paths.length === 0) return urls
      const { data: signed, error: signError } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrls(paths, IMAGE_SIGNED_URL_EXPIRES_IN)
      if (signError) {
        console.error(`[admin/profile-photo-flags] signed urls error (${bucket}):`, signError.message)
      }
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl)
      }
      return urls
    }
    const unique = (paths: string[]) => Array.from(new Set(paths))
    const [quarantinedUrls, originalUrls] = await Promise.all([
      signAll(QUARANTINE_BUCKET, unique(rows.filter(r => r.quarantined).map(r => r.photo_path))),
      signAll(AVATARS_BUCKET, unique(rows.filter(r => !r.quarantined).map(r => r.photo_path))),
    ])

    return NextResponse.json({
      flags: rows.map(r => {
        const p = profileById.get(r.user_id)
        return {
          ...r,
          image_signed_url: (r.quarantined ? quarantinedUrls : originalUrls).get(r.photo_path) ?? null,
          profile: p ? { name: p.name ?? '', gender: p.gender ?? '', nationality: p.nationality ?? '' } : null,
        }
      }),
    })
  } catch (e) {
    console.error('[admin/profile-photo-flags] GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.message, code: admin.code },
        { status: admin.httpStatus }
      )
    }

    const body = await req.json().catch(() => null)
    const flagId = body?.flagId
    if (typeof flagId !== 'string' || body?.action !== 'resolved') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin
      .from('profile_photo_flags')
      .update({ reviewed: true, status: 'resolved' })
      .eq('id', flagId)
    if (error) {
      console.error('[admin/profile-photo-flags] PATCH error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/profile-photo-flags] PATCH error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
