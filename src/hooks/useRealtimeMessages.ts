import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface Message {
  id: string
  senderId: string
  content: string
  timestamp: string
  isRead: boolean
  readAt?: string
}

interface UseRealtimeMessagesProps {
  conversationId: string | null
  userId: string | null
  onNewMessage?: (message: Message) => void
  onMessageUpdate?: (message: Message) => void
}

export function useRealtimeMessages({
  conversationId,
  userId,
  onNewMessage,
  onMessageUpdate,
}: UseRealtimeMessagesProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const channelRef = useRef<any>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!conversationId || !userId) {
      return
    }

    // リアルタイム接続の設定
    const setupRealtimeConnection = () => {
      try {
        console.log('Setting up realtime connection for conversation:', conversationId)
        
        // 既存の接続があれば削除
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
        }

        // 新しいチャンネルを作成
        const channel = supabase
          .channel(`messages:${conversationId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${conversationId}`,
            },
            (payload: RealtimePostgresChangesPayload<any>) => {
              console.log('New message received:', payload)
              
              if (payload.new) {
                const newMessage: Message = {
                  id: payload.new.id,
                  senderId: payload.new.sender_id,
                  content: payload.new.content,
                  timestamp: payload.new.created_at,
                  isRead: payload.new.is_read,
                  readAt: payload.new.read_at,
                }

                // 自分のメッセージでない場合のみコールバックを実行
                if (newMessage.senderId !== userId && onNewMessage) {
                  onNewMessage(newMessage)
                }
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${conversationId}`,
            },
            (payload: RealtimePostgresChangesPayload<any>) => {
              console.log('Message updated:', payload)
              
              if (payload.new && onMessageUpdate) {
                const updatedMessage: Message = {
                  id: payload.new.id,
                  senderId: payload.new.sender_id,
                  content: payload.new.content,
                  timestamp: payload.new.created_at,
                  isRead: payload.new.is_read,
                  readAt: payload.new.read_at,
                }

                onMessageUpdate(updatedMessage)
              }
            }
          )
          .subscribe((status) => {
            console.log('Realtime connection status:', status)
            
            if (status === 'SUBSCRIBED') {
              setIsConnected(true)
              setConnectionError(null)
            } else if (status === 'CHANNEL_ERROR') {
              setIsConnected(false)
              setConnectionError('リアルタイム接続エラーが発生しました')
            } else if (status === 'TIMED_OUT') {
              setIsConnected(false)
              setConnectionError('リアルタイム接続がタイムアウトしました')
            }
          })

        channelRef.current = channel
        
      } catch (error) {
        console.error('Realtime setup error:', error)
        setConnectionError('リアルタイム機能の初期化に失敗しました')
        setIsConnected(false)
      }
    }

    setupRealtimeConnection()

    // クリーンアップ
    return () => {
      if (channelRef.current) {
        console.log('Cleaning up realtime connection')
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
      setConnectionError(null)
    }
  }, [conversationId, userId, onNewMessage, onMessageUpdate, supabase])

  // オンライン状態の更新
  const updateOnlineStatus = async (isOnline: boolean) => {
    if (!userId) return

    try {
      await supabase
        .from('profiles')
        .update({ 
          last_seen: new Date().toISOString(),
          is_online: isOnline
        })
        .eq('id', userId)
    } catch (error) {
      console.error('Failed to update online status:', error)
    }
  }

  // ページの可視性変更時にオンライン状態を更新
  useEffect(() => {
    const handleVisibilityChange = () => {
      updateOnlineStatus(!document.hidden)
    }

    const handleBeforeUnload = () => {
      updateOnlineStatus(false)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // 初期状態でオンラインに設定
    updateOnlineStatus(true)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      updateOnlineStatus(false)
    }
  }, [userId])

  return {
    isConnected,
    connectionError,
  }
}