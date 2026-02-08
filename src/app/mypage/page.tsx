'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { resolveAvatarSrc } from '@/utils/imageResolver'
import {
  User,
  Edit3,
  Settings,
  Mail,
  HelpCircle,
  LogOut,
  AlertCircle
} from 'lucide-react'
import { LanguageSelector } from '@/components/LanguageSelector'
import { useLanguageAwareRouter } from '@/utils/languageNavigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { MenuRow, LikeRemainingRow } from '@/components/mypage/MenuRow'

function MyPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const languageRouter = useLanguageAwareRouter()
  const { currentLanguage } = useLanguage()

  // MyPage専用翻訳辞書
  const mypageTranslations: Record<string, Record<string, string>> = {
    ja: {
      title: 'マイページ',
      profileCompletionTitle: 'プロフィール完成度',
      itemsFilled: '{filled}/{total}項目入力済み',
      editProfileButton: 'プロフィールを編集する',
      logout: 'ログアウト',
      loggingOut: 'ログアウト中...',
      notificationSettings: '通知・設定',
      notificationSettingsDesc: 'メール通知設定、パスワードの変更など',
      contact: 'お問い合わせ',
      contactDesc: 'ご質問・ご要望はこちらから',
      faq: 'よくある質問',
      faqDesc: 'ヘルプ・サポート情報',
      likesRemaining: '残りいいね数（今日）'
    },
    en: {
      title: 'My Page',
      profileCompletionTitle: 'Profile Completion',
      itemsFilled: '{filled}/{total} items completed',
      editProfileButton: 'Edit Profile',
      logout: 'Logout',
      loggingOut: 'Logging out...',
      notificationSettings: 'Notification & Settings',
      notificationSettingsDesc: 'Email notifications, password change, etc.',
      contact: 'Contact Us',
      contactDesc: 'Questions or requests',
      faq: 'FAQ',
      faqDesc: 'Help and support',
      likesRemaining: 'Remaining Likes (Today)'
    },
    ko: {
      title: '마이페이지',
      profileCompletionTitle: '프로필 완성도',
      itemsFilled: '{filled}/{total}개 항목 입력완료',
      editProfileButton: '프로필 편집하기',
      logout: '로그아웃',
      loggingOut: '로그아웃 중...',
      notificationSettings: '알림 및 설정',
      notificationSettingsDesc: '이메일 알림 설정, 비밀번호 변경 등',
      contact: '문의하기',
      contactDesc: '질문이나 요청사항',
      faq: '자주 묻는 질문',
      faqDesc: '도움말 및 지원',
      likesRemaining: '남은 좋아요 수 (오늘)'
    },
    'zh-tw': {
      title: '我的頁面',
      profileCompletionTitle: '個人資料完整度',
      itemsFilled: '已填寫 {filled}/{total} 個項目',
      editProfileButton: '編輯個人資料',
      logout: '登出',
      loggingOut: '登出中...',
      notificationSettings: '通知與設定',
      notificationSettingsDesc: '電子郵件通知設定、密碼變更等',
      contact: '聯絡我們',
      contactDesc: '有問題或建議請聯繫',
      faq: '常見問題',
      faqDesc: '幫助與支援',
      likesRemaining: '剩餘按讚數（今日）'
    }
  }

  const getMypageTranslation = (key: string, replacements: Record<string, string> = {}) => {
    const translations = mypageTranslations[currentLanguage] || mypageTranslations['ja']
    let translation = translations[key] || mypageTranslations['ja'][key] || key
    Object.keys(replacements).forEach(placeholder => {
      translation = translation.replace(`{${placeholder}}`, replacements[placeholder])
    })
    return translation
  }

  const [profile, setProfile] = useState<any>(null)
  const [userMismatchDetected, setUserMismatchDetected] = useState(false)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [completedItems, setCompletedItems] = useState(0)
  const [totalItems, setTotalItems] = useState(8)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // いいね残り回数
  const [likesRemaining, setLikesRemaining] = useState(10)
  const [likesLimit] = useState(10)

  const supabase = createClient()

  // 残りいいね数を取得
  const fetchLikesRemaining = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) return

      const res = await fetch('/api/likes/remaining', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setLikesRemaining(data.remaining)
      }
    } catch (error) {
      logger.warn('[MYPAGE] likes remaining fetch error')
    }
  }

  useEffect(() => {
    const loadProfile = async () => {
      if (!user || !user.id) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        const { ensureProfileForUserSafe } = await import('@/lib/profile/ensureProfileForUser')
        const ensureResult = await ensureProfileForUserSafe(supabase, user)
        const profileData = ensureResult.profile

        if (!ensureResult.success) {
          logger.warn('[MYPAGE] profile ensure failed:', ensureResult.reason)
          if (ensureResult.canContinue) {
            setProfile(null)
            calculateProfileCompletionLocal(null)
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

        // Base64検出警告（TASK C: 再発防止）
        const { detectBase64InImageFields } = await import('@/utils/imageResolver')
        detectBase64InImageFields(profileData)

        setProfile(profileData)
        calculateProfileCompletionLocal(profileData)

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

        // いいね残り回数を取得
        fetchLikesRemaining()

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

  // 完成度計算（Supabaseデータのみ）- 既存ロジック維持【変更禁止】
  const calculateProfileCompletionLocal = (profileData: any) => {
    const isForeignMale = profileData?.gender === 'male' && profileData?.nationality && profileData?.nationality !== '日本'

    const sessionSkills = (() => {
      if (Array.isArray(profileData?.language_skills) && profileData.language_skills.length > 0) {
        return []
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

    const totalExpected = userType === 'japanese-female' ? 14 : 17
    if (result.totalFields !== totalExpected || result.completedFields > result.totalFields) {
      logger.error('[MYPAGE] calc inconsistency:', result.completedFields, '/', result.totalFields)
    }

    logger.debug('[MYPAGE] completion:', result.completion, '%', `(${result.completedFields}/${result.totalFields})`)

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

  const handleEditProfile = () => {
    try {
      const isForeignMale = profile?.gender === 'male' && profile?.nationality && profile?.nationality !== '日本'
      const profileType = isForeignMale ? 'foreign-male' : 'japanese-female'

      let imageData = []
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
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-sakura-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ユーザーID不一致オーバーレイ */}
      {userMismatchDetected && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 mx-4 max-w-md text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">別タブでログインが切り替わりました</h2>
            <p className="text-gray-600 mb-6">正しいプロフィールを表示するために、ページを再読み込みしてください。</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-sakura-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-sakura-600 transition-colors"
              >
                再読み込み
              </button>
              <button
                onClick={() => router.push('/mypage')}
                className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                マイページへ戻る
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar className="w-64 hidden md:block" />

      {/* ヘッダー */}
      <div className="bg-white shadow-sm md:ml-64">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">{getMypageTranslation('title')}</h1>
            <LanguageSelector variant="light" size="sm" showIcon={true} />
          </div>
        </div>
      </div>

      <div className="md:ml-64 pb-8">
        <div className="max-w-2xl mx-auto">

          {/* === 上部カード: プロフィールセクション === */}
          <div className="bg-white mt-4 mx-4 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              {/* アバター + 名前 + 完成度 */}
              <div className="flex items-start">
                {/* アバター */}
                <div className="flex-shrink-0">
                  {(() => {
                    const avatarSrc = resolveAvatarSrc(profile?.avatar_url, supabase)
                    return avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="プロフィール写真"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 border-2 border-gray-200 flex items-center justify-center">
                        <User className="w-10 h-10 text-gray-400" />
                      </div>
                    )
                  })()}
                </div>

                {/* 右側: 名前 + 完成度 */}
                <div className="ml-4 flex-1">
                  {/* ニックネーム */}
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {profile?.name || 'ユーザー'}
                  </h2>

                  {/* プロフィール完成度 */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{getMypageTranslation('profileCompletionTitle')}</span>
                      <span className="text-lg font-bold text-orange-500">{profileCompletion}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-orange-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${profileCompletion}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {totalItems > 0 ? getMypageTranslation('itemsFilled', { filled: completedItems.toString(), total: totalItems.toString() }) : '計算中...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* プロフィール編集ボタン */}
              <button
                onClick={handleEditProfile}
                className="w-full mt-4 py-3 px-4 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {getMypageTranslation('editProfileButton')}
              </button>
            </div>
          </div>

          {/* === 下部リスト: メニューセクション === */}
          <div className="bg-white mt-4 mx-4 rounded-xl shadow-sm overflow-hidden">

            {/* 残りいいね数（情報表示のみ） */}
            <LikeRemainingRow remaining={likesRemaining} limit={likesLimit} />

            {/* 通知・設定 */}
            <MenuRow
              icon={Settings}
              label={getMypageTranslation('notificationSettings')}
              subText={getMypageTranslation('notificationSettingsDesc')}
              onClick={() => router.push('/settings')}
              iconColor="text-amber-600"
            />

            {/* お問い合わせ */}
            <MenuRow
              icon={Mail}
              label={getMypageTranslation('contact')}
              subText={getMypageTranslation('contactDesc')}
              onClick={() => window.location.href = 'mailto:support@sakura-club.jp'}
              iconColor="text-blue-600"
            />

            {/* よくある質問 */}
            <MenuRow
              icon={HelpCircle}
              label={getMypageTranslation('faq')}
              subText={getMypageTranslation('faqDesc')}
              onClick={() => router.push('/faq')}
              iconColor="text-purple-600"
            />

            {/* ログアウト */}
            <MenuRow
              icon={LogOut}
              label={isLoggingOut ? getMypageTranslation('loggingOut') : getMypageTranslation('logout')}
              onClick={handleLogout}
              iconColor="text-red-500"
              labelColor="text-red-600"
              showDivider={false}
            />
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
