import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

// GET: 会話一覧の取得
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() { /* Route Handlerでは不要 */ },
        },
      }
    )

    console.log('=== Messages API called ===')
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // デバッグ情報
    console.log('🔐 [messages] Auth:', {
      hasUser: !!user,
      userId: user?.id?.slice(0, 8),
      error: authError?.message
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

    // ===== 1. 自分の profiles.id を取得 =====
    // profiles.id = auth.uid() の設計なので、直接 user.id を使用
    const myProfileId = user.id

    console.log('👤 [messages] Using auth user id as profile id:', {
      myProfileId: myProfileId.slice(0, 8)
    })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // ===== 2. conversations を myProfileId で検索（RLSバイパスのためservice_roleは使えないので注意） =====
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${myProfileId},user2_id.eq.${myProfileId}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ [messages] Conversations fetch error:', error)

      // conversationsテーブルが存在しない場合、空の配列を返す
      if (error.code === '42P01') { // relation does not exist
        console.log('⚠️ [messages] Conversations table does not exist')
        return NextResponse.json({
          conversations: [],
          total: 0
        })
      }

      return NextResponse.json(
        { error: '会話の取得に失敗しました', debug: { error: error.message, code: error.code } },
        { status: 500 }
      )
    }

    console.log('📋 [messages] Raw conversations from DB:', {
      count: conversations?.length || 0,
      ids: conversations?.map(c => c.id?.slice(0, 8)) || []
    })

    // conversationsが空の場合、デバッグ情報を含めて返す
    if (!conversations || conversations.length === 0) {
      console.log('⚠️ [messages] No conversations found for profile:', myProfileId.slice(0, 8))
      return NextResponse.json({
        conversations: [],
        total: 0,
        debug: {
          authUserId: user.id,
          myProfileId: myProfileId,
          queryFilter: `user1_id.eq.${myProfileId},user2_id.eq.${myProfileId}`,
          message: 'No conversations found - RLS may be blocking. Check if auth.uid() matches user1_id or user2_id'
        }
      })
    }

    // ===== 3. 会話リストを返す（パートナーのプロフィールは profiles.id で取得） =====
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        // partnerId は myProfileId と比較して決定
        const partnerId = conv.user1_id === myProfileId ? conv.user2_id : conv.user1_id

        console.log('🔗 [messages] Processing conversation:', {
          convId: conv.id?.slice(0, 8),
          user1: conv.user1_id?.slice(0, 8),
          user2: conv.user2_id?.slice(0, 8),
          myProfileId: myProfileId.slice(0, 8),
          partnerId: partnerId?.slice(0, 8)
        })

        // パートナーのプロフィール情報を取得（profiles.id ベースで検索）
        const { data: partner, error: partnerError } = await supabase
          .from('profiles')
          .select('id, name, last_name, age, nationality, residence, city, avatar_url, updated_at, profile_initialized')
          .eq('id', partnerId)
          .single()

        if (partnerError) {
          console.error('❌ [messages] Partner profile error:', {
            partnerId: partnerId?.slice(0, 8),
            error: partnerError.message,
            code: partnerError.code
          })
        }

        console.log('👤 [messages] Partner profile:', partner ? {
          id: partner.id?.slice(0, 8),
          name: partner.name,
          initialized: partner.profile_initialized
        } : 'NOT FOUND')

        if (!partner) {
          console.log('⚠️ [messages] Skipping conversation - no partner profile for:', partnerId?.slice(0, 8))
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