'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import AuthGuard from '@/components/auth/AuthGuard'
import { useAuth } from '@/store/authStore'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { 
  User, 
  Edit3,
  Heart,
  Star,
  Gift,
  Shield,
  Settings,
  CreditCard,
  Users,
  ArrowLeft,
  Check,
  X,
  History
} from 'lucide-react'

function MyPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return

      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          calculateProfileCompletion(profileData)
        }
      } catch (error) {
        console.error('Profile load error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [user, supabase])

  const calculateProfileCompletion = (profileData: any) => {
    const requiredFields = [
      'first_name',
      'last_name', 
      'gender',
      'age',
      'nationality',
      'prefecture',
      'city',
      'hobbies',
      'self_introduction'
    ]
    
    const completedFields = requiredFields.filter(field => {
      const value = profileData[field]
      if (Array.isArray(value)) return value.length > 0
      return value && value.toString().trim().length > 0
    })

    const completion = Math.round((completedFields.length / requiredFields.length) * 100)
    setProfileCompletion(completion)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-sakura-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">読み込んでいます...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">マイページ</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-sakura-100 to-sakura-200 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-sakura-500" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {profile?.first_name || 'ユーザー'}さん
              </h2>
              <p className="text-gray-600">
                {profile?.age || '未設定'}歳 • {profile?.prefecture || '未設定'}
              </p>
            </div>
          </div>

          {/* Profile Completion */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">プロフィール完成度</span>
              <span className="text-lg font-bold text-orange-500">{profileCompletion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${profileCompletion}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.ceil((100 - profileCompletion) / 11)}項目入力済み
            </p>
          </div>

          <Link href="/profile/edit">
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              <Edit3 className="w-4 h-4 mr-2" />
              プロフィールを編集する
            </Button>
          </Link>
        </div>

        {/* Appeal Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">つぶやきでお相手にアピールしよう！</h3>
          <Button className="w-full bg-brown-500 hover:bg-brown-600 text-white">
            <Heart className="w-4 h-4 mr-2" />
            新しくつぶやく
          </Button>
        </div>

        {/* Stats Section */}
        <div className="space-y-4 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Heart className="w-5 h-5 text-pink-500 mr-3" />
                <span className="font-medium text-gray-900">残りいいね数</span>
              </div>
              <div className="flex items-center">
                <Heart className="w-4 h-4 text-pink-500 mr-1" />
                <span className="font-bold text-gray-900">10</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Gift className="w-5 h-5 text-yellow-500 mr-3" />
                <span className="font-medium text-gray-900">SCポイント</span>
              </div>
              <div className="flex items-center">
                <Gift className="w-4 h-4 text-yellow-500 mr-1" />
                <span className="font-bold text-gray-900">0pt</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-blue-500 mr-3" />
                <span className="font-medium text-gray-900">本人年齢確認</span>
              </div>
              <span className="text-red-500 font-medium">未承認</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-green-500 mr-3" />
                <span className="font-medium text-gray-900">会員ステータス</span>
              </div>
              <span className="text-red-500 font-medium">無料会員</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <CreditCard className="w-5 h-5 text-purple-500 mr-3" />
                <span className="font-medium text-gray-900">プラン変更</span>
              </div>
              <Button className="bg-brown-500 hover:bg-brown-600 text-white px-4 py-1 text-sm">
                <Star className="w-3 h-3 mr-1" />
                料金プランを見る
              </Button>
            </div>
          </div>
        </div>

        {/* Additional Features */}
        <div className="space-y-4">
          {/* 足跡 */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-brown-100 rounded-full flex items-center justify-center mr-3">
                  <History className="w-5 h-5 text-brown-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">足跡</h3>
                  <p className="text-sm text-gray-600">あなたに興味のあるお相手を確認</p>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* お気に入り */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">お気に入り</h3>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* プライベートアルバム */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">プライベートアルバム</h3>
                  <p className="text-sm text-gray-600">リクエストや公開しているお相手を確認</p>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* お知らせ */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <div className="relative">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">9</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">お知らせ</h3>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* 通知・設定 */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">通知・設定</h3>
                  <p className="text-sm text-gray-600">メール通知設定、パスワードの変更など</p>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* お問い合わせ・改善要望 */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">お問い合わせ・改善要望</h3>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* よくある質問 */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">よくある質問</h3>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Dock */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-4">
          <div className="grid grid-cols-4 gap-4">
            <Link href="/dashboard" className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 hover:bg-gray-200 transition-colors">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="text-xs text-gray-700">さがす</span>
            </Link>
            <Link href="/messages" className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 hover:bg-gray-200 transition-colors">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-xs text-gray-700">メッセージ</span>
            </Link>
            <Link href="/matches" className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 hover:bg-gray-200 transition-colors">
                <Heart className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-xs text-gray-700">お相手から</span>
            </Link>
            <div className="text-center">
              <div className="w-12 h-12 bg-sakura-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="w-6 h-6 text-sakura-600" />
              </div>
              <span className="text-xs text-sakura-700 font-semibold">マイページ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyPage() {
  return (
    <AuthGuard>
      <MyPageContent />
    </AuthGuard>
  )
}