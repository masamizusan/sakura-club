'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Search, 
  MessageCircle, 
  Heart, 
  History, 
  User
} from 'lucide-react'
import { useUnifiedTranslation } from '@/utils/translations'

interface SidebarProps {
  className?: string
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useUnifiedTranslation()
  
  // フォールバック機能付きの翻訳関数
  const getSafeTranslation = (key: string, fallback: string) => {
    const translation = t(key)
    // 翻訳が見つからない場合（キーがそのまま返される）はフォールバックを使用
    return translation === key ? fallback : translation
  }
  
  const sidebarItems = [
    { id: 'search', icon: Search, labelKey: 'sidebar.search', fallback: 'さがす', href: '/dashboard' },
    { id: 'messages', icon: MessageCircle, labelKey: 'sidebar.messages', fallback: 'メッセージ', href: '/messages' },
    { id: 'liked', icon: Heart, labelKey: 'sidebar.matches', fallback: 'お相手から', href: '/matches' },
    { id: 'footprints', icon: History, labelKey: 'sidebar.footprints', fallback: '足跡', href: '/footprints' },
    { id: 'profile', icon: User, labelKey: 'sidebar.mypage', fallback: 'マイページ', href: '/mypage' },
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

        <nav className="space-y-2 sticky top-8">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href === '/dashboard' && pathname === '/') ||
              (pathname?.startsWith('/profile') && item.id === 'profile')
            
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
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{getSafeTranslation(item.labelKey, item.fallback)}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}