'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, MapPin, Clock, Users, Search, Filter, Plus, Heart, Star } from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import { useLanguage } from '@/contexts/LanguageContext'

const experiencesTranslations: Record<string, Record<string, string>> = {
  ja: {
    pageTitle: '文化体験一覧',
    pageSubtitle: '日本の伝統文化を体験し、素敵な出会いを見つけませんか？',
    createButton: '文化体験を企画する',
    searchPlaceholder: '体験名、場所で検索...',
    categoryPlaceholder: 'カテゴリを選択',
    prefecturePlaceholder: '都道府県を選択',
    resetButton: 'リセット',
    resultsCount: '{n} 件の文化体験が見つかりました',
    viewDetails: '詳細を見る',
    noResults: '条件に合う文化体験が見つかりませんでした',
    noResultsDesc: '検索条件を変更してもう一度お試しください',
    resetConditions: '条件をリセット',
    availabilityFew: '残りわずか',
    availabilityLow: '残り少数',
    availabilityOpen: '受付中',
    allCategories: 'すべて',
    allPrefectures: 'すべて',
    peopleCount: '{current}/{max}名',
  },
  en: {
    pageTitle: 'Cultural Experiences',
    pageSubtitle: 'Experience Japanese traditional culture and find wonderful connections',
    createButton: 'Host an Experience',
    searchPlaceholder: 'Search by name or location...',
    categoryPlaceholder: 'Select category',
    prefecturePlaceholder: 'Select prefecture',
    resetButton: 'Reset',
    resultsCount: '{n} experiences found',
    viewDetails: 'View Details',
    noResults: 'No experiences found matching your criteria',
    noResultsDesc: 'Try changing your search criteria',
    resetConditions: 'Reset Filters',
    availabilityFew: 'Almost Full',
    availabilityLow: 'Filling Up',
    availabilityOpen: 'Open',
    allCategories: 'All',
    allPrefectures: 'All',
    peopleCount: '{current}/{max}',
  },
  ko: {
    pageTitle: '문화 체험 목록',
    pageSubtitle: '일본 전통 문화를 체험하고 멋진 만남을 찾아보세요',
    createButton: '체험 기획하기',
    searchPlaceholder: '체험명, 장소로 검색...',
    categoryPlaceholder: '카테고리 선택',
    prefecturePlaceholder: '도도부현 선택',
    resetButton: '초기화',
    resultsCount: '{n}개의 문화 체험을 찾았습니다',
    viewDetails: '자세히 보기',
    noResults: '조건에 맞는 문화 체험이 없습니다',
    noResultsDesc: '검색 조건을 변경해 보세요',
    resetConditions: '조건 초기화',
    availabilityFew: '마감 임박',
    availabilityLow: '자리 부족',
    availabilityOpen: '모집 중',
    allCategories: '전체',
    allPrefectures: '전체',
    peopleCount: '{current}/{max}명',
  },
  'zh-tw': {
    pageTitle: '文化體驗列表',
    pageSubtitle: '體驗日本傳統文化，尋找美好的相遇',
    createButton: '舉辦文化體驗',
    searchPlaceholder: '搜尋體驗名稱或地點...',
    categoryPlaceholder: '選擇類別',
    prefecturePlaceholder: '選擇都道府縣',
    resetButton: '重置',
    resultsCount: '找到 {n} 個文化體驗',
    viewDetails: '查看詳情',
    noResults: '找不到符合條件的文化體驗',
    noResultsDesc: '請嘗試變更搜尋條件',
    resetConditions: '重置條件',
    availabilityFew: '即將額滿',
    availabilityLow: '名額不多',
    availabilityOpen: '報名中',
    allCategories: '全部',
    allPrefectures: '全部',
    peopleCount: '{current}/{max}人',
  },
}

// カテゴリの翻訳
const categoryTranslations: Record<string, Record<string, string>> = {
  ja: { '茶道': '茶道', '書道': '書道', '料理': '料理', '着物': '着物', '華道': '華道', '剣道': '剣道', '音楽': '音楽', 'その他': 'その他' },
  en: { '茶道': 'Tea Ceremony', '書道': 'Calligraphy', '料理': 'Cooking', '着物': 'Kimono', '華道': 'Flower Arrangement', '剣道': 'Kendo', '音楽': 'Music', 'その他': 'Other' },
  ko: { '茶道': '다도', '書道': '서예', '料理': '요리', '着物': '기모노', '華道': '꽃꽂이', '剣道': '검도', '音楽': '음악', 'その他': '기타' },
  'zh-tw': { '茶道': '茶道', '書道': '書道', '料理': '料理', '着物': '和服', '華道': '花道', '剣道': '劍道', '音楽': '音樂', 'その他': '其他' },
}

const CATEGORIES_JA = ['茶道', '書道', '料理', '着物', '華道', '剣道', '音楽', 'その他']

// 文化体験のタイプ定義
interface Experience {
  id: string
  title: string
  description: string
  category: string
  date: string
  timeStart: string
  timeEnd: string
  location: string
  prefecture: string
  city: string
  maxParticipants: number
  currentParticipants: number
  price: number
  currency: string
  organizerId: string
  organizerName: string
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  imageUrl?: string
  rating?: number
  reviewCount?: number
}

// サンプルデータ
const SAMPLE_EXPERIENCES: Experience[] = [
  {
    id: '1',
    title: '伝統的な茶道体験',
    description: '静寂な茶室で、本格的な茶道の世界を体験してください。和の心を学び、日本文化の奥深さを感じることができます。',
    category: '茶道',
    date: '2025-08-15',
    timeStart: '14:00',
    timeEnd: '16:00',
    location: '表参道茶道会館',
    prefecture: '東京都',
    city: '渋谷区',
    maxParticipants: 8,
    currentParticipants: 3,
    price: 3500,
    currency: 'JPY',
    organizerId: 'organizer1',
    organizerName: '田中 美和子',
    status: 'upcoming',
    imageUrl: '/tea-ceremony.jpg',
    rating: 4.8,
    reviewCount: 24
  },
  {
    id: '2',
    title: '書道・筆文字アート教室',
    description: '美しい筆文字の書き方を学びながら、自分だけの作品を作成します。初心者でも丁寧に指導いたします。',
    category: '書道',
    date: '2025-08-18',
    timeStart: '10:00',
    timeEnd: '12:00',
    location: '銀座文化センター',
    prefecture: '東京都',
    city: '中央区',
    maxParticipants: 12,
    currentParticipants: 7,
    price: 2800,
    currency: 'JPY',
    organizerId: 'organizer2',
    organizerName: '山田 博文',
    status: 'upcoming',
    imageUrl: '/calligraphy.jpg',
    rating: 4.6,
    reviewCount: 18
  },
  {
    id: '3',
    title: '日本料理調理体験',
    description: '季節の食材を使った本格的な日本料理の作り方を学びます。作った料理は皆さんで一緒にお召し上がりいただきます。',
    category: '料理',
    date: '2025-08-20',
    timeStart: '11:00',
    timeEnd: '15:00',
    location: '和食料理教室「四季」',
    prefecture: '東京都',
    city: '新宿区',
    maxParticipants: 10,
    currentParticipants: 5,
    price: 5200,
    currency: 'JPY',
    organizerId: 'organizer3',
    organizerName: '佐藤 恵子',
    status: 'upcoming',
    imageUrl: '/cooking.jpg',
    rating: 4.9,
    reviewCount: 31
  },
  {
    id: '4',
    title: '着物着付け体験',
    description: '美しい着物の着付けを体験し、日本の伝統的な美しさを感じてください。写真撮影も含まれています。',
    category: '着物',
    date: '2025-08-22',
    timeStart: '13:00',
    timeEnd: '16:00',
    location: '浅草着物レンタル館',
    prefecture: '東京都',
    city: '台東区',
    maxParticipants: 6,
    currentParticipants: 2,
    price: 4200,
    currency: 'JPY',
    organizerId: 'organizer4',
    organizerName: '鈴木 雅美',
    status: 'upcoming',
    imageUrl: '/kimono.jpg',
    rating: 4.7,
    reviewCount: 15
  },
]

export default function ExperiencesPage() {
  const { currentLanguage } = useLanguage()
  const currentLang = ['ja', 'en', 'ko', 'zh-tw'].includes(currentLanguage) ? currentLanguage : 'en'
  const T = experiencesTranslations[currentLang]
  const catT = categoryTranslations[currentLang]

  const [experiences, setExperiences] = useState<Experience[]>([])
  const [filteredExperiences, setFilteredExperiences] = useState<Experience[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPrefecture, setSelectedPrefecture] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchExperiences = async () => {
      try {
        setIsLoading(true)
        const params = new URLSearchParams()
        if (searchTerm) params.append('search', searchTerm)
        if (selectedCategory !== 'all') params.append('category', selectedCategory)
        if (selectedPrefecture !== 'all') params.append('prefecture', selectedPrefecture)

        const response = await fetch(`/api/experiences?${params.toString()}`)
        const result = await response.json()

        if (response.ok) {
          setExperiences(result.experiences || [])
        } else {
          setExperiences(SAMPLE_EXPERIENCES)
        }
      } catch (error) {
        setExperiences(SAMPLE_EXPERIENCES)
      } finally {
        setIsLoading(false)
      }
    }
    fetchExperiences()
  }, [searchTerm, selectedCategory, selectedPrefecture])

  useEffect(() => {
    setFilteredExperiences(experiences)
  }, [experiences])

  const formatPrice = (price: number, currency: string) => {
    return `¥${price.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const locale = currentLang === 'ja' ? 'ja-JP' : currentLang === 'ko' ? 'ko-KR' : currentLang === 'zh-tw' ? 'zh-TW' : 'en-US'
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  }

  const getAvailabilityStatus = (current: number, max: number) => {
    const ratio = current / max
    if (ratio >= 0.9) return { text: T.availabilityFew, color: 'text-red-600 bg-red-50' }
    if (ratio >= 0.7) return { text: T.availabilityLow, color: 'text-orange-600 bg-orange-50' }
    return { text: T.availabilityOpen, color: 'text-green-600 bg-green-50' }
  }

  const handleReset = () => {
    setSearchTerm('')
    setSelectedCategory('all')
    setSelectedPrefecture('all')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      <Sidebar className="w-64 hidden md:block" />

      <div className="md:ml-64 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{T.pageTitle}</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              {T.pageSubtitle}
            </p>
            <Link href="/experiences/create">
              <Button variant="sakura" size="lg" className="mb-8">
                <Plus className="w-5 h-5 mr-2" />
                {T.createButton}
              </Button>
            </Link>
          </div>

          {/* 検索・フィルター */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={T.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={T.categoryPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{T.allCategories}</SelectItem>
                  {CATEGORIES_JA.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {catT[cat] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPrefecture} onValueChange={setSelectedPrefecture}>
                <SelectTrigger>
                  <SelectValue placeholder={T.prefecturePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{T.allPrefectures}</SelectItem>
                  <SelectItem value="東京都">東京都</SelectItem>
                  <SelectItem value="大阪府">大阪府</SelectItem>
                  <SelectItem value="京都府">京都府</SelectItem>
                  <SelectItem value="神奈川県">神奈川県</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={handleReset}>
                <Filter className="w-4 h-4 mr-2" />
                {T.resetButton}
              </Button>
            </div>
          </div>

          {/* 結果カウント */}
          <div className="mb-6">
            <p className="text-gray-600">
              {T.resultsCount.replace('{n}', String(filteredExperiences.length))}
            </p>
          </div>

          {/* 体験カード一覧 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredExperiences.map((experience) => {
              const availability = getAvailabilityStatus(experience.currentParticipants, experience.maxParticipants)

              return (
                <div key={experience.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  <div className="relative h-48 bg-gradient-to-br from-sakura-200 to-sakura-300">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-6xl opacity-30">
                        {experience.category === '茶道' && '🍵'}
                        {experience.category === '書道' && '🖌️'}
                        {experience.category === '料理' && '🍱'}
                        {experience.category === '着物' && '👘'}
                      </span>
                    </div>

                    <div className="absolute top-4 left-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${availability.color}`}>
                        {availability.text}
                      </span>
                    </div>

                    <button className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-white transition-colors">
                      <Heart className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-1 bg-sakura-100 text-sakura-700 rounded-full text-xs font-medium">
                        {catT[experience.category] || experience.category}
                      </span>
                      {experience.rating && (
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600 ml-1">
                            {experience.rating} ({experience.reviewCount})
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {experience.title}
                    </h3>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {experience.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(experience.date)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        {experience.timeStart} - {experience.timeEnd}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        {experience.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        {T.peopleCount
                          .replace('{current}', String(experience.currentParticipants))
                          .replace('{max}', String(experience.maxParticipants))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-sakura-600">
                        {formatPrice(experience.price, experience.currency)}
                      </div>
                      <Link href={`/experiences/${experience.id}`}>
                        <Button variant="sakura" size="sm">
                          {T.viewDetails}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 結果が0件の場合 */}
          {filteredExperiences.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {T.noResults}
              </h3>
              <p className="text-gray-600 mb-4">
                {T.noResultsDesc}
              </p>
              <Button variant="outline" onClick={handleReset}>
                {T.resetConditions}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
