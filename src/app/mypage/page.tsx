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
  const [saveDebugData, setSaveDebugData] = useState<any>(null)
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
        
        // 🔍 CRITICAL: sessionStorageからプロフィール保存デバッグログを読み込み
        const savedDebugData = sessionStorage.getItem('profileEditSaveDebug')
        if (savedDebugData) {
          try {
            const debugData = JSON.parse(savedDebugData)
            setSaveDebugData(debugData)
            console.log('📊 MyPage: プロフィール保存デバッグデータ読み込み:', debugData)
          } catch (e) {
            console.error('sessionStorage parse error:', e)
          }
        }
        
        // 🔗 user_id ベースでプロフィール取得・作成を保証（遷移継続保証版）
        console.log('🔄 Loading profile with ensureProfileForUserSafe:', user.id)
        const { ensureProfileForUserSafe } = await import('@/lib/profile/ensureProfileForUser')
        const ensureResult = await ensureProfileForUserSafe(supabase, user)
        const profileData = ensureResult.profile
        
        if (!ensureResult.success) {
          console.warn('🚨 MyPage: Profile ensure failed but continuing with minimal display:', {
            reason: ensureResult.reason,
            canContinue: ensureResult.canContinue,
            userId: user.id
          })
          
          // MyPageでは最低限の表示を継続（編集ボタンは表示）
          if (ensureResult.canContinue) {
            // プロフィールなしでも基本的なMyPage表示
            setProfile(null)
            calculateProfileCompletion(null) // nullでも計算可能
            setIsLoading(false)
            return
          } else {
            // 致命的エラーの場合のみ停止
            setIsLoading(false)
            return
          }
        }
        
        // 🔍 CRITICAL: MyPage profiles select直後のpersonality_tags確認（Task A-1）
        console.log('🚨 MyPage PROFILES SELECT結果 PERSONALITY_TAGS確認:', {
          profiles_select_successful: !!profileData,
          profileData_personality_tags: profileData?.personality_tags,
          profileData_personality_tags_type: typeof profileData?.personality_tags,
          profileData_personality_tags_isNull: profileData?.personality_tags === null,
          profileData_personality_tags_isArray: Array.isArray(profileData?.personality_tags),
          profileData_personality_tags_length: profileData?.personality_tags?.length || 0,
          other_fields_check: {
            name: profileData?.name,
            height: profileData?.height,
            occupation: profileData?.occupation
          },
          task_A1_check: 'MyPageでのprofiles取得直後の状態確認'
        })

        // ensureProfileForUser() で確実にプロフィールが取得されるため、
        // 追加のエラーハンドリングやプロフィール作成は不要
        
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

  // 🚨 CRITICAL FIX: 完成度計算単一化（Supabaseデータのみ）
  const calculateProfileCompletion = (profileData: any) => {
    const isForeignMale = profileData?.gender === 'male' && profileData?.nationality && profileData?.nationality !== '日本'
    
    console.log('🏠 MyPage: 統一完成度計算開始:', {
      userId: user?.id,
      hasProfileData: !!profileData,
      isForeignMale
    })
    
    // 🚨 SSOT: DB基準を最優先、sessionData補完は保存直後のUX補助のみ（指示書対応）
    const sessionSkills = (() => {
      // DB基準優先：profileData.language_skillsがあれば補完不要
      if (Array.isArray(profileData?.language_skills) && profileData.language_skills.length > 0) {
        console.log('🚨 SSOT: DB優先 - profileData.language_skillsを使用')
        return [] // 補完不要
      }
      
      if (typeof window === 'undefined') return []
      try {
        // 保存直後のUX補助としてのみsessionData使用
        const urlParams = new URLSearchParams(window.location.search)
        const userId = urlParams.get('userId') || user?.id
        const previewDataKey = userId ? `previewData_${userId}` : 'previewData'
        
        let savedData = sessionStorage.getItem(previewDataKey)
        if (!savedData) savedData = sessionStorage.getItem('previewData')
        
        if (savedData) {
          const sessionData = JSON.parse(savedData)
          console.log('🚨 SSOT: DB補完 - sessionDataから一時補助')
          return Array.isArray(sessionData.language_skills) ? sessionData.language_skills : []
        }
      } catch (error) {
        console.warn('⚠️ language_skills session取得失敗:', error)
      }
      return []
    })()

    // 正規化されたプロフィールデータを作成（Supabase実態に合わせたキーマッピング + NULL→[]正規化）
    const normalized: any = {
      ...profileData,
      // 🔧 DB実態キーマッピング修正
      nickname: profileData?.name || profileData?.nickname,           // DB: name
      self_introduction: profileData?.bio || profileData?.self_introduction, // DB: bio
      // 🚨 NULL→[]正規化: hobbies/personalityフィールドマッピング  
      hobbies: Array.isArray(profileData?.culture_tags) 
        ? profileData.culture_tags 
        : (Array.isArray(profileData?.interests) ? profileData.interests : []),
      personality: Array.isArray(profileData?.personality_tags) 
        ? profileData.personality_tags 
        : (Array.isArray(profileData?.personality) ? profileData.personality : []),  // DB: personality_tags配列（null→[]正規化）
      // 🚨 SSOT: language_skills DB基準統合（指示書対応）
      language_skills: Array.isArray(profileData?.language_skills) && profileData.language_skills.length > 0
        ? profileData.language_skills  // DB優先
        : sessionSkills               // 保存直後UX補助のみ
    }
    
    // 🔍 DB実データ確認ログ（culture_tags問題特定用 + NULL→[]正規化確認）
    console.log('🧩 DB DATA CHECK + NULL NORMALIZATION:', {
      db_personality_tags: profileData?.personality_tags,
      db_culture_tags: profileData?.culture_tags,
      db_personality_tags_isNull: profileData?.personality_tags === null,
      db_culture_tags_isNull: profileData?.culture_tags === null,
      db_personality_tags_type: typeof profileData?.personality_tags,
      db_culture_tags_type: typeof profileData?.culture_tags,
      normalized_personality: normalized.personality,
      normalized_hobbies: normalized.hobbies,
      normalized_personality_length: normalized.personality?.length || 0,
      normalized_hobbies_length: normalized.hobbies?.length || 0,
      null_normalization_applied: {
        personality_tags: profileData?.personality_tags === null ? 'null→[]変換済み' : '配列または他の値',
        culture_tags: profileData?.culture_tags === null ? 'null→[]変換済み' : '配列または他の値'
      }
    })
    
    // 🚨 SINGLE SOURCE: 統一完成度計算システムのみを使用
    const { calculateCompletion } = require('@/utils/profileCompletion')
    const userType = isForeignMale ? 'foreign-male' : 'japanese-female'
    
    // 🔍 STEP2 DEBUG: 完成度計算に渡すデータの詳細確認
    console.log('🔍 STEP2 DEBUG - MyPage完成度計算入力データ:', {
      userType,
      imageArray_passed: [],  // 現在は空配列を渡している
      normalized_avatar_url: normalized.avatar_url ? `${normalized.avatar_url.substring(0, 30)}...` : 'none',
      normalized_avatarUrl: normalized.avatarUrl ? `${normalized.avatarUrl.substring(0, 30)}...` : 'none', 
      normalized_profile_image: normalized.profile_image ? `${normalized.profile_image.substring(0, 30)}...` : 'none',
      normalized_profile_images: normalized.profile_images,
      mypage_display_uses: 'avatar_url + profile_image',
      completion_will_check: 'profile_images (empty) + fallback to avatar_url'
    })
    
    const result = calculateCompletion(normalized, userType, [], false)
    
    // 🛡️ CRITICAL: 計算矛盾検出ガード（14項目固定 - cityは除外だが項目数変更禁止）
    const totalExpected = userType === 'japanese-female' ? 14 : 17
    const isConsistent = result.totalFields === totalExpected
    const isValidCalculation = result.completedFields <= result.totalFields
    
    console.log('🔧 CALCULATION GUARD CHECK:', {
      userType,
      totalExpected,
      result_totalFields: result.totalFields,
      result_completedFields: result.completedFields,
      result_completion: result.completion,
      isConsistent,
      isValidCalculation,
      calculationSource: 'calculateCompletion統一システム'
    })
    
    // 🚨 計算矛盾時は強制エラー表示
    if (!isConsistent || !isValidCalculation) {
      console.error('❌ CALCULATION INCONSISTENCY DETECTED:', {
        expected_total: totalExpected,
        actual_total: result.totalFields,
        completed: result.completedFields,
        userType
      })
    }
    
    // 🚨 SSOT最終確認ログ（指示書対応）- cityは除外
    const missingFields = []
    // ⚠️ city は完成度計算から除外（UI削除済み）
    if (!Array.isArray(normalized.language_skills) || normalized.language_skills.length === 0) missingFields.push('language_skills')
    
    console.log('🚨 SSOT FINAL CHECK - DB基準100%検証 (city除外版):', {
      'DB_language_skills': profileData?.language_skills,
      'DB_language_skills_isArray': Array.isArray(profileData?.language_skills),
      'DB_language_skills_length': profileData?.language_skills?.length || 0,
      'sessionSkills_used_as_fallback': sessionSkills.length,
      'normalized_language_skills_source': Array.isArray(profileData?.language_skills) && profileData.language_skills.length > 0 ? 'DB' : 'session補完',
      'city_status': 'EXCLUDED_FROM_COMPLETION',
      'missing_for_100%': missingFields,
      'DB基準100%達成': missingFields.length === 0 && Array.isArray(profileData?.language_skills)
    })

    console.log('✅ MyPage完成度計算完了（統一）:', {
      completion: result.completion,
      completedFields: result.completedFields,
      totalFields: result.totalFields,
      userType,
      missing: missingFields,
      is_100_percent: missingFields.length === 0 && result.completion === 100,
      singleSourceOnly: true
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
                {((profile?.avatar_url && !profile.avatar_url.startsWith('data:image/')) || 
                  (profile?.profile_image && !profile.profile_image.startsWith('data:image/'))) ? (
                  <img
                    src={(profile.avatar_url && !profile.avatar_url.startsWith('data:image/')) 
                         ? profile.avatar_url 
                         : profile.profile_image}
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
                    
                    // 🎯 SSOT統一: MyPage→編集遷移時の画像データ保存
                    if (profile?.avatar_url && profile.avatar_url.trim() !== '') {
                      const imageData = [{
                        id: '1',
                        url: profile.avatar_url,
                        originalUrl: profile.avatar_url,
                        isMain: true,
                        isEdited: false
                      }]
                      
                      localStorage.setItem('currentProfileImages', JSON.stringify(imageData))
                      
                      console.log('🎯 MyPage→Edit遷移: 画像データ保存完了', {
                        avatar_url_exists: !!profile.avatar_url,
                        isBase64: profile.avatar_url.startsWith('data:image/'),
                        saved_to_localStorage: true,
                        imageData_length: imageData.length,
                        purpose: 'UI表示と完成度計算の統一'
                      })
                    } else {
                      // 画像がない場合はlocalStorageをクリア
                      localStorage.removeItem('currentProfileImages')
                      console.log('🎯 MyPage→Edit遷移: 画像なし - localStorage クリア完了')
                    }
                    
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
      
      {/* 🔍 CRITICAL: プロフィール保存デバッグパネル（sessionStorage表示） */}
      {saveDebugData && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#fff',
          border: '2px solid #dc2626',
          borderRadius: '8px',
          padding: '12px',
          maxWidth: '400px',
          fontSize: '12px',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            🚨 プロフィール保存結果
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>保存時刻:</strong> {new Date(saveDebugData.timestamp).toLocaleString()}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>元の選択値:</strong> {JSON.stringify(saveDebugData.selectedPersonality_original)}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>正規化後:</strong> {JSON.stringify(saveDebugData.personalityTags_normalized)}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>送信 personality_tags:</strong> {JSON.stringify(saveDebugData.payload_personality_tags)}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>DB personality_tags:</strong> {JSON.stringify(saveDebugData.updatedRow_personality_tags)}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>他の項目比較:</strong> height:{saveDebugData.payload_height}, occupation:{saveDebugData.payload_occupation}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>updateData内キー:</strong> personality_tags含む:{saveDebugData.personality_tags_in_keys ? 'Yes' : 'No'}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>一致結果:</strong> 
            <span style={{ color: saveDebugData.personality_tags_saved_correctly ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
              {saveDebugData.personality_tags_saved_correctly ? ' ✅ SUCCESS' : ' ❌ FAILED'}
            </span>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <strong>分析:</strong> {saveDebugData.success_analysis}
          </div>
          <button 
            onClick={() => {
              setSaveDebugData(null)
              sessionStorage.removeItem('profileEditSaveDebug')
            }}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            閉じる
          </button>
        </div>
      )}
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

