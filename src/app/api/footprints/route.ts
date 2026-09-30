import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

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
    const allVisitorIds = Array.from(visitorMap.keys())

    // ブロック済みユーザーを除外（service_roleでRLSバイパス）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: blockList } = await supabaseAdmin
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`)
    const blockedIdSet = new Set(blockList?.map(b =>
      b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id
    ) ?? [])
    const visitorIds = allVisitorIds.filter(id => !blockedIdSet.has(id))

    // プロフィール情報を取得（段階2-A: 公開用ビュー。完成済み・active・ブロック関係なしはビュー側で保証）
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles_public')
      .select(`
        id,
        name,
        gender,
        age,
        nationality,
        residence,
        bio,
        interests,
        avatar_url,
        photo_urls,
        city,
        personality_tags,
        culture_tags,
        planned_prefectures
      `)
      .in('id', visitorIds)

    if (profilesError) {
      console.error('[footprints] profiles error:', profilesError.message)
      return NextResponse.json({
        visitors: [],
        count: 0
      }, { headers: noCacheHeaders })
    }

    // 年齢: 公開用ビューの age（生年月日から日本時間基準で算出済み）を number | null で返す
    const toAge = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '') return null
      const n = Number(value)
      return Number.isFinite(n) ? n : null
    }

    const formattedVisitors = profiles
      ?.map(profile => ({
        id: profile.id,
        name: profile.name || '',
        gender: profile.gender || '',
        age: toAge(profile.age),
        nationality: profile.nationality || '',
        residence: profile.residence || '',
        prefecture: profile.residence || '',
        city: typeof profile.city === 'object' ? (profile.city as any)?.city : profile.city || '',
        bio: profile.bio || '',
        interests: Array.isArray(profile.interests) ? profile.interests : [],
        avatar_url: profile.avatar_url || (Array.isArray(profile.photo_urls) && profile.photo_urls.length > 0 ? profile.photo_urls[0] : null),
        personality_tags: Array.isArray(profile.personality_tags) ? profile.personality_tags : [],
        culture_tags: Array.isArray(profile.culture_tags) ? profile.culture_tags : [],
        planned_prefectures: Array.isArray(profile.planned_prefectures) ? profile.planned_prefectures : [],
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
