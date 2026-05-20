import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { isJapaneseWoman } from '@/utils/userHelpers'

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

    // ブロックリスト取得（双方向・service_roleでRLSバイパス）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: blockList } = await supabaseAdmin
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
    const blockedIds = blockList?.map(b =>
      b.blocker_id === user.id ? b.blocked_id : b.blocker_id
    ) ?? []
    console.log('🚫 [recommendations] Blocked users:', blockedIds.length)

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

    // ブロック済みユーザーを除外（双方向）
    if (blockedIds.length > 0) {
      query = query.not('id', 'in', `(${blockedIds.join(',')})`)
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

    // ===== モーダル絞り込みフィルタ（query parameter ベース） =====
    const params = request.nextUrl.searchParams

    // 国籍: 自分が日本人女性(=targetIsJapanese=false, 相手は外国人男性)の時のみ意味がある。
    // 自分が外国人男性(=targetIsJapanese=true)時は UI でセクション非表示のため
    // 送られない想定だが、念のため targetIsJapanese 時は無視する。
    //
    // 2026/05/20: dbValue (日本語カタカナ「アメリカ」/「その他」) ベースに統一。
    // 「その他」は完全一致(eq)で扱う(signup で 'その他' 文字列が保存される設計)。
    const nationalityParam = params.get('nationality')
    if (nationalityParam && !targetIsJapanese) {
      const dbValues = nationalityParam
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      const hasOther = dbValues.includes('その他')
      const concreteValues = dbValues.filter(v => v !== 'その他')

      if (hasOther && concreteValues.length > 0) {
        // 「その他」+ 具体国 = OR 条件
        const inClause = concreteValues.map(v => `"${v}"`).join(',')
        query = query.or(`nationality.in.(${inClause}),nationality.eq.その他`)
      } else if (hasOther) {
        // 「その他」のみ
        query = query.eq('nationality', 'その他')
      } else if (concreteValues.length > 0) {
        // 具体国のみ(dbValue 直接 in、表記揺れは別タスクで対応)
        query = query.in('nationality', concreteValues)
      }
    }

    // 年齢
    const ageMinRaw = params.get('age_min')
    const ageMaxRaw = params.get('age_max')
    if (ageMinRaw !== null) {
      const v = Number(ageMinRaw)
      if (Number.isFinite(v) && v > 18) query = query.gte('age', v)
    }
    if (ageMaxRaw !== null) {
      const v = Number(ageMaxRaw)
      if (Number.isFinite(v) && v < 80) query = query.lte('age', v)
    }

    // 婚姻状態（'all' or 未送信 → 絞り込まない、NULL を含む）
    const maritalStatus = params.get('marital_status')
    if (maritalStatus === 'single' || maritalStatus === 'married') {
      query = query.eq('marital_status', maritalStatus)
    }

    // 都道府県: 自分の性別で相手の対象カラムを切替
    //   自分が日本人女性 → 相手は外国人男性 → planned_prefectures (TEXT[]) ANY
    //   自分が外国人男性 → 相手は日本人女性 → residence (TEXT) IN
    const prefecturesParam = params.get('prefectures')
    if (prefecturesParam) {
      const prefList = prefecturesParam.split(',').map(s => s.trim()).filter(Boolean)
      if (prefList.length > 0) {
        if (isJapaneseWoman(myProfile)) {
          query = query.overlaps('planned_prefectures', prefList)
        } else {
          query = query.in('residence', prefList)
        }
      }
    }

    // 最終アクティブ(updated_at 近似)
    const lastActive = params.get('last_active')
    if (lastActive === '24h') {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('updated_at', since)
    } else if (lastActive === '7d') {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('updated_at', since)
    }
    // ===== 絞り込みフィルタここまで =====

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
