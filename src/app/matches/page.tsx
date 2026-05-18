'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Heart,
  MapPin,
  Filter,
  Search,
  User,
  Globe,
  Coffee,
  X
} from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import AuthGuard from '@/components/auth/AuthGuard'
import { useAuth } from '@/store/authStore'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatCultureTag } from '@/utils/profileTagFormatters'
import { formatPrefecture, formatNationality } from '@/utils/profileFieldFormatters'
import { isJapaneseWoman } from '@/utils/userHelpers'
import {
  type SearchFilters,
  type MaritalStatusFilter,
  type LastActiveFilter,
  DEFAULT_FILTERS,
  isFilterActive,
  AGE_MIN_LIMIT,
  AGE_MAX_LIMIT,
} from '@/types/searchFilters'
import { getSearchFilterI18n } from '@/utils/searchFilterI18n'
import { NATIONALITY_FILTER_OPTIONS } from '@/utils/nationalityNormalize'
import {
  PREFECTURE_REGIONS,
  REGION_LABELS,
  getPrefectureLabel,
  type RegionKey,
} from '@/utils/prefectures'

// 4言語翻訳辞書
const matchesTranslations: Record<string, Record<string, string>> = {
  ja: {
    pageTitle: 'おすすめのお相手',
    pageSubtitle: 'あなたにぴったりのお相手を見つけて、素敵な文化体験を一緒に楽しみませんか？',
    likesRemaining: '本日の残りいいね',
    loading: '読み込み中…',
    matchesFound: '{count} 人のお相手が見つかりました',
    noMatchesTitle: '条件に合うお相手が見つかりませんでした',
    noMatchesSubtitle: '検索条件を変更するか、新しいお相手をお待ちください',
    resetConditions: '条件をリセット',
    searchMore: 'もっと新しいお相手を探す',
    searching: '新しいお相手を探しています...',
    online: 'オンライン',
    onlineNow: 'オンライン中',
    minutesAgo: '{min}分前にオンライン',
    hoursAgo: '{hours}時間前にオンライン',
    daysAgo: '{days}日前にオンライン',
    yearsOld: '歳',
    likeLimitReached: '本日のいいね上限（10回）に達しました。明日またお試しください。',
    matched: 'マッチしました！メッセージを送ってみましょう。',
    likeFailed: 'いいねの送信に失敗しました。もう一度お試しください。',
    errorOccurred: 'エラーが発生しました。もう一度お試しください。',
    plannedPrefectures: '訪問予定の都道府県',
  },
  en: {
    pageTitle: 'Recommended Matches',
    pageSubtitle: 'Find your perfect match and enjoy wonderful cultural experiences together!',
    likesRemaining: 'Likes remaining today',
    loading: 'Loading...',
    matchesFound: '{count} matches found',
    noMatchesTitle: 'No matches found',
    noMatchesSubtitle: 'Try changing your search conditions or wait for new members',
    resetConditions: 'Reset conditions',
    searchMore: 'Find more matches',
    searching: 'Searching for matches...',
    online: 'Online',
    onlineNow: 'Online now',
    minutesAgo: 'Online {min} min ago',
    hoursAgo: 'Online {hours} hours ago',
    daysAgo: 'Online {days} days ago',
    yearsOld: ' y/o',
    likeLimitReached: 'You have reached your daily like limit (10). Please try again tomorrow.',
    matched: 'It\'s a match! Send them a message.',
    likeFailed: 'Failed to send like. Please try again.',
    errorOccurred: 'An error occurred. Please try again.',
    plannedPrefectures: 'Planned Prefectures',
  },
  ko: {
    pageTitle: '추천 상대',
    pageSubtitle: '당신에게 딱 맞는 상대를 찾아 멋진 문화 체험을 함께 즐겨보세요!',
    likesRemaining: '오늘 남은 좋아요',
    loading: '로딩 중...',
    matchesFound: '{count}명의 상대를 찾았습니다',
    noMatchesTitle: '조건에 맞는 상대를 찾지 못했습니다',
    noMatchesSubtitle: '검색 조건을 변경하거나 새로운 회원을 기다려주세요',
    resetConditions: '조건 초기화',
    searchMore: '더 많은 상대 찾기',
    searching: '상대를 찾고 있습니다...',
    online: '온라인',
    onlineNow: '접속 중',
    minutesAgo: '{min}분 전 접속',
    hoursAgo: '{hours}시간 전 접속',
    daysAgo: '{days}일 전 접속',
    yearsOld: '세',
    likeLimitReached: '오늘의 좋아요 한도(10회)에 도달했습니다. 내일 다시 시도해주세요.',
    matched: '매칭되었습니다! 메시지를 보내보세요.',
    likeFailed: '좋아요 전송에 실패했습니다. 다시 시도해주세요.',
    errorOccurred: '오류가 발생했습니다. 다시 시도해주세요.',
    plannedPrefectures: '방문 예정 지역',
  },
  'zh-tw': {
    pageTitle: '推薦對象',
    pageSubtitle: '找到最適合您的對象，一起享受美好的文化體驗吧！',
    likesRemaining: '今日剩餘按讚數',
    loading: '載入中...',
    matchesFound: '找到 {count} 位對象',
    noMatchesTitle: '找不到符合條件的對象',
    noMatchesSubtitle: '請嘗試更改搜尋條件或等待新會員',
    resetConditions: '重設條件',
    searchMore: '尋找更多對象',
    searching: '正在尋找對象...',
    online: '線上',
    onlineNow: '目前在線',
    minutesAgo: '{min}分鐘前在線',
    hoursAgo: '{hours}小時前在線',
    daysAgo: '{days}天前在線',
    yearsOld: '歲',
    likeLimitReached: '您已達到今日按讚上限（10次）。請明天再試。',
    matched: '配對成功！發送訊息吧。',
    likeFailed: '按讚失敗，請重試。',
    errorOccurred: '發生錯誤，請重試。',
    plannedPrefectures: '預計前往的地區',
  }
}

interface MyProfileSummary {
  id: string
  gender: string | null
  nationality: string | null
}

// ユーザープロフィールの型定義
interface UserProfile {
  id: string
  firstName: string
  lastName: string
  age: number
  nationality: string
  nationalityLabel: string
  prefecture: string
  city: string
  hobbies: string[]
  selfIntroduction: string
  profileImage?: string
  lastSeen: string
  isOnline: boolean
  matchPercentage: number
  commonInterests: string[]
  distanceKm?: number
  plannedPrefectures?: string[]
}

export default function MatchesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { currentLanguage } = useLanguage()
  const [matches, setMatches] = useState<UserProfile[]>([])
  const [filteredMatches, setFilteredMatches] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 自分のプロフィール要約（モーダル UI の出し分け用）
  const [myProfile, setMyProfile] = useState<MyProfileSummary | null>(null)

  // 適用中のフィルタとモーダル下書きフィルタ
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [expandedRegions, setExpandedRegions] = useState<RegionKey[]>([])

  // いいね残り回数
  const [likesRemaining, setLikesRemaining] = useState<number>(10)
  const [likesLimit] = useState<number>(10)

  const filterLabels = getSearchFilterI18n(currentLanguage)
  const meIsJapaneseWoman = myProfile ? isJapaneseWoman(myProfile) : false
  const showNationalitySection = myProfile !== null && !meIsJapaneseWoman

  // 翻訳取得関数
  const t = (key: string, replacements: Record<string, string | number> = {}): string => {
    const texts = matchesTranslations[currentLanguage] || matchesTranslations['ja']
    let text = texts[key] || matchesTranslations['ja'][key] || key
    Object.entries(replacements).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v))
    })
    return text
  }

  // 最終ログイン表示
  const formatLastSeen = (lastSeenString: string) => {
    const lastSeen = new Date(lastSeenString)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60))

    if (diffMinutes < 60) {
      return t('minutesAgo', { min: diffMinutes })
    } else if (diffMinutes < 24 * 60) {
      return t('hoursAgo', { hours: Math.floor(diffMinutes / 60) })
    } else {
      return t('daysAgo', { days: Math.floor(diffMinutes / (24 * 60)) })
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

  // フィルタを query string にシリアライズ
  const buildFiltersQueryString = (f: SearchFilters): string => {
    const params = new URLSearchParams()
    if (f.nationalityIso.length > 0) {
      params.set('nationality', f.nationalityIso.join(','))
    }
    if (f.ageMin !== AGE_MIN_LIMIT) params.set('age_min', String(f.ageMin))
    if (f.ageMax !== AGE_MAX_LIMIT) params.set('age_max', String(f.ageMax))
    if (f.maritalStatus !== 'all') params.set('marital_status', f.maritalStatus)
    if (f.prefectures.length > 0) params.set('prefectures', f.prefectures.join(','))
    if (f.lastActive !== 'all') params.set('last_active', f.lastActive)
    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }

  // データ取得
  useEffect(() => {
    const fetchMatches = async () => {
      if (authLoading) return
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const qs = buildFiltersQueryString(filters)
        const response = await fetch(`/api/matches/recommendations${qs}`, {
          cache: 'no-store',
          credentials: 'include'
        })

        const result = await response.json()

        // 自分のプロフィール要約を debug から取り出して保持（モーダル UI 用）
        if (result?.debug?.myId) {
          setMyProfile({
            id: result.debug.myId,
            gender: result.debug.myGender ?? null,
            nationality: result.debug.myNationality ?? null,
          })
        }

        if (response.ok && result.candidates && result.candidates.length > 0) {
          const formattedMatches = result.candidates.map((profile: any) => ({
            id: profile.id,
            firstName: profile.name || 'Unknown',
            lastName: '',
            age: profile.age || 0,
            gender: profile.gender || '',
            nationality: profile.nationality || '',
            nationalityLabel: profile.nationality || '',
            residence: profile.residence || '',
            prefecture: profile.prefecture || profile.residence || '',
            city: typeof profile.city === 'object' ? profile.city?.city : profile.city || '',
            hobbies: Array.isArray(profile.interests) ? profile.interests : [],
            selfIntroduction: profile.bio || profile.self_introduction || '',
            profileImage: profile.avatar_url || (Array.isArray(profile.photo_urls) ? profile.photo_urls[0] : null),
            lastSeen: profile.updated_at || new Date().toISOString(),
            isOnline: false,
            matchPercentage: 0,
            commonInterests: [],
            distanceKm: 0,
            plannedPrefectures: Array.isArray(profile.planned_prefectures) ? profile.planned_prefectures : []
          }))
          setMatches(formattedMatches)
        } else {
          setMatches([])
        }
      } catch (error) {
        console.error('Error fetching matches:', error)
        setMatches([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchMatches()
  }, [user, authLoading, filters])

  // フィルタリング処理
  useEffect(() => {
    setFilteredMatches(matches)
  }, [matches])

  const handleLike = async (userId: string) => {
    if (likesRemaining <= 0) {
      alert(t('likeLimitReached'))
      return
    }

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likedUserId: userId, action: 'like' }),
      })

      const result = await response.json()

      if (response.ok) {
        setFilteredMatches(prev => prev.filter(user => user.id !== userId))
        setMatches(prev => prev.filter(user => user.id !== userId))
        if (typeof result.remaining === 'number') {
          setLikesRemaining(result.remaining)
        } else {
          setLikesRemaining(prev => Math.max(0, prev - 1))
        }
        if (result.matched) {
          alert(t('matched'))
        }
      } else if (response.status === 429) {
        setLikesRemaining(0)
        alert(t('likeLimitReached'))
      } else {
        alert(result.error || t('likeFailed'))
      }
    } catch (error) {
      console.error('Error liking user:', error)
      alert(t('errorOccurred'))
    }
  }

  const content = (
    <div className="min-h-screen bg-[#f5ebe0]">
      <Sidebar className="w-64 hidden md:block" />

      <div className="md:ml-64 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('pageTitle')}</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('pageSubtitle')}
            </p>
            {/* 残りいいね数表示 */}
            <div className="mt-4 inline-flex items-center bg-white rounded-full px-4 py-2 shadow-md">
              <Heart className={`w-5 h-5 mr-2 ${likesRemaining > 0 ? 'text-[#8b1a2e]' : 'text-gray-400'}`} />
              <span className="text-gray-700">
                {t('likesRemaining')}: <span className={`font-bold ${likesRemaining > 0 ? 'text-[#8b1a2e]' : 'text-gray-500'}`}>{likesRemaining}</span> / {likesLimit}
              </span>
            </div>
          </div>

          {/* 絞り込みボタン */}
          <div className="flex justify-center mb-8">
            <Button
              variant="outline"
              onClick={() => {
                setDraftFilters(filters)
                setExpandedRegions([])
                setShowFilterModal(true)
              }}
              disabled={myProfile === null}
              className="relative px-6"
            >
              <Filter className="w-4 h-4 mr-2" />
              {filterLabels.filterBtnLabel}
              {isFilterActive(filters) && (
                <span className="ml-2 inline-flex items-center bg-[#8b1a2e] text-white text-xs px-2 py-0.5 rounded-full">
                  {filterLabels.filterAppliedBadge}
                </span>
              )}
            </Button>
          </div>

          {/* 結果カウント */}
          <div className="mb-6">
            {isLoading ? (
              <p className="text-gray-500">{t('loading')}</p>
            ) : (
              <p className="text-gray-600">
                {t('matchesFound', { count: filteredMatches.length })}
              </p>
            )}
          </div>

          {/* スケルトン UI */}
          {isLoading && (
            <div className="flex flex-col gap-6 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-lg overflow-hidden animate-pulse max-w-xl mx-auto w-full">
                  <div className="h-56 bg-gray-200"></div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-20 bg-gray-200 rounded"></div>
                      <div className="h-5 w-12 bg-gray-200 rounded"></div>
                      <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                    </div>
                    <div className="h-3 w-24 bg-gray-200 rounded mb-3"></div>
                    <div className="space-y-2 mb-3">
                      <div className="h-4 w-full bg-gray-200 rounded"></div>
                      <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-5 w-12 bg-gray-200 rounded-full"></div>
                      <div className="h-5 w-14 bg-gray-200 rounded-full"></div>
                      <div className="h-5 w-10 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* マッチ一覧 */}
          {!isLoading && filteredMatches.length > 0 && (
            <div className="flex flex-col gap-6">
              {filteredMatches.map((user) => {
                const isJapanese = !user.nationality ||
                  user.nationality === '' ||
                  user.nationality.toLowerCase() === 'jp' ||
                  user.nationality.toLowerCase() === 'japan' ||
                  user.nationality === '日本' ||
                  user.nationality.toLowerCase() === 'japanese'

                const locationLabel = isJapanese
                  ? formatPrefecture(user.prefecture, currentLanguage) || user.prefecture
                  : formatNationality(user.nationality, currentLanguage) || user.nationality

                return (
                  <Link
                    key={user.id}
                    href={`/profile/${user.id}`}
                    className="block max-w-xl mx-auto w-full"
                  >
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer">
                      {/* プロフィール画像エリア */}
                      <div className="relative h-56 bg-gray-50">
                        {user.profileImage ? (
                          <img
                            src={user.profileImage}
                            alt={user.firstName}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#ede0d4]">
                            <User className="w-20 h-20" style={{ color: '#d4a89a' }} />
                          </div>
                        )}

                        {user.isOnline && (
                          <div className="absolute top-3 left-3">
                            <div className="flex items-center bg-green-500 text-white px-2 py-1 rounded-full text-xs shadow">
                              <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                              {t('online')}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* プロフィール情報 */}
                      <div className="p-5">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            {user.firstName}
                          </h3>
                          <span className="text-lg text-gray-700">{user.age}{t('yearsOld')}</span>
                          {locationLabel && (
                            <span className="flex items-center text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                              {isJapanese ? (
                                <MapPin className="w-3 h-3 mr-1" />
                              ) : (
                                <Globe className="w-3 h-3 mr-1" />
                              )}
                              {locationLabel}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 mb-3">
                          {user.isOnline ? (
                            <span className="flex items-center">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                              {t('onlineNow')}
                            </span>
                          ) : formatLastSeen(user.lastSeen)}
                        </p>

                        {user.selfIntroduction && (
                          <p className="text-gray-600 text-sm mb-3 leading-relaxed line-clamp-2">
                            {user.selfIntroduction}
                          </p>
                        )}

                        {user.hobbies && user.hobbies.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {user.hobbies.slice(0, 3).map((hobby, index) => (
                              <span
                                key={index}
                                className="bg-[#fdf6ef] text-[#8b1a2e] px-2 py-0.5 rounded-full text-xs"
                              >
                                {formatCultureTag(hobby, currentLanguage)}
                              </span>
                            ))}
                            {user.hobbies.length > 3 && (
                              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                +{user.hobbies.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {user.plannedPrefectures && user.plannedPrefectures.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {t('plannedPrefectures')}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {user.plannedPrefectures.slice(0, 4).map((pref, index) => (
                                <span
                                  key={index}
                                  className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs"
                                >
                                  {formatPrefecture(pref, currentLanguage) || pref}
                                </span>
                              ))}
                              {user.plannedPrefectures.length > 4 && (
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                  +{user.plannedPrefectures.length - 4}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* 結果が0件の場合 */}
          {!isLoading && filteredMatches.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Coffee className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('noMatchesTitle')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('noMatchesSubtitle')}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS)
                  setDraftFilters(DEFAULT_FILTERS)
                }}
              >
                {t('resetConditions')}
              </Button>
            </div>
          )}

          {/* 新しいマッチを探すボタン */}
          <div className="text-center mt-12">
            <Button
              variant="sakura"
              size="lg"
              onClick={() => {
                setDraftFilters(filters)
                setExpandedRegions([])
                setShowFilterModal(true)
              }}
              disabled={isLoading || myProfile === null}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('searching')}
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  {t('searchMore')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 絞り込みモーダル */}
      {showFilterModal && (() => {
        const labels = filterLabels
        return (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowFilterModal(false)}
            role="presentation"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={labels.modalTitle}
            >
              {/* ヘッダー */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{labels.modalTitle}</h2>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  aria-label={labels.closeAria}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 本体 */}
              <div className="overflow-y-auto px-6 py-4 space-y-6">
                {/* 年齢 */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">{labels.ageRange}</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {labels.ageRangeReadout
                      .replace('{min}', String(draftFilters.ageMin))
                      .replace('{max}', String(draftFilters.ageMax))}
                  </p>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min={AGE_MIN_LIMIT}
                      max={AGE_MAX_LIMIT}
                      value={draftFilters.ageMin}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setDraftFilters(prev => ({
                          ...prev,
                          ageMin: v,
                          ageMax: Math.max(prev.ageMax, v),
                        }))
                      }}
                      aria-label={`${labels.ageRange} min`}
                      className="w-full accent-[#8b1a2e]"
                    />
                    <input
                      type="range"
                      min={AGE_MIN_LIMIT}
                      max={AGE_MAX_LIMIT}
                      value={draftFilters.ageMax}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setDraftFilters(prev => ({
                          ...prev,
                          ageMax: v,
                          ageMin: Math.min(prev.ageMin, v),
                        }))
                      }}
                      aria-label={`${labels.ageRange} max`}
                      className="w-full accent-[#8b1a2e]"
                    />
                  </div>
                </section>

                {/* 国籍（外国人男性検索時のみ表示） */}
                {showNationalitySection && (
                  <section>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">{labels.nationality}</h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {draftFilters.nationalityIso.length === 0
                        ? labels.nationalityNoneSelected
                        : labels.nationalitySelectedCount.replace(
                            '{count}',
                            String(draftFilters.nationalityIso.length),
                          )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {NATIONALITY_FILTER_OPTIONS.map(opt => {
                        const checked = draftFilters.nationalityIso.includes(opt.iso)
                        return (
                          <button
                            key={opt.iso}
                            type="button"
                            onClick={() => {
                              setDraftFilters(prev => ({
                                ...prev,
                                nationalityIso: checked
                                  ? prev.nationalityIso.filter(c => c !== opt.iso)
                                  : [...prev.nationalityIso, opt.iso],
                              }))
                            }}
                            aria-pressed={checked}
                            className={`px-3 py-1 rounded-full text-sm border transition ${
                              checked
                                ? 'bg-[#8b1a2e] text-white border-[#8b1a2e]'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-[#8b1a2e]'
                            }`}
                          >
                            {opt.labels[currentLanguage] ?? opt.labels.ja}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )}

                {/* 婚姻状態 */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">{labels.maritalStatus}</h3>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'single', 'married'] as const).map(value => {
                      const valueLabels: Record<MaritalStatusFilter, string> = {
                        all: labels.maritalAll,
                        single: labels.maritalSingle,
                        married: labels.maritalMarried,
                      }
                      const active = draftFilters.maritalStatus === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setDraftFilters(prev => ({ ...prev, maritalStatus: value }))
                          }
                          aria-pressed={active}
                          className={`px-4 py-2 rounded-lg text-sm border transition ${
                            active
                              ? 'bg-[#8b1a2e] text-white border-[#8b1a2e]'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-[#8b1a2e]'
                          }`}
                        >
                          {valueLabels[value]}
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* 都道府県 */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">{labels.prefecture}</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {meIsJapaneseWoman
                      ? labels.prefecturePlannedVisitHint
                      : labels.prefectureResidenceHint}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    {draftFilters.prefectures.length === 0
                      ? labels.prefectureNoneSelected
                      : labels.prefectureSelectedCount.replace(
                          '{count}',
                          String(draftFilters.prefectures.length),
                        )}
                  </p>
                  <div className="space-y-2">
                    {PREFECTURE_REGIONS.map(region => {
                      const expanded = expandedRegions.includes(region.key)
                      const selectedInRegion = region.prefectures.filter(p =>
                        draftFilters.prefectures.includes(p),
                      ).length
                      return (
                        <div
                          key={region.key}
                          className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRegions(prev =>
                                expanded
                                  ? prev.filter(k => k !== region.key)
                                  : [...prev, region.key],
                              )
                            }
                            aria-expanded={expanded}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-sm text-gray-800"
                          >
                            <span className="font-medium">
                              {REGION_LABELS[currentLanguage][region.key]}
                              {selectedInRegion > 0 && (
                                <span className="ml-2 text-xs text-[#8b1a2e]">
                                  ({selectedInRegion})
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-gray-500">{expanded ? '▾' : '▸'}</span>
                          </button>
                          {expanded && (
                            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white">
                              {region.prefectures.map(p => {
                                const checked = draftFilters.prefectures.includes(p)
                                return (
                                  <label
                                    key={p}
                                    className="flex items-center gap-2 text-sm cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        setDraftFilters(prev => ({
                                          ...prev,
                                          prefectures: checked
                                            ? prev.prefectures.filter(x => x !== p)
                                            : [...prev.prefectures, p],
                                        }))
                                      }}
                                      className="accent-[#8b1a2e]"
                                    />
                                    <span>{getPrefectureLabel(p, currentLanguage)}</span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>

                {/* 最終アクティブ */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">{labels.lastActive}</h3>
                  <div className="flex flex-wrap gap-2">
                    {(['all', '24h', '7d'] as const).map(value => {
                      const valueLabels: Record<LastActiveFilter, string> = {
                        all: labels.lastActiveAll,
                        '24h': labels.lastActive24h,
                        '7d': labels.lastActive7d,
                      }
                      const active = draftFilters.lastActive === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setDraftFilters(prev => ({ ...prev, lastActive: value }))
                          }
                          aria-pressed={active}
                          className={`px-4 py-2 rounded-lg text-sm border transition ${
                            active
                              ? 'bg-[#8b1a2e] text-white border-[#8b1a2e]'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-[#8b1a2e]'
                          }`}
                        >
                          {valueLabels[value]}
                        </button>
                      )
                    })}
                  </div>
                </section>
              </div>

              {/* フッター */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setDraftFilters(DEFAULT_FILTERS)}
                  className="text-sm text-gray-600 hover:text-[#8b1a2e] underline-offset-2 hover:underline"
                >
                  {labels.reset}
                </button>
                <Button
                  variant="sakura"
                  onClick={() => {
                    setFilters(draftFilters)
                    setShowFilterModal(false)
                  }}
                >
                  {labels.search}
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )

  return <AuthGuard>{content}</AuthGuard>
}
