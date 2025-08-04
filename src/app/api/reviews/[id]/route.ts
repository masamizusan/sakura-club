import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// レビュー更新のスキーマ
const updateReviewSchema = z.object({
  rating: z.number().min(1, '評価は1以上で入力してください').max(5, '評価は5以下で入力してください').optional(),
  review_text: z.string().optional(),
  is_anonymous: z.boolean().optional(),
})

// GET: 個別レビュー取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(request)
    const reviewId = params.id

    // レビューの取得
    const { data: review, error } = await supabase
      .from('experience_reviews')
      .select(`
        *,
        reviewer:profiles!experience_reviews_reviewer_id_fkey(
          id,
          first_name,
          last_name,
          profile_image
        ),
        experience:experiences!experience_reviews_experience_id_fkey(
          id,
          title,
          date
        )
      `)
      .eq('id', reviewId)
      .single()

    if (error || !review) {
      return NextResponse.json(
        { error: 'レビューが見つかりません' },
        { status: 404 }
      )
    }

    // フロントエンド用のデータ形式に変換
    const formattedReview = {
      id: review.id,
      experienceId: review.experience_id,
      experienceTitle: review.experience?.title,
      experienceDate: review.experience?.date,
      reviewerId: review.reviewer_id,
      reviewerName: review.is_anonymous 
        ? '匿名ユーザー' 
        : `${review.reviewer?.first_name || ''} ${review.reviewer?.last_name || ''}`.trim(),
      reviewerImage: review.is_anonymous ? null : review.reviewer?.profile_image,
      rating: review.rating,
      reviewText: review.review_text,
      isAnonymous: review.is_anonymous,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    }

    return NextResponse.json(formattedReview)

  } catch (error) {
    console.error('Review GET error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PUT: レビュー更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(request)
    const reviewId = params.id
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 既存のレビューを確認
    const { data: existingReview, error: fetchError } = await supabase
      .from('experience_reviews')
      .select('*')
      .eq('id', reviewId)
      .eq('reviewer_id', user.id)
      .single()

    if (fetchError || !existingReview) {
      return NextResponse.json(
        { error: 'レビューが見つからないか、編集権限がありません' },
        { status: 404 }
      )
    }

    // リクエストボディの解析
    const body = await request.json()
    
    // バリデーション
    const validationResult = updateReviewSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'バリデーションエラー',
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const updateData = {
      ...validationResult.data,
      updated_at: new Date().toISOString(),
    }

    // レビューの更新
    const { data: updatedReview, error: updateError } = await supabase
      .from('experience_reviews')
      .update(updateData)
      .eq('id', reviewId)
      .eq('reviewer_id', user.id)
      .select(`
        *,
        reviewer:profiles!experience_reviews_reviewer_id_fkey(
          id,
          first_name,
          last_name,
          profile_image
        ),
        experience:experiences!experience_reviews_experience_id_fkey(
          id,
          title,
          date
        )
      `)
      .single()

    if (updateError) {
      console.error('Review update error:', updateError)
      return NextResponse.json(
        { error: 'レビューの更新に失敗しました' },
        { status: 500 }
      )
    }

    // 評価が変更された場合は体験の評価統計を更新
    if (validationResult.data.rating !== undefined) {
      await updateExperienceRating(supabase, existingReview.experience_id)
    }

    // フロントエンド用の形式で返す
    const formattedReview = {
      id: updatedReview.id,
      experienceId: updatedReview.experience_id,
      experienceTitle: updatedReview.experience?.title,
      experienceDate: updatedReview.experience?.date,
      reviewerId: updatedReview.reviewer_id,
      reviewerName: updatedReview.is_anonymous 
        ? '匿名ユーザー' 
        : `${updatedReview.reviewer?.first_name || ''} ${updatedReview.reviewer?.last_name || ''}`.trim(),
      reviewerImage: updatedReview.is_anonymous ? null : updatedReview.reviewer?.profile_image,
      rating: updatedReview.rating,
      reviewText: updatedReview.review_text,
      isAnonymous: updatedReview.is_anonymous,
      createdAt: updatedReview.created_at,
      updatedAt: updatedReview.updated_at,
    }

    return NextResponse.json({
      message: 'レビューが正常に更新されました',
      review: formattedReview
    })

  } catch (error) {
    console.error('Review PUT error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETE: レビュー削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(request)
    const reviewId = params.id
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 既存のレビューを確認
    const { data: existingReview, error: fetchError } = await supabase
      .from('experience_reviews')
      .select('experience_id')
      .eq('id', reviewId)
      .eq('reviewer_id', user.id)
      .single()

    if (fetchError || !existingReview) {
      return NextResponse.json(
        { error: 'レビューが見つからないか、削除権限がありません' },
        { status: 404 }
      )
    }

    // レビューの削除
    const { error: deleteError } = await supabase
      .from('experience_reviews')
      .delete()
      .eq('id', reviewId)
      .eq('reviewer_id', user.id)

    if (deleteError) {
      console.error('Review delete error:', deleteError)
      return NextResponse.json(
        { error: 'レビューの削除に失敗しました' },
        { status: 500 }
      )
    }

    // 体験の評価統計を更新
    await updateExperienceRating(supabase, existingReview.experience_id)

    return NextResponse.json({
      message: 'レビューが正常に削除されました'
    })

  } catch (error) {
    console.error('Review DELETE error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 体験の評価統計を更新する関数
async function updateExperienceRating(supabase: any, experienceId: string) {
  try {
    // 体験の全レビューを取得
    const { data: reviews } = await supabase
      .from('experience_reviews')
      .select('rating')
      .eq('experience_id', experienceId)

    if (reviews && reviews.length > 0) {
      const totalReviews = reviews.length
      const averageRating = reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / totalReviews

      // 体験テーブルの評価情報を更新
      await supabase
        .from('experiences')
        .update({
          rating: Math.round(averageRating * 10) / 10,
          review_count: totalReviews,
          updated_at: new Date().toISOString()
        })
        .eq('id', experienceId)
    } else {
      // レビューがない場合はnullに設定
      await supabase
        .from('experiences')
        .update({
          rating: null,
          review_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', experienceId)
    }
  } catch (error) {
    console.error('Failed to update experience rating:', error)
  }
}