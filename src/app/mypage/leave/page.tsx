'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'

// ─── 4言語ローカル翻訳辞書（translations.ts は触らない） ──────────────────────
type ReasonKey = 'foundMatch' | 'noMatch' | 'expensive' | 'languageBarrier' | 'hardToUse' | 'tempLeave' | 'other'

type Dict = {
  back: string
  title: string
  subtitle: string
  reasonLabel: string
  multipleSelect: string
  feedbackLabel: string
  required: string
  feedbackDescription: string
  feedbackPlaceholder: string
  feedbackTooShort: (n: number) => string
  charCount: (n: number) => string
  submit: string
  submitting: string
  confirmTitle: string
  confirmBody: string
  confirmYes: string
  confirmNo: string
  reasons: Record<'male' | 'female', Record<ReasonKey, string>>
}

const T: Record<SupportedLanguage, Dict> = {
  ja: {
    back: '← 戻る',
    title: '退会前アンケート',
    subtitle: 'よろしければ、最後にご感想をお聞かせください。',
    reasonLabel: '退会の理由を教えてください',
    multipleSelect: '（複数選択可）',
    feedbackLabel: '運営へのご意見',
    required: '必須',
    feedbackDescription: 'サービスへのご感想・ご要望を自由にご記載ください。',
    feedbackPlaceholder: '具体的なご意見をお聞かせください（10文字以上）',
    feedbackTooShort: (n) => `${n}文字以上で入力してください`,
    charCount: (n) => `${n} / 10文字以上`,
    submit: '退会する',
    submitting: '処理中...',
    confirmTitle: '本当に退会しますか？',
    confirmBody: '退会すると、プロフィール、メッセージ、いいね、足跡などすべてのデータが即時に削除されます。\nこの操作は取り消せません。\n\n退会後、同じメールアドレスで新規登録から再開することは可能です。',
    confirmYes: '退会する',
    confirmNo: 'キャンセル',
    reasons: {
      male: {
        foundMatch: '出会いを見つけられた',
        noMatch: 'お目当ての女性が見つからない',
        expensive: '料金が高い',
        languageBarrier: '言語の壁を感じた',
        hardToUse: '使いづらい',
        tempLeave: '一時的に休会したい',
        other: 'その他',
      },
      female: {
        foundMatch: '文化交流したい人と出会えた',
        noMatch: 'お目当ての男性が見つからない',
        expensive: '料金が高い',
        languageBarrier: '言語の壁を感じた',
        hardToUse: '使いづらい',
        tempLeave: '一時的に休会したい',
        other: 'その他',
      },
    },
  },
  en: {
    back: '← Back',
    title: 'Account Deletion Survey',
    subtitle: 'Before you go, would you mind sharing a few thoughts?',
    reasonLabel: 'Why are you leaving?',
    multipleSelect: '(Multiple selection allowed)',
    feedbackLabel: 'Feedback to the team',
    required: 'required',
    feedbackDescription: 'Please share any thoughts or requests about the service.',
    feedbackPlaceholder: 'Specific feedback helps us improve. (min 10 characters)',
    feedbackTooShort: (n) => `Please enter at least ${n} characters`,
    charCount: (n) => `${n} / min 10 characters`,
    submit: 'Leave SAKURA CLUB',
    submitting: 'Processing...',
    confirmTitle: 'Are you sure you want to leave?',
    confirmBody: 'When you leave, your profile, messages, likes, footprints, and all other data will be deleted immediately.\nThis action cannot be undone.\n\nAfter leaving, you can sign up again with the same email address from the registration page.',
    confirmYes: 'Leave',
    confirmNo: 'Cancel',
    reasons: {
      male: {
        foundMatch: 'Found a match',
        noMatch: 'Could not find a match',
        expensive: 'Too expensive',
        languageBarrier: 'Language barrier',
        hardToUse: 'Hard to use',
        tempLeave: 'Want to take a break',
        other: 'Other',
      },
      female: {
        foundMatch: 'Met people interested in cultural exchange',
        noMatch: 'Could not find someone to connect with',
        expensive: 'Too expensive',
        languageBarrier: 'Language barrier',
        hardToUse: 'Hard to use',
        tempLeave: 'Want to take a break',
        other: 'Other',
      },
    },
  },
  ko: {
    back: '← 뒤로',
    title: '탈퇴 전 설문조사',
    subtitle: '괜찮으시다면 마지막으로 의견을 들려주세요.',
    reasonLabel: '탈퇴 이유를 알려주세요',
    multipleSelect: '（복수 선택 가능）',
    feedbackLabel: '운영팀에 의견',
    required: '필수',
    feedbackDescription: '서비스에 대한 감상이나 요청을 자유롭게 기재해 주세요.',
    feedbackPlaceholder: '구체적인 의견을 들려주세요 (10자 이상)',
    feedbackTooShort: (n) => `${n}자 이상 입력해 주세요`,
    charCount: (n) => `${n} / 10자 이상`,
    submit: '탈퇴하기',
    submitting: '처리 중...',
    confirmTitle: '정말 탈퇴하시겠습니까?',
    confirmBody: '탈퇴하시면 프로필, 메시지, 좋아요, 발자취 등 모든 데이터가 즉시 삭제됩니다.\n이 작업은 취소할 수 없습니다.\n\n탈퇴 후 동일한 이메일 주소로 신규 가입 페이지에서 다시 시작하실 수 있습니다.',
    confirmYes: '탈퇴',
    confirmNo: '취소',
    reasons: {
      male: {
        foundMatch: '만남을 찾았다',
        noMatch: '원하는 여성을 찾지 못했다',
        expensive: '요금이 비싸다',
        languageBarrier: '언어 장벽을 느꼈다',
        hardToUse: '사용하기 어렵다',
        tempLeave: '일시적으로 쉬고 싶다',
        other: '기타',
      },
      female: {
        foundMatch: '문화 교류하고 싶은 사람을 만났다',
        noMatch: '원하는 남성을 찾지 못했다',
        expensive: '요금이 비싸다',
        languageBarrier: '언어 장벽을 느꼈다',
        hardToUse: '사용하기 어렵다',
        tempLeave: '일시적으로 쉬고 싶다',
        other: '기타',
      },
    },
  },
  'zh-tw': {
    back: '← 返回',
    title: '退會前問卷',
    subtitle: '若方便的話，請告訴我們您的感想。',
    reasonLabel: '請告訴我們您退會的原因',
    multipleSelect: '（可複選）',
    feedbackLabel: '對營運的意見',
    required: '必填',
    feedbackDescription: '請自由填寫對服務的感想或建議。',
    feedbackPlaceholder: '請告訴我們具體的意見（至少10字）',
    feedbackTooShort: (n) => `請輸入${n}字以上`,
    charCount: (n) => `${n} / 至少10字`,
    submit: '退會',
    submitting: '處理中...',
    confirmTitle: '您確定要退會嗎？',
    confirmBody: '退會後，個人檔案、訊息、按讚、足跡等所有資料將立即刪除。\n此操作無法復原。\n\n退會後，可使用相同的電子郵件地址從新會員註冊頁面重新開始。',
    confirmYes: '退會',
    confirmNo: '取消',
    reasons: {
      male: {
        foundMatch: '找到了適合的對象',
        noMatch: '找不到理想的女性',
        expensive: '費用太高',
        languageBarrier: '感受到語言障礙',
        hardToUse: '不易使用',
        tempLeave: '想暫時休會',
        other: '其他',
      },
      female: {
        foundMatch: '遇見了想進行文化交流的人',
        noMatch: '找不到理想的男性',
        expensive: '費用太高',
        languageBarrier: '感受到語言障礙',
        hardToUse: '不易使用',
        tempLeave: '想暫時休會',
        other: '其他',
      },
    },
  },
}

const REASON_KEYS: ReasonKey[] = ['foundMatch', 'noMatch', 'expensive', 'languageBarrier', 'hardToUse', 'tempLeave', 'other']
const FEEDBACK_MIN_LENGTH = 10

export default function LeavePage() {
  const router = useRouter()
  const supabase = createClient()
  const { currentLanguage } = useLanguage()
  const t = T[currentLanguage] ?? T.ja

  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const [reasons, setReasons] = useState<ReasonKey[]>([])
  const [feedback, setFeedback] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // gender を取得（性別別の文言切替に必要）
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('gender')
        .eq('id', user.id)
        .maybeSingle()
      if (!cancelled) {
        setGender(profile?.gender === 'female' ? 'female' : 'male')
      }
    }
    init()
    return () => { cancelled = true }
  }, [supabase, router])

  const toggleReason = (key: ReasonKey) => {
    setReasons(prev => prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key])
  }

  const canSubmit = reasons.length > 0 && feedback.trim().length >= FEEDBACK_MIN_LENGTH && !submitting

  const onClickSubmit = () => {
    if (feedback.trim().length < FEEDBACK_MIN_LENGTH) {
      setError(t.feedbackTooShort(FEEDBACK_MIN_LENGTH))
      return
    }
    if (reasons.length === 0) return
    setError(null)
    setShowConfirm(true)
  }

  const onConfirmLeave = async () => {
    setShowConfirm(false)
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reasons, feedback: feedback.trim() }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({} as { error?: string }))
        throw new Error(json?.error ?? `HTTP ${res.status}`)
      }
      // クライアント側もサインアウト
      await supabase.auth.signOut().catch(() => {})
      router.replace('/leave-completed')
    } catch (e) {
      console.error('[leave] submit error:', e)
      setError(e instanceof Error ? e.message : 'Unknown error')
      setSubmitting(false)
    }
  }

  const reasonDict = t.reasons[gender ?? 'male']

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem', background: '#f5ebe0', minHeight: '100vh' }}>
      <button
        onClick={() => router.push('/mypage/settings')}
        style={{ background: 'none', border: 'none', color: '#6b4c3b', cursor: 'pointer', marginBottom: '1rem', fontSize: '14px' }}
      >
        {t.back}
      </button>

      <h1 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', fontSize: '22px', marginBottom: '0.5rem' }}>
        {t.title}
      </h1>
      <p style={{ fontSize: '13px', color: '#6b4c3b', marginBottom: '1.5rem', lineHeight: 1.7 }}>
        {t.subtitle}
      </p>

      <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #d4a89a', marginBottom: '1rem' }}>
        <p style={{ fontSize: '14px', color: '#2c1810', marginBottom: '0.25rem', fontWeight: 500 }}>
          {t.reasonLabel}
          <span style={{ fontSize: '12px', color: '#a08070', marginLeft: '6px' }}>{t.multipleSelect}</span>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
          {REASON_KEYS.map(key => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '0.5rem',
                background: reasons.includes(key) ? '#fdf6ef' : 'transparent',
                border: `1px solid ${reasons.includes(key) ? '#8b1a2e' : '#d4a89a'}`,
                cursor: 'pointer',
                fontSize: '13px',
                color: '#2c1810',
                transition: 'all 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={reasons.includes(key)}
                onChange={() => toggleReason(key)}
                style={{ accentColor: '#8b1a2e' }}
              />
              {reasonDict[key]}
            </label>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #d4a89a', marginBottom: '1rem' }}>
        <label style={{ fontSize: '14px', color: '#2c1810', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
          {t.feedbackLabel} <span style={{ color: '#8b1a2e', fontSize: '12px' }}>* {t.required}</span>
        </label>
        <p style={{ fontSize: '12px', color: '#a08070', marginBottom: '8px' }}>{t.feedbackDescription}</p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={t.feedbackPlaceholder}
          rows={6}
          style={{
            width: '100%',
            background: '#fff',
            border: '1px solid #d4a89a',
            borderRadius: '0.5rem',
            padding: '12px',
            color: '#2c1810',
            fontFamily: 'Zen Kaku Gothic New, sans-serif',
            boxSizing: 'border-box',
            fontSize: '14px',
            resize: 'vertical',
          }}
        />
        {(() => {
          const trimmedLen = feedback.trim().length
          const meetsMin = trimmedLen >= FEEDBACK_MIN_LENGTH
          return (
            <p style={{
              fontSize: '11px',
              color: meetsMin ? '#2e7d32' : '#8b1a2e',
              fontWeight: meetsMin ? 400 : 500,
              marginTop: '4px',
            }}>
              {t.charCount(trimmedLen)}
            </p>
          )
        })()}
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: '#8b1a2e', marginBottom: '0.75rem' }}>
          {error}
        </p>
      )}

      <button
        onClick={onClickSubmit}
        disabled={!canSubmit}
        style={{
          width: '100%',
          background: '#8b1a2e',
          color: '#fff',
          borderRadius: '9999px',
          padding: '14px',
          border: 'none',
          fontFamily: 'Shippori Mincho B1, serif',
          letterSpacing: '0.08em',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          fontSize: '15px',
          opacity: canSubmit ? 1 : 0.6,
        }}
      >
        {submitting ? t.submitting : t.submit}
      </button>

      {showConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem',
          }}
        >
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '2rem', maxWidth: '380px', width: '100%' }}>
            <h3 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', marginBottom: '1rem', textAlign: 'center', fontSize: '17px' }}>
              {t.confirmTitle}
            </h3>
            <p style={{ fontSize: '13px', color: '#6b4c3b', lineHeight: 1.8, marginBottom: '1.5rem', whiteSpace: 'pre-line' }}>
              {t.confirmBody}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{ flex: 1, padding: '12px', border: '1px solid #d4a89a', borderRadius: '9999px', background: '#fff', color: '#6b4c3b', cursor: 'pointer', fontSize: '14px' }}
              >
                {t.confirmNo}
              </button>
              <button
                onClick={onConfirmLeave}
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '9999px', background: '#8b1a2e', color: '#fff', cursor: 'pointer', fontSize: '14px' }}
              >
                {t.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
