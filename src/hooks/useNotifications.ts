'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NotificationCounts {
  unreadMessages: number
  unseenLikes: number
}

export function useNotifications() {
  const [counts, setCounts] = useState<NotificationCounts>({
    unreadMessages: 0,
    unseenLikes: 0,
  })
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createClient()

  // カウント取得
  const fetchCounts = useCallback(async (uid: string) => {
    try {
      // 1. ユーザーが参加している会話のIDを取得
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)

      const convIds = convs?.map(c => c.id) || []

      // 2. 未読メッセージ数
      let unreadMessages = 0
      if (convIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', convIds)
          .neq('sender_id', uid)
          .eq('is_read', false)
        unreadMessages = count || 0
      }

      // 3. 未確認いいね数（is_seen = false）
      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('liked_user_id', uid)
        .eq('is_seen', false)

      setCounts({
        unreadMessages,
        unseenLikes: likesCount || 0,
      })
    } catch (err) {
      console.error('Notification count fetch error:', err)
    }
  }, [supabase])

  // 初期化 & リアルタイム購読
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await fetchCounts(user.id)

      // リアルタイム購読：メッセージ & いいねの変更で再取得
      channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => fetchCounts(user.id)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
          () => fetchCounts(user.id)
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'likes' },
          () => fetchCounts(user.id)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'likes' },
          () => fetchCounts(user.id)
        )
        .subscribe()
    }

    init()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, fetchCounts])

  return { ...counts, userId, refetch: () => userId && fetchCounts(userId) }
}
