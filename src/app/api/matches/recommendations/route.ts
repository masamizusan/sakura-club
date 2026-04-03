import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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
 * GET /api/matches/recommendations
 *
 * マッチング候補プロフィールを取得する
 * - 認証必須（auth.uid()で自分を特定）
 * - 日本人女性 → 外国人男性を表示
 * - 外国人男性 → 日本人女性を表示
 * - profile_initialized = true のみ
 * - 機微情報（email, birth_date等）は返さない
 */
export async function GET(request: NextRequest) {
  console.log('🚀 [recommendations] API started')

  try {
    // cookies() from next/headers を使用（debug/session と同じ方式）
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    const cookieNames = allCookies.map(c => c.name)
    const hasSbCookies = cookieNames.some(name => name.startsWith('sb-'))

    console.log('🍪 [recommendations] Cookies:', {
      count: allCookies.length,
      hasSbCookies,
      names: cookieNames.filter(n => n.startsWith('sb-'))
    })

    // Supabaseクライアント作成（debug/session と完全一致）
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            // Route Handlerでは設定不要
          },
        },
      }
    )

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('🔐 [recommendations] Auth result:', {
      hasUser: !!user,
      userId: user?.id?.slice(0, 8),
      error: authError?.message
    })

    if (!user) {
      console.log('❌ [recommendations] Auth failed:', authError?.message || 'user is null')
      return NextResponse.json({
        error: 'Authentication required',
        reason: authError?.message || 'getUser returned null',
        debug: { hasSbCookies, cookieCount: allCookies.length }
      }, { status: 401, headers: noCacheHeaders })
    }

    console.log('✅ [recommendations] Authenticated user:', user.id)

    // 自分のプロフィールを取得
    const { data: myProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, gender, nationality')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !myProfile) {
      console.log('⚠️ [recommendations] Profile not found:', profileError?.message)
      return NextResponse.json({
        error: 'Profile not found',
        candidates: [],
        debug: { authUserId: user.id, error: profileError?.message }
      }, { status: 404, headers: noCacheHeaders })
    }

    console.log('👤 [recommendations] My profile:', {
      id: myProfile.id,
      gender: myProfile.gender,
      nationality: myProfile.nationality
    })

    // 日本人判定ヘルパー
    const isJapanese = (nationality: string | null | undefined): boolean => {
      if (!nationality) return true
      const n = nationality.toLowerCase().trim()
      return n === '' || n === 'jp' || n === 'japan' || n === '日本' || n === 'japanese'
    }

    const meIsJapanese = isJapanese(myProfile.nationality)
    const meIsFemale = myProfile.gender === 'female'
    const meIsMale = myProfile.gender === 'male'

    // 候補の条件を決定
    let targetGender: string
    let targetIsJapanese: boolean

    if (meIsFemale && meIsJapanese) {
      targetGender = 'male'
      targetIsJapanese = false
      console.log('🎯 [recommendations] Japanese female → looking for foreign males')
    } else if (meIsMale && !meIsJapanese) {
      targetGender = 'female'
      targetIsJapanese = true
      console.log('🎯 [recommendations] Foreign male → looking for Japanese females')
    } else {
      targetGender = meIsFemale ? 'male' : 'female'
      targetIsJapanese = !meIsJapanese
      console.log('🎯 [recommendations] Other pattern → showing opposite gender')
    }

    // いいね済みのユーザーIDを取得
    const { data: likedData } = await supabase
      .from('likes')
      .select('liked_user_id')
      .eq('liker_id', myProfile.id)

    const likedUserIds = likedData?.map(l => l.liked_user_id) || []

    console.log('💝 [recommendations] Already liked:', likedUserIds.length, 'users')

    // 候補を取得（存在するカラムのみ指定）
    let query = supabase
      .from('profiles')
      .select(`
        id, name, age, gender, nationality, residence, city,
        avatar_url, photo_urls, bio, interests,
        occupation, height, body_type, is_verified, profile_initialized,
        planned_prefectures, created_at
      `)
      .eq('profile_initialized', true)
      .eq('gender', targetGender)
      .neq('id', myProfile.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // いいね済みユーザーを除外（空配列の場合はスキップ）
    if (likedUserIds.length > 0) {
      query = query.not('id', 'in', `(${likedUserIds.join(',')})`)
    }

    if (targetIsJapanese) {
      query = query.or('nationality.is.null,nationality.eq.,nationality.ilike.%日本%,nationality.ilike.jp,nationality.ilike.japan')
    } else {
      query = query.not('nationality', 'is', null)
        .not('nationality', 'eq', '')
        .not('nationality', 'ilike', '%日本%')
        .not('nationality', 'ilike', 'jp')
        .not('nationality', 'ilike', 'japan')
    }

    const { data: candidates, error: fetchError } = await query

    if (fetchError) {
      console.error('❌ [recommendations] Fetch error:', fetchError)
      return NextResponse.json({
        error: 'Database error',
        candidates: [],
        debug: { error: fetchError.message }
      }, { status: 500, headers: noCacheHeaders })
    }

    console.log('📊 [recommendations] Result:', {
      candidateCount: candidates?.length || 0,
      targetGender,
      targetIsJapanese
    })

    return NextResponse.json({
      candidates: candidates || [],
      total: candidates?.length || 0,
      debug: {
        myId: myProfile.id,
        myGender: myProfile.gender,
        myNationality: myProfile.nationality,
        targetGender,
        targetIsJapanese
      }
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error('💥 [recommendations] Unexpected error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      candidates: [],
      debug: { message: error instanceof Error ? error.message : String(error) }
    }, { status: 500, headers: noCacheHeaders })
  }
}
