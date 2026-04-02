import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

/**
 * GET /api/footprints
 *
 * 自分のプロフィールを閲覧したユーザー一覧を取得
 */
export async function GET(request: NextRequest) {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        error: 'Authentication required',
        visitors: [],
        count: 0
      }, { status: 401, headers: noCacheHeaders })
    }

    const currentUserId = user.id

    // footprints テーブルから閲覧者一覧を取得（新しい順）
    const { data: footprints, error: footprintsError } = await supabase
      .from('footprints')
      .select('visitor_id, created_at')
      .eq('profile_owner_id', currentUserId)
      .order('created_at', { ascending: false })

    if (footprintsError) {
      console.error('[footprints] fetch error:', footprintsError.message)
      return NextResponse.json({
        visitors: [],
        count: 0
      }, { headers: noCacheHeaders })
    }

    if (!footprints || footprints.length === 0) {
      return NextResponse.json({
        visitors: [],
        count: 0
      }, { headers: noCacheHeaders })
    }

    // ユニークな visitor_id（最新の訪問時刻を保持）
    const visitorMap = new Map<string, string>()
    footprints.forEach(f => {
      if (!visitorMap.has(f.visitor_id)) {
        visitorMap.set(f.visitor_id, f.created_at)
      }
    })
    const visitorIds = Array.from(visitorMap.keys())

    // プロフィール情報を取得
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        gender,
        birth_date,
        nationality,
        residence,
        bio,
        interests,
        avatar_url,
        photo_urls,
        city,
        personality_tags,
        culture_tags
      `)
      .in('id', visitorIds)
      .eq('profile_initialized', true)

    if (profilesError) {
      console.error('[footprints] profiles error:', profilesError.message)
      return NextResponse.json({
        visitors: [],
        count: 0
      }, { headers: noCacheHeaders })
    }

    // 年齢計算
    const calculateAge = (birthDate: string | null): number | null => {
      if (!birthDate) return null
      const birth = new Date(birthDate)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return age
    }

    const formattedVisitors = profiles
      ?.map(profile => ({
        id: profile.id,
        name: profile.name || '',
        gender: profile.gender || '',
        age: calculateAge(profile.birth_date),
        nationality: profile.nationality || '',
        residence: profile.residence || '',
        prefecture: profile.residence || '',
        city: typeof profile.city === 'object' ? (profile.city as any)?.city : profile.city || '',
        bio: profile.bio || '',
        interests: Array.isArray(profile.interests) ? profile.interests : [],
        avatar_url: profile.avatar_url || (Array.isArray(profile.photo_urls) && profile.photo_urls.length > 0 ? profile.photo_urls[0] : null),
        personality_tags: Array.isArray(profile.personality_tags) ? profile.personality_tags : [],
        culture_tags: Array.isArray(profile.culture_tags) ? profile.culture_tags : [],
        visited_at: visitorMap.get(profile.id) || null,
      }))
      .sort((a, b) => {
        if (!a.visited_at) return 1
        if (!b.visited_at) return -1
        return new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime()
      }) || []

    return NextResponse.json({
      visitors: formattedVisitors,
      count: formattedVisitors.length
    }, { headers: noCacheHeaders })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[footprints] Unexpected error:', errorMessage)
    return NextResponse.json({
      visitors: [],
      count: 0
    }, { status: 500, headers: noCacheHeaders })
  }
}
