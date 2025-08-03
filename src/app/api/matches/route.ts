import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: マッチング候補の取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

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
    existingLikes?.forEach(like => {
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
    const formattedCandidates = candidates?.map(candidate => {
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
    console.error('Matches GET error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
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