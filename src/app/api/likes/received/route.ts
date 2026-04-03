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
 */
export async function GET(request: NextRequest) {
  console.log('🚀 [likes/received] API started')

  try {
    // cookies() from next/headers を使用（likes/remaining と同じ方式）
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    const hasSbCookies = allCookies.some(c => c.name.startsWith('sb-'))

    console.log('🍪 [likes/received] Cookies:', {
      count: allCookies.length,
      hasSbCookies
    })

    // Supabaseクライアント作成
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

    console.log('🔐 [likes/received] Auth result:', {
      hasUser: !!user,
      userId: user?.id?.slice(0, 8),
      error: authError?.message
    })

    if (!user) {
      console.log('❌ [likes/received] Auth failed:', authError?.message || 'user is null')
      return NextResponse.json({
        error: 'Authentication required',
        likers: [],
        count: 0
      }, { status: 401, headers: noCacheHeaders })
    }

    const currentUserId = user.id
    console.log('✅ [likes/received] Authenticated user:', currentUserId)

    // マッチング済みのユーザーIDを取得（除外用）
    // ※「いいね返し済み」は除外しない（マッチング成立の候補として表示）
    console.log('💕 [likes/received] Step 1: Getting matched users...')
    const { data: matchedRecords, error: matchedError } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('status', 'matched')
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)

    if (matchedError) {
      console.error('[likes/received] matched error:', matchedError.message)
    }
    const matchedUserIds = matchedRecords?.map(m =>
      m.user1_id === currentUserId ? m.user2_id : m.user1_id
    ) || []
    console.log('💕 [likes/received] Matched users (will be excluded):', {
      count: matchedUserIds.length,
      ids: matchedUserIds.map(id => id.slice(0, 8))
    })

    // 除外するユーザーIDのセット（マッチング済みのみ）
    const excludeUserIds = new Set(matchedUserIds)
    console.log('🚫 [likes/received] Total exclude count:', excludeUserIds.size)

    // 3. 自分にいいねをしてきたユーザーを取得（新しい順）
    console.log('📥 [likes/received] Step 3: Getting received likes...')
    const { data: receivedLikes, error: receivedError } = await supabase
      .from('likes')
      .select('liker_id, created_at')
      .eq('liked_user_id', currentUserId)
      .order('created_at', { ascending: false })

    if (receivedError) {
      console.error('[likes/received] received likes error:', receivedError.message)
      return NextResponse.json({
        error: 'いいね情報の取得に失敗しました',
        detail: receivedError.message,
        likers: [],
        count: 0
      }, { status: 500, headers: noCacheHeaders })
    }

    // 受け取ったいいねの詳細をログ
    const allReceivedLikerIds = receivedLikes?.map(l => l.liker_id) || []
    console.log('📥 [likes/received] Received likes:', {
      count: allReceivedLikerIds.length,
      ids: allReceivedLikerIds.map(id => id.slice(0, 8))
    })

    // 除外されるユーザーを詳細にログ（マッチング済みのみ）
    const excludedUsers = receivedLikes?.filter(l => excludeUserIds.has(l.liker_id)) || []
    excludedUsers.forEach(l => {
      console.log(`🚫 [likes/received] 除外: ${l.liker_id.slice(0, 8)} - 理由: マッチング済み`)
    })

    // 除外済みユーザーを除く、ユニークなliker_id一覧
    const filteredLikerIds = receivedLikes
      ?.filter(l => !excludeUserIds.has(l.liker_id))
      .map(l => l.liker_id) || []
    const likerIds = Array.from(new Set(filteredLikerIds))
    console.log('🎯 [likes/received] After filtering:', {
      count: likerIds.length,
      ids: likerIds.map(id => id.slice(0, 8))
    })

    if (likerIds.length === 0) {
      console.log('📭 [likes/received] No likers found')
      return NextResponse.json({
        likers: [],
        count: 0
      }, { headers: noCacheHeaders })
    }

    // 4. ユーザープロフィール情報を取得
    console.log('👤 [likes/received] Step 4: Getting profiles...')
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
        culture_tags,
        planned_prefectures
      `)
      .in('id', likerIds)
      .eq('profile_initialized', true)

    if (profilesError) {
      console.error('[likes/received] profiles error:', profilesError.message)
      return NextResponse.json({
        error: 'プロフィール情報の取得に失敗しました',
        detail: profilesError.message,
        likers: [],
        count: 0
      }, { status: 500, headers: noCacheHeaders })
    }

    console.log('👤 [likes/received] Profiles found:', profiles?.length || 0)

    // プロフィールが取得できなかったユーザーをログ
    const foundProfileIds = profiles?.map(p => p.id) || []
    const missingProfileIds = likerIds.filter(id => !foundProfileIds.includes(id))
    if (missingProfileIds.length > 0) {
      console.log('⚠️ [likes/received] Missing profiles (profile_initialized=false?):', {
        count: missingProfileIds.length,
        ids: missingProfileIds.map(id => id.slice(0, 8))
      })
    }

    // いいねの順番を維持するためのマップ（created_atも保持）
    const likerIdOrder = new Map(likerIds.map((id, index) => [id, index]))

    // liker_id → created_at のマップを作成
    const likerCreatedAtMap = new Map<string, string>()
    receivedLikes?.forEach(like => {
      if (!likerCreatedAtMap.has(like.liker_id)) {
        likerCreatedAtMap.set(like.liker_id, like.created_at)
      }
    })

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
        personality_tags: Array.isArray(profile.personality_tags) ? profile.personality_tags : [],
        culture_tags: Array.isArray(profile.culture_tags) ? profile.culture_tags : [],
        planned_prefectures: Array.isArray(profile.planned_prefectures) ? profile.planned_prefectures : [],
        liked_at: likerCreatedAtMap.get(profile.id) || null,
      }))
      .sort((a, b) => (likerIdOrder.get(a.id) ?? 999) - (likerIdOrder.get(b.id) ?? 999)) || []

    // 最終レスポンスの詳細ログ
    console.log('✅ [likes/received] FINAL RESPONSE:', {
      count: formattedLikers.length,
      likers: formattedLikers.map(l => ({
        id: l.id.slice(0, 8),
        name: l.name
      }))
    })

    return NextResponse.json({
      likers: formattedLikers,
      count: formattedLikers.length
    }, { headers: noCacheHeaders })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[likes/received] Unexpected error:', errorMessage)
    if (error instanceof Error && error.stack) {
      console.error('[likes/received] Stack:', error.stack)
    }
    return NextResponse.json({
      error: '予期しないエラーが発生しました',
      detail: errorMessage,
      likers: [],
      count: 0
    }, { status: 500, headers: noCacheHeaders })
  }
}
