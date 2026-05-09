'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

type Dict = {
  // ナビゲーション
  backToMyPage: string
  pageTitle: string
  // タブ
  tabNotifications: string
  tabSettings: string
  // 通知一覧
  loading: string
  emptyNotifications: string
  dateLocale: string
  // パスワード変更
  passwordChangeTitle: string
  passwordPlaceholder: string
  passwordConfirmPlaceholder: string
  passwordChanging: string
  passwordChange: string
  // サポート
  supportTitle: string
  supportDescription: string
  contactButton: string
  faqButton: string
  leaveButton: string
  // alert
  alertPasswordMismatch: string
  alertPasswordTooShort: string
  alertChangeFailed: (msg: string) => string
  alertPasswordChanged: string
}

const T: Record<SupportedLanguage, Dict> = {
  ja: {
    backToMyPage: '← マイページに戻る',
    pageTitle: '通知・設定',
    tabNotifications: '🔔 通知',
    tabSettings: '⚙️ 設定',
    loading: '読み込み中...',
    emptyNotifications: '通知はありません',
    dateLocale: 'ja-JP',
    passwordChangeTitle: 'パスワードの変更',
    passwordPlaceholder: '新しいパスワード(8文字以上)',
    passwordConfirmPlaceholder: '新しいパスワード(再確認)',
    passwordChanging: '変更中...',
    passwordChange: '変更する',
    supportTitle: 'サポート',
    supportDescription: 'ご不明な点はお気軽にお問い合わせください',
    contactButton: 'お問い合わせ',
    faqButton: 'よくある質問',
    leaveButton: '退会する',
    alertPasswordMismatch: 'パスワードが一致しません',
    alertPasswordTooShort: 'パスワードは8文字以上で入力してください',
    alertChangeFailed: (msg) => `変更に失敗しました: ${msg}`,
    alertPasswordChanged: 'パスワードを変更しました',
  },
  en: {
    backToMyPage: '← Back to My Page',
    pageTitle: 'Notifications & Settings',
    tabNotifications: '🔔 Notifications',
    tabSettings: '⚙️ Settings',
    loading: 'Loading...',
    emptyNotifications: 'No notifications',
    dateLocale: 'en-US',
    passwordChangeTitle: 'Change Password',
    passwordPlaceholder: 'New password (min 8 characters)',
    passwordConfirmPlaceholder: 'Confirm new password',
    passwordChanging: 'Changing...',
    passwordChange: 'Change',
    supportTitle: 'Support',
    supportDescription: 'Feel free to contact us if you have any questions',
    contactButton: 'Contact Us',
    faqButton: 'FAQ',
    leaveButton: 'Leave',
    alertPasswordMismatch: 'Passwords do not match',
    alertPasswordTooShort: 'Password must be at least 8 characters',
    alertChangeFailed: (msg) => `Failed to change: ${msg}`,
    alertPasswordChanged: 'Password changed successfully',
  },
  ko: {
    backToMyPage: '← 마이페이지로 돌아가기',
    pageTitle: '알림 · 설정',
    tabNotifications: '🔔 알림',
    tabSettings: '⚙️ 설정',
    loading: '로딩 중...',
    emptyNotifications: '알림이 없습니다',
    dateLocale: 'ko-KR',
    passwordChangeTitle: '비밀번호 변경',
    passwordPlaceholder: '새 비밀번호 (8자 이상)',
    passwordConfirmPlaceholder: '새 비밀번호 (재확인)',
    passwordChanging: '변경 중...',
    passwordChange: '변경하기',
    supportTitle: '지원',
    supportDescription: '궁금한 점이 있으시면 부담없이 문의해 주세요',
    contactButton: '문의하기',
    faqButton: '자주 묻는 질문',
    leaveButton: '탈퇴하기',
    alertPasswordMismatch: '비밀번호가 일치하지 않습니다',
    alertPasswordTooShort: '비밀번호는 8자 이상으로 입력해 주세요',
    alertChangeFailed: (msg) => `변경에 실패했습니다: ${msg}`,
    alertPasswordChanged: '비밀번호가 변경되었습니다',
  },
  'zh-tw': {
    backToMyPage: '← 返回個人頁面',
    pageTitle: '通知 · 設定',
    tabNotifications: '🔔 通知',
    tabSettings: '⚙️ 設定',
    loading: '載入中...',
    emptyNotifications: '沒有通知',
    dateLocale: 'zh-TW',
    passwordChangeTitle: '變更密碼',
    passwordPlaceholder: '新密碼（8個字元以上）',
    passwordConfirmPlaceholder: '新密碼（再次確認）',
    passwordChanging: '變更中...',
    passwordChange: '變更',
    supportTitle: '支援',
    supportDescription: '如有任何疑問,歡迎隨時聯絡我們',
    contactButton: '聯絡我們',
    faqButton: '常見問題',
    leaveButton: '退會',
    alertPasswordMismatch: '密碼不一致',
    alertPasswordTooShort: '密碼請輸入8個字元以上',
    alertChangeFailed: (msg) => `變更失敗:${msg}`,
    alertPasswordChanged: '密碼已變更',
  },
}

const notificationIcons: Record<string, string> = {
  warning:   '⚠️',
  suspended: '🚫',
  match:     '💕',
  message:   '💬',
  like:      '❤️',
  footprint: '👣',
  system:    'ℹ️',
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

const primaryButtonStyle: React.CSSProperties = {
  width: '100%',
  background: '#8b1a2e',
  color: '#fff',
  borderRadius: '9999px',
  padding: '14px',
  border: 'none',
  fontFamily: 'Shippori Mincho B1, serif',
  letterSpacing: '0.08em',
  cursor: 'pointer',
  fontSize: '15px',
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { currentLanguage } = useLanguage()
  const t = T[currentLanguage] ?? T.ja

  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoadingNotif, setIsLoadingNotif] = useState(true)

  // パスワード変更
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPw, setIsChangingPw] = useState(false)

  // 通知取得 + 全件自動既読化（履歴は残し、未読フラグのみクリア）
  const fetchNotifications = useCallback(async () => {
    setIsLoadingNotif(true)
    try {
      const res = await fetch('/api/notifications?limit=50')
      const json = await res.json()
      setNotifications(json.notifications ?? [])

      // 設定ページを開いた時点で全件既読扱いにする
      // （マイページの赤丸ドットを次回訪問時に消すため）
      fetch('/api/notifications/mark-all-read', { method: 'POST' })
        .catch(e => console.error('既読化エラー:', e))
    } catch (e) {
      console.error('通知取得エラー:', e)
    } finally {
      setIsLoadingNotif(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      alert(t.alertPasswordMismatch)
      return
    }
    if (newPassword.length < 8) {
      alert(t.alertPasswordTooShort)
      return
    }
    setIsChangingPw(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        alert(t.alertChangeFailed(error.message))
      } else {
        alert(t.alertPasswordChanged)
        setNewPassword('')
        setConfirmPassword('')
      }
    } finally {
      setIsChangingPw(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem', background: '#f5ebe0', minHeight: '100vh' }}>
      {/* 戻るボタン */}
      <button
        onClick={() => router.push('/mypage')}
        style={{ background: 'none', border: 'none', color: '#6b4c3b', cursor: 'pointer', marginBottom: '1rem', fontSize: '14px' }}
      >
        {t.backToMyPage}
      </button>

      <h1 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', fontSize: '22px', marginBottom: '1.5rem' }}>
        {t.pageTitle}
      </h1>

      {/* タブ */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {(['notifications', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '9999px',
              border: activeTab === tab ? 'none' : '1px solid #d4a89a',
              background: activeTab === tab ? '#8b1a2e' : '#fff',
              color: activeTab === tab ? '#fff' : '#6b4c3b',
              fontFamily: 'Shippori Mincho B1, serif',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {tab === 'notifications' ? t.tabNotifications : t.tabSettings}
          </button>
        ))}
      </div>

      {/* 通知タブ */}
      {activeTab === 'notifications' && (
        <div>
          {isLoadingNotif ? (
            <p style={{ color: '#6b4c3b', textAlign: 'center', padding: '2rem' }}>{t.loading}</p>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#a08070' }}>
              <p style={{ fontSize: '40px', marginBottom: '0.5rem' }}>🔔</p>
              <p>{t.emptyNotifications}</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                style={{
                  background: '#fdf6ef',
                  border: '1px solid #d4a89a',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '24px', flexShrink: 0 }}>
                  {notificationIcons[notif.type] ?? 'ℹ️'}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: 'Shippori Mincho B1, serif',
                    color: '#2c1810',
                    marginBottom: '4px',
                    fontSize: '14px',
                  }}>
                    {notif.title}
                  </p>
                  <p style={{
                    fontSize: '13px',
                    color: '#6b4c3b',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-line', // 警告通知の改行(\n)をそのまま表示
                  }}>
                    {notif.message}
                  </p>
                  <p style={{ fontSize: '11px', color: '#a08070', marginTop: '4px' }}>
                    {new Date(notif.createdAt).toLocaleString(t.dateLocale)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 設定タブ */}
      {activeTab === 'settings' && (
        <div>
          {/* パスワード変更 */}
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem', border: '1px solid #d4a89a' }}>
            <h2 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', fontSize: '16px', marginBottom: '1rem' }}>
              {t.passwordChangeTitle}
            </h2>
            <input
              type="password"
              placeholder={t.passwordPlaceholder}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder={t.passwordConfirmPlaceholder}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
            <button
              onClick={handlePasswordChange}
              disabled={isChangingPw || !newPassword || !confirmPassword}
              style={{
                ...primaryButtonStyle,
                opacity: isChangingPw || !newPassword || !confirmPassword ? 0.6 : 1,
              }}
            >
              {isChangingPw ? t.passwordChanging : t.passwordChange}
            </button>
          </div>

          {/* お問い合わせへのリンク */}
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem', border: '1px solid #d4a89a' }}>
            <h2 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', fontSize: '16px', marginBottom: '0.5rem' }}>
              {t.supportTitle}
            </h2>
            <p style={{ fontSize: '13px', color: '#6b4c3b', marginBottom: '1rem' }}>
              {t.supportDescription}
            </p>
            <button
              onClick={() => router.push('/mypage/contact')}
              style={{ ...primaryButtonStyle, marginBottom: '0.75rem' }}
            >
              {t.contactButton}
            </button>
            <button
              onClick={() => router.push('/mypage/faq')}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid #8b1a2e',
                borderRadius: '9999px',
                padding: '12px',
                color: '#8b1a2e',
                cursor: 'pointer',
                fontFamily: 'Shippori Mincho B1, serif',
                fontSize: '14px',
              }}
            >
              {t.faqButton}
            </button>
          </div>

          {/* 退会 */}
          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={() => router.push('/mypage/leave')}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid #ccc',
                borderRadius: '9999px',
                padding: '12px',
                color: '#999',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {t.leaveButton}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
