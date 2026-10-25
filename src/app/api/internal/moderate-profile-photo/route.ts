import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decideImageModeration, FORCED_TEST_RESULT, moderateImage, type ImageModerationResult } from '@/lib/moderation/moderateImage'
import { isValidWebhookSecret, moveToQuarantine } from '@/lib/moderation/imageQuarantine'
import { getLangFromNationality } from '@/lib/i18n/translationLang'
import { PHOTO_REMOVED_TEXT } from '@/lib/notificationText'

export const dynamic = 'force-dynamic'

/**
 * POST /api/internal/moderate-profile-photo
 *
 * #67: プロフィール写真の AI 審査（profiles のトリガー〔stage16〕から pg_net で呼ばれる）
 * - 利用者が呼ぶ API ではない。合言葉（x-webhook-secret ＝ PROFILE_PHOTO_MODERATION_SECRET）で守る
 * - record と old_record（id・photo_urls・avatar_url だけ）を比べて、新しく増えた写真だけを審査する
 *   （写真の一覧は DB から読み直し、今も profiles に載っている写真だけを対象にする）
 * - 判定は #17 と同じ（src/lib/moderation/moderateImage.ts）
 *   性的・自傷・暴力（生々しいもの）→ avatars-quarantine の同じパスへ移す（隔離）。profiles は変えない
 *   暴力（生々しくないもの）だけ → 記録だけ
 * - 記録は profile_photo_flags。隔離したら管理者と本人（国籍の言語）に通知
 * - OpenAI の失敗 → 隔離せず image_unchecked で記録。トリガーには 200 を返す
 *
 * テスト用（テスト後に必ず消す）：PROFILE_PHOTO_MODERATION_FORCE_QUARANTINE_USER_ID に利用者 ID を入れると、
 * その人の写真は OpenAI を呼ばずに「性的」と判定された扱いで隔離する
 */

const AVATARS_BUCKET = 'avatars'
const QUARANTINE_BUCKET = 'avatars-quarantine'
const SIGNED_URL_EXPIRES_IN = 60
const LOG_PREFIX = '[moderate-profile-photo]'

// 公開 URL の中の avatars のパスの始まり
const PUBLIC_URL_MARKER = `/storage/v1/object/public/${AVATARS_BUCKET}/`
// 「{UUID}/{ファイル名}」形式（サブフォルダ・パス区切りは不可）
const AVATAR_PATH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^/\\]+$/i

type PhotoColumns = { id?: unknown; photo_urls?: unknown; avatar_url?: unknown } | null | undefined

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status })
}

// 公開 URL（またはパス）から avatars の保存パスを取り出す。形が違えば null
function toAvatarPath(value: unknown): string | null {
  if (typeof value !== 'string' || value === '') return null
  let path = value
  const markerIndex = value.indexOf(PUBLIC_URL_MARKER)
  if (markerIndex !== -1) {
    path = value.slice(markerIndex + PUBLIC_URL_MARKER.length).split(/[?#]/)[0]
    try {
      path = decodeURIComponent(path)
    } catch {
      return null
    }
  } else if (/^[a-z]+:/i.test(value)) {
    return null // ほかの URL・data URL は対象外
  }
  if (!AVATAR_PATH_REGEX.test(path) || path.includes('..')) return null
  return path
}

// photo_urls と avatar_url の写真のパスの一覧
function photoPathsOf(row: PhotoColumns): Set<string> {
  const paths = new Set<string>()
  if (!row) return paths
  const urls = Array.isArray(row.photo_urls) ? row.photo_urls : []
  for (const url of [...urls, row.avatar_url]) {
    const path = toAvatarPath(url)
    if (path) paths.add(path)
  }
  return paths
}

export async function POST(req: NextRequest) {
  // 合言葉の確認（合言葉はログに出さない）
  if (!isValidWebhookSecret(req.headers.get('x-webhook-secret'), process.env.PROFILE_PHOTO_MODERATION_SECRET)) {
    return json({ error: 'Unauthorized' }, 401)
  }

  try {
    const payload = await req.json().catch(() => null)
    const record = payload?.record as PhotoColumns
    if (payload?.table !== 'profiles' || (payload?.type !== 'INSERT' && payload?.type !== 'UPDATE') || !record || typeof record.id !== 'string') {
      return json({ ok: true, skipped: 'not_profile_change' })
    }
    const userId = record.id

    // 新しく増えた写真（record にあって old_record に無いもの）
    const oldPaths = photoPathsOf(payload?.old_record as PhotoColumns)
    const addedPaths = Array.from(photoPathsOf(record)).filter(p => !oldPaths.has(p))
    if (addedPaths.length === 0) {
      return json({ ok: true, skipped: 'no_new_photo' })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 中身はトリガーの値ではなく DB の値を使う（今も載っている写真だけ）
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, photo_urls, avatar_url, nationality')
      .eq('id', userId)
      .maybeSingle()
    if (profileError) {
      console.error(`${LOG_PREFIX} profile lookup error:`, profileError.message)
      return json({ ok: false }, 500)
    }
    if (!profile) {
      return json({ ok: true, skipped: 'profile_not_found' })
    }
    const currentPaths = photoPathsOf(profile)
    // 自分のフォルダ（{利用者ID}/…）の写真だけ（他人の写真の URL を載せても、その人の写真は動かさない）
    const targets = addedPaths.filter(p => currentPaths.has(p) && p.startsWith(`${userId}/`))
    const othersCount = addedPaths.filter(p => currentPaths.has(p) && !p.startsWith(`${userId}/`)).length
    if (othersCount > 0) {
      console.warn(`${LOG_PREFIX} skipped photos outside own folder:`, othersCount)
    }
    if (targets.length === 0) {
      return json({ ok: true, skipped: 'no_new_photo' })
    }

    // 同じ写真を 2 回審査しない
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('profile_photo_flags')
      .select('photo_path')
      .in('photo_path', targets)
    if (existingError) {
      console.error(`${LOG_PREFIX} existing flag lookup error:`, existingError.message)
      return json({ ok: false }, 500)
    }
    const checkedPaths = new Set((existing ?? []).map(r => r.photo_path))

    const insertFlag = async (photoPath: string, flagType: string, score: number, detail: string, quarantined: boolean) => {
      const { error } = await supabaseAdmin.from('profile_photo_flags').insert({
        user_id: userId,
        photo_path: photoPath,
        flag_type: flagType,
        score,
        detail,
        status: 'pending',
        reviewed: false,
        quarantined,
      })
      if (error) {
        console.error(`${LOG_PREFIX} profile_photo_flags insert error:`, error.message)
      }
    }

    const forceUserId = process.env.PROFILE_PHOTO_MODERATION_FORCE_QUARANTINE_USER_ID
    const results: Array<{ result: string }> = []
    const quarantinedTypes: string[] = []

    for (const photoPath of targets) {
      if (checkedPaths.has(photoPath)) {
        results.push({ result: 'already_checked' })
        continue
      }

      let result: ImageModerationResult | null
      if (forceUserId && userId === forceUserId) {
        console.warn(`${LOG_PREFIX} forced quarantine for test user (remove PROFILE_PHOTO_MODERATION_FORCE_QUARANTINE_USER_ID after testing)`)
        result = FORCED_TEST_RESULT
      } else {
        const { data: signed, error: signError } = await supabaseAdmin.storage
          .from(AVATARS_BUCKET)
          .createSignedUrl(photoPath, SIGNED_URL_EXPIRES_IN)
        if (signError || !signed?.signedUrl) {
          console.error(`${LOG_PREFIX} signed url error:`, signError?.message)
          await insertFlag(photoPath, 'image_unchecked', 0, JSON.stringify({ reason: 'signed_url_failed' }), false)
          results.push({ result: 'unchecked' })
          continue
        }
        result = await moderateImage(signed.signedUrl, LOG_PREFIX)
      }

      if (!result) {
        await insertFlag(photoPath, 'image_unchecked', 0, JSON.stringify({ reason: 'moderation_failed' }), false)
        results.push({ result: 'unchecked' })
        continue
      }

      const decision = decideImageModeration(result)
      if (decision.action === 'ok') {
        results.push({ result: 'ok' })
        continue
      }

      // 隔離：同じパスへ移す（profiles は変えない）
      const quarantined = decision.action === 'quarantine'
        ? await moveToQuarantine(supabaseAdmin, AVATARS_BUCKET, QUARANTINE_BUCKET, photoPath, LOG_PREFIX)
        : false
      await insertFlag(photoPath, decision.flagType, decision.score, decision.detail, quarantined)
      if (decision.action === 'quarantine') {
        quarantinedTypes.push(`${decision.flagType}${quarantined ? '（隔離済み）' : '（隔離に失敗）'}`)
      }
      results.push({ result: decision.action === 'quarantine' ? 'quarantined' : 'recorded' })
    }

    if (quarantinedTypes.length > 0) {
      // 管理者への通知（#17・文字の moderate と同じ形）
      const adminUserId = process.env.ADMIN_USER_ID
      if (!adminUserId) {
        console.warn(`${LOG_PREFIX} ADMIN_USER_ID 未設定のため管理者通知をスキップ`)
      } else {
        const { error: adminNotifError } = await supabaseAdmin.from('notifications').insert({
          user_id: adminUserId,
          type: 'system',
          title: '【管理】AIフラグ検知',
          message: `AIが不適切な可能性のあるプロフィール写真を検知しました: ${quarantinedTypes.join('、')}`,
          data: { kind: 'ai_flag', profile_user_id: userId },
        })
        if (adminNotifError) {
          console.error(`${LOG_PREFIX} 管理者通知エラー:`, adminNotifError.message)
        }
      }

      // 本人への通知（本人の国籍の言語。表示時は表示言語で出し直す：lib/notificationText.ts）
      const text = PHOTO_REMOVED_TEXT[getLangFromNationality(profile.nationality)] ?? PHOTO_REMOVED_TEXT.ja
      const { error: userNotifError } = await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        type: 'system',
        title: text.title,
        message: text.message,
        data: { kind: 'photo_removed' },
        is_read: false,
      })
      if (userNotifError) {
        console.error(`${LOG_PREFIX} 本人への通知エラー:`, userNotifError.message)
      }
    }

    return json({ ok: true, results })
  } catch (e) {
    console.error(`${LOG_PREFIX} unexpected error:`, e instanceof Error ? e.message : 'unknown')
    return json({ ok: false }, 500)
  }
}
