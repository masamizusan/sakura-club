'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, Heart, Shield, Globe } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { determineLanguage, saveLanguagePreference, type SupportedLanguage } from '@/utils/language'
import { useTranslation } from '@/utils/translations'

export default function HomePage() {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('ja')
  const { t } = useTranslation(currentLanguage)

  // ページ読み込み時の言語検出
  useEffect(() => {
    const detectedLanguage = determineLanguage()
    setCurrentLanguage(detectedLanguage)
  }, [])

  return (
    <div className="min-h-screen">
      <Header currentLanguage={currentLanguage} setCurrentLanguage={setCurrentLanguage} t={t} />
      <HeroSection t={t} />
      <FeaturesSection t={t} />
    </div>
  )
}

function Header({ currentLanguage, setCurrentLanguage, t }: { currentLanguage: SupportedLanguage, setCurrentLanguage: (lang: SupportedLanguage) => void, t: any }) {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sakura-400 to-sakura-600 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-red-500">Sakura Club</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-600 hover:text-gray-900">{t('homepage.aboutService')}</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">{t('homepage.howItWorks')}</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">{t('homepage.safetyAndSecurity')}</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">{t('homepage.culturalExperience')}</a>
          </nav>

          {/* Language & Auth Buttons */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <Select value={currentLanguage} onValueChange={(value: SupportedLanguage) => {
                setCurrentLanguage(value)
                saveLanguagePreference(value)
              }}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="zh-tw">繁體中文</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Link href="/login">
              <Button variant="outline">{t('homepage.login')}</Button>
            </Link>
            <Link href="/signup">
              <Button variant="sakura">{t('homepage.signup')}</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

function HeroSection({ t }: { t: any }) {
  return (
    <section className="bg-gradient-to-br from-pink-50 via-white to-sakura-50 py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                {t('homepage.heroTitle')}
                <br />
                <span className="text-red-500">{t('homepage.heroSubtitle')}</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-line">
                {t('homepage.heroDescription')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-red-500 hover:bg-red-600 text-white px-8 py-3">
                  {t('homepage.getStartedFree')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="px-8 py-3">
                  {t('homepage.loginHere')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative w-full">
            <div className="aspect-[5/4] bg-gradient-to-br from-green-100 to-green-200 rounded-2xl overflow-hidden shadow-lg">
              {/* Main photo */}
              <img 
                src="/hero-image.png" 
                alt="文化体験を楽しむカップル"
                className="w-full h-full object-cover object-center"
              />
            </div>
            
            {/* Heart icon overlay */}
            <div className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection({ t }: { t: any }) {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {/* 安心・安全 */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{t('homepage.safetyTitle')}</h3>
            <p className="text-gray-600 whitespace-pre-line">
              {t('homepage.safetyDescription')}
            </p>
          </div>

          {/* 文化交流 */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8 text-pink-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{t('homepage.culturalExchangeTitle')}</h3>
            <p className="text-gray-600 whitespace-pre-line">
              {t('homepage.culturalExchangeDescription')}
            </p>
          </div>

          {/* 国際交流 */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Globe className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{t('homepage.internationalExchangeTitle')}</h3>
            <p className="text-gray-600 whitespace-pre-line">
              {t('homepage.internationalExchangeDescription')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}