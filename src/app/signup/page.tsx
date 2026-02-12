'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { authService } from '@/lib/auth'
import { markLoginInitiated } from '@/store/authStore'
import { Heart, Eye, EyeOff, Loader2, ArrowLeft, Globe } from 'lucide-react'
import { z } from 'zod'
import { type SupportedLanguage } from '@/utils/language'
import { useUnifiedTranslation } from '@/utils/translations'
import { LanguageSelector } from '@/components/LanguageSelector'
import { useLanguageAwareRouter } from '@/utils/languageNavigation'
import { logger } from '@/utils/logger'

// 多言語対応の登録スキーマ生成関数
const createSignupSchema = (t: any) => z.object({
  email: z.string().email(t('errors.emailInvalid')),
  password: z.string().min(8, t('errors.passwordMinLength')).regex(/^(?=.*[A-Za-z])(?=.*\d)/, t('errors.passwordFormat')),
  nickname: z.string().min(1, t('errors.nicknameRequired')).max(20, t('errors.nicknameMaxLength')),
  gender: z.enum(['male', 'female'], { required_error: t('errors.genderRequired') }),
  birth_date: z.string().min(1, t('errors.birthDateRequired')),
  prefecture: z.string().min(1, t('errors.locationRequired')),
  // 日本国籍確認（女性のみ必須）
  japaneseNationalityConfirm: z.boolean().optional(),
}).refine((data) => {
  // 女性の場合は日本国籍確認が必須
  if (data.gender === 'female') {
    return data.japaneseNationalityConfirm === true
  }
  return true
}, {
  message: t('errors.japaneseNationalityRequired'),
  path: ['japaneseNationalityConfirm']
})

type SimpleSignupFormData = z.infer<ReturnType<typeof createSignupSchema>>

// 都道府県オプション
const PREFECTURES = [
  '東京都', '神奈川県', '千葉県', '埼玉県', '大阪府', '京都府', '兵庫県', '愛知県',
  '福岡県', '北海道', '宮城県', '広島県', '静岡県', '茨城県', '栃木県', '群馬県',
  '新潟県', '長野県', '山梨県', '岐阜県', '三重県', '滋賀県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '山口県', '徳島県', '香川県', '愛媛県', '高知県',
  '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
]

// 対象外国籍（外国人男性向け - 日本は除外）
const FOREIGN_NATIONALITIES = [
  'アメリカ', 'イギリス', 'カナダ', 'オーストラリア', 'ドイツ', 'フランス',
  'イタリア', 'スペイン', 'オランダ', 'スウェーデン', 'ノルウェー', 'デンマーク',
  '韓国', '台湾', 'タイ', 'シンガポール', 'その他'
]

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [signupError, setSignupError] = useState('')
  const router = useRouter()
  const languageRouter = useLanguageAwareRouter()
  
  // 統一翻訳関数の取得
  const { t, language: currentLanguage } = useUnifiedTranslation()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<SimpleSignupFormData>({
    resolver: zodResolver(createSignupSchema(t))
  })

  // 性別の監視
  const selectedGender = watch('gender')

  // 国籍の翻訳関数
  const getNationalityLabel = (value: string): string => {
    const nationalityMap: { [key: string]: { [lang: string]: string } } = {
      'アメリカ': { ja: 'アメリカ', en: 'United States', ko: '미국', 'zh-tw': '美國' },
      'イギリス': { ja: 'イギリス', en: 'United Kingdom', ko: '영국', 'zh-tw': '英國' },
      'カナダ': { ja: 'カナダ', en: 'Canada', ko: '캐나다', 'zh-tw': '加拿大' },
      'オーストラリア': { ja: 'オーストラリア', en: 'Australia', ko: '호주', 'zh-tw': '澳洲' },
      'ドイツ': { ja: 'ドイツ', en: 'Germany', ko: '독일', 'zh-tw': '德國' },
      'フランス': { ja: 'フランス', en: 'France', ko: '프랑스', 'zh-tw': '法國' },
      'イタリア': { ja: 'イタリア', en: 'Italy', ko: '이탈리아', 'zh-tw': '義大利' },
      'スペイン': { ja: 'スペイン', en: 'Spain', ko: '스페인', 'zh-tw': '西班牙' },
      'オランダ': { ja: 'オランダ', en: 'Netherlands', ko: '네덜란드', 'zh-tw': '荷蘭' },
      'スウェーデン': { ja: 'スウェーデン', en: 'Sweden', ko: '스웨덴', 'zh-tw': '瑞典' },
      'ノルウェー': { ja: 'ノルウェー', en: 'Norway', ko: '노르웨이', 'zh-tw': '挪威' },
      'デンマーク': { ja: 'デンマーク', en: 'Denmark', ko: '덴마크', 'zh-tw': '丹麥' },
      '韓国': { ja: '韓国', en: 'South Korea', ko: '한국', 'zh-tw': '韓國' },
      '台湾': { ja: '台湾', en: 'Taiwan', ko: '대만', 'zh-tw': '台灣' },
      'タイ': { ja: 'タイ', en: 'Thailand', ko: '태국', 'zh-tw': '泰國' },
      'シンガポール': { ja: 'シンガポール', en: 'Singapore', ko: '싱가포르', 'zh-tw': '新加坡' },
      'その他': { ja: 'その他', en: 'Other', ko: '기타', 'zh-tw': '其他' },
    }
    return nationalityMap[value]?.[currentLanguage] || value
  }

  // 都道府県の翻訳関数
  const getPrefectureLabel = (value: string): string => {
    const prefectureMap: { [key: string]: { [lang: string]: string } } = {
      '東京都': { ja: '東京都', en: 'Tokyo', ko: '도쿄도', 'zh-tw': '東京都' },
      '神奈川県': { ja: '神奈川県', en: 'Kanagawa', ko: '가나가와현', 'zh-tw': '神奈川縣' },
      '千葉県': { ja: '千葉県', en: 'Chiba', ko: '치바현', 'zh-tw': '千葉縣' },
      '埼玉県': { ja: '埼玉県', en: 'Saitama', ko: '사이타마현', 'zh-tw': '埼玉縣' },
      '大阪府': { ja: '大阪府', en: 'Osaka', ko: '오사카부', 'zh-tw': '大阪府' },
      '京都府': { ja: '京都府', en: 'Kyoto', ko: '교토부', 'zh-tw': '京都府' },
      '兵庫県': { ja: '兵庫県', en: 'Hyogo', ko: '효고현', 'zh-tw': '兵庫縣' },
      '愛知県': { ja: '愛知県', en: 'Aichi', ko: '아이치현', 'zh-tw': '愛知縣' },
      '福岡県': { ja: '福岡県', en: 'Fukuoka', ko: '후쿠오카현', 'zh-tw': '福岡縣' },
      '北海道': { ja: '北海道', en: 'Hokkaido', ko: '홋카이도', 'zh-tw': '北海道' },
      '宮城県': { ja: '宮城県', en: 'Miyagi', ko: '미야기현', 'zh-tw': '宮城縣' },
      '広島県': { ja: '広島県', en: 'Hiroshima', ko: '히로시마현', 'zh-tw': '廣島縣' },
      '静岡県': { ja: '静岡県', en: 'Shizuoka', ko: '시즈오카현', 'zh-tw': '靜岡縣' },
      '茨城県': { ja: '茨城県', en: 'Ibaraki', ko: '이바라키현', 'zh-tw': '茨城縣' },
      '栃木県': { ja: '栃木県', en: 'Tochigi', ko: '도치기현', 'zh-tw': '栃木縣' },
      '群馬県': { ja: '群馬県', en: 'Gunma', ko: '군마현', 'zh-tw': '群馬縣' },
      '新潟県': { ja: '新潟県', en: 'Niigata', ko: '니가타현', 'zh-tw': '新潟縣' },
      '長野県': { ja: '長野県', en: 'Nagano', ko: '나가노현', 'zh-tw': '長野縣' },
      '山梨県': { ja: '山梨県', en: 'Yamanashi', ko: '야마나시현', 'zh-tw': '山梨縣' },
      '岐阜県': { ja: '岐阜県', en: 'Gifu', ko: '기후현', 'zh-tw': '岐阜縣' },
      '三重県': { ja: '三重県', en: 'Mie', ko: '미에현', 'zh-tw': '三重縣' },
      '滋賀県': { ja: '滋賀県', en: 'Shiga', ko: '시가현', 'zh-tw': '滋賀縣' },
      '奈良県': { ja: '奈良県', en: 'Nara', ko: '나라현', 'zh-tw': '奈良縣' },
      '和歌山県': { ja: '和歌山県', en: 'Wakayama', ko: '와카야마현', 'zh-tw': '和歌山縣' },
      '鳥取県': { ja: '鳥取県', en: 'Tottori', ko: '돗토리현', 'zh-tw': '鳥取縣' },
      '島根県': { ja: '島根県', en: 'Shimane', ko: '시마네현', 'zh-tw': '島根縣' },
      '岡山県': { ja: '岡山県', en: 'Okayama', ko: '오카야마현', 'zh-tw': '岡山縣' },
      '山口県': { ja: '山口県', en: 'Yamaguchi', ko: '야마구치현', 'zh-tw': '山口縣' },
      '徳島県': { ja: '徳島県', en: 'Tokushima', ko: '도쿠시마현', 'zh-tw': '德島縣' },
      '香川県': { ja: '香川県', en: 'Kagawa', ko: '가가와현', 'zh-tw': '香川縣' },
      '愛媛県': { ja: '愛媛県', en: 'Ehime', ko: '에히메현', 'zh-tw': '愛媛縣' },
      '高知県': { ja: '高知県', en: 'Kochi', ko: '고치현', 'zh-tw': '高知縣' },
      '佐賀県': { ja: '佐賀県', en: 'Saga', ko: '사가현', 'zh-tw': '佐賀縣' },
      '長崎県': { ja: '長崎県', en: 'Nagasaki', ko: '나가사키현', 'zh-tw': '長崎縣' },
      '熊本県': { ja: '熊本県', en: 'Kumamoto', ko: '구마모토현', 'zh-tw': '熊本縣' },
      '大分県': { ja: '大分県', en: 'Oita', ko: '오이타현', 'zh-tw': '大分縣' },
      '宮崎県': { ja: '宮崎県', en: 'Miyazaki', ko: '미야자키현', 'zh-tw': '宮崎縣' },
      '鹿児島県': { ja: '鹿児島県', en: 'Kagoshima', ko: '가고시마현', 'zh-tw': '鹿兒島縣' },
      '沖縄県': { ja: '沖縄県', en: 'Okinawa', ko: '오키나와현', 'zh-tw': '沖繩縣' },
    }
    return prefectureMap[value]?.[currentLanguage] || value
  }

  // 性別変更時の自動設定
  const handleGenderChange = (gender: 'male' | 'female') => {
    setValue('gender', gender)
    
    if (gender === 'male') {
      // 男性の場合：国籍を強制選択（デフォルトなし）
      // setValue('prefecture', '') // 国籍フィールドとして使用
    } else if (gender === 'female') {
      // 女性の場合：都道府県を強制選択（東京都をデフォルト）
      setValue('prefecture', '東京都')
    }
  }

  // 生年月日から年齢を計算
  const calculateAge = (birthDate: string): number => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const onSubmit = async (data: SimpleSignupFormData) => {
    setIsLoading(true)
    setSignupError('')
    
    // 🔒 セキュリティ強化: 新規登録時に古いセッションストレージを完全クリア
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i)
        if (key?.startsWith('currentProfileImages') ||
            key?.startsWith('imageStateTimestamp') ||
            key?.startsWith('previewData') ||
            key === 'signupData') {
          sessionStorage.removeItem(key)
        }
      }
      logger.debug('[SIGNUP] sessionStorage cleanup done')
    } catch (error) {
      logger.error('[SIGNUP] sessionStorage cleanup', error)
    }

    // このタブがサインアップを開始したことをマーク（ユーザースイッチ警告をスキップするため）
    markLoginInitiated()

    try {
      // 年齢を計算
      const age = calculateAge(data.birth_date)
      
      // 18歳未満チェック
      if (age < 18) {
        setSignupError(t('signup.ageRestriction'))
        setIsLoading(false)
        return
      }

      // 拡張データを作成
      const signupData = {
        email: data.email,
        password: data.password,
        confirmPassword: data.password, // パスワード確認は同じ値を設定
        firstName: data.nickname, // ニックネームを一時的に名前として使用
        lastName: '',
        gender: data.gender,
        age: age,
        birth_date: data.birth_date, // birth_dateフィールドを追加
        nationality: data.prefecture, // 選択された国籍/居住地をnationalityとして使用
        prefecture: data.prefecture,
        city: '',
        hobbies: ['その他'], // 最低1つの趣味が必要
        selfIntroduction: '後でプロフィールを詳しく書きます。', // 最低50文字が必要
        agreeToTerms: true, // 簡素化された登録では自動で同意とみなす
        agreeToPrivacy: true // 簡素化された登録では自動で同意とみなす
      }
      
      const result = await authService.signUp(signupData)
      logger.debug('[SIGNUP] result', {
        userId: result.user?.id?.slice(0, 8),
        hasSession: !!result.session,
        hasAccessToken: !!result.session?.access_token,
      })

      // --- パターンB: session無し（メール確認必要 or メール送信失敗） ---
      if (!result.session?.access_token) {
        logger.debug('[SIGNUP] no session → email confirm redirect')
        const params = new URLSearchParams({
          email: data.email,
          gender: data.gender,
          nickname: data.nickname,
          birth_date: data.birth_date,
          age: age.toString(),
          nationality: data.prefecture,
          prefecture: data.prefecture
        })
        languageRouter.push(`/register/complete`, params)
        return
      }

      // --- パターンC: session有り ---
      logger.debug('[SIGNUP] session acquired → profile init & edit')
      sessionStorage.setItem('sc_signup_email', data.email)

      // 📝 初期プロフィールデータをDBに保存（null-only update）
      try {
        const isMale = data.gender === 'male'
        const profileBody: Record<string, any> = {
          name: data.nickname,
          gender: data.gender,
          birth_date: data.birth_date,
        }
        if (isMale) {
          profileBody.nationality = data.prefecture
        } else {
          profileBody.residence = data.prefecture
          profileBody.nationality = '日本'
        }
        const res = await fetch('/api/auth/post-signup-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${result.session.access_token}`
          },
          body: JSON.stringify(profileBody)
        })
        const resBody = await res.json().catch(() => null)
        logger.debug('[SIGNUP] post-signup-profile', { status: res.status })
      } catch (e) {
        logger.warn('[SIGNUP] post-signup-profile failed (continuing)', e)
      }

      const profileParams = new URLSearchParams({
        type: data.gender === 'male' ? 'foreign-male' : 'japanese-female',
        nickname: data.nickname,
        gender: data.gender,
        birth_date: data.birth_date,
        age: age.toString(),
        nationality: data.prefecture,
        prefecture: data.prefecture
      })
      languageRouter.push(`/profile/edit`, profileParams)

    } catch (error) {
      logger.error('[SIGNUP]', error)
      const errorMessage = error instanceof Error ? error.message : String(error)

      // --- パターンA: signup自体が失敗 ---
      // "User already registered" 系のエラー判定
      const isAlreadyRegistered = /already registered|already been registered|duplicate|already exists/i.test(errorMessage)

      if (isAlreadyRegistered) {
        setSignupError('このメールアドレスは既に登録されています。ログインしてください。')
      } else {
        setSignupError(errorMessage || t('signup.signupFailed'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-between items-center mb-6">
              <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('signup.backButton')}
              </Link>
              
              {/* Language Switcher */}
              <LanguageSelector variant="light" size="sm" showIcon={true} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('signup.title')}</h1>
          </div>

          {/* Registration Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            {signupError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{signupError}</p>
                {signupError.includes('既に登録') && (
                  <Link href="/login" className="mt-2 inline-block text-sm text-sakura-600 underline hover:text-sakura-800">
                    ログイン画面へ →
                  </Link>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* メールアドレス */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('signup.emailAddress')} <span className="text-red-500">{t('signup.required')}</span>
                </label>
                <Input
                  type="email"
                  placeholder={t('signup.emailPlaceholder')}
                  autoComplete="email"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* パスワード */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('signup.password')} <span className="text-red-500">{t('signup.required')}</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('signup.passwordPlaceholder')}
                    autoComplete="new-password"
                    {...register('password')}
                    className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{t('signup.passwordRequirement')}</p>
              </div>

              {/* ニックネーム */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('signup.nickname')} <span className="text-red-500">{t('signup.required')}</span>
                </label>
                <Input
                  placeholder={t('signup.nicknamePlaceholder')}
                  autoComplete="nickname"
                  {...register('nickname')}
                  className={errors.nickname ? 'border-red-500' : ''}
                />
                {errors.nickname && (
                  <p className="text-red-500 text-sm mt-1">{errors.nickname.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{t('signup.nicknameNote')}</p>
              </div>

              {/* 性別 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('signup.gender')} <span className="text-red-500">{t('signup.required')}</span>
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="male"
                      checked={selectedGender === 'male'}
                      onChange={(e) => handleGenderChange('male')}
                      className="mr-2"
                    />
                    {t('signup.male')}
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="female"
                      checked={selectedGender === 'female'}
                      onChange={(e) => handleGenderChange('female')}
                      className="mr-2"
                    />
                    {t('signup.female')}
                  </label>
                </div>
                {errors.gender && (
                  <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{t('signup.genderNote')}</p>
              </div>

              {/* 生年月日 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('signup.birthDate')} <span className="text-red-500">{t('signup.required')}</span>
                </label>
                <Input
                  type="date"
                  autoComplete="bday"
                  {...register('birth_date')}
                  min="1900-01-01"
                  max={new Date().toISOString().split('T')[0]}
                  className={errors.birth_date ? 'border-red-500' : ''}
                />
                {errors.birth_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.birth_date.message}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{t('signup.birthDateNote')}</p>
              </div>

              {/* 居住地・国籍 */}
              {selectedGender && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedGender === 'male' ? t('signup.nationality') : t('signup.residence')} <span className="text-red-500">{t('signup.required')}</span>
                  </label>
                  <Select 
                    value={watch('prefecture') || ''} 
                    onValueChange={(value) => setValue('prefecture', value)}
                  >
                    <SelectTrigger className={errors.prefecture ? 'border-red-500' : ''}>
                      <SelectValue placeholder={selectedGender === 'male' ? t('signup.selectNationality') : t('signup.selectPrefecture')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedGender === 'male' ? FOREIGN_NATIONALITIES : PREFECTURES).map((option) => (
                        <SelectItem key={option} value={option}>
                          {selectedGender === 'male' ? getNationalityLabel(option) : getPrefectureLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.prefecture && (
                    <p className="text-red-500 text-sm mt-1">{errors.prefecture.message}</p>
                  )}
                  {selectedGender === 'female' && (
                    <p className="text-xs text-gray-500 mt-1">{t('signup.residenceNote')}</p>
                  )}
                </div>
              )}

              {/* 日本国籍確認チェックボックス（女性のみ） */}
              {selectedGender === 'female' && (
                <div>
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      {...register('japaneseNationalityConfirm')}
                      className="mt-1 h-4 w-4 text-sakura-600 border-gray-300 rounded focus:ring-sakura-500"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      {t('signup.japaneseNationalityConfirm')} <span className="text-red-500">{t('signup.required')}</span>
                    </label>
                  </div>
                  {errors.japaneseNationalityConfirm && (
                    <p className="text-red-500 text-sm mt-1">{errors.japaneseNationalityConfirm.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {currentLanguage === 'ja' ? 'このサービスは日本国籍の女性と外国人男性の文化交流を目的としています' :
                     currentLanguage === 'en' ? 'This service is for cultural exchange between Japanese women and foreign men' :
                     currentLanguage === 'ko' ? '이 서비스는 일본 국적 여성과 외국인 남성의 문화 교류를 목적으로 합니다' :
                     '本服務旨在促進日本國籍女性與外國男性之間的文化交流'}
                  </p>
                </div>
              )}

              {/* 性別未選択時のメッセージ */}
              {!selectedGender && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <p className="text-gray-600 text-sm">{t('signup.genderSelectPrompt')}</p>
                </div>
              )}

              {/* 登録ボタン */}
              <Button
                type="submit"
                className="w-full bg-sakura-600 hover:bg-sakura-700 text-white py-3"
                disabled={isLoading || !selectedGender}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('signup.signingUp')}
                  </>
                ) : (
                  t('signup.signupButton')
                )}
              </Button>

              {/* プライバシー情報 */}
              <div className="text-center">
                <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line">
                  {t('signup.privacyNote')}
                </p>
              </div>

              {/* ログインリンク */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {t('signup.loginPrompt')}{' '}
                  <Link href="/login" className="text-sakura-600 hover:text-sakura-700 font-medium">
                    {t('signup.loginLink')}
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}