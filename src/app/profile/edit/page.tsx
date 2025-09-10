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
  marital_status: z.enum(['none', 'single', 'married', '']).optional(),
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
  const [completedItems, setCompletedItems] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [profileImages, setProfileImages] = useState<Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>>([])
  const router = useRouter()
  const supabase = createClient()

  // プロフィールタイプに基づく設定
  const isForeignMale = profileType === 'foreign-male'
  const isJapaneseFemale = profileType === 'japanese-female'
  
  // デバッグ用ログ
  console.log('Profile type debug:', {
    profileType,
    isForeignMale,
    isJapaneseFemale,
    searchParams: searchParams.toString()
  })

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
        console.log('🔒 SECURITY: Profile belongs to authenticated user:', {
          profileId: existingProfile.id,
          userId: user.id,
          match: existingProfile.id === user.id
        })
        
        // 🛡️ 二重チェック: プロフィールが確実に現在のユーザーのものであることを確認
        if (existingProfile.id !== user.id) {
          console.error('🚨 CRITICAL SECURITY BREACH: Profile ID does not match user ID', {
            profileId: existingProfile.id,
            userId: user.id
          })
          return
        }
        
        // 既存プロフィールがある場合は、特定フィールドのみを安全にクリア
        // id, email, created_at, updated_at等の重要フィールドは保持
        console.log('🔄 SECURITY: Clearing user data fields only (preserving system fields)')
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            // ユーザー入力データのみクリア（システムデータは保持）
            name: null,
            bio: null,
            interests: null,
            height: null,
            avatar_url: null,
            city: null, // JSONデータも含めてクリア
            personality: null,
            custom_culture: null,
            occupation: null,
            body_type: null,
            marital_status: null
          })
          .eq('id', user.id) // 🛡️ 厳格なWHERE条件
          .eq('email', authUser.user.email) // 🛡️ 追加のセキュリティ条件
        
        if (updateError) {
          console.error('❌ Safe profile reset error:', updateError)
          return
        }
        
        // 🔒 セキュリティ確認: 更新後のデータ整合性チェック
        const { data: updatedProfile, error: verifyError } = await supabase
          .from('profiles')
          .select('id, email, name, bio')
          .eq('id', user.id)
          .single()
        
        if (!verifyError && updatedProfile) {
          console.log('✅ SECURITY: Data integrity verified after update:', {
            userId: updatedProfile.id,
            nameCleared: updatedProfile.name === null,
            bioCleared: updatedProfile.bio === null
          })
        }
        
        console.log('✅ 既存プロフィールの安全な初期化完了')
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
          nationality: urlParams.get('nationality') || '',
          prefecture: urlParams.get('prefecture') || '',
          city: '', // 完全に空
          occupation: 'none', // デフォルト値設定
          height: undefined, // 空
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
        setProfileImages([])
        
        console.log('✅ セキュアな新規登録状態でフォーム初期化完了')
        
        // 完成度を再計算
        setTimeout(() => {
          const cleanData = {
            nickname: urlParams.get('nickname') || '',
            gender: urlParams.get('gender') || '',
            age: urlParams.get('age') ? parseInt(urlParams.get('age')!) : 18,
            prefecture: urlParams.get('prefecture') || '',
            hobbies: [], // 空配列 - 未完了
            self_introduction: '', // 空文字 - 未完了
            nationality: urlParams.get('nationality') || '', // 外国人男性に必要
            // 他は全て空
          }
          calculateProfileCompletion(cleanData)
        }, 500)
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
          
          return baseDefaults
        }

        const defaults = getDefaults()
        
        // 新規登録フローかどうかを判定（マイページからの遷移は除外）
        const isFromMypage = document.referrer.includes('/mypage')
        const hasSignupParams = urlParams.get('type') === 'japanese-female' || urlParams.get('type') === 'foreign-male'
        const isFromSignup = hasSignupParams && !isFromMypage
        
        console.log('=== Profile Edit Debug ===')
        console.log('Current URL:', window.location.href)
        console.log('Document referrer:', document.referrer)
        console.log('Is from mypage:', isFromMypage)
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
        
        const isNewUser = isFromMyPage ? false : ((!profile.bio && !profile.interests && !profile.name) || isTestData || isFromSignup)
        
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
        
        if (!isNewUser && profile.interests && Array.isArray(profile.interests)) {
          profile.interests.forEach((item: string) => {
            if (item.startsWith('personality:')) {
              existingPersonality.push(item.replace('personality:', ''))
            } else if (item.startsWith('custom_culture:')) {
              existingCustomCulture = item.replace('custom_culture:', '')
            } else {
              existingHobbies.push(item)
            }
          })
        }
        
        console.log('🔍 Extracted from interests:', {
          existingPersonality,
          existingHobbies,
          existingCustomCulture
        })
        
        // 既存ユーザーの場合：抽出したデータで状態を更新
        if (!isNewUser) {
          setSelectedPersonality(existingPersonality)
          setSelectedHobbies(existingHobbies)
        }

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
          nationality: isForeignMale ? (defaults.nationality || (isNewUser ? '' : (profile.nationality || ''))) : undefined,
          prefecture: defaults.prefecture || (isNewUser ? '' : (profile.residence || profile.prefecture || '')),
          city: isNewUser ? '' : (parsedOptionalData.city || ''),
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
          console.log('Setting nationality (foreign male):', nationalityValue)
          setValue('nationality', nationalityValue)
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
        
        setSelectedHobbies(isNewUser ? [] : existingHobbies)
        setSelectedPersonality(isNewUser ? [] : existingPersonality)
        if (!isNewUser && profile.avatar_url) {
          setProfileImages([{
            id: '1',
            url: profile.avatar_url,
            originalUrl: profile.avatar_url,
            isMain: true,
            isEdited: false
          }])
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
      } catch (error) {
        console.error('Error loading user data:', error)
        setError('ユーザー情報の読み込みに失敗しました')
      } finally {
        setUserLoading(false)
      }
    }

    loadUserData()
  }, [user, reset, router, setValue, supabase, isForeignMale, isJapaneseFemale])

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
        hobbies: selectedHobbies, // 状態から直接取得
        personality: selectedPersonality, // 状態から直接取得
        avatar_url: profileImages.length > 0 ? 'has_images' : null
      })
    }
  }, [calculateAge, setValue, watch, profileImages, selectedHobbies, selectedPersonality])

  // 画像配列を直接指定する完成度計算関数
  const calculateProfileCompletionWithImages = useCallback((profileData: any, imageArray: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>) => {
    const requiredFields = [
      'nickname', 'gender', 'age', 'birth_date',
      'prefecture', 'hobbies', 'self_introduction'
    ]
    
    // 外国人男性の場合は国籍も必須
    if (isForeignMale) {
      requiredFields.push('nationality')
    }
    
    const optionalFields = [
      'occupation', 'height', 'body_type', 'marital_status', 
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
        case 'birth_date':
          value = profileData.birth_date
          break
        default:
          value = profileData[field]
      }
      
      if (Array.isArray(value)) return value.length > 0
      return value && value.toString().trim().length > 0
    })
    
    const completedOptional = optionalFields.filter(field => {
      let value = profileData[field]
      let isFieldCompleted = false
      
      if (field === 'avatar_url') {
        const hasImages = imageArray.length > 0
        isFieldCompleted = hasImages
        console.log('🖼️ Avatar URL check (with images):', 
          `フィールド: ${field}`,
          `profileData.avatar_url: ${profileData.avatar_url}`,
          `imageArray.length: ${imageArray.length}`,
          `hasImages: ${hasImages}`,
          `結果: ${isFieldCompleted ? '完成' : '未完成'}`
        )
      } else {
        if (field === 'city') value = profileData.city
        
        if (Array.isArray(value)) {
          isFieldCompleted = value.length > 0
        } else if (value === 'none') {
          isFieldCompleted = false
        } else {
          isFieldCompleted = value && value.toString().trim().length > 0
        }
      }
      
      console.log(`🔍 Optional field completion: ${field} = ${value} → ${isFieldCompleted ? '完成' : '未完成'}`)
      return isFieldCompleted
    })
    
    const totalFields = requiredFields.length + optionalFields.length
    const completedFields = completedRequired.length + completedOptional.length
    const completion = Math.round((completedFields / totalFields) * 100)
    
    // デバッグ情報
    console.warn('🎯 プロフィール完成度計算 (with images):', 
      `完成度: ${completion}%`,
      `完成項目: ${completedFields}/${totalFields}`,
      `完成必須: ${completedRequired.join(', ')}`,
      `完成オプション: ${completedOptional.join(', ')}`,
      `写真枚数: ${imageArray.length}`
    )
    
    // 状態を更新して画面に反映
    setProfileCompletion(completion)
    setCompletedItems(completedFields)
    setTotalItems(totalFields)
  }, [isForeignMale])

  const calculateProfileCompletion = useCallback((profileData: any) => {
    const requiredFields = [
      'nickname', 'gender', 'age', 'birth_date',
      'prefecture', 'hobbies', 'self_introduction'
    ]
    
    // 外国人男性の場合は国籍も必須
    if (isForeignMale) {
      requiredFields.push('nationality')
    }
    
    const optionalFields = [
      'occupation', 'height', 'body_type', 'marital_status', 
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
        case 'birth_date':
          value = profileData.birth_date
          break
        default:
          value = profileData[field]
      }
      
      if (Array.isArray(value)) return value.length > 0
      return value && value.toString().trim().length > 0
    })
    
    const optionalFieldsDetail = optionalFields.map(field => {
      let value = profileData[field]
      let isCompleted
      
      if (field === 'avatar_url') {
        const hasImages = profileImages.length > 0
        const hasAvatarUrl = value && value !== null && value !== '' && value !== 'null'
        isCompleted = hasImages || hasAvatarUrl // profileImages状態またはavatar_url値があれば完成扱い
        console.log('🖼️ Avatar URL check:', 
          `フィールド: ${field}`,
          `profileData.avatar_url: ${profileData.avatar_url}`,
          `profileImages.length: ${profileImages.length}`,
          `hasImages: ${hasImages}`,
          `hasAvatarUrl: ${hasAvatarUrl}`,
          `結果: ${isCompleted ? '完成' : '未完成'}`
        )
      } else if (field === 'city') {
        // cityフィールドの特別処理：JSONデータが入っている場合は実際のcity値をチェック
        value = profileData.city
        if (value && typeof value === 'string' && value.startsWith('{')) {
          try {
            const parsedCity = JSON.parse(value)
            const actualCityValue = parsedCity.city
            isCompleted = actualCityValue && actualCityValue !== null && actualCityValue !== '' && actualCityValue !== 'none'
            console.log('🏙️ Edit page - City field JSON analysis:', { originalValue: value, parsedCity, actualCityValue, isCompleted })
          } catch (e) {
            // JSON解析失敗時は通常の文字列として処理
            isCompleted = value && value !== 'none' && value.trim().length > 0
          }
        } else {
          // 通常のcity文字列
          isCompleted = value && value !== 'none' && value !== null && value !== undefined && value !== '' && value.trim().length > 0
        }
      } else if (['occupation', 'height', 'body_type', 'marital_status'].includes(field)) {
        // オプション項目：JSONデータから解析された値を優先使用
        let parsedOptionalData = {}
        let hasJsonData = false
        try {
          if (profileData.city && typeof profileData.city === 'string' && profileData.city.startsWith('{')) {
            parsedOptionalData = JSON.parse(profileData.city)
            // JSONオブジェクトに実際のデータがあるかチェック
            hasJsonData = Object.values(parsedOptionalData).some(val => val !== null && val !== undefined && val !== '')
          }
        } catch (e) {
          // JSON解析失敗時は通常処理
        }
        
        const jsonValue = (parsedOptionalData as any)[field]
        if (jsonValue !== undefined && jsonValue !== null && jsonValue !== '') {
          // JSONから取得した値を使用
          if (field === 'height') {
            // 身長は文字列または数値として保存される可能性があるので両方チェック
            const heightNum = typeof jsonValue === 'string' ? parseInt(jsonValue) : jsonValue
            isCompleted = jsonValue && !isNaN(heightNum) && heightNum > 0
          } else {
            isCompleted = jsonValue && jsonValue !== 'none' && jsonValue !== '' && jsonValue.toString().trim().length > 0
          }
          console.log(`🔍 Edit page - ${field} field JSON analysis:`, { originalValue: value, jsonValue, isCompleted, hasJsonData })
        } else {
          // JSONから値が取得できない場合は元のフィールド値を使用
          if (Array.isArray(value)) {
            isCompleted = value.length > 0
          } else if (value === 'none' || value === null || value === undefined || value === '') {
            isCompleted = false
          } else {
            isCompleted = value && value.toString().trim().length > 0
          }
          console.log(`🔍 Edit page - ${field} field fallback analysis:`, { originalValue: value, isCompleted, reason: 'no JSON data' })
        }
      } else {
        // その他のフィールド（personality等）
        if (field === 'personality') {
          // personalityは配列フィールドとして特別に処理
          isCompleted = Array.isArray(value) && value.length > 0
        } else if (Array.isArray(value)) {
          isCompleted = value.length > 0
        } else if (value === 'none' || value === null || value === undefined || value === '') {
          isCompleted = false
        } else {
          isCompleted = value.toString().trim().length > 0
        }
      }
      
      return { field, value, isCompleted }
    })
    
    const completedOptional = optionalFieldsDetail.filter(item => item.isCompleted)
    
    const totalFields = requiredFields.length + optionalFields.length
    const actualCompletedFields = completedRequired.length + completedOptional.length
    const actualCompletion = Math.round((actualCompletedFields / totalFields) * 100)
    
    // デバッグ情報
    console.warn('🎯 プロフィール完成度計算:', 
      `完成度: ${actualCompletion}%`,
      `完成項目: ${actualCompletedFields}/${totalFields}`,
      `完成必須: ${completedRequired.join(', ')}`,
      `完成オプション: ${completedOptional.map(item => item.field).join(', ')}`,
      `写真枚数: ${profileImages.length}`
    )
    
    console.log('🔍 Edit page - Detailed Optional Fields:')
    console.table(optionalFieldsDetail)

    function getFieldValue(field: string) {
      switch (field) {
        case 'nickname': return profileData.name || profileData.nickname
        case 'self_introduction': return profileData.bio || profileData.self_introduction
        case 'hobbies': return profileData.interests || profileData.hobbies
        case 'prefecture': return profileData.residence || profileData.prefecture
        case 'birth_date': return profileData.birth_date
        case 'avatar_url': return profileImages.length > 0 ? 'has_images' : null
        default: return profileData[field]
      }
    }
    
    setProfileCompletion(actualCompletion)
    setCompletedItems(actualCompletedFields)
    setTotalItems(totalFields)
  }, [isForeignMale, profileImages])

  // フォーム入力時のリアルタイム完成度更新
  useEffect(() => {
    const subscription = watch((value) => {
      if (value) {
        const currentValues = getValues() // 現在のフォーム値を直接取得
        calculateProfileCompletion({
          ...value,
          birth_date: currentValues.birth_date, // フォームから直接取得
          personality: selectedPersonality, // 状態から直接取得
          avatar_url: profileImages.length > 0 ? 'has_images' : null
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, getValues, profileImages, selectedPersonality, calculateProfileCompletion])

  const onSubmit = async (data: ProfileEditFormData, event?: React.BaseSyntheticEvent) => {
    console.log('🚀 onSubmit started - プロフィール更新開始')
    console.log('📝 Form data received:', data)
    console.log('📝 Selected personality:', selectedPersonality)
    console.log('📝 Profile images:', profileImages)
    
    // フォームのデフォルト送信を防止
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (!user) {
      console.error('❌ User not found')
      setError('ユーザー情報が見つかりません')
      return
    }

    console.log('📝 Updating profile for user:', user.id)
    console.log('📋 Form data received:', data)
    
    // 🚨 強制デバッグ: 現在のフォーム状態を確認
    console.log('🔍 Current form values debug:')
    console.log('📊 selectedPersonality:', selectedPersonality)
    console.log('📊 selectedHobbies:', selectedHobbies)
    
    // 🚨 DOM要素から強制的に現在の値を取得
    const currentOccupation = (document.querySelector('select[name="occupation"]') as HTMLSelectElement)?.value
    const currentHeight = (document.querySelector('input[name="height"]') as HTMLInputElement)?.value  
    const currentBodyType = (document.querySelector('select[name="body_type"]') as HTMLSelectElement)?.value
    const currentMaritalStatus = (document.querySelector('select[name="marital_status"]') as HTMLSelectElement)?.value
    const currentCity = (document.querySelector('input[name="city"]') as HTMLInputElement)?.value
    
    console.log('🔍 FORCED DOM VALUES CHECK:')
    console.log('  - occupation (DOM):', currentOccupation)
    console.log('  - height (DOM):', currentHeight)
    console.log('  - body_type (DOM):', currentBodyType) 
    console.log('  - marital_status (DOM):', currentMaritalStatus)
    console.log('  - city (DOM):', currentCity)
    console.log('  - personality (state):', selectedPersonality)
    console.log('  - custom_culture (form):', data.custom_culture)
    
    // 🚨 React Hook FormのgetValues()を使って現在の値を取得
    const formValues = getValues()
    console.log('🔍 REACT HOOK FORM VALUES CHECK:')
    console.log('  - occupation (form):', formValues.occupation)
    console.log('  - height (form):', formValues.height)  
    console.log('  - body_type (form):', formValues.body_type)
    console.log('  - marital_status (form):', formValues.marital_status)
    console.log('  - city (form):', formValues.city)
    console.log('  - data object:', data)
    
    setIsLoading(true)
    setError('')
    
    try {
      // データベーススキーマに存在するフィールドのみ更新
      // オプション項目を含む完全な更新データ
      const updateData = {
        name: data.nickname,
        gender: data.gender,
        age: data.age,
        birth_date: data.birth_date, // birth_dateフィールドを追加
        nationality: isForeignMale ? data.nationality : null,
        residence: data.prefecture,
        city: null as string | null, // JSON形式で後から設定するため初期値はnull
        bio: data.self_introduction,
        interests: data.hobbies,
        avatar_url: profileImages.find(img => img.isMain)?.url || profileImages[0]?.url || null,
      }

      // オプション情報をJSONとしてbioフィールドに付加情報として保存
      // 実際にはカスタムフィールドを作成するのが理想的だが、既存スキーマで対応
      const optionalData = {
        occupation: data.occupation || null,
        height: data.height || null,
        body_type: data.body_type || null,
        marital_status: data.marital_status || null,
        personality: data.personality || null,
        custom_culture: data.custom_culture || null,
      }

      // interestsフィールドを拡張して、personalityやcustom_cultureも含める
      const extendedInterests = [...(data.hobbies || [])]
      
      // personalityは後で統一的に処理するため、ここでは追加しない
      
      if (data.custom_culture && data.custom_culture.trim()) {
        extendedInterests.push(`custom_culture:${data.custom_culture.trim()}`)
      }

      // 🚨 強制的にURLパラメータをチェック（プレビュー経由の場合）
      const urlParams = new URLSearchParams(window.location.search)
      const hasUrlParams = urlParams.toString().length > 0
      
      console.log('🚨 CHECKING URL PARAMS:', hasUrlParams)
      console.log('🚨 URL string:', window.location.search)
      
      if (hasUrlParams) {
        console.log('🚨 Found URL params - extracting option data:')
        console.log('  - occupation:', urlParams.get('occupation'))
        console.log('  - height:', urlParams.get('height'))
        console.log('  - body_type:', urlParams.get('body_type'))  
        console.log('  - marital_status:', urlParams.get('marital_status'))
        console.log('  - city:', urlParams.get('city'))
        console.log('  - personality:', urlParams.get('personality'))
      }
      
      let finalValues
      // プレビューからの場合のみ、URLパラメータから取得（localStorage経由の場合）
      const previewOptionalData = localStorage.getItem('previewOptionalData')
      const isFromPreview = !!previewOptionalData
      
      if (isFromPreview) {
        // プレビューからの場合、localStorageから取得
        try {
          const parsedOptionalData = JSON.parse(previewOptionalData)
          const previewExtendedInterests = localStorage.getItem('previewExtendedInterests')
          const extendedInterests = previewExtendedInterests ? JSON.parse(previewExtendedInterests) : []
          
          // personality データを抽出
          const personalityFromInterests = extendedInterests
            .filter((item: string) => item.startsWith('personality:'))
            .map((item: string) => item.replace('personality:', ''))
          
          finalValues = {
            occupation: parsedOptionalData.occupation,
            height: parsedOptionalData.height,
            body_type: parsedOptionalData.body_type,
            marital_status: parsedOptionalData.marital_status,
            city: parsedOptionalData.city,
            personality: personalityFromInterests.length > 0 ? personalityFromInterests : null,
            custom_culture: extendedInterests.find((item: string) => item.startsWith('custom_culture:'))?.replace('custom_culture:', '') || null
          }
          
          // localStorage は後でクリア（データベース更新後）
          // localStorage.removeItem('previewOptionalData')
          // localStorage.removeItem('previewExtendedInterests')
          
          console.log('🔍 Values from localStorage preview data:', finalValues)
        } catch (error) {
          console.error('❌ Error parsing preview data:', error)
          finalValues = null
        }
      } else {
        // 通常のフォーム送信の場合、DOM要素から取得
        const occupationElement = document.querySelector('select[name="occupation"]') as HTMLSelectElement
        const heightElement = document.querySelector('input[name="height"]') as HTMLInputElement
        const bodyTypeElement = document.querySelector('select[name="body_type"]') as HTMLSelectElement
        const maritalStatusElement = document.querySelector('select[name="marital_status"]') as HTMLSelectElement
        const cityElement = document.querySelector('input[name="city"]') as HTMLInputElement

        finalValues = {
          occupation: occupationElement?.value || data.occupation || null,
          height: heightElement?.value ? Number(heightElement.value) : (data.height || null),
          body_type: bodyTypeElement?.value || data.body_type || null,
          marital_status: maritalStatusElement?.value || data.marital_status || null,
          city: cityElement?.value || data.city || null,
          personality: selectedPersonality.length > 0 ? selectedPersonality : (data.personality || null),
          custom_culture: data.custom_culture || null
        }
        console.log('🔍 Values from DOM elements:', finalValues)
      }

      // finalValuesがnullの場合はデフォルト値を設定
      if (!finalValues) {
        finalValues = {
          occupation: null,
          height: null,
          body_type: null,
          marital_status: null,
          city: null,
          personality: null,
          custom_culture: null
        }
      }

      // Additional metadata in city field (JSON format)
      const additionalInfo = JSON.stringify({
        city: finalValues.city,
        occupation: finalValues.occupation,
        height: finalValues.height,
        body_type: finalValues.body_type,
        marital_status: finalValues.marital_status,
      })

      // personalityは最後に統一的に処理するため、ここでは追加しない

      // 🚨 React Hook Form → URLパラメータ → DOM値の優先順位で値を取得
      const forceOptionalData = {
        city: formValues.city || (hasUrlParams ? (urlParams.get('city') || null) : (currentCity || null)),
        occupation: formValues.occupation || (hasUrlParams ? (urlParams.get('occupation') || null) : (currentOccupation || null)), 
        height: formValues.height || (hasUrlParams ? (urlParams.get('height') ? Number(urlParams.get('height')) : null) : (currentHeight ? Number(currentHeight) : null)),
        body_type: formValues.body_type || (hasUrlParams ? (urlParams.get('body_type') || null) : (currentBodyType || null)),
        marital_status: formValues.marital_status || (hasUrlParams ? (urlParams.get('marital_status') || null) : (currentMaritalStatus || null)),
      }
      
      const forceAdditionalInfo = JSON.stringify(forceOptionalData)
      
      console.log('🚨 FORCING optional data save:', forceOptionalData)
      console.log('🚨 FORCING JSON to city field:', forceAdditionalInfo)
      
      // personalityも強制的に追加（URLパラメータまたは状態から）
      let personalityToSave = selectedPersonality
      if (hasUrlParams && urlParams.get('personality')) {
        personalityToSave = urlParams.get('personality')?.split(',') || []
        console.log('🚨 Using personality from URL params:', personalityToSave)
      }
      
      if (personalityToSave && personalityToSave.length > 0) {
        personalityToSave.forEach(p => {
          if (p && p.trim()) {
            const personalityItem = `personality:${p.trim()}`
            // 重複チェック：既に存在しない場合のみ追加
            if (!extendedInterests.includes(personalityItem)) {
              extendedInterests.push(personalityItem)
            }
          }
        })
      }

      // 🚨 localStorageからプレビューデータを取得（既に上でpreviewOptionalDataは定義済み）
      const previewExtendedInterestsFromStorage = localStorage.getItem('previewExtendedInterests')
      
      if (previewOptionalData && previewExtendedInterestsFromStorage) {
        console.log('🚨 FOUND PREVIEW DATA in localStorage!')
        try {
          const parsedOptionalData = JSON.parse(previewOptionalData)
          const parsedExtendedInterests = JSON.parse(previewExtendedInterestsFromStorage)
          
          console.log('🚨 Using preview optional data:', parsedOptionalData)
          console.log('🚨 Using preview extended interests:', parsedExtendedInterests)
          
          // プレビューデータで上書き
          updateData.city = JSON.stringify(parsedOptionalData)
          updateData.interests = parsedExtendedInterests
          
          // localStorage cleanup
          localStorage.removeItem('previewOptionalData')
          localStorage.removeItem('previewExtendedInterests')
          
        } catch (error) {
          console.error('❌ Error parsing preview data:', error)
        }
      } else {
        console.log('🚨 No preview data found, using React Hook Form data')
        updateData.interests = extendedInterests
        updateData.city = forceAdditionalInfo // React Hook Formの値を使ってJSON保存
        console.log('🚨 Saving fallback data - extendedInterests:', extendedInterests)
        console.log('🚨 Saving fallback data - city (JSON):', forceAdditionalInfo)
      }
      
      // cityフィールドが設定されていない場合の保険処理
      if (!updateData.city) {
        const fallbackOptionalData = {
          city: data.city || null,
          occupation: data.occupation || null,
          height: data.height || null,
          body_type: data.body_type || null,
          marital_status: data.marital_status || null,
        }
        updateData.city = JSON.stringify(fallbackOptionalData)
        console.log('🔧 Fallback city data set:', updateData.city)
      }

      console.log('🔄 FINAL update data with preview data:', updateData)
      
      console.log('🔄 Updating database with data:', updateData)
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (updateError) {
        throw new Error(updateError.message)
      }
      
      // 更新成功後、マイページに遷移
      console.log('✅ Profile updated successfully! Redirecting to mypage...')
      setIsLoading(false)
      setUpdateSuccess(true)
      
      // 即座にマイページに遷移
      router.push('/mypage')
    } catch (error) {
      console.error('❌ Profile update error:', error)
      setIsLoading(false)
      if (error instanceof Error) {
        setError(error.message)
        console.error('Error details:', error.message)
      } else {
        setError('プロフィールの更新に失敗しました。もう一度お試しください。')
        console.error('Unknown error:', error)
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
      const currentValues = getValues()
      calculateProfileCompletion({
        ...currentData,
        birth_date: currentValues.birth_date, // フォームから直接取得
        hobbies: newHobbies,
        personality: selectedPersonality, // 状態から直接取得
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
      const currentValues = getValues()
      calculateProfileCompletion({
        ...currentData,
        birth_date: currentValues.birth_date, // フォームから直接取得
        hobbies: selectedHobbies, // 状態から直接取得
        personality: newPersonality,
        avatar_url: profileImages.length > 0 ? 'has_images' : null
      })
    }
  }

  // 写真変更時のコールバック関数
  const handleImagesChange = (newImages: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>) => {
    console.log('🚨🚨🚨 HANDLE IMAGES CHANGE CALLED!')
    console.log('📸 写真変更:', 
      `新しい画像数: ${newImages.length}`,
      `avatar_url値: ${newImages.length > 0 ? 'has_images' : null}`,
      newImages
    )
    
    setProfileImages(newImages)
    
    // 写真変更時に完成度を再計算（最新の画像配列を直接渡す）
    const currentData = watch()
    
    // 状態更新を待つため少し遅延してから計算
    setTimeout(() => {
      console.log('🔄 Delayed completion calculation with new images:', newImages.length)
      // 画像配列を直接渡す専用関数のみを使用
      const currentValues = getValues()
      calculateProfileCompletionWithImages({
        ...currentData,
        birth_date: currentValues.birth_date, // フォームから直接取得
        hobbies: selectedHobbies, // 状態から直接取得
        personality: selectedPersonality, // 状態から直接取得
        // avatar_urlは画像配列で判定するため設定しない
      }, newImages)
    }, 100)
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

  // 結婚状況オプション
  const MARITAL_STATUS_OPTIONS = [
    { value: 'none', label: '記入しない' },
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

              {/* 性別フィールドは外国人男性プロフィールでのみ表示 */}
              {profileType === 'foreign-male' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    性別 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={watch('gender') === 'male' ? '男性' : '女性'}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">性別は仮登録時に設定済みのため変更できません</p>
                </div>
              )}

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
              <button
                type="button"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-4 px-4 rounded-lg transition-colors flex items-center justify-center text-lg mb-4"
                onClick={() => {
                  // 🔧 デバッグ: 直接更新を試す
                  console.log('🔧 Direct update button clicked!')
                  const hiddenSubmit = document.querySelector('button[type="submit"][aria-hidden="true"]') as HTMLButtonElement
                  if (hiddenSubmit) {
                    console.log('🔧 Found hidden submit, triggering direct update')
                    hiddenSubmit.click()
                  } else {
                    console.log('❌ Hidden submit not found, trying preview instead')
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
                  }
                }}
              >
                🔧 【テスト】直接更新 / プレビュー
              </button>

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
                      prefecture: formData.prefecture || '',
                      city: formData.city || '',
                      self_introduction: formData.self_introduction || '',
                      hobbies: formData.hobbies || [],
                      occupation: formData.occupation || '',
                      height: formData.height?.toString() || '',
                      body_type: formData.body_type || '',
                      marital_status: formData.marital_status || '',
                      personality: selectedPersonality || [],
                      custom_culture: formData.custom_culture || '',
                      image: profileImages.find(img => img.isMain)?.url || profileImages[0]?.url || '',
                      nationality: formData.nationality || ''
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
              
              {/* 🔧 テスト用直接更新ボタン */}
              <button
                type="button"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-4 px-4 rounded-lg transition-colors flex items-center justify-center text-lg"
                onClick={() => {
                  // 隠しsubmitボタンをクリックして直接フォーム送信
                  console.log('🔧 Test button clicked - attempting direct update')
                  const hiddenSubmit = document.querySelector('button[type="submit"][aria-hidden="true"]') as HTMLButtonElement
                  if (hiddenSubmit) {
                    console.log('🔧 Found hidden submit button, clicking now')
                    hiddenSubmit.click()
                  } else {
                    console.log('❌ Hidden submit button not found')
                  }
                }}
              >
                🔧 【テスト用】直接更新
              </button>
              <p className="text-sm text-sakura-700 mt-3 text-center">
                相手からの見え方を確認してから更新できます
              </p>
            </div>
            
            {/* 🔧 テスト用直接更新ボタン */}
            <div className="bg-green-50 border border-green-300 rounded-lg p-6 mt-4">
              <h3 className="text-lg font-semibold text-green-800 mb-3 text-center">
                🔧 デバッグ用直接更新
              </h3>
              <p className="text-sm text-green-700 mb-4 text-center">
                プレビューを経由せず直接データベースに保存します
              </p>
              <button
                type="button"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-4 px-4 rounded-lg transition-colors flex items-center justify-center text-lg"
                onClick={() => {
                  // 隠しsubmitボタンをクリックして直接フォーム送信
                  const hiddenSubmit = document.querySelector('button[type="submit"][aria-hidden="true"]') as HTMLButtonElement
                  if (hiddenSubmit) {
                    console.log('🔧 Clicking hidden submit button for direct update')
                    hiddenSubmit.click()
                  }
                }}
              >
                🔧 【テスト用】直接更新
              </button>
              <p className="text-sm text-green-700 mt-3 text-center">
                デバッグ用：プレビューなしで即座に保存
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