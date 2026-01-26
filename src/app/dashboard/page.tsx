'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AuthGuard from '@/components/auth/AuthGuard'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuth } from '@/store/authStore'
import Link from 'next/link'
import {
  Heart,
  Users,
  MessageCircle,
  Search,
  MapPin,
  Globe,
  Star,
  Clock,
  User,
  History,
  Settings,
  Calendar
} from 'lucide-react'

// ユーザープロフィールの型定義
interface UserProfile {
  id: string
  firstName: string
  lastName: string
  age: number
  gender?: string
  nationality: string
  nationalityLabel: string
  residence?: string
  prefecture: string
  city: string
  occupation?: string
  height?: string
  bodyType?: string
  maritalStatus?: string
  hobbies: string[]
  selfIntroduction: string
  profileImage?: string
  lastSeen: string
  isOnline: boolean
}

function DashboardContent() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('search')
  const [matches, setMatches] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // データ取得（キャッシュ禁止・最新データ取得）
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setIsLoading(true)
        const fetchStartTime = new Date().toISOString()

        // 開発テストモードの確認
        const urlParams = new URLSearchParams(window.location.search)
        const devTestFlag = urlParams.get('devTest') === 'true' || localStorage.getItem('devTestMode') === 'true'

        const params = new URLSearchParams()
        if (devTestFlag) {
          params.append('devTest', 'true')
          console.log('🧪 Dashboard: Adding devTest parameter to matches API request')
        }

        // ユーザー情報をAPIに送信（マッチングフィルタリング用）
        if (user?.id) {
          params.append('currentUserId', user.id)
        }

        // 🚀 キャッシュバスター（CDN/ブラウザキャッシュ回避）
        params.append('_t', Date.now().toString())

        console.log('🔍 Dashboard: Current user info:', {
          userId: user?.id,
          userNationality: user?.nationality,
          userGender: (user as any)?.gender
        })

        // ✅ CACHE MODE: no-store（キャッシュ完全禁止）
        console.log('✅ CACHE MODE: no-store, revalidate=0')
        const response = await fetch(`/api/matches?${params.toString()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        const result = await response.json()

        if (response.ok) {
          setMatches(result.matches || [])

          // ✅ DASHBOARD SEARCH FETCH ログ
          console.log('✅ DASHBOARD SEARCH FETCH:', {
            fetched_at: fetchStartTime,
            api_fetched_at: result.fetchedAt,
            matchCount: result.matches?.length || 0,
            dataSource: result.dataSource
          })

          // ✅ PROFILE UPDATED_AT ログ（各プロフィールの更新時刻）
          result.matches?.forEach((m: any) => {
            console.log('✅ PROFILE UPDATED_AT:', {
              userId: m.id,
              name: m.firstName,
              updated_at: m.lastSeen,
              residence: m.residence
            })
          })
        } else {
          console.error('Failed to fetch dashboard matches:', result.error)
          setMatches([])
        }
      } catch (error) {
        console.error('Error fetching dashboard matches:', error)
        setMatches([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchMatches()
  }, [user?.id])

  const sidebarItems = [
    { id: 'search', icon: Search, label: 'さがす', isPage: false, href: undefined },
    { id: 'messages', icon: MessageCircle, label: 'メッセージ', isPage: false, href: undefined },
    { id: 'liked', icon: Heart, label: 'お相手から', isPage: false, href: undefined },
    { id: 'footprints', icon: History, label: '足跡', isPage: false, href: undefined },
    { id: 'profile', icon: User, label: 'マイページ', isPage: true, href: '/mypage' },
  ]

  const renderMainContent = () => {
    if (activeSection === 'search' || activeSection === 'matches') {
      if (isLoading) {
        return (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-sakura-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">お相手を探しています...</p>
            </div>
          </div>
        )
      }

      if (matches.length === 0) {
        return (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              まだお相手が見つかりませんでした
            </h3>
            <p className="text-gray-600 mb-4">
              プロフィールを充実させて、より多くの方と出会いましょう
            </p>
            <Link href="/mypage">
              <Button variant="sakura">
                プロフィールを編集
              </Button>
            </Link>
          </div>
        )
      }

      // ✅ DASHBOARD CARD COMPONENT ACTIVE
      console.log('✅ DASHBOARD CARD COMPONENT ACTIVE')
      console.log('✅ BIO CLAMP APPLIED: line-clamp-2')
      console.log('✅ IMAGE CONTAIN APPLIED: object-contain')
      console.log('✅ COUNTRY POSITION MOVED: near name-age')
      console.log('✅ LOCATION BADGE APPLIED: residence for japanese female')

      return (
        <div className="space-y-6">
          {matches.map((match) => {
            // 日本人女性判定（gender === 'female' をシンプルに採用）
            const isJapaneseFemale = match.gender === 'female'

            // city が JSON の場合の処理
            let cityValue = match.city || ''
            if (cityValue && typeof cityValue === 'string' && cityValue.startsWith('{')) {
              try {
                const cityObj = JSON.parse(cityValue)
                cityValue = cityObj.city || ''
              } catch (e) {
                // パース失敗時はそのまま使用
              }
            }

            // 表示する地域情報（SSOT確定版）
            // 日本人女性: residence → city の順でフォールバック
            // 外国人男性: nationalityLabel → nationality
            const locationLabel = isJapaneseFemale
              ? (match.residence || cityValue || '')
              : (match.nationalityLabel || match.nationality || '')

            // 📍 LOCATION BADGE CHECK（必須ログ）
            console.log('📍 LOCATION BADGE CHECK', {
              id: match.id,
              name: match.firstName,
              gender: match.gender,
              nationality: match.nationality,
              residence: match.residence,
              city: match.city,
              cityValue,
              locationLabel,
              isJapaneseFemale
            })

            return (
            <div key={match.id} className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-md mx-auto relative" data-card-version="SEARCHCARD_V2">
              {/* 🔴 UI_PATCH バージョン表示（検証用） */}
              <div className="absolute bottom-2 right-2 z-10 text-[10px] text-gray-400 bg-white/80 px-1 rounded">
                UI_PATCH: SEARCHCARD_V2
              </div>

              {/* Profile Image - 修正②: object-contain で全体表示 */}
              <div className="relative h-80 bg-gray-100 flex items-center justify-center" data-fix="image-container">
                {match.profileImage ? (
                  <img
                    src={match.profileImage}
                    alt={`${match.firstName} ${match.lastName}`}
                    className="w-full h-full object-contain"
                    data-fix="object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-sakura-100 to-sakura-200 flex items-center justify-center">
                    <Users className="w-24 h-24 text-sakura-400" />
                  </div>
                )}
                {match.isOnline && (
                  <div className="absolute top-4 left-4 flex items-center bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                    オンライン中
                  </div>
                )}
                {/* 修正③: 国籍バッジを画像右上から削除（名前横に移動） */}
              </div>

              {/* Profile Info */}
              <div className="p-6">
                {/* 修正③: 名前・年齢・国/都道府県を一行に */}
                <div className="flex items-center flex-wrap gap-2 mb-3" data-fix="name-location-row">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {match.firstName}
                  </h3>
                  <span className="text-xl text-gray-600">{match.age}歳</span>
                  {locationLabel && (
                    <span className="flex items-center text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full" data-fix="location-badge">
                      {isJapaneseFemale ? (
                        <MapPin className="w-3 h-3 mr-1" />
                      ) : (
                        <Globe className="w-3 h-3 mr-1" />
                      )}
                      {locationLabel}
                    </span>
                  )}
                </div>

                {/* プロフィール詳細情報 */}
                {(match.occupation || match.height || match.bodyType || match.maritalStatus) && (
                  <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    {match.occupation && (
                      <div className="bg-blue-50 px-2 py-1 rounded text-blue-700">
                        💼 {match.occupation}
                      </div>
                    )}
                    {match.height && (
                      <div className="bg-green-50 px-2 py-1 rounded text-green-700">
                        📏 {match.height}
                      </div>
                    )}
                    {match.bodyType && (
                      <div className="bg-purple-50 px-2 py-1 rounded text-purple-700">
                        💪 {match.bodyType}
                      </div>
                    )}
                    {match.maritalStatus && (
                      <div className="bg-orange-50 px-2 py-1 rounded text-orange-700">
                        💐 {match.maritalStatus}
                      </div>
                    )}
                  </div>
                )}

                {/* 修正①: 自己紹介 line-clamp-2 で2行まで */}
                <p className="text-gray-700 mb-4 leading-relaxed line-clamp-2" data-fix="bio-clamp">
                  {match.selfIntroduction}
                </p>

                {match.hobbies && match.hobbies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {match.hobbies.slice(0, 3).map((hobby, index) => (
                      <span key={index} className="px-3 py-1 bg-sakura-100 text-sakura-700 text-sm rounded-full">
                        {hobby}
                      </span>
                    ))}
                    {match.hobbies.length > 3 && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                        +{match.hobbies.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex space-x-3">
                  <Link href={`/profile/${match.id}`} className="flex-1">
                    <Button variant="outline" size="lg" className="w-full">
                      <User className="w-4 h-4 mr-2" />
                      プロフィール
                    </Button>
                  </Link>
                  <Button variant="sakura" size="lg" className="flex-1">
                    <Heart className="w-4 h-4 mr-2" />
                    いいね
                  </Button>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )
    }

    // その他のセクションの処理
    if (activeSection === 'messages') {
      return (
        <div className="text-center py-12">
          <MessageCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">メッセージ</h3>
          <p className="text-gray-600 mb-4">まだメッセージがありません</p>
          <Button variant="outline" onClick={() => setActiveSection('search')}>
            お相手を探す
          </Button>
        </div>
      )
    }

    if (activeSection === 'liked') {
      return (
        <div className="text-center py-12">
          <Heart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">お相手から</h3>
          <p className="text-gray-600 mb-4">まだいいねがありません</p>
          <Button variant="outline" onClick={() => setActiveSection('search')}>
            お相手を探す
          </Button>
        </div>
      )
    }

    if (activeSection === 'footprints') {
      return (
        <div className="text-center py-12">
          <History className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">足跡</h3>
          <p className="text-gray-600 mb-4">まだ足跡がありません</p>
          <Button variant="outline" onClick={() => setActiveSection('search')}>
            お相手を探す
          </Button>
        </div>
      )
    }

    // デフォルトは検索画面
    setActiveSection('search')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar - Desktop */}
        <div className="hidden md:block w-64 bg-white shadow-sm min-h-screen fixed left-0 top-0 z-50">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-sakura-400 to-sakura-600 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold sakura-text-gradient">Sakura Club</h1>
            </div>

            <nav className="space-y-2 sticky top-8">
              {sidebarItems.map((item) => {
                if (item.isPage && item.href) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors text-gray-600 hover:bg-gray-100"
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  )
                }
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeSection === item.id
                        ? 'bg-sakura-100 text-sakura-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 md:ml-64">
          {/* Header */}
          <div className="bg-white shadow-sm px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  おすすめのお相手
                </h2>
                <p className="text-gray-600">あなたにぴったりのお相手を見つけましょう</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="お相手を検索..."
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  設定
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {renderMainContent()}
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex">
          {sidebarItems.map((item) => {
            if (item.isPage && item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex-1 flex flex-col items-center py-3 text-xs text-gray-600"
                >
                  <item.icon className="w-5 h-5 mb-1" />
                  <span>{item.label}</span>
                </Link>
              )
            }
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex-1 flex flex-col items-center py-3 text-xs ${
                  activeSection === item.id
                    ? 'text-sakura-600'
                    : 'text-gray-600'
                }`}
              >
                <item.icon className="w-5 h-5 mb-1" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const content = (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  )

  return <AuthGuard>{content}</AuthGuard>
}