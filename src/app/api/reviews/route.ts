import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// レビュー作成のスキーマ
const createReviewSchema = z.object({
  experience_id: z.string().uuid('有効な体験IDを指定してください'),
  rating: z.number().min(1, '評価は1以上で入力してください').max(5, '評価は5以下で入力してください'),
  review_text: z.string().optional(),
  is_anonymous: z.boolean().optional().default(false),
})

// レビュー更新のスキーマ
const updateReviewSchema = z.object({
  rating: z.number().min(1, '評価は1以上で入力してください').max(5, '評価は5以下で入力してください').optional(),
  review_text: z.string().optional(),
  is_anonymous: z.boolean().optional(),
})

// GET: レビュー一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(request)
    const { searchParams } = new URL(request.url)
    
    // クエリパラメータの取得
    const experienceId = searchParams.get('experience_id')
    const reviewerId = searchParams.get('reviewer_id')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // ベースクエリ
    let query = supabase
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
      .order('created_at', { ascending: false })

    // 体験IDでフィルター
    if (experienceId) {
      query = query.eq('experience_id', experienceId)
    }

    // レビュワーIDでフィルター
    if (reviewerId) {
      query = query.eq('reviewer_id', reviewerId)
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1)

    const { data: reviews, error } = await query

    if (error) {
      console.error('Reviews fetch error:', error)
      return NextResponse.json(
        { error: 'レビューの取得に失敗しました' },
        { status: 500 }
      )
    }

    // フロントエンド用のデータ形式に変換
    const formattedReviews = reviews?.map(review => ({
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
    })) || []

    // 体験IDが指定されている場合は統計情報も返す
    let statistics = null
    if (experienceId) {
      const { data: stats } = await supabase
        .from('experience_reviews')
        .select('rating')
        .eq('experience_id', experienceId)

      if (stats && stats.length > 0) {
        const totalReviews = stats.length
        const averageRating = stats.reduce((sum, review) => sum + review.rating, 0) / totalReviews
        const ratingDistribution = [1, 2, 3, 4, 5].map(rating => 
          stats.filter(review => review.rating === rating).length
        )

        statistics = {
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10,
          ratingDistribution
        }
      }
    }

    return NextResponse.json({
      reviews: formattedReviews,
      statistics,
      total: formattedReviews.length,
      hasMore: formattedReviews.length === limit
    })

  } catch (error) {
    console.error('Reviews GET error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST: 新しいレビュー作成
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(request)
    
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
    const validationResult = createReviewSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'バリデーションエラー',
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { experience_id, rating, review_text, is_anonymous } = validationResult.data

    // 体験の存在確認
    const { data: experience, error: experienceError } = await supabase
      .from('experiences')
      .select('id, title')
      .eq('id', experience_id)
      .single()

    if (experienceError || !experience) {
      return NextResponse.json(
        { error: '指定された体験が見つかりません' },
        { status: 404 }
      )
    }

    // 参加者であることを確認
    const { data: participation, error: participationError } = await supabase
      .from('experience_participants')
      .select('status')
      .eq('experience_id', experience_id)
      .eq('user_id', user.id)
      .single()

    if (participationError || !participation || participation.status !== 'completed') {
      return NextResponse.json(
        { error: 'この体験のレビューを投稿する権限がありません' },
        { status: 403 }
      )
    }

    // 既存のレビューがないか確認
    const { data: existingReview } = await supabase
      .from('experience_reviews')
      .select('id')
      .eq('experience_id', experience_id)
      .eq('reviewer_id', user.id)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'この体験には既にレビューを投稿済みです' },
        { status: 409 }
      )
    }

    // レビューの作成
    const { data: newReview, error: createError } = await supabase
      .from('experience_reviews')
      .insert({
        experience_id,
        reviewer_id: user.id,
        rating,
        review_text: review_text || null,
        is_anonymous: is_anonymous || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
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

    if (createError) {
      console.error('Review creation error:', createError)
      return NextResponse.json(
        { error: 'レビューの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 体験の評価統計を更新
    await updateExperienceRating(supabase, experience_id)

    // フロントエンド用の形式で返す
    const formattedReview = {
      id: newReview.id,
      experienceId: newReview.experience_id,
      experienceTitle: newReview.experience?.title,
      experienceDate: newReview.experience?.date,
      reviewerId: newReview.reviewer_id,
      reviewerName: newReview.is_anonymous 
        ? '匿名ユーザー' 
        : `${newReview.reviewer?.first_name || ''} ${newReview.reviewer?.last_name || ''}`.trim(),
      reviewerImage: newReview.is_anonymous ? null : newReview.reviewer?.profile_image,
      rating: newReview.rating,
      reviewText: newReview.review_text,
      isAnonymous: newReview.is_anonymous,
      createdAt: newReview.created_at,
      updatedAt: newReview.updated_at,
    }

    return NextResponse.json({
      message: 'レビューが正常に作成されました',
      review: formattedReview
    }, { status: 201 })

  } catch (error) {
    console.error('Review POST error:', error)
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
    }
  } catch (error) {
    console.error('Failed to update experience rating:', error)
  }
}