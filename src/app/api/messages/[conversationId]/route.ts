import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { requireActiveProfile } from '@/lib/auth/requireActiveProfile'

// メッセージ送信のスキーマ
const sendMessageSchema = z.object({
  content: z.string().max(1000, 'メッセージは1000文字以内で入力してください').default(''),
  image_url: z.string().url().optional(),
  translated_content: z.string().max(2000).nullable().optional(),
}).refine(data => data.content.trim().length > 0 || !!data.image_url, {
  message: 'メッセージまたは画像を入力してください',
})

interface Params {
  params: {
    conversationId: string
  }
}

// GET: 会話のメッセージ一覧取得
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = createClient(request)
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
    const limit = parseInt(searchParams.get('limit') || '500')
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

    // パートナーのIDを特定
    const partnerId = conversation.user1_id === user.id ? conversation.user2_id : conversation.user1_id

    // パートナーのプロフィール情報を取得
    const { data: partner, error: partnerError } = await supabase
      .from('profiles')
      .select('id, name, age, nationality, residence, city, avatar_url')
      .eq('id', partnerId)
      .single()

    if (partnerError) {
      console.error('Partner profile fetch error:', partnerError)
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
      translated_content: message.translated_content || null,
      image_url: message.image_url || null,
      timestamp: message.created_at,
      isRead: message.is_read,
      readAt: message.read_at,
    })) || []

    // 会話情報を構築
    const conversationInfo = partner ? {
      partnerId: partnerId,           // ブロック・通報処理に必須
      partnerName: partner.name || 'ユーザー',
      partnerAge: partner.age || null,
      partnerNationality: partner.nationality || '',
      partnerAvatar: partner.avatar_url || null,
      matchedDate: conversation.created_at,
    } : null

    return NextResponse.json({
      messages: formattedMessages,
      conversation: conversationInfo,
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
    const supabase = createClient(request)
    const conversationId = params.conversationId
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // memory #1 の 2 層防御: suspended ユーザーをここで弾く (指示書 #31)
    const guard = await requireActiveProfile(user.id)
    if (!guard.ok) {
      return NextResponse.json(
        { error: guard.message, code: guard.code },
        { status: guard.httpStatus }
      )
    }

    // ===== セキュリティチェック（APIレベル・回避不可） =====
    // service_role で RLS をバイパスして確実に取得
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('verification_status, gender')
      .eq('id', user.id)
      .single()

    // 年齢認証チェック（全ユーザー共通 — フロントエンド迂回不可）
    if (senderProfile?.verification_status !== 'approved') {
      return NextResponse.json(
        { error: '年齢認証が完了していません', code: 'verification_required' },
        { status: 403 }
      )
    }

    // 外国人男性のみ：課金チェック（日本人女性はスキップ）
    const senderIsJapaneseWoman = senderProfile?.gender === 'female'
    if (!senderIsJapaneseWoman) {
      const { data: activeSub } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (!activeSub) {
        return NextResponse.json(
          { error: 'サブスクリプションが必要です', code: 'subscription_required' },
          { status: 403 }
        )
      }
    }
    // ===== セキュリティチェック終了 =====

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

    const { content, image_url, translated_content } = validationResult.data

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
        translated_content: translated_content || null,
        image_url: image_url || null,
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

    // 会話の最終メッセージと更新時刻を更新
    const now = new Date().toISOString()
    const lastMessagePreview = image_url && !content.trim()
      ? '📷 画像'
      : content.length > 50 ? content.slice(0, 50) + '…' : content

    const { error: updateConvError } = await supabase
      .from('conversations')
      .update({
        updated_at: now,
        last_message: lastMessagePreview,
        last_message_at: now,
      })
      .eq('id', conversationId)

    if (updateConvError) {
      console.error('Conversation update error:', updateConvError)
    }

    // フロントエンド用の形式で返す
    const formattedMessage = {
      id: newMessage.id,
      senderId: newMessage.sender_id,
      content: newMessage.content,
      translated_content: newMessage.translated_content || null,
      image_url: newMessage.image_url || null,
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