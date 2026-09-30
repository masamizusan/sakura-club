import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
}

/**
 * GET /api/profile/[id]
 *
 * 指定されたユーザーIDのプロフィールを取得する
 * - 認証必須
 * - 機微情報（email, birth_date等）は返さない
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const profileId = params.id

  if (!profileId) {
    return NextResponse.json(
      { error: 'Profile ID is required' },
      { status: 400, headers: noCacheHeaders }
    )
  }

  try {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: noCacheHeaders }
      )
    }

    // プロフィール取得（段階2-A: 公開用ビュー。完成済み・active・ブロック関係なしの行のみ、機微情報なし）
    const { data: publicProfile, error: fetchError } = await supabase
      .from('profiles_public')
      .select(`
        id, name, age, gender, nationality, residence, city,
        avatar_url, photo_urls, bio, interests,
        occupation, height, body_type, marital_status,
        personality_tags, language_skills,
        visit_schedule, travel_companion, planned_prefectures,
        is_verified,
        created_at
      `)
      .eq('id', profileId)
      .maybeSingle()

    if (fetchError) {
      console.error('Profile fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Database error', details: fetchError.message },
        { status: 500, headers: noCacheHeaders }
      )
    }

    if (!publicProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404, headers: noCacheHeaders }
      )
    }

    // レスポンス互換: ビューに載る行は完成済みのみのため profile_initialized は true 固定
    const profile = { ...publicProfile, profile_initialized: true }

    // 段階2-B: 閲覧者がこの相手にいいね済みか（RLS likes_select_own_sent で自分の送信分のみ読める）
    const { data: sentLike, error: sentLikeError } = await supabase
      .from('likes')
      .select('id')
      .eq('liker_id', user.id)
      .eq('liked_user_id', profileId)
      .maybeSingle()

    if (sentLikeError) {
      console.error('[profile/[id]] viewer like check error:', sentLikeError.message)
    }

    return NextResponse.json({
      profile,
      viewerId: user.id,
      viewer_has_liked: !!sentLike
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
