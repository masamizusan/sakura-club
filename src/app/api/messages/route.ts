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

    console.log('=== Messages API v2 called ===')
    
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

    // ===== 2. conversations を取得（デバッグ: まず全件取得してみる） =====
    const { data: allConversations, error: allError } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    console.log('📋 [messages] All conversations (debug):', {
      count: allConversations?.length || 0,
      error: allError?.message,
      first: allConversations?.[0] ? {
        id: allConversations[0].id?.slice(0, 8),
        user1: allConversations[0].user1_id?.slice(0, 8),
        user2: allConversations[0].user2_id?.slice(0, 8)
      } : null
    })

    // myProfileId でフィルタリング（JavaScript側）
    const conversations = allConversations?.filter(c =>
      c.user1_id === myProfileId || c.user2_id === myProfileId
    ) || []

    console.log('📋 [messages] Filtered conversations:', {
      total: allConversations?.length || 0,
      filtered: conversations.length,
      myProfileId: myProfileId
    })

    if (allError) {
      console.error('❌ [messages] Conversations fetch error:', allError)
      return NextResponse.json(
        { error: '会話の取得に失敗しました', debug: { error: allError.message, code: allError.code } },
        { status: 500 }
      )
    }

    // conversationsが空の場合、デバッグ情報を含めて返す
    if (conversations.length === 0) {
      console.log('⚠️ [messages] No conversations found for profile:', myProfileId.slice(0, 8))
      return NextResponse.json({
        conversations: [],
        total: 0,
        _version: 'v2-debug-empty',
        debug: {
          authUserId: user.id,
          myProfileId: myProfileId,
          allConversationsCount: allConversations?.length || 0,
          sampleConversation: allConversations?.[0] ? {
            user1_id: allConversations[0].user1_id,
            user2_id: allConversations[0].user2_id
          } : null,
          message: 'No matching conversations found'
        }
      })
    }

    // ===== 3. 会話リストを返す（パートナーのプロフィールは profiles.id で取得） =====
    const partnerErrors: Array<{partnerId: string, error: string, code: string}> = []

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
          .select('id, name, age, nationality, residence, city, avatar_url, profile_initialized')
          .eq('id', partnerId)
          .single()

        if (partnerError) {
          console.error('❌ [messages] Partner profile error:', {
            partnerId: partnerId,
            error: partnerError.message,
            code: partnerError.code
          })
          partnerErrors.push({
            partnerId: partnerId,
            error: partnerError.message,
            code: partnerError.code || 'unknown'
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

        // 未読メッセージ数を取得（相手からのメッセージでis_read=false）
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', myProfileId)
          .eq('is_read', false)

        return {
          id: conv.id,
          partnerId,
          partnerName: partner.name || 'ユーザー',
          partnerAge: partner.age || null,
          partnerNationality: partner.nationality || '',
          partnerLocation: `${partner.residence || ''}${partner.city || ''}`.trim() || '未設定',
          partnerImage: partner.avatar_url || null,
          partnerAvatar: partner.avatar_url || null,
          lastMessage: {
            id: 'placeholder',
            senderId: partnerId,
            content: conv.last_message || 'マッチしました！メッセージを送ってみましょう',
            timestamp: conv.last_message_at || conv.created_at,
            isRead: true
          },
          unreadCount: unreadCount || 0,
          isOnline: false,
          matchedDate: conv.created_at,
        }
      })
    )

    // nullを除外
    const validConversations = conversationsWithMessages.filter(conv => conv !== null)
    const nullCount = conversationsWithMessages.filter(conv => conv === null).length

    console.log('📊 [messages] Final result:', {
      total: conversationsWithMessages.length,
      valid: validConversations.length,
      nullFiltered: nullCount
    })

    // 検索フィルター
    let filteredConversations = validConversations
    if (search) {
      filteredConversations = validConversations.filter(conv =>
        conv.partnerName.toLowerCase().includes(search.toLowerCase())
      )
    }

    return NextResponse.json({
      conversations: filteredConversations,
      total: filteredConversations.length,
      _version: 'v3-debug',
      _debug: {
        rawConversationsCount: conversations.length,
        validCount: validConversations.length,
        nullFilteredCount: nullCount,
        partnerErrors: partnerErrors.length > 0 ? partnerErrors : null,
        message: nullCount > 0 ? 'Some conversations filtered due to missing partner profiles' : 'OK'
      }
    })

  } catch (error) {
    console.error('Messages GET error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

