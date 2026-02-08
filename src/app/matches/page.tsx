'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Heart,
  X,
  MessageCircle,
  MapPin,
  Calendar,
  Star,
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

// サンプルデータ
const SAMPLE_MATCHES: UserProfile[] = [
  {
    id: 'user1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    age: 26,
    nationality: 'US',
    nationalityLabel: 'アメリカ',
    prefecture: '東京都',
    city: '渋谷区',
    hobbies: ['茶道', '書道', '読書', '旅行', '料理'],
    selfIntroduction: '日本の伝統文化に深い興味があり、特に茶道と書道を学びたいと思っています。日本での生活を通じて、多くの素晴らしい文化体験をしたいと考えています。',
    lastSeen: '2025-07-30T10:30:00Z',
    isOnline: true,
    matchPercentage: 92,
    commonInterests: ['茶道', '書道', '料理'],
    distanceKm: 5.2
  },
  {
    id: 'user2',
    firstName: 'Michael',
    lastName: 'Chen',
    age: 29,
    nationality: 'CA',
    nationalityLabel: 'カナダ',
    prefecture: '東京都',
    city: '新宿区',
    hobbies: ['料理', '音楽鑑賞', '写真撮影', '旅行', 'ヨガ'],
    selfIntroduction: 'カナダから来ました。日本料理を本格的に学びたく、また日本の音楽文化にも興味があります。新しい人との出会いを楽しみにしています。',
    lastSeen: '2025-07-30T09:15:00Z',
    isOnline: false,
    matchPercentage: 85,
    commonInterests: ['料理', '旅行'],
    distanceKm: 8.7
  },
  {
    id: 'user3',
    firstName: 'Emma',
    lastName: 'Thompson',
    age: 24,
    nationality: 'GB',
    nationalityLabel: 'イギリス',
    prefecture: '東京都',
    city: '港区',
    hobbies: ['華道', '映画鑑賞', 'ダンス', 'カフェ巡り', '語学学習'],
    selfIntroduction: 'イギリスから日本に来て半年になります。華道と日本の伝統的な文化に魅力を感じています。一緒に文化体験を楽しめる方と出会えたら嬉しいです。',
    lastSeen: '2025-07-29T20:45:00Z',
    isOnline: false,
    matchPercentage: 78,
    commonInterests: ['華道', '映画鑑賞'],
    distanceKm: 12.3
  },
  {
    id: 'user4',
    firstName: 'David',
    lastName: 'Kim',
    age: 31,
    nationality: 'KR',
    nationalityLabel: '韓国',
    prefecture: '神奈川県',
    city: '横浜市',
    hobbies: ['剣道', 'スポーツ', '読書', '温泉巡り', '登山・ハイキング'],
    selfIntroduction: '韓国出身で、日本の武道、特に剣道に興味があります。また、日本の自然や温泉文化も大好きです。アクティブな文化体験を一緒に楽しみましょう。',
    lastSeen: '2025-07-30T07:20:00Z',
    isOnline: false,
    matchPercentage: 71,
    commonInterests: ['剣道', '読書'],
    distanceKm: 25.8
  }
]

export default function MatchesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [matches, setMatches] = useState<UserProfile[]>([])
  const [filteredMatches, setFilteredMatches] = useState<UserProfile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNationality, setSelectedNationality] = useState('すべて')
  const [selectedAge, setSelectedAge] = useState('すべて')
  const [isLoading, setIsLoading] = useState(true)

  // いいね残り回数
  const [likesRemaining, setLikesRemaining] = useState<number>(10)
  const [likesLimit] = useState<number>(10)

  // 🔍 DEBUG: 現在のユーザー情報を表示
  useEffect(() => {
    if (user) {
      console.log('🔍 Matches Page: Current user info:', {
        id: user.id,
        firstName: user.firstName,
        nationality: user.nationality,
        gender: (user as any).gender
      })
    }
  }, [user])

  // 残りいいね数を取得
  const fetchLikesRemaining = async () => {
    try {
      const response = await fetch('/api/likes/remaining')
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
      // 認証読み込み中は待機
      if (authLoading) {
        console.log('⏳ Matches: Waiting for auth...')
        return
      }

      try {
        setIsLoading(true)

        // クエリパラメータの作成
        const params = new URLSearchParams()
        if (searchTerm) params.append('search', searchTerm)
        if (selectedNationality !== 'すべて') params.append('nationality', selectedNationality)
        if (selectedAge !== 'すべて') params.append('age', selectedAge)

        // 🚀 CRITICAL: 現在のユーザーIDをAPIに渡す
        if (user?.id) {
          params.append('currentUserId', user.id)
          console.log('🎯 Matches: Sending currentUserId to API:', user.id)
        } else {
          console.log('⚠️ Matches: No user ID available')
        }

        // 開発テストモードの確認
        const urlParams = new URLSearchParams(window.location.search)
        const devTestFlag = urlParams.get('devTest') === 'true' || localStorage.getItem('devTestMode') === 'true'

        if (devTestFlag) {
          params.append('devTest', 'true')
          console.log('🧪 Adding devTest parameter to matches API request')
        }

        const response = await fetch(`/api/matches?${params.toString()}`)
        const result = await response.json()

        console.log('📊 Matches API response:', {
          ok: response.ok,
          matchCount: result.matches?.length || 0,
          dataSource: result.dataSource,
          error: result.error
        })

        if (response.ok && result.matches && result.matches.length > 0) {
          setMatches(result.matches)
          console.log('✅ Matches loaded from Supabase:', result.matches.length, 'candidates')
        } else if (response.ok && (!result.matches || result.matches.length === 0)) {
          // Supabaseに該当ユーザーがいない場合は空配列を設定
          console.log('📭 No matching users found in database')
          setMatches([])
        } else {
          console.error('Failed to fetch matches:', result.error)
          // フォールバックとしてサンプルデータを使用
          setMatches(SAMPLE_MATCHES)
        }
      } catch (error) {
        console.error('Error fetching matches:', error)
        // エラー時はサンプルデータを使用
        setMatches(SAMPLE_MATCHES)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMatches()
  }, [searchTerm, selectedNationality, selectedAge, user?.id, authLoading])

  // フィルタリング処理（APIベース）
  useEffect(() => {
    setFilteredMatches(matches)
    // ✅ SEARCH CARD COMPONENT ACTIVE
    if (matches.length > 0) {
      console.log('✅ SEARCH CARD COMPONENT ACTIVE - matches loaded:', matches.length)
      console.log('✅ BIO CLAMP APPLIED: line-clamp-2')
      console.log('✅ IMAGE CONTAIN APPLIED: object-contain')
      console.log('✅ COUNTRY POSITION MOVED: near name-age')
    }
  }, [matches])

  const formatLastSeen = (lastSeenString: string) => {
    const lastSeen = new Date(lastSeenString)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60))
    
    if (diffMinutes < 60) {
      return `${diffMinutes}分前にオンライン`
    } else if (diffMinutes < 24 * 60) {
      return `${Math.floor(diffMinutes / 60)}時間前にオンライン`
    } else {
      return `${Math.floor(diffMinutes / (24 * 60))}日前にオンライン`
    }
  }

  const handleLike = async (userId: string) => {
    // 残り回数チェック（フロント側でも事前チェック）
    if (likesRemaining <= 0) {
      alert('本日のいいね上限（10回）に達しました。明日またお試しください。')
      return
    }

    try {
      // /api/likes を叩く（方針C: ゲートAPI）
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          likedUserId: userId,
          action: 'like'
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // 成功時にユーザーを一覧から削除
        setFilteredMatches(prev => prev.filter(user => user.id !== userId))
        setMatches(prev => prev.filter(user => user.id !== userId))

        // 残り回数を更新
        if (typeof result.remaining === 'number') {
          setLikesRemaining(result.remaining)
        } else {
          // APIが残り回数を返さない場合はローカルでデクリメント
          setLikesRemaining(prev => Math.max(0, prev - 1))
        }

        // マッチした場合の通知
        if (result.matched) {
          alert('🎉 マッチしました！メッセージを送ってみましょう。')
        } else {
          console.log('いいねしました')
        }
      } else if (response.status === 429) {
        // 429: 1日の上限に達した
        setLikesRemaining(0)
        alert('本日のいいね上限（10回）に達しました。明日またお試しください。')
      } else {
        console.error('Failed to like user:', result.error)
        alert(result.error || 'いいねの送信に失敗しました。もう一度お試しください。')
      }
    } catch (error) {
      console.error('Error liking user:', error)
      alert('エラーが発生しました。もう一度お試しください。')
    }
  }

  const handlePass = async (userId: string) => {
    try {
      // /api/likes を叩く（passはカウント対象外）
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          likedUserId: userId,
          action: 'pass'
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // 成功時にユーザーを一覧から削除
        setFilteredMatches(prev => prev.filter(user => user.id !== userId))
        setMatches(prev => prev.filter(user => user.id !== userId))
        console.log('パスしました')
      } else {
        console.error('Failed to pass user:', result.error)
        alert(result.error || 'パス処理に失敗しました。もう一度お試しください。')
      }
    } catch (error) {
      console.error('Error passing user:', error)
      alert('エラーが発生しました。もう一度お試しください。')
    }
  }

  const content = (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      {/* Sidebar */}
      <Sidebar className="w-64 hidden md:block" />
      
      <div className="md:ml-64 py-8 px-4">
        <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">おすすめのお相手</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            あなたにぴったりのお相手を見つけて、素敵な文化体験を一緒に楽しみませんか？
          </p>
          {/* 残りいいね数表示 */}
          <div className="mt-4 inline-flex items-center bg-white rounded-full px-4 py-2 shadow-md">
            <Heart className={`w-5 h-5 mr-2 ${likesRemaining > 0 ? 'text-sakura-500' : 'text-gray-400'}`} />
            <span className="text-gray-700">
              本日の残りいいね: <span className={`font-bold ${likesRemaining > 0 ? 'text-sakura-600' : 'text-gray-500'}`}>{likesRemaining}</span> / {likesLimit}
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
                placeholder="名前、趣味で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 国籍選択 */}
            <Select value={selectedNationality} onValueChange={setSelectedNationality}>
              <SelectTrigger>
                <SelectValue placeholder="国籍を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="すべて">すべて</SelectItem>
                <SelectItem value="アメリカ">アメリカ</SelectItem>
                <SelectItem value="カナダ">カナダ</SelectItem>
                <SelectItem value="イギリス">イギリス</SelectItem>
                <SelectItem value="韓国">韓国</SelectItem>
                <SelectItem value="中国">中国</SelectItem>
              </SelectContent>
            </Select>

            {/* 年齢選択 */}
            <Select value={selectedAge} onValueChange={setSelectedAge}>
              <SelectTrigger>
                <SelectValue placeholder="年齢を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="すべて">すべて</SelectItem>
                <SelectItem value="18-25">18-25歳</SelectItem>
                <SelectItem value="26-30">26-30歳</SelectItem>
                <SelectItem value="31-35">31-35歳</SelectItem>
                <SelectItem value="36">36歳以上</SelectItem>
              </SelectContent>
            </Select>

            {/* リセットボタン */}
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('')
                setSelectedNationality('すべて')
                setSelectedAge('すべて')
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              リセット
            </Button>
          </div>
        </div>

        {/* 結果カウント */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredMatches.length} 人のお相手が見つかりました
          </p>
        </div>

        {/* マッチ一覧 */}
        {/* ✅ SEARCH CARD COMPONENT ACTIVE */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMatches.map((user) => {
            // 日本人判定（外国人男性の場合は国名、日本人女性の場合は都道府県を表示）
            const isJapanese = !user.nationality ||
              user.nationality === '' ||
              user.nationality.toLowerCase() === 'jp' ||
              user.nationality.toLowerCase() === 'japan' ||
              user.nationality === '日本' ||
              user.nationality.toLowerCase() === 'japanese'

            // 表示する地域情報（外国人男性→国名、日本人女性→都道府県）
            const locationLabel = isJapanese
              ? user.prefecture
              : (user.nationalityLabel || user.nationality)

            return (
            <div key={user.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 relative" data-card-version="SEARCHCARD_V2">
              {/* 🔴 UI_PATCH バージョン表示（検証用・後で削除） */}
              <div className="absolute bottom-2 right-2 z-10 text-[10px] text-gray-400 bg-white/80 px-1 rounded">
                UI_PATCH: SEARCHCARD_V2
              </div>

              {/* プロフィール画像エリア - 修正②: 写真全体表示 (object-contain) */}
              <div className="relative h-56 bg-gray-50" data-fix="image-container">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={`${user.firstName}のプロフィール画像`}
                    className="w-full h-full object-contain"
                    data-fix="object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sakura-100 to-sakura-200">
                    <User className="w-20 h-20 text-sakura-300" />
                  </div>
                )}

                {/* オンライン状態 */}
                {user.isOnline && (
                  <div className="absolute top-3 left-3">
                    <div className="flex items-center bg-green-500 text-white px-2 py-1 rounded-full text-xs shadow">
                      <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                      オンライン
                    </div>
                  </div>
                )}
              </div>

              {/* プロフィール情報 */}
              <div className="p-5">
                {/* 修正③: 名前・年齢・国/都道府県を一行に（国は画像右上から移動） */}
                <div className="flex items-center flex-wrap gap-2 mb-2" data-fix="name-location-row">
                  <h3 className="text-xl font-bold text-gray-900">
                    {user.firstName}
                  </h3>
                  <span className="text-lg text-gray-700">{user.age}歳</span>
                  {locationLabel && (
                    <span className="flex items-center text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full" data-fix="location-badge">
                      {isJapanese ? (
                        <MapPin className="w-3 h-3 mr-1" />
                      ) : (
                        <Globe className="w-3 h-3 mr-1" />
                      )}
                      {locationLabel}
                    </span>
                  )}
                </div>

                {/* 最終ログイン */}
                <p className="text-xs text-gray-500 mb-3">
                  {user.isOnline ? (
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      オンライン中
                    </span>
                  ) : formatLastSeen(user.lastSeen)}
                </p>

                {/* 修正①: 自己紹介の短縮表示 (line-clamp-2で2行まで) */}
                {user.selfIntroduction && (
                  <p className="text-gray-600 text-sm mb-3 leading-relaxed line-clamp-2" data-fix="bio-clamp">
                    {user.selfIntroduction}
                  </p>
                )}

                {/* 趣味タグ（コンパクト表示） */}
                {user.hobbies && user.hobbies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {user.hobbies.slice(0, 3).map((hobby, index) => (
                      <span
                        key={index}
                        className="bg-sakura-50 text-sakura-700 px-2 py-0.5 rounded-full text-xs"
                      >
                        {hobby}
                      </span>
                    ))}
                    {user.hobbies.length > 3 && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                        +{user.hobbies.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* アクションボタン */}
                <div className="flex gap-2">
                  <Link href={`/profile/${user.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <User className="w-4 h-4 mr-1" />
                      プロフィール
                    </Button>
                  </Link>
                  <Button
                    variant="sakura"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleLike(user.id)}
                    disabled={likesRemaining <= 0}
                    title={likesRemaining <= 0 ? '本日のいいね上限に達しました' : ''}
                  >
                    <Heart className="w-4 h-4 mr-1" />
                    {likesRemaining <= 0 ? '上限' : 'いいね'}
                  </Button>
                </div>
              </div>
            </div>
            )
          })}
        </div>

        {/* 結果が0件の場合 */}
        {filteredMatches.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Coffee className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              条件に合うお相手が見つかりませんでした
            </h3>
            <p className="text-gray-600 mb-4">
              検索条件を変更するか、新しいお相手をお待ちください
            </p>
            <Button 
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setSelectedNationality('すべて')
                setSelectedAge('すべて')
              }}
            >
              条件をリセット
            </Button>
          </div>
        )}

        {/* 新しいマッチを探すボタン */}
        <div className="text-center mt-12">
          <Button 
            variant="sakura" 
            size="lg"
            onClick={() => {
              // フィルターをリセットして新しいマッチを取得
              setSearchTerm('')
              setSelectedNationality('すべて')
              setSelectedAge('すべて')
              // useEffectが再実行されて新しいデータを取得
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                新しいお相手を探しています...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                もっと新しいお相手を探す
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