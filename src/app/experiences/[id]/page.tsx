'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  ArrowLeft, 
  Heart, 
  Star, 
  User,
  Phone,
  Mail,
  MessageCircle,
  Share2,
  Flag,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

// 文化体験のタイプ定義（experiences/page.tsxと同じ）
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

// 詳細情報
interface ExperienceDetail extends Experience {
  fullDescription: string
  requirements: string[]
  included: string[]
  toBring: string[]
  address: string
  organizerProfile: {
    bio: string
    experienceCount: number
    joinedDate: string
    rating: number
  }
  reviews: {
    id: string
    userName: string
    rating: number
    comment: string
    date: string
  }[]
}

// サンプルデータ
const SAMPLE_EXPERIENCE_DETAILS: Record<string, ExperienceDetail> = {
  '1': {
    id: '1',
    title: '伝統的な茶道体験',
    description: '静寂な茶室で、本格的な茶道の世界を体験してください。和の心を学び、日本文化の奥深さを感じることができます。',
    fullDescription: `静寂に包まれた茶室で、400年以上の歴史を持つ表千家流の茶道を本格的に学べる体験です。\n\n経験豊富な茶道師範による丁寧な指導のもと、茶の湯の精神「一期一会」の心を学び、美しい所作とともに日本文化の奥深さを体感していただきます。\n\n体験では、実際にお茶を点てて、季節の和菓子とともにお楽しみいただけます。茶道の歴史や哲学についても分かりやすく解説いたします。`,
    category: '茶道',
    date: '2025-08-15',
    timeStart: '14:00',
    timeEnd: '16:00',
    location: '表参道茶道会館',
    address: '東京都渋谷区神宮前4-12-10 表参道ヒルズ近く',
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
    reviewCount: 24,
    requirements: [
      '正座が困難な方はご相談ください',
      '和室での体験のため、清潔な靴下をご着用ください',
      '写真撮影は指定時間のみ可能'
    ],
    included: [
      '茶道具一式の使用',
      '抹茶・季節の和菓子',
      '茶道の基本レッスン',
      '修了証（希望者のみ）'
    ],
    toBring: [
      '特にありません',
      '着物での参加も歓迎（着付けサービスなし）',
      'カメラ（写真撮影時間有り）'
    ],
    organizerProfile: {
      bio: '表千家茶道師範として20年以上の経験を持ち、国際交流を通じた茶道の普及に取り組んでいます。',
      experienceCount: 156,
      joinedDate: '2020-03-15',
      rating: 4.9
    },
    reviews: [
      {
        id: '1',
        userName: 'Sarah M.',
        rating: 5,
        comment: '素晴らしい体験でした。田中先生の丁寧な指導で、茶道の深い精神性を学ぶことができました。',
        date: '2025-07-20'
      },
      {
        id: '2',
        userName: 'Michael K.',
        rating: 5,
        comment: 'Perfect introduction to tea ceremony. Very peaceful and educational experience.',
        date: '2025-07-15'
      },
      {
        id: '3',
        userName: '山田 花子',
        rating: 4,
        comment: '初心者でしたが、とても分かりやすく教えていただけました。和菓子も美味しかったです。',
        date: '2025-07-10'
      }
    ]
  }
}

export default function ExperienceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [experience, setExperience] = useState<ExperienceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)

  useEffect(() => {
    const loadExperience = async () => {
      if (!params?.id) return
      
      try {
        const response = await fetch(`/api/experiences/${params.id}`)
        const result = await response.json()

        if (response.ok) {
          setExperience(result)
        } else {
          console.error('Failed to fetch experience:', result.error)
          // フォールバックとしてサンプルデータを使用
          const experienceData = SAMPLE_EXPERIENCE_DETAILS[params.id as string]
          if (experienceData) {
            setExperience(experienceData)
          }
        }
      } catch (error) {
        console.error('Error loading experience:', error)
        // エラー時はサンプルデータを使用
        const experienceData = SAMPLE_EXPERIENCE_DETAILS[params.id as string]
        if (experienceData) {
          setExperience(experienceData)
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (params?.id) {
      loadExperience()
    }
  }, [params?.id])

  const formatPrice = (price: number, currency: string) => {
    return `¥${price.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    })
  }

  const getAvailabilityStatus = (current: number, max: number) => {
    const ratio = current / max
    if (ratio >= 0.9) return { text: '残りわずか', color: 'text-red-600 bg-red-50' }
    if (ratio >= 0.7) return { text: '残り少数', color: 'text-orange-600 bg-orange-50' }
    return { text: '受付中', color: 'text-green-600 bg-green-50' }
  }

  const handleBooking = () => {
    // TODO: 実際の予約処理
    setShowBookingModal(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5ebe0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#8b1a2e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">体験情報を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (!experience) {
    return (
      <div className="min-h-screen bg-[#f5ebe0] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">体験が見つかりません</h2>
          <p className="text-gray-600 mb-4">指定された体験は存在しないか、削除されました。</p>
          <Link href="/experiences">
            <Button variant="sakura">体験一覧に戻る</Button>
          </Link>
        </div>
      </div>
    )
  }

  const availability = getAvailabilityStatus(experience.currentParticipants, experience.maxParticipants)

  return (
    <div className="min-h-screen bg-[#f5ebe0] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              {isLiked ? 'お気に入り済み' : 'お気に入り'}
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-1" />
              シェア
            </Button>
            <Button variant="outline" size="sm">
              <Flag className="w-4 h-4 mr-1" />
              報告
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-6">
            {/* 体験画像とタイトル */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="relative h-64 bg-gradient-to-br from-[#ede0d4] to-[#d4a89a]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-8xl opacity-30">🍵</span>
                </div>
                
                {/* ステータスバッジ */}
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${availability.color}`}>
                    {availability.text}
                  </span>
                </div>

                {/* カテゴリバッジ */}
                <div className="absolute bottom-4 left-4">
                  <span className="px-3 py-1 bg-[#8b1a2e] text-white rounded-full text-sm font-medium">
                    {experience.category}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold text-gray-900">{experience.title}</h1>
                  {experience.rating && (
                    <div className="flex items-center">
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      <span className="text-lg font-semibold text-gray-900 ml-1">
                        {experience.rating}
                      </span>
                      <span className="text-gray-600 ml-1">
                        ({experience.reviewCount}件)
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-gray-600 mb-4">{experience.description}</p>

                {/* 詳細情報 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-5 h-5 mr-2" />
                    {formatDate(experience.date)}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-5 h-5 mr-2" />
                    {experience.timeStart} - {experience.timeEnd}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-2" />
                    {experience.location}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="w-5 h-5 mr-2" />
                    {experience.currentParticipants}/{experience.maxParticipants}名
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-2xl font-bold text-[#8b1a2e]">
                    {formatPrice(experience.price, experience.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* 詳細説明 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">体験について</h3>
              <div className="prose prose-gray max-w-none">
                {experience.fullDescription.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-3 text-gray-600 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* 体験に含まれるもの・持参物など */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">体験に含まれるもの</h4>
                  <ul className="space-y-2">
                    {experience.included.map((item, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">持参していただくもの</h4>
                  <ul className="space-y-2">
                    {experience.toBring.map((item, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-600">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-3 mt-2 flex-shrink-0"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">注意事項</h4>
                  <ul className="space-y-2">
                    {experience.requirements.map((item, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-600">
                        <AlertCircle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 開催場所 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">開催場所</h3>
              <div className="flex items-start mb-4">
                <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">{experience.location}</p>
                  <p className="text-gray-600">{experience.address}</p>
                </div>
              </div>
              {/* TODO: 地図コンポーネントを追加 */}
              <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">地図を表示（未実装）</p>
              </div>
            </div>

            {/* レビュー */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                参加者のレビュー ({experience.reviews.length})
              </h3>
              <div className="space-y-4">
                {experience.reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-[#fdf6ef] rounded-full flex items-center justify-center mr-3">
                          <User className="w-4 h-4 text-[#8b1a2e]" />
                        </div>
                        <span className="font-medium text-gray-900">{review.userName}</span>
                      </div>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating 
                                ? 'text-yellow-400 fill-current' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-500 ml-2">
                          {new Date(review.date).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* 予約カード */}
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-[#8b1a2e] mb-2">
                  {formatPrice(experience.price, experience.currency)}
                </p>
                <p className="text-gray-600">1名あたり</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">開催日時</span>
                  <span className="font-medium">{formatDate(experience.date)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">時間</span>
                  <span className="font-medium">{experience.timeStart} - {experience.timeEnd}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">参加者</span>
                  <span className="font-medium">{experience.currentParticipants}/{experience.maxParticipants}名</span>
                </div>
              </div>

              <Button 
                variant="sakura" 
                size="lg" 
                className="w-full mb-4"
                onClick={handleBooking}
              >
                参加を申し込む
              </Button>

              <p className="text-xs text-gray-500 text-center">
                申し込み後、主催者からの承認をお待ちください
              </p>
            </div>

            {/* 主催者情報 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h4 className="font-bold text-gray-900 mb-4">主催者</h4>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#fdf6ef] rounded-full flex items-center justify-center mr-3">
                  <User className="w-6 h-6 text-[#8b1a2e]" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{experience.organizerName}</p>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">
                      {experience.organizerProfile.rating} ({experience.organizerProfile.experienceCount}件の体験)
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">
                {experience.organizerProfile.bio}
              </p>

              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  メッセージを送る
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <User className="w-4 h-4 mr-2" />
                  プロフィールを見る
                </Button>
              </div>
            </div>

            {/* 連絡先・サポート */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h4 className="font-bold text-gray-900 mb-4">お困りの際は</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  電話サポート
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  メールサポート
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 予約確認モーダル（簡易版） */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">参加申し込み確認</h3>
            <p className="text-gray-600 mb-6">
              「{experience.title}」への参加を申し込みますか？
            </p>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowBookingModal(false)}
              >
                キャンセル
              </Button>
              <Button 
                variant="sakura" 
                className="flex-1"
                onClick={() => {
                  // TODO: 実際の予約処理
                  alert('参加申し込みが完了しました！')
                  setShowBookingModal(false)
                }}
              >
                申し込む
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}