'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Heart,
  MapPin,
  User,
  Globe,
  Coffee
} from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import AuthGuard from '@/components/auth/AuthGuard'
import { useAuth } from '@/store/authStore'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatCultureTag } from '@/utils/profileTagFormatters'
import { formatPrefecture, formatNationality } from '@/utils/profileFieldFormatters'

// 4言語翻訳辞書
const likesTranslations: Record<string, Record<string, string>> = {
  ja: {
    pageTitle: 'お相手から',
    pageSubtitle: 'あなたにいいねを送ってくれた方々です',
    likesRemaining: '本日の残りいいね',
    loading: '読み込み中…',
    noLikersTitle: 'まだいいねが届いていません',
    noLikersSubtitle: 'プロフィールを充実させて、素敵な出会いを待ちましょう',
    goToSearch: 'お相手を探す',
    yearsOld: '歳',
    today: '今日',
    yesterday: '昨日',
    markAllSeen: '全て既読にする',
  },
  en: {
    pageTitle: 'Likes Received',
    pageSubtitle: 'People who liked your profile',
    likesRemaining: 'Likes remaining today',
    loading: 'Loading...',
    noLikersTitle: 'No likes yet',
    noLikersSubtitle: 'Complete your profile to attract more people',
    goToSearch: 'Find matches',
    yearsOld: ' y/o',
    today: 'Today',
    yesterday: 'Yesterday',
    markAllSeen: 'Mark all as read',
  },
  ko: {
    pageTitle: '관심',
    pageSubtitle: '나에게 좋아요를 보내준 분들입니다',
    likesRemaining: '오늘 남은 좋아요',
    loading: '로딩 중...',
    noLikersTitle: '아직 좋아요가 없습니다',
    noLikersSubtitle: '프로필을 완성하고 멋진 만남을 기다려보세요',
    goToSearch: '상대 찾기',
    yearsOld: '세',
    today: '오늘',
    yesterday: '어제',
    markAllSeen: '모두 읽음 표시',
  },
  'zh-tw': {
    pageTitle: '喜歡我的人',
    pageSubtitle: '這些人對您表示了興趣',
    likesRemaining: '今日剩餘按讚數',
    loading: '載入中...',
    noLikersTitle: '還沒有人按讚',
    noLikersSubtitle: '完善您的個人資料以吸引更多人',
    goToSearch: '尋找對象',
    yearsOld: '歲',
    today: '今天',
    yesterday: '昨天',
    markAllSeen: '全部標為已讀',
  }
}

// ユーザープロフィールの型定義
interface LikerProfile {
  id: string
  name: string
  gender: string
  age: number | null
  nationality: string
  residence: string
  prefecture: string
  city: string
  bio: string
  interests: string[]
  avatar_url: string | null
  personality_tags: string[]
  culture_tags: string[]
  liked_at: string | null
}

// 日付グループの型定義
interface DateGroup {
  dateKey: string
  dateLabel: string
  likers: LikerProfile[]
}

export default function LikesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { currentLanguage } = useLanguage()
  const [likers, setLikers] = useState<LikerProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingSeen, setIsMarkingSeen] = useState(false)

  // いいね残り回数
  const [likesRemaining, setLikesRemaining] = useState<number>(10)
  const [likesLimit] = useState<number>(10)

  // 翻訳取得関数
  const t = (key: string, replacements: Record<string, string | number> = {}): string => {
    const texts = likesTranslations[currentLanguage] || likesTranslations['ja']
    let text = texts[key] || likesTranslations['ja'][key] || key
    Object.entries(replacements).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v))
    })
    return text
  }

  // ブラウザのロケールを取得
  const getBrowserLocale = (): string => {
    if (typeof window === 'undefined') return 'ja-JP'
    const lang = navigator.language
    // 言語コードからロケールを推定
    if (lang.startsWith('ja')) return 'ja-JP'
    if (lang.startsWith('ko')) return 'ko-KR'
    if (lang.startsWith('zh')) return 'zh-TW'
    return lang
  }

  // 日付見出しをフォーマット（今日・昨日 or 日付）
  const formatDateHeading = (dateStr: string): string => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // 日付部分のみを比較
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return t('today')
    }
    if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return t('yesterday')
    }

    // それ以外は日付を表示
    const locale = getBrowserLocale()
    const formatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
    return formatter.format(date)
  }

  // 時刻をフォーマット
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    const locale = getBrowserLocale()
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !locale.startsWith('ja') && !locale.startsWith('ko') ? true : locale.startsWith('ko') ? true : false
    })
    // 日本語の場合は24時間表示、韓国語・英語は12時間表示
    if (locale.startsWith('ja')) {
      return new Intl.DateTimeFormat('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date)
    }
    return formatter.format(date)
  }

  // 日付キーを取得（グループ化用）
  const getDateKey = (dateStr: string): string => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  // いいねを日付でグループ化
  const groupedLikers = useMemo((): DateGroup[] => {
    if (likers.length === 0) return []

    const groups = new Map<string, LikerProfile[]>()
    const dateOrder: string[] = []

    likers.forEach(liker => {
      const dateKey = liker.liked_at ? getDateKey(liker.liked_at) : 'unknown'
      if (!groups.has(dateKey)) {
        groups.set(dateKey, [])
        dateOrder.push(dateKey)
      }
      groups.get(dateKey)!.push(liker)
    })

    return dateOrder.map(dateKey => {
      const likersInGroup = groups.get(dateKey) || []
      const firstLiker = likersInGroup[0]
      const dateLabel = firstLiker?.liked_at
        ? formatDateHeading(firstLiker.liked_at)
        : ''
      return {
        dateKey,
        dateLabel,
        likers: likersInGroup
      }
    })
  }, [likers, currentLanguage])

  const markAllSeen = async () => {
    setIsMarkingSeen(true)
    try {
      await fetch('/api/likes/seen', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    } catch (error) {
      console.error('Error marking likes as seen:', error)
    } finally {
      setIsMarkingSeen(false)
    }
  }

  // 残りいいね数を取得
  const fetchLikesRemaining = async () => {
    try {
      const response = await fetch('/api/likes/remaining', {
        cache: 'no-store',
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setLikesRemaining(data.remaining)
      }
    } catch (error) {
      console.error('Failed to fetch likes remaining:', error)
    }
  }

  // 初期ロード時に残りいいね数を取得
  useEffect(() => {
    if (user && !authLoading) {
      fetchLikesRemaining()
    }
  }, [user, authLoading])


  // データ取得
  useEffect(() => {
    const fetchLikers = async () => {
      if (authLoading) return
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        // キャッシュ回避のためタイムスタンプを付加
        const timestamp = Date.now()
        const response = await fetch(`/api/likes/received?_t=${timestamp}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })

        const result = await response.json()

        if (response.ok && result.likers && result.likers.length > 0) {
          setLikers(result.likers)
        } else {
          setLikers([])
        }
      } catch (error) {
        console.error('Error fetching likers:', error)
        setLikers([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchLikers()
  }, [user, authLoading])

  const content = (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      <Sidebar className="w-64 hidden md:block" />

      <div className="md:ml-64 py-6 px-4">
        <div className="max-w-[560px] mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('pageTitle')}</h1>
            <p className="text-sm text-gray-600">
              {t('pageSubtitle')}
            </p>
            {/* 残りいいね数表示 */}
            <div className="mt-3 inline-flex items-center bg-white rounded-full px-3 py-1.5 shadow-sm text-sm">
              <Heart className={`w-4 h-4 mr-1.5 ${likesRemaining > 0 ? 'text-sakura-500' : 'text-gray-400'}`} />
              <span className="text-gray-700">
                {t('likesRemaining')}: <span className={`font-bold ${likesRemaining > 0 ? 'text-sakura-600' : 'text-gray-500'}`}>{likesRemaining}</span> / {likesLimit}
              </span>
            </div>
            {!isLoading && likers.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={markAllSeen}
                  disabled={isMarkingSeen}
                  className="px-4 py-2 text-sm font-medium text-gray-500 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t('markAllSeen')}
                </button>
              </div>
            )}
          </div>

          {/* ローディング表示 */}
          {isLoading && (
            <p className="text-gray-500 text-sm mb-4">{t('loading')}</p>
          )}

          {/* スケルトン UI */}
          {isLoading && (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse p-4">
                  {/* 上部: 写真 + 基本情報 */}
                  <div className="flex">
                    <div className="w-[160px] h-[160px] bg-gray-200 rounded-lg flex-shrink-0"></div>
                    <div className="ml-4 flex-1">
                      <div className="h-4 w-14 bg-gray-200 rounded mb-2"></div>
                      <div className="h-7 w-20 bg-gray-200 rounded mb-2"></div>
                      <div className="h-6 w-24 bg-gray-200 rounded mb-2"></div>
                      <div className="h-5 w-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  {/* 下部: 自己紹介 + タグ */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-3"></div>
                    <div className="flex gap-2">
                      <div className="h-5 w-12 bg-gray-200 rounded-full"></div>
                      <div className="h-5 w-14 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* いいねをくれたユーザー一覧（日付グループ） */}
          {!isLoading && groupedLikers.length > 0 && (
            <div className="flex flex-col gap-6">
              {groupedLikers.map((group) => (
                <div key={group.dateKey}>
                  {/* 日付見出し */}
                  <h2 className="text-lg font-bold text-gray-800 mb-3">
                    {group.dateLabel}
                  </h2>

                  {/* その日のいいね一覧 */}
                  <div className="flex flex-col gap-4">
                    {group.likers.map((liker) => {
                      const isJapanese = !liker.nationality ||
                        liker.nationality === '' ||
                        liker.nationality.toLowerCase() === 'jp' ||
                        liker.nationality.toLowerCase() === 'japan' ||
                        liker.nationality === '日本' ||
                        liker.nationality.toLowerCase() === 'japanese'

                      const locationLabel = isJapanese
                        ? formatPrefecture(liker.prefecture || liker.residence, currentLanguage) || liker.prefecture || liker.residence
                        : formatNationality(liker.nationality, currentLanguage) || liker.nationality

                      return (
                        <Link
                          key={liker.id}
                          href={`/profile/${liker.id}`}
                          className="block"
                        >
                          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer p-4">
                            {/* 上部: 写真 + 基本情報 */}
                            <div className="flex">
                              {/* 写真エリア（左側）- 160px */}
                              <div className="relative w-[160px] h-[160px] flex-shrink-0">
                                {liker.avatar_url ? (
                                  <img
                                    src={liker.avatar_url}
                                    alt={liker.name}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sakura-100 to-sakura-200 rounded-lg">
                                    <User className="w-14 h-14 text-sakura-300" />
                                  </div>
                                )}
                              </div>

                              {/* 基本情報（右側） */}
                              <div className="ml-4 flex-1 min-w-0 flex flex-col justify-center">
                                {/* 時刻 */}
                                {liker.liked_at && (
                                  <p className="text-sm text-gray-400 mb-1">
                                    {formatTime(liker.liked_at)}
                                  </p>
                                )}
                                {/* 年齢 */}
                                {liker.age && (
                                  <p className="text-2xl font-bold text-gray-800">
                                    {liker.age}{t('yearsOld')}
                                  </p>
                                )}
                                {/* 居住地/国籍 */}
                                {locationLabel && (
                                  <p className="text-xl font-bold text-amber-700">
                                    {locationLabel}
                                  </p>
                                )}
                                {/* 名前 */}
                                <p className="text-lg font-medium text-gray-700 truncate">
                                  {liker.name}
                                </p>
                              </div>
                            </div>

                            {/* 下部: 自己紹介 + タグ（カード幅いっぱい） */}
                            {(liker.bio || (liker.interests && liker.interests.length > 0)) && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                {/* 自己紹介（2行） */}
                                {liker.bio && (
                                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                    {liker.bio}
                                  </p>
                                )}
                                {/* 興味タグ */}
                                {liker.interests && liker.interests.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {liker.interests.slice(0, 4).map((interest, index) => (
                                      <span
                                        key={index}
                                        className="bg-sakura-50 text-sakura-700 px-2.5 py-1 rounded-full text-sm font-medium"
                                      >
                                        {formatCultureTag(interest, currentLanguage)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 結果が0件の場合 */}
          {!isLoading && likers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Coffee className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('noLikersTitle')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('noLikersSubtitle')}
              </p>
              <Link href="/matches">
                <Button variant="sakura" size="sm">
                  {t('goToSearch')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return <AuthGuard>{content}</AuthGuard>
}
