import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { notificationService } from '@/lib/notifications'

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
 * いいね送信のゲートAPI（方針C: 1日10回制限 + マッチング処理統合）
 *
 * DBスキーマ（matches テーブル）:
 *   - user1_id: 小さいIDを常に入れる（順序固定）
 *   - user2_id: 大きいIDを常に入れる（順序固定）
 *   - status: 'pending' | 'matched' | 'rejected'
 *
 * 処理フロー:
 * 1. 認証チェック（auth.uid()を使用）
 * 2. 1日10回制限チェック（Asia/Tokyo基準）
 * 3. matches テーブルに記録（user1_id/user2_id 順序固定）
 * 4. 相互いいね判定 → マッチならstatus='matched' + conversations作成
 *
 * Request body: { likedUserId: string, action?: 'like' | 'pass' }
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

/**
 * user1_id / user2_id を順序固定で返す（小さい方がuser1_id）
 */
function getOrderedUserIds(idA: string, idB: string): { user1_id: string; user2_id: string } {
  if (idA < idB) {
    return { user1_id: idA, user2_id: idB }
  } else {
    return { user1_id: idB, user2_id: idA }
  }
}

export async function POST(request: NextRequest) {
  console.log('🚀 [likes] API started')

  try {
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    const hasSbCookies = allCookies.some(c => c.name.startsWith('sb-'))

    console.log('🍪 [likes] Cookies:', { count: allCookies.length, hasSbCookies })

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

    console.log('🔐 [likes] Auth:', { hasUser: !!user, userId: user?.id?.slice(0, 8), error: authError?.message })

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: noCacheHeaders })
    }

    const likerId = user.id

    // ===== 2. リクエストボディ取得・バリデーション =====
    const body = await request.json()
    const { likedUserId, action = 'like' } = body

    if (!likedUserId || typeof likedUserId !== 'string') {
      return NextResponse.json({ error: 'likedUserIdが必要です' }, { status: 400 })
    }

    if (action !== 'like' && action !== 'pass') {
      return NextResponse.json({ error: 'actionは"like"または"pass"を指定してください' }, { status: 400 })
    }

    if (likedUserId === likerId) {
      return NextResponse.json({ error: '自分自身にいいねはできません' }, { status: 400 })
    }

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

      if (countError && countError.code !== 'PGRST116' && !countError.message?.includes('does not exist')) {
        console.error('[likes] count error:', countError)
        return NextResponse.json({ error: 'いいね数の取得に失敗しました' }, { status: 500 })
      }

      const used = count || 0
      remaining = Math.max(0, DAILY_LIMIT - used)

      if (used >= DAILY_LIMIT) {
        return NextResponse.json({
          error: '今日のいいね上限（10回）に達しました',
          remaining: 0,
          limit: DAILY_LIMIT
        }, { status: 429 })
      }
    }

    // ===== 4. 対象ユーザー存在チェック =====
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('id, name, profile_initialized')
      .eq('id', likedUserId)
      .single()

    console.log('🎯 [likes] Target user:', {
      likedUserId: likedUserId.slice(0, 8),
      found: !!targetUser,
      error: targetError?.message
    })

    if (targetError || !targetUser) {
      return NextResponse.json({
        error: '対象のユーザーが見つかりません',
        debug: { likedUserId, errorMessage: targetError?.message, errorCode: targetError?.code }
      }, { status: 404 })
    }

    // ===== 5. user1_id / user2_id を順序固定で取得 =====
    const { user1_id, user2_id } = getOrderedUserIds(likerId, likedUserId)
    const isLikerUser1 = likerId === user1_id

    console.log('🔗 [likes] Ordered IDs:', {
      user1_id: user1_id.slice(0, 8),
      user2_id: user2_id.slice(0, 8),
      isLikerUser1
    })

    // ===== 6. 既存マッチレコードをチェック =====
    const { data: existingMatch, error: existingError } = await supabase
      .from('matches')
      .select('*')
      .eq('user1_id', user1_id)
      .eq('user2_id', user2_id)
      .maybeSingle()

    if (existingError) {
      console.error('[likes] existing match check error:', existingError)
      return NextResponse.json({ error: 'マッチ情報の取得に失敗しました' }, { status: 500 })
    }

    // ===== 7. パスの場合 =====
    if (action === 'pass') {
      if (existingMatch) {
        // 既存レコードがある場合はrejectedに更新
        const { error: updateError } = await supabase
          .from('matches')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('id', existingMatch.id)

        if (updateError) {
          console.error('[likes] pass update error:', updateError)
          return NextResponse.json({ error: 'パス処理に失敗しました' }, { status: 500 })
        }
      } else {
        // 新規レコード作成
        const { error: insertError } = await supabase
          .from('matches')
          .insert({
            user1_id,
            user2_id,
            status: 'rejected',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('[likes] pass insert error:', insertError)
          return NextResponse.json({ error: 'パス処理に失敗しました' }, { status: 500 })
        }
      }

      return NextResponse.json({ message: 'パスしました', matched: false, remaining })
    }

    // ===== 8. いいねの場合 =====
    let isMatched = false

    if (existingMatch) {
      // 既存レコードがある場合
      if (existingMatch.status === 'matched') {
        return NextResponse.json({ error: '既にマッチしています', remaining }, { status: 400 })
      }

      if (existingMatch.status === 'pending') {
        // 相手が先にいいねしていた → マッチ成立！
        isMatched = true
        const { error: updateError } = await supabase
          .from('matches')
          .update({ status: 'matched', updated_at: new Date().toISOString() })
          .eq('id', existingMatch.id)

        if (updateError) {
          console.error('[likes] match update error:', updateError)
          return NextResponse.json({ error: 'マッチ処理に失敗しました' }, { status: 500 })
        }
      } else {
        // status が rejected だった場合 → pending に戻す（再いいね）
        const { error: updateError } = await supabase
          .from('matches')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', existingMatch.id)

        if (updateError) {
          console.error('[likes] relike update error:', updateError)
          return NextResponse.json({ error: 'いいね処理に失敗しました' }, { status: 500 })
        }
      }
    } else {
      // 新規レコード作成（片思い状態）
      const { error: insertError } = await supabase
        .from('matches')
        .insert({
          user1_id,
          user2_id,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('[likes] like insert error:', insertError)
        return NextResponse.json({ error: 'いいね処理に失敗しました' }, { status: 500 })
      }
    }

    // ===== 9. マッチした場合の追加処理 =====
    if (isMatched) {
      console.log('💕 [likes] Match created!')

      // conversations 作成（is_seen を明示的に false に設定）
      const now = new Date().toISOString()
      const { error: conversationError } = await supabase
        .from('conversations')
        .insert({
          user1_id,
          user2_id,
          is_seen_user1: false,
          is_seen_user2: false,
          created_at: now,
          updated_at: now
        })

      if (conversationError) {
        // 既存会話がある場合（重複エラー）→ is_seen を false にリセット
        await supabase
          .from('conversations')
          .update({ is_seen_user1: false, is_seen_user2: false, updated_at: now })
          .eq('user1_id', user1_id)
          .eq('user2_id', user2_id)
      }

      // 通知送信
      try {
        const { data: currentUserProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', likerId)
          .single()

        if (currentUserProfile && targetUser) {
          const currentUserName = currentUserProfile.name || 'ユーザー'
          const targetUserName = targetUser.name || 'ユーザー'

          await notificationService.createMatchNotification(likedUserId, currentUserName, likerId, request)
          await notificationService.createMatchNotification(likerId, targetUserName, likedUserId, request)
        }
      } catch (notifyError) {
        console.error('[likes] notification error:', notifyError)
      }
    }

    // ===== 10. likesテーブルにカウント記録 =====
    try {
      await supabase.from('likes').insert({ liker_id: likerId, liked_user_id: likedUserId })
    } catch (likesError) {
      console.error('[likes] likes table error:', likesError)
    }

    const newRemaining = Math.max(0, remaining - 1)

    console.log('✅ [likes] Success:', {
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
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error('[likes] unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500, headers: noCacheHeaders })
  }
}
