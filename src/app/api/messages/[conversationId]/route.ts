import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// メッセージ送信のスキーマ
const sendMessageSchema = z.object({
  content: z.string().min(1, 'メッセージを入力してください').max(1000, 'メッセージは1000文字以内で入力してください'),
})

interface Params {
  params: {
    conversationId: string
  }
}

// GET: 会話のメッセージ一覧取得
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const conversationId = params.conversationId
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 会話の存在確認とアクセス権限チェック
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: '会話が見つかりません' },
        { status: 404 }
      )
    }

    // ユーザーがこの会話の参加者かチェック
    if (conversation.user1_id !== user.id && conversation.user2_id !== user.id) {
      return NextResponse.json(
        { error: 'この会話にアクセスする権限がありません' },
        { status: 403 }
      )
    }

    // メッセージ一覧を取得
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (messagesError) {
      console.error('Messages fetch error:', messagesError)
      return NextResponse.json(
        { error: 'メッセージの取得に失敗しました' },
        { status: 500 }
      )
    }

    // 自分宛の未読メッセージを既読にする
    const { error: markReadError } = await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('is_read', false)
      .neq('sender_id', user.id)

    if (markReadError) {
      console.error('Mark as read error:', markReadError)
    }

    // フロントエンド用の形式に変換
    const formattedMessages = messages?.map(message => ({
      id: message.id,
      senderId: message.sender_id,
      content: message.content,
      timestamp: message.created_at,
      isRead: message.is_read,
      readAt: message.read_at,
    })) || []

    return NextResponse.json({
      messages: formattedMessages,
      total: formattedMessages.length,
      hasMore: formattedMessages.length === limit
    })

  } catch (error) {
    console.error('Messages GET by conversation error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST: メッセージ送信
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = createClient()
    const conversationId = params.conversationId
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // リクエストボディの解析
    const body = await request.json()
    
    // バリデーション
    const validationResult = sendMessageSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'バリデーションエラー',
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const { content } = validationResult.data

    // 会話の存在確認とアクセス権限チェック
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: '会話が見つかりません' },
        { status: 404 }
      )
    }

    // ユーザーがこの会話の参加者かチェック
    if (conversation.user1_id !== user.id && conversation.user2_id !== user.id) {
      return NextResponse.json(
        { error: 'この会話にメッセージを送信する権限がありません' },
        { status: 403 }
      )
    }

    // メッセージの作成
    const { data: newMessage, error: createError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error('Message creation error:', createError)
      return NextResponse.json(
        { error: 'メッセージの送信に失敗しました' },
        { status: 500 }
      )
    }

    // 会話の最終更新時刻を更新
    const { error: updateConvError } = await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (updateConvError) {
      console.error('Conversation update error:', updateConvError)
    }

    // フロントエンド用の形式で返す
    const formattedMessage = {
      id: newMessage.id,
      senderId: newMessage.sender_id,
      content: newMessage.content,
      timestamp: newMessage.created_at,
      isRead: newMessage.is_read,
      readAt: newMessage.read_at,
    }

    return NextResponse.json({
      message: 'メッセージが正常に送信されました',
      data: formattedMessage
    }, { status: 201 })

  } catch (error) {
    console.error('Message POST error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}