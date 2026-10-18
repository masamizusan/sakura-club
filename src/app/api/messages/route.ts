import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// 処理時間の計測（#11）：段階ごとの ms を Server-Timing ヘッダーで返す（個人情報は入れない）
// ブラウザの開発者ツール → Network → このリクエスト → Timing で見られる
function createTimer() {
  const startedAt = Date.now()
  const entries: Array<[string, number]> = []
  return {
    async measure<T>(name: string, fn: () => PromiseLike<T>): Promise<T> {
      const t0 = Date.now()
      try {
        return await fn()
      } finally {
        entries.push([name, Date.now() - t0])
      }
    },
    header(): string {
      return [...entries, ['total', Date.now() - startedAt] as [string, number]]
        .map(([name, ms]) => `${name};dur=${ms}`)
        .join(', ')
    },
  }
}

// GET: 会話一覧の取得
export async function GET(request: NextRequest) {
  const timer = createTimer()
  const respond = (body: unknown, init?: { status?: number }) =>
    NextResponse.json(body, { status: init?.status, headers: { 'Server-Timing': timer.header() } })

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

    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await timer.measure('auth', () => supabase.auth.getUser())
    if (authError || !user) {
      return respond({ error: '認証が必要です' }, { status: 401 })
    }

    // profiles.id = auth.uid() の設計なので、直接 user.id を使用
    const myProfileId = user.id

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // ブロック済みユーザーとの会話を除外するため、service_role でブロックを取る（RLS バイパス・両方向）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ② 会話（自分が参加者のものだけ RLS で返る）と ③ ブロックを同時に取る
    const [conversationsResult, blocksResult] = await Promise.all([
      timer.measure('conv', () => supabase
        .from('conversations')
        .select('*, is_seen_user1, is_seen_user2')
        // 最後にやり取りした順（まだやり取りが無い会話は後ろ）→ マッチした日の新しい順。最大 100 件
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(100)),
      timer.measure('blocks', () => supabaseAdmin
        .from('blocks')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${myProfileId},blocked_id.eq.${myProfileId}`)),
    ])

    const { data: allConversations, error: allError } = conversationsResult
    if (allError) {
      console.error('[messages] conversations fetch error:', allError.message)
      return respond({ error: '会話の取得に失敗しました' }, { status: 500 })
    }
    if (blocksResult.error) {
      console.error('[messages] blocks fetch error:', blocksResult.error.message)
    }

    const blockedIdSet = new Set(blocksResult.data?.map(b =>
      b.blocker_id === myProfileId ? b.blocked_id : b.blocker_id
    ) ?? [])

    // 自分の会話のうち、ブロック関係の相手との会話を除く
    const conversations = (allConversations ?? []).filter(c => {
      if (c.user1_id !== myProfileId && c.user2_id !== myProfileId) return false
      const partnerId = c.user1_id === myProfileId ? c.user2_id : c.user1_id
      return !blockedIdSet.has(partnerId)
    })

    if (conversations.length === 0) {
      return respond({ conversations: [], total: 0 })
    }

    const partnerIdOf = (conv: { user1_id: string; user2_id: string }) =>
      conv.user1_id === myProfileId ? conv.user2_id : conv.user1_id
    const partnerIds = Array.from(new Set(conversations.map(partnerIdOf)))
    const conversationIds = conversations.map(c => c.id)

    // ④ 相手のプロフィール（公開用ビュー。未完成・停止中・ブロック関係の相手は返らず、一覧から除外）と
    // ⑤ 未読（相手からのメッセージで is_read = false）を、それぞれ 1 回で同時に取る
    const [partnersResult, unreadResult] = await Promise.all([
      timer.measure('partners', () => supabase
        .from('profiles_public')
        .select('id, name, age, nationality, residence, city, avatar_url')
        .in('id', partnerIds)),
      timer.measure('unread', () => supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .neq('sender_id', myProfileId)
        .eq('is_read', false)),
    ])

    if (partnersResult.error) {
      console.error('[messages] partner profiles fetch error:', partnersResult.error.message)
    }
    if (unreadResult.error) {
      console.error('[messages] unread fetch error:', unreadResult.error.message)
    }

    const partnerById = new Map((partnersResult.data ?? []).map(p => [p.id, p]))
    const unreadByConversation = new Map<string, number>()
    for (const row of unreadResult.data ?? []) {
      unreadByConversation.set(row.conversation_id, (unreadByConversation.get(row.conversation_id) ?? 0) + 1)
    }

    const validConversations = conversations.flatMap(conv => {
      const partnerId = partnerIdOf(conv)
      const partner = partnerById.get(partnerId)
      // パートナー情報がない場合はスキップ
      if (!partner) return []

      // 自分側の is_seen フラグを確認
      const isNewMatch = conv.user1_id === myProfileId
        ? conv.is_seen_user1 === false
        : conv.is_seen_user2 === false

      return [{
        id: conv.id,
        partnerId,
        // 名前・場所・最後のメッセージが無いときは null（表示する文は画面側の辞書で 4 言語にする）
        partnerName: partner.name || null,
        partnerAge: partner.age || null,
        partnerNationality: partner.nationality || '',
        partnerLocation: `${partner.residence || ''}${partner.city || ''}`.trim() || null,
        partnerImage: partner.avatar_url || null,
        partnerAvatar: partner.avatar_url || null,
        lastMessage: {
          id: 'placeholder',
          senderId: partnerId,
          content: conv.last_message || null,
          timestamp: conv.last_message_at || conv.created_at,
          isRead: true
        },
        unreadCount: unreadByConversation.get(conv.id) ?? 0,
        isOnline: false,
        matchedDate: conv.created_at,
        isNewMatch,
      }]
    })

    // 検索フィルター
    let filteredConversations = validConversations
    if (search) {
      filteredConversations = validConversations.filter(conv =>
        (conv.partnerName ?? '').toLowerCase().includes(search.toLowerCase())
      )
    }

    return respond({
      conversations: filteredConversations,
      total: filteredConversations.length,
    })

  } catch (error) {
    console.error('Messages GET error:', error instanceof Error ? error.message : error)
    return respond({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
