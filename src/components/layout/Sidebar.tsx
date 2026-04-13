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
      verificationBanner: '⚠️ 本人年齢確認が未完了です',
      verificationPendingBanner: '⏳ 年齢確認を審査中です',
    },
    en: {
      search: 'Search',
      messages: 'Messages',
      matches: 'Likes',
      footprints: 'Footprints',
      mypage: 'My Page',
      verificationBanner: '⚠️ Age Verification Required',
      verificationPendingBanner: '⏳ Age Verification Under Review',
    },
    ko: {
      search: '검색',
      messages: '메시지',
      matches: '관심',
      footprints: '발자국',
      mypage: '마이페이지',
      verificationBanner: '⚠️ 나이 확인이 필요합니다',
      verificationPendingBanner: '⏳ 나이 확인 심사 중',
    },
    'zh-tw': {
      search: '搜尋',
      messages: '訊息',
      matches: '喜歡我的人',
      footprints: '足跡',
      mypage: '我的頁面',
      verificationBanner: '⚠️ 需要進行年齡確認',
      verificationPendingBanner: '⏳ 年齡確認審查中',
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
    <div className={`nav-app shadow-lg fixed left-0 top-0 h-full z-50 ${className}`}>
      <div className="p-6">
        <div className="flex items-center mb-8">
          <h1 className="font-cormorant text-xl" style={{ color: 'var(--color-primary)', letterSpacing: '0.18em', fontWeight: 300 }}>SAKURA CLUB</h1>
        </div>

        {/* 身分証未登録バナー */}
        {!isVerified && (
          verificationStatus === 'pending' || verificationStatus === 'requires_review' ? (
            <div className="mx-0 mb-4 p-3 rounded-lg text-sm flex items-center gap-2" style={{ backgroundColor: 'rgba(201,169,110,0.12)', border: '1px solid var(--color-accent)', color: 'var(--color-text-sub)' }}>
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{getSafeTranslation('verificationPendingBanner')}</span>
            </div>
          ) : (
            <Link
              href="/verification"
              className="block mx-0 mb-4 p-3 rounded-lg text-sm transition-colors flex items-start gap-2"
              style={{ backgroundColor: 'rgba(139,26,46,0.06)', border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}
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
                  isActive ? 'nav-item-active' : 'nav-item-hover'
                }`}
                style={isActive ? {} : { color: 'var(--color-text-sub)' }}
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
