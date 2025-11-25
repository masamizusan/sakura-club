'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { calculateProfileCompletion as calculateSharedProfileCompletion } from '@/utils/profileCompletion'
import AuthGuard from '@/components/auth/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import { useAuth } from '@/store/authStore'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { 
  User, 
  Edit3,
  Heart,
  Star,
  Gift,
  Shield,
  Settings,
  CreditCard,
  Users,
  ArrowLeft,
  Check,
  X,
  History,
  LogOut,
  Calendar
} from 'lucide-react'

function MyPageContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [completedItems, setCompletedItems] = useState(0)
  const [totalItems, setTotalItems] = useState(8)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      console.log('MyPage loadProfile called, user:', !!user, user?.id)
      
      // テストモード時はlocalStorageデータの処理を先に実行
      const hasPreviewData = localStorage.getItem('previewCompleteData') || 
                           localStorage.getItem('updateProfile')
      
      console.log('🔍 MyPage: Test mode preview data check:', {
        hasUser: !!user,
        hasPreviewData: !!hasPreviewData
      })
      
      if (!user && !hasPreviewData) {
        console.log('⏸️ MyPage: No user and no preview data, stopping')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        
        // プレビューからのプロフィール更新データをチェック
        const shouldUpdate = localStorage.getItem('updateProfile')
        const previewCompleteData = localStorage.getItem('previewCompleteData')
        const previewOptionalData = localStorage.getItem('previewOptionalData')
        const previewExtendedInterests = localStorage.getItem('previewExtendedInterests')
        
        console.log('🔍 DEBUG: localStorage check:', {
          shouldUpdate,
          hasCompleteData: !!previewCompleteData,
          hasOptionalData: !!previewOptionalData,
          hasInterestsData: !!previewExtendedInterests
        })
        
        if (previewCompleteData) {
          console.log('🎯 MyPage: Processing complete preview update data')
          
          try {
            const completeData = JSON.parse(previewCompleteData)
            console.log('🔍 DEBUG: Parsed complete data:', completeData)
            
            // 🛠️ 修正: 全フィールドを更新するデータを準備
            const updateData: any = {}
            
            // 基本情報の更新（存在するカラムのみ）
            if (completeData.name) updateData.name = completeData.name
            if (completeData.bio) updateData.bio = completeData.bio
            if (completeData.age) updateData.age = completeData.age
            if (completeData.birth_date) updateData.birth_date = completeData.birth_date
            if (completeData.gender) updateData.gender = completeData.gender
            if (completeData.nationality) updateData.nationality = completeData.nationality
            if (completeData.residence) updateData.residence = completeData.residence
            // 画像の更新：存在する場合は設定、削除された場合はnullを設定
            updateData.avatar_url = completeData.profile_image || null
            console.log('🖼️ MyPage: 画像データ更新:', {
              'completeData.profile_image': completeData.profile_image,
              'updateData.avatar_url': updateData.avatar_url
            })
            // prefecture は既存のresidenceフィールドを使用
            
            // オプション情報（city JSONに格納）
            if (completeData.optionalData) {
              updateData.city = JSON.stringify(completeData.optionalData)
            }
            
            // interests配列
            if (completeData.interests) {
              updateData.interests = completeData.interests
            }
            
            // 🆕 Triple-save: 新しいカラムに分離保存
            if (completeData.personality_tags) {
              updateData.personality_tags = completeData.personality_tags.length > 0 ? completeData.personality_tags : null
            }
            if (completeData.culture_tags) {
              updateData.culture_tags = completeData.culture_tags.length > 0 ? completeData.culture_tags : null
            }

            // 外国人男性専用フィールドを追加（外国人男性のみ）
            const isForeignMale = completeData.gender === 'male' &&
              completeData.nationality &&
              completeData.nationality !== '日本'

            console.log('🔍 DEBUG: Foreign male check:', {
              gender: completeData.gender,
              nationality: completeData.nationality,
              isForeignMale: isForeignMale
            })

            if (isForeignMale) {
              if (completeData.visit_schedule) updateData.visit_schedule = completeData.visit_schedule
              if (completeData.travel_companion) updateData.travel_companion = completeData.travel_companion
              if (completeData.planned_prefectures) updateData.planned_prefectures = completeData.planned_prefectures
              // 🆕 japanese_levelをnone条件判定で専用カラムに保存
              updateData.japanese_level = completeData.japanese_level === 'none' ? null : completeData.japanese_level
              console.log('✅ MyPage: 外国人男性専用フィールド（japanese_level含む）を追加しました', {
                'completeData.japanese_level': completeData.japanese_level,
                'updateData.japanese_level': updateData.japanese_level
              })
            } else {
              // 🆕 english_levelをnone条件判定で専用カラムに保存  
              updateData.english_level = completeData.english_level === 'none' ? null : completeData.english_level
              console.log('✅ MyPage: 日本人女性のenglish_levelを追加しました', {
                'completeData.english_level': completeData.english_level,
                'updateData.english_level': updateData.english_level
              })
            }
            
            console.log('🚨 MyPage: Complete update data prepared', updateData)
            console.log('🔍 DEBUG: updateData keys and values:')
            Object.keys(updateData).forEach(key => {
              console.log(`  - ${key}:`, updateData[key], typeof updateData[key])
            })
            console.log('🔍 DEBUG: birth_date specifically:', {
              'completeData.birth_date': completeData.birth_date,
              'updateData.birth_date': updateData.birth_date,
              'birth_date type': typeof completeData.birth_date
            })
            
            // データベース更新（ユーザーが存在する場合のみ）
            if (user?.id) {
              const { error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', user.id)
              
              if (updateError) {
                console.error('❌ Profile update error:', updateError)
              } else {
                console.log('✅ Profile updated successfully with complete data from preview')
              }
            } else {
              console.log('⚠️ MyPage: No user ID, skipping database update (test mode)')
            }
            
            // 認証済みユーザーの場合：データベース更新後に再取得、未認証の場合：表示用データ設定
            if (user?.id) {
              console.log('🎯 MyPage: Authenticated user - database updated, will refetch')
              // 認証済みユーザーの場合のみlocalStorageをクリア
              localStorage.removeItem('updateProfile')
              localStorage.removeItem('previewCompleteData')
              localStorage.removeItem('previewOptionalData')
              localStorage.removeItem('previewExtendedInterests')
            } else {
              console.log('🎯 MyPage: Test mode - setting profile data for display')
              
              // テストモード時も同じ正規化処理を適用
              let parsedOptionalData: {
                city?: string;
                occupation?: string;
                height?: number;
                body_type?: string;
                marital_status?: string;
                english_level?: string;
                japanese_level?: string;
              } = {}
              
              if (completeData.optionalData) {
                parsedOptionalData = completeData.optionalData
              }
              
              // 🆕 Triple-save対応: 新しいカラム優先で性格・文化データを分離
              let extendedPersonality: string[] = []
              let extendedCustomCulture: string | null = null
              let regularInterests: string[] = []
              
              // 1. personality_tagsカラムから性格データを取得（優先）
              if (completeData.personality_tags && Array.isArray(completeData.personality_tags) && completeData.personality_tags.length > 0) {
                extendedPersonality = completeData.personality_tags.filter((item: string) => item !== 'その他')
              } else if (Array.isArray(completeData.interests)) {
                // 2. interests配列からpersonalityプレフィックス付きを抽出（フォールバック）
                completeData.interests.forEach((item: any) => {
                  if (typeof item === 'string' && item.startsWith('personality:')) {
                    extendedPersonality.push(item.replace('personality:', ''))
                  }
                })
              }
              
              // 1. culture_tagsカラムから日本文化データを取得（優先）
              if (completeData.culture_tags && Array.isArray(completeData.culture_tags) && completeData.culture_tags.length > 0) {
                regularInterests = completeData.culture_tags.filter((item: string) => item !== 'その他')
              } else if (Array.isArray(completeData.interests)) {
                // 2. interests配列からculture/hobbyデータを抽出（フォールバック）
                completeData.interests.forEach((item: any) => {
                  if (typeof item === 'string') {
                    if (!item.startsWith('personality:') && !item.startsWith('custom_culture:')) {
                      regularInterests.push(item)
                    }
                  } else {
                    regularInterests.push(item)
                  }
                })
              }
              
              // custom_cultureは従来通り（direct fieldとinterests配列から）
              if (completeData.custom_culture) {
                extendedCustomCulture = completeData.custom_culture
              } else if (Array.isArray(completeData.interests)) {
                completeData.interests.forEach((item: any) => {
                  if (typeof item === 'string' && item.startsWith('custom_culture:')) {
                    extendedCustomCulture = item.replace('custom_culture:', '')
                  }
                })
              }
              
              // 正規化されたテストデータを作成
              const normalizedTestData = {
                ...completeData,
                ...parsedOptionalData,
                interests: regularInterests,
                personality: extendedPersonality.length > 0 ? extendedPersonality : [],
                custom_culture: extendedCustomCulture,
                hobbies: regularInterests,
                // 外国人男性専用フィールドを明示的に含める
                visit_schedule: completeData.visit_schedule,
                travel_companion: completeData.travel_companion,
                planned_prefectures: completeData.planned_prefectures,
                japanese_level: parsedOptionalData.japanese_level || completeData.japanese_level,
                english_level: parsedOptionalData.english_level || completeData.english_level
              }
              
              console.log('🔄 Test mode: Normalized test data:', normalizedTestData)
              setProfile(normalizedTestData)
              console.log('🎯 MyPage: Test mode - calculating profile completion')
              calculateProfileCompletion(normalizedTestData)
              
              // テストモード時は即座にはクリアせず、次回訪問まで保持
              console.log('🧪 Test mode: Preserving localStorage for display consistency')
            }
            
            // データベース更新後少し待機してからデータを取得（キャッシュ問題対策）
            if (user?.id) {
              console.log('⏳ Waiting for complete database update to complete...')
              await new Promise(resolve => setTimeout(resolve, 500))
            }
            
          } catch (error) {
            console.error('❌ Error processing complete preview update:', error)
          }
        } else if (previewOptionalData && previewExtendedInterests) {
          // 🔄 フォールバック: 従来の部分的な更新処理（互換性のため）
          console.log('🎯 MyPage: Processing partial preview update data (fallback)')
          
          try {
            const optionalData = JSON.parse(previewOptionalData)
            const extendedInterests = JSON.parse(previewExtendedInterests)
            
            // プロフィール更新処理（部分的）
            const updateData = {
              city: JSON.stringify(optionalData),
              interests: extendedInterests
            }
            
            // データベース更新（ユーザーが存在する場合のみ）
            if (user?.id) {
              const { error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', user.id)
              
              if (updateError) {
                console.error('❌ Profile update error:', updateError)
              } else {
                console.log('✅ Profile updated successfully from preview (partial)')
              }
            } else {
              console.log('⚠️ MyPage: No user ID, skipping database update (partial, test mode)')
            }
            
            // 認証済みユーザーの場合のみlocalStorageクリア
            if (user?.id) {
              localStorage.removeItem('updateProfile')
              localStorage.removeItem('previewOptionalData')
              localStorage.removeItem('previewExtendedInterests')
            } else {
              console.log('🧪 Test mode: Preserving partial localStorage for consistency')
            }
            
            // データベース更新後少し待機してからデータを取得（キャッシュ問題対策）
            console.log('⏳ Waiting for database update to complete...')
            await new Promise(resolve => setTimeout(resolve, 500))
            
          } catch (error) {
            console.error('❌ Error processing preview update:', error)
          }
        }
        
        // プロフィールデータを取得（ユーザーが存在する場合のみ）
        if (user?.id) {
          console.log('🔍 Fetching updated profile data from database...')
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        console.log('========== MYPAGE DEBUG START ==========')
        console.log('Profile data loaded:', !!profileData, error?.message)
        console.log('🔍 Raw profile data from database:', profileData)
        console.log('🔍 Critical fields debug:')
        console.log('  - name:', profileData?.name)
        console.log('  - bio:', profileData?.bio)
        console.log('  - age:', profileData?.age)
        console.log('  - birth_date:', profileData?.birth_date)
        console.log('  - avatar_url:', profileData?.avatar_url)
        console.log('  - city (raw):', profileData?.city, typeof profileData?.city)
        console.log('  - interests (raw):', profileData?.interests)
        console.log('  - height:', profileData?.height)
        console.log('  - occupation:', profileData?.occupation)
        console.log('========== MYPAGE DEBUG END ===========')

        if (profileData && !error) {
          // プロフィール編集ページと同じデータ正規化処理
          let parsedOptionalData: {
            city?: string;
            occupation?: string;
            height?: number;
            body_type?: string;
            marital_status?: string;
            english_level?: string;
            japanese_level?: string;
          } = {}
          if (profileData.city && typeof profileData.city === 'string' && profileData.city.startsWith('{')) {
            try {
              parsedOptionalData = JSON.parse(profileData.city)
              console.log('🔄 MyPage - Parsed optional data from city field:', parsedOptionalData)
            } catch (e) {
              console.warn('⚠️ Failed to parse city JSON, using as string')
              parsedOptionalData = { city: profileData.city }
            }
          } else {
            parsedOptionalData = { city: profileData.city }
          }

          // 🆕 Triple-save対応: 新しいカラム優先で性格・文化データを分離
          let extendedPersonality: string[] = []
          let extendedCustomCulture: string | null = null
          let regularInterests: string[] = []
          
          // 1. personality_tagsカラムから性格データを取得（優先）
          if ((profileData as any).personality_tags && Array.isArray((profileData as any).personality_tags) && (profileData as any).personality_tags.length > 0) {
            extendedPersonality = (profileData as any).personality_tags.filter((item: string) => item !== 'その他')
          } else if (Array.isArray(profileData.interests)) {
            // 2. interests配列からpersonalityプレフィックス付きを抽出（フォールバック）
            profileData.interests.forEach((item: any) => {
              if (typeof item === 'string' && item.startsWith('personality:')) {
                extendedPersonality.push(item.replace('personality:', ''))
              }
            })
          }
          
          // 1. culture_tagsカラムから日本文化データを取得（優先）
          if ((profileData as any).culture_tags && Array.isArray((profileData as any).culture_tags) && (profileData as any).culture_tags.length > 0) {
            regularInterests = (profileData as any).culture_tags.filter((item: string) => item !== 'その他')
          } else if (Array.isArray(profileData.interests)) {
            // 2. interests配列からculture/hobbyデータを抽出（フォールバック）
            profileData.interests.forEach((item: any) => {
              if (typeof item === 'string') {
                if (!item.startsWith('personality:') && !item.startsWith('custom_culture:')) {
                  regularInterests.push(item)
                }
              } else {
                regularInterests.push(item)
              }
            })
          }
          
          // custom_cultureは従来通り（direct fieldとinterests配列から）
          if ((profileData as any).custom_culture) {
            extendedCustomCulture = (profileData as any).custom_culture
          } else if (Array.isArray(profileData.interests)) {
            profileData.interests.forEach((item: any) => {
              if (typeof item === 'string' && item.startsWith('custom_culture:')) {
                extendedCustomCulture = item.replace('custom_culture:', '')
              }
            })
          }

          // 正規化されたプロフィールデータを作成
          const normalizedProfileData = {
            ...profileData,
            ...parsedOptionalData,
            interests: regularInterests,
            personality: extendedPersonality.length > 0 ? extendedPersonality : [],
            custom_culture: extendedCustomCulture,
            hobbies: regularInterests, // compatibilityのため
            // 🆕 言語レベル（専用カラム優先、JSONフォールバック）
            english_level: profileData.english_level || parsedOptionalData.english_level,
            japanese_level: profileData.japanese_level || parsedOptionalData.japanese_level,
            // 外国人男性専用フィールドを明示的に含める
            visit_schedule: profileData.visit_schedule,
            travel_companion: profileData.travel_companion,
            planned_prefectures: profileData.planned_prefectures
          }

          console.log('========== NORMALIZED DATA DEBUG ==========')
          console.log('🔄 MyPage - Normalized profile data:', normalizedProfileData)
          console.log('🔄 Normalized critical fields:')
          console.log('  - name:', normalizedProfileData.name)
          console.log('  - bio:', normalizedProfileData.bio)
          console.log('  - age:', normalizedProfileData.age)
          console.log('  - birth_date:', normalizedProfileData.birth_date)
          console.log('  - avatar_url:', normalizedProfileData.avatar_url)
          console.log('  - city:', normalizedProfileData.city)
          console.log('  - interests:', normalizedProfileData.interests)
          console.log('  - personality:', normalizedProfileData.personality)
          console.log('  - height:', normalizedProfileData.height)
          console.log('  - occupation:', normalizedProfileData.occupation)
          console.log('  - body_type:', normalizedProfileData.body_type)
          console.log('  - marital_status:', normalizedProfileData.marital_status)
          console.log('  - english_level:', normalizedProfileData.english_level)
          console.log('  - japanese_level:', normalizedProfileData.japanese_level)
          console.log('  - custom_culture:', normalizedProfileData.custom_culture)
          console.log('  - visit_schedule:', normalizedProfileData.visit_schedule, typeof normalizedProfileData.visit_schedule)
          console.log('  - travel_companion:', normalizedProfileData.travel_companion, typeof normalizedProfileData.travel_companion)
          console.log('  - planned_prefectures:', normalizedProfileData.planned_prefectures, typeof normalizedProfileData.planned_prefectures, Array.isArray(normalizedProfileData.planned_prefectures) ? `length: ${normalizedProfileData.planned_prefectures.length}` : 'not array')

          // 🔍 外国人男性専用フィールドの詳細デバッグ
          console.log('🌍 FOREIGN MALE FIELDS DETAILED DEBUG:')
          console.log('Raw data from database:')
          console.log('  - raw visit_schedule:', profileData.visit_schedule, typeof profileData.visit_schedule)
          console.log('  - raw travel_companion:', profileData.travel_companion, typeof profileData.travel_companion)
          console.log('  - raw planned_prefectures:', profileData.planned_prefectures, typeof profileData.planned_prefectures, Array.isArray(profileData.planned_prefectures) ? `length: ${profileData.planned_prefectures.length}` : 'not array')
          console.log('Normalized data:')
          console.log('  - normalized visit_schedule:', normalizedProfileData.visit_schedule)
          console.log('  - normalized travel_companion:', normalizedProfileData.travel_companion)
          console.log('  - normalized planned_prefectures:', normalizedProfileData.planned_prefectures)
          
          console.log('🚨 MyPage - Data for Profile Edit Comparison:')
          console.log('  - originalCityField:', profileData.city)
          console.log('  - parsedOptionalData:', parsedOptionalData)
          console.log('  - originalInterests:', profileData.interests)
          console.log('  - extractedPersonality:', extendedPersonality)
          console.log('  - extractedCustomCulture:', extendedCustomCulture)
          
          // プロフィール編集画面との詳細比較用ログ
          console.log('🔍 DETAILED FIELD VALUES FOR EDIT COMPARISON:')
          console.log('Birth date related fields:', {
            birth_date: profileData.birth_date,
            date_of_birth: profileData.date_of_birth,
            birthday: profileData.birthday,
            dob: profileData.dob,
            age: profileData.age
          })
          console.log('City field analysis:', {
            rawCity: profileData.city,
            cityType: typeof profileData.city,
            isJson: profileData.city?.startsWith('{'),
            parsedCity: parsedOptionalData?.city,
            finalDisplayCity: normalizedProfileData.city
          })
          console.log('Occupation field analysis:', {
            rawOccupation: profileData.occupation,
            parsedOccupation: parsedOptionalData?.occupation,
            finalOccupation: normalizedProfileData.occupation
          })
          console.log('Height field analysis:', {
            rawHeight: profileData.height,
            parsedHeight: parsedOptionalData?.height,
            finalHeight: normalizedProfileData.height
          })
          console.log('Body type field analysis:', {
            rawBodyType: profileData.body_type,
            parsedBodyType: parsedOptionalData?.body_type,
            finalBodyType: normalizedProfileData.body_type
          })
          console.log('Marital status field analysis:', {
            rawMaritalStatus: profileData.marital_status,
            parsedMaritalStatus: parsedOptionalData?.marital_status,
            finalMaritalStatus: normalizedProfileData.marital_status
          })
          console.log('Interests transformation:', {
            originalInterests: profileData.interests,
            regularInterests: regularInterests,
            extractedPersonality: extendedPersonality,
            extractedCustomCulture: extendedCustomCulture
          })
          console.log('========== NORMALIZED DATA DEBUG END ==========')
          setProfile(normalizedProfileData)
          calculateProfileCompletion(normalizedProfileData)
        }
        } else {
          console.log('⚠️ MyPage: No user, skipping database profile fetch (test mode)')
        }
      } catch (error) {
        console.error('Profile load error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [user, supabase])

  const calculateProfileCompletion = (profileData: any) => {
    // 共通関数を使用（マイページとプロフィール編集画面で統一）
    const isForeignMale = profileData.gender === 'male' && profileData.nationality && profileData.nationality !== '日本'

    // 🔍 外国人男性判定デバッグ
    console.log('🚨 MyPage: 外国人男性判定チェック:', {
      gender: profileData.gender,
      nationality: profileData.nationality,
      nationalityType: typeof profileData.nationality,
      isNotJapan: profileData.nationality !== '日本',
      isForeignMale: isForeignMale,
      visit_schedule: profileData.visit_schedule,
      travel_companion: profileData.travel_companion,
      planned_prefectures: profileData.planned_prefectures
    })

    // 🔍 MyPage専用: profileDataの詳細デバッグ
    console.log('🔍 MyPage: profileData debug BEFORE shared function:', {
      avatar_url: profileData?.avatar_url,
      avatarUrl: profileData?.avatarUrl,
      hasAvatarUrl: !!profileData?.avatar_url,
      hasAvatarUrlCamel: !!profileData?.avatarUrl,
      profileDataKeys: Object.keys(profileData || {}),
      nickname: profileData?.nickname || profileData?.name,
      age: profileData?.age,
      birth_date: profileData?.birth_date || profileData?.date_of_birth,
      prefecture: profileData?.prefecture || profileData?.residence,
      hobbies: profileData?.hobbies || profileData?.interests,
      self_introduction: profileData?.self_introduction || profileData?.bio
    })

    const result = calculateSharedProfileCompletion(profileData, undefined, isForeignMale)

    // 既存のUI更新ロジックを維持
    setProfileCompletion(result.completion)
    setCompletedItems(result.completedFields)
    setTotalItems(result.totalFields)

    console.log('📊 MyPage Profile Completion (共通関数使用):', {
      required: `${result.requiredCompleted}/${result.requiredTotal}`,
      optional: `${result.optionalCompleted}/${result.optionalTotal}`,
      images: `${result.hasImages ? 1 : 0}/1`,
      total: `${result.completedFields}/${result.totalFields}`,
      percentage: `${result.completion}%`
    })

    return

    // 以下は古いロジック（削除予定）
    const requiredFields = [
      'nickname', 'age', 'birth_date',
      'prefecture', 'hobbies', 'self_introduction'
    ]
    // 注意: genderは編集不可のため完成度計算から除外

    // 外国人男性の場合は国籍も必須（今回は日本人女性なので追加しない）
    // if (isForeignMale) {
    //   requiredFields.push('nationality')
    // }

    const optionalFields = [
      'occupation', 'height', 'body_type', 'marital_status',
      'personality', 'city'
    ]

    // 既に正規化されたデータを使用（重複処理を防ぐ）
    const mergedProfile = profileData

    console.log('🔍 Using normalized profile data:', mergedProfile)
    
    const completedRequired = requiredFields.filter(field => {
      let value
      
      // Map form field names to merged profile data field names
      switch (field) {
        case 'nickname':
          value = mergedProfile.name || mergedProfile.nickname
          break
        case 'self_introduction':
          value = mergedProfile.bio || mergedProfile.self_introduction
          // デフォルト文は未完了扱い
          if (value === '後でプロフィールを詳しく書きます。' || value === '') {
            value = null
          }
          break
        case 'hobbies':
          value = mergedProfile.interests || mergedProfile.hobbies
          // デフォルトの['その他']は未完了扱い
          if (Array.isArray(value) && value.length === 1 && value[0] === 'その他') {
            value = null
          }
          // custom_cultureも日本文化の一部として含める
          const hasCustomCulture = mergedProfile.custom_culture && mergedProfile.custom_culture.trim().length > 0
          if (Array.isArray(value) && value.length > 0) {
            // 既に選択された趣味があるので完成とみなす
          } else if (hasCustomCulture) {
            // 選択された趣味はないが、カスタム文化があれば完成とみなす
            value = ['custom']
          }
          break
        case 'prefecture':
          value = mergedProfile.residence || mergedProfile.prefecture
          break
        case 'birth_date':
          value = mergedProfile.birth_date
          break
        default:
          value = mergedProfile[field]
      }
      
      if (Array.isArray(value)) return value.length > 0
      return value && value.toString().trim().length > 0
    })
    
    const completedOptional = optionalFields.filter(field => {
      let value = mergedProfile[field]
      
      // 正規化されたデータから値を取得（既に処理済み）
      if (['occupation', 'height', 'body_type', 'marital_status'].includes(field)) {
        value = mergedProfile[field]
        console.log(`🔍 Optional field ${field} from normalized data:`, value)
        
        // 値がundefinedまたは存在しない場合は未完了
        if (value === undefined || value === null || value === '') {
          return false
        }
        // 有効な値がある場合のみ完了扱い
        return value.toString().trim().length > 0
      }
      
      // その他のフィールドの判定
      if (Array.isArray(value)) {
        return value.length > 0
      } else if (value === 'none' || value === null || value === undefined || value === '') {
        return false
      } else {
        return value.toString().trim().length > 0
      }
    })
    
    // 写真の有無もチェック（プロフィール編集ページと同じ計算）
    const hasImages = mergedProfile.avatar_url && mergedProfile.avatar_url !== null
    const totalRequiredItems = requiredFields.length + optionalFields.length + 1 // 13 items total (12 fields + images)
    const imageCompletionCount = hasImages ? 1 : 0
    
    // 詳細デバッグログ
    const requiredFieldsDetail = requiredFields.map(field => {
      let value, mappedField
      switch (field) {
        case 'nickname':
          mappedField = 'name'
          value = mergedProfile.name || mergedProfile.nickname
          break
        case 'self_introduction':
          mappedField = 'bio'
          value = mergedProfile.bio || mergedProfile.self_introduction
          break
        case 'hobbies':
          mappedField = 'interests'
          value = mergedProfile.interests || mergedProfile.hobbies
          const hasCustomCulture = mergedProfile.custom_culture && mergedProfile.custom_culture.trim().length > 0
          if (Array.isArray(value) && value.length > 0) {
            // 既に選択された趣味があるので完成とみなす
          } else if (hasCustomCulture) {
            value = ['custom']
          }
          break
        case 'prefecture':
          mappedField = 'residence'
          value = mergedProfile.residence || mergedProfile.prefecture
          break
        default:
          mappedField = field
          value = mergedProfile[field]
      }
      
      const isCompleted = Array.isArray(value) ? value.length > 0 : (value && value.toString().trim().length > 0)
      return { field, mappedField, value, isCompleted }
    })
    
    const optionalFieldsDetail = optionalFields.map(field => {
      let value = mergedProfile[field]
      let isCompleted
      
      if (field === 'avatar_url') {
        isCompleted = value && value !== null
      } else if (field === 'city') {
        // cityフィールドの特別処理：JSONデータが入っている場合は実際のcity値をチェック
        if (value && typeof value === 'string' && value.startsWith('{')) {
          try {
            const parsedCity = JSON.parse(value)
            const actualCityValue = parsedCity.city
            isCompleted = actualCityValue && actualCityValue !== null && actualCityValue !== '' && actualCityValue !== 'none'
            console.log('🏙️ City field JSON analysis:', { originalValue: value, parsedCity, actualCityValue, isCompleted })
          } catch (e) {
            // JSON解析失敗時は通常の文字列として処理
            isCompleted = value && value !== 'none' && value.trim().length > 0
          }
        } else {
          // 通常のcity文字列
          isCompleted = value && value !== 'none' && value !== null && value !== undefined && value !== '' && value.trim().length > 0
        }
      } else if (['occupation', 'height', 'body_type', 'marital_status'].includes(field)) {
        // オプション項目：正規化されたデータを使用
        const normalizedValue = mergedProfile[field]
        if (normalizedValue !== undefined && normalizedValue !== null) {
          // 正規化されたデータから値を使用
          if (field === 'height') {
            // 身長は文字列または数値として保存される可能性があるので両方チェック
            const heightNum = typeof normalizedValue === 'string' ? parseInt(normalizedValue) : normalizedValue
            isCompleted = normalizedValue && !isNaN(heightNum) && heightNum > 0
          } else {
            isCompleted = normalizedValue && normalizedValue !== 'none' && normalizedValue !== '' && normalizedValue.toString().trim().length > 0
          }
          console.log(`🔍 ${field} field normalized analysis:`, { normalizedValue, isCompleted })
        } else {
          // 正規化されたデータに値がない場合は未完了
          isCompleted = false
        }
      } else {
        // その他のフィールド（personality等）
        if (Array.isArray(value)) {
          isCompleted = value.length > 0
        } else if (value === 'none' || value === null || value === undefined || value === '') {
          isCompleted = false
        } else {
          isCompleted = value.toString().trim().length > 0
        }
      }
      
      return { field, value, isCompleted, reason: field === 'avatar_url' ? 'avatar check' : Array.isArray(value) ? 'array check' : value === 'none' ? 'none value' : !value ? 'no value' : 'has value' }
    })
    
    // 正確な完成度計算（画像含む）
    const completedRequiredCount = requiredFieldsDetail.filter(f => f.isCompleted).length
    const completedOptionalCount = optionalFieldsDetail.filter(f => f.isCompleted).length
    const actualCompletedItems = completedRequiredCount + completedOptionalCount + imageCompletionCount
    const actualCompletionRate = Math.round((actualCompletedItems / totalRequiredItems) * 100)
    
    console.log('🔍 Detailed Profile Completion Analysis:')
    console.log('=== 必須フィールド ===')
    console.table(requiredFieldsDetail)
    console.log('=== オプションフィールド ===')  
    console.table(optionalFieldsDetail)
    console.log('=== サマリー ===')
    console.log('完成した必須フィールド:', completedRequiredCount, '/', requiredFields.length)
    console.log('完成したオプションフィールド:', completedOptionalCount, '/', optionalFields.length)
    console.log('画像項目:', imageCompletionCount, '/', 1, '(has images:', hasImages, ')')
    console.log('総完成項目:', actualCompletedItems, '/', totalRequiredItems)
    console.log('実際の完成率:', actualCompletionRate + '%')
    console.log('⚠️ 古い計算 - completedItems:', completedItems, '/', totalRequiredItems)
    
    // 未完成のフィールドを明示
    const incompleteRequired = requiredFieldsDetail.filter(f => !f.isCompleted)
    const incompleteOptional = optionalFieldsDetail.filter(f => !f.isCompleted)
    if (incompleteRequired.length > 0) {
      console.log('❌ 未完成の必須フィールド:', incompleteRequired)
    }
    if (incompleteOptional.length > 0) {
      console.log('❌ 未完成のオプションフィールド:', incompleteOptional)
    }
    
    // 正確な完成度をUIに設定
    setProfileCompletion(actualCompletionRate)
    setCompletedItems(actualCompletedItems)
    setTotalItems(totalRequiredItems)
    
    console.log('🎯 最終UI設定:', {
      completion: actualCompletionRate,
      completedItems: actualCompletedItems,
      totalItems: totalRequiredItems,
      oldCompletion: Math.round((completedItems / totalRequiredItems) * 100)
    })
    
    // マージされたプロフィールデータを表示用に設定
    setProfile(mergedProfile)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout() // Zustand storeのlogout関数を使用（内部でauthService.signOutを呼ぶ）
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-sakura-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">読み込んでいます...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      {/* Sidebar */}
      <Sidebar className="w-64 hidden md:block" />
      
      {/* Header */}
      <div className="bg-white shadow-sm md:ml-64">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">マイページ</h1>
          </div>
        </div>
      </div>

      <div className="md:ml-64 px-4 py-6">
        <div className="max-w-2xl mx-auto">
        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center mb-6">
            <div className="relative">
              {(profile?.avatar_url || profile?.profile_image) ? (
                <img
                  src={profile.avatar_url || profile.profile_image}
                  alt="プロフィール写真"
                  className="w-20 h-20 rounded-full object-cover border-2 border-sakura-200"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-sakura-100 to-sakura-200 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-sakura-500" />
                </div>
              )}
            </div>
            <div className="ml-4 flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {profile?.name || profile?.first_name || 'ユーザー'}さん
              </h2>
              <p className="text-gray-600">
                {profile?.age || '未設定'}歳 • {profile?.residence || profile?.prefecture || '未設定'}
              </p>
            </div>
          </div>

          {/* 詳細プロフィール情報 */}
          <div className="mb-6">
            <div className="hidden grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {(() => {
                // 正規化されたプロフィールデータを直接使用（二重処理を回避）
                const occupation = profile?.occupation
                const height = profile?.height
                const body_type = profile?.body_type
                const marital_status = profile?.marital_status
                const actualCity = profile?.city
                
                return (
                  <>
                    {occupation && occupation !== 'none' && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 w-16">職業:</span>
                        <span className="text-gray-600">{occupation}</span>
                      </div>
                    )}
                    {height && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 w-16">身長:</span>
                        <span className="text-gray-600">{height}cm</span>
                      </div>
                    )}
                    {body_type && body_type !== 'none' && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 w-16">体型:</span>
                        <span className="text-gray-600">{body_type}</span>
                      </div>
                    )}
                    {marital_status && marital_status !== 'none' && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 w-16">結婚:</span>
                        <span className="text-gray-600">
                          {marital_status === 'single' ? '未婚' : marital_status === 'married' ? '既婚' : marital_status}
                        </span>
                      </div>
                    )}
                    {profile?.nationality && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 w-16">国籍:</span>
                        <span className="text-gray-600">{profile.nationality}</span>
                      </div>
                    )}
                    {actualCity && (
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700 w-16">市区町村:</span>
                        <span className="text-gray-600">{actualCity}</span>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* 自己紹介 */}
            {false && profile?.bio && (
              <div className="mt-4">
                <h3 className="font-medium text-gray-900 mb-2">自己紹介</h3>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* 共有したい日本文化 */}
            {false && (profile?.interests || profile?.custom_culture) && (
              <div className="mt-4">
                <h3 className="font-medium text-gray-900 mb-2">
                  {profile?.gender === 'male' ? '学びたい日本文化' : '共有したい日本文化'}
                </h3>
                <div className="space-y-2">
                  {profile.interests && Array.isArray(profile.interests) && profile.interests.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-sakura-100 text-sakura-800 rounded-full text-xs"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                  {profile.custom_culture && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-gray-700 text-sm">{profile.custom_culture}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 性格 */}
            {false && profile?.personality && Array.isArray(profile.personality) && profile.personality.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-gray-900 mb-2">性格</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.personality.filter((trait: string, index: number, array: string[]) => array.indexOf(trait) === index).map((trait: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile Completion */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">プロフィール完成度</span>
              <span className="text-lg font-bold text-orange-500">{profileCompletion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${profileCompletion}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {totalItems > 0 ? `${completedItems}/${totalItems}項目入力済み` : '計算中...'}
            </p>
          </div>

          <Button 
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => {
              // 🛡️ セキュリティ修正: 既存URLパラメータを完全にクリアしてMyPage遷移のみを設定
              console.log('🔄 MyPage編集ボタンクリック - URLパラメータをクリアして遷移')
              console.log('🔍 現在のURL:', window.location.href)

              // 外国人男性判定
              const isForeignMale = profile?.gender === 'male' && profile?.nationality && profile.nationality !== '日本'
              console.log('🌍 外国人男性判定:', {
                gender: profile?.gender,
                nationality: profile?.nationality,
                isForeignMale
              })

              // プロフィールデータをlocalStorageに保存してからプロフィール編集画面に遷移
              console.log('💾 プロフィールデータをlocalStorageに保存')
              console.log('📦 保存するプロフィールデータ:', profile)
              console.log('🔍 japanese_level check:', {
                'profile.japanese_level': profile?.japanese_level,
                'profile.english_level': profile?.english_level,
                'isForeignMale': isForeignMale
              })
              
              try {
                // プロフィールデータをlocalStorageに保存
                localStorage.setItem('updateProfile', JSON.stringify(profile))
                console.log('✅ updateProfileに保存完了')
                
                // 画像データ保存：複数の方法で画像URLを確実に取得
                const displayedImageUrl = profile?.avatar_url || profile?.profile_image
                const finalImageUrl = displayedImageUrl || user?.avatarUrl
                
                if (finalImageUrl) {
                  const imageData = [{
                    id: 'main',
                    url: finalImageUrl,
                    originalUrl: finalImageUrl,
                    isMain: true,
                    isEdited: false
                  }]
                  localStorage.setItem('currentProfileImages', JSON.stringify(imageData))
                } else {
                  localStorage.setItem('currentProfileImages', JSON.stringify([]))
                }
              } catch (error) {
                console.error('❌ localStorage保存エラー:', error)
              }
              
              // 🔧 修正: 外国人男性の場合はtype=foreign-maleパラメータを追加
              const profileType = isForeignMale ? 'foreign-male' : 'japanese-female'
              
              // 少し待ってから遷移（localStorage保存を確実にするため）
              setTimeout(() => {
                window.location.href = `/profile/edit?fromMyPage=true&type=${profileType}`
              }, 100)
            }}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            プロフィールを編集する
          </Button>
        </div>


        {/* Stats Section */}
        <div className="space-y-4 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Heart className="w-5 h-5 text-pink-500 mr-3" />
                <span className="font-medium text-gray-900">残りいいね数</span>
              </div>
              <div className="flex items-center">
                <Heart className="w-4 h-4 text-pink-500 mr-1" />
                <span className="font-bold text-gray-900">10</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Gift className="w-5 h-5 text-yellow-500 mr-3" />
                <span className="font-medium text-gray-900">SCポイント</span>
              </div>
              <div className="flex items-center">
                <Gift className="w-4 h-4 text-yellow-500 mr-1" />
                <span className="font-bold text-gray-900">0pt</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-blue-500 mr-3" />
                <span className="font-medium text-gray-900">本人年齢確認</span>
              </div>
              <span className="text-red-500 font-medium">未承認</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-green-500 mr-3" />
                <span className="font-medium text-gray-900">会員ステータス</span>
              </div>
              <span className="text-red-500 font-medium">無料会員</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <CreditCard className="w-5 h-5 text-purple-500 mr-3" />
                <span className="font-medium text-gray-900">プラン変更</span>
              </div>
              <Button className="bg-brown-500 hover:bg-brown-600 text-white px-4 py-1 text-sm">
                <Star className="w-3 h-3 mr-1" />
                料金プランを見る
              </Button>
            </div>
          </div>
        </div>

        {/* Additional Features */}
        <div className="space-y-4">
          {/* 足跡 */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-brown-100 rounded-full flex items-center justify-center mr-3">
                  <History className="w-5 h-5 text-brown-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">足跡</h3>
                  <p className="text-sm text-gray-600">あなたに興味のあるお相手を確認</p>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* お気に入り */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">お気に入り</h3>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* プライベートアルバム */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">プライベートアルバム</h3>
                  <p className="text-sm text-gray-600">リクエストや公開しているお相手を確認</p>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* お知らせ */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <div className="relative">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">9</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">お知らせ</h3>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* 通知・設定 */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">通知・設定</h3>
                  <p className="text-sm text-gray-600">メール通知設定、パスワードの変更など</p>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* お問い合わせ・改善要望 */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">お問い合わせ・改善要望</h3>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* 文化体験 */}
          <Link href="/experiences" className="block bg-white rounded-lg shadow-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-sakura-100 rounded-full flex items-center justify-center mr-3">
                  <Calendar className="w-5 h-5 text-sakura-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">文化体験</h3>
                  <p className="text-sm text-gray-600">日本文化を一緒に体験しよう</p>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* よくある質問 */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">よくある質問</h3>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* ログアウト */}
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full bg-white rounded-lg shadow-lg p-4 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-left">
                    {isLoggingOut ? 'ログアウト中...' : 'ログアウト'}
                  </h3>
                </div>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        </div>
      </div>
    </div>
  )
}

export default function MyPage() {
  return (
    <AuthGuard>
      <MyPageContent />
    </AuthGuard>
  )
}