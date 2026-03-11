'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Heart,
  MapPin,
  Filter,
  Search,
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
import { formatPrefecture } from '@/utils/profileFieldFormatters'

// 4言語翻訳辞書
const matchesTranslations: Record<string, Record<string, string>> = {
  ja: {
    pageTitle: 'おすすめのお相手',
    pageSubtitle: 'あなたにぴったりのお相手を見つけて、素敵な文化体験を一緒に楽しみませんか？',
    likesRemaining: '本日の残りいいね',
    searchPlaceholder: '名前、趣味で検索...',
    nationalityPlaceholder: '国籍を選択',
    agePlaceholder: '年齢を選択',
    all: 'すべて',
    reset: 'リセット',
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
    // 国籍
    usa: 'アメリカ',
    canada: 'カナダ',
    uk: 'イギリス',
    korea: '韓国',
    china: '中国',
    // 年齢
    age18to25: '18-25歳',
    age26to30: '26-30歳',
    age31to35: '31-35歳',
    age36plus: '36歳以上'
  },
  en: {
    pageTitle: 'Recommended Matches',
    pageSubtitle: 'Find your perfect match and enjoy wonderful cultural experiences together!',
    likesRemaining: 'Likes remaining today',
    searchPlaceholder: 'Search by name, interests...',
    nationalityPlaceholder: 'Select nationality',
    agePlaceholder: 'Select age',
    all: 'All',
    reset: 'Reset',
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
    usa: 'USA',
    canada: 'Canada',
    uk: 'UK',
    korea: 'Korea',
    china: 'China',
    age18to25: '18-25',
    age26to30: '26-30',
    age31to35: '31-35',
    age36plus: '36+'
  },
  ko: {
    pageTitle: '추천 상대',
    pageSubtitle: '당신에게 딱 맞는 상대를 찾아 멋진 문화 체험을 함께 즐겨보세요!',
    likesRemaining: '오늘 남은 좋아요',
    searchPlaceholder: '이름, 취미로 검색...',
    nationalityPlaceholder: '국적 선택',
    agePlaceholder: '나이 선택',
    all: '전체',
    reset: '초기화',
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
    usa: '미국',
    canada: '캐나다',
    uk: '영국',
    korea: '한국',
    china: '중국',
    age18to25: '18-25세',
    age26to30: '26-30세',
    age31to35: '31-35세',
    age36plus: '36세 이상'
  },
  'zh-tw': {
    pageTitle: '推薦對象',
    pageSubtitle: '找到最適合您的對象，一起享受美好的文化體驗吧！',
    likesRemaining: '今日剩餘按讚數',
    searchPlaceholder: '搜尋姓名、興趣...',
    nationalityPlaceholder: '選擇國籍',
    agePlaceholder: '選擇年齡',
    all: '全部',
    reset: '重設',
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
    usa: '美國',
    canada: '加拿大',
    uk: '英國',
    korea: '韓國',
    china: '中國',
    age18to25: '18-25歲',
    age26to30: '26-30歲',
    age31to35: '31-35歲',
    age36plus: '36歲以上'
  }
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
}

export default function MatchesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { currentLanguage } = useLanguage()
  const [matches, setMatches] = useState<UserProfile[]>([])
  const [filteredMatches, setFilteredMatches] = useState<UserProfile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNationality, setSelectedNationality] = useState('all')
  const [selectedAge, setSelectedAge] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  // いいね残り回数
  const [likesRemaining, setLikesRemaining] = useState<number>(10)
  const [likesLimit] = useState<number>(10)

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
        const response = await fetch('/api/matches/recommendations', {
          cache: 'no-store',
          credentials: 'include'
        })

        const result = await response.json()

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
            distanceKm: 0
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
  }, [user, authLoading])

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
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
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
              <Heart className={`w-5 h-5 mr-2 ${likesRemaining > 0 ? 'text-sakura-500' : 'text-gray-400'}`} />
              <span className="text-gray-700">
                {t('likesRemaining')}: <span className={`font-bold ${likesRemaining > 0 ? 'text-sakura-600' : 'text-gray-500'}`}>{likesRemaining}</span> / {likesLimit}
              </span>
            </div>
          </div>

          {/* 検索・フィルター */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              {/* 国籍選択 */}
              <Select value={selectedNationality} onValueChange={setSelectedNationality}>
                <SelectTrigger>
                  <SelectValue placeholder={t('nationalityPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="usa">{t('usa')}</SelectItem>
                  <SelectItem value="canada">{t('canada')}</SelectItem>
                  <SelectItem value="uk">{t('uk')}</SelectItem>
                  <SelectItem value="korea">{t('korea')}</SelectItem>
                  <SelectItem value="china">{t('china')}</SelectItem>
                </SelectContent>
              </Select>

              {/* 年齢選択 */}
              <Select value={selectedAge} onValueChange={setSelectedAge}>
                <SelectTrigger>
                  <SelectValue placeholder={t('agePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="18-25">{t('age18to25')}</SelectItem>
                  <SelectItem value="26-30">{t('age26to30')}</SelectItem>
                  <SelectItem value="31-35">{t('age31to35')}</SelectItem>
                  <SelectItem value="36+">{t('age36plus')}</SelectItem>
                </SelectContent>
              </Select>

              {/* リセットボタン */}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedNationality('all')
                  setSelectedAge('all')
                }}
              >
                <Filter className="w-4 h-4 mr-2" />
                {t('reset')}
              </Button>
            </div>
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
                  : (user.nationalityLabel || user.nationality)

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
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sakura-100 to-sakura-200">
                            <User className="w-20 h-20 text-sakura-300" />
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
                                className="bg-sakura-50 text-sakura-700 px-2 py-0.5 rounded-full text-xs"
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
                  setSearchTerm('')
                  setSelectedNationality('all')
                  setSelectedAge('all')
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
                setSearchTerm('')
                setSelectedNationality('all')
                setSelectedAge('all')
              }}
              disabled={isLoading}
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
    </div>
  )

  return <AuthGuard>{content}</AuthGuard>
}
