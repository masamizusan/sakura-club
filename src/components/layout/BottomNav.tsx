'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, MessageCircle, Heart, History, User } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useNotifications } from '@/hooks/useNotifications'

/**
 * モバイル用ボトムナビゲーション。
 *
 * 既存 src/components/layout/Sidebar.tsx と同じ 5項目・同じ href・同じアイコン・
 * 同じバッジロジックを踏襲。ただし表示条件が逆:
 *   Sidebar  ... `hidden md:block`（PCのみ）
 *   BottomNav ... `md:hidden`（モバイルのみ）
 *
 * 認証要・要確認アプリ画面でのみ表示。LP/login/signup/register/verify-email/
 * suspended など"未ログインでも到達するページ"では null を返す。
 */

const PUBLIC_ROUTE_PREFIXES = [
  '/login',
  '/signup',
  '/register',
  '/verify-email',
  '/auth',
] as const

const labels: Record<string, Record<string, string>> = {
  ja: {
    search: 'さがす',
    messages: 'メッセージ',
    matches: 'お相手から',
    footprints: '足跡',
    mypage: 'マイページ',
  },
  en: {
    search: 'Search',
    messages: 'Messages',
    matches: 'Likes',
    footprints: 'Footprints',
    mypage: 'My Page',
  },
  ko: {
    search: '검색',
    messages: '메시지',
    matches: '관심',
    footprints: '발자국',
    mypage: '마이페이지',
  },
  'zh-tw': {
    search: '搜尋',
    messages: '訊息',
    matches: '喜歡',
    footprints: '足跡',
    mypage: '我的頁面',
  },
}

export default function BottomNav() {
  const pathname = usePathname() ?? ''
  const { currentLanguage } = useLanguage()
  const { unreadMessages, unseenLikes, unreadFootprints, unreadNotifications } = useNotifications()

  // LP・認証前ページではボトムナビを表示しない
  if (pathname === '/') return null
  if (PUBLIC_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix))) return null

  const t = labels[currentLanguage] || labels.ja

  // Sidebar と完全に同じ 5項目・同じ href
  const items = [
    { id: 'search',     icon: Search,        labelKey: 'search',     href: '/matches',    badge: 0 },
    { id: 'messages',   icon: MessageCircle, labelKey: 'messages',   href: '/messages',   badge: unreadMessages },
    { id: 'liked',      icon: Heart,         labelKey: 'matches',    href: '/likes',      badge: unseenLikes },
    { id: 'footprints', icon: History,       labelKey: 'footprints', href: '/footprints', badge: unreadFootprints },
    { id: 'profile',    icon: User,          labelKey: 'mypage',     href: '/mypage',     badge: unreadNotifications },
  ] as const

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden shadow-[0_-2px_8px_rgba(0,0,0,0.05)]"
      style={{
        backgroundColor: 'var(--color-washi)',
        borderTop: '1px solid var(--color-gold)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label="モバイルナビゲーション"
    >
      <ul className="flex items-stretch justify-around h-16">
        {items.map(item => {
          const Icon = item.icon
          // Sidebar と同じアクティブ判定ロジック
          const isActive =
            pathname === item.href ||
            (item.href === '/matches' && pathname === '/') ||
            (pathname.startsWith('/profile') && item.id === 'profile') ||
            (item.href === '/mypage' && pathname.startsWith('/mypage'))

          return (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                className="flex flex-col items-center justify-center h-full gap-0.5 transition-colors"
                style={{ color: isActive ? 'var(--color-beni)' : 'var(--color-text-sub)' }}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.25 : 1.75} />
                  {item.badge > 0 && (
                    item.badge >= 10 ? (
                      <span
                        className="absolute -top-2 -right-3 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold"
                        aria-label={`${item.badge}件の未読`}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : (
                      <span
                        className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"
                        aria-label={`${item.badge}件の未読`}
                      />
                    )
                  )}
                </div>
                <span className="text-[10px] font-medium" style={{ letterSpacing: '0.04em' }}>
                  {t[item.labelKey]}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
