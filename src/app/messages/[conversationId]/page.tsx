'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, ArrowLeft, Heart, User } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import { useLanguage } from '@/contexts/LanguageContext'
import { getNationalityLabel } from '@/utils/nationalityTranslations'
import { createClient } from '@/lib/supabase/client'

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
    loading: '読み込み中...',
    translating: '翻訳中...',
    translateError: '翻訳に失敗しました',
    showOriginal: '原文を表示',
    showTranslation: '翻訳を表示',
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
    loading: 'Loading...',
    translating: 'Translating...',
    translateError: 'Translation failed',
    showOriginal: 'Show original',
    showTranslation: 'Show translation',
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
    loading: '로딩 중...',
    translating: '번역 중...',
    translateError: '번역 실패',
    showOriginal: '원문 보기',
    showTranslation: '번역 보기',
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
    loading: '載入中...',
    translating: '翻譯中...',
    translateError: '翻譯失敗',
    showOriginal: '顯示原文',
    showTranslation: '顯示翻譯',
  },
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { currentLanguage } = useLanguage()
  const conversationId = params?.conversationId as string

  const [messages, setMessages] = useState<any[]>([])
  const [conversation, setConversation] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // 翻訳関連のstate
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({})
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set())
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({})

  // 原文↔翻訳トグル
  const toggleTranslation = (messageId: string) => {
    setShowOriginal(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }))
  }

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

  // ロケール取得
  const getLocale = () => {
    switch (currentLanguage) {
      case 'en': return 'en-US'
      case 'ko': return 'ko-KR'
      case 'zh-tw': return 'zh-TW'
      default: return 'ja-JP'
    }
  }

  // 現在のログインユーザーIDを取得
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    fetchCurrentUser()
  }, [])

  // 相手のメッセージを自動翻訳
  const autoTranslateMessages = async (msgs: any[], myId: string) => {
    const partnerMessages = msgs.filter(m => m.senderId !== myId)

    for (const msg of partnerMessages) {
      // 既に翻訳済みならスキップ
      if (translatedMessages[msg.id]) continue

      try {
        const response = await fetch('/api/translate/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: msg.id,
            text: msg.content,
            targetLanguage: currentLanguage,
          }),
        })
        const result = await response.json()
        if (result.translatedText) {
          setTranslatedMessages(prev => ({
            ...prev,
            [msg.id]: result.translatedText
          }))
        }
      } catch (error) {
        console.error('Auto translation error:', error)
      }
    }
  }

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/messages/${conversationId}`)
        const result = await response.json()
        if (response.ok) {
          setMessages(result.messages || [])
          setConversation(result.conversation || null)

          // メッセージ取得後に自動翻訳を実行
          if (result.messages && currentUserId) {
            autoTranslateMessages(result.messages, currentUserId)
          }
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMessages()
  }, [conversationId, currentUserId])

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
      } else {
        alert(t('sendError'))
      }
    } catch (error) {
      console.error(error)
      alert(t('sendError'))
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })
  }

  const formatMatchDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(getLocale())
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
            <p className="font-semibold text-gray-900">{conversation?.partnerName || t('loading')}</p>
            {conversation && (
              <p className="text-sm text-gray-500">
                {conversation.partnerNationality && conversation.partnerNationality !== '未設定' && (
                  <>{getNationalityLabel(conversation.partnerNationality, currentLanguage)} · </>
                )}
                {conversation.partnerAge && <>{conversation.partnerAge}{t('yearsOld')}</>}
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
                    {t('matchedOn', { date: formatMatchDate(conversation.matchedDate) })}
                  </div>
                </div>
              )}
              {messages.map((message) => {
                const isMyMessage = currentUserId && message.senderId === currentUserId
                const isTranslating = translatingIds.has(message.id)
                const hasTranslation = translatedMessages[message.id]

                return (
                  <div key={message.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                    {isMyMessage ? (
                      // 自分のメッセージ（翻訳機能なし）
                      <div className="max-w-sm px-4 py-2 rounded-2xl bg-sakura-100 text-sakura-900">
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 text-sakura-400">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    ) : (
                      // 相手のメッセージ（翻訳トグル付き）
                      <div
                        onClick={() => toggleTranslation(message.id)}
                        className="max-w-sm px-4 py-2 rounded-2xl bg-white text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50 transition-all"
                      >
                        {/* 翻訳中表示 */}
                        {isTranslating && (
                          <p className="text-xs text-gray-500 italic flex items-center mb-1">
                            <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1"></span>
                            {t('translating')}
                          </p>
                        )}

                        {/* 翻訳がある場合：デフォルトで翻訳表示、タップで原文表示 */}
                        {hasTranslation && !showOriginal[message.id] ? (
                          <>
                            <p className="text-sm">{translatedMessages[message.id]}</p>
                            <p className="text-xs text-blue-500 mt-1">{t('showOriginal')}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm">{message.content}</p>
                            {hasTranslation && (
                              <p className="text-xs text-blue-500 mt-1">{t('showTranslation')}</p>
                            )}
                          </>
                        )}

                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* 入力欄 */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-2xl mx-auto flex items-center space-x-2">
            <Input
              placeholder={t('messagePlaceholder')}
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
