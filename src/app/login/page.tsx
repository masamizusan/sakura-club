'use client'

import { Suspense, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { authService, AuthError } from '@/lib/auth'
import { Heart, Eye, EyeOff, Loader2, LogIn, AlertCircle, Globe } from 'lucide-react'
import { type SupportedLanguage } from '@/utils/language'
import { useUnifiedTranslation } from '@/utils/translations'
import { useLanguageAwareRouter, navigateWithLanguage } from '@/utils/languageNavigation'
import { UnifiedLanguageSwitcher } from '@/components/ui/unified-language-switcher'

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const router = useRouter()
  const languageRouter = useLanguageAwareRouter()
  const searchParams = useSearchParams()
  
  // 통합 번역 시스템
  const { t, language: currentLanguage } = useUnifiedTranslation()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setLoginError('')
    
    try {
      console.log('Attempting login with:', { email: data.email })
      const result = await authService.signIn(data)
      console.log('Login successful:', result)
      
      // Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Check for redirect parameter
      const redirectTo = searchParams?.get('redirectTo')
      const destination = redirectTo || '/dashboard'
      
      console.log('Redirecting to:', destination)
      
      // 언어 인식 네비게이션으로 언어 상태 유지
      if (redirectTo) {
        navigateWithLanguage(destination)
      } else {
        languageRouter.push(destination)
        router.refresh()
      }
    } catch (error) {
      console.error('Login error:', error)
      
      if (error instanceof AuthError) {
        setLoginError(error.message)
      } else if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('Invalid value')) {
          setLoginError(t('login.serverError'))
        } else {
          setLoginError(`${t('login.errorPrefix')}${error.message}`)
        }
      } else {
        setLoginError(t('login.loginFailed'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-sakura-400 to-sakura-600 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold sakura-text-gradient">Sakura Club</h1>
            </div>
            
            {/* Language Switcher */}
            <UnifiedLanguageSwitcher size="sm" showIcon={true} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('login.title')}</h2>
          <p className="text-gray-600">{t('login.subtitle')}</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('login.emailAddress')}
              </label>
              <Input
                type="email"
                placeholder={t('login.emailPlaceholder')}
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('login.password')}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder')}
                  {...register('password')}
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  {...register('rememberMe')}
                  className="h-4 w-4 text-sakura-600 focus:ring-sakura-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                  {t('login.rememberMe')}
                </label>
              </div>

              <Link 
                href="/reset-password" 
                className="text-sm text-sakura-600 hover:underline"
              >
                {t('login.forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              variant="sakura"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              {isLoading ? t('login.loggingIn') : t('login.loginButton')}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t('login.orDivider')}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button variant="outline" className="w-full" type="button">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('login.googleLogin')}
              </Button>

              <Button variant="outline" className="w-full" type="button">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                {t('login.facebookLogin')}
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              {t('login.signupPrompt')}{' '}
              <Link href="/signup" className="text-sakura-600 hover:underline font-medium">
                {t('login.signupLink')}
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 whitespace-pre-line">
            {t('login.securityNote')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}