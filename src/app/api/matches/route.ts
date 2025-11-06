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
      console.log('🧪 Dev test mode detected - bypassing authentication for matches API')
      // テストモードの場合はサンプルデータを直接返す
      const sampleMatches = [
        {
          id: 'alex-johnson',
          firstName: 'Alex',
          lastName: 'Johnson',
          age: 28,
          nationality: 'アメリカ',
          nationalityLabel: 'アメリカ',
          prefecture: '東京都',
          city: '渋谷区',
          hobbies: ['茶道', '書道', '神社巡り', '寿司', '料理'],
          selfIntroduction: '日本の伝統文化に深い興味があり、特に茶道と書道を学びたいと思っています。日本での生活を通じて、多くの素晴らしい文化体験をしたいと考えています。',
          profileImage: null,
          lastSeen: '2025-11-06T01:30:00Z',
          isOnline: true,
          matchPercentage: 92,
          commonInterests: ['茶道', '書道', '料理'],
          distanceKm: 5.2
        },
        {
          id: 'david-wilson',
          firstName: 'David',
          lastName: 'Wilson',
          age: 32,
          nationality: 'イギリス',
          nationalityLabel: 'イギリス',
          prefecture: '大阪府',
          city: '大阪市',
          hobbies: ['書道', '相撲', '和菓子', '日本酒', '温泉'],
          selfIntroduction: 'イギリスから来ました。日本の伝統的な文化、特に書道と相撲に興味があります。和菓子作りも学んでみたいです。',
          profileImage: null,
          lastSeen: '2025-11-06T00:15:00Z',
          isOnline: false,
          matchPercentage: 85,
          commonInterests: ['書道', '日本酒'],
          distanceKm: 8.7
        },
        {
          id: 'michael-brown',
          firstName: 'Michael',
          lastName: 'Brown',
          age: 26,
          nationality: 'カナダ',
          nationalityLabel: 'カナダ',
          prefecture: '京都府',
          city: '京都市',
          hobbies: ['着物', '祭り', '温泉', '料理', '写真撮影'],
          selfIntroduction: 'カナダ出身です。日本の着物文化と季節の祭りに魅力を感じています。一緒に文化体験を楽しめる方と出会えたら嬉しいです。',
          profileImage: null,
          lastSeen: '2025-11-05T20:45:00Z',
          isOnline: false,
          matchPercentage: 78,
          commonInterests: ['温泉', '料理'],
          distanceKm: 12.3
        }
      ]
      
      return NextResponse.json({
        matches: sampleMatches,
        total: sampleMatches.length,
        hasMore: false
      })
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