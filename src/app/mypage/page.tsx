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
  X
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

        {/* VIP Pass Section */}
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold mr-2">
              NEW
            </div>
            <span className="font-bold text-gray-900">VIP PASS</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2">
                <Heart className="w-6 h-6 text-pink-500" />
              </div>
              <span className="text-xs text-gray-700">さがす</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-xs text-gray-700">メッセージ</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2">
                <Heart className="w-6 h-6 text-red-500" />
              </div>
              <span className="text-xs text-gray-700">お相手から</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="w-6 h-6 text-brown-500" />
              </div>
              <span className="text-xs text-gray-700">マイページ</span>
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