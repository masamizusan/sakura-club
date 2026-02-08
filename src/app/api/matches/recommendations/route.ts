import { NextRequest, NextResponse } from 'next/server'
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

  // デバッグ: cookieの確認
  const requestCookies = request.cookies.getAll()
  const cookieNames = requestCookies.map(c => c.name)
  const hasSbCookies = cookieNames.some(name => name.startsWith('sb-'))
  console.log('🍪 [recommendations] Cookies:', { names: cookieNames, hasSbCookies })

  try {
    // Supabaseクライアント作成（直接createServerClientを使用）
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
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

    if (authError || !user) {
      console.log('❌ [recommendations] Auth failed:', authError?.message)
      return NextResponse.json({
        error: 'Authentication required',
        debug: {
          authError: authError?.message,
          hasSbCookies,
          cookieNames
        }
      }, { status: 401, headers: noCacheHeaders })
    }

    const myUserId = user.id
    console.log('✅ [recommendations] Authenticated user:', myUserId)

    // 自分のプロフィールを取得（id = user.id で検索）
    const { data: myProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, gender, nationality')
      .eq('id', myUserId)
      .maybeSingle()

    if (profileError || !myProfile) {
      console.log('⚠️ [recommendations] Profile not found:', profileError?.message)
      // 404で返す（403と401の混乱を避ける）
      return NextResponse.json({
        error: 'Profile not found',
        candidates: [],
        debug: {
          authUserId: myUserId,
          error: profileError?.message
        }
      }, { status: 404, headers: noCacheHeaders })
    }

    console.log('👤 [recommendations] My profile:', {
      id: myProfile.id,
      gender: myProfile.gender,
      nationality: myProfile.nationality
    })

    // 日本人判定ヘルパー
    const isJapanese = (nationality: string | null | undefined): boolean => {
      if (!nationality) return true // NULL/空は日本人扱い
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
      // 日本人女性 → 外国人男性
      targetGender = 'male'
      targetIsJapanese = false
      console.log('🎯 [recommendations] Japanese female → looking for foreign males')
    } else if (meIsMale && !meIsJapanese) {
      // 外国人男性 → 日本人女性
      targetGender = 'female'
      targetIsJapanese = true
      console.log('🎯 [recommendations] Foreign male → looking for Japanese females')
    } else {
      // その他のパターン（とりあえず異性を表示）
      targetGender = meIsFemale ? 'male' : 'female'
      targetIsJapanese = !meIsJapanese
      console.log('🎯 [recommendations] Other pattern → showing opposite gender')
    }

    // 候補を取得（必要最小限のカラムのみ、機微情報は除外）
    let query = supabase
      .from('profiles')
      .select(`
        id,
        name,
        age,
        gender,
        nationality,
        residence,
        prefecture,
        city,
        avatar_url,
        photo_urls,
        bio,
        self_introduction,
        interests,
        occupation,
        height,
        body_type,
        is_verified,
        profile_initialized,
        created_at,
        updated_at
      `)
      .eq('profile_initialized', true)
      .eq('gender', targetGender)
      .neq('id', myProfile.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // 日本人/外国人フィルタ
    if (targetIsJapanese) {
      // 日本人を探す
      query = query.or('nationality.is.null,nationality.eq.,nationality.ilike.%日本%,nationality.ilike.jp,nationality.ilike.japan')
    } else {
      // 外国人を探す
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
      myCondition: { gender: myProfile.gender, nationality: myProfile.nationality },
      targetCondition: { gender: targetGender, isJapanese: targetIsJapanese }
    })

    return NextResponse.json({
      candidates: candidates || [],
      total: candidates?.length || 0,
      debug: {
        myId: myProfile.id,
        myGender: myProfile.gender,
        myNationality: myProfile.nationality,
        meIsJapanese,
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
