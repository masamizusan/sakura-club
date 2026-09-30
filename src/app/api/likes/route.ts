import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { notificationService } from '@/lib/notifications'
import { requireActiveProfile } from '@/lib/auth/requireActiveProfile'

// 完全に動的（キャッシュ無効）
export const dynamic = 'force-dynamic'
export const revalidate = 0

// no-cacheヘッダー
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

/**
 * POST /api/likes
 *
 * いいね送信のゲートAPI（段階2-B: DB 関数 send_like に一本化）
 *
 * send_like（SECURITY DEFINER）が 1 トランザクションで以下を実行する:
 *   送信者・相手の条件確認 → 1日上限 → likes 記録 →
 *   matches 更新（両方向のいいねがあるときだけ matched）→
 *   マッチ時は相手のいいねを既読化し conversations を作成
 * API 側はレスポンスの対応づけと、マッチ時の通知送信のみ行う。
 *
 * Request body: { likedUserId: string, action?: 'like' }
 */

type SendLikeResult = {
  ok: boolean
  code: string
  matched?: boolean
  remaining?: number
  limit?: number
  conversation_id?: string | null
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
      return NextResponse.json(
        { error: 'Authentication required', code: 'auth_required' },
        { status: 401, headers: noCacheHeaders }
      )
    }

    // memory #1 の 2 層防御: suspended ユーザーをここで弾く (指示書 #31)
    const guard = await requireActiveProfile(user.id)
    if (!guard.ok) {
      return NextResponse.json(
        { error: guard.message, code: guard.code },
        { status: guard.httpStatus }
      )
    }

    const likerId = user.id

    // ===== 2. リクエストボディ取得・バリデーション =====
    const body = await request.json()
    const { likedUserId, action = 'like' } = body

    if (!likedUserId || typeof likedUserId !== 'string') {
      return NextResponse.json({ error: 'likedUserIdが必要です', code: 'invalid_target' }, { status: 400, headers: noCacheHeaders })
    }

    // pass は廃止（段階2-B）。like 以外は受け付けない
    if (action !== 'like') {
      return NextResponse.json({ error: 'actionは"like"のみ指定できます', code: 'unsupported_action' }, { status: 400, headers: noCacheHeaders })
    }

    if (likedUserId === likerId) {
      return NextResponse.json({ error: '自分自身にいいねはできません', code: 'invalid_target' }, { status: 400, headers: noCacheHeaders })
    }

    if (!uuidRegex.test(likedUserId)) {
      return NextResponse.json({ error: '無効なユーザーIDです', code: 'invalid_target' }, { status: 400, headers: noCacheHeaders })
    }

    // ===== 3. いいね送信（DB 関数） =====
    const { data, error: rpcError } = await supabase.rpc('send_like', { p_target: likedUserId })

    if (rpcError || !data) {
      console.error('[likes] send_like rpc error:', rpcError?.message)
      return NextResponse.json(
        { error: 'いいね処理に失敗しました', code: 'internal_error' },
        { status: 500, headers: noCacheHeaders }
      )
    }

    const result = data as SendLikeResult

    // ===== 4. 失敗時のレスポンス対応 =====
    if (!result.ok) {
      switch (result.code) {
        case 'daily_limit':
          return NextResponse.json(
            { error: '今日のいいね上限に達しました', code: result.code, remaining: 0, limit: result.limit },
            { status: 429, headers: noCacheHeaders }
          )
        case 'already_matched':
          return NextResponse.json(
            { error: '既にマッチしています', code: result.code, remaining: result.remaining },
            { status: 400, headers: noCacheHeaders }
          )
        case 'target_unavailable':
          return NextResponse.json(
            { error: '対象のユーザーが見つかりません', code: result.code },
            { status: 404, headers: noCacheHeaders }
          )
        case 'profile_incomplete':
          return NextResponse.json(
            { error: 'プロフィールを完成させてください', code: result.code },
            { status: 403, headers: noCacheHeaders }
          )
        case 'invalid_target':
          return NextResponse.json(
            { error: '無効なユーザーIDです', code: result.code },
            { status: 400, headers: noCacheHeaders }
          )
        case 'auth_required':
          return NextResponse.json(
            { error: 'Authentication required', code: result.code },
            { status: 401, headers: noCacheHeaders }
          )
        default:
          console.error('[likes] send_like unknown failure code:', result.code)
          return NextResponse.json(
            { error: 'いいね処理に失敗しました', code: 'internal_error' },
            { status: 500, headers: noCacheHeaders }
          )
      }
    }

    // ===== 5. 成功時のレスポンス対応 =====
    if (result.code === 'already_liked') {
      return NextResponse.json({
        success: true,
        alreadyLiked: true,
        matched: false,
        remaining: result.remaining,
        limit: result.limit,
        conversationId: null,
        code: result.code,
      }, { headers: noCacheHeaders })
    }

    const isMatched = result.code === 'matched'

    // マッチ成立時のみ双方に通知（失敗はログのみ）
    if (isMatched) {
      try {
        const [{ data: currentUserProfile }, { data: targetUser }] = await Promise.all([
          supabase.from('profiles').select('name').eq('id', likerId).maybeSingle(),
          supabase.from('profiles_public').select('name').eq('id', likedUserId).maybeSingle(),
        ])

        const currentUserName = currentUserProfile?.name || 'ユーザー'
        const targetUserName = targetUser?.name || 'ユーザー'

        await notificationService.createMatchNotification(likedUserId, currentUserName, likerId, request)
        await notificationService.createMatchNotification(likerId, targetUserName, likedUserId, request)
      } catch (notifyError) {
        console.error('[likes] notification error:', notifyError)
      }
    }

    return NextResponse.json({
      success: true,
      message: isMatched ? 'マッチしました！' : 'いいねしました',
      matched: isMatched,
      remaining: result.remaining,
      limit: result.limit,
      // マッチ成立モーダルの「メッセージを送る」CTA 遷移用。matched=false 時は null
      conversationId: isMatched ? (result.conversation_id ?? null) : null,
      code: result.code,
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error('[likes] unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', code: 'internal_error' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
