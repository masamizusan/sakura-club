import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractChatImagePath } from '@/lib/chatImages'
import { decideImageModeration, FORCED_TEST_RESULT, moderateImage, type ImageModerationResult } from '@/lib/moderation/moderateImage'
import { isValidWebhookSecret, moveToQuarantine } from '@/lib/moderation/imageQuarantine'

export const dynamic = 'force-dynamic'

/**
 * POST /api/internal/moderate-chat-image
 *
 * #17: チャット画像の AI 審査（Supabase の Database Webhook：messages の INSERT から呼ばれる）
 * - 利用者が呼ぶ API ではない。合言葉（x-webhook-secret ＝ CHAT_IMAGE_MODERATION_SECRET）で守る
 * - OpenAI moderation API（omni-moderation-latest）で 性的・自傷・暴力 を判定する（連絡先は判定しない）
 *   判定・隔離・合言葉の照合は #67 で src/lib/moderation/ に共通化（動きは同じ）
 * - 性的・自傷・暴力（生々しいもの）→ 画像を chat-images-quarantine の同じパスへ移し（隔離）、message_flags に記録・管理者に通知
 *   暴力（生々しくないもの）だけ → 隔離せず、message_flags に記録だけ
 * - messages の行と image_url はそのまま（相手の画面は署名付き URL が作れず「画像を表示できません」になる）
 * - OpenAI の失敗・タイムアウト → 隔離せず、flag_type = image_unchecked で記録。Webhook には 200 を返す
 *
 * テスト用（テスト後に必ず消す）：CHAT_IMAGE_MODERATION_FORCE_QUARANTINE_USER_ID に利用者 ID を入れると、
 * その人が送った画像は OpenAI を呼ばずに「性的」と判定された扱いで隔離する
 */

const CHAT_IMAGES_BUCKET = 'chat-images'
const QUARANTINE_BUCKET = 'chat-images-quarantine'
const SIGNED_URL_EXPIRES_IN = 60
const LOG_PREFIX = '[moderate-chat-image]'

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status })
}

export async function POST(req: NextRequest) {
  // 合言葉の確認（合言葉はログに出さない）
  if (!isValidWebhookSecret(req.headers.get('x-webhook-secret'), process.env.CHAT_IMAGE_MODERATION_SECRET)) {
    return json({ error: 'Unauthorized' }, 401)
  }

  try {
    const payload = await req.json().catch(() => null)
    const record = payload?.record as { id?: unknown; image_url?: unknown } | undefined
    if (payload?.type !== 'INSERT' || payload?.table !== 'messages' || !record) {
      return json({ ok: true, skipped: 'not_message_insert' })
    }
    if (typeof record.image_url !== 'string' || record.image_url === '' || typeof record.id !== 'string') {
      return json({ ok: true, skipped: 'no_image' })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 中身は Webhook の値ではなく DB の値を使う
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, image_url')
      .eq('id', record.id)
      .maybeSingle()
    if (messageError) {
      console.error('[moderate-chat-image] message lookup error:', messageError.message)
      return json({ ok: false }, 500)
    }
    const path = extractChatImagePath(message?.image_url)
    if (!message || !path) {
      return json({ ok: true, skipped: 'no_image' })
    }

    // 同じメッセージを 2 回審査しない（Webhook の再送など）
    const { data: existingFlag, error: existingError } = await supabaseAdmin
      .from('message_flags')
      .select('id')
      .eq('message_id', message.id)
      .like('flag_type', 'image\\_%')
      .limit(1)
      .maybeSingle()
    if (existingError) {
      console.error('[moderate-chat-image] existing flag lookup error:', existingError.message)
      return json({ ok: false }, 500)
    }
    if (existingFlag) {
      return json({ ok: true, skipped: 'already_checked' })
    }

    const insertFlag = async (flagType: string, score: number, detail: string) => {
      const { error } = await supabaseAdmin.from('message_flags').insert({
        message_id: message.id,
        flag_type: flagType,
        score,
        detail,
        reviewed: false,
        status: 'pending',
      })
      if (error) {
        console.error('[moderate-chat-image] message_flags insert error:', error.message)
      }
      return !error
    }

    // 判定（テスト用の強制隔離 → OpenAI）
    const forceUserId = process.env.CHAT_IMAGE_MODERATION_FORCE_QUARANTINE_USER_ID
    let result: ImageModerationResult | null
    if (forceUserId && message.sender_id === forceUserId) {
      console.warn('[moderate-chat-image] forced quarantine for test user (remove CHAT_IMAGE_MODERATION_FORCE_QUARANTINE_USER_ID after testing)')
      result = FORCED_TEST_RESULT
    } else {
      const { data: signed, error: signError } = await supabaseAdmin.storage
        .from(CHAT_IMAGES_BUCKET)
        .createSignedUrl(path, SIGNED_URL_EXPIRES_IN)
      if (signError || !signed?.signedUrl) {
        console.error('[moderate-chat-image] signed url error:', signError?.message)
        await insertFlag('image_unchecked', 0, JSON.stringify({ reason: 'signed_url_failed' }))
        return json({ ok: true, result: 'unchecked' })
      }
      result = await moderateImage(signed.signedUrl, LOG_PREFIX)
    }

    if (!result) {
      await insertFlag('image_unchecked', 0, JSON.stringify({ reason: 'moderation_failed' }))
      return json({ ok: true, result: 'unchecked' })
    }

    const decision = decideImageModeration(result)
    if (decision.action === 'ok') {
      return json({ ok: true, result: 'ok' })
    }

    // 隔離：同じパスへ移す（messages の行と image_url はそのまま）
    const quarantined = decision.action === 'quarantine'
      ? await moveToQuarantine(supabaseAdmin, CHAT_IMAGES_BUCKET, QUARANTINE_BUCKET, path, LOG_PREFIX)
      : false

    const flagged = await insertFlag(decision.flagType, decision.score, decision.detail)

    // 管理者への通知（文字の moderate と同じ形。隔離するものだけ）
    if (decision.action === 'quarantine') {
      const adminUserId = process.env.ADMIN_USER_ID
      if (!adminUserId) {
        console.warn('[moderate-chat-image] ADMIN_USER_ID 未設定のため管理者通知をスキップ')
      } else {
        const { error: adminNotifError } = await supabaseAdmin.from('notifications').insert({
          user_id: adminUserId,
          type: 'system',
          title: '【管理】AIフラグ検知',
          message: `AIが不適切な可能性のある画像を検知しました: ${decision.flagType}${quarantined ? '（隔離済み）' : '（隔離に失敗）'}`,
          data: { kind: 'ai_flag', message_id: message.id },
        })
        if (adminNotifError) {
          console.error('[moderate-chat-image] 管理者通知エラー:', adminNotifError.message)
        }
      }
    }

    return json({ ok: true, result: decision.action === 'quarantine' ? 'quarantined' : 'recorded', quarantined, flagged })
  } catch (e) {
    console.error('[moderate-chat-image] unexpected error:', e instanceof Error ? e.message : 'unknown')
    return json({ ok: false }, 500)
  }
}
