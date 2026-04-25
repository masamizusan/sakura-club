'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
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

  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoadingNotif, setIsLoadingNotif] = useState(true)

  // パスワード変更
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPw, setIsChangingPw] = useState(false)

  // 退会確認モーダル
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // 通知取得 + 既読化
  const fetchNotifications = useCallback(async () => {
    setIsLoadingNotif(true)
    try {
      const res = await fetch('/api/notifications?limit=50')
      const json = await res.json()
      setNotifications(json.notifications ?? [])

      // 未読を既読に更新
      if ((json.notifications ?? []).some((n: Notification) => !n.isRead)) {
        await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      }
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
      alert('パスワードが一致しません')
      return
    }
    if (newPassword.length < 8) {
      alert('パスワードは8文字以上で入力してください')
      return
    }
    setIsChangingPw(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        alert('変更に失敗しました: ' + error.message)
      } else {
        alert('パスワードを変更しました')
        setNewPassword('')
        setConfirmPassword('')
      }
    } finally {
      setIsChangingPw(false)
    }
  }

  const handleDeleteAccount = async () => {
    // 退会処理（サポートへの問い合わせを案内）
    setShowDeleteModal(false)
    router.push('/mypage/contact?category=アカウントの停止・削除について')
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

      <h1 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', fontSize: '22px', marginBottom: '1.5rem' }}>
        通知・設定
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
            {tab === 'notifications' ? '🔔 通知' : '⚙️ 設定'}
          </button>
        ))}
      </div>

      {/* 通知タブ */}
      {activeTab === 'notifications' && (
        <div>
          {isLoadingNotif ? (
            <p style={{ color: '#6b4c3b', textAlign: 'center', padding: '2rem' }}>読み込み中...</p>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#a08070' }}>
              <p style={{ fontSize: '40px', marginBottom: '0.5rem' }}>🔔</p>
              <p>通知はありません</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                style={{
                  background: notif.isRead ? '#fdf6ef' : '#fff',
                  border: `1px solid ${notif.isRead ? '#d4a89a' : '#8b1a2e'}`,
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
                    fontWeight: notif.isRead ? 400 : 500,
                    marginBottom: '4px',
                    fontSize: '14px',
                  }}>
                    {notif.title}
                  </p>
                  <p style={{ fontSize: '13px', color: '#6b4c3b', lineHeight: 1.7 }}>
                    {notif.message}
                  </p>
                  <p style={{ fontSize: '11px', color: '#a08070', marginTop: '4px' }}>
                    {new Date(notif.createdAt).toLocaleString('ja-JP')}
                  </p>
                </div>
                {!notif.isRead && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#8b1a2e',
                    flexShrink: 0,
                    marginTop: '4px',
                  }} />
                )}
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
              パスワードの変更
            </h2>
            <input
              type="password"
              placeholder="新しいパスワード（8文字以上）"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="新しいパスワード（再確認）"
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
              {isChangingPw ? '変更中...' : '変更する'}
            </button>
          </div>

          {/* お問い合わせへのリンク */}
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem', border: '1px solid #d4a89a' }}>
            <h2 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', fontSize: '16px', marginBottom: '0.5rem' }}>
              サポート
            </h2>
            <p style={{ fontSize: '13px', color: '#6b4c3b', marginBottom: '1rem' }}>
              ご不明な点はお気軽にお問い合わせください
            </p>
            <button
              onClick={() => router.push('/mypage/contact')}
              style={{ ...primaryButtonStyle, marginBottom: '0.75rem' }}
            >
              お問い合わせ
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
              よくある質問
            </button>
          </div>

          {/* 退会 */}
          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={() => setShowDeleteModal(true)}
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
              退会する
            </button>
          </div>
        </div>
      )}

      {/* 退会確認モーダル */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem',
        }}>
          <div style={{ background: '#fff', borderRadius: '1rem', padding: '2rem', maxWidth: '360px', width: '100%' }}>
            <h3 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', marginBottom: '1rem', textAlign: 'center' }}>
              退会について
            </h3>
            <p style={{ fontSize: '13px', color: '#6b4c3b', lineHeight: 1.8, marginBottom: '1.5rem' }}>
              退会をご希望の場合は、お問い合わせフォームよりご連絡ください。アカウントの削除手続きをご案内いたします。
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ flex: 1, padding: '12px', border: '1px solid #d4a89a', borderRadius: '9999px', background: '#fff', color: '#6b4c3b', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccount}
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '9999px', background: '#8b1a2e', color: '#fff', cursor: 'pointer' }}
              >
                お問い合わせへ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
