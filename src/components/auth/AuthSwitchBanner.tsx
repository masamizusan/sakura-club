'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '@/store/authStore'

/**
 * AuthSwitchBanner - ACTIVE タブ用のバナー表示コンポーネント
 *
 * 別タブでログインが発生した際、ACTIVE タブでは alert ではなく
 * バナーを表示してユーザーに気づきを与える
 */
export function AuthSwitchBanner() {
  const banner = useAuthStore((state) => state.banner)
  const clearAuthBanner = useAuthStore((state) => state.clearAuthBanner)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 自動非表示タイマー（15秒）
  useEffect(() => {
    if (!banner) return

    const timer = setTimeout(() => {
      clearAuthBanner()
    }, 15000)

    return () => clearTimeout(timer)
  }, [banner, clearAuthBanner])

  const handleReload = () => {
    clearAuthBanner()
    window.location.reload()
  }

  const handleClose = () => {
    clearAuthBanner()
  }

  if (!mounted || !banner) return null

  const bannerContent = (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2147483646,
        backgroundColor: '#1a1a2e',
        color: '#ffffff',
        padding: '12px 20px',
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        maxWidth: '90vw',
        border: '1px solid #4a4a6a'
      }}
    >
      {/* アイコン */}
      <span style={{ fontSize: 20 }}>🔔</span>

      {/* メッセージ */}
      <span style={{ flex: 1 }}>{banner.message}</span>

      {/* ボタン群 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleReload}
          style={{
            backgroundColor: '#e91e63',
            color: '#ffffff',
            border: 'none',
            borderRadius: 4,
            padding: '6px 12px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: 13
          }}
        >
          更新
        </button>
        <button
          onClick={handleClose}
          style={{
            backgroundColor: 'transparent',
            color: '#aaaaaa',
            border: '1px solid #4a4a6a',
            borderRadius: 4,
            padding: '6px 12px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: 13
          }}
        >
          閉じる
        </button>
      </div>
    </div>
  )

  return createPortal(bannerContent, document.body)
}
