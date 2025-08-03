'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PREFECTURES } from '@/lib/validations/auth'
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  AlertCircle, 
  Calendar,
  MapPin,
  Users,
  DollarSign,
  FileText,
  CheckCircle
} from 'lucide-react'
import { z } from 'zod'

const experienceCreateSchema = z.object({
  title: z.string().min(1, 'タイトルを入力してください').max(100, 'タイトルは100文字以内で入力してください'),
  description: z.string().min(20, '説明は20文字以上で入力してください').max(200, '説明は200文字以内で入力してください'),
  fullDescription: z.string().min(100, '詳細説明は100文字以上で入力してください').max(2000, '詳細説明は2000文字以内で入力してください'),
  category: z.string().min(1, 'カテゴリを選択してください'),
  date: z.string().min(1, '開催日を選択してください'),
  timeStart: z.string().min(1, '開始時間を選択してください'),
  timeEnd: z.string().min(1, '終了時間を選択してください'),
  location: z.string().min(1, '開催場所名を入力してください').max(100, '開催場所名は100文字以内で入力してください'),
  address: z.string().min(1, '住所を入力してください').max(200, '住所は200文字以内で入力してください'),
  prefecture: z.string().min(1, '都道府県を選択してください'),
  city: z.string().min(1, '市区町村を入力してください').max(50, '市区町村は50文字以内で入力してください'),
  maxParticipants: z.number().min(1, '最大参加者数は1名以上で入力してください').max(50, '最大参加者数は50名以下で入力してください'),
  price: z.number().min(0, '料金は0円以上で入力してください').max(100000, '料金は100,000円以下で入力してください'),
  included: z.string().min(1, '体験に含まれるものを入力してください'),
  toBring: z.string().optional(),
  requirements: z.string().optional(),
})

type ExperienceCreateFormData = z.infer<typeof experienceCreateSchema>

const CATEGORIES = ['茶道', '書道', '料理', '着物', '華道', '剣道', '音楽', 'その他']

export default function ExperienceCreatePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ExperienceCreateFormData>({
    resolver: zodResolver(experienceCreateSchema),
    defaultValues: {
      maxParticipants: 1,
      price: 0
    }
  })

  const onSubmit = async (data: ExperienceCreateFormData) => {
    setIsLoading(true)
    setError('')
    setSuccess(false)
    
    try {
      const response = await fetch('/api/experiences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '文化体験の作成に失敗しました')
      }
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/experiences')
      }, 2000)
    } catch (error) {
      console.error('Experience creation error:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('文化体験の作成に失敗しました。もう一度お試しください。')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">作成完了</h2>
            <p className="text-gray-600 mb-6">
              文化体験が正常に作成されました。<br />
              体験一覧ページに移動します...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
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
            <h1 className="text-3xl font-bold text-gray-900">文化体験を企画する</h1>
            <p className="text-gray-600">新しい文化体験を作成して、参加者を募集しましょう</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* 基本情報 */}
            <div className="space-y-6">
              <div className="flex items-center border-b border-sakura-200 pb-2">
                <FileText className="w-5 h-5 text-sakura-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">基本情報</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  体験タイトル <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="例: 伝統的な茶道体験"
                  {...register('title')}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリ <span className="text-red-500">*</span>
                </label>
                <Select onValueChange={(value) => setValue('category', value)}>
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="カテゴリを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  概要説明 <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="体験の概要を簡潔に説明してください（20-200文字）"
                  rows={3}
                  {...register('description')}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  詳細説明 <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="体験の詳細な内容、魅力、学べることなどを詳しく説明してください（100-2000文字）"
                  rows={6}
                  {...register('fullDescription')}
                  className={errors.fullDescription ? 'border-red-500' : ''}
                />
                {errors.fullDescription && (
                  <p className="text-red-500 text-sm mt-1">{errors.fullDescription.message}</p>
                )}
              </div>
            </div>

            {/* 開催情報 */}
            <div className="space-y-6">
              <div className="flex items-center border-b border-sakura-200 pb-2">
                <Calendar className="w-5 h-5 text-sakura-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">開催情報</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    開催日 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    {...register('date')}
                    className={errors.date ? 'border-red-500' : ''}
                  />
                  {errors.date && (
                    <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    開始時間 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="time"
                    {...register('timeStart')}
                    className={errors.timeStart ? 'border-red-500' : ''}
                  />
                  {errors.timeStart && (
                    <p className="text-red-500 text-sm mt-1">{errors.timeStart.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    終了時間 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="time"
                    {...register('timeEnd')}
                    className={errors.timeEnd ? 'border-red-500' : ''}
                  />
                  {errors.timeEnd && (
                    <p className="text-red-500 text-sm mt-1">{errors.timeEnd.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 場所情報 */}
            <div className="space-y-6">
              <div className="flex items-center border-b border-sakura-200 pb-2">
                <MapPin className="w-5 h-5 text-sakura-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">開催場所</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  場所名 <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="例: 表参道茶道会館"
                  {...register('location')}
                  className={errors.location ? 'border-red-500' : ''}
                />
                {errors.location && (
                  <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  住所 <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="例: 東京都渋谷区神宮前4-12-10"
                  {...register('address')}
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && (
                  <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    市区町村 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="例: 渋谷区"
                    {...register('city')}
                    className={errors.city ? 'border-red-500' : ''}
                  />
                  {errors.city && (
                    <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 参加者・料金情報 */}
            <div className="space-y-6">
              <div className="flex items-center border-b border-sakura-200 pb-2">
                <Users className="w-5 h-5 text-sakura-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">参加者・料金</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大参加者数 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="例: 8"
                    {...register('maxParticipants', { valueAsNumber: true })}
                    className={errors.maxParticipants ? 'border-red-500' : ''}
                  />
                  {errors.maxParticipants && (
                    <p className="text-red-500 text-sm mt-1">{errors.maxParticipants.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    参加料金（円） <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="number"
                      min="0"
                      max="100000"
                      placeholder="例: 3500"
                      {...register('price', { valueAsNumber: true })}
                      className={`pl-10 ${errors.price ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.price && (
                    <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 追加情報 */}
            <div className="space-y-6">
              <div className="flex items-center border-b border-sakura-200 pb-2">
                <CheckCircle className="w-5 h-5 text-sakura-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">詳細情報</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  体験に含まれるもの <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="例: 茶道具一式の使用、抹茶・季節の和菓子、茶道の基本レッスン、修了証（希望者のみ）&#10;※1行ずつ項目を記載してください"
                  rows={4}
                  {...register('included')}
                  className={errors.included ? 'border-red-500' : ''}
                />
                {errors.included && (
                  <p className="text-red-500 text-sm mt-1">{errors.included.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  持参していただくもの
                </label>
                <Textarea
                  placeholder="例: 特にありません、着物での参加も歓迎（着付けサービスなし）&#10;※1行ずつ項目を記載してください"
                  rows={3}
                  {...register('toBring')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  注意事項・参加条件
                </label>
                <Textarea
                  placeholder="例: 正座が困難な方はご相談ください、和室での体験のため清潔な靴下をご着用ください&#10;※1行ずつ項目を記載してください"
                  rows={3}
                  {...register('requirements')}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t">
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
                {isLoading ? '作成中...' : '体験を作成する'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}