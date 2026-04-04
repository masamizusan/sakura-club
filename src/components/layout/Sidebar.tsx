'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Search,
  MessageCircle,
  Heart,
  History,
  User,
  ShieldAlert
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useNotifications } from '@/hooks/useNotifications'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/utils/logger'

interface SidebarProps {
  className?: string
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname()
  const { currentLanguage } = useLanguage()
  const { unreadMessages, unseenLikes, unreadFootprints } = useNotifications()
  const logged = useRef(false)
  const [isVerified, setIsVerified] = useState<boolean>(true) // trueで初期化
  const [verificationStatus, setVerificationStatus] = useState<string>('')

  // 身分証認証状態を取得
  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_verified, verification_status')
          .eq('id', user.id)
          .single()
        if (profile) {
          setIsVerified(profile.is_verified === true)
          setVerificationStatus(profile.verification_status || 'unverified')
        }
      } catch {
        // 認証エラーはサイレントに無視
      }
    }
    fetchVerification()
  }, [])

  // 🌍 Sidebar専用翻訳辞書
  const sidebarTranslations: Record<string, Record<string, string>> = {
    ja: {
      search: 'さがす',
      messages: 'メッセージ',
      matches: 'お相手から',
      footprints: '足跡',
      mypage: 'マイページ',
      verificationBanner: '⚠️ 身分証を登録してメッセージを送ろう',
      verificationPendingBanner: '⏳ 身分証を審査中です',
    },
    en: {
      search: 'Search',
      messages: 'Messages',
      matches: 'Likes',
      footprints: 'Footprints',
      mypage: 'My Page',
      verificationBanner: '⚠️ Register your ID to send messages',
      verificationPendingBanner: '⏳ ID verification in progress',
    },
    ko: {
      search: '검색',
      messages: '메시지',
      matches: '관심',
      footprints: '발자국',
      mypage: '마이페이지',
      verificationBanner: '⚠️ 신분증을 등록하고 메시지를 보내세요',
      verificationPendingBanner: '⏳ 신분증 심사 중입니다',
    },
    'zh-tw': {
      search: '搜尋',
      messages: '訊息',
      matches: '喜歡我的人',
      footprints: '足跡',
      mypage: '我的頁面',
      verificationBanner: '⚠️ 登錄身份證以發送訊息',
      verificationPendingBanner: '⏳ 身份證審查中',
    }
  }

  // 初回のみログ出力
  if (!logged.current) {
    logged.current = true
    logger.debug('[SIDEBAR] lang:', currentLanguage)
  }

  // フォールバック機能付きの翻訳関数
  const getSafeTranslation = (key: string) => {
    const translations = sidebarTranslations[currentLanguage] || sidebarTranslations['ja']
    return translations[key] || sidebarTranslations['ja'][key] || key
  }

  // バッジに表示するカウントを取得
  const getBadgeCount = (id: string): number => {
    if (id === 'messages') return unreadMessages
    if (id === 'liked') return unseenLikes
    if (id === 'footprints') return unreadFootprints
    return 0
  }

  const sidebarItems = [
    { id: 'search', icon: Search, labelKey: 'search', href: '/matches' },
    { id: 'messages', icon: MessageCircle, labelKey: 'messages', href: '/messages' },
    { id: 'liked', icon: Heart, labelKey: 'matches', href: '/likes' },
    { id: 'footprints', icon: History, labelKey: 'footprints', href: '/footprints' },
    { id: 'profile', icon: User, labelKey: 'mypage', href: '/mypage' },
  ]

  return (
    <div className={`bg-white shadow-lg fixed left-0 top-0 h-full z-50 ${className}`}>
      <div className="p-6">
        <div className="flex items-center mb-8">
          <div className="w-8 h-8 bg-gradient-to-r from-sakura-500 to-sakura-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold text-sm">桜</span>
          </div>
          <h1 className="text-xl font-bold sakura-text-gradient">Sakura Club</h1>
        </div>

        {/* 身分証未登録バナー */}
        {!isVerified && (
          verificationStatus === 'pending' || verificationStatus === 'requires_review' ? (
            <div className="mx-0 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{getSafeTranslation('verificationPendingBanner')}</span>
            </div>
          ) : (
            <Link
              href="/verification"
              className="block mx-0 mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800 hover:bg-yellow-100 transition-colors flex items-start gap-2"
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-600" />
              <span>{getSafeTranslation('verificationBanner')}</span>
            </Link>
          )
        )}

        <nav className="space-y-2 sticky top-8">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href === '/matches' && pathname === '/') ||
              (pathname?.startsWith('/profile') && item.id === 'profile') ||
              (item.href === '/likes' && pathname === '/likes')

            const badgeCount = getBadgeCount(item.id)

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-sakura-100 text-sakura-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {badgeCount > 0 && (
                    badgeCount >= 10 ? (
                      <span className="absolute -top-2 -right-3 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    ) : (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )
                  )}
                </div>
                <span className="font-medium">{getSafeTranslation(item.labelKey)}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
