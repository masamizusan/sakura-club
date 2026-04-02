'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NotificationCounts {
  unreadMessages: number
  unseenLikes: number
  unreadFootprints: number
}

const POLL_INTERVAL_MS = 5000

export function useNotifications() {
  const [counts, setCounts] = useState<NotificationCounts>({
    unreadMessages: 0,
    unseenLikes: 0,
    unreadFootprints: 0,
  })
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchCounts = useCallback(async (uid: string) => {
    try {
      // 1. 未読メッセージ数 + 新規マッチ数（サーバーAPIで取得：クライアント側RLS回避）
      let unreadMessages = 0
      try {
        const lastSeen = typeof window !== 'undefined'
          ? (localStorage.getItem(`messages_last_seen_${uid}`) || '')
          : ''
        const params = lastSeen ? `?since=${encodeURIComponent(lastSeen)}` : ''
        const res = await fetch(`/api/messages/unread-count${params}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          unreadMessages = (data.count || 0) + (data.newMatches || 0)
        }
      } catch {
        // フォールバック：直接クエリ
        const { data: convs } = await supabase
          .from('conversations')
          .select('id, user1_id, user2_id')
        const myConvIds = (convs || [])
          .filter(c => c.user1_id === uid || c.user2_id === uid)
          .map(c => c.id)
        if (myConvIds.length > 0) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', myConvIds)
            .neq('sender_id', uid)
            .eq('is_read', false)
          unreadMessages = count || 0
        }
      }

      // 2. 未確認いいね数
      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('liked_user_id', uid)
        .eq('is_seen', false)

      // 3. 未読足跡数（ユニーク訪問者数）
      const { data: footprintsData } = await supabase
        .from('footprints')
        .select('visitor_id')
        .eq('profile_owner_id', uid)
        .eq('is_read', false)

      const uniqueFootprintsCount = new Set(footprintsData?.map(f => f.visitor_id)).size

      setCounts({
        unreadMessages,
        unseenLikes: likesCount || 0,
        unreadFootprints: uniqueFootprintsCount,
      })
    } catch (err) {
      console.error('Notification count fetch error:', err)
    }
  }, [supabase])

  useEffect(() => {
    let uid: string | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      uid = user.id
      setUserId(user.id)

      // 初回フェッチ
      await fetchCounts(uid)

      // 5秒ごとにポーリング
      intervalId = setInterval(() => {
        if (uid) fetchCounts(uid)
      }, POLL_INTERVAL_MS)
    }

    init()

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [supabase, fetchCounts])

  return { ...counts, userId, refetch: () => userId && fetchCounts(userId) }
}
