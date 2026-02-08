import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
  const cookies = request.cookies.getAll()
  console.log('🍪 [recommendations] Cookies:', cookies.map(c => c.name))

  try {
    // 認証チェック
    const supabase = createClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('🔐 [recommendations] Auth result:', {
      hasUser: !!user,
      userId: user?.id?.slice(0, 8),
      error: authError?.message
    })

    if (authError || !user) {
      console.log('❌ [recommendations] Auth failed:', authError?.message)
      return NextResponse.json({
        error: '認証が必要です',
        debug: {
          authError: authError?.message,
          cookieNames: cookies.map(c => c.name)
        }
      }, { status: 401 })
    }

    const myUserId = user.id
    console.log('✅ [recommendations] Authenticated user:', myUserId)

    // 自分のプロフィールを取得（user_idで検索、idでも試行）
    let myProfile = null
    let profileError = null

    // まずuser_idで検索
    const result1 = await supabase
      .from('profiles')
      .select('id, user_id, gender, nationality')
      .eq('user_id', myUserId)
      .maybeSingle()

    if (result1.data) {
      myProfile = result1.data
      console.log('👤 [recommendations] Profile found by user_id')
    } else {
      // user_idで見つからない場合はidで検索
      const result2 = await supabase
        .from('profiles')
        .select('id, user_id, gender, nationality')
        .eq('id', myUserId)
        .maybeSingle()

      if (result2.data) {
        myProfile = result2.data
        console.log('👤 [recommendations] Profile found by id')
      } else {
        profileError = result1.error || result2.error
      }
    }

    if (profileError || !myProfile) {
      console.log('⚠️ [recommendations] My profile not found:', profileError?.message)
      return NextResponse.json({
        candidates: [],
        debug: {
          reason: 'my_profile_not_found',
          authUserId: myUserId,
          error: profileError?.message
        }
      }, { status: 403 })
    }

    // profilesにレコードがないユーザーは候補取得不可（安全ガード）
    const myProfileId = myProfile.id
    console.log('👤 [recommendations] My profile:', {
      profileId: myProfileId,
      userId: myProfile.user_id,
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
      .neq('id', myProfileId)  // 自分を除外
      .order('created_at', { ascending: false })
      .limit(30)

    // 日本人/外国人フィルタ
    if (targetIsJapanese) {
      // 日本人を探す：nationalityが日本系の値
      query = query.or('nationality.is.null,nationality.eq.,nationality.ilike.%日本%,nationality.ilike.jp,nationality.ilike.japan')
    } else {
      // 外国人を探す：nationalityが日本系でない
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
        error: 'データ取得に失敗しました',
        debug: { error: fetchError.message }
      }, { status: 500 })
    }

    console.log('📊 [recommendations] Result:', {
      candidateCount: candidates?.length || 0,
      myCondition: { gender: myProfile.gender, nationality: myProfile.nationality, isJapanese: meIsJapanese },
      targetCondition: { gender: targetGender, isJapanese: targetIsJapanese }
    })

    // 0件の場合のデバッグ情報
    if (!candidates || candidates.length === 0) {
      console.log('⚠️ [recommendations] No candidates found. Debug info:', {
        meGender: myProfile.gender,
        meNationality: myProfile.nationality,
        meIsJapanese,
        targetGender,
        targetIsJapanese
      })
    }

    return NextResponse.json({
      candidates: candidates || [],
      total: candidates?.length || 0,
      debug: {
        myProfileId,
        myAuthUserId: myUserId,
        myGender: myProfile.gender,
        myNationality: myProfile.nationality,
        meIsJapanese,
        targetGender,
        targetIsJapanese
      }
    })

  } catch (error) {
    console.error('💥 [recommendations] Unexpected error:', error)
    return NextResponse.json({
      error: '予期しないエラーが発生しました',
      candidates: []
    }, { status: 500 })
  }
}
