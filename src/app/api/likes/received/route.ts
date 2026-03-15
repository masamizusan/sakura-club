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
 * GET /api/likes/received
 *
 * 自分にいいねを送ってきたユーザー一覧を取得
 * - 自分がいいね済みのユーザーは除外
 * - マッチング済みのユーザーは除外
 * - いいねを受けたユーザーのプロフィール情報を返す
 */
export async function GET(request: NextRequest) {
  console.log('🚀 [likes/received] API started')

  try {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: noCacheHeaders }
      )
    }

    const currentUserId = user.id
    console.log('🔍 [likes/received] currentUserId:', currentUserId)

    // 1. 自分がいいねしたユーザーのIDを取得（除外用）
    const { data: sentLikes, error: sentError } = await supabase
      .from('likes')
      .select('liked_user_id')
      .eq('liker_id', currentUserId)

    if (sentError) {
      console.error('[likes/received] sent likes error:', sentError)
    }

    const sentLikeUserIds = sentLikes?.map(l => l.liked_user_id) || []
    console.log('📤 [likes/received] sentLikeUserIds count:', sentLikeUserIds.length)

    // 2. マッチング済みのユーザーIDを取得（除外用）
    const { data: matchedRecords, error: matchedError } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('status', 'matched')
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)

    if (matchedError) {
      console.error('[likes/received] matched error:', matchedError)
    }

    const matchedUserIds = matchedRecords?.map(m =>
      m.user1_id === currentUserId ? m.user2_id : m.user1_id
    ) || []
    console.log('💕 [likes/received] matchedUserIds count:', matchedUserIds.length)

    // 除外するユーザーIDのセット
    const excludeUserIds = new Set(sentLikeUserIds.concat(matchedUserIds))
    console.log('🚫 [likes/received] excludeUserIds count:', excludeUserIds.size)

    // 3. 自分にいいねをしてきたユーザーを取得（新しい順）
    const { data: receivedLikes, error: receivedError } = await supabase
      .from('likes')
      .select('liker_id, created_at')
      .eq('liked_user_id', currentUserId)
      .order('created_at', { ascending: false })

    console.log('📥 [likes/received] receivedLikes:', {
      count: receivedLikes?.length || 0,
      error: receivedError?.message || null,
      data: receivedLikes?.slice(0, 3) || []
    })

    if (receivedError) {
      console.error('[likes/received] received likes error:', receivedError)
      return NextResponse.json(
        { error: 'いいね情報の取得に失敗しました' },
        { status: 500, headers: noCacheHeaders }
      )
    }

    // 除外済みユーザーを除く、ユニークなliker_id一覧
    const filteredLikerIds = receivedLikes
      ?.filter(l => !excludeUserIds.has(l.liker_id))
      .map(l => l.liker_id) || []
    const likerIds = Array.from(new Set(filteredLikerIds))
    console.log('🎯 [likes/received] final likerIds count:', likerIds.length)

    if (likerIds.length === 0) {
      return NextResponse.json({
        likers: [],
        count: 0
      }, { headers: noCacheHeaders })
    }

    // 4. ユーザープロフィール情報を取得
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
        updated_at,
        city,
        personality_tags,
        culture_tags
      `)
      .in('id', likerIds)
      .eq('profile_initialized', true)

    if (profilesError) {
      console.error('[likes/received] profiles error:', profilesError)
      return NextResponse.json(
        { error: 'プロフィール情報の取得に失敗しました' },
        { status: 500, headers: noCacheHeaders }
      )
    }

    // いいねの順番を維持するためのマップ
    const likerIdOrder = new Map(likerIds.map((id, index) => [id, index]))

    // 年齢計算関数
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

    // プロフィールを整形（いいねの順番で並べ替え）
    const formattedLikers = profiles
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
        photo_urls: profile.photo_urls || [],
        updated_at: profile.updated_at,
        personality_tags: Array.isArray(profile.personality_tags) ? profile.personality_tags : [],
        culture_tags: Array.isArray(profile.culture_tags) ? profile.culture_tags : [],
      }))
      .sort((a, b) => (likerIdOrder.get(a.id) ?? 999) - (likerIdOrder.get(b.id) ?? 999)) || []

    console.log(`✅ [likes/received] Found ${formattedLikers.length} likers for user ${currentUserId.slice(0, 8)}`)

    return NextResponse.json({
      likers: formattedLikers,
      count: formattedLikers.length
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error('[likes/received] unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
