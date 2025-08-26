'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import AuthGuard from '@/components/auth/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
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
  History,
  LogOut
} from 'lucide-react'

function MyPageContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [completedItems, setCompletedItems] = useState(0)
  const [totalItems, setTotalItems] = useState(8)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      console.log('MyPage loadProfile called, user:', !!user, user?.id)
      
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        console.log('Profile data loaded:', !!profileData, error?.message)

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
    // プロフィール編集ページと同じロジックを使用
    const requiredFields = [
      'nickname', 'gender', 'age', 
      'prefecture', 'hobbies', 'self_introduction'
    ]
    
    // 外国人男性の場合は国籍も必須（今回は日本人女性なので追加しない）
    // if (isForeignMale) {
    //   requiredFields.push('nationality')
    // }
    
    const optionalFields = [
      'avatar_url', 'occupation', 'height', 'body_type', 'marital_status', 
      'personality', 'city'
    ]
    
    const completedRequired = requiredFields.filter(field => {
      let value
      
      // Map form field names to profile data field names
      switch (field) {
        case 'nickname':
          value = profileData.name || profileData.nickname
          break
        case 'self_introduction':
          value = profileData.bio || profileData.self_introduction
          break
        case 'hobbies':
          value = profileData.interests || profileData.hobbies
          // custom_cultureも日本文化の一部として含める
          const hasCustomCulture = profileData.custom_culture && profileData.custom_culture.trim().length > 0
          if (Array.isArray(value) && value.length > 0) {
            // 既に選択された趣味があるので完成とみなす
          } else if (hasCustomCulture) {
            // 選択された趣味はないが、カスタム文化があれば完成とみなす
            value = ['custom']
          }
          break
        case 'prefecture':
          value = profileData.residence || profileData.prefecture
          break
        default:
          value = profileData[field]
      }
      
      if (Array.isArray(value)) return value.length > 0
      return value && value.toString().trim().length > 0
    })
    
    const completedOptional = optionalFields.filter(field => {
      let value = profileData[field]
      
      // avatar_urlの場合は特別処理
      if (field === 'avatar_url') {
        return value && value !== null
      }
      
      // 'none'は未入力として扱う
      if (value === 'none' || !value) return false
      if (Array.isArray(value)) return value.length > 0
      return value.toString().trim().length > 0
    })
    
    const totalRequiredItems = requiredFields.length + optionalFields.length
    const completedItems = completedRequired.length + completedOptional.length
    
    console.log('Profile completion calculation:', {
      requiredFields,
      optionalFields,
      completedRequired: completedRequired.map(field => ({ field, mapped: field === 'nickname' ? 'name' : field === 'prefecture' ? 'residence' : field === 'hobbies' ? 'interests' : field === 'self_introduction' ? 'bio' : field })),
      completedOptional: completedOptional.map(field => ({ field, value: field === 'avatar_url' ? !!profileData[field] : profileData[field] })),
      totalRequiredItems,
      completedItems,
      completion: Math.round((completedItems / totalRequiredItems) * 100) + '%',
      profileData
    })
    
    const completion = Math.round((completedItems / totalRequiredItems) * 100)
    setProfileCompletion(completion)
    setCompletedItems(completedItems)
    setTotalItems(totalRequiredItems)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout() // Zustand storeのlogout関数を使用（内部でauthService.signOutを呼ぶ）
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
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
      {/* Sidebar */}
      <Sidebar className="w-64 hidden md:block" />
      
      {/* Header */}
      <div className="bg-white shadow-sm md:ml-64">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">マイページ</h1>
          </div>
        </div>
      </div>

      <div className="md:ml-64 px-4 py-6">
        <div className="max-w-2xl mx-auto">
        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center mb-6">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="プロフィール写真"
                  className="w-20 h-20 rounded-full object-cover border-2 border-sakura-200"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-sakura-100 to-sakura-200 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-sakura-500" />
                </div>
              )}
            </div>
            <div className="ml-4 flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {profile?.name || profile?.first_name || 'ユーザー'}さん
              </h2>
              <p className="text-gray-600">
                {profile?.age || '未設定'}歳 • {profile?.residence || profile?.prefecture || '未設定'}
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
              {totalItems > 0 ? `${completedItems}/${totalItems}項目入力済み` : '計算中...'}
            </p>
          </div>

          <Link href="/profile/edit">
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              <Edit3 className="w-4 h-4 mr-2" />
              プロフィールを編集する
            </Button>
          </Link>
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

          {/* ログアウト */}
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full bg-white rounded-lg shadow-lg p-4 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-left">
                    {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
                  </h3>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
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