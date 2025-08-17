'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/store/authStore'
import { createClient } from '@/lib/supabase'
import AuthGuard from '@/components/auth/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import { User, Save, ArrowLeft, Loader2, AlertCircle, Briefcase, Heart } from 'lucide-react'
import { z } from 'zod'

const profileEditSchema = z.object({
  first_name: z.string().min(1, '名前を入力してください').max(50, '名前は50文字以内で入力してください'),
  last_name: z.string().min(1, '姓を入力してください').max(50, '姓は50文字以内で入力してください'),
  gender: z.enum(['male', 'female'], { required_error: '性別を選択してください' }),
  age: z.number().min(18, '18歳以上である必要があります').max(99, '99歳以下で入力してください'),
  nationality: z.string().min(1, '国籍を入力してください'),
  prefecture: z.string().min(1, '都道府県を入力してください'),
  city: z.string().min(1, '市区町村を入力してください'),
  occupation: z.string().optional(),
  height: z.number().min(120, '身長は120cm以上で入力してください').max(250, '身長は250cm以下で入力してください').optional().or(z.literal('')),
  education: z.string().optional(),
  hobbies: z.array(z.string()).min(1, '趣味を1つ以上選択してください').max(8, '趣味は8つまで選択できます'),
  personality: z.array(z.string()).max(5, '性格は5つまで選択できます').optional(),
  dating_purpose: z.string().optional(),
  ideal_relationship: z.string().optional(),
  self_introduction: z.string().min(10, '自己紹介は10文字以上で入力してください').max(1000, '自己紹介は1000文字以内で入力してください'),
  cultural_interests: z.array(z.string()).max(5, '文化的興味は5つまで選択できます').optional(),
})

type ProfileEditFormData = z.infer<typeof profileEditSchema>

function ProfileEditContent() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [userLoading, setUserLoading] = useState(true)
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([])
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([])
  const [selectedCulturalInterests, setSelectedCulturalInterests] = useState<string[]>([])
  const [profileCompletion, setProfileCompletion] = useState(0)
  const router = useRouter()
  const supabase = createClient()

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
      if (!user) {
        router.push('/login')
        return
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          console.error('Profile load error:', profileError)
          setError('プロフィール情報の読み込みに失敗しました')
          setUserLoading(false)
          return
        }

        console.log('Loaded profile data:', profile)
        
        // フォームフィールドをリセット
        reset({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          gender: profile.gender || 'female',
          age: profile.age || 18,
          nationality: profile.nationality || '',
          prefecture: profile.prefecture || '',
          city: profile.city || '',
          occupation: profile.occupation || '',
          height: profile.height || '',
          education: profile.education || '',
          hobbies: profile.hobbies || [],
          personality: profile.personality || [],
          dating_purpose: profile.dating_purpose || '',
          ideal_relationship: profile.ideal_relationship || '',
          self_introduction: profile.self_introduction || '',
          cultural_interests: profile.cultural_interests || [],
        })
        
        // Select要素の値を個別に設定
        setValue('gender', profile.gender || 'female')
        setValue('nationality', profile.nationality || '')
        setValue('prefecture', profile.prefecture || '')
        setValue('hobbies', profile.hobbies || [])
        setValue('personality', profile.personality || [])
        setValue('cultural_interests', profile.cultural_interests || [])
        
        setSelectedHobbies(profile.hobbies || [])
        setSelectedPersonality(profile.personality || [])
        setSelectedCulturalInterests(profile.cultural_interests || [])
        
        // プロフィール完成度を計算
        calculateProfileCompletion(profile)
      } catch (error) {
        console.error('Error loading user data:', error)
        setError('ユーザー情報の読み込みに失敗しました')
      } finally {
        setUserLoading(false)
      }
    }

    loadUserData()
  }, [user, reset, router, setValue, supabase])

  const calculateProfileCompletion = (profileData: any) => {
    const requiredFields = [
      'first_name', 'last_name', 'gender', 'age', 'nationality', 
      'prefecture', 'city', 'hobbies', 'self_introduction'
    ]
    
    const optionalFields = [
      'occupation', 'height', 'education', 'personality', 
      'dating_purpose', 'ideal_relationship', 'cultural_interests'
    ]
    
    const completedRequired = requiredFields.filter(field => {
      const value = profileData[field]
      if (Array.isArray(value)) return value.length > 0
      return value && value.toString().trim().length > 0
    })
    
    const completedOptional = optionalFields.filter(field => {
      const value = profileData[field]
      if (Array.isArray(value)) return value.length > 0
      return value && value.toString().trim().length > 0
    })
    
    const totalFields = requiredFields.length + optionalFields.length
    const completedFields = completedRequired.length + completedOptional.length
    const completion = Math.round((completedFields / totalFields) * 100)
    
    setProfileCompletion(completion)
  }

  const onSubmit = async (data: ProfileEditFormData) => {
    if (!user) {
      setError('ユーザー情報が見つかりません')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess(false)
    
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          gender: data.gender,
          age: data.age,
          nationality: data.nationality,
          prefecture: data.prefecture,
          city: data.city,
          occupation: data.occupation || null,
          height: data.height || null,
          education: data.education || null,
          hobbies: data.hobbies,
          personality: data.personality || [],
          dating_purpose: data.dating_purpose || null,
          ideal_relationship: data.ideal_relationship || null,
          self_introduction: data.self_introduction,
          cultural_interests: data.cultural_interests || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        throw new Error(updateError.message)
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
    
    if (newHobbies.length <= 8) {
      setSelectedHobbies(newHobbies)
      setValue('hobbies', newHobbies)
    }
  }

  const togglePersonality = (trait: string) => {
    const newPersonality = selectedPersonality.includes(trait)
      ? selectedPersonality.filter(p => p !== trait)
      : [...selectedPersonality, trait]
    
    if (newPersonality.length <= 5) {
      setSelectedPersonality(newPersonality)
      setValue('personality', newPersonality)
    }
  }

  const toggleCulturalInterest = (interest: string) => {
    const newInterests = selectedCulturalInterests.includes(interest)
      ? selectedCulturalInterests.filter(i => i !== interest)
      : [...selectedCulturalInterests, interest]
    
    if (newInterests.length <= 5) {
      setSelectedCulturalInterests(newInterests)
      setValue('cultural_interests', newInterests)
    }
  }

  // 国籍オプション
  const NATIONALITIES = [
    { value: 'アメリカ', label: 'アメリカ' },
    { value: 'イギリス', label: 'イギリス' },
    { value: 'カナダ', label: 'カナダ' },
    { value: 'オーストラリア', label: 'オーストラリア' },
    { value: 'ドイツ', label: 'ドイツ' },
    { value: 'フランス', label: 'フランス' },
    { value: 'イタリア', label: 'イタリア' },
    { value: 'スペイン', label: 'スペイン' },
    { value: '韓国', label: '韓国' },
    { value: '中国', label: '中国' },
    { value: 'その他', label: 'その他' },
  ]

  // 都道府県オプション
  const PREFECTURES = [
    '東京都', '神奈川県', '千葉県', '埼玉県', '大阪府', '京都府', '兵庫県', '愛知県',
    '福岡県', '北海道', '宮城県', '広島県', '静岡県', '茨城県', '栃木県', '群馬県',
    '新潟県', '長野県', '山梨県', '岐阜県', '三重県', '滋賀県', '奈良県', '和歌山県',
    '鳥取県', '島根県', '岡山県', '山口県', '徳島県', '香川県', '愛媛県', '高知県',
    '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  ]

  // 職業オプション
  const OCCUPATION_OPTIONS = [
    '会社員', '公務員', '経営者・役員', 'フリーランス', '自営業',
    '医師', '看護師', '教師・講師', 'エンジニア', 'デザイナー',
    '営業', 'マーケティング', '研究者', 'コンサルタント', '金融',
    '法律関係', 'サービス業', '小売業', '製造業', '学生',
    'その他'
  ]

  // 学歴オプション
  const EDUCATION_OPTIONS = [
    '高校卒業', '専門学校卒業', '短期大学卒業', '大学卒業',
    '大学院修士課程修了', '大学院博士課程修了', 'その他'
  ]

  // 趣味オプション（拡張）
  const HOBBY_OPTIONS = [
    '料理', '読書', '映画鑑賞', '音楽', 'スポーツ', '旅行',
    'アート', '写真', 'ゲーム', 'アニメ', 'ファッション', 'ダンス',
    'ヨガ', 'ジム', 'ランニング', 'サイクリング', 'ハイキング', 'キャンプ',
    'カラオケ', 'ショッピング', 'カフェ巡り', 'グルメ', 'お酒', 'コーヒー',
    '茶道', '書道', '華道', '陶芸', '絵画', '楽器演奏', '語学学習', 'ボランティア'
  ]

  // 性格オプション
  const PERSONALITY_OPTIONS = [
    '明るい', '優しい', '真面目', '面白い', '積極的', '慎重',
    '社交的', '内向的', '創造的', '論理的', '感情的', '冷静',
    '楽観的', '現実的', '好奇心旺盛', '責任感が強い'
  ]

  // 恋愛目的オプション
  const DATING_PURPOSE_OPTIONS = [
    '真剣な交際', '結婚を前提とした交際', '友達から始めたい',
    '文化交流がメイン', 'まずは友達として', 'その他'
  ]

  // 文化的興味オプション
  const CULTURAL_INTERESTS_OPTIONS = [
    '茶道', '書道', '華道', '着物', '日本料理', '和菓子作り',
    '陶芸', '折り紙', '盆栽', '神社仏閣巡り', '祭り', '歌舞伎・能',
    '日本の歴史', '日本文学', '武道', 'J-POP', 'アニメ・マンガ',
    '温泉', '桜', '日本の四季'
  ]

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
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      {/* Sidebar */}
      <Sidebar className="w-64 hidden md:block" />
      
      {/* Main Content */}
      <div className="md:ml-64 py-12 px-4">
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
            {/* プロフィール画像セクションは後で追加 */}

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
                    {...register('last_name')}
                    className={errors.last_name ? 'border-red-500' : ''}
                  />
                  {errors.last_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    名 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="花子"
                    {...register('first_name')}
                    className={errors.first_name ? 'border-red-500' : ''}
                  />
                  {errors.first_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>
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
                  placeholder="あなたの魅力や文化体験への興味について教えてください（10文字以上）"
                  rows={4}
                  {...register('self_introduction')}
                  className={errors.self_introduction ? 'border-red-500' : ''}
                />
                {errors.self_introduction && (
                  <p className="text-red-500 text-sm mt-1">{errors.self_introduction.message}</p>
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
    </div>
  )
}

export default function ProfileEditPage() {
  return (
    <AuthGuard>
      <ProfileEditContent />
    </AuthGuard>
  )
}