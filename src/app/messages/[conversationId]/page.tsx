'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Send, ArrowLeft, Heart, User, Mic } from 'lucide-react'
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
    voiceNotSupported: 'お使いのブラウザは音声入力に対応していません。',
    stop: '停止',
    previewTranslation: '翻訳確認',
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
    voiceNotSupported: 'Your browser does not support voice input.',
    stop: 'Stop',
    previewTranslation: 'Translate',
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
    voiceNotSupported: '브라우저가 음성 입력을 지원하지 않습니다.',
    stop: '정지',
    previewTranslation: '번역 확인',
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
    voiceNotSupported: '您的瀏覽器不支援語音輸入。',
    stop: '停止',
    previewTranslation: '翻譯確認',
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

  // 送信前翻訳プレビュー
  const [previewTranslation, setPreviewTranslation] = useState<string | null>(null)
  const [isTranslatingPreview, setIsTranslatingPreview] = useState(false)

  // 音声入力
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)
  const finalTranscriptRef = useRef<string>('')

  // textarea ref
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自動スクロール用のref
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }



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

  // キャッシュから翻訳をまとめて取得
  const fetchCachedTranslations = async (msgs: any[]) => {
    if (!msgs || msgs.length === 0) return

    const messageIds = msgs.map(m => m.id)
    const supabase = createClient()

    const { data } = await supabase
      .from('message_translations')
      .select('message_id, translated_text')
      .in('message_id', messageIds)
      .eq('language', currentLanguage)

    if (data && data.length > 0) {
      const cached: Record<string, string> = {}
      data.forEach(t => {
        cached[t.message_id] = t.translated_text
      })
      setTranslatedMessages(prev => ({ ...prev, ...cached }))
    }
  }

  // 相手のメッセージを自動翻訳（未翻訳のみ）
  const autoTranslateMessages = async (msgs: any[], myId: string, existingTranslations?: Record<string, string>) => {
    const translations = existingTranslations || translatedMessages
    const partnerMessages = msgs.filter(m => m.senderId !== myId && !translations[m.id])

    for (const msg of partnerMessages) {
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
        // キャッシュヒットでなければ300ms待機（レート制限対策）
        if (!result.cached) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      } catch (error) {
        console.error('Auto translation error:', error)
      }
    }
  }

  // メッセージ読み込み完了時にスクロール
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom()
    }
  }, [messages, isLoading])

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/messages/${conversationId}`)
        const result = await response.json()
        if (response.ok && result.messages) {
          setMessages(result.messages)
          setConversation(result.conversation || null)

          // キャッシュから翻訳を即座に取得
          const supabase = createClient()
          const messageIds = result.messages.map((m: any) => m.id)
          const { data: cachedData } = await supabase
            .from('message_translations')
            .select('message_id, translated_text')
            .in('message_id', messageIds)
            .eq('language', currentLanguage)

          const cachedTranslations: Record<string, string> = {}
          if (cachedData && cachedData.length > 0) {
            cachedData.forEach(t => {
              cachedTranslations[t.message_id] = t.translated_text
            })
            setTranslatedMessages(prev => ({ ...prev, ...cachedTranslations }))
          }

          // 未翻訳のメッセージだけ新たに翻訳
          if (currentUserId) {
            autoTranslateMessages(result.messages, currentUserId, cachedTranslations)
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

  // リアルタイムメッセージ受信
  useEffect(() => {
    if (!conversationId || !currentUserId) return

    const supabase = createClient()

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
        (payload: any) => {
          const newMessage = {
            id: payload.new.id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            timestamp: payload.new.created_at,
            isRead: false,
          }
          // 自分が送ったメッセージは既に追加済みなのでスキップ
          if (newMessage.senderId === currentUserId) return

          setMessages(prev => [...prev, newMessage])

          // 相手のメッセージは自動翻訳
          autoTranslateMessages([newMessage], currentUserId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId, currentLanguage])

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
        if (textareaRef.current) {
          textareaRef.current.style.height = '40px'
        }
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

  // 送信前の翻訳プレビュー
  const handlePreviewTranslation = async () => {
    if (!newMessage.trim()) return

    setIsTranslatingPreview(true)
    setPreviewTranslation(null)

    try {
      const response = await fetch('/api/translate/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: `preview-${Date.now()}`,
          text: newMessage.trim(),
          targetLanguage: currentLanguage === 'ja' ? 'en' : 'ja',
        }),
      })
      const result = await response.json()
      setPreviewTranslation(result.translatedText || null)
    } catch (error) {
      console.error('Preview translation error:', error)
    } finally {
      setIsTranslatingPreview(false)
    }
  }

  // 音声入力
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert(t('voiceNotSupported'))
      return
    }

    if (isRecording) {
      // 録音停止
      recognitionRef.current?.stop()
      recognitionRef.current = null
      setIsRecording(false)
      // 途中経過の[...]を除去
      setNewMessage(prev => prev.replace(/\[.*?\]$/, ''))
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = currentLanguage === 'ja' ? 'ja-JP'
      : currentLanguage === 'ko' ? 'ko-KR'
      : currentLanguage === 'zh-tw' ? 'zh-TW'
      : 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    finalTranscriptRef.current = ''

    recognition.onresult = (event: any) => {
      let interimTranscript = ''

      // resultIndexから処理（重複防止）
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript
        } else {
          interimTranscript += event.results[i][0].transcript
        }
      }

      setNewMessage(
        finalTranscriptRef.current +
        (interimTranscript ? `[${interimTranscript}]` : '')
      )
      setPreviewTranslation(null)
      // 高さを調整
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
      }, 0)
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        alert('マイクへのアクセスが拒否されました。')
        setIsRecording(false)
      }
    }

    recognition.onend = () => {
      // 自動再起動しない（重複防止）
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
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
              {/* 自動スクロール用のアンカー */}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 入力欄 */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-2xl mx-auto">

            {/* 翻訳プレビュー表示 */}
            {(previewTranslation || isTranslatingPreview) && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-400 mb-1">
                  {currentLanguage === 'ja' ? '英語での表示：' : '日本語での表示：'}
                </p>
                {isTranslatingPreview ? (
                  <p className="text-sm text-gray-400 italic">{t('translating')}</p>
                ) : (
                  <p className="text-sm text-gray-700">{previewTranslation}</p>
                )}
              </div>
            )}

            {/* 入力エリア */}
            <div className="flex items-center space-x-2">
              <textarea
                ref={textareaRef}
                placeholder={t('messagePlaceholder')}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  setPreviewTranslation(null)
                  // 高さを内容に合わせて自動調整
                  e.target.style.height = 'auto'
                  e.target.style.height = `${e.target.scrollHeight}px`
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                rows={1}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  resize: 'none',
                  overflow: 'hidden',
                  minHeight: '40px',
                }}
              />

              {/* マイクボタン */}
              <Button
                onClick={handleVoiceInput}
                variant="outline"
                size="sm"
                className={`${
                  isRecording
                    ? 'text-red-500 border-red-300 bg-red-50 animate-pulse'
                    : 'text-gray-500 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {isRecording ? (
                  <span className="text-xs">{t('stop')}</span>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>

              {/* 翻訳確認ボタン */}
              <Button
                onClick={handlePreviewTranslation}
                disabled={!newMessage.trim() || isTranslatingPreview}
                variant="outline"
                size="sm"
                className="text-sakura-600 border-sakura-300 hover:bg-sakura-50"
              >
                {isTranslatingPreview ? (
                  <div className="w-4 h-4 border-2 border-sakura-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  t('previewTranslation')
                )}
              </Button>

              {/* 送信ボタン */}
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || isSending}
                variant="sakura"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
