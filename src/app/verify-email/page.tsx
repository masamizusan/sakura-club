'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, Loader2, ArrowRight, Globe } from 'lucide-react'
import { authService } from '@/lib/auth'
import { determineLanguage, saveLanguagePreference, type SupportedLanguage } from '@/utils/language'
import { useTranslation } from '@/utils/translations'
import Link from 'next/link'

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired'

function VerifyEmailContent() {
  const [status, setStatus] = useState<VerificationStatus>('loading')
  const [error, setError] = useState('')
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('ja')
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // 翻訳関数の取得
  const { t } = useTranslation(currentLanguage)

  // ページ読み込み時の言語検出
  useEffect(() => {
    const detectedLanguage = determineLanguage()
    setCurrentLanguage(detectedLanguage)
  }, [])
  
  const token = searchParams?.get('token')
  const email = searchParams?.get('email')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token || !email) {
        setStatus('error')
        setError(t('verifyEmail.error.invalidUrlError'))
        return
      }

      try {
        const result = await authService.verifyOtp({
          email: email,
          token: token,
          type: 'signup'
        })
        
        setStatus('success')
        
        // ユーザー情報を取得して性別に応じて遷移先を決定
        setTimeout(async () => {
          try {
            const user = await authService.getCurrentUser()
            if (user?.gender === 'male') {
              router.push('/profile/edit?type=foreign-male')
            } else {
              router.push('/profile/edit?type=japanese-female')
            }
          } catch (error) {
            // エラーの場合はデフォルトのプロフィール編集画面に遷移
            router.push('/profile/edit')
          }
        }, 3000)
      } catch (error: any) {
        console.error('Email verification error:', error)
        if (error.message?.includes('expired')) {
          setStatus('expired')
        } else {
          setStatus('error')
          setError(t('verifyEmail.error.verificationFailedError'))
        }
      }
    }

    verifyEmail()
  }, [token, email, router, t])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Header with Language Switcher */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{t('verifyEmail.loading.title')}</h1>
              
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
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <p className="text-gray-600 whitespace-pre-line">
                {t('verifyEmail.loading.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Header with Language Switcher */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{t('verifyEmail.success.title')}</h1>
              
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
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-600 mb-6 whitespace-pre-line">
                {t('verifyEmail.success.subtitle')}
              </p>
              <div className="bg-sakura-50 border border-sakura-200 rounded-lg p-4 mb-6">
                <p className="text-sakura-800 text-sm">
                  {t('verifyEmail.success.autoRedirectNotice')}<br />
                  <span className="text-xs text-sakura-600">{t('verifyEmail.success.autoRedirectTime')}</span>
                </p>
              </div>
              <Button 
                onClick={async () => {
                  try {
                    const user = await authService.getCurrentUser()
                    if (user?.gender === 'male') {
                      router.push('/profile/edit?type=foreign-male')
                    } else {
                      router.push('/profile/edit?type=japanese-female')
                    }
                  } catch (error) {
                    router.push('/profile/edit')
                  }
                }}
                className="w-full bg-sakura-600 hover:bg-sakura-700 text-white"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                {t('verifyEmail.success.proceedButton')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header with Language Switcher */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {status === 'expired' ? t('verifyEmail.error.expiredTitle') : t('verifyEmail.error.title')}
            </h1>
            
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
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-gray-600 mb-6">
              {status === 'expired' 
                ? t('verifyEmail.error.expiredDescription')
                : error || t('verifyEmail.error.description')
              }
            </p>
            <div className="space-y-3">
              <Link href="/signup">
                <Button className="w-full bg-sakura-600 hover:bg-sakura-700 text-white">
                  {t('verifyEmail.error.signupButton')}
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  {t('verifyEmail.error.loginButton')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('ja')
  const { t } = useTranslation(currentLanguage)

  useEffect(() => {
    const detectedLanguage = determineLanguage()
    setCurrentLanguage(detectedLanguage)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('verifyEmail.loadingFallback.title')}</h2>
          <p className="text-gray-600">
            {t('verifyEmail.loadingFallback.description')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  )
}