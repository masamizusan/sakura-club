import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { requireActiveProfile } from '@/lib/auth/requireActiveProfile'

// メッセージ送信のスキーマ
const sendMessageSchema = z.object({
  content: z.string().max(1000, 'メッセージは1000文字以内で入力してください').default(''),
  // 段階1-B: chat-images のパス「{conversationId}/{ファイル名}」のみ（形式と会話 ID の一致は POST 内で検証）
  image_url: z.string().optional(),
  translated_content: z.string().max(2000).nullable().optional(),
  // #15: translated_content の言語（ja/en/ko/zh-tw 以外は保存時に null にする）
  translated_lang: z.string().nullable().optional(),
  // #25: 送る側が付ける一意の ID（再送で二重保存しないため）。形式が違うものは null として扱う
  client_message_id: z.unknown().optional(),
}).refine(data => data.content.trim().length > 0 || !!data.image_url, {
  message: 'メッセージまたは画像を入力してください',
})

// #25: client_message_id は uuid 形式のものだけ使う
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CLIENT_MESSAGE_ID_INDEX = 'messages_sender_client_message_id_key'

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

    // パートナーのプロフィール情報を取得（段階2-A: 公開用ビュー）
    // 未完成・停止中・ブロック関係・退会の相手は取得できない → エラーにせず partner_unavailable で返す
    const { data: partner, error: partnerError } = await supabase
      .from('profiles_public')
      .select('id, name, age, nationality, residence, city, avatar_url')
      .eq('id', partnerId)
      .maybeSingle()

    if (partnerError) {
      console.error('Partner profile fetch error:', partnerError)
    }
    const partnerUnavailable = !partner

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
      // #25: 画面が取り直したとき、同じ ID の仮メッセージを消すために返す
      client_message_id: message.client_message_id || null,
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
      partner_unavailable: partnerUnavailable,
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

    const { content, image_url, translated_content, translated_lang, client_message_id } = validationResult.data
    // #25: uuid 形式でなければ null（従来どおり重複の確認なしで保存）
    const clientMessageId =
      typeof client_message_id === 'string' && UUID_PATTERN.test(client_message_id)
        ? client_message_id.toLowerCase()
        : null
    // #15: 訳が無い、または ja/en/ko/zh-tw 以外なら null
    const translatedLangToSave =
      translated_content && translated_lang && ['ja', 'en', 'ko', 'zh-tw'].includes(translated_lang)
        ? translated_lang
        : null

    // 段階1-B: image_url は「{この会話の ID}/{英数字・ハイフン・ドット・アンダースコアのみのファイル名}」のみ許可
    if (image_url !== undefined) {
      const fileName = image_url.startsWith(`${conversationId}/`)
        ? image_url.slice(conversationId.length + 1)
        : ''
      if (!/^[A-Za-z0-9._-]+$/.test(fileName) || fileName.includes('..')) {
        return NextResponse.json(
          { error: 'バリデーションエラー', details: [{ path: ['image_url'], message: 'invalid image path' }] },
          { status: 400 }
        )
      }
    }

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
    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        translated_content: translated_content || null,
        translated_lang: translatedLangToSave,
        image_url: image_url || null,
        is_read: false,
        created_at: new Date().toISOString(),
        client_message_id: clientMessageId,
      })
      .select()
      .single()

    let newMessage = insertedMessage
    let createError = insertError

    // #25: 同じ送信者・同じ client_message_id が既に保存済み（通信が切れた後の再送など）
    // → 新しく保存せず、既にある行を通常の成功と同じ形で返す（冪等）
    if (
      insertError &&
      clientMessageId &&
      insertError.code === '23505' &&
      `${insertError.message} ${insertError.details ?? ''}`.includes(CLIENT_MESSAGE_ID_INDEX)
    ) {
      const { data: existingMessage, error: existingError } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', user.id)
        .eq('client_message_id', clientMessageId)
        .eq('conversation_id', conversationId)
        .maybeSingle()
      if (existingError) {
        console.error('[messages] duplicate lookup error:', existingError.message)
      }
      if (existingMessage) {
        newMessage = existingMessage
        createError = null
      }
    }

    if (createError || !newMessage) {
      console.error('Message creation error:', createError)
      return NextResponse.json(
        { error: 'メッセージの送信に失敗しました' },
        { status: 500 }
      )
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
      client_message_id: newMessage.client_message_id || null,
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