'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageUpload } from '@/components/ui/image-upload'
import { NATIONALITIES, PREFECTURES, HOBBY_OPTIONS } from '@/lib/validations/auth'
import { authService, AuthError } from '@/lib/auth'
import { User, Save, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { z } from 'zod'

const profileEditSchema = z.object({
  firstName: z.string().min(1, '名を入力してください').max(50, '名は50文字以内で入力してください'),
  lastName: z.string().min(1, '姓を入力してください').max(50, '姓は50文字以内で入力してください'),
  gender: z.enum(['male', 'female'], { required_error: '性別を選択してください' }),
  age: z.number().min(18, '18歳以上である必要があります').max(99, '99歳以下で入力してください'),
  nationality: z.string().min(1, '国籍を選択してください'),
  prefecture: z.string().min(1, '都道府県を選択してください'),
  city: z.string().min(1, '市区町村を入力してください').max(100, '市区町村は100文字以内で入力してください'),
  hobbies: z.array(z.string()).min(1, '最低1つの趣味を選択してください').max(5, '趣味は最大5つまで選択できます'),
  selfIntroduction: z.string().min(50, '自己紹介は50文字以上で入力してください').max(1000, '自己紹介は1000文字以内で入力してください'),
})

type ProfileEditFormData = z.infer<typeof profileEditSchema>

export default function ProfileEditPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [userLoading, setUserLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema)
  })

  // Load current user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await authService.getCurrentUser()
        if (user) {
          console.log('Loaded user data:', JSON.stringify(user, null, 2)) // デバッグ用
          
          setCurrentUser(user)
          setCurrentImageUrl(user.avatarUrl || '')
          
          // フォームフィールドをリセット
          reset({
            firstName: user.firstName,
            lastName: user.lastName,
            gender: user.gender,
            age: user.age,
            nationality: user.nationality,
            prefecture: user.prefecture,
            city: user.city,
            hobbies: user.hobbies,
            selfIntroduction: user.selfIntroduction,
          })
          
          // Select要素の値を個別に設定
          setValue('gender', user.gender)
          setValue('nationality', user.nationality)
          setValue('prefecture', user.prefecture)
          setValue('hobbies', user.hobbies)
          
          setSelectedHobbies(user.hobbies)
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        setError('ユーザー情報の読み込みに失敗しました')
      } finally {
        setUserLoading(false)
      }
    }

    loadUserData()
  }, [reset, router, setValue])

  const onSubmit = async (data: ProfileEditFormData) => {
    setIsLoading(true)
    setError('')
    setSuccess(false)
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'プロフィールの更新に失敗しました')
      }
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error) {
      console.error('Profile update error:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('プロフィールの更新に失敗しました。もう一度お試しください。')
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

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sakura-600" />
          <p className="text-gray-600">プロフィール情報を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Save className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">更新完了</h2>
            <p className="text-gray-600 mb-6">
              プロフィール情報が正常に更新されました。<br />
              プロフィールページに移動します...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">プロフィール編集</h1>
            <p className="text-gray-600">あなたの情報を更新してください</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* プロフィール画像 */}
            {currentUser && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-sakura-200 pb-2">
                  プロフィール画像
                </h3>
                <div className="flex justify-center">
                  <ImageUpload
                    currentImageUrl={currentImageUrl}
                    onImageUpload={(imageUrl) => setCurrentImageUrl(imageUrl)}
                    onImageRemove={() => setCurrentImageUrl('')}
                    userId={currentUser.id}
                  />
                </div>
              </div>
            )}

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
                  <Select 
                    value={watch('gender')} 
                    onValueChange={(value) => setValue('gender', value as 'male' | 'female')}
                  >
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
                <Select 
                  value={watch('nationality')} 
                  onValueChange={(value) => setValue('nationality', value)}
                >
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
                  <Select 
                    value={watch('prefecture')} 
                    onValueChange={(value) => setValue('prefecture', value)}
                  >
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

            <div className="flex gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="sakura"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isLoading ? '更新中...' : '更新する'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}