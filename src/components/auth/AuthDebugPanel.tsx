'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

// =====================================================
// Debug Panel用の型定義
// =====================================================
interface DebugSnapshot {
  tabId: string
  pathNow: string
  pathSource: 'sessionStorage' | 'dataset' | 'location' | 'unknown'
  isAuthPageNow: boolean
  actionFlag: boolean
  actionFlagRaw: string | null  // 🆕 sessionStorage生値
  baseUserId: string | null
  pendingUserId: string | null
  reloadGuard: {
    value: string | null
    ageMs: number | null
    remainingMs: number | null
  }
  timestamp: number
}

interface DebugLogEntry {
  id: number
  timestamp: number
  type: string
  data: Record<string, any>
}

// =====================================================
// sessionStorage キー（authStore.ts と同期）
// =====================================================
const TAB_ID_KEY = '__sakura_tab_id__'
const BASE_USER_KEY = '__base_user_id__'
const PENDING_USER_KEY = '__pending_user_id__'
const RELOAD_GUARD_KEY = '__reload_guard__'
const AUTH_ACTION_KEY = '__auth_action__'
const PATH_NOW_KEY = '__path_now__'
const RELOAD_GUARD_MS = 8000

// =====================================================
// テスト用 Ping/Pong（BroadcastChannel動作確認）
// =====================================================
const PING_CHANNEL_NAME = 'auth-debug-ping'
let pingChannel: BroadcastChannel | null = null
let pingListenerActive = false

function initPingChannel() {
  if (typeof window === 'undefined') return
  if (pingChannel) return

  try {
    pingChannel = new BroadcastChannel(PING_CHANNEL_NAME)
    pingChannel.onmessage = (event) => {
      const data = event.data
      if (data.type === 'PING') {
        // PING受信 → PONG返信
        addDebugLog('🏓 PING received', { from: data.tabId, at: data.at })
        pingChannel?.postMessage({
          type: 'PONG',
          tabId: sessionStorage.getItem(TAB_ID_KEY) || 'unknown',
          originalPing: data.at,
          at: Date.now()
        })
      } else if (data.type === 'PONG') {
        // PONG受信
        const rtt = Date.now() - data.originalPing
        addDebugLog('🏓 PONG received', { from: data.tabId, rtt: `${rtt}ms` })
      }
    }
    pingListenerActive = true
    console.warn('[DEBUG_PING] channel ready')
  } catch (e) {
    console.warn('[DEBUG_PING] failed:', e)
  }
}

export function sendTestPing() {
  initPingChannel()
  if (!pingChannel) {
    addDebugLog('🏓 PING failed', { error: 'no channel' })
    return
  }
  const tabId = sessionStorage.getItem(TAB_ID_KEY) || 'unknown'
  const payload = { type: 'PING', tabId, at: Date.now() }
  pingChannel.postMessage(payload)
  addDebugLog('🏓 PING sent', { tabId })
}

// =====================================================
// グローバルログキュー（authStore.ts からも追加できるように）
// =====================================================
const MAX_LOG_ENTRIES = 50
let debugLogQueue: DebugLogEntry[] = []
let logIdCounter = 0

export function addDebugLog(type: string, data: Record<string, any>) {
  const entry: DebugLogEntry = {
    id: ++logIdCounter,
    timestamp: Date.now(),
    type,
    data
  }
  debugLogQueue.push(entry)
  if (debugLogQueue.length > MAX_LOG_ENTRIES) {
    debugLogQueue = debugLogQueue.slice(-MAX_LOG_ENTRIES)
  }
  // カスタムイベントで通知
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth-debug-log', { detail: entry }))
  }
}

// =====================================================
// getDebugSnapshot - 単一の読み取り関数
// =====================================================
export function getDebugSnapshot(): DebugSnapshot {
  if (typeof window === 'undefined') {
    return {
      tabId: 'server',
      pathNow: '',
      pathSource: 'unknown',
      isAuthPageNow: false,
      actionFlag: false,
      actionFlagRaw: null,
      baseUserId: null,
      pendingUserId: null,
      reloadGuard: { value: null, ageMs: null, remainingMs: null },
      timestamp: Date.now()
    }
  }

  const tabId = sessionStorage.getItem(TAB_ID_KEY) || 'unknown'

  // pathNow の取得（優先順位を明示）
  let pathNow = ''
  let pathSource: 'sessionStorage' | 'dataset' | 'location' | 'unknown' = 'unknown'

  const sessionPath = sessionStorage.getItem(PATH_NOW_KEY)
  if (sessionPath) {
    pathNow = sessionPath
    pathSource = 'sessionStorage'
  } else {
    const domPath = document.body?.dataset?.page
    if (domPath) {
      pathNow = domPath
      pathSource = 'dataset'
    } else {
      pathNow = window.location.pathname || ''
      pathSource = 'location'
    }
  }

  const isAuthPageNow = pathNow === '/login' || pathNow === '/signup'
  const actionFlagRaw = sessionStorage.getItem(AUTH_ACTION_KEY)
  const actionFlag = actionFlagRaw === '1'
  const baseUserId = sessionStorage.getItem(BASE_USER_KEY)
  const pendingUserId = sessionStorage.getItem(PENDING_USER_KEY)

  // guard の計算
  const guardValue = sessionStorage.getItem(RELOAD_GUARD_KEY)
  let guardAgeMs: number | null = null
  let guardRemainingMs: number | null = null
  if (guardValue) {
    const guardTime = parseInt(guardValue, 10)
    guardAgeMs = Date.now() - guardTime
    guardRemainingMs = Math.max(0, RELOAD_GUARD_MS - guardAgeMs)
  }

  return {
    tabId,
    pathNow,
    pathSource,
    isAuthPageNow,
    actionFlag,
    actionFlagRaw,
    baseUserId,
    pendingUserId,
    reloadGuard: {
      value: guardValue,
      ageMs: guardAgeMs,
      remainingMs: guardRemainingMs
    },
    timestamp: Date.now()
  }
}

// =====================================================
// AuthDebugPanel コンポーネント
// =====================================================
export function AuthDebugPanel() {
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(true)
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null)
  const [logs, setLogs] = useState<DebugLogEntry[]>([])
  const [showGuide, setShowGuide] = useState(false)

  // ?debugAuth=1 がない場合は表示しない
  const debugAuth = searchParams?.get('debugAuth')
  const isEnabled = debugAuth === '1'

  // スナップショットを定期更新
  useEffect(() => {
    if (!isEnabled) return
    const updateSnapshot = () => {
      setSnapshot(getDebugSnapshot())
    }
    updateSnapshot()
    const interval = setInterval(updateSnapshot, 500)
    return () => clearInterval(interval)
  }, [isEnabled])

  // Pingチャンネル初期化
  useEffect(() => {
    if (!isEnabled) return
    initPingChannel()
  }, [isEnabled])

  // ログキューを監視
  useEffect(() => {
    if (!isEnabled) return
    const handleLogEvent = (e: CustomEvent<DebugLogEntry>) => {
      setLogs(prev => {
        const newLogs = [...prev, e.detail]
        if (newLogs.length > MAX_LOG_ENTRIES) {
          return newLogs.slice(-MAX_LOG_ENTRIES)
        }
        return newLogs
      })
    }

    // 初期ログを読み込み
    setLogs([...debugLogQueue])

    window.addEventListener('auth-debug-log', handleLogEvent as EventListener)
    return () => {
      window.removeEventListener('auth-debug-log', handleLogEvent as EventListener)
    }
  }, [isEnabled])

  // ボタンハンドラ
  const handleCopySnapshot = useCallback(() => {
    const data = {
      snapshot: getDebugSnapshot(),
      logs: debugLogQueue,
      exportedAt: new Date().toISOString()
    }
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    alert('Debug data copied to clipboard!')
  }, [])

  const handleClearSession = useCallback(() => {
    if (confirm('Clear all sessionStorage for this domain?')) {
      sessionStorage.clear()
      alert('sessionStorage cleared. Reload the page.')
    }
  }, [])

  const handleClearLocal = useCallback(() => {
    if (confirm('Clear all localStorage for this domain?')) {
      localStorage.clear()
      alert('localStorage cleared.')
    }
  }, [])

  const handleClearAuthState = useCallback(() => {
    // 🚨 CRITICAL: すべての認証関連キーを確実に削除
    sessionStorage.removeItem(PENDING_USER_KEY)
    sessionStorage.removeItem(RELOAD_GUARD_KEY)
    sessionStorage.removeItem(AUTH_ACTION_KEY)
    sessionStorage.removeItem(BASE_USER_KEY)

    // 削除確認ログ
    const remaining = {
      pending: sessionStorage.getItem(PENDING_USER_KEY),
      guard: sessionStorage.getItem(RELOAD_GUARD_KEY),
      action: sessionStorage.getItem(AUTH_ACTION_KEY),
      base: sessionStorage.getItem(BASE_USER_KEY)
    }
    console.warn('[DEBUG_PANEL] Clear Auth State:', remaining)
    addDebugLog('CLEAR AUTH STATE', remaining)

    alert('Cleared: pending, guard, actionFlag, base')
    setSnapshot(getDebugSnapshot())
  }, [])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('ja-JP', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0')
  }

  const shortId = (id: string | null) => id ? id.slice(0, 8) : 'null'

  // 表示しない条件
  if (!isEnabled || !snapshot) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        width: isOpen ? 420 : 120,
        maxHeight: isOpen ? '80vh' : 40,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: 11,
        borderRadius: 8,
        overflow: 'hidden',
        zIndex: 99999,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: '#333',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>🔍 Auth Debug</span>
        <span>{isOpen ? '▼' : '▲'}</span>
      </div>

      {isOpen && (
        <div style={{ padding: 12, overflowY: 'auto', maxHeight: 'calc(80vh - 40px)' }}>
          {/* Section A: Current State */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#ffcc00', marginBottom: 4 }}>■ Current State</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ color: '#888' }}>tabId</td><td>{snapshot.tabId}</td></tr>
                <tr><td style={{ color: '#888' }}>pathNow</td><td>{snapshot.pathNow} <span style={{ color: '#666' }}>({snapshot.pathSource})</span></td></tr>
                <tr><td style={{ color: '#888' }}>isAuthPage</td><td style={{ color: snapshot.isAuthPageNow ? '#ff6666' : '#66ff66' }}>{String(snapshot.isAuthPageNow)}</td></tr>
                <tr>
                  <td style={{ color: '#888' }}>actionFlag</td>
                  <td>
                    <span style={{ color: snapshot.actionFlag ? '#ff6666' : '#66ff66' }}>{String(snapshot.actionFlag)}</span>
                    {snapshot.actionFlagRaw && (
                      <span style={{ color: '#ff9966', marginLeft: 4 }}>(raw: &quot;{snapshot.actionFlagRaw}&quot;)</span>
                    )}
                  </td>
                </tr>
                <tr><td style={{ color: '#888' }}>baseUserId</td><td style={{ color: '#66ccff' }}>{shortId(snapshot.baseUserId)}</td></tr>
                <tr><td style={{ color: '#888' }}>pendingUserId</td><td style={{ color: snapshot.pendingUserId ? '#ffcc00' : '#666' }}>{shortId(snapshot.pendingUserId)}</td></tr>
                <tr>
                  <td style={{ color: '#888' }}>guard</td>
                  <td>
                    {snapshot.reloadGuard.value ? (
                      <span style={{ color: '#ff9966' }}>
                        {snapshot.reloadGuard.ageMs}ms / {snapshot.reloadGuard.remainingMs}ms left
                      </span>
                    ) : (
                      <span style={{ color: '#666' }}>null</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section B: Event Log */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#ffcc00', marginBottom: 4 }}>■ Event Log ({logs.length})</div>
            <div style={{ maxHeight: 200, overflowY: 'auto', backgroundColor: '#111', padding: 4, borderRadius: 4 }}>
              {logs.length === 0 ? (
                <div style={{ color: '#666' }}>No events yet</div>
              ) : (
                logs.slice().reverse().map(log => (
                  <div key={log.id} style={{ marginBottom: 4, borderBottom: '1px solid #333', paddingBottom: 4 }}>
                    <div style={{ color: '#888' }}>{formatTime(log.timestamp)}</div>
                    <div style={{ color: getLogColor(log.type) }}>{log.type}</div>
                    <div style={{ fontSize: 10, color: '#aaa', wordBreak: 'break-all' }}>
                      {JSON.stringify(log.data)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section C: Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <button onClick={handleCopySnapshot} style={btnStyle}>📋 Copy JSON</button>
            <button onClick={handleClearAuthState} style={btnStyle}>🧹 Clear Auth State</button>
            <button onClick={() => sendTestPing()} style={{ ...btnStyle, backgroundColor: '#006633' }}>🏓 Test Ping</button>
            <button onClick={handleClearSession} style={{ ...btnStyle, backgroundColor: '#663300' }}>⚠️ Clear Session</button>
            <button onClick={handleClearLocal} style={{ ...btnStyle, backgroundColor: '#663300' }}>⚠️ Clear Local</button>
            <button onClick={() => setShowGuide(!showGuide)} style={btnStyle}>📖 Test Guide</button>
          </div>

          {/* Test Guide */}
          {showGuide && (
            <div style={{ marginTop: 12, padding: 8, backgroundColor: '#222', borderRadius: 4 }}>
              <div style={{ color: '#ffcc00', marginBottom: 8 }}>Test Procedure</div>
              <ol style={{ margin: 0, paddingLeft: 20, color: '#ccc' }}>
                <li>シークレットモードで開く</li>
                <li>Tab1: /mypage?debugAuth=1</li>
                <li>Tab2: /login?debugAuth=1</li>
                <li>Tab2で別ユーザーログイン</li>
                <li>Tab1でalert確認</li>
              </ol>
              <div style={{ marginTop: 8, color: '#ff9966' }}>
                ✓ Tab1: base=Mio, pathNow=/mypage<br/>
                ✓ Tab2: ACTION mismatch → alert
              </div>

              <div style={{ marginTop: 12, color: '#66ccff', marginBottom: 4 }}>🏓 Ping Test</div>
              <div style={{ color: '#ccc', fontSize: 10 }}>
                1. 両タブで「Test Ping」をクリック<br/>
                2. 他タブで「PONG received」が出れば通信OK<br/>
                3. 出なければBroadcastChannelに問題あり
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 10,
  backgroundColor: '#444',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer'
}

function getLogColor(type: string): string {
  if (type.includes('ACTION') || type.includes('mismatch')) return '#ff6666'
  if (type.includes('ALERT') || type.includes('RELOAD')) return '#ff9966'
  if (type.includes('ignored')) return '#999'
  if (type.includes('send')) return '#66ff66'
  if (type.includes('received')) return '#66ccff'
  return '#00ff00'
}
