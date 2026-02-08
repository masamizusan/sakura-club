import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET: マッチしたユーザー一覧の取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(request)
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // マッチしたユーザーの取得（prefecture は存在しないので residence を使用）
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        liked_profile:profiles!matches_liked_user_id_fkey(
          id,
          first_name,
          last_name,
          age,
          nationality,
          residence,
          city,
          hobbies,
          self_introduction,
          profile_image,
          updated_at
        ),
        liker_profile:profiles!matches_liker_user_id_fkey(
          id,
          first_name,
          last_name,
          age,
          nationality,
          residence,
          city,
          hobbies,
          self_introduction,
          profile_image,
          updated_at
        )
      `)
      .eq('is_matched', true)
      .or(`liker_user_id.eq.${user.id},liked_user_id.eq.${user.id}`)
      .order('matched_at', { ascending: false })

    if (error) {
      console.error('Matched users fetch error:', error)
      return NextResponse.json(
        { error: 'マッチしたユーザーの取得に失敗しました' },
        { status: 500 }
      )
    }

    // フロントエンド用の形式に変換
    const formattedMatches = matches?.map(match => {
      // 相手のプロフィール情報を取得
      const isLiker = match.liker_user_id === user.id
      const partnerProfile = isLiker ? match.liked_profile : match.liker_profile
      
      if (!partnerProfile) return null

      return {
        matchId: match.id,
        partnerId: partnerProfile.id,
        partnerName: `${partnerProfile.first_name} ${partnerProfile.last_name}`,
        partnerAge: partnerProfile.age,
        partnerNationality: getNationalityLabel(partnerProfile.nationality),
        partnerLocation: `${partnerProfile.residence || ''}${partnerProfile.city || ''}`,
        partnerImage: partnerProfile.profile_image,
        partnerHobbies: partnerProfile.hobbies || [],
        partnerIntroduction: partnerProfile.self_introduction,
        matchedDate: match.matched_at,
        lastSeen: partnerProfile.updated_at,
        isOnline: false, // TODO: オンライン状態の実装
      }
    }).filter(Boolean) || []

    return NextResponse.json({
      matches: formattedMatches,
      total: formattedMatches.length
    })

  } catch (error) {
    console.error('Matched users GET error:', error)
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