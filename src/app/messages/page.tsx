'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  MessageCircle, 
  Send, 
  Search, 
  User,
  Phone,
  Video,
  MoreVertical,
  Heart,
  Calendar,
  Globe,
  Circle
} from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'

// メッセージの型定義
interface Message {
  id: string
  senderId: string
  content: string
  timestamp: string
  isRead: boolean
}

// 会話の型定義
interface Conversation {
  id: string
  partnerId: string
  partnerName: string
  partnerAge: number
  partnerNationality: string
  partnerLocation: string
  lastMessage: Message
  unreadCount: number
  isOnline: boolean
  matchedDate: string
}

// サンプル会話データ
const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv1',
    partnerId: 'user1',
    partnerName: 'Sarah Johnson',
    partnerAge: 26,
    partnerNationality: 'アメリカ',
    partnerLocation: '東京都渋谷区',
    lastMessage: {
      id: 'msg1',
      senderId: 'user1',
      content: '明日の茶道体験、とても楽しみにしています！何か持参するものはありますか？',
      timestamp: '2025-07-30T14:30:00Z',
      isRead: false
    },
    unreadCount: 2,
    isOnline: true,
    matchedDate: '2025-07-25T10:00:00Z'
  },
  {
    id: 'conv2',
    partnerId: 'user2',
    partnerName: 'Michael Chen',
    partnerAge: 29,
    partnerNationality: 'カナダ',
    partnerLocation: '東京都新宿区',
    lastMessage: {
      id: 'msg2',
      senderId: 'current_user',
      content: 'お疲れ様でした！今度は書道体験はいかがですか？',
      timestamp: '2025-07-29T20:15:00Z',
      isRead: true
    },
    unreadCount: 0,
    isOnline: false,
    matchedDate: '2025-07-20T15:30:00Z'
  },
  {
    id: 'conv3',
    partnerId: 'user3',
    partnerName: 'Emma Thompson',
    partnerAge: 24,
    partnerNationality: 'イギリス',
    partnerLocation: '東京都港区',
    lastMessage: {
      id: 'msg3',
      senderId: 'user3',
      content: 'こんにちは！プロフィールを拝見させていただきました。共通の趣味がたくさんありますね。',
      timestamp: '2025-07-28T11:45:00Z',
      isRead: true
    },
    unreadCount: 0,
    isOnline: false,
    matchedDate: '2025-07-28T09:20:00Z'
  },
  {
    id: 'conv4',
    partnerId: 'user4',
    partnerName: 'David Kim',
    partnerAge: 31,
    partnerNationality: '韓国',
    partnerLocation: '神奈川県横浜市',
    lastMessage: {
      id: 'msg4',
      senderId: 'user4',
      content: '剣道の体験、ありがとうございました！とても勉強になりました。',
      timestamp: '2025-07-27T16:20:00Z',
      isRead: true
    },
    unreadCount: 0,
    isOnline: false,
    matchedDate: '2025-07-15T12:00:00Z'
  }
]

// 個別メッセージのサンプルデータ
const SAMPLE_MESSAGES: Record<string, Message[]> = {
  'conv1': [
    {
      id: 'msg1_1',
      senderId: 'user1',
      content: 'こんにちは！マッチしてくださり、ありがとうございます。',
      timestamp: '2025-07-25T10:30:00Z',
      isRead: true
    },
    {
      id: 'msg1_2',
      senderId: 'current_user',
      content: 'こちらこそ、よろしくお願いします！プロフィールを拝見して、茶道に興味がおありなんですね。',
      timestamp: '2025-07-25T11:00:00Z',
      isRead: true
    },
    {
      id: 'msg1_3',
      senderId: 'user1',
      content: 'はい、日本の伝統文化にとても興味があります。一緒に体験できる機会があれば嬉しいです。',
      timestamp: '2025-07-25T11:30:00Z',
      isRead: true
    },
    {
      id: 'msg1_4',
      senderId: 'current_user',
      content: '素晴らしいですね！明日、表参道で茶道体験があるのですが、ご一緒しませんか？',
      timestamp: '2025-07-29T19:00:00Z',
      isRead: true
    },
    {
      id: 'msg1_5',
      senderId: 'user1',
      content: 'ぜひ参加させてください！とても楽しみです。',
      timestamp: '2025-07-30T14:00:00Z',
      isRead: false
    },
    {
      id: 'msg1_6',
      senderId: 'user1',
      content: '明日の茶道体験、とても楽しみにしています！何か持参するものはありますか？',
      timestamp: '2025-07-30T14:30:00Z',
      isRead: false
    }
  ]
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // 会話一覧の取得
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true)
        
        const params = new URLSearchParams()
        if (searchTerm) params.append('search', searchTerm)
        
        const response = await fetch(`/api/messages?${params.toString()}`)
        const result = await response.json()

        if (response.ok) {
          setConversations(result.conversations || [])
        } else {
          console.error('Failed to fetch conversations:', result.error)
          // フォールバックとしてサンプルデータを使用
          setConversations(SAMPLE_CONVERSATIONS)
        }
      } catch (error) {
        console.error('Error fetching conversations:', error)
        // エラー時はサンプルデータを使用
        setConversations(SAMPLE_CONVERSATIONS)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [searchTerm])

  // 検索フィルタ
  const filteredConversations = conversations.filter(conv =>
    conv.partnerName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 会話選択時にメッセージを読み込む
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) return
      
      try {
        setIsLoadingMessages(true)
        
        const response = await fetch(`/api/messages/${selectedConversation.id}`)
        const result = await response.json()

        if (response.ok) {
          setMessages(result.messages || [])
          
          // 未読メッセージを既読にする（API側で処理済み）
          if (selectedConversation.unreadCount > 0) {
            setConversations(prev => prev.map(conv => 
              conv.id === selectedConversation.id 
                ? { ...conv, unreadCount: 0 }
                : conv
            ))
          }
        } else {
          console.error('Failed to fetch messages:', result.error)
          // フォールバックとしてサンプルデータを使用
          const conversationMessages = SAMPLE_MESSAGES[selectedConversation.id] || []
          setMessages(conversationMessages)
        }
      } catch (error) {
        console.error('Error fetching messages:', error)
        // エラー時はサンプルデータを使用
        const conversationMessages = SAMPLE_MESSAGES[selectedConversation.id] || []
        setMessages(conversationMessages)
      } finally {
        setIsLoadingMessages(false)
      }
    }

    fetchMessages()
  }, [selectedConversation])

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return '昨日'
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
    }
  }

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffMinutes < 60) {
      return `${diffMinutes}分前`
    } else if (diffMinutes < 24 * 60) {
      return `${Math.floor(diffMinutes / 60)}時間前`
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return

    try {
      setIsSending(true)
      
      const response = await fetch(`/api/messages/${selectedConversation.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage.trim()
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // 送信成功時にメッセージを追加
        setMessages(prev => [...prev, result.data])
        setNewMessage('')

        // 会話リストの最新メッセージを更新
        setConversations(prev => prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, lastMessage: result.data }
            : conv
        ))
      } else {
        console.error('Failed to send message:', result.error)
        alert('メッセージの送信に失敗しました。もう一度お試しください。')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('エラーが発生しました。もう一度お試しください。')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar className="w-64 hidden md:block" />
      
      <div className="md:ml-64">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-screen">
          {/* 会話リスト */}
          <div className="bg-white border-r border-gray-200 flex flex-col">
            {/* ヘッダー */}
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">メッセージ</h1>
              
              {/* 検索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="会話を検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 会話一覧 */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>メッセージがありません</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation?.id === conversation.id ? 'bg-sakura-50 border-sakura-200' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* アバター */}
                      <div className="relative">
                        <div className="w-12 h-12 bg-sakura-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-sakura-600" />
                        </div>
                        {conversation.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* 名前と時間 */}
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {conversation.partnerName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatLastMessageTime(conversation.lastMessage.timestamp)}
                          </p>
                        </div>

                        {/* 場所と国籍 */}
                        <div className="flex items-center text-xs text-gray-500 mb-2">
                          <Globe className="w-3 h-3 mr-1" />
                          <span>{conversation.partnerNationality}</span>
                          <span className="mx-1">•</span>
                          <span>{conversation.partnerLocation}</span>
                        </div>

                        {/* 最新メッセージ */}
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate flex-1">
                            {conversation.lastMessage.senderId === 'current_user' && 'あなた: '}
                            {conversation.lastMessage.content}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <span className="ml-2 bg-sakura-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* メッセージ表示エリア */}
          <div className="lg:col-span-2 flex flex-col bg-white">
            {selectedConversation ? (
              <>
                {/* チャットヘッダー */}
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-sakura-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-sakura-600" />
                        </div>
                        {selectedConversation.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {selectedConversation.partnerName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {selectedConversation.isOnline ? 'オンライン' : formatLastMessageTime(selectedConversation.lastMessage.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Video className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* メッセージ一覧 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isLoadingMessages ? (
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-2 border-sakura-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <>
                      {/* マッチ通知 */}
                      <div className="text-center py-4">
                        <div className="inline-flex items-center bg-sakura-50 text-sakura-700 px-4 py-2 rounded-full text-sm">
                          <Heart className="w-4 h-4 mr-2 fill-current" />
                          {new Date(selectedConversation.matchedDate).toLocaleDateString('ja-JP')} にマッチしました
                        </div>
                      </div>

                      {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === 'current_user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === 'current_user'
                          ? 'bg-sakura-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderId === 'current_user' ? 'text-sakura-100' : 'text-gray-500'
                        }`}>
                          {formatMessageTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                      ))}
                    </>
                  )}
                </div>

                {/* メッセージ入力 */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex items-end space-x-2">
                    <div className="flex-1">
                      <Input
                        placeholder="メッセージを入力..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="resize-none"
                      />
                    </div>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      variant="sakura"
                    >
                      {isSending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* 会話未選択時 */
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">会話を選択してください</h3>
                  <p>左側から会話を選んでメッセージを開始しましょう</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}