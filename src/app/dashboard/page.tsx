'use client'

import { useState } from 'react'
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

function DashboardContent() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('matches')

  const mockMatches = [
    {
      id: 1,
      name: 'Michael',
      age: 29,
      location: 'アメリカ',
      image: '/api/placeholder/400/500',
      isOnline: true,
      lastActive: '24時間以内',
      bio: 'こんにちは！アメリカから来たMichaelです🇺🇸 日本の文化が大好きで、特に茶道と書道に興味があります。日本語を勉強中で、お互いの言語を教え合いながら素敵な時間を過ごせたらと思います😊',
      interests: ['茶道', '書道', '日本語学習']
    },
    {
      id: 2,
      name: 'David',
      age: 32,
      location: 'イギリス',
      image: '/api/placeholder/400/500',
      isOnline: false,
      lastActive: '1時間以内',
      bio: 'Hello! イギリス出身のDavidです🇬🇧 日本の料理と文化に魅了されています。和食作りを学びたいと思っています。一緒に日本の素晴らしい文化を体験しませんか？',
      interests: ['和食料理', '日本酒', '旅行']
    },
    {
      id: 3,
      name: 'Marco',
      age: 26,
      location: 'イタリア',
      image: '/api/placeholder/400/500',
      isOnline: true,
      lastActive: '30分以内',
      bio: 'Ciao! イタリアから来ましたMarcoです🇮🇹 日本のアートと伝統工芸に深い関心があります。華道や陶芸を学びながら、日本の心を理解したいです。文化交流を通じて素敵な出会いがあれば嬉しいです✨',
      interests: ['華道', '陶芸', '美術']
    }
  ]

  const sidebarItems = [
    { id: 'search', icon: Search, label: '検索', isPage: false, href: undefined },
    { id: 'messages', icon: MessageCircle, label: 'メッセージ', isPage: false, href: undefined },
    { id: 'liked', icon: Heart, label: 'お相手から', isPage: false, href: undefined },
    { id: 'footprints', icon: History, label: '足跡', isPage: false, href: undefined },
    { id: 'experiences', icon: Calendar, label: '文化体験', isPage: true, href: '/experiences' },
    { id: 'profile', icon: User, label: 'マイページ', isPage: false, href: undefined },
  ]

  const renderMainContent = () => {
    if (activeSection === 'matches') {
      return (
        <div className="space-y-6">
          {mockMatches.map((match) => (
            <div key={match.id} className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-md mx-auto">
              {/* Profile Image */}
              <div className="relative h-80 bg-gradient-to-br from-sakura-100 to-sakura-200 flex items-center justify-center">
                <Users className="w-24 h-24 text-sakura-400" />
                {match.isOnline && (
                  <div className="absolute top-4 left-4 flex items-center bg-green-500 text-white px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                    {match.lastActive}
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="p-6">
                <div className="flex items-center mb-3">
                  <h3 className="text-2xl font-bold text-gray-900 mr-3">{match.name}</h3>
                  <span className="text-xl text-gray-600">{match.age}歳</span>
                </div>

                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{match.location}</span>
                </div>

                <p className="text-gray-700 mb-4 leading-relaxed">
                  {match.bio}
                </p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {match.interests.map((interest, index) => (
                    <span key={index} className="px-3 py-1 bg-sakura-100 text-sakura-700 text-sm rounded-full">
                      {interest}
                    </span>
                  ))}
                </div>

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
        <div className="hidden md:block w-64 bg-white shadow-sm min-h-screen">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-sakura-400 to-sakura-600 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold sakura-text-gradient">Sakura Club</h1>
            </div>

            <nav className="space-y-2">
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
        <div className="flex-1">
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
                <Link href="/mypage">
                  <Button variant="outline" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    マイページ
                  </Button>
                </Link>
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
  return (
    <ErrorBoundary>
      <AuthGuard>
        <DashboardContent />
      </AuthGuard>
    </ErrorBoundary>
  )
}