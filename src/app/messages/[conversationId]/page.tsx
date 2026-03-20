'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, ArrowLeft, Heart, User } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params?.conversationId as string

  const [messages, setMessages] = useState<any[]>([])
  const [conversation, setConversation] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/messages/${conversationId}`)
        const result = await response.json()
        if (response.ok) {
          setMessages(result.messages || [])
          setConversation(result.conversation || null)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMessages()
  }, [conversationId])

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return
    try {
      setIsSending(true)
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      })
      const result = await response.json()
      if (response.ok) {
        setMessages(prev => [...prev, result.data])
        setNewMessage('')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar className="w-64 hidden md:block" />
      <div className="md:ml-64 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center space-x-3">
          <button onClick={() => router.push('/messages')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {conversation?.partnerAvatar ? (
            <img src={conversation.partnerAvatar} alt={conversation.partnerName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 bg-sakura-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-sakura-600" />
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{conversation?.partnerName || 'Loading...'}</p>
            {conversation && (
              <p className="text-sm text-gray-500">
                {conversation.partnerNationality && conversation.partnerNationality !== '未設定' && (
                  <>{conversation.partnerNationality} · </>
                )}
                {conversation.partnerAge && <>{conversation.partnerAge}歳</>}
              </p>
            )}
          </div>
        </div>

        {/* メッセージ一覧 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl w-full mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-sakura-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {conversation?.matchedDate && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center bg-sakura-50 text-sakura-700 px-4 py-2 rounded-full text-sm">
                    <Heart className="w-4 h-4 mr-2 fill-current" />
                    {new Date(conversation.matchedDate).toLocaleDateString('ja-JP')} にマッチしました
                  </div>
                </div>
              )}
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.senderId === 'current_user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm px-4 py-2 rounded-2xl ${
                    message.senderId === 'current_user'
                      ? 'bg-sakura-600 text-white'
                      : 'bg-white text-gray-900 shadow-sm'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.senderId === 'current_user' ? 'text-sakura-100' : 'text-gray-400'}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* 入力欄 */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-2xl mx-auto flex items-center space-x-2">
            <Input
              placeholder="メッセージを入力..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!newMessage.trim() || isSending} variant="sakura">
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
