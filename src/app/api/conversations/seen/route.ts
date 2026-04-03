import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 認証確認
    const supabase = createClient(req)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { conversationId } = await req.json()
    if (!conversationId) return NextResponse.json({ error: 'conversationId が必要です' }, { status: 400 })

    // 会話の参加者確認
    const { data: conv } = await serviceSupabase
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single()

    if (!conv) return NextResponse.json({ error: '会話が見つかりません' }, { status: 404 })

    // 自分側のフィールドを既読にする
    const field = conv.user1_id === user.id ? 'is_seen_user1' : 'is_seen_user2'

    await serviceSupabase
      .from('conversations')
      .update({ [field]: true })
      .eq('id', conversationId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Conversation seen error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
