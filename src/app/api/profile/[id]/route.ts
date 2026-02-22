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

    // プロフィール取得（機微情報を除外）
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        id, name, age, gender, nationality, residence, city,
        avatar_url, photo_urls, bio, interests,
        occupation, height, body_type, marital_status,
        personality_tags, language_skills,
        visit_schedule, travel_companion, planned_prefectures,
        is_verified, profile_initialized,
        created_at
      `)
      .eq('id', profileId)
      .eq('profile_initialized', true)
      .maybeSingle()

    if (fetchError) {
      console.error('Profile fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Database error', details: fetchError.message },
        { status: 500, headers: noCacheHeaders }
      )
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404, headers: noCacheHeaders }
      )
    }

    return NextResponse.json({
      profile,
      viewerId: user.id
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
