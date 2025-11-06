import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET: マッチング候補の取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(request)
    const { searchParams } = new URL(request.url)
    
    // 開発テストモードの確認
    const devTestMode = searchParams.get('devTest') === 'true'
    
    if (devTestMode) {
      console.log('🧪 Dev test mode detected - connecting to real database with simulated auth')
      
      // テストモードでも実際のデータベースに接続してプロフィールを取得
      const supabase = createClient(request)
      
      try {
        // デバッグ用：まずすべてのプロフィールを確認
        console.log('🔍 Fetching all profiles for debugging...')
        const { data: allProfiles, error: debugError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, gender, nationality, age')
        
        console.log('📋 All profiles in database:', allProfiles)
        
        // 性別による適切なフィルタリングを実装
        // テストモードでは田中桜（日本人女性）の視点でダッシュボードを表示
        // 従って外国人男性のみを表示する
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .not('first_name', 'is', null) // 名前が設定されているプロフィールのみ
          .eq('gender', 'male') // 外国人男性のみ表示
          .neq('nationality', '日本') // 日本国籍以外
          .limit(10)
        
        if (error) {
          console.error('Database fetch error in dev test mode:', error)
          // エラー時はフォールバック用サンプルデータを返す
          return NextResponse.json({
            matches: [],
            total: 0,
            hasMore: false,
            error: 'Database connection failed in test mode'
          })
        }

        console.log('🔍 Found profiles in database:', profiles?.length || 0)
        
        // データベースから取得したプロフィールをマッチング形式に変換
        const formattedMatches = profiles?.map((profile: any) => {
          return {
            id: profile.id,
            firstName: profile.first_name || 'Unknown',
            lastName: profile.last_name || '',
            age: profile.age || 0,
            nationality: profile.nationality || 'Unknown',
            nationalityLabel: getNationalityLabel(profile.nationality),
            prefecture: profile.prefecture || '',
            city: profile.city || '',
            hobbies: profile.hobbies || [],
            selfIntroduction: profile.self_introduction || '',
            profileImage: profile.avatar_url || profile.profile_image || null,
            lastSeen: profile.updated_at,
            isOnline: Math.random() > 0.5, // ランダムでオンライン状態をシミュレート
            matchPercentage: Math.floor(Math.random() * 30) + 70, // 70-100%のランダムマッチ度
            commonInterests: (profile.hobbies || []).slice(0, 2), // 最初の2つを共通趣味として表示
            distanceKm: Math.floor(Math.random() * 20) + 1 // 1-20kmのランダム距離
          }
        }) || []

        console.log('🎯 Formatted matches for dashboard:', formattedMatches.length)
        
        return NextResponse.json({
          matches: formattedMatches,
          total: formattedMatches.length,
          hasMore: false
        })
        
      } catch (dbError) {
        console.error('Database connection error:', dbError)
        return NextResponse.json({
          matches: [],
          total: 0,
          hasMore: false,
          error: 'Failed to connect to database'
        })
      }
    }
    
    // 通常モード：認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }
    
    return handleMatchingLogic(supabase, user, searchParams)
  } catch (error) {
    console.error('Matches GET error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// マッチングロジックを分離した関数
async function handleMatchingLogic(supabase: any, user: any, searchParams: URLSearchParams) {
  try {

  // クエリパラメータの取得
  const search = searchParams.get('search')
  const nationality = searchParams.get('nationality')
  const ageRange = searchParams.get('age')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  // 現在のユーザーのプロフィールを取得
  const { data: currentUserProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !currentUserProfile) {
    return NextResponse.json(
      { error: 'プロフィールが見つかりません' },
      { status: 404 }
    )
  }

  // 既にいいねした、またはマッチしたユーザーのIDを取得
  const { data: existingLikes } = await supabase
    .from('matches')
    .select('liked_user_id, matched_user_id')
    .or(`liker_user_id.eq.${user.id},matched_user_id.eq.${user.id}`)

  const excludeUserIds = new Set([user.id]) // 自分自身を除外
  existingLikes?.forEach((like: any) => {
    excludeUserIds.add(like.liked_user_id)
    excludeUserIds.add(like.matched_user_id)
  })

  // マッチング候補の取得クエリ
  let query = supabase
    .from('profiles')
    .select('*')
    .neq('id', user.id) // 自分以外
    .not('id', 'in', `(${Array.from(excludeUserIds).join(',')})`)

  // 検索フィルター
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,self_introduction.ilike.%${search}%`)
  }

  // 国籍フィルター
  if (nationality && nationality !== 'すべて') {
    query = query.eq('nationality', nationality)
  }

  // 年齢フィルター
  if (ageRange && ageRange !== 'すべて') {
    const [min, max] = ageRange.split('-').map(Number)
    if (max) {
      query = query.gte('age', min).lte('age', max)
    } else {
      query = query.gte('age', min)
    }
  }

  // ランダム化のために作成日でソート（後でマッチ度計算を追加予定）
  query = query.order('created_at', { ascending: false })
  query = query.range(offset, offset + limit - 1)

  const { data: candidates, error } = await query

  if (error) {
    console.error('Matches fetch error:', error)
    return NextResponse.json(
      { error: 'マッチング候補の取得に失敗しました' },
      { status: 500 }
    )
  }

  // マッチング候補をフロントエンド用の形式に変換
  const formattedCandidates = candidates?.map((candidate: any) => {
    // 共通の趣味を計算
    const currentHobbies = currentUserProfile.hobbies || []
    const candidateHobbies = candidate.hobbies || []
    const commonInterests = currentHobbies.filter((hobby: string) => 
      candidateHobbies.includes(hobby)
    )

    // マッチ度を計算（簡易版）
    let matchPercentage = 50 // ベース値
    
    // 共通趣味でボーナス
    matchPercentage += commonInterests.length * 10
    
    // 同じ都道府県でボーナス
    if (candidate.prefecture === currentUserProfile.prefecture) {
      matchPercentage += 15
    }
    
    // 年齢が近いとボーナス
    const ageDiff = Math.abs(candidate.age - currentUserProfile.age)
    if (ageDiff <= 3) matchPercentage += 10
    else if (ageDiff <= 5) matchPercentage += 5

    // 最大100%に制限
    matchPercentage = Math.min(matchPercentage, 100)

    return {
      id: candidate.id,
      firstName: candidate.first_name,
      lastName: candidate.last_name,
      age: candidate.age,
      nationality: candidate.nationality,
      nationalityLabel: getNationalityLabel(candidate.nationality),
      prefecture: candidate.prefecture,
      city: candidate.city,
      hobbies: candidate.hobbies || [],
      selfIntroduction: candidate.self_introduction,
      profileImage: candidate.profile_image,
      lastSeen: candidate.updated_at,
      isOnline: false, // TODO: オンライン状態の実装
      matchPercentage,
      commonInterests,
      distanceKm: undefined, // TODO: 距離計算の実装
    }
  }) || []

  return NextResponse.json({
    matches: formattedCandidates,
    total: formattedCandidates.length,
    hasMore: formattedCandidates.length === limit
  })

  } catch (error) {
    console.error('HandleMatchingLogic error:', error)
    return NextResponse.json(
      { error: 'マッチング処理でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 国籍ラベルの取得
function getNationalityLabel(nationality: string): string {
  const nationalityMap: Record<string, string> = {
    'JP': '日本',
    'US': 'アメリカ',
    'GB': 'イギリス',
    'CA': 'カナダ',
    'AU': 'オーストラリア',
    'DE': 'ドイツ',
    'FR': 'フランス',
    'IT': 'イタリア',
    'ES': 'スペイン',
    'KR': '韓国',
    'CN': '中国',
    'TW': '台湾',
    'TH': 'タイ',
    'VN': 'ベトナム',
    'IN': 'インド',
  }
  return nationalityMap[nationality] || nationality
}