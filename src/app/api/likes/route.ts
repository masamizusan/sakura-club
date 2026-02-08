import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { notificationService } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

/**
 * POST /api/likes
 *
 * いいね送信のゲートAPI（方針C: 1日10回制限 + マッチング処理統合）
 *
 * 処理フロー:
 * 1. 認証チェック（auth.uid()を使用、リクエストからuserIdを受け取らない）
 * 2. 1日10回制限チェック（Asia/Tokyo基準）
 * 3. 既存matches相当の処理（matches更新＆マッチ判定）
 * 4. 成功後にlikesテーブルにinsert（カウント記録）
 *
 * Request body: { likedUserId: string, action?: 'like' | 'pass' }
 *
 * @returns
 *   - 200: { success: true, matched: boolean, remaining: number }
 *   - 429: 1日の上限に達した場合
 *   - 400: バリデーションエラー
 *   - 401: 認証エラー
 */

const DAILY_LIMIT = 10

/**
 * Asia/Tokyo基準で今日の開始時刻（UTC）を取得
 */
function getTodayStartUTC(): Date {
  const now = new Date()
  const jstOffset = 9 * 60 * 60 * 1000
  const jstNow = new Date(now.getTime() + jstOffset)
  const jstYear = jstNow.getUTCFullYear()
  const jstMonth = jstNow.getUTCMonth()
  const jstDate = jstNow.getUTCDate()
  const todayStartJST = new Date(Date.UTC(jstYear, jstMonth, jstDate, 0, 0, 0, 0))
  const todayStartUTC = new Date(todayStartJST.getTime() - jstOffset)
  return todayStartUTC
}

export async function POST(request: NextRequest) {
  try {
    // ===== 1. 認証 =====
    const authHeader = request.headers.get('Authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    let supabase
    let authUser

    if (bearerToken) {
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${bearerToken}` } } }
      )
      const result = await supabase.auth.getUser(bearerToken)
      authUser = result.data?.user
      if (result.error || !authUser) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
      }
    } else {
      supabase = createServerClient(request)
      const result = await supabase.auth.getUser()
      authUser = result.data?.user
      if (result.error || !authUser) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
      }
    }

    const likerId = authUser.id

    // ===== 2. リクエストボディ取得・バリデーション =====
    const body = await request.json()
    const { likedUserId, action = 'like' } = body

    if (!likedUserId || typeof likedUserId !== 'string') {
      return NextResponse.json({ error: 'likedUserIdが必要です' }, { status: 400 })
    }

    if (action !== 'like' && action !== 'pass') {
      return NextResponse.json({ error: 'actionは"like"または"pass"を指定してください' }, { status: 400 })
    }

    // 自分自身へのいいね防止
    if (likedUserId === likerId) {
      return NextResponse.json({ error: '自分自身にいいねはできません' }, { status: 400 })
    }

    // UUIDフォーマットチェック
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(likedUserId)) {
      return NextResponse.json({ error: '無効なユーザーIDです' }, { status: 400 })
    }

    // ===== 3. 1日10回制限チェック（likeの場合のみ） =====
    const todayStartUTC = getTodayStartUTC()
    let remaining = DAILY_LIMIT

    if (action === 'like') {
      const { count, error: countError } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('liker_id', likerId)
        .gte('created_at', todayStartUTC.toISOString())

      if (countError) {
        console.error('[likes] count error:', countError)
        // likesテーブルがまだない場合はカウント0として続行
        if (countError.code !== 'PGRST116' && !countError.message?.includes('does not exist')) {
          return NextResponse.json({ error: 'いいね数の取得に失敗しました' }, { status: 500 })
        }
      }

      const used = count || 0
      remaining = Math.max(0, DAILY_LIMIT - used)

      if (used >= DAILY_LIMIT) {
        return NextResponse.json({
          error: '今日のいいね上限（10回）に達しました',
          remaining: 0,
          used,
          limit: DAILY_LIMIT
        }, { status: 429 })
      }
    }

    // ===== 4. 対象ユーザー存在チェック =====
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('id, name, first_name, last_name')
      .eq('id', likedUserId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: '対象のユーザーが見つかりません' }, { status: 404 })
    }

    // ===== 5. 既存アクションチェック（matchesテーブル） =====
    const { data: existingAction, error: existingError } = await supabase
      .from('matches')
      .select('*')
      .eq('liker_user_id', likerId)
      .eq('liked_user_id', likedUserId)
      .single()

    if (!existingError && existingAction) {
      return NextResponse.json(
        { error: 'このユーザーには既にアクションを実行済みです', remaining },
        { status: 400 }
      )
    }

    // ===== 6. パスの場合 =====
    if (action === 'pass') {
      const { error: passError } = await supabase
        .from('matches')
        .insert({
          liker_user_id: likerId,
          liked_user_id: likedUserId,
          action: 'pass',
          created_at: new Date().toISOString()
        })

      if (passError) {
        console.error('[likes] pass action error:', passError)
        return NextResponse.json({ error: 'パス処理に失敗しました' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'パスしました',
        matched: false,
        remaining // passはカウントしないのでremainingは変わらない
      })
    }

    // ===== 7. いいねの場合: マッチ判定 =====
    const { data: mutualLike, error: mutualError } = await supabase
      .from('matches')
      .select('*')
      .eq('liker_user_id', likedUserId)
      .eq('liked_user_id', likerId)
      .eq('action', 'like')
      .single()

    const isMatched = !mutualError && mutualLike

    // ===== 8. matchesテーブルにいいね記録 =====
    const { error: likeError } = await supabase
      .from('matches')
      .insert({
        liker_user_id: likerId,
        liked_user_id: likedUserId,
        action: 'like',
        is_matched: isMatched,
        matched_at: isMatched ? new Date().toISOString() : null,
        created_at: new Date().toISOString()
      })

    if (likeError) {
      console.error('[likes] like action error:', likeError)
      return NextResponse.json({ error: 'いいね処理に失敗しました' }, { status: 500 })
    }

    // ===== 9. マッチした場合の追加処理 =====
    if (isMatched) {
      // 相手のレコードも更新
      const { error: updateMutualError } = await supabase
        .from('matches')
        .update({
          is_matched: true,
          matched_at: new Date().toISOString(),
          matched_user_id: likerId
        })
        .eq('liker_user_id', likedUserId)
        .eq('liked_user_id', likerId)

      if (updateMutualError) {
        console.error('[likes] mutual match update error:', updateMutualError)
      }

      // コンバセーション作成
      const { error: conversationError } = await supabase
        .from('conversations')
        .insert({
          user1_id: likerId < likedUserId ? likerId : likedUserId,
          user2_id: likerId < likedUserId ? likedUserId : likerId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (conversationError) {
        console.error('[likes] conversation creation error:', conversationError)
      }

      // 通知送信
      try {
        const { data: currentUserProfile } = await supabase
          .from('profiles')
          .select('name, first_name, last_name')
          .eq('id', likerId)
          .single()

        if (currentUserProfile && targetUser) {
          const currentUserName = currentUserProfile.name ||
            `${currentUserProfile.first_name || ''} ${currentUserProfile.last_name || ''}`.trim() ||
            'ユーザー'
          const targetUserName = targetUser.name ||
            `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() ||
            'ユーザー'

          // 相手に通知
          await notificationService.createMatchNotification(
            likedUserId,
            currentUserName,
            likerId,
            request
          )

          // 自分に通知
          await notificationService.createMatchNotification(
            likerId,
            targetUserName,
            likedUserId,
            request
          )
        }
      } catch (notifyError) {
        console.error('[likes] notification error:', notifyError)
        // 通知失敗はエラーにしない
      }
    }

    // ===== 10. likesテーブルにカウント記録（成功後） =====
    try {
      const { error: likesInsertError } = await supabase
        .from('likes')
        .insert({
          liker_id: likerId,
          liked_user_id: likedUserId
        })

      if (likesInsertError) {
        // likesテーブルへの記録失敗はエラーログのみ（matches処理は成功しているため）
        console.error('[likes] likes table insert error:', likesInsertError)
      }
    } catch (likesError) {
      console.error('[likes] likes table error:', likesError)
    }

    // remaining を更新（いいね成功したので-1）
    const newRemaining = Math.max(0, remaining - 1)

    console.log('[likes] success:', {
      likerId: likerId.slice(0, 8),
      likedUserId: likedUserId.slice(0, 8),
      matched: isMatched,
      remaining: newRemaining
    })

    return NextResponse.json({
      success: true,
      message: isMatched ? 'マッチしました！' : 'いいねしました',
      matched: isMatched,
      remaining: newRemaining,
      limit: DAILY_LIMIT
    })

  } catch (error) {
    console.error('[likes] unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
