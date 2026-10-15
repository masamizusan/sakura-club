'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '@/store/authStore'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'

// バナーのボタンの文言（4 言語）。本文は authStore（保護対象）が作るため今回は対象外
const T: Record<SupportedLanguage, { refresh: string; close: string }> = {
  ja: { refresh: '更新', close: '閉じる' },
  en: { refresh: 'Refresh', close: 'Close' },
  ko: { refresh: '새로고침', close: '닫기' },
  'zh-tw': { refresh: '重新整理', close: '關閉' },
}

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
  const { currentLanguage } = useLanguage()
  const t = T[currentLanguage] ?? T.ja

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
          {t.refresh}
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
          {t.close}
        </button>
      </div>
    </div>
  )

  return createPortal(bannerContent, document.body)
}
