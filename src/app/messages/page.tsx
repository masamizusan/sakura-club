'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  MessageCircle,
  Search,
  User,
  Globe
} from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import { useLanguage } from '@/contexts/LanguageContext'
import { getNationalityLabel } from '@/utils/nationalityTranslations'

const messagesTranslations: Record<string, Record<string, string>> = {
  ja: {
    pageTitle: 'メッセージ',
    searchPlaceholder: '会話を検索...',
    noMessages: 'メッセージがありません',
    matchedOn: '{date} にマッチしました',
    messagePlaceholder: 'メッセージを入力...',
    yearsOld: '歳',
    online: 'オンライン',
    sendError: 'メッセージの送信に失敗しました。もう一度お試しください。',
    minutesAgo: '{min}分前',
    hoursAgo: '{hours}時間前',
  },
  en: {
    pageTitle: 'Messages',
    searchPlaceholder: 'Search conversations...',
    noMessages: 'No messages yet',
    matchedOn: 'Matched on {date}',
    messagePlaceholder: 'Type a message...',
    yearsOld: 'y/o',
    online: 'Online',
    sendError: 'Failed to send message. Please try again.',
    minutesAgo: '{min} min ago',
    hoursAgo: '{hours}h ago',
  },
  ko: {
    pageTitle: '메시지',
    searchPlaceholder: '대화 검색...',
    noMessages: '메시지가 없습니다',
    matchedOn: '{date}에 매칭되었습니다',
    messagePlaceholder: '메시지를 입력...',
    yearsOld: '세',
    online: '온라인',
    sendError: '메시지 전송에 실패했습니다. 다시 시도해주세요.',
    minutesAgo: '{min}분 전',
    hoursAgo: '{hours}시간 전',
  },
  'zh-tw': {
    pageTitle: '訊息',
    searchPlaceholder: '搜尋對話...',
    noMessages: '沒有訊息',
    matchedOn: '於 {date} 配對成功',
    messagePlaceholder: '輸入訊息...',
    yearsOld: '歲',
    online: '線上',
    sendError: '訊息發送失敗，請再試一次。',
    minutesAgo: '{min}分鐘前',
    hoursAgo: '{hours}小時前',
  },
}

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
  partnerAvatar?: string
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

export default function MessagesPage() {
  const router = useRouter()
  const { currentLanguage } = useLanguage()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // 翻訳関数
  const t = (key: string, params?: Record<string, string | number>) => {
    const lang = messagesTranslations[currentLanguage] ? currentLanguage : 'ja'
    let text = messagesTranslations[lang][key] || messagesTranslations['ja'][key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    return text
  }

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

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffMinutes < 60) {
      return t('minutesAgo', { min: diffMinutes })
    } else if (diffMinutes < 24 * 60) {
      return t('hoursAgo', { hours: Math.floor(diffMinutes / 60) })
    } else {
      return date.toLocaleDateString(currentLanguage === 'ja' ? 'ja-JP' : currentLanguage === 'ko' ? 'ko-KR' : currentLanguage === 'zh-tw' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar className="w-64 hidden md:block" />

      <div className="md:ml-64">
        <div className="mx-auto max-w-xl">
          <div className="grid h-screen grid-cols-1">
          {/* 会話リスト */}
          <div className="bg-white flex flex-col">
            {/* ヘッダー */}
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('pageTitle')}</h1>

              {/* 検索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 会話一覧 */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                // スケルトンローディング
                <div className="space-y-0">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-5 border-b border-gray-100">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4" />
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('noMessages')}</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => router.push(`/messages/${conversation.id}`)}
                    className="relative flex items-stretch border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {/* 左の赤い縦線（未読あり） */}
                    {conversation.unreadCount > 0 && (
                      <div className="w-1 bg-red-500 flex-shrink-0 rounded-l-md" />
                    )}

                    <div className="flex-1 p-5">
                      <div className="flex items-center space-x-4">
                        {/* アバター */}
                        <div className="relative flex-shrink-0">
                          {conversation.partnerAvatar ? (
                            <img
                              src={conversation.partnerAvatar}
                              alt={conversation.partnerName}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-sakura-100 rounded-full flex items-center justify-center">
                              <User className="w-8 h-8 text-sakura-600" />
                            </div>
                          )}
                          {conversation.isOnline && (
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* 名前・年齢・バッジ */}
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-base truncate ${
                              conversation.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-normal text-gray-700'
                            }`}>
                              {conversation.partnerName}
                              {conversation.partnerAge && (
                                <span className="ml-2 text-sm font-normal text-gray-500">{conversation.partnerAge}{t('yearsOld')}</span>
                              )}
                            </p>
                            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                              {conversation.unreadCount > 0 && (
                                <span className={`flex items-center justify-center rounded-full bg-red-500 text-white font-bold ${
                                  conversation.unreadCount < 10
                                    ? 'w-5 h-5 text-xs'
                                    : 'min-w-[20px] h-5 px-1 text-xs'
                                }`}>
                                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                </span>
                              )}
                              <p className="text-xs text-gray-400">
                                {formatLastMessageTime(conversation.lastMessage.timestamp)}
                              </p>
                            </div>
                          </div>

                          {/* 国籍 */}
                          {conversation.partnerNationality && conversation.partnerNationality !== '未設定' && (
                            <div className="flex items-center text-sm text-gray-500 mb-1">
                              <Globe className="w-3 h-3 mr-1" />
                              <span>{getNationalityLabel(conversation.partnerNationality, currentLanguage)}</span>
                            </div>
                          )}

                          {/* 最新メッセージ */}
                          <p className={`text-sm truncate ${
                            conversation.unreadCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'
                          }`}>
                            {conversation.lastMessage.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
