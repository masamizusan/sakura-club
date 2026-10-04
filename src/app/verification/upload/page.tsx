'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'
import Sidebar from '@/components/layout/Sidebar'
import AuthGuard from '@/components/auth/AuthGuard'

const verificationTranslations: Record<string, Record<string, string>> = {
  ja: {
    title: '年齢確認書類の提出',
    description: 'メッセージ機能を利用するには年齢確認が必要です',
    selectType: '身分証の種類を選択してください',
    passport: 'パスポート',
    license: '運転免許証',
    licenseHistory: '運転経歴証明書',
    mynumber: 'マイナンバーカード',
    residenceCard: '在留カード',
    specialPermanentResident: '特別永住者証明書',
    upload: '身分証の画像を選択',
    uploadHint: 'JPG・PNG・HEIC対応 / 5MB以内',
    takePhoto: 'カメラで撮影',
    chooseFromAlbum: 'アルバムから選ぶ',
    retake: '撮り直す・選び直す',
    submit: '提出する',
    submitting: '送信中...',
    note: '身分証は暗号化されて安全に保管され、年齢確認のみに使用されます。第三者に共有されることはありません。',
    selectRequired: '身分証の種類を選択してください',
    fileRequired: '身分証の画像を選択してください',
    uploadError: 'アップロードに失敗しました。もう一度お試しください。',
    fileUnreadable: '画像を読み込めませんでした。お手数ですが、もう一度画像を選び直してください（写真アプリから選んだ場合は、一度ファイルとして保存してからお試しください）。',
    back: '戻る',
  },
  en: {
    title: 'Submit Age Verification Document',
    description: 'Age verification is required to use the messaging feature',
    selectType: 'Select ID type',
    passport: 'Passport',
    license: "Driver's License",
    licenseHistory: 'Driving Record Certificate',
    mynumber: 'My Number Card',
    residenceCard: 'Residence Card',
    specialPermanentResident: 'Special Permanent Resident Certificate',
    upload: 'Select ID Image',
    uploadHint: 'JPG / PNG / HEIC, max 5MB',
    takePhoto: 'Take Photo',
    chooseFromAlbum: 'Choose from Album',
    retake: 'Retake / Reselect',
    submit: 'Submit',
    submitting: 'Submitting...',
    note: 'Your ID is encrypted and securely stored. It is used only for age verification and will never be shared with third parties.',
    selectRequired: 'Please select an ID type',
    fileRequired: 'Please select an ID image',
    uploadError: 'Upload failed. Please try again.',
    fileUnreadable: "We couldn't read this image. Please select it again (if you chose it from the Photos app, try saving it as a file first).",
    back: 'Back',
  },
  ko: {
    title: '나이 확인 서류 제출',
    description: '메시지 기능을 사용하려면 나이 확인이 필요합니다',
    selectType: '신분증 종류를 선택하세요',
    passport: '여권',
    license: '운전면허증',
    licenseHistory: '운전경력증명서',
    mynumber: '마이넘버카드',
    residenceCard: '재류카드',
    specialPermanentResident: '특별영주자증명서',
    upload: '신분증 사진 선택',
    uploadHint: 'JPG / PNG / HEIC, 5MB 이내',
    takePhoto: '카메라로 촬영',
    chooseFromAlbum: '앨범에서 선택',
    retake: '다시 찍기 / 다시 선택',
    submit: '제출하기',
    submitting: '전송 중...',
    note: '신분증은 암호화되어 안전하게 보관되며, 나이 확인에만 사용됩니다. 제3자와 공유되지 않습니다.',
    selectRequired: '신분증 종류를 선택해 주세요',
    fileRequired: '신분증 사진을 선택해 주세요',
    uploadError: '업로드에 실패했습니다. 다시 시도해 주세요.',
    fileUnreadable: '이미지를 읽을 수 없습니다. 다시 선택해 주세요(사진 앱에서 선택한 경우, 파일로 저장한 후 다시 시도해 주세요).',
    back: '뒤로',
  },
  'zh-tw': {
    title: '提交年齡確認文件',
    description: '使用訊息功能需要進行年齡確認',
    selectType: '選擇證件類型',
    passport: '護照',
    license: '駕照',
    licenseHistory: '駕駛經歷證明書',
    mynumber: 'My Number卡',
    residenceCard: '居留卡',
    specialPermanentResident: '特別永住者證明書',
    upload: '選擇身份證照片',
    uploadHint: '支援 JPG / PNG / HEIC，最大 5MB',
    takePhoto: '拍攝照片',
    chooseFromAlbum: '從相冊選擇',
    retake: '重新拍攝／重新選擇',
    submit: '提交',
    submitting: '提交中...',
    note: '您的身份證將加密安全保存，僅用於年齡驗證，不會與第三方共享。',
    selectRequired: '請選擇證件類型',
    fileRequired: '請選擇身份證照片',
    uploadError: '上傳失敗，請重試。',
    fileUnreadable: '無法讀取此圖片。請重新選擇（若是從「照片」App 選取，請先另存為檔案後再試一次）。',
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

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const albumInputRef = useRef<HTMLInputElement>(null)

  const t = (key: string): string => {
    const texts = verificationTranslations[currentLanguage] || verificationTranslations['ja']
    return texts[key] || verificationTranslations['ja'][key] || key
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    // Safari（写真ライブラリ由来など）で中身が空の File になる場合は選択を取り消す
    if (f.size === 0) {
      setError(t('fileUnreadable'))
      e.target.value = ''
      return
    }
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
      // Safari 対策: File をそのまま渡すと FormData 経由で中身が空になる場合があるため、
      // 先に中身を ArrayBuffer に読み込んで確定させ、ArrayBuffer として送る
      let buffer: ArrayBuffer
      try {
        buffer = await file.arrayBuffer()
      } catch (readError) {
        console.error('[verification] file read error:', readError)
        setError(t('fileUnreadable'))
        setUploading(false)
        return
      }
      console.log('[verification] file info:', { size: file.size, type: file.type, byteLength: buffer.byteLength })
      if (buffer.byteLength === 0) {
        setError(t('fileUnreadable'))
        setUploading(false)
        return
      }

      // contentType: file.type → 拡張子から推定 → image/jpeg
      const NAME_EXT_TO_TYPE: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic',
      }
      const TYPE_TO_EXT: Record<string, string> = {
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic',
      }
      const nameExt = (file.name.split('.').pop() || '').toLowerCase()
      const contentType = file.type || NAME_EXT_TO_TYPE[nameExt] || 'image/jpeg'
      // 保存パスの拡張子は contentType から決める（元のファイル名は使わない）
      const ext = TYPE_TO_EXT[contentType] || 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      console.log('[verification] uploading to identity-documents:', { path, userId: user.id })
      const { error: uploadError } = await supabase.storage
        .from('identity-documents')
        .upload(path, buffer, { contentType, upsert: false })

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
    <div className="min-h-screen bg-[#f5ebe0]">
      <Sidebar className="w-64 hidden md:block" />

      <div className="md:ml-64 py-8 px-4">
        <div className="max-w-lg mx-auto">
          {/* 戻るボタン */}
          <Link
            href="/verification"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t('back')}
          </Link>

          {/* ヘッダー */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#fdf6ef] rounded-full flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#8b1a2e]" />
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a89a] bg-white"
              >
                <option value="">---</option>
                <option value="passport">{t('passport')}</option>
                <option value="license">{t('license')}</option>
                <option value="license_history">{t('licenseHistory')}</option>
                <option value="mynumber">{t('mynumber')}</option>
                <option value="residence_card">{t('residenceCard')}</option>
                <option value="special_permanent_resident">{t('specialPermanentResident')}</option>
              </select>
            </div>

            {/* 画像アップロード */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('upload')}
              </label>

              {/* 隠しinput：カメラ撮影用 */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              {/* 隠しinput：アルバム選択用 */}
              <input
                type="file"
                accept="image/*"
                ref={albumInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              {!preview ? (
                /* カメラ・アルバム選択ボタン */
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#d4a89a] hover:bg-[#fdf6ef] transition-colors"
                  >
                    <span className="text-3xl">📷</span>
                    <span className="text-sm font-medium text-gray-600">{t('takePhoto')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => albumInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#d4a89a] hover:bg-[#fdf6ef] transition-colors"
                  >
                    <span className="text-3xl">🖼️</span>
                    <span className="text-sm font-medium text-gray-600">{t('chooseFromAlbum')}</span>
                  </button>
                </div>
              ) : (
                /* プレビュー表示 + 撮り直しボタン */
                <div className="mb-2">
                  <img
                    src={preview}
                    alt="preview"
                    className="w-full rounded-xl object-contain bg-gray-50 border border-gray-200"
                    style={{ maxHeight: '300px' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreview(null)
                      setFile(null)
                      // inputをリセット
                      if (cameraInputRef.current) cameraInputRef.current.value = ''
                      if (albumInputRef.current) albumInputRef.current.value = ''
                    }}
                    className="mt-2 w-full text-sm text-gray-500 underline hover:text-gray-700 transition-colors"
                  >
                    {t('retake')}
                  </button>
                </div>
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
              className="w-full bg-[#8b1a2e] text-white py-3 rounded-full font-medium hover:bg-[#6e1525] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
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
