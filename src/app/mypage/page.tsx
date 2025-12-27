'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  calculateProfileCompletion as calculateSharedProfileCompletion,
  normalizeProfile,
  calculateCompletion 
} from '@/utils/profileCompletion'
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
  LogOut,
  Calendar
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
      console.log('🆕 UNIFIED MyPage loadProfile called, user:', !!user, user?.id)
      
      // 🆕 CRITICAL: ユーザーが存在しない場合はAuthProviderに委譲（重複実行防止）
      if (!user || !user.id) {
        console.log('🧪 MyPage: No user found - waiting for AuthProvider initialization')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        
        // 🆕 SINGLE SOURCE OF TRUTH: Supabaseからid=auth.uidで統一（user_id null問題解消）
        console.log('🔄 Loading profile from Supabase with id=auth.uid:', user.id)
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id) // 🛡️ CRITICAL FIX: user_id -> id で統一（nullレコード回避）
          .maybeSingle() // 🛡️ CRITICAL FIX: single() -> maybeSingle() で406回避

        if (profileError) {
          console.error('❌ MyPage profiles取得エラー:', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          })
          setIsLoading(false)
          return
        }
        
        if (!profileData) {
          // maybeSingle()でnullが返された場合（プロフィール存在しない）
          console.log('📝 No profile found, creating empty profile for id=auth.uid:', user.id)
          const createPayload = { 
            id: user.id, // 🛡️ CRITICAL FIX: id=auth.uid で統一
            user_id: user.id, // 🔄 後方互換性のため両方設定
            name: user.email?.split('@')[0] || 'ユーザー',
            email: user.email
          }
          console.log('🔧 Profile作成payload:', createPayload)
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert(createPayload, { onConflict: 'id' }) // 🛡️ id で upsert
            .select('*')
            .single()
            
          if (createError) {
            console.error('❌ Failed to create profile:', {
              code: createError.code,
              message: createError.message,
              details: createError.details,
              hint: createError.hint
            })
            setIsLoading(false)
            return
          }
          
          profileData = newProfile
        }
        
        console.log('✅ Profile data loaded from Supabase:', {
          userId: user.id,
          hasProfile: !!profileData,
          profileFields: Object.keys(profileData || {}).length
        })
        
        // 🆕 CRITICAL: localStorage処理を完全削除し、Supabaseデータのみで完成度計算
        setProfile(profileData)
        calculateProfileCompletion(profileData)
        
      } catch (error) {
        console.error('❌ Error loading profile:', error)
        setProfile(null)
        setProfileCompletion(0)
        setCompletedItems(0)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProfile()
  }, [user, supabase])

  // 🆕 完成度計算関数（Supabaseデータのみ）
  const calculateProfileCompletion = (profileData: any) => {
    const isForeignMale = profileData?.gender === 'male' && profileData?.nationality && profileData?.nationality !== '日本'
    
    console.log('🏠 MyPage: Supabase完成度計算開始:', {
      userId: user?.id,
      hasProfileData: !!profileData,
      isForeignMale
    })
    
    // 正規化されたプロフィールデータを作成
    const normalized: any = {
      ...profileData,
      // hobbies/personalityフィールドマッピング
      hobbies: profileData?.culture_tags || profileData?.interests || [],
      personality: profileData?.personality_tags || profileData?.personality || []
    }
    
    // 🆕 Step A: missingFields確定用詳細ログ - 日本人女性専用15項目チェック
    if (!isForeignMale) {
      console.log('🔍 STEP A: 日本人女性15項目デバッグ開始')
      
      // 入力データスナップショット
      const inputSnapshot = {
        nickname: normalized.nickname,
        gender: normalized.gender,
        age: normalized.age,
        birth_date: normalized.birth_date,
        nationality: normalized.nationality,
        self_introduction: normalized.self_introduction,
        hobbies: normalized.hobbies,
        language_skills: normalized.language_skills,
        city: normalized.city,
        occupation: normalized.occupation,
        height: normalized.height,
        body_type: normalized.body_type,
        marital_status: normalized.marital_status,
        personality: normalized.personality,
        // 🔍 prefecture vs residence 確認用
        prefecture: normalized.prefecture,
        residence: normalized.residence,
        // 🔍 配列系フィールド詳細確認
        personality_tags: profileData?.personality_tags,
        culture_tags: profileData?.culture_tags,
        interests: profileData?.interests,
        // 🚨 日本人女性UIに無いはずのフィールド確認
        planned_prefectures: normalized.planned_prefectures,
        visit_schedule: normalized.visit_schedule,
        travel_companion: normalized.travel_companion
      }
      
      // 15項目個別チェック（calculateCompletion15Fieldsロジックを再現）
      const missingFields: string[] = []
      let filledCount = 0
      
      // 1. ニックネーム
      if (normalized.nickname && normalized.nickname.trim() !== '') {
        filledCount++
      } else {
        missingFields.push('nickname')
      }
      
      // 2. 性別
      if (normalized.gender && normalized.gender !== '') {
        filledCount++
      } else {
        missingFields.push('gender')
      }
      
      // 3. 年齢
      if (normalized.age && normalized.age > 0) {
        filledCount++
      } else {
        missingFields.push('age')
      }
      
      // 4. 生年月日
      if (normalized.birth_date && normalized.birth_date !== '') {
        filledCount++
      } else {
        missingFields.push('birth_date')
      }
      
      // 5. 国籍
      if (normalized.nationality && normalized.nationality !== '' && normalized.nationality !== '国籍を選択' && normalized.nationality !== 'none') {
        filledCount++
      } else {
        missingFields.push('nationality')
      }
      
      // 6. 自己紹介
      const DEFAULT_SELF_INTRODUCTIONS = ["後でプロフィールを詳しく書きます。", "後ほど入力します", "後で入力します"]
      const isDefaultSelfIntro = DEFAULT_SELF_INTRODUCTIONS.includes(normalized.self_introduction || '')
      if (normalized.self_introduction && normalized.self_introduction.trim() !== '' && !isDefaultSelfIntro) {
        filledCount++
      } else {
        missingFields.push('self_introduction')
      }
      
      // 7. 趣味・興味（hobbies）
      if (Array.isArray(normalized.hobbies) && normalized.hobbies.length > 0) {
        filledCount++
      } else {
        missingFields.push('hobbies')
      }
      
      // 8. 言語スキル
      if (Array.isArray(normalized.language_skills) && normalized.language_skills.length > 0) {
        // 有効性チェック
        const validSkills = normalized.language_skills.filter((s: any) =>
          s &&
          typeof s.language === "string" &&
          typeof s.level === "string" &&
          s.language !== "none" &&
          s.level !== "none" &&
          s.language.trim() !== "" &&
          s.level.trim() !== ""
        )
        if (validSkills.length > 0) {
          filledCount++
        } else {
          missingFields.push('language_skills')
        }
      } else {
        missingFields.push('language_skills')
      }
      
      // 9. 市区町村（任意・完成度100%到達に必要）
      if (normalized.city && normalized.city.trim() !== '') {
        filledCount++
      } else {
        missingFields.push('city')
      }
      
      // 10. 職業
      if (normalized.occupation && normalized.occupation !== '' && normalized.occupation !== 'none') {
        filledCount++
      } else {
        missingFields.push('occupation')
      }
      
      // 11. 身長
      if (normalized.height && normalized.height > 0) {
        filledCount++
      } else {
        missingFields.push('height')
      }
      
      // 12. 体型
      if (normalized.body_type && normalized.body_type !== '' && normalized.body_type !== 'none') {
        filledCount++
      } else {
        missingFields.push('body_type')
      }
      
      // 13. 結婚歴
      if (normalized.marital_status && normalized.marital_status !== '' && normalized.marital_status !== 'none') {
        filledCount++
      } else {
        missingFields.push('marital_status')
      }
      
      // 14. 性格
      if (Array.isArray(normalized.personality) && normalized.personality.length > 0) {
        filledCount++
      } else {
        missingFields.push('personality')
      }
      
      // 15. プロフィール画像（簡易チェック）
      const hasImages = !!(normalized.avatar_url || normalized.profile_image)
      if (hasImages) {
        filledCount++
      } else {
        missingFields.push('profile_images')
      }
      
      const completionPercent = Math.round((filledCount / 15) * 100)
      
      console.log('🏠 MyPage completion debug:', {
        type: 'japanese-female',
        total: 15,
        filled: filledCount,
        percent: completionPercent,
        missingFields: missingFields,
        snapshot: inputSnapshot
      })
    }
    
    // 統一完成度計算システムを使用
    const { calculateCompletion } = require('@/utils/profileCompletion')
    const userType = isForeignMale ? 'foreign-male' : 'japanese-female'
    const result = calculateCompletion(normalized, userType, [], false)
    
    console.log('✅ MyPage完成度計算完了:', {
      completion: result.completion,
      completedFields: result.completedFields,
      totalFields: result.totalFields
    })
    
    // UI更新
    setProfileCompletion(result.completion)
    setCompletedItems(result.completedFields)
    setTotalItems(result.totalFields)
  }
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/')
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sakura-600 mx-auto mb-4"></div>
          <p className="text-gray-600">プロフィールを読み込み中...</p>
        </div>
      </div>
    )
  }

  const isForeignMale = profile?.gender === 'male' && profile?.nationality && profile?.nationality !== '日本'

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      <Sidebar className="w-64 hidden md:block" />
      
      <div className="bg-white shadow-sm md:ml-64">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">マイページ</h1>
          </div>
        </div>
      </div>

      <div className="md:ml-64 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Profile Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center mb-6">
              <div className="relative">
                {profile?.avatar_url || profile?.profile_image ? (
                  <img
                    src={profile.avatar_url || profile.profile_image}
                    alt="プロフィール写真"
                    className="w-20 h-20 rounded-full object-cover border-2 border-sakura-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 border-2 border-sakura-200 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="ml-4 flex-1">
                <h2 className="text-xl font-bold text-gray-900">
                  {profile?.name || 'ユーザー'}
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
                <span className="text-sm font-bold text-orange-600">{profileCompletion}%</span>
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

            {/* Edit Profile Button */}
            <div className="flex gap-4">
              <Button
                onClick={() => {
                  // プロフィール編集遷移処理
                  try {
                    const isForeignMale = profile?.gender === 'male' && profile?.nationality && profile?.nationality !== '日本'
                    const profileType = isForeignMale ? 'foreign-male' : 'japanese-female'
                    setTimeout(() => {
                      router.push(`/profile/edit?fromMyPage=true&type=${profileType}`)
                    }, 100)
                  } catch (error) {
                    console.error('❌ プロフィール編集遷移エラー:', error)
                  }
                }}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                プロフィールを編集する
              </Button>
            </div>
          </div>

          {/* Logout Button */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <LogOut className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-700">ログアウト</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
              </Button>
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

