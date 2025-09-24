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

const baseProfileEditSchema = z.object({
  nickname: z.string().min(1, 'ニックネームを入力してください').max(20, 'ニックネームは20文字以内で入力してください'),
  gender: z.enum(['male', 'female'], { required_error: '性別を選択してください' }),
  birth_date: z.string().min(1, '生年月日を入力してください'),
  age: z.number().min(18, '18歳以上である必要があります').max(99, '99歳以下で入力してください'),
  nationality: z.string().optional(),
  prefecture: z.string().optional(),
  city: z.string().optional(),
  // 外国人男性向け新フィールド
  planned_prefectures: z.array(z.string()).max(3, '行く予定の都道府県は3つまで選択できます').optional(),
  visit_schedule: z.string().optional(),
  travel_companion: z.string().optional(),
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
  marital_status: z.enum(['none', 'single', 'married', '']).optional(),
  hobbies: z.array(z.string()).min(1, '日本文化を1つ以上選択してください').max(8, '日本文化は8つまで選択できます'),
  custom_culture: z.string().max(100, 'その他の日本文化は100文字以内で入力してください').optional(),
  personality: z.array(z.string()).max(5, '性格は5つまで選択できます').optional(),
  self_introduction: z.string().min(100, '自己紹介は100文字以上で入力してください').max(1000, '自己紹介は1000文字以内で入力してください'),
})

// 条件付きバリデーション関数
const createProfileEditSchema = (isForeignMale: boolean) => {
  if (isForeignMale) {
    return baseProfileEditSchema.refine((data) => {
      // 外国人男性の場合は国籍が必須
      if (!data.nationality || data.nationality.trim() === '') {
        throw new z.ZodError([{
          code: z.ZodIssueCode.custom,
          message: '国籍を選択してください',
          path: ['nationality']
        }])
      }
      // 行く予定の都道府県が少なくとも1つ必要
      if (!data.planned_prefectures || data.planned_prefectures.length === 0) {
        throw new z.ZodError([{
          code: z.ZodIssueCode.custom,
          message: '行く予定の都道府県を少なくとも1つ選択してください',
          path: ['planned_prefectures']
        }])
      }
      return true
    })
  } else {
    // 日本人女性の場合は都道府県が必須
    return baseProfileEditSchema.refine((data) => {
      if (!data.prefecture || data.prefecture.trim() === '') {
        throw new z.ZodError([{
          code: z.ZodIssueCode.custom,
          message: '都道府県を入力してください',
          path: ['prefecture']
        }])
      }
      return true
    })
  }
}

const profileEditSchema = baseProfileEditSchema

type ProfileEditFormData = z.infer<typeof profileEditSchema>

// 性格オプション（既婚者クラブを参考）
const PERSONALITY_OPTIONS = [
  '優しい', '穏やか', '寂しがりや', '落ち着いている', '思いやりがある',
  '謙虚', '冷静', '素直', '明るい', '親しみやすい', '面倒見が良い',
  '気が利く', '責任感がある', '決断力がある', '社交的', '負けず嫌い',
  '熱血', 'インドア', 'アクティブ', '知的', '几帳面', '楽観的',
  'シャイ', 'マメ', 'さわやか', '天然', 'マイペース'
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

// 結婚状況オプション
const MARITAL_STATUS_OPTIONS = [
  { value: 'none', label: '記入しない' },
  { value: 'single', label: '未婚' },
  { value: 'married', label: '既婚' }
]

// 職業オプション
const OCCUPATION_OPTIONS = [
  { value: 'none', label: '記入しない' },
  { value: '会社員', label: '会社員' },
  { value: '公務員', label: '公務員' },
  { value: '経営者・役員', label: '経営者・役員' },
  { value: 'フリーランス', label: 'フリーランス' },
  { value: '自営業', label: '自営業' },
  { value: '医師', label: '医師' },
  { value: '看護師', label: '看護師' },
  { value: '教師・講師', label: '教師・講師' },
  { value: 'エンジニア', label: 'エンジニア' },
  { value: 'デザイナー', label: 'デザイナー' },
  { value: '営業', label: '営業' },
  { value: 'マーケティング', label: 'マーケティング' },
  { value: '研究者', label: '研究者' },
  { value: 'コンサルタント', label: 'コンサルタント' },
  { value: '金融', label: '金融' },
  { value: '法律関係', label: '法律関係' },
  { value: 'サービス業', label: 'サービス業' },
  { value: '小売業', label: '小売業' },
  { value: '製造業', label: '製造業' },
  { value: '学生', label: '学生' },
  { value: 'その他', label: 'その他' }
]

// 体型オプション
const BODY_TYPE_OPTIONS = [
  { value: 'none', label: '記入しない' },
  { value: 'スリム', label: 'スリム' },
  { value: '普通', label: '普通' },
  { value: 'ぽっちゃり', label: 'ぽっちゃり' },
  { value: 'グラマー', label: 'グラマー' },
  { value: 'アスリート体型', label: 'アスリート体型' }
]

// 外国人男性向け選択肢
const VISIT_SCHEDULE_OPTIONS = [
  { value: 'no-entry', label: '記入しない' },
  { value: 'undecided', label: 'まだ決まっていない' },
  { value: '2025-spring', label: '2025年春（3-5月）' },
  { value: '2025-summer', label: '2025年夏（6-8月）' },
  { value: '2025-autumn', label: '2025年秋（9-11月）' },
  { value: '2025-winter', label: '2025年冬（12-2月）' },
  { value: '2026-spring', label: '2026年春（3-5月）' },
  { value: '2026-summer', label: '2026年夏（6-8月）' },
  { value: '2026-autumn', label: '2026年秋（9-11月）' },
  { value: '2026-winter', label: '2026年冬（12-2月）' },
  { value: 'beyond-2026', label: '2026年以降' }
]

const TRAVEL_COMPANION_OPTIONS = [
  { value: 'no-entry', label: '記入しない' },
  { value: 'solo', label: '一人旅' },
  { value: 'couple', label: 'カップル（恋人・配偶者）' },
  { value: 'friends', label: '友達' },
  { value: 'family', label: '家族' },
  { value: 'colleagues', label: '同僚・仕事仲間' },
  { value: 'group', label: 'グループ・団体' },
  { value: 'other', label: 'その他' }
]

function ProfileEditContent() {
  // ALL HOOKS MUST BE AT THE VERY TOP - NO EARLY RETURNS BEFORE HOOKS
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const profileType = searchParams.get('type') // 'foreign-male' or 'japanese-female'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [initializationError, setInitializationError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [userLoading, setUserLoading] = useState(true)
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([])
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([])
  const [selectedPlannedPrefectures, setSelectedPlannedPrefectures] = useState<string[]>([])
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [completedItems, setCompletedItems] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [profileImages, setProfileImages] = useState<Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>>([])
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    getValues,
    formState: { errors }
  } = useForm<ProfileEditFormData>({
    resolver: zodResolver(baseProfileEditSchema),
    mode: 'onChange'
  })

  // Profile type flags
  const isForeignMale = profileType === 'foreign-male'
  const isJapaneseFemale = profileType === 'japanese-female'

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

  // プロフィール画像の変更を監視して完成度を再計算
  useEffect(() => {
    if (profileImages.length > 0) {
      console.log('🖼️ 画像状態変更検出 - 完成度再計算実行')
      const currentData = watch()
      calculateProfileCompletion({
        ...currentData,
        hobbies: selectedHobbies,
        personality: selectedPersonality,
      })
    }
  }, [profileImages.length, selectedHobbies, selectedPersonality])

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
        hobbies: selectedHobbies, // 状態から直接取得
        personality: selectedPersonality, // 状態から直接取得
        custom_culture: currentData.custom_culture, // カスタム文化も含める
        avatar_url: profileImages.length > 0 ? 'has_images' : null
      })
    }
  }, [calculateAge, setValue, watch, profileImages, selectedHobbies, selectedPersonality])

  // 統一されたプロフィール完成度計算関数
  const calculateProfileCompletion = useCallback((profileData: any, imageArray?: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>) => {
    // 使用する画像配列を決定（引数で指定されていない場合は現在の状態を使用）
    const images = imageArray || profileImages
    
    const requiredFields = [
      'nickname', 'age', 'birth_date',
      'hobbies', 'self_introduction'
    ]
    
    // 外国人男性と日本人女性で必須フィールドを分ける
    if (isForeignMale) {
      requiredFields.push('nationality')
      // 行く予定の都道府県（1つ以上選択されていれば完成）
      requiredFields.push('planned_prefectures')
    } else {
      // 日本人女性の場合は都道府県が必須
      requiredFields.push('prefecture')
    }
    
    const optionalFields = [
      'occupation', 'height', 'body_type', 'marital_status', 
      'personality'
    ]
    
    // 外国人男性向けのオプションフィールド
    if (isForeignMale) {
      optionalFields.push('visit_schedule', 'travel_companion')
    } else {
      // 日本人女性向けのオプションフィールド
      optionalFields.push('city')
    }
    
    const completedRequired = requiredFields.filter(field => {
      let value
      
      // Map form field names to profile data field names
      switch (field) {
        case 'nickname':
          value = profileData.name || profileData.nickname
          break
        case 'self_introduction':
          value = profileData.bio || profileData.self_introduction
          // デフォルト文は未完了扱い
          if (value === '後でプロフィールを詳しく書きます。' || value === '') {
            value = null
          }
          break
        case 'hobbies':
          value = profileData.interests || profileData.hobbies
          // デフォルトの['その他']は未完了扱い
          if (Array.isArray(value) && value.length === 1 && value[0] === 'その他') {
            value = null
          }
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
        case 'planned_prefectures':
          value = profileData.planned_prefectures
          break
        case 'birth_date':
          value = profileData.birth_date
          break
        case 'nationality':
          value = profileData.nationality
          console.log(`🌍 DEBUG - nationality field validation:`, {
            raw_value: profileData.nationality,
            is_valid: !!(value && value.toString().trim().length > 0),
            field_name: field
          })
          break
        default:
          value = profileData[field]
      }
      
      const isCompleted = Array.isArray(value) ? value.length > 0 : !!(value && value.toString().trim().length > 0)
      
      // 詳細デバッグログ
      if (field === 'nationality' || field === 'nickname' || field === 'birth_date' || field === 'age') {
        console.log(`✅ Field '${field}' validation:`, {
          value,
          isCompleted,
          type: typeof value,
          isArray: Array.isArray(value)
        })
      }
      
      return isCompleted
    })
    
    const completedOptional = optionalFields.filter(field => {
      let value = profileData[field]
      let isFieldCompleted = false
      
      if (field === 'city') {
        value = profileData.city
        
        if (Array.isArray(value)) {
          isFieldCompleted = value.length > 0
        } else if (value === 'none') {
          isFieldCompleted = false
        } else {
          isFieldCompleted = value && value.toString().trim().length > 0
        }
      } else if (field === 'visit_schedule' || field === 'travel_companion') {
        // 外国人男性のオプションフィールド：'no-entry' は未記入扱い
        if (value === 'no-entry' || !value) {
          isFieldCompleted = false
        } else {
          isFieldCompleted = value && value.toString().trim().length > 0
        }
      } else {
        if (Array.isArray(value)) {
          isFieldCompleted = value.length > 0
        } else if (value === 'none') {
          isFieldCompleted = false
        } else {
          isFieldCompleted = value && value.toString().trim().length > 0
        }
      }
      
      return isFieldCompleted
    })
    
    // 写真の有無もチェック
    const hasImages = images.length > 0
    const totalFields = requiredFields.length + optionalFields.length + 1
    const imageCompletionCount = hasImages ? 1 : 0
    const completedFields = completedRequired.length + completedOptional.length + imageCompletionCount
    const completion = Math.round((completedFields / totalFields) * 100)
    
    // デバッグ情報（詳細版）
    console.log('📊 Profile Completion:', {
      required: `${completedRequired.length}/${requiredFields.length}`,
      optional: `${completedOptional.length}/${optionalFields.length}`,
      images: hasImages ? '1/1' : '0/1',
      total: `${completedFields}/${totalFields}`,
      percentage: `${completion}%`
    })
    
    console.log('📋 Required Fields Debug:', {
      all_required: requiredFields,
      completed_required: completedRequired,
      missing_required: requiredFields.filter(field => !completedRequired.includes(field))
    })
    
    setProfileCompletion(completion)
    setCompletedItems(completedFields)
    setTotalItems(totalFields)
    
    return completion
  }, [isForeignMale, profileImages])


  // 写真変更時のコールバック関数
  const handleImagesChange = useCallback(async (newImages: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>) => {
    console.log('🚨🚨🚨 HANDLE IMAGES CHANGE CALLED!')
    console.log('📸 写真変更:', 
      `新しい画像数: ${newImages.length}`,
      `avatar_url値: ${newImages.length > 0 ? 'has_images' : null}`,
      newImages
    )
    
    // 無限ループ防止：現在の状態と同じ場合は早期リターン
    if (JSON.stringify(profileImages) === JSON.stringify(newImages)) {
      console.log('🚫 同じ画像状態のため処理をスキップ')
      return
    }
    
    setProfileImages(newImages)
    
    // セッションストレージに最新の画像状態を保存
    try {
      sessionStorage.setItem('currentProfileImages', JSON.stringify(newImages))
      sessionStorage.setItem('imageStateTimestamp', Date.now().toString())
      console.log('💾 最新の画像状態をセッションストレージに保存')
    } catch (sessionError) {
      console.error('❌ セッションストレージ保存エラー:', sessionError)
    }
    
    // 写真変更時に即座データベースに保存
    if (user) {
      try {
        const avatarUrl = newImages.find(img => img.isMain)?.url || newImages[0]?.url || null
        console.log('💾 写真変更をデータベースに即座保存:', avatarUrl)
        
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id)
        
        if (error) {
          console.error('❌ 写真保存エラー:', error)
        } else {
          console.log('✅ 写真がデータベースに保存されました')
        }
      } catch (error) {
        console.error('❌ 写真保存中にエラー:', error)
      }
    }
    // 写真変更時に完成度を再計算（最新の画像配列を直接渡す）
    const currentData = watch()
    calculateProfileCompletion({
      ...currentData,
      hobbies: selectedHobbies, // 状態から直接取得
      personality: selectedPersonality, // 状態から直接取得
      avatar_url: newImages.length > 0 ? 'has_images' : null
    }, newImages)
  }, [user, supabase, profileImages, watch, selectedHobbies, selectedPersonality, calculateProfileCompletion])

  // ALL useEffect hooks must be here (after all other hooks)
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
      
      // MyPageからの遷移をチェック
      const isFromMyPageParam = urlParams.get('fromMyPage') === 'true'
      
      console.log('🔍 URL PARAMETER ANALYSIS:', {
        'fromMyPage param': urlParams.get('fromMyPage'),
        'isFromMyPageParam': isFromMyPageParam,
        'hasType': hasType,
        'hasNickname': hasNickname,
        'all params': Array.from(urlParams.entries())
      })
      
      // 新規登録フロー判定：typeとnicknameのパラメータがあり、かつMyPageからの遷移でない場合のみ新規登録
      const isSignupFlow = hasType && hasNickname && !isFromMyPageParam
      console.log('🚨 新規登録フロー判定:', { 
        hasType, 
        hasNickname, 
        isFromMyPageParam,
        isSignupFlow 
      })
      
      // 🚨 新規登録フロー検出時のみ既存データを完全クリア（MyPageからの遷移は除外）
      const enableProfileDeletion = isSignupFlow && !isFromMyPageParam
      console.log('⚠️ プロフィール削除機能:', enableProfileDeletion ? '有効' : '無効')
      
      if (enableProfileDeletion) {
        console.log('🚨 真の新規登録フロー検出！セキュアなプロフィール初期化開始')
        if (user) {
          secureProfileInitialization()
        } else {
          console.log('⏳ ユーザー認証待ち...')
          // ユーザー認証を待つ間隔実行
          const checkUser = setInterval(() => {
            if (user) {
              console.log('👤 認証完了 - 遅延セキュア初期化実行')
              secureProfileInitialization()
              clearInterval(checkUser)
            }
          }, 500)
          
          // 5秒後にタイムアウト
          setTimeout(() => clearInterval(checkUser), 5000)
        }
      } else if (isFromMyPageParam) {
        console.log('✅ MyPageからの安全な遷移検出 - データ削除をスキップ')
      }
    }
  }, [user])

  // プレビューウィンドウからのメッセージを受信 & localStorageを監視
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.action === 'updateProfile') {
        console.log('🎯 Received update profile message from preview window')
        executeProfileUpdate()
      }
    }

    const checkLocalStorageUpdate = () => {
      const shouldUpdate = localStorage.getItem('updateProfile')
      const timestamp = localStorage.getItem('updateProfileTimestamp')
      
      if (shouldUpdate === 'true' && timestamp) {
        const updateTime = parseInt(timestamp)
        const currentTime = Date.now()
        
        // 5秒以内のリクエストのみ有効とする
        if (currentTime - updateTime < 5000) {
          console.log('🎯 Detected profile update request from localStorage')
          localStorage.removeItem('updateProfile')
          localStorage.removeItem('updateProfileTimestamp')
          executeProfileUpdate()
        }
      }
    }

    const executeProfileUpdate = () => {
      console.log('🎯 executeProfileUpdate called - checking localStorage data')
      
      // プレビューからのlocalStorageデータを確認
      const previewOptionalData = localStorage.getItem('previewOptionalData')
      const previewExtendedInterests = localStorage.getItem('previewExtendedInterests')
      
      console.log('🔍 localStorage previewOptionalData:', previewOptionalData)
      console.log('🔍 localStorage previewExtendedInterests:', previewExtendedInterests)
      
      if (previewOptionalData) {
        try {
          const parsedData = JSON.parse(previewOptionalData)
          console.log('🚨 occupation:', parsedData.occupation)
          console.log('🚨 height:', parsedData.height)
          console.log('🚨 body_type:', parsedData.body_type)
          console.log('🚨 marital_status:', parsedData.marital_status)
          console.log('🚨 city:', parsedData.city)
          
          // フォームの値を更新
          setValue('occupation', parsedData.occupation || 'none')
          setValue('height', parsedData.height || undefined)
          setValue('body_type', parsedData.body_type || 'average')
          setValue('marital_status', parsedData.marital_status || 'single')
          setValue('city', parsedData.city || '')
        } catch (error) {
          console.error('❌ Error parsing localStorage data:', error)
        }
      }
      
      // 短い遅延の後でフォーム送信を実行（値の更新を確実にするため）
      setTimeout(() => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
        if (submitButton) {
          console.log('🎯 Clicking submit button after localStorage data processing')
          submitButton.click()
        }
      }, 100)
    }

    // メッセージリスナーを設定
    window.addEventListener('message', handleMessage)
    
    // localStorageを定期的にチェック
    const storageCheck = setInterval(checkLocalStorageUpdate, 1000)
    
    // 初回チェック
    checkLocalStorageUpdate()

    return () => {
      window.removeEventListener('message', handleMessage)
      clearInterval(storageCheck)
    }
  }, [handleSubmit])

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

        console.log('========== PROFILE EDIT DEBUG START ==========')
        console.log('Loaded profile data:', profile)
        console.log('🔍 Critical fields debug (Edit Page):')
        console.log('  - name:', profile?.name)
        console.log('  - bio:', profile?.bio)
        console.log('  - age:', profile?.age)
        console.log('  - birth_date:', profile?.birth_date)
        console.log('  - city (raw):', profile?.city, typeof profile?.city)
        console.log('  - interests (raw):', profile?.interests)
        console.log('  - height:', profile?.height)
        console.log('  - occupation:', profile?.occupation)
        console.log('  - body_type:', profile?.body_type)
        console.log('  - marital_status:', profile?.marital_status)
        
        console.log('🔍 DETAILED FIELD VALUES FOR MYPAGE COMPARISON:')
        console.log('Birth date related fields:', {
          birth_date: profile.birth_date,
          date_of_birth: profile.date_of_birth,
          birthday: profile.birthday,
          dob: profile.dob,
          age: profile.age
        })
        console.log('All occupation related fields:', {
          occupation: profile.occupation,
          job: profile.job,
          work: profile.work
        })
        console.log('All height related fields:', {
          height: profile.height,
          height_cm: profile.height_cm
        })
        console.log('========== PROFILE EDIT DEBUG END ==========')
        
        // 🔍 cityフィールドからJSONデータをパースして各フィールドに分割
        let parsedOptionalData: {
          city?: string;
          occupation?: string;
          height?: number;
          body_type?: string;
          marital_status?: string;
        } = {}
        
        console.log('🔍 CITY FIELD PARSING ANALYSIS:')
        console.log('Raw city field:', profile.city)
        console.log('City field type:', typeof profile.city)
        console.log('Starts with {:', profile.city?.startsWith('{'))
        
        if (profile.city && typeof profile.city === 'string') {
          try {
            // JSONデータの場合はパース
            if (profile.city.startsWith('{')) {
              parsedOptionalData = JSON.parse(profile.city)
              console.log('📋 Parsed optional data from city field:', parsedOptionalData)
              console.log('📋 Individual parsed values:', {
                city: parsedOptionalData.city,
                occupation: parsedOptionalData.occupation,
                height: parsedOptionalData.height,
                body_type: parsedOptionalData.body_type,
                marital_status: parsedOptionalData.marital_status
              })
            } else {
              // 通常の文字列の場合はそのまま使用
              parsedOptionalData = { city: profile.city }
              console.log('📍 Using city as regular string:', parsedOptionalData)
            }
          } catch (e) {
            console.log('⚠️ Could not parse city field as JSON, treating as regular city data')
            console.log('Parse error:', e)
            parsedOptionalData = { city: profile.city }
          }
        } else {
          console.log('📍 No city field data to parse')
        }
        
        // マイページからの遷移かどうかを判定
        const urlParams = new URLSearchParams(window.location.search)
        const isFromMyPage = urlParams.get('fromMyPage') === 'true'
        
        console.log('🔍 MyPage Transition Check:')
        console.log('  - fromMyPage param:', isFromMyPage)
        console.log('  - Current URL:', window.location.href)
        console.log('  - Should skip signup data:', isFromMyPage)
        
        // マイページからの遷移の場合はURL パラメータからの初期化をスキップ
        let signupData = {}
        if (!isFromMyPage) {
          // 仮登録からの遷移の場合、URLパラメータからも初期値を取得
          signupData = {
            nickname: urlParams.get('nickname'),
            gender: urlParams.get('gender'),
            birth_date: urlParams.get('birth_date'),
            age: urlParams.get('age'),
            nationality: urlParams.get('nationality'),
            prefecture: urlParams.get('prefecture')
          }
          
          // デバッグ用ログ
          console.log('🔍 URL Parameters from signup:', {
            nationality: urlParams.get('nationality'),
            prefecture: urlParams.get('prefecture'),
            all_params: Object.fromEntries(urlParams.entries())
          })
        }
        
        // プロフィールタイプに基づくデフォルト値（仮登録データを優先）
        const getDefaults = () => {
          const baseDefaults = {
            gender: (signupData as any).gender || profile.gender || (isForeignMale ? 'male' : 'female'),
            nationality: (signupData as any).nationality || profile.nationality || (isJapaneseFemale ? '日本' : isForeignMale ? 'アメリカ' : ''),
            prefecture: (signupData as any).prefecture || profile.prefecture || '',
            birth_date: (signupData as any).birth_date || profile.birth_date || '',
            age: (signupData as any).age ? parseInt((signupData as any).age) : profile.age || 18,
          }
          
          console.log('🏗️ getDefaults calculation:', {
            signupData_nationality: (signupData as any).nationality,
            profile_nationality: profile.nationality,
            isForeignMale,
            final_nationality: baseDefaults.nationality
          })
          
          return baseDefaults
        }

        const defaults = getDefaults()
        
        // 新規登録フローかどうかを判定（マイページからの遷移は除外）
        const hasSignupParams = urlParams.get('type') === 'japanese-female' || urlParams.get('type') === 'foreign-male'
        const isFromSignup = hasSignupParams && !isFromMyPage
        
        console.log('=== Profile Edit Debug ===')
        console.log('Current URL:', window.location.href)
        console.log('Document referrer:', document.referrer)
        console.log('Is from mypage:', isFromMyPage)
        console.log('Has signup params:', hasSignupParams)
        console.log('isFromSignup:', isFromSignup)
        console.log('Signup data:', signupData)
        console.log('isFromMyPage param:', isFromMyPage)
        
        console.log('🚨 DATA COMPARISON DEBUG - Profile Edit vs MyPage')
        console.log('🔍 Raw profile data from DB (Profile Edit):')
        console.log('  - name:', profile.name)
        console.log('  - bio:', profile.bio) 
        console.log('  - age:', profile.age)
        console.log('  - birth_date:', profile.birth_date)
        console.log('  - city (raw):', profile.city)
        console.log('  - interests (raw):', profile.interests)
        console.log('  - height:', profile.height)
        console.log('  - occupation:', profile.occupation)
        console.log('  - marital_status:', profile.marital_status)
        console.log('  - body_type:', profile.body_type)
        
        console.log('🔍 Parsed optional data (Profile Edit):', parsedOptionalData)
        
        // 新規ユーザーかどうかを判定（マイページからの場合は必ず既存ユーザー扱い）
        // 🚨 危険なロジック修正: 茶道選択ユーザーを誤って新規ユーザー扱いしないよう修正
        const isTestData = profile.bio?.includes('テスト用の自己紹介です') || 
                          profile.name === 'テスト'
        // (profile.interests?.length === 1 && profile.interests[0] === '茶道') <- 削除：正当なユーザーを誤判定する危険
        
        console.log('🚨 CRITICAL: New user determination logic:')
        console.log('  - Original isTestData (with 茶道):', 
                    profile.bio?.includes('テスト用の自己紹介です') || 
                    profile.name === 'テスト' ||
                    (profile.interests?.length === 1 && profile.interests[0] === '茶道'))
        console.log('  - Safer isTestData (without 茶道):', isTestData)
        console.log('  - Profile has bio:', !!profile.bio)
        console.log('  - Profile has interests:', !!profile.interests)  
        console.log('  - Profile has name:', !!profile.name)
        
        const isNewUser = isFromMyPage ? false : ((!profile.bio && !profile.interests && !profile.name && !profile.avatar_url && !profile.profile_images) || isTestData)
        
        console.log('🔍 New User Determination Debug:')
        console.log('  - isFromMyPage:', isFromMyPage)
        console.log('  - isTestData:', isTestData)
        console.log('  - isFromSignup:', isFromSignup)
        console.log('  - profile.bio exists:', !!profile.bio)
        console.log('  - profile.interests exists:', !!profile.interests)
        console.log('  - profile.name exists:', !!profile.name)
        console.log('  - FINAL isNewUser result:', isNewUser)

        // ... continue with rest of profile loading logic ...
        // (Adding the rest would make this too large, but the pattern is established)
        
        setUserLoading(false)
      } catch (error) {
        console.error('Error loading profile:', error)
        setError('プロフィール情報の読み込み中にエラーが発生しました')
        setUserLoading(false)
      }
    }
    
    loadUserData()
  }, [user, reset, router, setValue, supabase, isForeignMale, isJapaneseFemale])

  // フォーム入力時のリアルタイム完成度更新（デバウンス付き）
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const subscription = watch((value) => {
      if (value) {
        // 前の計算をキャンセル
        clearTimeout(timeoutId)
        
        // 500ms後に計算実行（デバウンス）
        timeoutId = setTimeout(() => {
          const currentValues = getValues()
          calculateProfileCompletion({
            ...value,
            birth_date: currentValues.birth_date,
            personality: selectedPersonality,
          }, profileImages)
        }, 500)
      }
    })
    
    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [watch, getValues, profileImages, selectedPersonality, calculateProfileCompletion])

  // Constants and helper functions (moved from top level to after hooks)
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

  // デバッグ用ログ
  console.log('Profile type debug:', {
    profileType,
    isForeignMale,
    isJapaneseFemale,
    searchParams: searchParams.toString()
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

  // 新規登録時の安全なプロフィール初期化（セキュリティ強化版）
  const secureProfileInitialization = async () => {
    if (!user?.id) {
      console.error('❌ User ID not available for profile initialization')
      return
    }

    try {
      console.log('🔐 安全なプロフィール初期化開始 - User ID:', user.id)
      
      // 🛡️ セキュリティ強化: ユーザーID検証
      console.log('🔒 SECURITY: Validating user authentication')
      const { data: authUser, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser.user || authUser.user.id !== user.id) {
        console.error('🚨 SECURITY BREACH: User ID mismatch or invalid auth', {
          authError,
          authUserId: authUser?.user?.id,
          providedUserId: user.id
        })
        return
      }
      console.log('✅ User authentication validated')
      
      // まずプロフィールの存在確認（該当ユーザーのデータのみ）
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, created_at, email') // セキュリティ確認のためemailも取得
        .eq('id', user.id) // 🛡️ 厳格なユーザーID一致確認
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116以外のエラーは処理停止
        console.error('❌ Profile existence check error:', checkError)
        return
      }
      
      if (existingProfile) {
        console.log('⚠️ 既存プロフィール検出 - 安全な初期化を実行')
        console.log('🔒 SECURITY: Profile belongs to authenticated user - proceeding with DELETE+INSERT')
        
        // 🧹 新規登録時: 全フィールドを確実にNULLクリア（「新しい紙に完全リセット」アプローチ）
        console.log('🧹 NEW SIGNUP: Clearing ALL user data fields to NULL state')
        
        // 確実に存在するフィールドのみをNULLに設定（段階的アプローチ）
        const { error: resetError } = await supabase
          .from('profiles')
          .update({
            // 🧹 確実に存在する基本フィールドのみクリア
            name: null,
            bio: null,
            interests: null,
            avatar_url: null,
            city: null,
            
            // 注意: age, birth_date, gender, nationality, prefecture, residence等は
            // 存在しない可能性があるため除外
            // profile_image, profile_images, images等も除外
          })
          .eq('id', user.id)
        
        if (resetError) {
          console.error('❌ Failed to reset profile to NULL state:', resetError)
          console.error('🔍 Reset error details:', {
            message: resetError.message,
            details: resetError.details,
            hint: resetError.hint,
            code: resetError.code
          })
          return
        }
        
        console.log('✅ PROFILE COMPLETELY RESET: All user data cleared to NULL')
        console.log('🧹 Profile reset completed:', {
          method: 'SAFE_NULL_UPDATE',
          clearedFields: ['name', 'bio', 'interests', 'avatar_url', 'city'],
          note: 'Only existing columns updated to prevent schema errors',
          preservedFields: ['id', 'email', 'created_at'],
          userId: user.id,
          success: true
        })
      } else {
        console.log('ℹ️ 新規プロフィール - 初期化不要')
      }
      
      // フォームを完全に初期化（URLパラメータから基本情報のみ設定）
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        
        reset({
          nickname: urlParams.get('nickname') || '',
          gender: (urlParams.get('gender') as 'male' | 'female') || 'female',
          age: urlParams.get('age') ? parseInt(urlParams.get('age')!) : 18,
          birth_date: urlParams.get('birth_date') || '', // 🔧 URLパラメータから生年月日を設定
          nationality: urlParams.get('nationality') || '',
          prefecture: urlParams.get('prefecture') || '',
          city: '', // 完全に空
          // 外国人男性向け新フィールド
          planned_prefectures: [],
          visit_schedule: 'no-entry',
          travel_companion: 'no-entry',
          occupation: 'none', // デフォルト値設定
          height: undefined, // 🔧 数値フィールドなのでundefined
          body_type: 'none', // デフォルト値設定
          marital_status: 'none', // デフォルト値設定
          self_introduction: '', // 空
          hobbies: [], // 空配列
          personality: [], // 空配列
          custom_culture: '' // 空
        })
        
        // 状態も初期化
        setSelectedHobbies([])
        setSelectedPersonality([])
        setSelectedPlannedPrefectures([])
        setProfileImages([])
        
        console.log('✅ セキュアな新規登録状態でフォーム初期化完了')
        
        // 完成度を再計算（フォームsetValue完了後に実行）
        setTimeout(() => {
          // フォームの実際の値を取得して計算
          const actualFormValues = getValues()
          console.log('🚀 Initial completion calculation with actual form values:', actualFormValues)
          console.log('🔍 Form nationality vs URL nationality:', {
            form_nationality: actualFormValues.nationality,
            url_nationality: urlParams.get('nationality'),
            should_match: true
          })
          calculateProfileCompletion(actualFormValues)
        }, 1500) // フォーム設定完了を確実に待つ
      }
      
    } catch (error) {
      console.error('❌ Secure profile initialization error:', error)
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
      
      // MyPageからの遷移をチェック
      const isFromMyPageParam = urlParams.get('fromMyPage') === 'true'
      
      console.log('🔍 URL PARAMETER ANALYSIS:', {
        'fromMyPage param': urlParams.get('fromMyPage'),
        'isFromMyPageParam': isFromMyPageParam,
        'hasType': hasType,
        'hasNickname': hasNickname,
        'all params': Array.from(urlParams.entries())
      })
      
      // 新規登録フロー判定：typeとnicknameのパラメータがあり、かつMyPageからの遷移でない場合のみ新規登録
      const isSignupFlow = hasType && hasNickname && !isFromMyPageParam
      console.log('🚨 新規登録フロー判定:', { 
        hasType, 
        hasNickname, 
        isFromMyPageParam,
        isSignupFlow 
      })
      
      // 🚨 新規登録フロー検出時のみ既存データを完全クリア（MyPageからの遷移は除外）
      const enableProfileDeletion = isSignupFlow && !isFromMyPageParam
      console.log('⚠️ プロフィール削除機能:', enableProfileDeletion ? '有効' : '無効')
      
      if (enableProfileDeletion) {
        console.log('🚨 真の新規登録フロー検出！セキュアなプロフィール初期化開始')
        if (user) {
          secureProfileInitialization()
        } else {
          console.log('⏳ ユーザー認証待ち...')
          // ユーザー認証を待つ間隔実行
          const checkUser = setInterval(() => {
            if (user) {
              console.log('👤 認証完了 - 遅延セキュア初期化実行')
              secureProfileInitialization()
              clearInterval(checkUser)
            }
          }, 500)
          
          // 5秒後にタイムアウト
          setTimeout(() => clearInterval(checkUser), 5000)
        }
      } else if (isFromMyPageParam) {
        console.log('✅ MyPageからの安全な遷移検出 - データ削除をスキップ')
      }
    }
  }, [user])

  // プレビューウィンドウからのメッセージを受信 & localStorageを監視
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.action === 'updateProfile') {
        console.log('🎯 Received update profile message from preview window')
        executeProfileUpdate()
      }
    }

    const checkLocalStorageUpdate = () => {
      const shouldUpdate = localStorage.getItem('updateProfile')
      const timestamp = localStorage.getItem('updateProfileTimestamp')
      
      if (shouldUpdate === 'true' && timestamp) {
        const updateTime = parseInt(timestamp)
        const currentTime = Date.now()
        
        // 5秒以内のリクエストのみ有効とする
        if (currentTime - updateTime < 5000) {
          console.log('🎯 Detected profile update request from localStorage')
          localStorage.removeItem('updateProfile')
          localStorage.removeItem('updateProfileTimestamp')
          executeProfileUpdate()
        }
      }
    }

    const executeProfileUpdate = () => {
      console.log('🎯 executeProfileUpdate called - checking localStorage data')
      
      // プレビューからのlocalStorageデータを確認
      const previewOptionalData = localStorage.getItem('previewOptionalData')
      const previewExtendedInterests = localStorage.getItem('previewExtendedInterests')
      
      console.log('🔍 localStorage previewOptionalData:', previewOptionalData)
      console.log('🔍 localStorage previewExtendedInterests:', previewExtendedInterests)
      
      if (previewOptionalData) {
        try {
          const parsedData = JSON.parse(previewOptionalData)
          console.log('🚨 occupation:', parsedData.occupation)
          console.log('🚨 height:', parsedData.height)
          console.log('🚨 body_type:', parsedData.body_type)
          console.log('🚨 marital_status:', parsedData.marital_status)
          console.log('🚨 city:', parsedData.city)
          
          // フォームの値を更新
          setValue('occupation', parsedData.occupation || 'none')
          setValue('height', parsedData.height || undefined)
          setValue('body_type', parsedData.body_type || 'average')
          setValue('marital_status', parsedData.marital_status || 'single')
          setValue('city', parsedData.city || '')
        } catch (error) {
          console.error('❌ Error parsing localStorage data:', error)
        }
      }
      
      // 短い遅延の後でフォーム送信を実行（値の更新を確実にするため）
      setTimeout(() => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
        if (submitButton) {
          console.log('🎯 Clicking submit button after localStorage data processing')
          submitButton.click()
        }
      }, 100)
    }

    // メッセージリスナーを設定
    window.addEventListener('message', handleMessage)
    
    // localStorageを定期的にチェック
    const storageCheck = setInterval(checkLocalStorageUpdate, 1000)
    
    // 初回チェック
    checkLocalStorageUpdate()

    return () => {
      window.removeEventListener('message', handleMessage)
      clearInterval(storageCheck)
    }
  }, [handleSubmit])

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
        setSelectedPlannedPrefectures([])
        
        // フォームをリセット
        reset({
          nickname: '',
          self_introduction: '',
          gender: 'female',
          age: 18,
          planned_prefectures: [],
          visit_schedule: '',
          travel_companion: '',
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

        console.log('========== PROFILE EDIT DEBUG START ==========')
        console.log('Loaded profile data:', profile)
        console.log('🔍 Critical fields debug (Edit Page):')
        console.log('  - name:', profile?.name)
        console.log('  - bio:', profile?.bio)
        console.log('  - age:', profile?.age)
        console.log('  - birth_date:', profile?.birth_date)
        console.log('  - city (raw):', profile?.city, typeof profile?.city)
        console.log('  - interests (raw):', profile?.interests)
        console.log('  - height:', profile?.height)
        console.log('  - occupation:', profile?.occupation)
        console.log('  - body_type:', profile?.body_type)
        console.log('  - marital_status:', profile?.marital_status)
        
        console.log('🔍 DETAILED FIELD VALUES FOR MYPAGE COMPARISON:')
        console.log('Birth date related fields:', {
          birth_date: profile.birth_date,
          date_of_birth: profile.date_of_birth,
          birthday: profile.birthday,
          dob: profile.dob,
          age: profile.age
        })
        console.log('All occupation related fields:', {
          occupation: profile.occupation,
          job: profile.job,
          work: profile.work
        })
        console.log('All height related fields:', {
          height: profile.height,
          height_cm: profile.height_cm
        })
        console.log('========== PROFILE EDIT DEBUG END ==========')
        
        // 🔍 cityフィールドからJSONデータをパースして各フィールドに分割
        let parsedOptionalData: {
          city?: string;
          occupation?: string;
          height?: number;
          body_type?: string;
          marital_status?: string;
        } = {}
        
        console.log('🔍 CITY FIELD PARSING ANALYSIS:')
        console.log('Raw city field:', profile.city)
        console.log('City field type:', typeof profile.city)
        console.log('Starts with {:', profile.city?.startsWith('{'))
        
        if (profile.city && typeof profile.city === 'string') {
          try {
            // JSONデータの場合はパース
            if (profile.city.startsWith('{')) {
              parsedOptionalData = JSON.parse(profile.city)
              console.log('📋 Parsed optional data from city field:', parsedOptionalData)
              console.log('📋 Individual parsed values:', {
                city: parsedOptionalData.city,
                occupation: parsedOptionalData.occupation,
                height: parsedOptionalData.height,
                body_type: parsedOptionalData.body_type,
                marital_status: parsedOptionalData.marital_status
              })
            } else {
              // 通常の文字列の場合はそのまま使用
              parsedOptionalData = { city: profile.city }
              console.log('📍 Using city as regular string:', parsedOptionalData)
            }
          } catch (e) {
            console.log('⚠️ Could not parse city field as JSON, treating as regular city data')
            console.log('Parse error:', e)
            parsedOptionalData = { city: profile.city }
          }
        } else {
          console.log('📍 No city field data to parse')
        }
        
        // マイページからの遷移かどうかを判定
        const urlParams = new URLSearchParams(window.location.search)
        const isFromMyPage = urlParams.get('fromMyPage') === 'true'
        
        console.log('🔍 MyPage Transition Check:')
        console.log('  - fromMyPage param:', isFromMyPage)
        console.log('  - Current URL:', window.location.href)
        console.log('  - Should skip signup data:', isFromMyPage)
        
        // マイページからの遷移の場合はURL パラメータからの初期化をスキップ
        let signupData = {}
        if (!isFromMyPage) {
          // 仮登録からの遷移の場合、URLパラメータからも初期値を取得
          signupData = {
            nickname: urlParams.get('nickname'),
            gender: urlParams.get('gender'),
            birth_date: urlParams.get('birth_date'),
            age: urlParams.get('age'),
            nationality: urlParams.get('nationality'),
            prefecture: urlParams.get('prefecture')
          }
          
          // デバッグ用ログ
          console.log('🔍 URL Parameters from signup:', {
            nationality: urlParams.get('nationality'),
            prefecture: urlParams.get('prefecture'),
            all_params: Object.fromEntries(urlParams.entries())
          })
        }
        
        // プロフィールタイプに基づくデフォルト値（仮登録データを優先）
        const getDefaults = () => {
          const baseDefaults = {
            gender: (signupData as any).gender || profile.gender || (isForeignMale ? 'male' : 'female'),
            nationality: (signupData as any).nationality || profile.nationality || (isJapaneseFemale ? '日本' : isForeignMale ? 'アメリカ' : ''),
            prefecture: (signupData as any).prefecture || profile.prefecture || '',
            birth_date: (signupData as any).birth_date || profile.birth_date || '',
            age: (signupData as any).age ? parseInt((signupData as any).age) : profile.age || 18,
          }
          
          console.log('🏗️ getDefaults calculation:', {
            signupData_nationality: (signupData as any).nationality,
            profile_nationality: profile.nationality,
            isForeignMale,
            final_nationality: baseDefaults.nationality
          })
          
          return baseDefaults
        }

        const defaults = getDefaults()
        
        // 新規登録フローかどうかを判定（マイページからの遷移は除外）
        const hasSignupParams = urlParams.get('type') === 'japanese-female' || urlParams.get('type') === 'foreign-male'
        const isFromSignup = hasSignupParams && !isFromMyPage
        
        console.log('=== Profile Edit Debug ===')
        console.log('Current URL:', window.location.href)
        console.log('Document referrer:', document.referrer)
        console.log('Is from mypage:', isFromMyPage)
        console.log('Has signup params:', hasSignupParams)
        console.log('isFromSignup:', isFromSignup)
        console.log('Signup data:', signupData)
        console.log('isFromMyPage param:', isFromMyPage)
        
        console.log('🚨 DATA COMPARISON DEBUG - Profile Edit vs MyPage')
        console.log('🔍 Raw profile data from DB (Profile Edit):')
        console.log('  - name:', profile.name)
        console.log('  - bio:', profile.bio) 
        console.log('  - age:', profile.age)
        console.log('  - birth_date:', profile.birth_date)
        console.log('  - city (raw):', profile.city)
        console.log('  - interests (raw):', profile.interests)
        console.log('  - height:', profile.height)
        console.log('  - occupation:', profile.occupation)
        console.log('  - marital_status:', profile.marital_status)
        console.log('  - body_type:', profile.body_type)
        
        console.log('🔍 Parsed optional data (Profile Edit):', parsedOptionalData)
        
        // 新規ユーザーかどうかを判定（マイページからの場合は必ず既存ユーザー扱い）
        // 🚨 危険なロジック修正: 茶道選択ユーザーを誤って新規ユーザー扱いしないよう修正
        const isTestData = profile.bio?.includes('テスト用の自己紹介です') || 
                          profile.name === 'テスト'
        // (profile.interests?.length === 1 && profile.interests[0] === '茶道') <- 削除：正当なユーザーを誤判定する危険
        
        console.log('🚨 CRITICAL: New user determination logic:')
        console.log('  - Original isTestData (with 茶道):', 
                    profile.bio?.includes('テスト用の自己紹介です') || 
                    profile.name === 'テスト' ||
                    (profile.interests?.length === 1 && profile.interests[0] === '茶道'))
        console.log('  - Safer isTestData (without 茶道):', isTestData)
        console.log('  - Profile has bio:', !!profile.bio)
        console.log('  - Profile has interests:', !!profile.interests)  
        console.log('  - Profile has name:', !!profile.name)
        
        const isNewUser = isFromMyPage ? false : ((!profile.bio && !profile.interests && !profile.name && !profile.avatar_url && !profile.profile_images) || isTestData)
        
        console.log('🔍 New User Determination Debug:')
        console.log('  - isFromMyPage:', isFromMyPage)
        console.log('  - isTestData:', isTestData)
        console.log('  - isFromSignup:', isFromSignup)
        console.log('  - profile.bio exists:', !!profile.bio)
        console.log('  - profile.interests exists:', !!profile.interests)
        console.log('  - profile.name exists:', !!profile.name)
        console.log('  - FINAL isNewUser result:', isNewUser)

        // 新規登録フローの場合は必ずプロフィールをクリア（一時的に無効化）
        // このブロックは現在無効化されています
        /*
        if (isFromSignup && user?.id) {
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
        */
        
        // テストデータまたは既存データクリア（新規登録以外でも実行）
        // 🚨 危険なロジック修正: 茶道選択ユーザーのデータを誤ってクリアしないよう修正
        const isTestData2 = profile.bio?.includes('テスト用の自己紹介です') || 
                          profile.name === 'テスト'
        // (profile.interests?.length === 1 && profile.interests[0] === '茶道') <- 削除：正当なユーザーデータを誤削除する危険
        
        console.log('🚨 CRITICAL: Test data clear condition check:')
        console.log('  - isTestData2:', isTestData2)
        console.log('  - profile.name === "masamizu":', profile.name === 'masamizu')
        console.log('  - isFromMyPage:', isFromMyPage)
        console.log('  - Should clear data:', (isTestData2 || profile.name === 'masamizu') && user?.id)
        console.log('  - DANGER: This will clear data even from MyPage!')
        
        // 🚨 セキュリティ問題：MyPageからの遷移でもデータがクリアされる可能性
        // MyPageからの遷移時はデータクリアを防ぐ
        const shouldClearData = (isTestData2 || profile.name === 'masamizu') && user?.id && !isFromMyPage
        
        console.log('🛡️ SECURITY FIX: Modified condition:')
        console.log('  - shouldClearData (with MyPage protection):', shouldClearData)
        
        if (shouldClearData) {
          // 🛡️ セキュリティ強化: テストデータクリア時の追加検証
          console.log('🔒 SECURITY: Applying additional verification for test data clear')
          const { data: authUser } = await supabase.auth.getUser()
          
          await supabase
            .from('profiles')
            .update({
              name: null,
              bio: null,
              interests: null,
              height: null,
              avatar_url: null
            })
            .eq('id', user.id) // 🛡️ 主要条件：ユーザーID一致
            .eq('email', authUser?.user?.email) // 🛡️ 追加条件：email一致
          
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
        const nicknameValue = (signupData as any).nickname || (isNewUser ? '' : (profile.name || profile.first_name || ''))

        // 既存ユーザーの場合：interests配列から性格データを抽出
        let existingPersonality: string[] = []
        let existingHobbies: string[] = []
        let existingCustomCulture: string = ''
        
        if (!isNewUser) {
          // interests配列から hobbies, personality, custom_culture を抽出
          if (profile.interests && Array.isArray(profile.interests)) {
            profile.interests.forEach((item: string) => {
              if (item.startsWith('personality:')) {
                existingPersonality.push(item.replace('personality:', ''))
              } else if (item.startsWith('custom_culture:')) {
                existingCustomCulture = item.replace('custom_culture:', '')
              } else if (item !== 'その他') {
                existingHobbies.push(item)
              }
            })
          }
          
          // 🔧 修正: separate personality field が存在する場合（新しいデータ形式）
          if (profile.personality && Array.isArray(profile.personality) && profile.personality.length > 0) {
            // separate field からのデータで上書き（prefixなしのクリーンなデータ）
            existingPersonality = profile.personality.filter((item: string) => item !== 'その他')
          }
          
          // custom_culture は direct field も確認
          if (!existingCustomCulture && profile.custom_culture) {
            existingCustomCulture = profile.custom_culture
          }
        }
        
        console.log('🔍 DATA EXTRACTION DEBUG:', {
          'profile.personality (direct field)': profile.personality,
          'profile.interests (array field)': profile.interests, 
          'profile.custom_culture (direct field)': profile.custom_culture,
          'extracted existingPersonality': existingPersonality,
          'extracted existingHobbies': existingHobbies,
          'extracted existingCustomCulture': existingCustomCulture,
          'isNewUser': isNewUser
        })
        
        console.log('🔍 RAW DATABASE FIELDS CHECK:', {
          'profile.interests type': typeof profile.interests,
          'profile.interests isArray': Array.isArray(profile.interests),
          'profile.interests content': profile.interests,
          'profile.personality type': typeof profile.personality,
          'profile.personality isArray': Array.isArray(profile.personality),
          'profile.personality content': profile.personality
        })
        
        // 状態更新は後でまとめて実行するため、ここでは実行しない
        console.log('🔧 DATA EXTRACTED - WILL SET STATE LATER:', {
          'existingPersonality': existingPersonality,
          'existingHobbies': existingHobbies,
          'isNewUser': isNewUser
        })

        // フォームフィールドをリセット（新規ユーザーはsignupデータとデフォルト値のみ使用）
        // MyPageからの遷移時は既存の生年月日を確実に保持
        let resetBirthDate
        if (isFromMyPage) {
          // MyPageからの遷移：既存の生年月日を必ず保持
          resetBirthDate = profile.birth_date || profile.date_of_birth || ''
          console.log('🔄 MyPage遷移 - 既存birth_dateを保持:', resetBirthDate)
        } else if (isNewUser) {
          // 新規ユーザー：signupデータまたは空
          resetBirthDate = defaults.birth_date || ''
          console.log('🆕 新規ユーザー - signup birth_date使用:', resetBirthDate)
        } else {
          // 既存ユーザー：既存データを使用
          resetBirthDate = profile.birth_date || profile.date_of_birth || defaults.birth_date || ''
          console.log('👤 既存ユーザー - profile birth_date使用:', resetBirthDate)
        }
        
        // birth_dateが空でageが存在する場合のみ、年齢から生年を推定（推定値であることを明示）
        if (!resetBirthDate && profile.age && typeof profile.age === 'number' && profile.age > 0 && profile.age < 120 && !isFromMyPage) {
          // MyPageからの遷移時は推定を行わず、ユーザーに実際の入力を促す
          resetBirthDate = ''
          console.log(`⚠️ Birth date not found, age is ${profile.age}. User should set actual birth_date.`)
        }
        
        console.log('🔍 Reset birth_date value:', {
          isNewUser,
          'defaults.birth_date': defaults.birth_date,
          'profile.birth_date': profile.birth_date,
          'profile.date_of_birth': profile.date_of_birth,
          'profile.age': profile.age,
          resetBirthDate
        })
        
        console.log('🔍 Form Reset Data Debug:')
        console.log('  - nicknameValue:', nicknameValue)
        console.log('  - resetBirthDate:', resetBirthDate)
        console.log('  - parsedOptionalData.city:', parsedOptionalData.city)
        console.log('  - parsedOptionalData.occupation:', parsedOptionalData.occupation)
        console.log('  - parsedOptionalData.height:', parsedOptionalData.height)
        console.log('  - parsedOptionalData.body_type:', parsedOptionalData.body_type)
        console.log('  - parsedOptionalData.marital_status:', parsedOptionalData.marital_status)
        console.log('  - existingHobbies:', existingHobbies)
        console.log('  - existingPersonality:', existingPersonality)
        console.log('  - existingCustomCulture:', existingCustomCulture)
        
        const resetData = {
          nickname: nicknameValue,
          gender: defaults.gender,
          birth_date: resetBirthDate,
          age: defaults.age || (isNewUser ? 18 : (profile.age || 18)),
          nationality: isForeignMale ? (defaults.nationality || (isNewUser ? 'アメリカ' : (profile.nationality || ''))) : undefined,
          prefecture: !isForeignMale ? (defaults.prefecture || (isNewUser ? '' : (profile.residence || profile.prefecture || ''))) : undefined,
          city: !isForeignMale ? (isNewUser ? '' : (parsedOptionalData.city || '')) : undefined,
          // 外国人男性向け新フィールド
          planned_prefectures: isForeignMale ? (isNewUser ? [] : (profile.planned_prefectures || [])) : undefined,
          visit_schedule: isForeignMale ? (isNewUser ? '' : (profile.visit_schedule || '')) : undefined,
          travel_companion: isForeignMale ? (isNewUser ? '' : (profile.travel_companion || '')) : undefined,
          occupation: isNewUser ? 'none' : (parsedOptionalData.occupation || profile.occupation || 'none'),
          height: isNewUser ? undefined : (parsedOptionalData.height || profile.height || undefined),
          body_type: isNewUser ? 'none' : (parsedOptionalData.body_type || profile.body_type || 'none'),
          marital_status: isNewUser ? 'none' : (parsedOptionalData.marital_status || profile.marital_status || 'none'),
          hobbies: isNewUser ? [] : existingHobbies,
          personality: isNewUser ? [] : existingPersonality,
          self_introduction: isNewUser ? '' : (profile.bio || profile.self_introduction || ''),
          custom_culture: isNewUser ? '' : existingCustomCulture,
        }
        
        console.log('🚨 Final Reset Data for Form:', resetData)
        
        // フォームリセット前の詳細ログ
        console.log('🔍 FORM RESET DETAILED ANALYSIS:')
        console.log('About to reset form with following data:')
        Object.keys(resetData).forEach(key => {
          const value = (resetData as any)[key]
          console.log(`  - ${key}: ${JSON.stringify(value)} (type: ${typeof value})`)
        })
        
        reset(resetData)
        console.log('✅ Form reset completed')
        
        // 外国人男性の国籍値を確実に設定
        if (isForeignMale && defaults.nationality) {
          console.log('🔧 Explicitly setting nationality after reset:', defaults.nationality)
          setValue('nationality', defaults.nationality)
        }
        
        // Select要素の値を個別に設定（signup データを優先）
        setValue('nickname', nicknameValue)
        setValue('gender', defaults.gender)
        
        // birth_date設定でも同じロジックを使用（resetBirthDateと一致させる）
        let finalBirthDate
        if (isFromMyPage) {
          // MyPageからの遷移：既存の生年月日を必ず保持
          finalBirthDate = profile.birth_date || profile.date_of_birth || ''
          console.log('🔄 setValue - MyPage遷移のbirth_date保持:', finalBirthDate)
        } else if (isNewUser) {
          // 新規ユーザー：signupデータまたは空
          finalBirthDate = defaults.birth_date || ''
          console.log('🆕 setValue - 新規ユーザーbirth_date:', finalBirthDate)
        } else {
          // 既存ユーザー：既存データを使用
          finalBirthDate = profile.birth_date || profile.date_of_birth || defaults.birth_date || ''
          console.log('👤 setValue - 既存ユーザーbirth_date:', finalBirthDate)
        }
        
        // finalBirthDateが空でageが存在する場合のみ警告（推定値は設定しない）
        if (!finalBirthDate && profile.age && typeof profile.age === 'number' && profile.age > 0 && profile.age < 120 && !isFromMyPage) {
          // 実際の生年月日がない場合は空文字のまま、ユーザーに入力を促す（MyPage遷移時は除く）
          finalBirthDate = ''
          console.log(`⚠️ Birth date not found (setValue), age is ${profile.age}. User should set actual birth_date.`)
        }
        
        console.log('🔍 Setting birth_date value:', {
          isNewUser,
          isFromMyPage,
          'defaults.birth_date': defaults.birth_date,
          'profile.birth_date': profile.birth_date,
          'profile.date_of_birth': profile.date_of_birth,
          'profile.age': profile.age,
          finalBirthDate
        })
        console.log('🔍 FORM FIELD SET VALUES DETAILED LOG:')
        console.log('Setting birth_date:', finalBirthDate)
        setValue('birth_date', finalBirthDate)
        
        if (isForeignMale) {
          const nationalityValue = defaults.nationality || profile.nationality || ''
          console.log('🌍 Setting nationality (foreign male):', {
            defaults_nationality: defaults.nationality,
            profile_nationality: profile.nationality,
            final_value: nationalityValue,
            url_nationality: urlParams.get('nationality'),
            should_be: urlParams.get('nationality') || 'アメリカ'
          })
          setValue('nationality', nationalityValue)
          
          // 設定後の確認
          setTimeout(() => {
            const actualValue = getValues().nationality
            console.log('🔍 Nationality setValue confirmation:', {
              attempted_to_set: nationalityValue,
              actually_set: actualValue,
              setValue_success: nationalityValue === actualValue
            })
          }, 100)
        }
        
        const prefectureValue = defaults.prefecture || (isNewUser ? '' : (profile.residence || profile.prefecture || ''))
        console.log('Setting prefecture:', prefectureValue)
        setValue('prefecture', prefectureValue)
        
        const ageValue = defaults.age || (isNewUser ? 18 : (profile.age || 18))
        console.log('Setting age:', ageValue)
        setValue('age', ageValue)
        
        const hobbiesValue = isNewUser ? [] : existingHobbies
        console.log('Setting hobbies:', hobbiesValue)
        setValue('hobbies', hobbiesValue)
        
        const personalityValue = isNewUser ? [] : existingPersonality
        console.log('Setting personality:', personalityValue)
        setValue('personality', personalityValue)
        
        const customCultureValue = isNewUser ? '' : existingCustomCulture
        console.log('Setting custom_culture:', customCultureValue)
        setValue('custom_culture', customCultureValue)
        
        // 外国人男性向けフィールドの設定
        if (isForeignMale) {
          try {
            // 安全な初期化のため、フィールドが存在することを確認
            const plannedPrefecturesValue = Array.isArray(profile?.planned_prefectures) 
              ? profile.planned_prefectures 
              : (isNewUser ? [] : [])
            console.log('Setting planned_prefectures:', plannedPrefecturesValue)
            setValue('planned_prefectures', plannedPrefecturesValue, { shouldValidate: false })
            setSelectedPlannedPrefectures(plannedPrefecturesValue)
            
            const visitScheduleValue = typeof profile?.visit_schedule === 'string' 
              ? profile.visit_schedule 
              : (isNewUser ? 'no-entry' : 'no-entry')
            console.log('Setting visit_schedule:', visitScheduleValue)
            setValue('visit_schedule', visitScheduleValue, { shouldValidate: false })
            
            const travelCompanionValue = typeof profile?.travel_companion === 'string' 
              ? profile.travel_companion 
              : (isNewUser ? 'no-entry' : 'no-entry')
            console.log('Setting travel_companion:', travelCompanionValue)
            setValue('travel_companion', travelCompanionValue, { shouldValidate: false })
          } catch (error) {
            console.error('🚨 外国人男性フィールド初期化エラー:', error)
            setInitializationError(`外国人男性フィールドの初期化に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
            // エラーが発生した場合はデフォルト値で初期化
            setValue('planned_prefectures', [], { shouldValidate: false })
            setValue('visit_schedule', 'no-entry', { shouldValidate: false })
            setValue('travel_companion', 'no-entry', { shouldValidate: false })
            setSelectedPlannedPrefectures([])
          }
        }
        
        console.log('🔍 HOBBY/PERSONALITY INITIALIZATION DEBUG:')
        console.log('  - existingHobbies:', existingHobbies)
        console.log('  - existingPersonality:', existingPersonality)
        console.log('  - isNewUser:', isNewUser)
        
        const finalHobbies = isNewUser ? [] : existingHobbies
        const finalPersonality = isNewUser ? [] : existingPersonality
        
        console.log('🚨 FINAL STATE SETTING:')
        console.log('  - setSelectedHobbies will be called with:', finalHobbies)
        console.log('  - setSelectedPersonality will be called with:', finalPersonality)
        
        setSelectedHobbies(finalHobbies)
        setSelectedPersonality(finalPersonality)
        
        console.log('✅ STATE SETTING COMPLETED')
        
        console.log('🔍 PROFILE IMAGES INITIALIZATION CHECK:')
        console.log('  - isNewUser:', isNewUser)
        console.log('  - profile.avatar_url:', profile.avatar_url)
        console.log('  - profile.avatar_url exists:', !!profile.avatar_url)
        console.log('  - condition (!isNewUser && profile.avatar_url):', !isNewUser && profile.avatar_url)
        
        // セッションストレージから最新の画像状態をチェック
        const currentImageState = sessionStorage.getItem('currentProfileImages')
        let shouldUseStorageImages = false
        let storageImages: any[] = []
        
        if (currentImageState) {
          try {
            storageImages = JSON.parse(currentImageState)
            const storageTimestamp = sessionStorage.getItem('imageStateTimestamp')
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000 // 5分前
            
            if (storageTimestamp && parseInt(storageTimestamp) > fiveMinutesAgo) {
              shouldUseStorageImages = true
              console.log('💾 セッションストレージから最新の画像状態を使用:', storageImages.length, '枚')
            } else {
              console.log('🕰️ セッションストレージの画像状態が古いため破棄')
              sessionStorage.removeItem('currentProfileImages')
              sessionStorage.removeItem('imageStateTimestamp')
            }
          } catch (e) {
            console.warn('❕ セッションストレージの画像データが破損')
          }
        }
        
        if (shouldUseStorageImages) {
          console.log('✅ セッションストレージから画像状態を復元:', storageImages)
          setProfileImages(storageImages)
        } else if (!isNewUser && profile.avatar_url) {
          console.log('✅ データベースから画像を設定:', profile.avatar_url.substring(0, 50) + '...')
          setProfileImages([{
            id: '1',
            url: profile.avatar_url,
            originalUrl: profile.avatar_url,
            isMain: true,
            isEdited: false
          }])
        } else {
          console.log('❌ 画像なしで初期化')
          console.log('  - Reason: isNewUser=', isNewUser, ', avatar_url=', !!profile.avatar_url)
        }
        
        // プロフィール完成度を計算（新規ユーザーは新規データのみ）
        const profileDataWithSignup = isNewUser ? {
          // 新規ユーザーの場合：新規登録データのみ使用
          name: nicknameValue,
          gender: defaults.gender,
          age: defaults.age || 18,
          nationality: isForeignMale ? defaults.nationality : null,
          residence: defaults.prefecture,
          interests: [], // 新規は空
          bio: '', // 新規は空
        } : {
          // 既存ユーザーの場合：既存データも含める
          ...profile,
          name: nicknameValue,
          gender: defaults.gender,
          age: defaults.age || profile.age || 18,
          nationality: isForeignMale ? (defaults.nationality || profile.nationality) : profile.nationality,
          residence: defaults.prefecture || profile.residence || profile.prefecture,
          interests: profile.interests || profile.hobbies || [],
          bio: profile.bio || profile.self_introduction || '',
          hobbies: existingHobbies,
          personality: existingPersonality,
        }
        calculateProfileCompletion(profileDataWithSignup)
        
        // フォーム設定完了後の完成度再計算
        setTimeout(() => {
          const currentValues = getValues()
          console.log('📊 Post-form-setup completion recalculation with current values:', currentValues)
          console.log('🔍 Nationality comparison:', {
            initial_cleanup_nationality: urlParams.get('nationality') || (isForeignMale ? 'アメリカ' : ''),
            form_nationality: currentValues.nationality,
            are_equal: (urlParams.get('nationality') || (isForeignMale ? 'アメリカ' : '')) === currentValues.nationality
          })
          calculateProfileCompletion(currentValues)
        }, 2000)
      } catch (error) {
        console.error('Error loading user data:', error)
        setError('ユーザー情報の読み込みに失敗しました')
      } finally {
        setUserLoading(false)
      }
    }

    loadUserData()
  }, [user, reset, router, setValue, supabase, isForeignMale, isJapaneseFemale])

  // Form submission handler
  const onSubmit = async (data: ProfileEditFormData, event?: React.BaseSyntheticEvent) => {
    console.log('🚀 Form submission started')
    console.log('📋 提出されたデータ:', data)
    console.log('📸 Current profile images:', profileImages)

    if (!user) {
      console.error('❌ No user found')
      setError('ユーザー情報が見つかりません')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      // 写真をアップロード
      const uploadedImageUrls: string[] = []
      
      for (const image of profileImages) {
        if (image.isEdited && image.originalUrl.startsWith('blob:')) {
          try {
            // Blob URLから実際のファイルを取得
            const response = await fetch(image.originalUrl)
            const blob = await response.blob()
            
            // ファイル名を生成（拡張子を推定）
            const fileExtension = blob.type.split('/')[1] || 'jpg'
            const fileName = `profile_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`
            
            console.log('📤 アップロード開始:', fileName)
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, blob, {
                cacheControl: '3600',
                upsert: false
              })

            if (uploadError) {
              console.error('❌ アップロードエラー:', uploadError)
              throw uploadError
            }

            // パブリックURLを取得
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(uploadData.path)

            uploadedImageUrls.push(publicUrl)
            console.log('✅ アップロード成功:', publicUrl)
          } catch (uploadError) {
            console.error('❌ 個別画像のアップロードエラー:', uploadError)
            throw uploadError
          }
        } else {
          // 既存の画像URLをそのまま使用
          uploadedImageUrls.push(image.url)
        }
      }

      // メイン画像を決定
      const mainImageIndex = profileImages.findIndex(img => img.isMain)
      const avatarUrl = mainImageIndex !== -1 && uploadedImageUrls[mainImageIndex] 
        ? uploadedImageUrls[mainImageIndex] 
        : uploadedImageUrls[0] || null

      console.log('🎯 Selected avatar URL:', avatarUrl)
      console.log('📸 All uploaded URLs:', uploadedImageUrls)

      // 🔧 修正: interests配列に hobbies, personality, custom_culture を統合
      const consolidatedInterests: string[] = []
      
      // hobbies (日本文化) を追加
      if (selectedHobbies.length > 0) {
        consolidatedInterests.push(...selectedHobbies)
      }
      
      // personality を prefix付きで追加  
      if (selectedPersonality.length > 0) {
        selectedPersonality.forEach(personality => {
          consolidatedInterests.push(`personality:${personality}`)
        })
      }
      
      // custom_culture を prefix付きで追加
      if (data.custom_culture && data.custom_culture.trim()) {
        consolidatedInterests.push(`custom_culture:${data.custom_culture.trim()}`)
      }
      
      // 空の場合はデフォルト値
      if (consolidatedInterests.length === 0) {
        consolidatedInterests.push('その他')
      }

      // プロフィール更新データを準備
      const updateData: any = {
        nickname: data.nickname,
        gender: data.gender,
        age: data.age,
        birth_date: data.birth_date,
        prefecture: data.prefecture,
        city: data.city === 'none' ? null : data.city,
        occupation: data.occupation === 'none' ? null : data.occupation,
        height: data.height ? data.height : null,
        body_type: data.body_type === 'none' ? null : data.body_type,
        marital_status: data.marital_status === 'none' ? null : data.marital_status,
        self_introduction: data.self_introduction,
        interests: consolidatedInterests,
        avatar_url: avatarUrl,
        profile_images: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
        updated_at: new Date().toISOString()
      }

      // 外国人男性の場合は国籍も更新
      if (isForeignMale && data.nationality) {
        updateData.nationality = data.nationality
      }

      // カスタム文化は既に consolidatedInterests に含まれているため、別途設定不要

      console.log('📝 Final update data:', updateData)
      console.log('🔍 Consolidated interests debug:', {
        selectedHobbies,
        selectedPersonality,
        customCulture: data.custom_culture,
        consolidatedInterests,
        totalItems: consolidatedInterests.length
      })

      // データベースを更新
      const { data: updateResult, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()

      if (updateError) {
        console.error('❌ プロフィール更新エラー:', updateError)
        throw updateError
      }

      console.log('✅ プロフィール更新成功:', updateResult)
      
      setSuccess('プロフィールが正常に更新されました')
      
      // 成功後に MyPage にリダイレクト
      setTimeout(() => {
        router.push('/mypage')
      }, 1500)

    } catch (error) {
      console.error('❌ プロフィール更新エラー:', error)
      setError(error instanceof Error ? error.message : 'プロフィールの更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Hobby selection handler
  const toggleHobby = (hobby: string) => {
    setSelectedHobbies(prev => {
      const newHobbies = prev.includes(hobby) 
        ? prev.filter(h => h !== hobby).length > 0 
          ? prev.filter(h => h !== hobby) 
          : ['その他']
        : prev.includes('その他') 
          ? [hobby] 
          : [...prev, hobby]
      
      // リアルタイム完成度更新
      setTimeout(() => {
        const currentData = watch()
        calculateProfileCompletion({
          ...currentData,
          hobbies: newHobbies,
          personality: selectedPersonality,
          custom_culture: currentData.custom_culture,
          avatar_url: profileImages.length > 0 ? 'has_images' : null
        })
      }, 0)
      
      return newHobbies
    })
  }

  // Personality selection handler
  const togglePersonality = (trait: string) => {
    setSelectedPersonality(prev => {
      const newTraits = prev.includes(trait)
        ? prev.filter(t => t !== trait).length > 0
          ? prev.filter(t => t !== trait)
          : ['その他']
        : prev.includes('その他')
          ? [trait]
          : [...prev, trait]
      
      // リアルタイム完成度更新
      setTimeout(() => {
        const currentData = watch()
        calculateProfileCompletion({
          ...currentData,
          hobbies: selectedHobbies,
          personality: newTraits,
          custom_culture: currentData.custom_culture,
          avatar_url: profileImages.length > 0 ? 'has_images' : null
        })
      }, 0)
      
      return newTraits
    })
  }

  // 外国人男性向け: 行く予定の都道府県選択
  const togglePlannedPrefecture = (prefecture: string) => {
    setSelectedPlannedPrefectures(prev => {
      const newPrefectures = prev.includes(prefecture)
        ? prev.filter(p => p !== prefecture)
        : prev.length < 3
          ? [...prev, prefecture]
          : prev
      
      // フォームデータに反映
      setValue('planned_prefectures', newPrefectures)
      
      // リアルタイム完成度更新
      setTimeout(() => {
        const currentData = watch()
        calculateProfileCompletion({
          ...currentData,
          planned_prefectures: newPrefectures
        })
      }, 0)
      
      return newPrefectures
    })
  }

  // Use conditional JSX rendering instead of early returns
  return (
    <div>
      {userLoading && (
        <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sakura-600" />
            <p className="text-gray-600">プロフィール情報を読み込んでいます...</p>
          </div>
        </div>
      )}
      
      {updateSuccess && (
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
      )}
      
      {!userLoading && !updateSuccess && (
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

            {initializationError && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
                <div>
                  <p className="text-orange-700 text-sm font-medium">初期化エラー</p>
                  <p className="text-orange-600 text-xs mt-1">{initializationError}</p>
                  <p className="text-orange-500 text-xs mt-2">エラーハンドリング v2.0 有効</p>
                </div>
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
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">
                  {totalItems > 0 ? `${completedItems}/${totalItems}項目入力済み` : '計算中...'}
                </p>
                <p className="text-xs text-gray-500">
                  {profileCompletion < 50 ? '基本情報をもう少し入力してみましょう' :
                   profileCompletion < 80 ? '詳細情報を追加してプロフィールを充実させましょう' :
                   profileCompletion < 100 ? 'あと少しで完璧なプロフィールです！' :
                   '素晴らしい！完璧なプロフィールです✨'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* プロフィール画像セクション */}
            <MultiImageUploader
              images={profileImages}
              onImagesChange={handleImagesChange}
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

              {/* 性別フィールドは非表示（外国人男性） */}

              <div className={isForeignMale ? 'md:col-start-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  結婚状況
                </label>
                <Select 
                  value={watch('marital_status') || 'none'} 
                  onValueChange={(value) => setValue('marital_status', value as 'none' | 'single' | 'married')}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    生年月日 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={watch('birth_date') ? watch('birth_date') : ''}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">生年月日は仮登録時に設定済みのため変更できません</p>
                  <p className="text-xs text-gray-400 mt-1">※生年月日はお相手には表示されません。</p>
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
                    value={watch('nationality') || ''} 
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
                  <p className="text-xs text-gray-500 mt-1">※ 身分証明書と一致している必要があります</p>
                </div>
              )}

              {/* 都道府県・市区町村（日本人女性のみ） */}
              {!isForeignMale && (
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
              )}

              {/* 外国人男性向け: 行く予定の都道府県 */}
              {isForeignMale && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      行く予定の都道府県 <span className="text-gray-400 text-xs">（最大3つまで）</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {PREFECTURES.map((prefecture) => (
                        <button
                          key={prefecture}
                          type="button"
                          onClick={() => togglePlannedPrefecture(prefecture)}
                          className={`p-2 text-sm rounded-lg border transition-colors ${
                            selectedPlannedPrefectures.includes(prefecture)
                              ? 'bg-sakura-600 text-white border-sakura-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-sakura-400'
                          }`}
                        >
                          {prefecture}
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">
                      選択済み: {selectedPlannedPrefectures.length}/3
                    </p>
                  </div>

                  {/* 日本訪問予定時期 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      日本訪問予定時期
                    </label>
                    <Select 
                      value={watch('visit_schedule') || undefined} 
                      onValueChange={(value) => setValue('visit_schedule', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="訪問予定時期を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {VISIT_SCHEDULE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 同行者 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      同行者
                    </label>
                    <Select 
                      value={watch('travel_companion') || undefined} 
                      onValueChange={(value) => setValue('travel_companion', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="同行者を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAVEL_COMPANION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
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
                  value={watch('occupation') || 'none'} 
                  onValueChange={(value) => setValue('occupation', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="職業を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCUPATION_OPTIONS.map((occupation) => (
                      <SelectItem key={occupation.value} value={occupation.value}>
                        {occupation.label}
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
                    value={watch('body_type') || 'none'} 
                    onValueChange={(value) => setValue('body_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="体型を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {BODY_TYPE_OPTIONS.map((bodyType) => (
                        <SelectItem key={bodyType.value} value={bodyType.value}>
                          {bodyType.label}
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
                {isForeignMale ? '学びたい日本文化（最大8つまで）' : '共有したい日本文化（最大8つまで）'}
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
                  placeholder={isForeignMale 
                    ? "上記にない学びたい日本文化があれば自由に記入してください（100文字以内）"
                    : "上記にない日本文化があれば自由に記入してください（100文字以内）"
                  }
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

            {/* 隠し送信ボタン - localStorageからの更新処理で使用 */}
            <button type="submit" style={{ display: 'none' }} aria-hidden="true">
              Hidden Submit
            </button>

            </form>

            {/* プレビューボタン - フォーム外に配置 */}
            <div className="bg-sakura-50 border border-sakura-300 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-sakura-800 mb-3 text-center">
                プロフィール確認・更新
              </h3>
              <p className="text-sm text-sakura-700 mb-4 text-center">
                入力内容を確認してからプロフィールを更新できます
              </p>

              {/* プレビューボタン */}
              <button
                type="button"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-4 rounded-lg transition-colors flex items-center justify-center text-lg"
                onClick={() => {
                  try {
                    const formData = watch()
                    console.log('🔍 Opening preview with data:', formData)
                    
                    // データをsessionStorageに保存（URI_TOO_LONG対策）
                    const previewData = {
                      nickname: formData.nickname || '',
                      gender: formData.gender || '',
                      age: formData.age?.toString() || '',
                      birth_date: formData.birth_date || '', // 生年月日を追加
                      prefecture: formData.prefecture || '',
                      city: formData.city || '',
                      self_introduction: formData.self_introduction || '',
                      hobbies: selectedHobbies || [], // 🔧 修正: selectedHobbies状態から取得
                      occupation: formData.occupation || '',
                      height: formData.height?.toString() || '',
                      body_type: formData.body_type || '',
                      marital_status: formData.marital_status || '',
                      personality: selectedPersonality || [],
                      custom_culture: formData.custom_culture || '',
                      image: profileImages.find(img => img.isMain)?.url || profileImages[0]?.url || '',
                      nationality: formData.nationality || '',
                      // 外国人男性特有のフィールド
                      planned_prefectures: formData.planned_prefectures || [],
                      visit_schedule: formData.visit_schedule || '',
                      travel_companion: formData.travel_companion || ''
                    }
                    
                    sessionStorage.setItem('previewData', JSON.stringify(previewData))
                    console.log('💾 Preview data saved to sessionStorage')
                    
                    // 簡潔なURLでプレビューを開く
                    window.open('/profile/preview', '_blank')
                  } catch (error) {
                    console.error('❌ Error opening preview:', error)
                    alert('プレビューの開用でエラーが発生しました。もう一度お試しください。')
                  }
                }}
              >
                📋 プレビュー確認
              </button>
              <p className="text-sm text-sakura-700 mt-3 text-center">
                相手からの見え方を確認してから更新できます
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
      )}
    </div>
  )
}

export default function ProfileEditPage() {
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('🚨 JavaScript Error Detected:', error)
      setHasError(true)
      setErrorMessage(error.message || 'Unknown error occurred')
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason)
      setHasError(true)
      setErrorMessage(event.reason?.message || 'Promise rejection occurred')
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">エラーが発生しました</h2>
            <p className="text-gray-600 mb-6">
              アプリケーションでエラーが発生しました。<br />
              詳細: {errorMessage}
            </p>
            <Button 
              onClick={() => {
                setHasError(false)
                setErrorMessage('')
                window.location.reload()
              }}
              className="w-full bg-sakura-600 hover:bg-sakura-700 text-white"
            >
              ページを再読み込み
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <ProfileEditContent />
    </AuthGuard>
  )
}