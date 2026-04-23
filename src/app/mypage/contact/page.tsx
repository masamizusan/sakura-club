'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const contactCategories = [
  '登録・ログインについて',
  '課金・お支払いについて',
  'マッチング・メッセージについて',
  '年齢確認について',
  'アカウントの停止・削除について',
  'その他',
]

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

export default function ContactPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  // URLパラメータでカテゴリを初期化（退会フローなど）
  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat && contactCategories.includes(cat)) {
      setCategory(cat)
    }
  }, [searchParams])

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
        alert('送信に失敗しました: ' + (json.error || '不明なエラー'))
      }
    } catch (e) {
      console.error('Contact submit error:', e)
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem', background: '#f5ebe0', minHeight: '100vh' }}>
      {/* 戻るボタン */}
      <button
        onClick={() => router.push('/mypage')}
        style={{ background: 'none', border: 'none', color: '#6b4c3b', cursor: 'pointer', marginBottom: '1rem', fontSize: '14px' }}
      >
        ← マイページに戻る
      </button>

      <h1 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', fontSize: '22px', marginBottom: '0.5rem' }}>
        お問い合わせ
      </h1>
      <p style={{ fontSize: '13px', color: '#6b4c3b', marginBottom: '1.5rem', lineHeight: 1.7 }}>
        ご質問・ご要望をお気軽にお送りください。通常2〜3営業日以内にご返答いたします。
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
            送信完了しました
          </h2>
          <p style={{ fontSize: '13px', color: '#6b4c3b', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            お問い合わせありがとうございます。<br />
            内容を確認の上、ご返答いたします。
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
            マイページへ戻る
          </button>
        </div>
      ) : (
        /* フォーム */
        <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #d4a89a' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '13px', color: '#6b4c3b', display: 'block', marginBottom: '6px' }}>
              カテゴリ <span style={{ color: '#8b1a2e' }}>*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, appearance: 'auto' }}
            >
              <option value="">選択してください</option>
              {contactCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '13px', color: '#6b4c3b', display: 'block', marginBottom: '6px' }}>
              お問い合わせ内容 <span style={{ color: '#8b1a2e' }}>*</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="お問い合わせ内容をできるだけ詳しくご記入ください"
              rows={7}
              style={{ ...inputStyle, resize: 'vertical', marginBottom: 0 }}
            />
            <p style={{ fontSize: '11px', color: '#a08070', marginTop: '4px' }}>
              {message.length} 文字
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
            {isSubmitting ? '送信中...' : '送信する'}
          </button>
        </div>
      )}
    </div>
  )
}
