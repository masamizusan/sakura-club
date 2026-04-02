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
      // 1. 未読メッセージ数
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)

      const convIds = convs?.map(c => c.id) || []
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

      // 2. 未確認いいね数
      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('liked_user_id', uid)
        .eq('is_seen', false)

      // 3. 未読足跡数
      const { count: footprintsCount } = await supabase
        .from('footprints')
        .select('*', { count: 'exact', head: true })
        .eq('profile_owner_id', uid)
        .eq('is_read', false)

      const result = {
        unreadMessages,
        unseenLikes: likesCount || 0,
        unreadFootprints: footprintsCount || 0,
      }
      console.log('[useNotifications] fetchCounts result:', result, 'uid:', uid.slice(0,8))
      setCounts(result)
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
