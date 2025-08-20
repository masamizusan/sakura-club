'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/store/authStore'
import { createClient } from '@/lib/supabase'
import AuthGuard from '@/components/auth/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import { User, Save, ArrowLeft, Loader2, AlertCircle, Briefcase, Heart, Camera, Upload, X } from 'lucide-react'
import { z } from 'zod'

const profileEditSchema = z.object({
  nickname: z.string().min(1, 'ニックネームを入力してください').max(20, 'ニックネームは20文字以内で入力してください'),
  gender: z.enum(['male', 'female'], { required_error: '性別を選択してください' }),
  birth_date: z.string().min(1, '生年月日を入力してください'),
  age: z.number().min(18, '18歳以上である必要があります').max(99, '99歳以下で入力してください'),
  nationality: z.string().min(1, '国籍を選択してください').optional(),
  prefecture: z.string().min(1, '都道府県を入力してください'),
  city: z.string().optional(),
  occupation: z.string().optional(),
  height: z.number().min(120, '身長は120cm以上で入力してください').max(250, '身長は250cm以下で入力してください').optional().or(z.literal('')),
  body_type: z.string().optional(),
  marital_status: z.enum(['single', 'married']).optional(),
  hobbies: z.array(z.string()).min(1, '共有したい日本文化を1つ以上選択してください').max(8, '日本文化は8つまで選択できます'),
  custom_culture: z.string().max(100, 'その他の日本文化は100文字以内で入力してください').optional(),
  personality: z.array(z.string()).max(5, '性格は5つまで選択できます').optional(),
  self_introduction: z.string().min(100, '自己紹介は100文字以上で入力してください').max(1000, '自己紹介は1000文字以内で入力してください'),
})

type ProfileEditFormData = z.infer<typeof profileEditSchema>

function ProfileEditContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const profileType = searchParams.get('type') // 'foreign-male' or 'japanese-female'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [userLoading, setUserLoading] = useState(true)
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([])
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([])
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // プロフィールタイプに基づく設定
  const isForeignMale = profileType === 'foreign-male'
  const isJapaneseFemale = profileType === 'japanese-female'

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
        
        // 仮登録からの遷移の場合、URLパラメータからも初期値を取得
        const urlParams = new URLSearchParams(window.location.search)
        const signupData = {
          nickname: urlParams.get('nickname'),
          gender: urlParams.get('gender'),
          birth_date: urlParams.get('birth_date'),
          age: urlParams.get('age'),
          nationality: urlParams.get('nationality'),
          prefecture: urlParams.get('prefecture')
        }
        
        // プロフィールタイプに基づくデフォルト値（仮登録データを優先）
        const getDefaults = () => {
          const baseDefaults = {
            gender: signupData.gender || profile.gender || (isForeignMale ? 'male' : 'female'),
            nationality: signupData.nationality || profile.nationality || (isJapaneseFemale ? '日本' : isForeignMale ? 'アメリカ' : ''),
            prefecture: signupData.prefecture || profile.prefecture || '',
            birth_date: signupData.birth_date || profile.birth_date || '',
            age: signupData.age ? parseInt(signupData.age) : profile.age || 18,
          }
          
          return baseDefaults
        }

        const defaults = getDefaults()
        
        // ニックネーム（仮登録から）
        const nicknameValue = signupData.nickname || profile.name || profile.first_name || ''

        // フォームフィールドをリセット（signup データを優先）
        reset({
          nickname: nicknameValue,
          gender: defaults.gender,
          birth_date: defaults.birth_date || '',
          age: defaults.age || profile.age || 18,
          nationality: isForeignMale ? (defaults.nationality || profile.nationality || '') : undefined,
          prefecture: defaults.prefecture || profile.residence || profile.prefecture || '',
          city: profile.city || '',
          occupation: profile.occupation || '',
          height: profile.height || '',
          body_type: profile.body_type || '',
          marital_status: profile.marital_status || '',
          hobbies: profile.interests || profile.hobbies || [],
          personality: profile.personality || [],
          self_introduction: profile.bio || profile.self_introduction || '',
        })
        
        // Select要素の値を個別に設定（signup データを優先）
        setValue('nickname', nicknameValue)
        setValue('gender', defaults.gender)
        if (isForeignMale) {
          setValue('nationality', defaults.nationality || profile.nationality || '')
        }
        setValue('prefecture', defaults.prefecture || profile.residence || profile.prefecture || '')
        setValue('age', defaults.age || profile.age || 18)
        setValue('hobbies', profile.interests || profile.hobbies || [])
        setValue('personality', profile.personality || [])
        
        setSelectedHobbies(profile.interests || profile.hobbies || [])
        setSelectedPersonality(profile.personality || [])
        setProfileImage(profile.avatar_url || null)
        
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

  // 生年月日から年齢を計算
  const calculateAge = useCallback((birthDate: string): number => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }, [])

  // 生年月日変更時の年齢自動更新
  const handleBirthDateChange = useCallback((birthDate: string) => {
    if (birthDate) {
      const age = calculateAge(birthDate)
      setValue('age', age)
      setValue('birth_date', birthDate)
      
      // リアルタイム完成度更新
      const currentData = watch()
      calculateProfileCompletion({
        ...currentData,
        birth_date: birthDate,
        age: age,
        avatar_url: profileImage
      })
    }
  }, [calculateAge, setValue, watch, profileImage])

  const calculateProfileCompletion = useCallback((profileData: any) => {
    const requiredFields = [
      'nickname', 'gender', 'age', 
      'prefecture', 'hobbies', 'self_introduction'
    ]
    
    // 外国人男性の場合は国籍も必須
    if (isForeignMale) {
      requiredFields.push('nationality')
    }
    
    const optionalFields = [
      'avatar_url', 'occupation', 'height', 'body_type', 'marital_status', 
      'personality'
    ]
    
    const completedRequired = requiredFields.filter(field => {
      const value = profileData[field]
      if (Array.isArray(value)) return value.length > 0
      return value && value.toString().trim().length > 0
    })
    
    const completedOptional = optionalFields.filter(field => {
      const value = profileData[field]
      if (field === 'avatar_url') return value && value.trim().length > 0
      if (Array.isArray(value)) return value.length > 0
      return value && value.toString().trim().length > 0
    })
    
    const totalFields = requiredFields.length + optionalFields.length
    const completedFields = completedRequired.length + completedOptional.length
    const completion = Math.round((completedFields / totalFields) * 100)
    
    setProfileCompletion(completion)
  }, [])

  // フォーム入力時のリアルタイム完成度更新
  useEffect(() => {
    const subscription = watch((value) => {
      if (value) {
        calculateProfileCompletion({
          ...value,
          avatar_url: profileImage
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, profileImage, calculateProfileCompletion])

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
          name: data.nickname,
          gender: data.gender,
          age: data.age,
          nationality: isForeignMale ? data.nationality : null,
          residence: data.prefecture,
          bio: data.self_introduction,
          interests: data.hobbies,
          avatar_url: profileImage,
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // ファイルサイズチェック (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('画像ファイルは5MB以下にしてください')
      return
    }

    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください')
      return
    }

    try {
      setUploadingImage(true)
      setError('')

      // ファイル名を生成
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`

      // Supabase Storageにアップロード
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setProfileImage(publicUrl)
      
      // プロフィール完成度を再計算
      const currentData = watch()
      calculateProfileCompletion({
        ...currentData,
        avatar_url: publicUrl
      })

    } catch (error) {
      console.error('Image upload error:', error)
      setError('画像のアップロードに失敗しました')
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = () => {
    setProfileImage(null)
    // プロフィール完成度を再計算
    const currentData = watch()
    calculateProfileCompletion({
      ...currentData,
      avatar_url: null
    })
  }

  const toggleHobby = (hobby: string) => {
    const newHobbies = selectedHobbies.includes(hobby)
      ? selectedHobbies.filter(h => h !== hobby)
      : [...selectedHobbies, hobby]
    
    if (newHobbies.length <= 8) {
      setSelectedHobbies(newHobbies)
      setValue('hobbies', newHobbies)
      
      // リアルタイム完成度更新
      const currentData = watch()
      calculateProfileCompletion({
        ...currentData,
        hobbies: newHobbies,
        avatar_url: profileImage
      })
    }
  }

  const togglePersonality = (trait: string) => {
    const newPersonality = selectedPersonality.includes(trait)
      ? selectedPersonality.filter(p => p !== trait)
      : [...selectedPersonality, trait]
    
    if (newPersonality.length <= 5) {
      setSelectedPersonality(newPersonality)
      setValue('personality', newPersonality)
      
      // リアルタイム完成度更新
      const currentData = watch()
      calculateProfileCompletion({
        ...currentData,
        personality: newPersonality,
        avatar_url: profileImage
      })
    }
  }


  // 国籍オプション（プロフィールタイプに応じて順序変更）
  const getNationalities = () => {
    if (isJapaneseFemale) {
      // 日本人女性の場合、日本を最初に
      return [
        { value: '日本', label: '日本' },
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
    } else {
      // 外国人男性の場合、よくある国を最初に
      return [
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
        { value: '日本', label: '日本' },
        { value: 'その他', label: 'その他' },
      ]
    }
  }

  const NATIONALITIES = getNationalities()

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


  // 体型オプション
  const BODY_TYPE_OPTIONS = [
    'スリム', '普通', 'ぽっちゃり', 'グラマー', 'アスリート体型'
  ]

  // 結婚状況オプション
  const MARITAL_STATUS_OPTIONS = [
    { value: 'single', label: '未婚' },
    { value: 'married', label: '既婚' }
  ]

  // 共有したい日本文化オプション（最新トレンド含む）
  const HOBBY_OPTIONS = [
    // 伝統文化
    '茶道', '華道', '書道', '着物・浴衣', '和菓子作り', '陶芸', '折り紙', '盆栽',
    '神社仏閣巡り', '武道（剣道・柔道など）', '歌舞伎・能', '日本舞踊',
    
    // 食文化
    '和食料理', '日本酒・焼酎', '抹茶', 'うどん・そば打ち', 'お弁当作り', 
    'おせち料理', '郷土料理', '精進料理',
    
    // 現代文化
    'アニメ・マンガ', 'J-POP', 'カラオケ', '日本のゲーム', 'コスプレ',
    '日本映画・ドラマ', 'ボーカロイド', 'アイドル文化',
    
    // 季節・自然・行事
    '桜見物', '紅葉狩り', '温泉', '祭り参加', '花火大会', '雪景色', 
    '日本の四季', '盆踊り',
    
    // 最新トレンド
    '抹茶カフェ巡り', '和装フォト', '伝統工芸体験', '日本庭園散策', 
    '御朱印集め', '和モダンインテリア', '古民家カフェ', '職人技見学'
  ]

  // 性格オプション（既婚者クラブを参考）
  const PERSONALITY_OPTIONS = [
    '優しい', '穏やか', '寂しがりや', '落ち着いている', '思いやりがある',
    '謙虚', '冷静', '素直', '明るい', '親しみやすい', '面倒見が良い',
    '気が利く', '責任感がある', '決断力がある', '社交的', '負けず嫌い',
    '熱血', 'インドア', 'アクティブ', '知的', '几帳面', '楽観的',
    'シャイ', 'マメ', 'さわやか', '天然', 'マイペース'
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
              <h1 className="text-3xl font-bold text-gray-900">
                {isForeignMale ? '外国人男性プロフィール編集' : 
                 isJapaneseFemale ? '日本人女性プロフィール編集' : 
                 'プロフィール編集'}
              </h1>
              <p className="text-gray-600">
                {isForeignMale ? '日本人女性との出会いに向けて、あなたの情報を更新してください' :
                 isJapaneseFemale ? '外国人男性との出会いに向けて、あなたの情報を更新してください' :
                 'あなたの情報を更新してください'}
              </p>
            </div>
          </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* プロフィール完成度表示 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-sakura-50 to-pink-50 rounded-lg border border-sakura-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">プロフィール完成度</span>
              <span className="text-lg font-bold text-sakura-600">{profileCompletion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-sakura-500 to-pink-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${profileCompletion}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {profileCompletion < 50 ? '基本情報をもう少し入力してみましょう' :
               profileCompletion < 80 ? '詳細情報を追加してプロフィールを充実させましょう' :
               profileCompletion < 100 ? 'あと少しで完璧なプロフィールです！' :
               '素晴らしい！完璧なプロフィールです✨'}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* プロフィール画像セクション */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-sakura-200 pb-2">
                プロフィール画像
              </h3>
              
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-sakura-100 to-sakura-200 flex items-center justify-center">
                    {profileImage ? (
                      <img 
                        src={profileImage} 
                        alt="プロフィール画像" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-sakura-500" />
                    )}
                  </div>
                  {profileImage && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      <div className="flex items-center px-4 py-2 bg-sakura-600 text-white rounded-lg hover:bg-sakura-700 transition-colors disabled:opacity-50">
                        {uploadingImage ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {uploadingImage ? 'アップロード中...' : '画像を選択'}
                      </div>
                    </label>
                    
                    {profileImage && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={removeImage}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        削除
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    JPG、PNG形式の画像をアップロードできます（最大5MB）
                  </p>
                </div>
              </div>
            </div>

            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-sakura-200 pb-2">
                基本情報
              </h3>
              
              {/* 自己紹介 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  自己紹介文 <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="あなたの魅力や日本文化への興味について教えてください（100文字以上1000文字以内で入力してください）"
                  rows={4}
                  {...register('self_introduction')}
                  className={errors.self_introduction ? 'border-red-500' : ''}
                />
                {errors.self_introduction && (
                  <p className="text-red-500 text-sm mt-1">{errors.self_introduction.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">自己紹介は100文字以上1000文字以内で入力してください。</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ニックネーム <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="ニックネーム"
                  {...register('nickname')}
                  className={errors.nickname ? 'border-red-500' : ''}
                />
                {errors.nickname && (
                  <p className="text-red-500 text-sm mt-1">{errors.nickname.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">プロフィールに表示される名前です</p>
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
                    結婚状況
                  </label>
                  <Select 
                    value={watch('marital_status') || ''} 
                    onValueChange={(value) => setValue('marital_status', value as 'single' | 'married')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="結婚状況を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARITAL_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    生年月日 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    {...register('birth_date')}
                    onChange={(e) => handleBirthDateChange(e.target.value)}
                    className={errors.birth_date ? 'border-red-500' : ''}
                  />
                  {errors.birth_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.birth_date.message}</p>
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
                    className={`${errors.age ? 'border-red-500' : ''} bg-gray-50`}
                    readOnly
                  />
                  {errors.age && (
                    <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">生年月日から自動計算されます</p>
                </div>
              </div>

              {/* 国籍フィールド（外国人男性のみ表示） */}
              {isForeignMale && (
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
              )}

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
                    市区町村 <span className="text-gray-400 text-xs">（任意）</span>
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

            {/* 詳細情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-sakura-200 pb-2">
                詳細情報
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    職業
                  </label>
                  <Select 
                    value={watch('occupation') || ''} 
                    onValueChange={(value) => setValue('occupation', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="職業を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {OCCUPATION_OPTIONS.map((occupation) => (
                        <SelectItem key={occupation} value={occupation}>
                          {occupation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    身長 (cm)
                  </label>
                  <Input
                    type="number"
                    min="120"
                    max="250"
                    placeholder="160"
                    {...register('height', { valueAsNumber: true })}
                    className={errors.height ? 'border-red-500' : ''}
                  />
                  {errors.height && (
                    <p className="text-red-500 text-sm mt-1">{errors.height.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    体型
                  </label>
                  <Select 
                    value={watch('body_type') || ''} 
                    onValueChange={(value) => setValue('body_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="体型を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {BODY_TYPE_OPTIONS.map((bodyType) => (
                        <SelectItem key={bodyType} value={bodyType}>
                          {bodyType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 共有したい日本文化 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-sakura-200 pb-2">
                共有したい日本文化（最大8つまで）
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
                選択済み: {selectedHobbies.length}/8
              </p>

              {/* 自由記入欄 */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  その他の日本文化（自由記入）
                </label>
                <Input
                  placeholder="上記にない日本文化があれば自由に記入してください（100文字以内）"
                  {...register('custom_culture')}
                  className={errors.custom_culture ? 'border-red-500' : ''}
                />
                {errors.custom_culture && (
                  <p className="text-red-500 text-sm mt-1">{errors.custom_culture.message}</p>
                )}
              </div>
            </div>



            {/* 性格（任意フィールド） */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-sakura-200 pb-2">
                性格（最大5つまで）
              </h3>
              <p className="text-sm text-gray-600">あなたの性格を表すキーワードを選択してください</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PERSONALITY_OPTIONS.map((trait) => (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => togglePersonality(trait)}
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      selectedPersonality.includes(trait)
                        ? 'bg-sakura-600 text-white border-sakura-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-sakura-400'
                    }`}
                  >
                    {trait}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                選択済み: {selectedPersonality.length}/5
              </p>
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