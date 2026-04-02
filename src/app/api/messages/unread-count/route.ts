import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ count: 0 }, { status: 401 })
    }

    const uid = user.id

    // 全会話を取得してJSでフィルタ（messages/route.tsと同じ方法）
    const { data: allConversations } = await supabase
      .from('conversations')
      .select('id, user1_id, user2_id')

    const myConvIds = (allConversations || [])
      .filter(c => c.user1_id === uid || c.user2_id === uid)
      .map(c => c.id)

    if (myConvIds.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    // 自分が受信した未読メッセージ数をカウント
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', myConvIds)
      .neq('sender_id', uid)
      .eq('is_read', false)

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Unread count error:', error)
    return NextResponse.json({ count: 0 })
  }
}
