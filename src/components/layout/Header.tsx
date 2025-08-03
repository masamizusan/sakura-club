'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/ui/notification-bell'
import { LanguageSwitcher, LanguageSwitcherCompact } from '@/components/ui/language-switcher'
import { useAuth } from '@/store/authStore'
import { useAuthStore } from '@/store/authStore'
import { Menu, X, User, Heart, LogOut } from 'lucide-react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, isLoading, isAuthenticated } = useAuth()
  const signOut = useAuthStore((state) => state.signOut)
  const t = useTranslations('navigation')
  const tCommon = useTranslations('common')
  const tAuth = useTranslations('auth')

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-sakura-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-sakura-400 to-sakura-600 rounded-full flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold sakura-text-gradient">Sakura Club</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/about" className="text-gray-700 hover:text-sakura-600 transition-colors">
            {t('about')}
          </Link>
          <Link href="/how-it-works" className="text-gray-700 hover:text-sakura-600 transition-colors">
            {t('howItWorks')}
          </Link>
          <Link href="/safety" className="text-gray-700 hover:text-sakura-600 transition-colors">
            {t('safety')}
          </Link>
          <Link href="/experiences" className="text-gray-700 hover:text-sakura-600 transition-colors">
            {t('experiences')}
          </Link>
          {isAuthenticated && user && (
            <>
              <Link href="/matches" className="text-gray-700 hover:text-sakura-600 transition-colors">
                {t('matches')}
              </Link>
              <Link href="/messages" className="text-gray-700 hover:text-sakura-600 transition-colors">
                {t('messages')}
              </Link>
            </>
          )}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <LanguageSwitcher />
          
          {isLoading ? (
            <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
          ) : isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              <NotificationBell />
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <User className="w-4 h-4 mr-2" />
                  {user.firstName}さん
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                {tCommon('logout')}
              </Button>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  {tCommon('login')}
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="sakura" size="sm">
                  {tCommon('signup')}
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-sakura-100">
          <nav className="container mx-auto px-4 py-4 space-y-4">
            <Link href="/about" className="block text-gray-700 hover:text-sakura-600">
              {t('about')}
            </Link>
            <Link href="/how-it-works" className="block text-gray-700 hover:text-sakura-600">
              {t('howItWorks')}
            </Link>
            <Link href="/safety" className="block text-gray-700 hover:text-sakura-600">
              {t('safety')}
            </Link>
            <Link href="/experiences" className="block text-gray-700 hover:text-sakura-600">
              {t('experiences')}
            </Link>
            {isAuthenticated && user && (
              <>
                <Link href="/matches" className="block text-gray-700 hover:text-sakura-600">
                  {t('matches')}
                </Link>
                <Link href="/messages" className="block text-gray-700 hover:text-sakura-600">
                  {t('messages')}
                </Link>
              </>
            )}
            <div className="pt-4 border-t border-sakura-100">
              <div className="mb-3">
                <LanguageSwitcherCompact />
              </div>
              {isAuthenticated && user ? (
                <div className="space-y-3">
                  <Link href="/dashboard" className="w-full">
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <User className="w-4 h-4 mr-2" />
                      {user.firstName}さんの{t('dashboard')}
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {tCommon('logout')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link href="/login" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      {tCommon('login')}
                    </Button>
                  </Link>
                  <Link href="/signup" className="flex-1">
                    <Button variant="sakura" size="sm" className="w-full">
                      {tCommon('signup')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}