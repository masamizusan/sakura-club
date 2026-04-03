'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  History,
  User,
  Coffee
} from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import AuthGuard from '@/components/auth/AuthGuard'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatCultureTag } from '@/utils/profileTagFormatters'
import { formatPrefecture, formatNationality } from '@/utils/profileFieldFormatters'

const footprintsTranslations: Record<string, Record<string, string>> = {
  ja: {
    pageTitle: '足跡',
    pageSubtitle: 'あなたのプロフィールを見てくれた方々です',
    loading: '読み込み中…',
    noFootprints: 'まだ足跡がありません',
    noFootprintsDesc: 'プロフィールを充実させて、より多くの方に見つけてもらいましょう',
    editProfile: 'プロフィールを編集',
    yearsOld: '歳',
    today: '今日',
    yesterday: '昨日',
    minutesAgo: '{n}分前',
    hoursAgo: '{n}時間前',
    daysAgo: '{n}日前',
    online: 'オンライン中',
    markAllRead: '全て既読にする',
  },
  en: {
    pageTitle: 'Footprints',
    pageSubtitle: 'People who viewed your profile',
    loading: 'Loading...',
    noFootprints: 'No footprints yet',
    noFootprintsDesc: 'Enhance your profile to get discovered by more people',
    editProfile: 'Edit Profile',
    yearsOld: ' y/o',
    today: 'Today',
    yesterday: 'Yesterday',
    minutesAgo: '{n} min ago',
    hoursAgo: '{n}h ago',
    daysAgo: '{n} days ago',
    online: 'Online',
    markAllRead: 'Mark all as read',
  },
  ko: {
    pageTitle: '발자국',
    pageSubtitle: '내 프로필을 본 사람들',
    loading: '로딩 중...',
    noFootprints: '아직 발자국이 없습니다',
    noFootprintsDesc: '프로필을 충실히 채워 더 많은 분들에게 발견되어 보세요',
    editProfile: '프로필 편집',
    yearsOld: '세',
    today: '오늘',
    yesterday: '어제',
    minutesAgo: '{n}분 전',
    hoursAgo: '{n}시간 전',
    daysAgo: '{n}일 전',
    online: '온라인',
    markAllRead: '모두 읽음 표시',
  },
  'zh-tw': {
    pageTitle: '足跡',
    pageSubtitle: '查看過您個人資料的人',
    loading: '載入中...',
    noFootprints: '還沒有足跡',
    noFootprintsDesc: '充實您的個人資料，讓更多人發現您',
    editProfile: '編輯個人資料',
    yearsOld: '歲',
    today: '今天',
    yesterday: '昨天',
    minutesAgo: '{n}分鐘前',
    hoursAgo: '{n}小時前',
    daysAgo: '{n}天前',
    online: '線上',
    markAllRead: '全部標為已讀',
  },
}

interface VisitorProfile {
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
  visited_at: string | null
}

function FootprintsContent() {
  const { currentLanguage } = useLanguage()
  const [visitors, setVisitors] = useState<VisitorProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingRead, setIsMarkingRead] = useState(false)

  const t = (key: string, params?: Record<string, string | number>): string => {
    const texts = footprintsTranslations[currentLanguage] || footprintsTranslations['ja']
    let text = texts[key] || footprintsTranslations['ja'][key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    return text
  }

  useEffect(() => {
    const fetchVisitors = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/footprints', {
          cache: 'no-store',
          credentials: 'include'
        })
        const result = await response.json()
        if (response.ok) {
          setVisitors(result.visitors || [])
        } else {
          setVisitors([])
        }
      } catch (error) {
        console.error('Error fetching footprints:', error)
        setVisitors([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchVisitors()
  }, [])

  const markAllRead = async () => {
    setIsMarkingRead(true)
    try {
      await fetch('/api/footprints/read', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    } catch (error) {
      console.error('Error marking footprints as read:', error)
    } finally {
      setIsMarkingRead(false)
    }
  }

  const getBrowserLocale = (): string => {
    if (typeof window === 'undefined') return 'ja-JP'
    const lang = navigator.language
    if (lang.startsWith('ja')) return 'ja-JP'
    if (lang.startsWith('ko')) return 'ko-KR'
    if (lang.startsWith('zh')) return 'zh-TW'
    return lang
  }

  const formatDateHeading = (dateStr: string): string => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

    if (dateOnly.getTime() === todayOnly.getTime()) return t('today')
    if (dateOnly.getTime() === yesterdayOnly.getTime()) return t('yesterday')

    const locale = getBrowserLocale()
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    }).format(date)
  }

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    const locale = getBrowserLocale()
    if (locale.startsWith('ja')) {
      return new Intl.DateTimeFormat('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date)
    }
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  const getDateKey = (dateStr: string): string => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  // 日付でグループ化
  const groupedVisitors = (() => {
    if (visitors.length === 0) return []
    const groups = new Map<string, VisitorProfile[]>()
    const dateOrder: string[] = []

    visitors.forEach(visitor => {
      const dateKey = visitor.visited_at ? getDateKey(visitor.visited_at) : 'unknown'
      if (!groups.has(dateKey)) {
        groups.set(dateKey, [])
        dateOrder.push(dateKey)
      }
      groups.get(dateKey)!.push(visitor)
    })

    return dateOrder.map(dateKey => {
      const visitorsInGroup = groups.get(dateKey) || []
      const first = visitorsInGroup[0]
      const dateLabel = first?.visited_at ? formatDateHeading(first.visited_at) : ''
      return { dateKey, dateLabel, visitors: visitorsInGroup }
    })
  })()

  const content = (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      <Sidebar className="w-64 hidden md:block" />

      <div className="md:ml-64 py-6 px-4">
        <div className="max-w-[560px] mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('pageTitle')}</h1>
            <p className="text-sm text-gray-600">{t('pageSubtitle')}</p>
            {!isLoading && visitors.length > 0 && (
              <button
                onClick={markAllRead}
                disabled={isMarkingRead}
                className="mt-3 px-4 py-2 text-sm font-medium text-gray-500 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('markAllRead')}
              </button>
            )}
          </div>

          {/* スケルトンローディング */}
          {isLoading && (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse p-4">
                  <div className="flex">
                    <div className="w-[160px] h-[160px] bg-gray-200 rounded-lg flex-shrink-0"></div>
                    <div className="ml-4 flex-1">
                      <div className="h-4 w-14 bg-gray-200 rounded mb-2"></div>
                      <div className="h-7 w-20 bg-gray-200 rounded mb-2"></div>
                      <div className="h-6 w-24 bg-gray-200 rounded mb-2"></div>
                      <div className="h-5 w-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
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

          {/* 足跡一覧（日付グループ） */}
          {!isLoading && groupedVisitors.length > 0 && (
            <div className="flex flex-col gap-6">
              {groupedVisitors.map((group) => (
                <div key={group.dateKey}>
                  <h2 className="text-lg font-bold text-gray-800 mb-3">{group.dateLabel}</h2>

                  <div className="flex flex-col gap-4">
                    {group.visitors.map((visitor) => {
                      const isJapanese = !visitor.nationality ||
                        visitor.nationality === '' ||
                        visitor.nationality.toLowerCase() === 'jp' ||
                        visitor.nationality.toLowerCase() === 'japan' ||
                        visitor.nationality === '日本' ||
                        visitor.nationality.toLowerCase() === 'japanese'

                      const locationLabel = isJapanese
                        ? formatPrefecture(visitor.prefecture || visitor.residence, currentLanguage) || visitor.prefecture || visitor.residence
                        : formatNationality(visitor.nationality, currentLanguage) || visitor.nationality

                      return (
                        <Link
                          key={visitor.id}
                          href={`/profile/${visitor.id}`}
                          className="block"
                        >
                          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer p-4">
                            {/* 上部: 写真 + 基本情報 */}
                            <div className="flex">
                              {/* 写真エリア（左側）- 160px */}
                              <div className="relative w-[160px] h-[160px] flex-shrink-0">
                                {visitor.avatar_url ? (
                                  <img
                                    src={visitor.avatar_url}
                                    alt={visitor.name}
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
                                {/* 訪問時刻 */}
                                {visitor.visited_at && (
                                  <p className="text-sm text-gray-400 mb-1">
                                    {formatTime(visitor.visited_at)}
                                  </p>
                                )}
                                {/* 年齢 */}
                                {visitor.age && (
                                  <p className="text-2xl font-bold text-gray-800">
                                    {visitor.age}{t('yearsOld')}
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
                                  {visitor.name}
                                </p>
                              </div>
                            </div>

                            {/* 下部: 自己紹介 + タグ */}
                            {(visitor.bio || (visitor.interests && visitor.interests.length > 0)) && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                {visitor.bio && (
                                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                    {visitor.bio}
                                  </p>
                                )}
                                {visitor.interests && visitor.interests.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {visitor.interests.slice(0, 4).map((interest, index) => (
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

          {/* 0件の場合 */}
          {!isLoading && visitors.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Coffee className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('noFootprints')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('noFootprintsDesc')}
              </p>
              <Link href="/mypage">
                <Button variant="sakura" size="sm">
                  {t('editProfile')}
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

export default function FootprintsPage() {
  return <FootprintsContent />
}
