import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET: 会話一覧の取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(request)
    
    console.log('=== Messages API called ===')
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // デバッグ情報
    console.log('Auth debug:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      authError: authError?.message,
      cookies: request.headers.get('cookie')
    })
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          error: '認証が必要です',
          debug: { authError: authError?.message, hasUser: !!user }
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // まず、conversationsテーブルが存在するかチェック
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Conversations fetch error:', error)
      
      // conversationsテーブルが存在しない場合、空の配列を返す
      if (error.code === '42P01') { // relation does not exist
        console.log('Conversations table does not exist, returning empty array')
        return NextResponse.json({
          conversations: [],
          total: 0
        })
      }
      
      return NextResponse.json(
        { error: '会話の取得に失敗しました', debug: error.message },
        { status: 500 }
      )
    }

    // conversationsが空の場合、空の配列を返す
    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        conversations: [],
        total: 0
      })
    }

    console.log('Found conversations:', conversations.length)

    // 簡略化された会話リストを返す（プロフィール情報は後で取得）
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const partnerId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id
        
        console.log('Processing conversation:', { 
          convId: conv.id, 
          user1: conv.user1_id, 
          user2: conv.user2_id, 
          currentUser: user.id, 
          partnerId 
        })
        
        // パートナーのプロフィール情報を取得（自分自身の場合も含む）
        const { data: partner } = await supabase
          .from('profiles')
          .select('id, name, last_name, age, nationality, residence, city, updated_at')
          .eq('id', partnerId)
          .single()

        console.log('Partner profile:', partner)

        if (!partner) {
          console.log('No partner found for ID:', partnerId)
          return null // パートナー情報がない場合はスキップ
        }

        return {
          id: conv.id,
          partnerId,
          partnerName: `${partner.name || ''} ${partner.last_name || ''}`.trim() || 'テストユーザー',
          partnerAge: partner.age || 25,
          partnerNationality: getNationalityLabel(partner.nationality || 'JP'),
          partnerLocation: `${partner.residence || '東京都'}${partner.city || ''}`,
          lastMessage: null, // 暫定的にnull
          unreadCount: 0, // 暫定的に0
          isOnline: false, // 暫定的にfalse
          matchedDate: conv.created_at,
        }
      })
    )

    // nullを除外
    const validConversations = conversationsWithMessages.filter(conv => conv !== null)

    // 検索フィルター
    let filteredConversations = validConversations
    if (search) {
      filteredConversations = validConversations.filter(conv =>
        conv.partnerName.toLowerCase().includes(search.toLowerCase())
      )
    }

    return NextResponse.json({
      conversations: filteredConversations,
      total: filteredConversations.length
    })

  } catch (error) {
    console.error('Messages GET error:', error)
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