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
import MultiImageUploader from '@/components/ui/multi-image-uploader'
import { User, Save, ArrowLeft, Loader2, AlertCircle, Camera } from 'lucide-react'
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
  height: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(120, '身長は120cm以上で入力してください').max(250, '身長は250cm以下で入力してください').optional()
  ),
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
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [userLoading, setUserLoading] = useState(true)
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([])
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([])
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [profileImages, setProfileImages] = useState<Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>>([])
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

  // 緊急対応：avatar_urlを強制削除
  const forceRemoveAvatar = async () => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)
      
      if (error) {
        console.error('Avatar削除エラー:', error)
      } else {
        console.log('Avatar強制削除完了')
        window.location.reload()
      }
    } catch (error) {
      console.error('Avatar削除処理エラー:', error)
    }
  }

  // 強制初期化 - 複数のトリガーで確実に実行
  useEffect(() => {
    console.log('🔍 Page load check - user:', user?.id)
    
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const hasType = urlParams.get('type')
      const hasNickname = urlParams.get('nickname')
      
      console.log('🌐 Current URL:', window.location.href)
      console.log('🔑 Type parameter:', hasType)
      console.log('👤 Nickname parameter:', hasNickname)
      
      // 新規登録フロー判定を修正（既存ユーザーの場合は実行しない）
      const isSignupFlow = false // 一時的に無効化
      
      if (isSignupFlow) {
        console.log('🚨 新規登録フロー検出！強制初期化開始')
        if (user) {
          forceCompleteReset()
        } else {
          console.log('⏳ ユーザー認証待ち...')
          // ユーザー認証を待つ間隔実行
          const checkUser = setInterval(() => {
            if (user) {
              console.log('👤 認証完了 - 遅延初期化実行')
              forceCompleteReset()
              clearInterval(checkUser)
            }
          }, 500)
          
          // 5秒後にタイムアウト
          setTimeout(() => clearInterval(checkUser), 5000)
        }
      }
    }
  }, [user])

  // 追加の安全策 - ページロード後に再チェック
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && user) {
        const urlParams = new URLSearchParams(window.location.search)
        const hasType = urlParams.get('type')
        
        // 一時的に無効化
        // if (hasType === 'japanese-female') {
        //   console.log('⏰ 遅延チェック - 強制初期化実行')
        //   forceCompleteReset()
        // }
      }
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [user])

  const forceCompleteReset = async () => {
    if (!user) return
    
    try {
      console.log('🧹 全データクリア中...')
      
      // より包括的なデータクリア
      const { error } = await supabase
        .from('profiles')
        .update({
          name: null,
          bio: null,
          interests: null,
          height: null,
          avatar_url: null,
          personality: null,
          custom_culture: null,
          hobbies: null,
          marital_status: null
        })
        .eq('id', user.id)
      
      if (error) {
        console.error('❌ データクリアエラー:', error)
      } else {
        console.log('✅ 完全初期化完了 - すべてのフィールドをクリア')
        
        // フロントエンドの状態もクリア
        setProfileImages([])
        setSelectedHobbies([])
        setSelectedPersonality([])
        
        // フォームをリセット
        reset({
          nickname: '',
          self_introduction: '',
          gender: 'female',
          age: 18,
          hobbies: [],
          personality: [],
          custom_culture: ''
        })
        
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (error) {
      console.error('初期化処理エラー:', error)
    }
  }

  // Load current user data
  useEffect(() => {
    console.log('🚀 useEffect開始 - ユーザー:', user?.id)
    const loadUserData = async () => {
      if (!user) {
        console.log('❌ ユーザーなし - ログインページへ')
        router.push('/login')
        return
      }
      
      console.log('✅ ユーザー確認完了 - プロフィール読み込み開始')

      try {
        let { data: profile, error: profileError } = await supabase
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
        
        // 新規登録フローかどうかを判定
        const isFromSignup = urlParams.get('type') === 'japanese-female' || 
                            (signupData.nickname && signupData.gender && signupData.birth_date)
        
        console.log('=== Profile Edit Debug ===')
        console.log('Current URL:', window.location.href)
        console.log('Signup data:', signupData)
        console.log('isFromSignup:', isFromSignup)
        
        // 新規ユーザーかどうかを判定（bio, interests, nameが空、またはテストデータの場合は新規とみなす）
        const isTestData = profile.bio?.includes('テスト用の自己紹介です') || 
                          profile.name === 'テスト' ||
                          (profile.interests?.length === 1 && profile.interests[0] === '茶道')
        const isNewUser = (!profile.bio && !profile.interests && !profile.name) || isTestData || isFromSignup

        // 新規登録フローの場合は必ずプロフィールをクリア（一時的に無効化）
        if (false && isFromSignup) {
          console.log('新規登録フロー検出 - プロフィールデータをクリア')
          await supabase
            .from('profiles')
            .update({
              name: null,
              bio: null,
              interests: null,
              height: null,
              avatar_url: null,
              personality: null
            })
            .eq('id', user.id)
          
          // データベースからプロフィールを再取得してクリーンな状態にする
          const { data: cleanProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (cleanProfile) {
            profile = cleanProfile
            console.log('プロフィールクリア完了:', profile)
          }
        }
        
        // テストデータまたは既存データクリア（新規登録以外でも実行）
        const isTestData2 = profile.bio?.includes('テスト用の自己紹介です') || 
                          profile.name === 'テスト' ||
                          (profile.interests?.length === 1 && profile.interests[0] === '茶道')
        if (isTestData2 || profile.name === 'masamizu') {
          await supabase
            .from('profiles')
            .update({
              name: null,
              bio: null,
              interests: null,
              height: null,
              avatar_url: null
            })
            .eq('id', user.id)
          
          const { data: cleanProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (cleanProfile) {
            profile = cleanProfile
          }
        }

        // ニックネーム（仮登録から）
        const nicknameValue = signupData.nickname || (isNewUser ? '' : (profile.name || profile.first_name || ''))

        // フォームフィールドをリセット（新規ユーザーはsignupデータとデフォルト値のみ使用）
        reset({
          nickname: nicknameValue,
          gender: defaults.gender,
          birth_date: defaults.birth_date || '',
          age: defaults.age || (isNewUser ? 18 : (profile.age || 18)),
          nationality: isForeignMale ? (defaults.nationality || (isNewUser ? '' : (profile.nationality || ''))) : undefined,
          prefecture: defaults.prefecture || (isNewUser ? '' : (profile.residence || profile.prefecture || '')),
          city: isNewUser ? '' : (profile.city || ''),
          occupation: isNewUser ? '' : (profile.occupation || ''),
          height: isNewUser ? '' : (profile.height || ''),
          body_type: isNewUser ? '' : (profile.body_type || ''),
          marital_status: isNewUser ? '' : (profile.marital_status || ''),
          hobbies: isNewUser ? [] : (profile.interests || profile.hobbies || []),
          personality: isNewUser ? [] : (profile.personality || []),
          self_introduction: isNewUser ? '' : (profile.bio || profile.self_introduction || ''),
        })
        
        // Select要素の値を個別に設定（signup データを優先）
        setValue('nickname', nicknameValue)
        setValue('gender', defaults.gender)
        if (isForeignMale) {
          setValue('nationality', defaults.nationality || profile.nationality || '')
        }
        setValue('prefecture', defaults.prefecture || (isNewUser ? '' : (profile.residence || profile.prefecture || '')))
        setValue('age', defaults.age || (isNewUser ? 18 : (profile.age || 18)))
        setValue('hobbies', isNewUser ? [] : (profile.interests || profile.hobbies || []))
        setValue('personality', isNewUser ? [] : (profile.personality || []))
        
        setSelectedHobbies(isNewUser ? [] : (profile.interests || profile.hobbies || []))
        setSelectedPersonality(isNewUser ? [] : (profile.personality || []))
        if (!isNewUser && profile.avatar_url) {
          setProfileImages([{
            id: '1',
            url: profile.avatar_url,
            originalUrl: profile.avatar_url,
            isMain: true,
            isEdited: false
          }])
        }
        
        // プロフィール完成度を計算（signupデータも含める）
        const profileDataWithSignup = {
          ...profile,
          name: nicknameValue,
          gender: defaults.gender,
          age: defaults.age || profile.age || 18,
          nationality: isForeignMale ? (defaults.nationality || profile.nationality) : profile.nationality,
          residence: defaults.prefecture || profile.residence || profile.prefecture,
          interests: isNewUser ? [] : (profile.interests || profile.hobbies || []),
          bio: isNewUser ? '' : (profile.bio || profile.self_introduction || ''),
        }
        calculateProfileCompletion(profileDataWithSignup)
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
        avatar_url: profileImages.length > 0 ? 'has_images' : null
      })
    }
  }, [calculateAge, setValue, watch, profileImages])

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
      'personality', 'city'
    ]
    
    const completedRequired = requiredFields.filter(field => {
      let value
      
      // Map form field names to profile data field names
      switch (field) {
        case 'nickname':
          value = profileData.name || profileData.nickname
          break
        case 'self_introduction':
          value = profileData.bio || profileData.self_introduction
          break
        case 'hobbies':
          value = profileData.interests || profileData.hobbies
          // custom_cultureも日本文化の一部として含める
          const hasCustomCulture = profileData.custom_culture && profileData.custom_culture.trim().length > 0
          if (Array.isArray(value) && value.length > 0) {
            // 既に選択された趣味があるので完成とみなす
          } else if (hasCustomCulture) {
            // 選択された趣味はないが、カスタム文化があれば完成とみなす
            value = ['custom']
          }
          break
        case 'prefecture':
          value = profileData.residence || profileData.prefecture
          break
        case 'city':
          value = profileData.city
          break
        default:
          value = profileData[field]
      }
      
      if (Array.isArray(value)) return value.length > 0
      return value && value.toString().trim().length > 0
    })
    
    const completedOptional = optionalFields.filter(field => {
      let value = profileData[field]
      
      if (field === 'avatar_url') return profileImages.length > 0 // 1枚以上あれば完成扱い
      if (field === 'city') value = profileData.city
      
      if (Array.isArray(value)) return value.length > 0
      return value && value.toString().trim().length > 0
    })
    
    const totalFields = requiredFields.length + optionalFields.length
    const completedFields = completedRequired.length + completedOptional.length
    const completion = Math.round((completedFields / totalFields) * 100)
    
    // デバッグ情報
    console.warn('🎯 プロフィール完成度計算:', {
      requiredFields,
      completedRequired: completedRequired.length,
      missingRequired: requiredFields.filter(field => !completedRequired.includes(field)),
      optionalFields,
      completedOptional: completedOptional.length,
      missingOptional: optionalFields.filter(field => {
        let value = profileData[field]
        if (field === 'avatar_url') return profileImages.length === 0
        if (field === 'city') value = profileData.city
        if (Array.isArray(value)) return value.length === 0
        return !value || value.toString().trim().length === 0
      }),
      totalFields,
      completedFields,
      completion
    })
    
    setProfileCompletion(completion)
  }, [isForeignMale, profileImages])

  // フォーム入力時のリアルタイム完成度更新
  useEffect(() => {
    const subscription = watch((value) => {
      if (value) {
        calculateProfileCompletion({
          ...value,
          avatar_url: profileImages.length > 0 ? 'has_images' : null
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, profileImages, calculateProfileCompletion])

  const onSubmit = async (data: ProfileEditFormData, event?: React.BaseSyntheticEvent) => {
    // フォームのデフォルト送信を防止
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (!user) {
      setError('ユーザー情報が見つかりません')
      return
    }

    setIsLoading(true)
    setError('')
    
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
          avatar_url: profileImages.find(img => img.isMain)?.url || profileImages[0]?.url || null,
        })
        .eq('id', user.id)

      if (updateError) {
        throw new Error(updateError.message)
      }
      
      // 更新成功後、成功状態を表示
      console.log('Profile updated successfully!')
      setIsLoading(false)
      setUpdateSuccess(true)
    } catch (error) {
      console.error('Profile update error:', error)
      setIsLoading(false)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('プロフィールの更新に失敗しました。もう一度お試しください。')
      }
    }
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
        avatar_url: profileImages.length > 0 ? 'has_images' : null
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
        avatar_url: profileImages.length > 0 ? 'has_images' : null
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

  if (updateSuccess) {
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
              マイページでご確認ください。
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => window.location.href = '/mypage'}
                className="w-full bg-sakura-600 hover:bg-sakura-700 text-white"
              >
                マイページに移動
              </Button>
              <Button
                variant="outline"
                onClick={() => setUpdateSuccess(false)}
                className="w-full"
              >
                プロフィールを続けて編集
              </Button>
            </div>
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
            <MultiImageUploader
              images={profileImages}
              onImagesChange={setProfileImages}
              maxImages={3}
            />

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
                    {...register('height')}
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

            </form>

            {/* プレビューボタン - フォーム外に配置 */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-6">
              <button
                type="button"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                onClick={() => {
                  const formData = watch()
                  const queryParams = new URLSearchParams({
                    nickname: formData.nickname || '',
                    age: String(formData.age || 18),
                    gender: formData.gender || '',
                    nationality: formData.nationality || '',
                    prefecture: formData.prefecture || '',
                    city: formData.city || '',
                    occupation: formData.occupation || '',
                    height: String(formData.height || ''),
                    body_type: formData.body_type || '',
                    marital_status: formData.marital_status || '',
                    self_introduction: formData.self_introduction || '',
                    hobbies: selectedHobbies.join(','),
                    personality: selectedPersonality.join(','),
                    custom_culture: formData.custom_culture || '',
                    image: profileImages.find(img => img.isMain)?.url || profileImages[0]?.url || ''
                  })
                  window.open(`/profile/preview?${queryParams.toString()}`, '_blank')
                }}
              >
                👀 プレビュー | 相手からの見え方
              </button>
              <p className="text-sm text-orange-700 mt-2 text-center">
                あなたのプロフィールが他の人にどう見えるかを確認できます
              </p>
            </div>
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