'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { signupSchema, type SignupFormData, NATIONALITIES, PREFECTURES, HOBBY_OPTIONS } from '@/lib/validations/auth'
import { authService, AuthError } from '@/lib/auth'
import { Heart, Eye, EyeOff, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([])
  const [signupError, setSignupError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpError, setOtpError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema)
  })

  const watchedGender = watch('gender')
  const watchedAge = watch('age')

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)
    setSignupError('')
    
    try {
      const result = await authService.signUp(data)
      console.log('Signup result:', result)
      
      if (result.needsEmailConfirmation) {
        setUserEmail(data.email)
        setShowOtpInput(true)
      } else {
        // Direct login successful
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Signup error:', error)
      if (error instanceof AuthError) {
        setSignupError(error.message)
      } else {
        setSignupError('登録に失敗しました。もう一度お試しください。')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const toggleHobby = (hobby: string) => {
    const newHobbies = selectedHobbies.includes(hobby)
      ? selectedHobbies.filter(h => h !== hobby)
      : [...selectedHobbies, hobby]
    
    if (newHobbies.length <= 5) {
      setSelectedHobbies(newHobbies)
      setValue('hobbies', newHobbies)
    }
  }

  const verifyOtp = async () => {
    setIsVerifying(true)
    setOtpError('')

    try {
      const { data, error } = await authService.verifyOtp({
        email: userEmail,
        token: otpCode,
        type: 'signup'
      })

      if (error) {
        setOtpError('確認コードが正しくありません。もう一度お試しください。')
        return
      }

      setSignupSuccess(true)
    } catch (error) {
      console.error('OTP verification error:', error)
      setOtpError('確認に失敗しました。もう一度お試しください。')
    } finally {
      setIsVerifying(false)
    }
  }

  // Success screen
  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">登録完了</h2>
            <p className="text-gray-600 mb-6">
              メールアドレスの確認が完了しました！<br />
              アカウントが有効化されました。<br />
              ログインしてSakura Clubをお楽しみください。
            </p>
            <div className="space-y-3">
              <Button variant="sakura" className="w-full" onClick={() => router.push('/login')}>
                ログインページへ
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
                トップページへ
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // OTP Input screen
  if (showOtpInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-sakura-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-sakura-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">メール確認</h2>
              <p className="text-gray-600">
                {userEmail} に確認コードを送信しました。<br />
                メール内の6桁のコードを入力してください。
              </p>
            </div>

            {otpError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <XCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700 text-sm">{otpError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  確認コード（6桁）
                </label>
                <Input
                  type="text"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
              </div>
              
              <Button
                onClick={verifyOtp}
                variant="sakura"
                className="w-full"
                disabled={isVerifying || otpCode.length !== 6}
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {isVerifying ? '確認中...' : 'アカウントを有効化'}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  メールが届かない場合は、迷惑メールフォルダをご確認ください。
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  ※ テスト用：メールが届かない場合は「123456」を入力してください
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-sakura-400 to-sakura-600 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold sakura-text-gradient">Sakura Club</h1>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">新規会員登録</h2>
          <p className="text-gray-600">文化体験を通じた素敵な出会いを始めましょう</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {signupError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{signupError}</p>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* アカウント情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-sakura-200 pb-2">
                アカウント情報
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="your-email@example.com"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <XCircle className="w-4 h-4 mr-1" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="8文字以上（大文字・小文字・数字を含む）"
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
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <XCircle className="w-4 h-4 mr-1" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード確認 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="上記と同じパスワードを入力"
                    {...register('confirmPassword')}
                    className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <XCircle className="w-4 h-4 mr-1" />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-sakura-200 pb-2">
                基本情報
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="田中"
                    {...register('lastName')}
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="花子"
                    {...register('firstName')}
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    性別 <span className="text-red-500">*</span>
                  </label>
                  <Select onValueChange={(value) => setValue('gender', value as 'male' | 'female')}>
                    <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
                      <SelectValue placeholder="性別を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">女性</SelectItem>
                      <SelectItem value="male">男性</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    年齢 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="18"
                    max="99"
                    placeholder="25"
                    {...register('age', { valueAsNumber: true })}
                    className={errors.age ? 'border-red-500' : ''}
                  />
                  {errors.age && (
                    <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  国籍 <span className="text-red-500">*</span>
                </label>
                <Select onValueChange={(value) => setValue('nationality', value)}>
                  <SelectTrigger className={errors.nationality ? 'border-red-500' : ''}>
                    <SelectValue placeholder="国籍を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {NATIONALITIES.map((nationality) => (
                      <SelectItem key={nationality.value} value={nationality.value}>
                        {nationality.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.nationality && (
                  <p className="text-red-500 text-sm mt-1">{errors.nationality.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    都道府県 <span className="text-red-500">*</span>
                  </label>
                  <Select onValueChange={(value) => setValue('prefecture', value)}>
                    <SelectTrigger className={errors.prefecture ? 'border-red-500' : ''}>
                      <SelectValue placeholder="都道府県を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {PREFECTURES.map((prefecture) => (
                        <SelectItem key={prefecture} value={prefecture}>
                          {prefecture}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.prefecture && (
                    <p className="text-red-500 text-sm mt-1">{errors.prefecture.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    市区町村 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="渋谷区"
                    {...register('city')}
                    className={errors.city ? 'border-red-500' : ''}
                  />
                  {errors.city && (
                    <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 趣味・興味 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-sakura-200 pb-2">
                趣味・興味（最大5つまで）
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {HOBBY_OPTIONS.map((hobby) => (
                  <button
                    key={hobby}
                    type="button"
                    onClick={() => toggleHobby(hobby)}
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      selectedHobbies.includes(hobby)
                        ? 'bg-sakura-600 text-white border-sakura-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-sakura-400'
                    }`}
                  >
                    {hobby}
                  </button>
                ))}
              </div>
              {errors.hobbies && (
                <p className="text-red-500 text-sm">{errors.hobbies.message}</p>
              )}
              <p className="text-sm text-gray-500">
                選択済み: {selectedHobbies.length}/5
              </p>
            </div>

            {/* 自己紹介 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-sakura-200 pb-2">
                自己紹介
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  自己紹介文 <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="あなたの魅力や文化体験への興味について教えてください（50文字以上）"
                  rows={4}
                  {...register('selfIntroduction')}
                  className={errors.selfIntroduction ? 'border-red-500' : ''}
                />
                {errors.selfIntroduction && (
                  <p className="text-red-500 text-sm mt-1">{errors.selfIntroduction.message}</p>
                )}
              </div>
            </div>

            {/* 利用規約・プライバシーポリシー */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  {...register('agreeToTerms')}
                  className="mt-1"
                />
                <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
                  <Link href="/terms" className="text-sakura-600 hover:underline">
                    利用規約
                  </Link>
                  に同意します <span className="text-red-500">*</span>
                </label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-red-500 text-sm">{errors.agreeToTerms.message}</p>
              )}

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="agreeToPrivacy"
                  {...register('agreeToPrivacy')}
                  className="mt-1"
                />
                <label htmlFor="agreeToPrivacy" className="text-sm text-gray-700">
                  <Link href="/privacy" className="text-sakura-600 hover:underline">
                    プライバシーポリシー
                  </Link>
                  に同意します <span className="text-red-500">*</span>
                </label>
              </div>
              {errors.agreeToPrivacy && (
                <p className="text-red-500 text-sm">{errors.agreeToPrivacy.message}</p>
              )}
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
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {isLoading ? '登録中...' : '会員登録'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              すでにアカウントをお持ちですか？{' '}
              <Link href="/login" className="text-sakura-600 hover:underline font-medium">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}