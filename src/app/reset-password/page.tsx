'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { authService } from '@/lib/auth'
import { Globe } from 'lucide-react'
import { determineLanguage, saveLanguagePreference, type SupportedLanguage } from '@/utils/language'
import { useTranslation } from '@/utils/translations'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('ja')
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 翻訳関数の取得
  const { t } = useTranslation(currentLanguage)

  // ページ読み込み時の言語検出
  useEffect(() => {
    const detectedLanguage = determineLanguage()
    setCurrentLanguage(detectedLanguage)
  }, [])

  useEffect(() => {
    const accessToken = searchParams?.get('access_token')
    const refreshToken = searchParams?.get('refresh_token')
    
    if (!accessToken || !refreshToken) {
      setError(t('resetPassword.invalidLinkError'))
    }
  }, [searchParams, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordMismatchError'))
      return
    }

    if (password.length < 8) {
      setError(t('resetPassword.passwordTooShortError'))
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      await authService.updatePassword(password)
      setMessage(t('resetPassword.successMessage'))
      
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || t('resetPassword.updateFailedError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sakura-50 to-sakura-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('resetPassword.title')}</h1>
            
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
          <p className="text-gray-600 text-center mt-2">
            {t('resetPassword.subtitle')}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {message}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('resetPassword.newPassword')}
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder={t('resetPassword.newPasswordPlaceholder')}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t('resetPassword.confirmPassword')}
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                className="w-full"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('resetPassword.updating') : t('resetPassword.updateButton')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}