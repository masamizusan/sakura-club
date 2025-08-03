'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import AuthGuard from '@/components/auth/AuthGuard'
import { useAuth } from '@/store/authStore'
import { 
  Heart, 
  Users, 
  Calendar, 
  MessageCircle, 
  Settings, 
  Bell,
  Search,
  Filter,
  MapPin,
  Star,
  Clock,
  CheckCircle2
} from 'lucide-react'

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('matches')
  const { user } = useAuth()

  const mockMatches = [
    {
      id: 1,
      name: 'Emily Johnson',
      age: 28,
      nationality: 'アメリカ',
      image: '/api/placeholder/150/150',
      interests: ['茶道', '書道', '料理'],
      location: '東京都渋谷区',
      lastActive: '2時間前',
      matchScore: 95
    },
    {
      id: 2,
      name: 'David Smith',
      age: 32,
      nationality: 'イギリス',
      image: '/api/placeholder/150/150',
      interests: ['華道', '陶芸', '写真'],
      location: '東京都新宿区',
      lastActive: '1日前',
      matchScore: 87
    },
    {
      id: 3,
      name: 'Marco Rodriguez',
      age: 29,
      nationality: 'スペイン',
      image: '/api/placeholder/150/150',
      interests: ['料理', '音楽', '旅行'],
      location: '東京都港区',
      lastActive: '3時間前',
      matchScore: 92
    }
  ]

  const mockExperiences = [
    {
      id: 1,
      title: '茶道体験 - 表千家',
      date: '2024年2月15日',
      time: '14:00-16:00',
      location: '東京都中央区',
      participants: 4,
      maxParticipants: 6,
      price: '無料',
      status: 'upcoming'
    },
    {
      id: 2,
      title: '書道入門クラス',
      date: '2024年2月18日',
      time: '10:00-12:00',
      location: '東京都台東区',
      participants: 2,
      maxParticipants: 4,
      price: '無料',
      status: 'available'
    },
    {
      id: 3,
      title: '和食料理教室',
      date: '2024年2月20日',
      time: '18:00-21:00',
      location: '東京都世田谷区',
      participants: 6,
      maxParticipants: 6,
      price: '無料',
      status: 'full'
    }
  ]

  const mockMessages = [
    {
      id: 1,
      name: 'Emily Johnson',
      lastMessage: '茶道体験、一緒に参加しませんか？',
      time: '10分前',
      unread: true,
      avatar: '/api/placeholder/50/50'
    },
    {
      id: 2,
      name: 'David Smith',
      lastMessage: 'ありがとうございました！とても楽しかったです。',
      time: '2時間前',
      unread: false,
      avatar: '/api/placeholder/50/50'
    },
    {
      id: 3,
      name: 'Marco Rodriguez',
      lastMessage: '今度は料理教室に参加してみたいです。',
      time: '1日前',
      unread: true,
      avatar: '/api/placeholder/50/50'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                おかえりなさい、{user?.firstName || 'ゲスト'}さん
              </h1>
              <p className="text-gray-600">今日も素敵な文化体験を楽しみましょう</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                通知
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                設定
              </Button>
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-sakura-100 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-sakura-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">マッチ数</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">体験予定</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">完了体験</p>
                <p className="text-2xl font-bold text-gray-900">8</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">新着メッセージ</p>
                <p className="text-2xl font-bold text-gray-900">5</p>
              </div>
            </div>
          </div>
        </div>

        {/* クイックアクション */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <a href="/matches" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">マッチングを探す</h3>
                <p className="text-sm text-gray-600">新しいお相手を見つけましょう</p>
              </div>
              <div className="w-12 h-12 bg-sakura-100 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-sakura-600" />
              </div>
            </div>
          </a>

          <a href="/messages" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">メッセージ</h3>
                <p className="text-sm text-gray-600">会話を続けましょう</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </a>

          <a href="/experiences" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">文化体験</h3>
                <p className="text-sm text-gray-600">新しい体験を見つけましょう</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </a>

          <a href="/profile/edit" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">プロフィール編集</h3>
                <p className="text-sm text-gray-600">情報を更新しましょう</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Settings className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </a>
        </div>

        {/* タブナビゲーション */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'matches', label: 'マッチ', icon: Heart },
                { id: 'experiences', label: '文化体験', icon: Calendar },
                { id: 'messages', label: 'メッセージ', icon: MessageCircle }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-sakura-500 text-sakura-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* マッチタブ */}
            {activeTab === 'matches' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">おすすめのマッチ</h2>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      フィルター
                    </Button>
                    <Button variant="outline" size="sm">
                      <Search className="w-4 h-4 mr-2" />
                      検索
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockMatches.map((match) => (
                    <div key={match.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative">
                        <div className="w-full h-48 bg-gradient-to-br from-sakura-100 to-sakura-200 flex items-center justify-center">
                          <Users className="w-16 h-16 text-sakura-400" />
                        </div>
                        <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 text-xs font-medium">
                          <div className="flex items-center">
                            <Star className="w-3 h-3 text-yellow-400 mr-1" />
                            {match.matchScore}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{match.name}</h3>
                          <span className="text-sm text-gray-500">{match.age}歳</span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <MapPin className="w-3 h-3 mr-1" />
                          {match.nationality} • {match.location}
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-500 mb-3">
                          <Clock className="w-3 h-3 mr-1" />
                          {match.lastActive}
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mb-4">
                          {match.interests.map((interest, index) => (
                            <span key={index} className="px-2 py-1 bg-sakura-100 text-sakura-700 text-xs rounded-full">
                              {interest}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button variant="sakura" size="sm" className="flex-1">
                            マッチする
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            プロフィール
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 文化体験タブ */}
            {activeTab === 'experiences' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">文化体験</h2>
                  <Button variant="sakura" size="sm">
                    新しい体験を探す
                  </Button>
                </div>

                <div className="space-y-4">
                  {mockExperiences.map((experience) => (
                    <div key={experience.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{experience.title}</h3>
                          <div className="flex items-center text-sm text-gray-600 space-x-4">
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {experience.date}
                            </span>
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {experience.time}
                            </span>
                            <span className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {experience.location}
                            </span>
                          </div>
                          <div className="flex items-center mt-2 text-sm">
                            <Users className="w-3 h-3 mr-1 text-gray-400" />
                            <span className="text-gray-600">
                              {experience.participants}/{experience.maxParticipants}名参加
                            </span>
                            <span className="ml-4 font-medium text-green-600">
                              {experience.price}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {experience.status === 'upcoming' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              参加予定
                            </span>
                          )}
                          {experience.status === 'available' && (
                            <Button variant="sakura" size="sm">
                              参加する
                            </Button>
                          )}
                          {experience.status === 'full' && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              満員
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* メッセージタブ */}
            {activeTab === 'messages' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">メッセージ</h2>
                  <Button variant="outline" size="sm">
                    <Search className="w-4 h-4 mr-2" />
                    検索
                  </Button>
                </div>

                <div className="space-y-2">
                  {mockMessages.map((message) => (
                    <div key={message.id} className={`flex items-center p-4 rounded-lg hover:bg-gray-50 cursor-pointer ${
                      message.unread ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}>
                      <div className="w-12 h-12 bg-gradient-to-br from-sakura-100 to-sakura-200 rounded-full flex items-center justify-center mr-4">
                        <Users className="w-6 h-6 text-sakura-400" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-medium ${message.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                            {message.name}
                          </h3>
                          <span className="text-xs text-gray-500">{message.time}</span>
                        </div>
                        <p className={`text-sm ${message.unread ? 'text-gray-700' : 'text-gray-500'}`}>
                          {message.lastMessage}
                        </p>
                      </div>
                      
                      {message.unread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full ml-2" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}