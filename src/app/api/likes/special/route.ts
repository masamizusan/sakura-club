import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { notificationService } from '@/lib/notifications'
import { requireActiveProfile } from '@/lib/auth/requireActiveProfile'
import { moderateSpecialMessage } from '@/lib/moderation/moderateSpecialMessage'
import { translateToJapanese } from '@/lib/translation/translateToJapanese'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

/**
 * POST /api/likes/special
 *
 * さくらいいね送信（段階3-3）
 *
 * 1. 認証・停止チェック・入力検証
 * 2. 一言メッセージがある場合: 送信資格（年齢確認済み＋有料会員）→ 事前確認（#26）→ AI 審査 → 日本語翻訳
 *    （審査で止められた／審査・翻訳ができなかった場合は送信せず、回数券も消費しない）
 *    事前確認：マッチ済み・さくらいいね済み・回数券なしなら、OpenAI を呼ぶ前に返す（読み取りのみ。最終判断は 3）
 * 3. send_like_internal（service_role のみ実行可）を p_sender = ログインユーザーで呼ぶ
 *    回数券の消費・格上げ・メッセージ条件の再確認・マッチ判定は DB 関数側で 1 トランザクション
 * 4. 通知（matched: 双方にマッチ通知 / liked・upgraded: 相手にさくらいいね通知）
 *
 * Request body: { likedUserId: string, message?: string }
 */

type SendLikeResult = {
  ok: boolean
  code: string
  matched?: boolean
  is_special?: boolean
  remaining?: number
  limit?: number
  conversation_id?: string | null
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MESSAGE_MAX_LENGTH = 100

function errorResponse(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status, headers: noCacheHeaders })
}

// send_like_internal の失敗コード → レスポンス（#26：事前確認でも同じ形で返すため共通化）
function sendLikeFailureResponse(code: string) {
  switch (code) {
    case 'no_tickets':
      return errorResponse('さくらいいねの残りがありません', code, 402)
    case 'already_special':
      return errorResponse('すでにさくらいいねを送っています', code, 409)
    case 'already_matched':
      return errorResponse('既にマッチしています', code, 400)
    case 'target_unavailable':
      return errorResponse('対象のユーザーが見つかりません', code, 404)
    case 'profile_incomplete':
      return errorResponse('プロフィールを完成させてください', code, 403)
    case 'message_not_allowed':
      return errorResponse('一言メッセージは年齢確認済みの有料プラン会員のみ送れます', code, 403)
    case 'message_too_long':
      return errorResponse('メッセージは100文字以内で入力してください', code, 400)
    case 'invalid_message':
      return errorResponse('無効なメッセージです', code, 400)
    case 'invalid_target':
      return errorResponse('無効なユーザーIDです', code, 400)
    case 'auth_required':
      return errorResponse('Authentication required', code, 401)
    default:
      console.error('[likes/special] send_like_internal unknown failure code:', code)
      return errorResponse('いいね処理に失敗しました', 'internal_error', 500)
  }
}

// #26: 回数の制限（メモリ上・サーバーの再起動で戻る。翻訳 API と同じ方式）
// 一言メッセージ付きは 1 回ごとに OpenAI を 2 回呼ぶため、連打・直接の呼び出しによる費用に上限を設ける
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10 // requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false
  }

  userLimit.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()

    // ===== 1. 認証 =====
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() { /* Route Handlerでは不要 */ },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return errorResponse('Authentication required', 'auth_required', 401)
    }

    // memory #1 の 2 層防御: suspended ユーザーをここで弾く
    const guard = await requireActiveProfile(user.id)
    if (!guard.ok) {
      return NextResponse.json(
        { error: guard.message, code: guard.code },
        { status: guard.httpStatus, headers: noCacheHeaders }
      )
    }

    const senderId = user.id

    // #26: 回数の制限（入力の確認より前）
    if (!checkRateLimit(senderId)) {
      console.warn('[likes/special] rate limit exceeded for user:', senderId.slice(0, 8))
      return errorResponse('しばらく待ってから、もう一度お試しください', 'rate_limited', 429)
    }

    // ===== 2. 入力検証 =====
    const body = await request.json().catch(() => ({}))
    const { likedUserId } = body ?? {}

    if (!likedUserId || typeof likedUserId !== 'string' || !uuidRegex.test(likedUserId) || likedUserId === senderId) {
      return errorResponse('無効なユーザーIDです', 'invalid_target', 400)
    }

    const rawMessage = typeof body?.message === 'string' ? body.message.trim() : ''
    const message: string | null = rawMessage === '' ? null : rawMessage

    // DB の char_length と同じくコードポイント単位で数える（絵文字も1文字）
    if (message && Array.from(message).length > MESSAGE_MAX_LENGTH) {
      return errorResponse('メッセージは100文字以内で入力してください', 'message_too_long', 400)
    }

    // ===== 3. 一言メッセージ: 送信資格 → AI 審査 → 日本語翻訳 =====
    let messageJa: string | null = null
    if (message) {
      const [{ data: myProfile, error: myProfileError }, { data: activeSub, error: subError }] = await Promise.all([
        supabase.from('profiles').select('verification_status').eq('id', senderId).maybeSingle(),
        supabase.from('subscriptions').select('id').eq('user_id', senderId).eq('status', 'active').maybeSingle(),
      ])

      if (myProfileError || subError) {
        console.error('[likes/special] eligibility check error:', myProfileError?.message ?? subError?.message)
        return errorResponse('いいね処理に失敗しました', 'internal_error', 500)
      }
      if (myProfile?.verification_status !== 'approved' || !activeSub) {
        return errorResponse('一言メッセージは年齢確認済みの有料プラン会員のみ送れます', 'message_not_allowed', 403)
      }

      // #26: 事前確認（読み取りのみ）。OpenAI を呼ぶ前に、送れないと分かるものを返す
      // 判定の順は send_like_internal と同じ（マッチ済み → さくらいいね済み → 回数券なし）。返す形も同じ
      // 問い合わせに失敗したときは弾かずに先へ進む（最終判断は send_like_internal）
      // 自分の likes は RLS（likes_select_own_sent）で読める。matches も自分の参加分は読める
      const targetId = likedUserId.toLowerCase()
      const [user1Id, user2Id] = senderId < targetId ? [senderId, targetId] : [targetId, senderId]
      const [balanceResult, sentLikeResult, matchResult] = await Promise.all([
        supabase.rpc('get_sakura_balance'),
        supabase.from('likes').select('is_special').eq('liker_id', senderId).eq('liked_user_id', targetId).maybeSingle(),
        supabase.from('matches').select('status').eq('user1_id', user1Id).eq('user2_id', user2Id).maybeSingle(),
      ])

      if (matchResult.error) {
        console.error('[likes/special] precheck match error:', matchResult.error.message)
      } else if (matchResult.data?.status === 'matched') {
        return sendLikeFailureResponse('already_matched')
      }

      if (sentLikeResult.error) {
        console.error('[likes/special] precheck like error:', sentLikeResult.error.message)
      } else if (sentLikeResult.data?.is_special === true) {
        return sendLikeFailureResponse('already_special')
      }

      if (balanceResult.error || !balanceResult.data) {
        console.error('[likes/special] precheck balance error:', balanceResult.error?.message)
      } else if (Number((balanceResult.data as { balance?: unknown }).balance ?? 0) <= 0) {
        return sendLikeFailureResponse('no_tickets')
      }

      const moderation = await moderateSpecialMessage(message)
      if (!moderation.ok) {
        return errorResponse('現在メッセージを確認できません', 'moderation_unavailable', 503)
      }
      if (moderation.flagged) {
        console.log('[likes/special] message rejected by moderation:', { category: moderation.category, score: moderation.score })
        // #66: マッチ前のさくらいいねでは連絡先を送れない（理由が分かる文を画面で出すため、コードを分ける）
        if (moderation.category === 'contact_exchange') {
          return errorResponse('マッチ前のさくらいいねには連絡先を書けません', 'contact_not_allowed', 422)
        }
        return errorResponse('このメッセージは送信できません', 'message_rejected', 422)
      }

      messageJa = await translateToJapanese(message)
      if (messageJa === null) {
        return errorResponse('現在メッセージを確認できません', 'translation_unavailable', 503)
      }
    }

    // ===== 4. さくらいいね送信（DB 関数。service_role のみ実行可） =====
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error: rpcError } = await supabaseAdmin.rpc('send_like_internal', {
      p_sender: senderId,
      p_target: likedUserId,
      p_is_special: true,
      p_message: message,
      p_message_ja: messageJa,
    })

    if (rpcError || !data) {
      console.error('[likes/special] send_like_internal rpc error:', rpcError?.message)
      return errorResponse('いいね処理に失敗しました', 'internal_error', 500)
    }

    const result = data as SendLikeResult

    // ===== 5. 失敗時のレスポンス対応 =====
    if (!result.ok) {
      return sendLikeFailureResponse(result.code)
    }

    if (result.code !== 'liked' && result.code !== 'matched' && result.code !== 'upgraded') {
      console.error('[likes/special] send_like_internal unknown success code:', result.code)
      return errorResponse('いいね処理に失敗しました', 'internal_error', 500)
    }

    const isMatched = result.code === 'matched'

    // ===== 6. 通知（失敗はログのみ） =====
    try {
      const [{ data: currentUserProfile }, { data: targetUser }] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', senderId).maybeSingle(),
        supabase.from('profiles_public').select('name').eq('id', likedUserId).maybeSingle(),
      ])
      const currentUserName = currentUserProfile?.name || 'ユーザー'
      const targetUserName = targetUser?.name || 'ユーザー'

      if (isMatched) {
        await notificationService.createMatchNotification(likedUserId, currentUserName, senderId, request)
        await notificationService.createMatchNotification(senderId, targetUserName, likedUserId, request)
      } else {
        await notificationService.createSakuraLikeNotification(likedUserId, currentUserName, senderId, request)
      }
    } catch (notifyError) {
      console.error('[likes/special] notification error:', notifyError)
    }

    return NextResponse.json({
      success: true,
      code: result.code,
      matched: isMatched,
      isSpecial: true,
      remaining: result.remaining,
      limit: result.limit,
      conversationId: isMatched ? (result.conversation_id ?? null) : null,
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error('[likes/special] unexpected error:', error)
    return errorResponse('予期しないエラーが発生しました', 'internal_error', 500)
  }
}
