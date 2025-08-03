import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// テストデータ作成用のAPIエンドポイント
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 1. テスト用パートナーユーザーのプロフィール作成
    const testPartnerId = '11111111-1111-1111-1111-111111111111'
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: testPartnerId,
        email: 'test.partner@example.com',
        first_name: '花子',
        last_name: '佐藤',
        gender: 'female',
        age: 25,
        nationality: 'JP',
        prefecture: '大阪府',
        city: '大阪市',
        interests: ['読書', '映画鑑賞'],
        bio: 'よろしくお願いします！',
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
    }

    // 2. 会話の作成
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .upsert({
        id: '22222222-2222-2222-2222-222222222222',
        user1_id: user.id,
        user2_id: testPartnerId,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1日前
        updated_at: new Date().toISOString()
      })
      .select()

    if (convError) {
      console.error('Conversation creation error:', convError)
      return NextResponse.json(
        { error: '会話の作成に失敗しました', details: convError.message },
        { status: 500 }
      )
    }

    // 3. テストメッセージの作成
    const { error: messageError } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: '22222222-2222-2222-2222-222222222222',
          sender_id: testPartnerId,
          content: 'こんにちは！文化体験に興味があります。',
          is_read: false,
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1時間前
        },
        {
          conversation_id: '22222222-2222-2222-2222-222222222222',
          sender_id: user.id,
          content: 'はじめまして！一緒に体験しましょう。',
          is_read: true,
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30分前
        }
      ])

    if (messageError) {
      console.error('Message creation error:', messageError)
    }

    return NextResponse.json({
      success: true,
      message: 'テストデータを作成しました',
      userId: user.id,
      conversation: conversation
    })

  } catch (error) {
    console.error('Test data creation error:', error)
    return NextResponse.json(
      { error: 'テストデータの作成に失敗しました' },
      { status: 500 }
    )
  }
}