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
import { logger } from '@/utils/logger'
import { resolveProfileImageSrc, resolveAvatarSrc } from '@/utils/imageResolver'
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
  Calendar,
  AlertCircle
} from 'lucide-react'
import { LanguageSelector } from '@/components/LanguageSelector'
import { useUnifiedTranslation } from '@/utils/translations'
import { useLanguageAwareRouter } from '@/utils/languageNavigation'
import { useLanguage } from '@/contexts/LanguageContext'

function MyPageContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const languageRouter = useLanguageAwareRouter()
  const { t, language } = useUnifiedTranslation()
  const { currentLanguage } = useLanguage()
  
  // 🌍 MyPage専用翻訳辞書
  const mypageTranslations: Record<string, Record<string, string>> = {
    ja: {
      title: 'マイページ',
      profileCompletionTitle: 'プロフィール完成度',
      itemsFilled: '{filled}/{total}項目入力済み',
      editProfileButton: 'プロフィールを編集する',
      logout: 'ログアウト',
      loggingOut: 'ログアウト中...'
    },
    en: {
      title: 'My Page',
      profileCompletionTitle: 'Profile Completion',
      itemsFilled: '{filled}/{total} items completed',
      editProfileButton: 'Edit Profile',
      logout: 'Logout',
      loggingOut: 'Logging out...'
    },
    ko: {
      title: '마이페이지',
      profileCompletionTitle: '프로필 완성도',
      itemsFilled: '{filled}/{total}개 항목 입력완료',
      editProfileButton: '프로필 편집하기',
      logout: '로그아웃',
      loggingOut: '로그아웃 중...'
    },
    'zh-tw': {
      title: '我的頁面',
      profileCompletionTitle: '個人資料完整度',
      itemsFilled: '已填寫 {filled}/{total} 個項目',
      editProfileButton: '編輯個人資料',
      logout: '登出',
      loggingOut: '登出中...'
    }
  }
  
  // MyPage専用翻訳関数
  const getMypageTranslation = (key: string, replacements: Record<string, string> = {}) => {
    const translations = mypageTranslations[currentLanguage] || mypageTranslations['ja']
    let translation = translations[key] || mypageTranslations['ja'][key] || key
    
    // プレースホルダーを置換
    Object.keys(replacements).forEach(placeholder => {
      translation = translation.replace(`{${placeholder}}`, replacements[placeholder])
    })
    
    return translation
  }
  const [profile, setProfile] = useState<any>(null)
  // 🔒 修繕A: ユーザーID不一致検出
  const [userMismatchDetected, setUserMismatchDetected] = useState(false)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [completedItems, setCompletedItems] = useState(0)
  const [totalItems, setTotalItems] = useState(8)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [saveDebugData, setSaveDebugData] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      if (!user || !user.id) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // sessionStorageからデバッグデータ読み込み
        const savedDebugData = sessionStorage.getItem(`profileEditSaveDebug_${user?.id || 'testmode'}`)
        if (savedDebugData) {
          try {
            setSaveDebugData(JSON.parse(savedDebugData))
          } catch (e) {
            // ignore parse error
          }
        }

        const { ensureProfileForUserSafe } = await import('@/lib/profile/ensureProfileForUser')
        const ensureResult = await ensureProfileForUserSafe(supabase, user)
        const profileData = ensureResult.profile

        if (!ensureResult.success) {
          logger.warn('[MYPAGE] profile ensure failed:', ensureResult.reason)
          if (ensureResult.canContinue) {
            setProfile(null)
            calculateProfileCompletion(null)
            setIsLoading(false)
            return
          } else {
            setIsLoading(false)
            return
          }
        }

        logger.debug('[MYPAGE] loaded:', user.id?.slice(0, 8))

        // SSOT_ID_CHECK: ユーザーID一致監視
        const idMatch = !profileData || profileData.user_id === user.id
        if (!idMatch) {
          logger.error('[MYPAGE] ID mismatch detected')
          setUserMismatchDetected(true)
        }
        
        // 🔍 Base64検出警告（TASK C: 再発防止）
        const { detectBase64InImageFields } = await import('@/utils/imageResolver')
        detectBase64InImageFields(profileData)

        // 🆕 CRITICAL: localStorage処理を完全削除し、Supabaseデータのみで完成度計算
        setProfile(profileData)
        calculateProfileCompletion(profileData)

        // 修繕G': birth_dateあり＆age null → post-signup-profileで補完
        if (profileData?.birth_date && !profileData?.age) {
          try {
            const { data: sessionData } = await supabase.auth.getSession()
            const token = sessionData?.session?.access_token
            if (token) {
              const res = await fetch('/api/auth/post-signup-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ birth_date: profileData.birth_date })
              })
              const resBody = await res.json().catch(() => null)
              if (resBody?.updatedFields?.includes('age')) {
                const m = String(profileData.birth_date).match(/^(\d{4})-(\d{2})-(\d{2})$/)
                if (m) {
                  const [, y, mo, d] = m.map(Number)
                  const t = new Date()
                  let a = t.getFullYear() - y
                  if (t.getMonth() + 1 < mo || (t.getMonth() + 1 === mo && t.getDate() < d)) a--
                  profileData.age = a
                  setProfile({ ...profileData })
                }
              }
            }
          } catch (e) {
            // age補完失敗（続行）
          }
        }

        // 修繕H: 必須項目欠落ガード → プロフィール編集へ誘導
        const pIsForeignMale = profileData?.gender === 'male' && profileData?.nationality && profileData?.nationality !== '日本'
        const missingRequired = !profileData?.name || !profileData?.gender || !profileData?.birth_date
          || (pIsForeignMale && !profileData?.nationality)
          || (!pIsForeignMale && !profileData?.residence && !profileData?.prefecture)
        if (missingRequired) {
          logger.debug('[MYPAGE] missing required → redirect to edit')
          const pType = pIsForeignMale ? 'foreign-male' : 'japanese-female'
          const params = new URLSearchParams({ type: pType, fromMyPage: 'true' })
          languageRouter.push('/profile/edit', params)
          return
        }

      } catch (error) {
        logger.error('[MYPAGE] load error:', error instanceof Error ? error.message : 'unknown')
        setProfile(null)
        setProfileCompletion(0)
        setCompletedItems(0)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProfile()
  }, [user, supabase])

  // 完成度計算（Supabaseデータのみ）
  const calculateProfileCompletion = (profileData: any) => {
    const isForeignMale = profileData?.gender === 'male' && profileData?.nationality && profileData?.nationality !== '日本'

    // sessionData補完（保存直後のUX補助のみ）
    const sessionSkills = (() => {
      if (Array.isArray(profileData?.language_skills) && profileData.language_skills.length > 0) {
        return [] // DB優先
      }
      if (typeof window === 'undefined') return []
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const userId = urlParams.get('userId') || user?.id
        const previewDataKey = userId ? `previewData_${userId}` : 'previewData'
        let savedData = sessionStorage.getItem(previewDataKey)
        if (!savedData) savedData = sessionStorage.getItem('previewData')
        if (savedData) {
          const sessionData = JSON.parse(savedData)
          return Array.isArray(sessionData.language_skills) ? sessionData.language_skills : []
        }
      } catch {
        // ignore
      }
      return []
    })()

    // 正規化
    const normalized: any = {
      ...profileData,
      nickname: profileData?.name || profileData?.nickname,
      self_introduction: profileData?.bio || profileData?.self_introduction,
      avatar_url: profileData?.avatar_url,
      hobbies: Array.isArray(profileData?.culture_tags)
        ? profileData.culture_tags
        : (Array.isArray(profileData?.interests) ? profileData.interests : []),
      personality: Array.isArray(profileData?.personality_tags)
        ? profileData.personality_tags
        : (Array.isArray(profileData?.personality) ? profileData.personality : []),
      language_skills: Array.isArray(profileData?.language_skills) && profileData.language_skills.length > 0
        ? profileData.language_skills
        : sessionSkills
    }

    const { calculateCompletion } = require('@/utils/profileCompletion')
    const userType = isForeignMale ? 'foreign-male' : 'japanese-female'
    const result = calculateCompletion(normalized, userType, [], false)

    // 計算矛盾検出
    const totalExpected = userType === 'japanese-female' ? 14 : 17
    if (result.totalFields !== totalExpected || result.completedFields > result.totalFields) {
      logger.error('[MYPAGE] calc inconsistency:', result.completedFields, '/', result.totalFields)
    }

    logger.debug('[MYPAGE] completion:', result.completion, '%', `(${result.completedFields}/${result.totalFields})`)
    
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
      logger.error('[MYPAGE] logout error')
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
      {/* 🔒 修繕A: ユーザーID不一致オーバーレイ */}
      {userMismatchDetected && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 mx-4 max-w-md text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">別タブでログインが切り替わりました</h2>
            <p className="text-gray-600 mb-6">正しいプロフィールを表示するために、ページを再読み込みしてください。</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-sakura-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-sakura-600 transition-colors"
            >
              再読み込み
            </button>
          </div>
        </div>
      )}
      <Sidebar className="w-64 hidden md:block" />

      <div className="bg-white shadow-sm md:ml-64">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">{getMypageTranslation('title')}</h1>
            <LanguageSelector variant="light" size="sm" showIcon={true} />
          </div>
        </div>
      </div>

      <div className="md:ml-64 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Profile Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center mb-6">
              <div className="relative">
                {(() => {
                  const avatarSrc = resolveAvatarSrc(profile?.avatar_url, supabase)
                  return avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="プロフィール写真"
                      className="w-20 h-20 rounded-full object-cover border-2 border-sakura-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 border-2 border-sakura-200 flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )
                })()}
              </div>
              <div className="ml-4 flex-1">
                <h2 className="text-xl font-bold text-gray-900">
                  {profile?.name || 'ユーザー'}
                </h2>
                <p className="text-gray-600">
                  {(() => {
                    // 修繕G: age null時はbirth_dateから算出
                    let displayAge: string | number = '未設定'
                    if (profile?.age) {
                      displayAge = profile.age
                    } else if (profile?.birth_date) {
                      const m = String(profile.birth_date).match(/^(\d{4})-(\d{2})-(\d{2})$/)
                      if (m) {
                        const [, y, mo, d] = m.map(Number)
                        const t = new Date()
                        let a = t.getFullYear() - y
                        if (t.getMonth() + 1 < mo || (t.getMonth() + 1 === mo && t.getDate() < d)) a--
                        if (a >= 0) displayAge = a
                      }
                    }
                    return `${displayAge}歳`
                  })()} • {isForeignMale
                    ? (profile?.nationality?.trim() || '未設定')
                    : (profile?.residence || profile?.prefecture || '未設定')}
                </p>
              </div>
            </div>

            {/* Profile Completion */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{getMypageTranslation('profileCompletionTitle')}</span>
                <span className="text-sm font-bold text-orange-600">{profileCompletion}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${profileCompletion}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {totalItems > 0 ? getMypageTranslation('itemsFilled', { filled: completedItems.toString(), total: totalItems.toString() }) : '計算中...'}
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
                    
                    // 🎯 SSOT統一: MyPage→編集遷移時の画像データ保存（photo_urls優先）
                    let imageData = []
                    
                    // 🖼️ STEP 1: photo_urls優先（最大3枚対応）
                    if (Array.isArray(profile?.photo_urls) && profile.photo_urls.length > 0) {
                      imageData = profile.photo_urls.map((url: string, index: number) => ({
                        id: `photo_${index}`,
                        url: url,
                        originalUrl: url,
                        isMain: index === 0,
                        isEdited: false
                      }))
                    }
                    else if (typeof profile?.avatar_url === "string" && profile.avatar_url.trim().length > 0) {
                      imageData = [{
                        id: '1',
                        url: profile.avatar_url,
                        originalUrl: profile.avatar_url,
                        isMain: true,
                        isEdited: false
                      }]
                    }

                    if (imageData.length > 0) {
                      localStorage.setItem('currentProfileImages', JSON.stringify(imageData))
                    } else {
                      localStorage.removeItem('currentProfileImages')
                    }

                    const editParams = new URLSearchParams({
                      fromMyPage: 'true',
                      type: profileType
                    })

                    setTimeout(() => {
                      languageRouter.push('/profile/edit', editParams)
                    }, 100)
                  } catch (error) {
                    logger.error('[MYPAGE] edit navigation error')
                  }
                }}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {getMypageTranslation('editProfileButton')}
              </Button>
            </div>
          </div>

          {/* Logout Button */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <LogOut className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-700">{getMypageTranslation('logout')}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {isLoggingOut ? getMypageTranslation('loggingOut') : getMypageTranslation('logout')}
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
              sessionStorage.removeItem(`profileEditSaveDebug_${user?.id || 'testmode'}`)
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

