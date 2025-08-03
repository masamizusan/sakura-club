import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notificationService } from '@/lib/notifications'
import { z } from 'zod'

// いいねのスキーマ
const likeSchema = z.object({
  likedUserId: z.string().uuid('有効なユーザーIDを指定してください'),
  action: z.enum(['like', 'pass'], { required_error: 'アクションを指定してください' })
})

// POST: いいね・パスの処理
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // リクエストボディの解析
    const body = await request.json()
    
    // バリデーション
    const validationResult = likeSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'バリデーションエラー',
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { likedUserId, action } = validationResult.data

    // 自分自身にいいねしようとしていないかチェック
    if (likedUserId === user.id) {
      return NextResponse.json(
        { error: '自分自身にいいねすることはできません' },
        { status: 400 }
      )
    }

    // 対象ユーザーが存在するかチェック
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', likedUserId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: '対象のユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 既存のアクションをチェック
    const { data: existingAction, error: existingError } = await supabase
      .from('matches')
      .select('*')
      .eq('liker_user_id', user.id)
      .eq('liked_user_id', likedUserId)
      .single()

    if (!existingError && existingAction) {
      return NextResponse.json(
        { error: 'このユーザーには既にアクションを実行済みです' },
        { status: 400 }
      )
    }

    if (action === 'pass') {
      // パスの場合は記録のみ（マッチ判定不要）
      const { error: passError } = await supabase
        .from('matches')
        .insert({
          liker_user_id: user.id,
          liked_user_id: likedUserId,
          action: 'pass',
          created_at: new Date().toISOString()
        })

      if (passError) {
        console.error('Pass action error:', passError)
        return NextResponse.json(
          { error: 'パス処理に失敗しました' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'パスしました',
        matched: false
      })
    }

    // いいねの場合
    if (action === 'like') {
      // 相手が自分にいいねしているかチェック
      const { data: mutualLike, error: mutualError } = await supabase
        .from('matches')
        .select('*')
        .eq('liker_user_id', likedUserId)
        .eq('liked_user_id', user.id)
        .eq('action', 'like')
        .single()

      const isMatched = !mutualError && mutualLike

      // いいねの記録
      const { error: likeError } = await supabase
        .from('matches')
        .insert({
          liker_user_id: user.id,
          liked_user_id: likedUserId,
          action: 'like',
          is_matched: isMatched,
          matched_at: isMatched ? new Date().toISOString() : null,
          created_at: new Date().toISOString()
        })

      if (likeError) {
        console.error('Like action error:', likeError)
        return NextResponse.json(
          { error: 'いいね処理に失敗しました' },
          { status: 500 }
        )
      }

      // マッチした場合は相手の記録も更新
      if (isMatched) {
        const { error: updateMutualError } = await supabase
          .from('matches')
          .update({
            is_matched: true,
            matched_at: new Date().toISOString(),
            matched_user_id: user.id
          })
          .eq('liker_user_id', likedUserId)
          .eq('liked_user_id', user.id)

        if (updateMutualError) {
          console.error('Mutual match update error:', updateMutualError)
        }

        // マッチ通知用のコンバセーション作成
        const { error: conversationError } = await supabase
          .from('conversations')
          .insert({
            user1_id: user.id < likedUserId ? user.id : likedUserId,
            user2_id: user.id < likedUserId ? likedUserId : user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (conversationError) {
          console.error('Conversation creation error:', conversationError)
        }

        // 現在のユーザー情報を取得
        const { data: currentUserProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single()

        // 両方のユーザーにマッチ通知を送信
        if (currentUserProfile && targetUser) {
          // 相手に通知
          await notificationService.createMatchNotification(
            likedUserId,
            `${currentUserProfile.first_name} ${currentUserProfile.last_name}`,
            user.id
          )

          // 自分に通知
          await notificationService.createMatchNotification(
            user.id,
            `${targetUser.first_name} ${targetUser.last_name}`,
            likedUserId
          )
        }
      }

      return NextResponse.json({
        message: isMatched ? 'マッチしました！' : 'いいねしました',
        matched: isMatched,
        matchId: isMatched ? `${Math.min(parseInt(user.id), parseInt(likedUserId))}_${Math.max(parseInt(user.id), parseInt(likedUserId))}` : null
      })
    }

  } catch (error) {
    console.error('Like POST error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}