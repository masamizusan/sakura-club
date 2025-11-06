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
  nationality: string
  nationalityLabel: string
  prefecture: string
  city: string
  hobbies: string[]
  selfIntroduction: string
  profileImage?: string
  lastSeen: string
  isOnline: boolean
}

function DashboardContent() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('matches')
  const [matches, setMatches] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // データ取得
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setIsLoading(true)
        
        // 開発テストモードの確認
        const urlParams = new URLSearchParams(window.location.search)
        const devTestFlag = urlParams.get('devTest') === 'true' || localStorage.getItem('devTestMode') === 'true'
        
        const params = new URLSearchParams()
        if (devTestFlag) {
          params.append('devTest', 'true')
          console.log('🧪 Dashboard: Adding devTest parameter to matches API request')
        }
        
        const response = await fetch(`/api/matches?${params.toString()}`)
        const result = await response.json()

        if (response.ok) {
          setMatches(result.matches || [])
          console.log('📊 Dashboard matches loaded:', result.matches?.length || 0, 'candidates')
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
  }, [])

  const sidebarItems = [
    { id: 'search', icon: Search, label: 'さがす', isPage: false, href: undefined },
    { id: 'messages', icon: MessageCircle, label: 'メッセージ', isPage: false, href: undefined },
    { id: 'liked', icon: Heart, label: 'お相手から', isPage: false, href: undefined },
    { id: 'footprints', icon: History, label: '足跡', isPage: false, href: undefined },
    { id: 'profile', icon: User, label: 'マイページ', isPage: true, href: '/mypage' },
  ]

  const renderMainContent = () => {
    if (activeSection === 'matches') {
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

      return (
        <div className="space-y-6">
          {matches.map((match) => (
            <div key={match.id} className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-md mx-auto">
              {/* Profile Image */}
              <div className="relative h-80 bg-gradient-to-br from-sakura-100 to-sakura-200 flex items-center justify-center">
                <Users className="w-24 h-24 text-sakura-400" />
                {match.isOnline && (
                  <div className="absolute top-4 left-4 flex items-center bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                    オンライン中
                  </div>
                )}
                
                {/* 国籍バッジ */}
                <div className="absolute top-4 right-4">
                  <div className="bg-white/90 px-2 py-1 rounded-full text-xs">
                    {match.nationalityLabel}
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="p-6">
                <div className="flex items-center mb-3">
                  <h3 className="text-2xl font-bold text-gray-900 mr-3">
                    {match.firstName} {match.lastName}
                  </h3>
                  <span className="text-xl text-gray-600">{match.age}歳</span>
                </div>

                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{match.prefecture} {match.city}</span>
                </div>

                <p className="text-gray-700 mb-4 leading-relaxed">
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
          ))}
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>この機能は準備中です</p>
      </div>
    )
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