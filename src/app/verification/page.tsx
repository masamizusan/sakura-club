'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Upload, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'
import Sidebar from '@/components/layout/Sidebar'
import AuthGuard from '@/components/auth/AuthGuard'

const verificationTranslations: Record<string, Record<string, string>> = {
  ja: {
    title: '身分証登録',
    description: 'メッセージ機能を利用するには身分証の登録が必要です',
    selectType: '身分証の種類を選択してください',
    passport: 'パスポート',
    license: '運転免許証',
    mynumber: 'マイナンバーカード',
    other: 'その他の身分証',
    residenceCard: '在留カード',
    nationalId: '国民IDカード',
    upload: '身分証の画像をアップロード',
    uploadHint: 'JPG・PNG・HEIC対応 / 5MB以内',
    submit: '登録する',
    submitting: '送信中...',
    note: '身分証は暗号化されて安全に保管され、年齢確認のみに使用されます。第三者に共有されることはありません。',
    selectRequired: '身分証の種類を選択してください',
    fileRequired: '身分証の画像を選択してください',
    uploadError: 'アップロードに失敗しました。もう一度お試しください。',
    back: '戻る',
  },
  en: {
    title: 'Identity Verification',
    description: 'ID verification is required to use the messaging feature',
    selectType: 'Select ID type',
    passport: 'Passport',
    license: "Driver's License",
    mynumber: 'My Number Card',
    other: 'Other ID Document',
    residenceCard: 'Residence Card',
    nationalId: 'National ID Card',
    upload: 'Upload ID Document',
    uploadHint: 'JPG / PNG / HEIC, max 5MB',
    submit: 'Submit',
    submitting: 'Submitting...',
    note: 'Your ID is encrypted and securely stored. It is used only for age verification and will never be shared with third parties.',
    selectRequired: 'Please select an ID type',
    fileRequired: 'Please select an ID image',
    uploadError: 'Upload failed. Please try again.',
    back: 'Back',
  },
  ko: {
    title: '신분증 등록',
    description: '메시지 기능을 사용하려면 신분증 등록이 필요합니다',
    selectType: '신분증 종류를 선택하세요',
    passport: '여권',
    license: '운전면허증',
    mynumber: '마이넘버카드',
    other: '기타 신분증',
    residenceCard: '재류카드',
    nationalId: '국민 신분증',
    upload: '신분증 사진 업로드',
    uploadHint: 'JPG / PNG / HEIC, 5MB 이내',
    submit: '등록하기',
    submitting: '전송 중...',
    note: '신분증은 암호화되어 안전하게 보관되며, 나이 확인에만 사용됩니다. 제3자와 공유되지 않습니다.',
    selectRequired: '신분증 종류를 선택해 주세요',
    fileRequired: '신분증 사진을 선택해 주세요',
    uploadError: '업로드에 실패했습니다. 다시 시도해 주세요.',
    back: '뒤로',
  },
  'zh-tw': {
    title: '身份證登錄',
    description: '使用訊息功能需要登錄身份證',
    selectType: '選擇證件類型',
    passport: '護照',
    license: '駕照',
    mynumber: 'My Number卡',
    other: '其他身份證件',
    residenceCard: '居留卡',
    nationalId: '國民身份證',
    upload: '上傳身份證照片',
    uploadHint: '支援 JPG / PNG / HEIC，最大 5MB',
    submit: '提交',
    submitting: '提交中...',
    note: '您的身份證將加密安全保存，僅用於年齡驗證，不會與第三方共享。',
    selectRequired: '請選擇證件類型',
    fileRequired: '請選擇身份證照片',
    uploadError: '上傳失敗，請重試。',
    back: '返回',
  },
}

function VerificationContent() {
  const { currentLanguage } = useLanguage()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [idType, setIdType] = useState('')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ gender: string; nationality: string } | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('gender, nationality')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data)
    }
    fetchProfile()
  }, [])

  // 外国人男性かどうかを判定
  const isJapanese = (nationality: string | null | undefined): boolean => {
    if (!nationality) return true
    const n = nationality.toLowerCase().trim()
    return n === '' || n === 'jp' || n === 'japan' || n === '日本' || n === 'japanese'
  }
  const isForeignMale = profile?.gender === 'male' && !isJapanese(profile?.nationality)

  const t = (key: string): string => {
    const texts = verificationTranslations[currentLanguage] || verificationTranslations['ja']
    return texts[key] || verificationTranslations['ja'][key] || key
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError(null)
  }

  const handleSubmit = async () => {
    if (!idType) { setError(t('selectRequired')); return }
    if (!file) { setError(t('fileRequired')); return }

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Storage にアップロード
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      console.log('[verification] uploading to identity-documents:', { path, userId: user.id })
      const { error: uploadError } = await supabase.storage
        .from('identity-documents')
        .upload(path, file)

      console.log('[verification] upload result:', { uploadError })
      if (uploadError) {
        console.error('[verification] Upload error detail:', uploadError)
        setError(t('uploadError'))
        setUploading(false)
        return
      }

      // AI審査APIを呼び出す
      const response = await fetch('/api/verification/review', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          filePath: path,
          idType,
        }),
      })

      if (!response.ok) {
        setError(t('uploadError'))
        setUploading(false)
        return
      }

      router.push('/verification/pending')
    } catch (err) {
      console.error('Verification submit error:', err)
      setError(t('uploadError'))
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      <Sidebar className="w-64 hidden md:block" />

      <div className="md:ml-64 py-8 px-4">
        <div className="max-w-lg mx-auto">
          {/* 戻るボタン */}
          <Link
            href="/messages"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t('back')}
          </Link>

          {/* ヘッダー */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-sakura-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-sakura-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-sm text-gray-500">{t('description')}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            {/* 身分証の種類選択 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('selectType')}
              </label>
              <select
                value={idType}
                onChange={(e) => { setIdType(e.target.value); setError(null) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sakura-300 bg-white"
              >
                <option value="">---</option>
                <option value="passport">{t('passport')}</option>
                {isForeignMale ? (
                  <>
                    <option value="residence_card">{t('residenceCard')}</option>
                    <option value="national_id">{t('nationalId')}</option>
                  </>
                ) : (
                  <>
                    <option value="license">{t('license')}</option>
                    <option value="mynumber">{t('mynumber')}</option>
                    <option value="other">{t('other')}</option>
                  </>
                )}
              </select>
            </div>

            {/* 画像アップロード */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('upload')}
              </label>

              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-sakura-400 hover:bg-sakura-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-xs text-gray-400">{t('uploadHint')}</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {preview && (
                <img
                  src={preview}
                  alt="preview"
                  className="mt-3 rounded-lg w-full object-cover max-h-48 border border-gray-200"
                />
              )}
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* プライバシーノート */}
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              🔒 {t('note')}
            </p>

            {/* 送信ボタン */}
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="w-full bg-sakura-500 text-white py-3 rounded-full font-medium hover:bg-sakura-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('submitting')}
                </>
              ) : t('submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerificationPage() {
  return <AuthGuard><VerificationContent /></AuthGuard>
}
