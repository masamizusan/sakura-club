'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, Mail, ArrowLeft, AlertCircle, Loader2, Globe } from 'lucide-react'
import Link from 'next/link'
import { determineLanguage, saveLanguagePreference, type SupportedLanguage } from '@/utils/language'
import { useTranslation } from '@/utils/translations'

function RegisterCompleteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams?.get('email')
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('ja')
  
  // 翻訳関数の取得
  const { t } = useTranslation(currentLanguage)

  // ページ読み込み時の言語検出
  useEffect(() => {
    const detectedLanguage = determineLanguage()
    setCurrentLanguage(detectedLanguage)
  }, [])

  if (!email) {
    return (
      <div className="min-h-screen bg-[#f5ebe0] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('registerComplete.errorTitle')}</h2>
            <p className="text-gray-600 mb-6 whitespace-pre-line">
              {t('registerComplete.errorDescription')}
            </p>
            <Link href="/signup">
              <Button className="w-full bg-[#8b1a2e] hover:bg-[#6e1525] text-white">
                {t('registerComplete.backToSignup')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5ebe0]">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{t('registerComplete.title')}</h1>
              
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
                    <SelectItem value="zh-tw">繁體中文（台灣）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('registerComplete.title')}</h2>
              <p className="text-gray-600 mb-6">
                {t('registerComplete.subtitle')}
              </p>
            </div>

            {/* Email Verification Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">{t('registerComplete.emailVerificationTitle')}</h3>
                  <p className="text-blue-800 text-sm mb-2">
                    {t('registerComplete.emailVerificationDescription')}
                  </p>
                  <p className="font-medium text-blue-900 text-sm">
                    {t('registerComplete.sentTo')}{email}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-sm text-gray-600">
              <p>
                {t('registerComplete.instructions')}
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">{t('registerComplete.troubleshootingTitle')}</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• {t('registerComplete.troubleshootingSpam')}</li>
                      <li>• {t('registerComplete.troubleshootingEmailCheck')}</li>
                      <li>• {t('registerComplete.troubleshootingDomain')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 space-y-3">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  {t('registerComplete.loginButton')}
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('registerComplete.backToHome')}
                </Button>
              </Link>
            </div>

            {/* Help */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                {t('registerComplete.helpNote')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5ebe0] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h2>
            <p className="text-gray-600">
              Please wait...
            </p>
          </div>
        </div>
      </div>
    }>
      <RegisterCompleteContent />
    </Suspense>
  )
}