import { create } from 'zustand'
import { AuthUser, authService } from '@/lib/auth'
import { clearAllUserStorage } from '@/utils/userStorage'
import { logger } from '@/utils/logger'

// Debug Panel用のログ関数（遅延インポートで循環参照回避）
let addDebugLogFn: ((type: string, data: Record<string, any>) => void) | null = null
const pendingLogs: Array<{type: string, data: Record<string, any>}> = []

function addDebugLog(type: string, data: Record<string, any>) {
  if (typeof window === 'undefined') return

  if (!addDebugLogFn) {
    // 保留キューに追加
    pendingLogs.push({ type, data })

    // 動的インポート（1回だけ）
    import('@/components/auth/AuthDebugPanel').then(mod => {
      addDebugLogFn = mod.addDebugLog
      // 保留していたログをすべて追加
      while (pendingLogs.length > 0) {
        const log = pendingLogs.shift()
        if (log) addDebugLogFn(log.type, log.data)
      }
    }).catch(() => {})
  } else {
    addDebugLogFn(type, data)
  }
}

// =====================================================
// 🚨 Cross-Tab認証検知 - sessionStorageベース
//
// 絶対ルール:
// - 判定に使うのは sessionStorage.__base_user_id__ のみ
// - Supabase/Zustand/グローバル変数は判定に使用禁止
// - onAuthStateChange は broadcast 送信専用
// - alert/reload は受信ハンドラでのみ実行
// =====================================================

// =====================================================
// 1️⃣ タブ固有ID
// =====================================================
const TAB_ID_KEY = '__sakura_tab_id__'

function getTabId(): string {
  if (typeof window === 'undefined') return 'server'

  let id = sessionStorage.getItem(TAB_ID_KEY)
  if (!id) {
    id = Math.random().toString(36).slice(2, 8)
    sessionStorage.setItem(TAB_ID_KEY, id)
  }
  return id
}

const tabId = getTabId()

// =====================================================
// 🆕 getPathNow() - 安定したパス取得（誤判定防止）
// 優先順位: sessionStorage > dataset > location.pathname
// 🚨 CRITICAL: window.location.pathname は最後の保険のみ
// =====================================================
const PATH_NOW_KEY = '__path_now__'

function getPathNow(): string {
  if (typeof window === 'undefined') return ''

  // 1. sessionStorage（最優先 - AuthSwitchGuard が設定）
  const sessionPath = sessionStorage.getItem(PATH_NOW_KEY)
  if (sessionPath) {
    logger.debug(`[PATH_NOW][${tabId}] from=sessionStorage value=${sessionPath}`)
    return sessionPath
  }

  // 2. DOM dataset（バックアップ）
  const domPath = document.body?.dataset?.page
  if (domPath) {
    logger.debug(`[PATH_NOW][${tabId}] from=dataset value=${domPath}`)
    return domPath
  }

  // 3. window.location.pathname（最後の保険 - 信頼性低）
  const locPath = window.location.pathname || ''
  logger.debug(`[PATH_NOW][${tabId}] from=location value=${locPath} ⚠️ FALLBACK`)
  return locPath
}

// =====================================================
// 2️⃣ isAuthPageNow() - DOM基準で絶対に誤判定しない実装
// 🚨 CRITICAL: document.body.dataset.page を使用
// window.location.pathname は禁止（Next.js routing issue）
// =====================================================
function isAuthPageNow(): boolean {
  const p = getPathNow()
  // 完全一致のみ（曖昧判定禁止）
  return p === '/login' || p === '/signup'
}

// =====================================================
// 3️⃣ 基準ユーザーID（__base_user_id__）
// 更新ルール（厳格）:
// (a) 操作タブ（auth page + auth_action=true）でのログイン成功時のみ
// (b) boot時の pending → base 反映時のみ
// それ以外では絶対に触らない
// =====================================================
const BASE_USER_KEY = '__base_user_id__'

function getBaseUserId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(BASE_USER_KEY)
}

function setBaseUserIdOnce(userId: string) {
  if (typeof window === 'undefined') return
  if (getBaseUserId()) {
    logger.debug(`[BASE_USER][${tabId}] already set, skip`)
    return
  }
  sessionStorage.setItem(BASE_USER_KEY, userId)
  logger.debug(`[BASE_USER][${tabId}] set (once): ${userId.slice(0, 8)}`)
}

// 🚨 base更新は (a)(b) の2ケースのみ許可
// (a) auth-action: auth page + actionFlag=true のときのみ
// (b) boot-pending: alert後のreload時のみ（guardが生きている前提）
function updateBaseUserId(userId: string, source: 'auth-action' | 'boot-pending') {
  if (typeof window === 'undefined') return
  const prevBase = getBaseUserId()
  const pathNow = getPathNow()
  const isAuth = isAuthPageNow()
  const actionFlag = hasAuthActionFlag()

  // 🚨 CRITICAL: auth-action の場合、追加の安全チェック
  if (source === 'auth-action') {
    if (!isAuth || !actionFlag) {
      // ❌ 異常: auth-action なのに条件を満たしていない → 更新を拒否
      console.error(`[BASE_USER][${tabId}] BLOCKED: auth-action called but conditions not met`, {
        isAuth,
        actionFlag,
        pathNow,
        attemptedUserId: userId.slice(0, 8)
      })
      return // 更新しない
    }
  }

  sessionStorage.setItem(BASE_USER_KEY, userId)

  // 🚨 CRITICAL: 詳細ログ（いつ・誰が・どの状態で base を更新したか）
  logger.debug(`[BASE_USER][${tabId}] UPDATED`, {
    prev: prevBase?.slice(0, 8) || 'null',
    next: userId.slice(0, 8),
    source,
    pathNow,
    isAuth,
    actionFlag
  })
}

function clearBaseUserId() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(BASE_USER_KEY)
  logger.debug(`[BASE_USER][${tabId}] cleared`)
}

// =====================================================
// 4️⃣ ペンディングユーザーID（__pending_user_id__）
// =====================================================
const PENDING_USER_KEY = '__pending_user_id__'

function getPendingUserId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(PENDING_USER_KEY)
}

function setPendingUserId(userId: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PENDING_USER_KEY, userId)
  logger.debug(`[PENDING][${tabId}] set: ${userId.slice(0, 8)}`)
}

function clearPendingUserId() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PENDING_USER_KEY)
  logger.debug(`[PENDING][${tabId}] cleared`)
}

// =====================================================
// 5️⃣ リロードガード（__reload_guard__）
// timestamp方式：未設定 or 期限切れなら実行、生きていればスキップ
// 🚨 FIX: 期限切れ時は自動クリア
// =====================================================
const RELOAD_GUARD_KEY = '__reload_guard__'
const RELOAD_GUARD_MS = 8000

// =====================================================
// 5.5️⃣ Alertロック（__auth_alert_lock__）- 無限ループ防止
// =====================================================
const ALERT_LOCK_KEY = '__auth_alert_lock__'
const ALERT_LOCK_MS = 10000 // 10秒

function isAlertLockActive(): boolean {
  if (typeof window === 'undefined') return false
  const lockTime = sessionStorage.getItem(ALERT_LOCK_KEY)
  if (!lockTime) return false
  const age = Date.now() - parseInt(lockTime, 10)
  if (age >= ALERT_LOCK_MS) {
    sessionStorage.removeItem(ALERT_LOCK_KEY)
    logger.debug(`[ALERT_LOCK][${tabId}] auto-cleared (expired: ${age}ms)`)
    return false
  }
  return true
}

function setAlertLock() {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(ALERT_LOCK_KEY, Date.now().toString())
  logger.debug(`[ALERT_LOCK][${tabId}] SET (expires in ${ALERT_LOCK_MS}ms)`)
}

// =====================================================
// 5.6️⃣ POST_RELOAD_SYNC（reload後の1回だけbase同期）
// =====================================================
const POST_RELOAD_SYNC_KEY = '__post_reload_sync_user__'

function getGuardAge(): number | null {
  if (typeof window === 'undefined') return null
  const guardTime = sessionStorage.getItem(RELOAD_GUARD_KEY)
  if (!guardTime) return null

  const age = Date.now() - parseInt(guardTime, 10)

  // 🚨 FIX: 期限切れの場合は自動クリアして null 扱い
  if (age >= RELOAD_GUARD_MS) {
    sessionStorage.removeItem(RELOAD_GUARD_KEY)
    logger.debug(`[GUARD][${tabId}] auto-cleared (expired: ${age}ms >= ${RELOAD_GUARD_MS}ms)`)
    addDebugLog('GUARD expired -> cleared', { age: `${age}ms`, raw: guardTime })
    return null
  }

  return age
}

function setReloadGuard(source: string) {
  if (typeof window === 'undefined') return
  const ts = Date.now()
  const pathNow = getPathNow()
  sessionStorage.setItem(RELOAD_GUARD_KEY, ts.toString())
  // 🚨 CRITICAL: guardを誰がいつセットしたか追跡
  logger.debug(`[GUARD][${tabId}] SET`, {
    ts,
    source,
    pathNow,
    expiresIn: `${RELOAD_GUARD_MS}ms`
  })
}

function isReloadGuardActive(): boolean {
  const age = getGuardAge()  // 期限切れなら null が返る（自動クリア済み）
  if (age === null) return false
  return age < RELOAD_GUARD_MS
}

function clearReloadGuard() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(RELOAD_GUARD_KEY)
  logger.debug(`[GUARD][${tabId}] cleared`)
}

// =====================================================
// 6️⃣ 認証操作フラグ（__auth_action__）
// 🚨 /login, /signup でのみ有効
// 非authページでは stale 扱いで即クリア
// =====================================================
const AUTH_ACTION_KEY = '__auth_action__'

function setAuthActionFlag() {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(AUTH_ACTION_KEY, '1')
  logger.debug(`[AUTH_ACTION][${tabId}] flag set`)
}

function clearAuthActionFlag() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(AUTH_ACTION_KEY)
  logger.debug(`[AUTH_ACTION][${tabId}] flag cleared`)
}

function hasAuthActionFlag(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(AUTH_ACTION_KEY) === '1'
}

// Export for login/signup pages
export { setAuthActionFlag as setAuthActionInThisTab, clearAuthActionFlag as clearAuthActionInThisTab }

// =====================================================
// タブ間通信
// =====================================================
const AUTH_CHANNEL_NAME = 'auth-switch'
const CROSS_TAB_AUTH_KEY = '__auth_switch__'

// =====================================================
// 🚨 showAlertAndReload - 無限ループ防止版
// ALERT_LOCK → 火種クリア → POST_RELOAD_SYNC → alert → reload
// =====================================================
function showAlertAndReload(incomingUserId: string) {
  // 🚨 CRITICAL: ループ防止 - lockが生きていたらスキップ
  if (isAlertLockActive()) {
    const lockRaw = sessionStorage.getItem(ALERT_LOCK_KEY)
    const lockAge = lockRaw ? Date.now() - parseInt(lockRaw, 10) : null
    logger.debug(`[SKIP][${tabId}] SKIP_ALERT_LOCK (TTL active)`)
    addDebugLog('SKIP_ALERT_LOCK', {
      lockAge: lockAge !== null ? `${lockAge}ms` : 'null',
      remaining: lockAge !== null ? `${ALERT_LOCK_MS - lockAge}ms` : 'null',
      incoming: incomingUserId.slice(0, 8)
    })
    return
  }

  // 🚨 詳細ログ（デバッグ精度向上）
  const debugData = {
    baseUserId: getBaseUserId() || 'null',
    baseShort: getBaseUserId()?.slice(0, 8) || 'null',
    incomingUserId: incomingUserId,
    incomingShort: incomingUserId.slice(0, 8),
    pathNow: getPathNow(),
    actionFlagRaw: sessionStorage.getItem(AUTH_ACTION_KEY) || 'null',
    pendingUserId: getPendingUserId()?.slice(0, 8) || 'null',
    reloadGuardRaw: sessionStorage.getItem(RELOAD_GUARD_KEY) || 'null',
    reloadGuardAge: getGuardAge(),
    alertLockActive: false,
    postReloadSyncUser: sessionStorage.getItem(POST_RELOAD_SYNC_KEY)?.slice(0, 8) || 'null'
  }
  logger.debug(`[ALERT_SHOW][${tabId}] 🚨 showing alert (pre-reload)`, debugData)
  addDebugLog('ALERT showing', debugData)

  // 1. ALERT_LOCK を先にセット（10秒）- ループ防止
  setAlertLock()

  // 2. reload後の収束用にincomingUserIdを保存（1回だけbase同期）
  sessionStorage.setItem(POST_RELOAD_SYNC_KEY, incomingUserId)
  logger.debug(`[POST_RELOAD_SYNC][${tabId}] set: ${incomingUserId.slice(0, 8)}`)

  // 3. ループの火種を確実に消す
  clearPendingUserId()
  clearReloadGuard()
  clearAuthActionFlag()

  // 4. alert（同期）
  window.alert('別タブでログインが行われました。再読み込みします。')

  // 5. alert が閉じられた後に reload
  window.location.reload()
}

// =====================================================
// 🚨 受信ハンドラ（唯一の判定ロジック）
// alert/reload はここでのみ実行
// =====================================================
function handleIncomingAuthSwitch(payload: any) {
  if (!payload) return
  if (typeof window === 'undefined') return

  const incomingUserId = payload.userId
  const fromTab = payload.fromTab
  const pathNow = getPathNow()
  const isAuth = isAuthPageNow()
  const base = getBaseUserId()
  const pending = getPendingUserId()
  const guardAge = getGuardAge()
  let actionFlag = hasAuthActionFlag()

  // 🚨 CRITICAL: 非authページで auth_action が残っていたら stale として即クリア
  // クリアして判定を続行（握りつぶさない）
  if (actionFlag && !isAuth) {
    logger.debug(`[CROSS_TAB][${tabId}] stale auth_action on non-auth page - clearing and continue (pathNow=${pathNow})`)
    clearAuthActionFlag()
    actionFlag = false
  }

  // 🚨 必須ログ: received（pathNow + isAuth を必ず含める）
  const receivedData = {
    fromTab: fromTab?.slice(0, 6),
    incoming: incomingUserId?.slice(0, 8) || 'null',
    base: base?.slice(0, 8) || 'null',
    pathNow,
    isAuth,
    actionFlag
  }
  logger.debug(`[CROSS_TAB][${tabId}] received`, receivedData)
  addDebugLog('CROSS_TAB received', receivedData)

  // 🆕 追加: ROUTE ログ（誤判定検知用）
  logger.debug(`[ROUTE][${tabId}] pathNow=${pathNow} isAuthPageNow=${isAuth}`)

  // === 判定ロジック（スキップ理由を必ずログ出力） ===

  // 1) 自タブ送信は無視
  if (fromTab === tabId) {
    logger.debug(`[SKIP][${tabId}] SKIP_SAME_TAB`)
    addDebugLog('SKIP_SAME_TAB', { fromTab, pathNow })
    return
  }

  // 2) 🚨 CRITICAL: 操作タブ（auth page + auth_action 両方）のみ無視
  if (isAuth && actionFlag) {
    logger.debug(`[SKIP][${tabId}] SKIP_ACTION_FLAG (auth page + action flag)`)
    addDebugLog('SKIP_ACTION_FLAG', { isAuth, actionFlag, pathNow })
    return
  }

  // 3) baseがなければ無視（初期化前）
  if (!base) {
    logger.debug(`[SKIP][${tabId}] SKIP_NO_BASE (not initialized)`)
    addDebugLog('SKIP_NO_BASE', { pathNow })
    return
  }

  // 4) guardが生きていればスキップ（初回は潰さない）
  const guardTs = sessionStorage.getItem(RELOAD_GUARD_KEY)
  if (guardAge !== null && guardAge < RELOAD_GUARD_MS) {
    logger.debug(`[SKIP][${tabId}] SKIP_GUARD_ACTIVE (recently reloaded)`)
    addDebugLog('SKIP_GUARD_ACTIVE', {
      guardAge: `${guardAge}ms`,
      remaining: `${RELOAD_GUARD_MS - guardAge}ms`,
      incoming: incomingUserId?.slice(0, 8) || 'null',
      base: base?.slice(0, 8) || 'null'
    })
    return
  }

  // 5) incoming が null/undefined なら無視
  if (!incomingUserId) {
    logger.debug(`[SKIP][${tabId}] SKIP_INCOMING_NULL`)
    addDebugLog('SKIP_INCOMING_NULL', { pathNow, base: base?.slice(0, 8) })
    return
  }

  // 6) 🚨 核心判定: incoming === base なら同一ユーザー → スキップ
  if (incomingUserId === base) {
    logger.debug(`[SKIP][${tabId}] SKIP_SAME_USER (incoming === base)`)
    addDebugLog('SKIP_SAME_USER', {
      incoming: incomingUserId.slice(0, 8),
      base: base.slice(0, 8),
      pathNow
    })
    return
  }

  // 7) ✅ ここに到達 = mismatch → ACTIVE/PASSIVE で分岐
  const isPassive = isPassiveTab()

  if (isPassive) {
    // 🚨 PASSIVE タブ: alert + reload（従来通り）
    logger.debug(`[ALERT][${tabId}] 🚨 MISMATCH (PASSIVE) -> showing alert`)
    addDebugLog('ALERT_MISMATCH_PASSIVE', {
      incoming: incomingUserId.slice(0, 8),
      base: base.slice(0, 8),
      pathNow,
      isPassive: true
    })
    showAlertAndReload(incomingUserId)
  } else {
    // 🆕 ACTIVE タブ: バナー表示のみ（alert なし）
    logger.debug(`[BANNER][${tabId}] 🔔 MISMATCH (ACTIVE) -> showing banner`)
    addDebugLog('BANNER_MISMATCH_ACTIVE', {
      incoming: incomingUserId.slice(0, 8),
      base: base.slice(0, 8),
      pathNow,
      isPassive: false
    })
    // Zustand store のバナー表示を呼び出し
    useAuthStore.getState().showAuthBanner(
      incomingUserId,
      `別タブでログインがありました。更新しますか？`
    )
  }
}

// =====================================================
// BroadcastChannel + storage listener（モジュールトップレベル）
// =====================================================
let authChannel: BroadcastChannel | null = null

if (typeof window !== 'undefined') {
  // 🆕 BroadcastChannel初期化
  try {
    authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME)
    authChannel.onmessage = (event) => {
      logger.debug(`[BC_RECEIVE][${tabId}] raw event:`, event.data)
      addDebugLog('BC raw receive', { data: event.data })

      const payload = event.data || {}
      if (payload.userId !== undefined) {
        logger.debug(`[BC_RECEIVE][${tabId}] calling handleIncomingAuthSwitch`)
        handleIncomingAuthSwitch(payload)
      } else {
        logger.debug(`[BC_RECEIVE][${tabId}] SKIP: payload.userId is undefined`)
      }
    }
    authChannel.onmessageerror = (event) => {
      console.error(`[BC_ERROR][${tabId}] message error:`, event)
      addDebugLog('BC error', { event: 'messageerror' })
    }
    logger.debug(`[AUTH_LISTENER][${tabId}] BroadcastChannel READY (channel=${AUTH_CHANNEL_NAME})`)
    addDebugLog('LISTENER ready', { type: 'BroadcastChannel', channel: AUTH_CHANNEL_NAME })
  } catch (e) {
    logger.debug(`[AUTH_LISTENER][${tabId}] BroadcastChannel not supported:`, e)
    addDebugLog('LISTENER error', { type: 'BroadcastChannel', error: String(e) })
    authChannel = null
  }

  // 🆕 localStorage storage event listener
  window.addEventListener('storage', (event) => {
    // 全てのstorage eventをログ（デバッグ用）
    if (event.key === CROSS_TAB_AUTH_KEY) {
      logger.debug(`[LS_RECEIVE][${tabId}] storage event: key=${event.key} newValue=${event.newValue?.slice(0, 50)}...`)
      addDebugLog('LS raw receive', { key: event.key, hasNewValue: !!event.newValue })
    }

    if (event.key !== CROSS_TAB_AUTH_KEY || !event.newValue) return

    try {
      const payload = JSON.parse(event.newValue)
      logger.debug(`[LS_RECEIVE][${tabId}] calling handleIncomingAuthSwitch`)
      handleIncomingAuthSwitch(payload)
    } catch (e) {
      logger.debug(`[LS_RECEIVE][${tabId}] parse error:`, e)
      addDebugLog('LS parse error', { error: String(e) })
    }
  })
  logger.debug(`[AUTH_LISTENER][${tabId}] storage READY`)
  addDebugLog('LISTENER ready', { type: 'localStorage' })
}

// =====================================================
// broadcastAuthChange（送信専用）
// =====================================================
function broadcastAuthChange(userId: string | null, source: string) {
  if (typeof window === 'undefined') return

  const payload = {
    userId,
    fromTab: tabId,
    at: Date.now(),
    source // 🆕 送信元も含める（デバッグ用）
  }

  const sendData = { userId: userId?.slice(0, 8) || 'null', source, fromTab: tabId, at: payload.at }
  logger.debug(`[BROADCAST][${tabId}][send] userId=${userId?.slice(0, 8) || 'null'} source=${source}`)
  addDebugLog('BROADCAST send', sendData)

  // 🆕 BroadcastChannel送信
  let bcSent = false
  if (authChannel) {
    try {
      authChannel.postMessage(payload)
      bcSent = true
      logger.debug(`[BROADCAST][${tabId}] BroadcastChannel postMessage SUCCESS`)
    } catch (e) {
      logger.debug(`[BROADCAST][${tabId}] BroadcastChannel postMessage FAILED:`, e)
    }
  } else {
    logger.debug(`[BROADCAST][${tabId}] BroadcastChannel is NULL`)
  }

  // 🆕 localStorage送信（BroadcastChannelのバックアップ）
  let lsSent = false
  try {
    // 🚨 CRITICAL: localStorage storage eventは値が変わった時のみ発火
    // 同じ値を書き込むとイベントが発火しないため、必ず違う値にする
    localStorage.setItem(CROSS_TAB_AUTH_KEY, JSON.stringify(payload))
    lsSent = true
    logger.debug(`[BROADCAST][${tabId}] localStorage setItem SUCCESS`)
  } catch (e) {
    logger.debug(`[BROADCAST][${tabId}] localStorage setItem FAILED:`, e)
  }

  // 送信結果サマリー
  addDebugLog('BROADCAST result', { bcSent, lsSent, source })
}

export const notifyAuthChange = (userId: string | null) => {
  broadcastAuthChange(userId, 'explicit')
}

// 後方互換性のためのダミーexport
export function setAuthPageMounted(_mounted: boolean) {}
export function setCurrentPath(_path: string) {}

// =====================================================
// 🚨 BOOT処理: pending反映 + staleフラグ掃除
// 全ページ共通で必ず実行される
// =====================================================
function applyPendingUserOnBoot() {
  if (typeof window === 'undefined') return

  // 🚨 CRITICAL: BOOT時に即座にsessionStorageにパスを設定
  // AuthSwitchGuardがマウントする前でも正しいパスを取得できるようにする
  const locationPath = window.location.pathname
  if (locationPath && !sessionStorage.getItem(PATH_NOW_KEY)) {
    sessionStorage.setItem(PATH_NOW_KEY, locationPath)
    logger.debug(`[BOOT][${tabId}] PATH_NOW_KEY set from location: ${locationPath}`)
  }

  // =====================================================
  // 🚨 CRITICAL: POST_RELOAD_SYNC 処理（最優先）
  // alert→reload後の1回だけbaseを強制同期して収束させる
  // =====================================================
  const postReloadSyncUser = sessionStorage.getItem(POST_RELOAD_SYNC_KEY)
  if (postReloadSyncUser) {
    logger.debug(`[BOOT][${tabId}] 🎯 POST_RELOAD_SYNC found: ${postReloadSyncUser.slice(0, 8)}`)
    addDebugLog('BOOT POST_RELOAD_SYNC', {
      user: postReloadSyncUser.slice(0, 8),
      prevBase: getBaseUserId()?.slice(0, 8) || 'null'
    })

    // baseを強制的に同期（これでループを断ち切る）
    sessionStorage.setItem(BASE_USER_KEY, postReloadSyncUser)
    logger.debug(`[BOOT][${tabId}] ✅ BASE forced to: ${postReloadSyncUser.slice(0, 8)}`)

    // 使い終わったら削除
    sessionStorage.removeItem(POST_RELOAD_SYNC_KEY)

    // 他の残骸も掃除
    clearPendingUserId()
    clearReloadGuard()
    clearAuthActionFlag()

    addDebugLog('BOOT POST_RELOAD_SYNC applied', {
      newBase: postReloadSyncUser.slice(0, 8),
      action: 'early return'
    })

    // 早期リターン（通常のBOOT処理は不要 - 収束完了）
    return
  }

  const pathNow = getPathNow()
  const isAuth = isAuthPageNow()
  const base = getBaseUserId()
  const pending = getPendingUserId()
  const guardAge = getGuardAge()

  // 🚨 FIX: sessionStorage を直接読んで二重確認
  const actionFlagFromFunc = hasAuthActionFlag()
  const actionFlagRaw = sessionStorage.getItem(AUTH_ACTION_KEY)
  const actionFlagFromStorage = actionFlagRaw === '1'

  // 不整合検出
  if (actionFlagFromFunc !== actionFlagFromStorage) {
    console.error(`[BOOT][${tabId}] 🚨 actionFlag MISMATCH! func=${actionFlagFromFunc} storage=${actionFlagFromStorage} raw="${actionFlagRaw}"`)
    addDebugLog('BOOT actionFlag MISMATCH', { func: actionFlagFromFunc, storage: actionFlagFromStorage, raw: actionFlagRaw })
  }

  // 実際の値は sessionStorage から直接取得
  const actionFlag = actionFlagFromStorage

  // bootログ（必須）- sessionStorage生値も含める
  const bootData = {
    path: pathNow,
    authPage: isAuth,
    base: base?.slice(0, 8) || 'null',
    pending: pending?.slice(0, 8) || 'null',
    guard: guardAge !== null ? `${guardAge}ms` : 'null',
    actionFlag,
    actionFlagRaw: actionFlagRaw || 'null'
  }
  logger.debug(`[BOOT][${tabId}] path=${pathNow} authPage=${isAuth} base=${base?.slice(0, 8) || 'null'} pending=${pending?.slice(0, 8) || 'null'} guard=${guardAge !== null ? `${guardAge}ms` : 'null'} actionFlag=${actionFlag} actionFlagRaw=${actionFlagRaw || 'null'}`)
  addDebugLog('BOOT', bootData)

  // 🚨 CRITICAL FIX: 非authページで __auth_action__ が sessionStorage に残っていたら強制クリア
  // 関数の戻り値ではなく、sessionStorage を直接確認して確実にクリア
  if (!isAuth && actionFlagRaw) {
    logger.debug(`[BOOT][${tabId}] 🧹 FORCE clearing stale __auth_action__ on non-auth page: path=${pathNow} raw="${actionFlagRaw}"`)
    sessionStorage.removeItem(AUTH_ACTION_KEY)
    addDebugLog('BOOT force clear actionFlag', { path: pathNow, raw: actionFlagRaw })
  }

  // =====================================================
  // 🚨 CRITICAL FIX: BOOT pending 適用の厳格なガード
  // PASSIVEタブでは pending を base に昇格させてはいけない
  // =====================================================

  // 操作タブ判定（sessionStorage 生値を使用）
  const isLocalActor = isAuth && (actionFlagRaw === '1')

  // pending 処理の判定ログ
  const pendingDecision = {
    base: base?.slice(0, 8) || 'null',
    pending: pending?.slice(0, 8) || 'null',
    guardAge: guardAge !== null ? `${guardAge}ms` : 'null',
    isAuthPageNow: isAuth,
    actionFlagRaw: actionFlagRaw || 'null',
    isLocalActor
  }

  if (pending) {
    // 判定: ALLOW or DENY
    const baseIsNull = !base
    const guardIsActive = guardAge !== null && guardAge < RELOAD_GUARD_MS

    if (baseIsNull) {
      // ✅ ALLOW: base が未設定（初回状態）→ pending を適用
      logger.debug(`[BOOT][${tabId}] pending decision: ALLOW (base is null)`, pendingDecision)
      addDebugLog('BOOT pending decision', { ...pendingDecision, decision: 'ALLOW', reason: 'base is null' })
      if (guardIsActive) {
        updateBaseUserId(pending, 'boot-pending')
      } else {
        setBaseUserIdOnce(pending)
      }
      clearPendingUserId()
      clearReloadGuard()
    } else if (isLocalActor && guardIsActive) {
      // ✅ ALLOW: 操作タブ（LOCAL ACTOR）かつ guard がアクティブ → pending を適用
      logger.debug(`[BOOT][${tabId}] pending decision: ALLOW (LOCAL ACTOR + guard active)`, pendingDecision)
      addDebugLog('BOOT pending decision', { ...pendingDecision, decision: 'ALLOW', reason: 'LOCAL ACTOR + guard active' })
      updateBaseUserId(pending, 'boot-pending')
      clearPendingUserId()
      clearReloadGuard()
    } else {
      // ❌ DENY: PASSIVE タブ → pending を適用しない、mismatch 検出を邪魔しない
      logger.debug(`[BOOT][${tabId}] pending decision: DENY (PASSIVE tab) - clearing stale pending/guard`, pendingDecision)
      addDebugLog('BOOT pending decision', { ...pendingDecision, decision: 'DENY', reason: 'PASSIVE tab' })
      // 残骸をクリア（次回テスト汚染防止）
      clearPendingUserId()
      clearReloadGuard()
    }
  } else {
    // pending がない場合もログ出力（デバッグ用）
    if (guardAge !== null) {
      // guard だけ残っている場合はクリア
      logger.debug(`[BOOT][${tabId}] no pending but guard exists - clearing stale guard`, pendingDecision)
      addDebugLog('BOOT clearing stale guard', pendingDecision)
      clearReloadGuard()
    }
  }
}

// モジュール読み込み時に即実行（全ページ共通）
if (typeof window !== 'undefined') {
  applyPendingUserOnBoot()
}

// =====================================================
// 🚨 PASSIVE タブ判定（document.visibilityState ベース）
// =====================================================
function isPassiveTab(): boolean {
  if (typeof document === 'undefined') return false
  // hidden = 裏タブ（PASSIVE）, visible = 前面タブ（ACTIVE）
  return document.visibilityState === 'hidden'
}

// =====================================================
// Zustand Store
// =====================================================
interface AuthBanner {
  message: string
  newUserId: string
  at: number
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isInitialized: boolean
  isInitializing: boolean
  authReady: boolean
  // 🆕 ACTIVE タブ用バナー
  banner: AuthBanner | null
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  showAuthBanner: (newUserId: string, message: string) => void
  clearAuthBanner: () => void
  initialize: () => Promise<void>
  signOut: () => Promise<void>
}

let globalInitialized = false
let globalInitializing = false

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  isInitializing: false,
  authReady: false,
  banner: null,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),

  // 🆕 ACTIVE タブ用バナー表示
  showAuthBanner: (newUserId, message) => {
    logger.debug(`[BANNER][${tabId}] BANNER_SHOWN`, { newUserId: newUserId.slice(0, 8), message })
    addDebugLog('BANNER_SHOWN', { newUserId: newUserId.slice(0, 8), message, isPassive: false })
    set({ banner: { newUserId, message, at: Date.now() } })
  },

  clearAuthBanner: () => {
    logger.debug(`[BANNER][${tabId}] BANNER_CLEARED`)
    addDebugLog('BANNER_CLEARED', {})
    set({ banner: null })
  },

  initialize: async () => {
    const state = get()

    if (globalInitialized || globalInitializing || state.isInitialized || state.isInitializing) {
      logger.debug(`[AUTH_INIT][${tabId}] skipped`)
      return
    }

    try {
      globalInitializing = true
      set({ isLoading: true, isInitializing: true })

      logger.debug(`[AUTH_INIT][${tabId}] starting`)
      const user = await authService.getCurrentUser()

      // 初回ログイン時のみ baseUserId を設定（上書きしない）
      if (user?.id) {
        setBaseUserIdOnce(user.id)
      }

      globalInitialized = true
      set({ user, isInitialized: true, authReady: true })

      logger.debug(`[AUTH_INIT][${tabId}] ready`, { hasUser: !!user })

      // =====================================================
      // onAuthStateChange（送信専用）
      // 🚨 ここでは alert/reload を絶対にしない
      // =====================================================
      authService.onAuthStateChange((newUser) => {
        const newUserId = newUser?.id || null
        const baseUserId = getBaseUserId()
        const pathNow = getPathNow()
        const isAuth = isAuthPageNow()
        let actionFlag = hasAuthActionFlag()

        // 🆕 onAuthStateChange発火を即座にログ
        logger.debug(`[AUTH_SWITCH][${tabId}] onAuthStateChange FIRED`, {
          newUserId: newUserId?.slice(0, 8) || 'null',
          baseUserId: baseUserId?.slice(0, 8) || 'null',
          pathNow,
          isAuth,
          actionFlag
        })
        addDebugLog('AUTH_SWITCH fired', {
          new: newUserId?.slice(0, 8) || 'null',
          base: baseUserId?.slice(0, 8) || 'null',
          pathNow,
          isAuth,
          actionFlag
        })

        // 🚨 CRITICAL: 非authページで actionFlag が残っていたら stale として即クリア
        // これがないと Tab1(/mypage) が誤って base を更新してしまう
        if (actionFlag && !isAuth) {
          logger.debug(`[AUTH_SWITCH][${tabId}] clearing stale actionFlag (pathNow=${pathNow})`)
          clearAuthActionFlag()
          actionFlag = false
        }

        logger.debug(`[AUTH_SWITCH][${tabId}] onAuthStateChange`, {
          new: newUserId?.slice(0, 8) || 'none',
          base: baseUserId?.slice(0, 8) || 'none',
          pathNow,
          isAuth,
          actionFlag
        })

        // null → user（初回ログイン）
        if (!baseUserId && newUserId) {
          // 🚨 CRITICAL FIX: 操作タブ（auth page + actionFlag）のみ base を設定
          // passive tab では base 設定禁止（他タブのログインで誤って base が上書きされる問題を防止）
          if (isAuth && actionFlag) {
            logger.debug(`[AUTH_SWITCH][${tabId}] initial login (LOCAL - setting base)`)
            setBaseUserIdOnce(newUserId)
            set({ user: newUser })
            broadcastAuthChange(newUserId, 'initial')
            clearAuthActionFlag()
          } else {
            // 🚨 passive tab: base は設定しない、Zustand state のみ更新
            logger.debug(`[AUTH_SWITCH][${tabId}] initial login (PASSIVE - NOT setting base)`, {
              pathNow,
              isAuth,
              actionFlag,
              newUserId: newUserId.slice(0, 8)
            })
            addDebugLog('AUTH_SWITCH initial PASSIVE', { newUserId: newUserId.slice(0, 8), pathNow, isAuth, actionFlag })
            set({ user: newUser })
            // broadcast しない（無限ループ防止）
          }
          return
        }

        // user → null（ログアウト）
        if (baseUserId && !newUserId) {
          logger.debug(`[AUTH_SWITCH][${tabId}] logout`)
          clearBaseUserId()
          clearPendingUserId()
          set({ user: null })
          broadcastAuthChange(null, 'logout')
          return
        }

        // 同一ユーザー
        if (baseUserId === newUserId) {
          logger.debug(`[SKIP][${tabId}] SKIP_SAME_USER (onAuthStateChange: base === new)`)
          addDebugLog('SKIP_SAME_USER', {
            base: baseUserId?.slice(0, 8) || 'null',
            new: newUserId?.slice(0, 8) || 'null',
            pathNow,
            source: 'onAuthStateChange'
          })
          set({ user: newUser })
          return
        }

        // user → different user（ユーザー切替）
        if (baseUserId && newUserId && baseUserId !== newUserId) {
          logger.debug(`[AUTH_SWITCH][${tabId}] 🚨 USER SWITCH DETECTED`, {
            base: baseUserId.slice(0, 8),
            new: newUserId.slice(0, 8),
            pathNow,
            isAuth,
            actionFlag
          })
          addDebugLog('USER_SWITCH detected', {
            base: baseUserId.slice(0, 8),
            new: newUserId.slice(0, 8),
            pathNow,
            isAuth,
            actionFlag
          })

          // 🚨 (a) 操作タブ（auth page + auth_action=true）のみ base 更新
          if (isAuth && actionFlag) {
            logger.debug(`[AUTH_SWITCH][${tabId}] 🎯 LOCAL LOGIN (auth page + action flag) - calling broadcastAuthChange`)
            addDebugLog('LOCAL_LOGIN', { action: 'updating base and broadcasting' })
            updateBaseUserId(newUserId, 'auth-action')
            set({ user: newUser })
            broadcastAuthChange(newUserId, 'local-switch')
            clearAuthActionFlag()
            return
          }

          // 🚨 非操作タブ（受け身）で USER SWITCH を検出
          // base は絶対に触らない（これが核心）
          const isPassive = isPassiveTab()

          if (isPassive) {
            // 🚨 PASSIVE タブ: alert + reload
            logger.debug(`[AUTH_SWITCH][${tabId}] 📡 PASSIVE TAB - USER SWITCH detected, showing alert`)
            addDebugLog('PASSIVE_SWITCH mismatch', {
              base: baseUserId.slice(0, 8),
              new: newUserId.slice(0, 8),
              pathNow,
              isPassive: true,
              action: 'showing alert'
            })
            showAlertAndReload(newUserId)
          } else {
            // 🆕 ACTIVE タブ: バナー表示のみ
            logger.debug(`[AUTH_SWITCH][${tabId}] 🔔 ACTIVE TAB - USER SWITCH detected, showing banner`)
            addDebugLog('ACTIVE_SWITCH mismatch', {
              base: baseUserId.slice(0, 8),
              new: newUserId.slice(0, 8),
              pathNow,
              isPassive: false,
              action: 'showing banner'
            })
            get().showAuthBanner(newUserId, `別タブでログインがありました。更新しますか？`)
          }
        }
      })

      logger.debug(`[AUTH_INIT][${tabId}] onAuthStateChange listener setup complete`)
    } catch (error) {
      logger.error(`[AUTH_INIT][${tabId}]`, error)
      globalInitialized = true
      set({ user: null, isInitialized: true, authReady: true })
    } finally {
      globalInitializing = false
      set({ isLoading: false, isInitializing: false })
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true })
      const currentUser = get().user
      logger.debug(`[AUTH][${tabId}] signOut`)
      clearAllUserStorage(currentUser?.id)
      clearBaseUserId()
      clearPendingUserId()
      clearReloadGuard()
      clearAuthActionFlag()
      await authService.signOut()
      set({ user: null })
    } catch (error) {
      logger.error(`[AUTH][${tabId}] signOut`, error)
    } finally {
      set({ isLoading: false })
    }
  },
}))

export const useAuth = () => {
  const { user, isLoading, isInitialized, authReady, signOut } = useAuthStore()
  return {
    user,
    isLoading,
    isInitialized,
    authReady,
    isAuthenticated: !!user,
    logout: signOut,
  }
}
