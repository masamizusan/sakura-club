'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  MessageCircle,
  Search,
  Globe
} from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import Avatar from '@/components/Avatar'
import { useLanguage } from '@/contexts/LanguageContext'
import { useNotifications } from '@/hooks/useNotifications'
import { getNationalityLabel } from '@/utils/nationalityTranslations'

const messagesTranslations: Record<string, Record<string, string>> = {
  ja: {
    pageTitle: 'メッセージ',
    searchPlaceholder: '会話を検索...',
    noMessages: 'メッセージがありません',
    matchedOn: '{date} にマッチしました',
    matchedMessage: 'マッチしました！メッセージを送ってみましょう',
    messagePlaceholder: 'メッセージを入力...',
    yearsOld: '歳',
    online: 'オンライン',
    sendError: 'メッセージの送信に失敗しました。もう一度お試しください。',
    minutesAgo: '{min}分前',
    hoursAgo: '{hours}時間前',
    loadError: 'メッセージを読み込めませんでした。通信環境を確認して、もう一度お試しください。',
    reload: '再読み込み',
  },
  en: {
    pageTitle: 'Messages',
    searchPlaceholder: 'Search conversations...',
    noMessages: 'No messages yet',
    matchedOn: 'Matched on {date}',
    matchedMessage: "It's a match! Send them a message!",
    messagePlaceholder: 'Type a message...',
    yearsOld: 'y/o',
    online: 'Online',
    sendError: 'Failed to send message. Please try again.',
    minutesAgo: '{min} min ago',
    hoursAgo: '{hours}h ago',
    loadError: "Couldn't load your messages. Please check your connection and try again.",
    reload: 'Reload',
  },
  ko: {
    pageTitle: '메시지',
    searchPlaceholder: '대화 검색...',
    noMessages: '메시지가 없습니다',
    matchedOn: '{date}에 매칭되었습니다',
    matchedMessage: '매칭되었습니다! 메시지를 보내보세요.',
    messagePlaceholder: '메시지를 입력...',
    yearsOld: '세',
    online: '온라인',
    sendError: '메시지 전송에 실패했습니다. 다시 시도해주세요.',
    minutesAgo: '{min}분 전',
    hoursAgo: '{hours}시간 전',
    loadError: '메시지를 불러오지 못했습니다. 통신 환경을 확인한 후 다시 시도해 주세요.',
    reload: '다시 불러오기',
  },
  'zh-tw': {
    pageTitle: '訊息',
    searchPlaceholder: '搜尋對話...',
    noMessages: '沒有訊息',
    matchedOn: '於 {date} 配對成功',
    matchedMessage: '配對成功！來發送訊息吧。',
    messagePlaceholder: '輸入訊息...',
    yearsOld: '歲',
    online: '線上',
    sendError: '訊息發送失敗，請再試一次。',
    minutesAgo: '{min}分鐘前',
    hoursAgo: '{hours}小時前',
    loadError: '無法載入訊息。請確認網路連線後再試一次。',
    reload: '重新載入',
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
  isNewMatch: boolean  // 新規マッチ未確認フラグ
}

export default function MessagesPage() {
  const router = useRouter()
  const { currentLanguage } = useLanguage()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  // 初回・検索・再読み込みの取得に失敗したとき true（エラー文と再読み込みボタンを表示）
  const [loadError, setLoadError] = useState(false)
  // 再読み込みボタン用：値を変えると最初の読み込みと同じ取得処理をもう一度行う
  const [reloadKey, setReloadKey] = useState(0)

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
        setLoadError(false)

        const params = new URLSearchParams()
        if (searchTerm) params.append('search', searchTerm)

        const response = await fetch(`/api/messages?${params.toString()}`)
        const result = await response.json()

        if (response.ok) {
          setConversations(result.conversations || [])
        } else {
          console.error('Failed to fetch conversations:', result.error)
          setConversations([])
          setLoadError(true)
        }
      } catch (error) {
        console.error('Error fetching conversations:', error)
        setConversations([])
        setLoadError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [searchTerm, reloadKey])

  // ===== 一覧を開いている間の新着反映（C: バッジの未読数の変化 / D: 画面が前面に戻ったとき） =====
  // 新しい定期取得は追加しない。共有のバッジ件数（useNotifications）の変化を合図に取り直す
  const REFRESH_THROTTLE_MS = 3000
  const searchTermRef = useRef(searchTerm)
  searchTermRef.current = searchTerm
  const isRefreshingRef = useRef(false)
  const hasPendingRefreshRef = useRef(false)
  const lastRefreshAtRef = useRef(0)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUnmountedRef = useRef(false)

  // 裏で一覧を取り直す（読み込み中の表示は出さない。失敗時は今の一覧をそのまま残す）
  const runRefresh = useCallback(async () => {
    if (isUnmountedRef.current) return
    if (isRefreshingRef.current) {
      // 取得中に呼ばれた場合は、終わったあとに 1 回だけ取り直す
      hasPendingRefreshRef.current = true
      return
    }
    isRefreshingRef.current = true
    lastRefreshAtRef.current = Date.now()
    const term = searchTermRef.current
    try {
      const params = new URLSearchParams()
      if (term) params.append('search', term)
      const response = await fetch(`/api/messages?${params.toString()}`)
      const result = await response.json()
      // 取得中に検索欄が変わった場合は、検索側の取得に任せて結果を捨てる
      if (!isUnmountedRef.current && response.ok && term === searchTermRef.current) {
        setConversations(result.conversations || [])
        // 裏での取り直しに成功したらエラー表示を解除する（失敗時はエラー表示に切り替えず、今の表示を残す）
        setLoadError(false)
      }
    } catch (error) {
      console.warn('[messages] list refresh failed:', error instanceof Error ? error.message : 'unknown')
    } finally {
      isRefreshingRef.current = false
      if (hasPendingRefreshRef.current) {
        hasPendingRefreshRef.current = false
        runRefresh()
      }
    }
  }, [])

  // C と D が短時間に重なったときは 1 回にまとめる（前回から 3 秒以内なら、3 秒後に 1 回だけ）
  const requestRefresh = useCallback(() => {
    if (isUnmountedRef.current) return
    const elapsed = Date.now() - lastRefreshAtRef.current
    if (elapsed >= REFRESH_THROTTLE_MS) {
      runRefresh()
      return
    }
    if (refreshTimerRef.current) return
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null
      runRefresh()
    }, REFRESH_THROTTLE_MS - elapsed)
  }, [runRefresh])

  useEffect(() => {
    isUnmountedRef.current = false
    // 既存の初回取得（上の useEffect）と重ねないよう、表示した時点を前回取得とみなす
    lastRefreshAtRef.current = Date.now()
    return () => {
      isUnmountedRef.current = true
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [])

  // C: バッジの未読数（未読メッセージ + 未確認マッチ）が変わったら取り直す
  const { unreadMessages, userId: badgeUserId } = useNotifications()
  const prevUnreadRef = useRef(unreadMessages)
  const mountedAtRef = useRef(Date.now())
  // 表示時にバッジの件数がまだ取れていない（ユーザー未確定）場合、最初に入る値は「初回の値」として扱う
  const awaitingInitialBadgeRef = useRef(badgeUserId === null)
  const INITIAL_BADGE_WINDOW_MS = 5000
  useEffect(() => {
    if (unreadMessages === prevUnreadRef.current) return
    prevUnreadRef.current = unreadMessages
    if (awaitingInitialBadgeRef.current) {
      awaitingInitialBadgeRef.current = false
      // 表示直後に入った初回の値では取り直さない（既存の初回取得と重ねない）
      if (Date.now() - mountedAtRef.current < INITIAL_BADGE_WINDOW_MS) return
    }
    requestRefresh()
  }, [unreadMessages, requestRefresh])

  // D: 画面が前面に戻ったら取り直す
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestRefresh()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [requestRefresh])

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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <Sidebar className="w-64 hidden md:block" />

      <div className="md:ml-64">
        <div className="mx-auto max-w-xl">
          <div className="grid h-screen grid-cols-1">
          {/* 会話リスト */}
          <div className="flex flex-col" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            {/* ヘッダー */}
            <div className="p-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('pageTitle')}</h1>

              {/* 検索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-sub)' }} />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 input-app"
                  style={{ backgroundColor: '#fdf6ef' }}
                />
              </div>
            </div>

            {/* 会話一覧 */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                // スケルトンローディング
                <div className="space-y-0">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: '#ede0d4' }} />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 rounded animate-pulse w-1/3" style={{ backgroundColor: '#ede0d4' }} />
                          <div className="h-3 rounded animate-pulse w-1/4" style={{ backgroundColor: '#ede0d4' }} />
                          <div className="h-3 rounded animate-pulse w-2/3" style={{ backgroundColor: '#ede0d4' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : loadError ? (
                <div className="p-6 text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="mb-4">{t('loadError')}</p>
                  <button
                    type="button"
                    onClick={() => setReloadKey(k => k + 1)}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {t('reload')}
                  </button>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('noMessages')}</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const isUnread = conversation.unreadCount > 0 || conversation.isNewMatch

                  return (
                    <div
                      key={conversation.id}
                      onClick={() => router.push(`/messages/${conversation.id}`)}
                      className="relative flex items-stretch cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#ede0d4')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                    >
                      {/* 左の赤い縦線（未読あり or 新規マッチ） */}
                      {isUnread && (
                        <div className="w-1 bg-red-500 flex-shrink-0 rounded-l-md" />
                      )}

                      <div className="flex-1 p-5">
                        <div className="flex items-center space-x-4">
                          {/* アバター */}
                          <div className="relative flex-shrink-0">
                            <Avatar
                              src={conversation.partnerAvatar}
                              alt={conversation.partnerName}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                            {conversation.isOnline && (
                              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* 名前・年齢・時間 */}
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center min-w-0">
                                <span className={`text-base truncate ${
                                  isUnread ? 'font-bold text-gray-900' : 'font-normal text-gray-700'
                                }`}>
                                  {conversation.partnerName}
                                </span>
                                {conversation.partnerAge && (
                                  <span className="ml-2 text-sm text-gray-500 flex-shrink-0">{conversation.partnerAge}{t('yearsOld')}</span>
                                )}
                                {/* 未読メッセージ数バッジ */}
                                {conversation.unreadCount > 0 && (
                                  <span className={`ml-2 inline-flex items-center justify-center rounded-full bg-red-500 text-white font-bold flex-shrink-0 ${
                                    conversation.unreadCount < 10
                                      ? 'w-5 h-5 text-xs'
                                      : 'min-w-[20px] h-5 px-1 text-xs'
                                  }`}>
                                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                  </span>
                                )}
                                {/* 新規マッチバッジ（メッセージ未送信） */}
                                {conversation.isNewMatch && conversation.unreadCount === 0 && (
                                  <span className="ml-2 inline-flex items-center justify-center w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                {formatLastMessageTime(conversation.lastMessage.timestamp)}
                              </p>
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
                              isUnread ? 'font-semibold text-gray-800' : 'text-gray-500'
                            }`}>
                              {conversation.lastMessage.content === 'マッチしました！メッセージを送ってみましょう'
                                ? t('matchedMessage')
                                : conversation.lastMessage.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
