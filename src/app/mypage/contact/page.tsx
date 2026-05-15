'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'
import {
  CONTACT_CATEGORY_VALUES as categoryValues,
  CONTACT_CATEGORY_LABELS,
} from '@/utils/contactCategories'

type Dict = {
  // ナビゲーション
  backToMyPage: string
  // ページヘッダ
  pageTitle: string
  pageSubtitle: string
  // 完了画面
  doneTitle: string
  doneBody1: string
  doneBody2: string
  doneButton: string
  // フォーム
  categoryLabel: string
  categoryPlaceholder: string
  messageLabel: string
  messagePlaceholder: string
  charCount: (n: number) => string
  // ボタン
  submitting: string
  submit: string
  // alert
  alertSubmitFailed: (msg: string) => string
  alertUnknownError: string
  alertNetworkError: string
}

const T: Record<SupportedLanguage, Dict> = {
  ja: {
    backToMyPage: '← マイページに戻る',
    pageTitle: 'お問い合わせ',
    pageSubtitle: 'ご質問・ご要望をお気軽にお送りください。通常2〜3営業日以内にご返答いたします。',
    doneTitle: '送信完了しました',
    doneBody1: 'お問い合わせありがとうございます。',
    doneBody2: '内容を確認の上、ご返答いたします。',
    doneButton: 'マイページへ戻る',
    categoryLabel: 'カテゴリ',
    categoryPlaceholder: '選択してください',
    messageLabel: 'お問い合わせ内容',
    messagePlaceholder: 'お問い合わせ内容をできるだけ詳しくご記入ください',
    charCount: (n) => `${n} 文字`,
    submitting: '送信中...',
    submit: '送信する',
    alertSubmitFailed: (msg) => `送信に失敗しました: ${msg}`,
    alertUnknownError: '不明なエラー',
    alertNetworkError: 'ネットワークエラーが発生しました',
  },
  en: {
    backToMyPage: '← Back to My Page',
    pageTitle: 'Contact Us',
    pageSubtitle: 'Feel free to send us your questions or requests. We usually reply within 2 to 3 business days.',
    doneTitle: 'Successfully Submitted',
    doneBody1: 'Thank you for contacting us.',
    doneBody2: 'We will review your inquiry and reply.',
    doneButton: 'Back to My Page',
    categoryLabel: 'Category',
    categoryPlaceholder: 'Please select',
    messageLabel: 'Inquiry Details',
    messagePlaceholder: 'Please describe your inquiry in as much detail as possible',
    charCount: (n) => `${n} characters`,
    submitting: 'Sending...',
    submit: 'Submit',
    alertSubmitFailed: (msg) => `Failed to send: ${msg}`,
    alertUnknownError: 'Unknown error',
    alertNetworkError: 'A network error occurred',
  },
  ko: {
    backToMyPage: '← 마이페이지로 돌아가기',
    pageTitle: '문의하기',
    pageSubtitle: '질문이나 요청 사항을 부담없이 보내주세요. 보통 2~3 영업일 이내에 답변 드립니다.',
    doneTitle: '전송 완료되었습니다',
    doneBody1: '문의해 주셔서 감사합니다.',
    doneBody2: '내용을 확인한 후 답변 드립니다.',
    doneButton: '마이페이지로 돌아가기',
    categoryLabel: '카테고리',
    categoryPlaceholder: '선택해 주세요',
    messageLabel: '문의 내용',
    messagePlaceholder: '문의 내용을 가능한 한 자세히 기재해 주세요',
    charCount: (n) => `${n} 자`,
    submitting: '전송 중...',
    submit: '전송하기',
    alertSubmitFailed: (msg) => `전송에 실패했습니다: ${msg}`,
    alertUnknownError: '알 수 없는 오류',
    alertNetworkError: '네트워크 오류가 발생했습니다',
  },
  'zh-tw': {
    backToMyPage: '← 返回個人頁面',
    pageTitle: '聯絡我們',
    pageSubtitle: '歡迎隨時提出您的問題或建議。我們通常會在2〜3個工作天內回覆。',
    doneTitle: '已成功送出',
    doneBody1: '感謝您的聯絡。',
    doneBody2: '我們將確認內容後回覆您。',
    doneButton: '返回個人頁面',
    categoryLabel: '類別',
    categoryPlaceholder: '請選擇',
    messageLabel: '聯絡內容',
    messagePlaceholder: '請盡可能詳細地填寫您的聯絡內容',
    charCount: (n) => `${n} 字`,
    submitting: '傳送中...',
    submit: '送出',
    alertSubmitFailed: (msg) => `傳送失敗:${msg}`,
    alertUnknownError: '未知錯誤',
    alertNetworkError: '發生網路錯誤',
  },
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '1px solid #d4a89a',
  borderRadius: '0.5rem',
  padding: '12px',
  color: '#2c1810',
  fontFamily: 'Zen Kaku Gothic New, sans-serif',
  marginBottom: '0.75rem',
  boxSizing: 'border-box',
  fontSize: '14px',
}

// useSearchParams を使う部分を分離（Suspense 必須）
function CategoryInitializer({ onCategory }: { onCategory: (cat: string) => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const cat = searchParams?.get('category')
    if (cat && (categoryValues as readonly string[]).includes(cat)) {
      onCategory(cat)
    }
  }, [searchParams, onCategory])
  return null
}

function ContactForm() {
  const router = useRouter()
  const { currentLanguage } = useLanguage()
  const t = T[currentLanguage] ?? T.ja
  const categoryLabels = CONTACT_CATEGORY_LABELS[currentLanguage] ?? CONTACT_CATEGORY_LABELS.ja
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const handleSubmit = async () => {
    if (!category || !message.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message: message.trim() }),
      })
      if (res.ok) {
        setIsDone(true)
        setCategory('')
        setMessage('')
      } else {
        const json = await res.json()
        alert(t.alertSubmitFailed(json.error || t.alertUnknownError))
      }
    } catch (e) {
      console.error('Contact submit error:', e)
      alert(t.alertNetworkError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem', background: '#f5ebe0', minHeight: '100vh' }}>
      {/* URLパラメータでカテゴリ初期化（退会フローなど） */}
      <Suspense fallback={null}>
        <CategoryInitializer onCategory={setCategory} />
      </Suspense>

      {/* 戻るボタン */}
      <button
        onClick={() => router.push('/mypage')}
        style={{ background: 'none', border: 'none', color: '#6b4c3b', cursor: 'pointer', marginBottom: '1rem', fontSize: '14px' }}
      >
        {t.backToMyPage}
      </button>

      <h1 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', fontSize: '22px', marginBottom: '0.5rem' }}>
        {t.pageTitle}
      </h1>
      <p style={{ fontSize: '13px', color: '#6b4c3b', marginBottom: '1.5rem', lineHeight: 1.7 }}>
        {t.pageSubtitle}
      </p>

      {isDone ? (
        /* 送信完了 */
        <div style={{
          background: '#fff',
          borderRadius: '1rem',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          border: '1px solid #d4a89a',
        }}>
          <p style={{ fontSize: '48px', marginBottom: '1rem' }}>✅</p>
          <h2 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', marginBottom: '0.75rem' }}>
            {t.doneTitle}
          </h2>
          <p style={{ fontSize: '13px', color: '#6b4c3b', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            {t.doneBody1}<br />
            {t.doneBody2}
          </p>
          <button
            onClick={() => router.push('/mypage')}
            style={{
              background: '#8b1a2e',
              color: '#fff',
              borderRadius: '9999px',
              padding: '12px 32px',
              border: 'none',
              fontFamily: 'Shippori Mincho B1, serif',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {t.doneButton}
          </button>
        </div>
      ) : (
        /* フォーム */
        <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #d4a89a' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '13px', color: '#6b4c3b', display: 'block', marginBottom: '6px' }}>
              {t.categoryLabel} <span style={{ color: '#8b1a2e' }}>*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, appearance: 'auto' }}
            >
              <option value="">{t.categoryPlaceholder}</option>
              {categoryValues.map(cv => (
                <option key={cv} value={cv}>{categoryLabels[cv]}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '13px', color: '#6b4c3b', display: 'block', marginBottom: '6px' }}>
              {t.messageLabel} <span style={{ color: '#8b1a2e' }}>*</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t.messagePlaceholder}
              rows={7}
              style={{ ...inputStyle, resize: 'vertical', marginBottom: 0 }}
            />
            <p style={{ fontSize: '11px', color: '#a08070', marginTop: '4px' }}>
              {t.charCount(message.length)}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!category || !message.trim() || isSubmitting}
            style={{
              width: '100%',
              background: '#8b1a2e',
              color: '#fff',
              borderRadius: '9999px',
              padding: '14px',
              border: 'none',
              fontFamily: 'Shippori Mincho B1, serif',
              letterSpacing: '0.08em',
              cursor: !category || !message.trim() || isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              opacity: !category || !message.trim() || isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? t.submitting : t.submit}
          </button>
        </div>
      )}
    </div>
  )
}

export default function ContactPage() {
  return <ContactForm />
}
