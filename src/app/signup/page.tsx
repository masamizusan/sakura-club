'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { authService, AuthError } from '@/lib/auth'
import { Heart, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { z } from 'zod'

// 簡素化された登録スキーマ
const simpleSignupSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください').regex(/^(?=.*[A-Za-z])(?=.*\d)/, '半角英字と数字をどちらも含む必要があります'),
  nickname: z.string().min(1, 'ニックネームを入力してください').max(20, 'ニックネームは20文字以内で入力してください'),
  gender: z.enum(['male', 'female'], { required_error: '性別を選択してください' }),
  birth_date: z.string().min(1, '生年月日を入力してください'),
  prefecture: z.string().min(1, '居住地を選択してください'),
})

type SimpleSignupFormData = z.infer<typeof simpleSignupSchema>

// 都道府県オプション
const PREFECTURES = [
  '東京都', '神奈川県', '千葉県', '埼玉県', '大阪府', '京都府', '兵庫県', '愛知県',
  '福岡県', '北海道', '宮城県', '広島県', '静岡県', '茨城県', '栃木県', '群馬県',
  '新潟県', '長野県', '山梨県', '岐阜県', '三重県', '滋賀県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '山口県', '徳島県', '香川県', '愛媛県', '高知県',
  '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
]

// 国籍オプション（男性向け）
const NATIONALITIES = [
  'アメリカ', 'イギリス', 'カナダ', 'オーストラリア', 'ドイツ', 'フランス',
  'イタリア', 'スペイン', 'オランダ', 'スウェーデン', 'ノルウェー', 'デンマーク',
  '韓国', '台湾', 'タイ', 'シンガポール', 'その他'
]

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [signupError, setSignupError] = useState('')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<SimpleSignupFormData>({
    resolver: zodResolver(simpleSignupSchema)
  })

  // 性別の監視
  const selectedGender = watch('gender')

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
    console.log('🧹 新規登録開始: セッションストレージクリーンアップ実行')
    try {
      // 画像関連のセッションストレージを完全削除（両タイプ共通）
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i)
        if (key?.startsWith('currentProfileImages') || 
            key?.startsWith('imageStateTimestamp') || 
            key?.startsWith('previewData') ||
            key === 'signupData') {
          sessionStorage.removeItem(key)
          console.log('🗑️ 削除:', key)
        }
      }
      console.log('✅ セッションストレージクリーンアップ完了')
    } catch (error) {
      console.error('⚠️ セッションストレージクリーンアップエラー:', error)
    }
    
    try {
      // 年齢を計算
      const age = calculateAge(data.birth_date)
      
      // 18歳未満チェック
      if (age < 18) {
        setSignupError('18歳以上の方のみご利用いただけます')
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
      console.log('Signup result:', result)
      console.log('needsEmailConfirmation:', result.needsEmailConfirmation)
      console.log('hasSession:', !!result.session)
      
      // メール認証が必要な場合は仮登録完了画面に遷移
      if (result.needsEmailConfirmation) {
        console.log('Redirecting to registration complete page')
        // 仮登録完了画面にsignupデータを含めて遷移
        const params = new URLSearchParams({
          email: data.email,
          gender: data.gender,
          nickname: data.nickname,
          birth_date: data.birth_date,
          age: age.toString(),
          nationality: data.prefecture, // 男性の場合は国籍、女性の場合は都道府県
          prefecture: data.prefecture
        })
        router.push(`/register/complete?${params.toString()}`)
      } else {
        console.log('Direct login successful, redirecting to profile edit')
        // 直接ログインが成功した場合は性別に応じてプロフィール編集画面に遷移
        const profileParams = new URLSearchParams({
          type: data.gender === 'male' ? 'foreign-male' : 'japanese-female',
          nickname: data.nickname,
          gender: data.gender,
          birth_date: data.birth_date,
          age: age.toString(),
          nationality: data.prefecture,
          prefecture: data.prefecture
        })
        router.push(`/profile/edit?${profileParams.toString()}`)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center mb-6 text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">会員登録</h1>
          </div>

          {/* Registration Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            {signupError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{signupError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* メールアドレス */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス <span className="text-red-500">必須</span>
                </label>
                <Input
                  type="email"
                  placeholder="メールアドレス"
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
                  パスワード <span className="text-red-500">必須</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="パスワード"
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
                <p className="text-xs text-gray-500 mt-1">半角英字と数字をどちらも含む8文字以上</p>
              </div>

              {/* ニックネーム */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ニックネーム <span className="text-red-500">必須</span>
                </label>
                <Input
                  placeholder="ニックネーム"
                  {...register('nickname')}
                  className={errors.nickname ? 'border-red-500' : ''}
                />
                {errors.nickname && (
                  <p className="text-red-500 text-sm mt-1">{errors.nickname.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">あとで変更可能です。迷ったらイニシャルでもOK</p>
              </div>

              {/* 性別 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  性別 <span className="text-red-500">必須</span>
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
                    男性
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="female"
                      checked={selectedGender === 'female'}
                      onChange={(e) => handleGenderChange('female')}
                      className="mr-2"
                    />
                    女性
                  </label>
                </div>
                {errors.gender && (
                  <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">登録した性別は変更できません</p>
              </div>

              {/* 生年月日 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  生年月日 <span className="text-red-500">必須</span>
                </label>
                <Input
                  type="date"
                  {...register('birth_date')}
                  min="1900-01-01"
                  max={new Date().toISOString().split('T')[0]}
                  className={errors.birth_date ? 'border-red-500' : ''}
                />
                {errors.birth_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.birth_date.message}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">※生年月日はお相手には表示されません。</p>
              </div>

              {/* 居住地・国籍 */}
              {selectedGender && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedGender === 'male' ? '国籍' : '居住地'} <span className="text-red-500">必須</span>
                  </label>
                  <Select 
                    value={watch('prefecture') || ''} 
                    onValueChange={(value) => setValue('prefecture', value)}
                  >
                    <SelectTrigger className={errors.prefecture ? 'border-red-500' : ''}>
                      <SelectValue placeholder={selectedGender === 'male' ? '国籍を選択' : '都道府県を選択'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedGender === 'male' ? NATIONALITIES : PREFECTURES).map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.prefecture && (
                    <p className="text-red-500 text-sm mt-1">{errors.prefecture.message}</p>
                  )}
                  {selectedGender === 'female' && (
                    <p className="text-xs text-gray-500 mt-1">現在お住まいの都道府県を選択してください</p>
                  )}
                </div>
              )}

              {/* 性別未選択時のメッセージ */}
              {!selectedGender && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <p className="text-gray-600 text-sm">まず性別を選択してください</p>
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
                    登録中...
                  </>
                ) : (
                  '無料で登録する'
                )}
              </Button>

              {/* プライバシー情報 */}
              <div className="text-center">
                <p className="text-xs text-gray-500 leading-relaxed">
                  ご利用者様の個人情報は厳重に管理いたします。<br />
                  このサイトはreCAPTCHAによって保護されており、<br />
                  Googleのプライバシーポリシーと利用規約が適用されます。
                </p>
              </div>

              {/* ログインリンク */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  既にアカウントをお持ちの方は{' '}
                  <Link href="/login" className="text-sakura-600 hover:text-sakura-700 font-medium">
                    ログイン
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