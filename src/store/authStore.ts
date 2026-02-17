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
    console.warn(`[PATH_NOW][${tabId}] from=sessionStorage value=${sessionPath}`)
    return sessionPath
  }

  // 2. DOM dataset（バックアップ）
  const domPath = document.body?.dataset?.page
  if (domPath) {
    console.warn(`[PATH_NOW][${tabId}] from=dataset value=${domPath}`)
    return domPath
  }

  // 3. window.location.pathname（最後の保険 - 信頼性低）
  const locPath = window.location.pathname || ''
  console.warn(`[PATH_NOW][${tabId}] from=location value=${locPath} ⚠️ FALLBACK`)
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
    console.warn(`[BASE_USER][${tabId}] already set, skip`)
    return
  }
  sessionStorage.setItem(BASE_USER_KEY, userId)
  console.warn(`[BASE_USER][${tabId}] set (once): ${userId.slice(0, 8)}`)
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
  console.warn(`[BASE_USER][${tabId}] UPDATED`, {
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
  console.warn(`[BASE_USER][${tabId}] cleared`)
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
  console.warn(`[PENDING][${tabId}] set: ${userId.slice(0, 8)}`)
}

function clearPendingUserId() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PENDING_USER_KEY)
  console.warn(`[PENDING][${tabId}] cleared`)
}

// =====================================================
// 5️⃣ リロードガード（__reload_guard__）
// timestamp方式：未設定 or 期限切れなら実行、生きていればスキップ
// =====================================================
const RELOAD_GUARD_KEY = '__reload_guard__'
const RELOAD_GUARD_MS = 8000

function getGuardAge(): number | null {
  if (typeof window === 'undefined') return null
  const guardTime = sessionStorage.getItem(RELOAD_GUARD_KEY)
  if (!guardTime) return null
  return Date.now() - parseInt(guardTime, 10)
}

function setReloadGuard(source: string) {
  if (typeof window === 'undefined') return
  const ts = Date.now()
  const pathNow = getPathNow()
  sessionStorage.setItem(RELOAD_GUARD_KEY, ts.toString())
  // 🚨 CRITICAL: guardを誰がいつセットしたか追跡
  console.warn(`[GUARD][${tabId}] SET`, {
    ts,
    source,
    pathNow,
    expiresIn: `${RELOAD_GUARD_MS}ms`
  })
}

function isReloadGuardActive(): boolean {
  const age = getGuardAge()
  if (age === null) return false
  return age < RELOAD_GUARD_MS
}

function clearReloadGuard() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(RELOAD_GUARD_KEY)
  console.warn(`[GUARD][${tabId}] cleared`)
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
  console.warn(`[AUTH_ACTION][${tabId}] flag set`)
}

function clearAuthActionFlag() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(AUTH_ACTION_KEY)
  console.warn(`[AUTH_ACTION][${tabId}] flag cleared`)
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
// 🚨 showAlertAndReload - 順序固定（超重要）
// guard → pending → alert → reload
// =====================================================
function showAlertAndReload(incomingUserId: string) {
  // 1. guard を先にセット（8秒）
  setReloadGuard('mismatch-alert')

  // 2. pending をセット
  setPendingUserId(incomingUserId)

  // 3. alert（同期）
  window.alert('別タブでログインが行われました。再読み込みします。')

  // 4. alert が閉じられた後に reload
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
    console.warn(`[CROSS_TAB][${tabId}] stale auth_action on non-auth page - clearing and continue (pathNow=${pathNow})`)
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
  console.warn(`[CROSS_TAB][${tabId}] received`, receivedData)
  addDebugLog('CROSS_TAB received', receivedData)

  // 🆕 追加: ROUTE ログ（誤判定検知用）
  console.warn(`[ROUTE][${tabId}] pathNow=${pathNow} isAuthPageNow=${isAuth}`)

  // === 判定ロジック（唯一これだけ） ===

  // 1) 自タブ送信は無視
  if (fromTab === tabId) {
    console.warn(`[CROSS_TAB][${tabId}] ignored: same tab (pathNow=${pathNow})`)
    return
  }

  // 2) 🚨 CRITICAL: 操作タブ（auth page + auth_action 両方）のみ無視
  // auth page だけでは無視しない（Tab1が誤って/login扱いされる問題を防ぐ）
  if (isAuth && actionFlag) {
    console.warn(`[CROSS_TAB][${tabId}] ignored: auth page (local action) (pathNow=${pathNow})`)
    return
  }

  // 3) baseがなければ無視（初期化前）
  if (!base) {
    console.warn(`[CROSS_TAB][${tabId}] ignored: no base (pathNow=${pathNow})`)
    return
  }

  // 4) guardが生きていればスキップ（初回は潰さない）
  const guardTs = sessionStorage.getItem(RELOAD_GUARD_KEY)
  if (guardAge !== null && guardAge < RELOAD_GUARD_MS) {
    console.warn(`[GUARD][${tabId}] skip`, {
      guardActive: true,
      guardAge: `${guardAge}ms`,
      guardTs,
      remaining: `${RELOAD_GUARD_MS - guardAge}ms`,
      pathNow,
      incoming: incomingUserId?.slice(0, 8) || 'null',
      base: base?.slice(0, 8) || 'null'
    })
    return
  }

  // 5) 🚨 核心判定: incoming !== base なら mismatch
  if (incomingUserId && incomingUserId !== base) {
    const mismatchData = {
      incoming: incomingUserId.slice(0, 8),
      base: base.slice(0, 8),
      pathNow
    }
    console.error(`[CROSS_TAB][${tabId}] ACTION: mismatch -> pending set -> alert+reload`, mismatchData)
    addDebugLog('ACTION mismatch', mismatchData)
    addDebugLog('ALERT showing', { message: '別タブでログインが行われました' })

    showAlertAndReload(incomingUserId)
    return
  }

  // 🚨 CRITICAL: 詳細ログで原因を特定（same user or null の中身を見える化）
  const ignoredData = {
    incoming: incomingUserId?.slice(0, 8) || 'NULL/UNDEFINED',
    incomingRaw: incomingUserId,
    incomingType: typeof incomingUserId,
    base: base?.slice(0, 8) || 'NULL/UNDEFINED',
    baseRaw: base,
    baseType: typeof base,
    isSameUser: incomingUserId === base,
    isIncomingNull: incomingUserId === null || incomingUserId === undefined,
    pathNow,
    isAuth,
    actionFlag,
    guardAge: guardAge !== null ? `${guardAge}ms` : 'null',
    pending: pending?.slice(0, 8) || 'null',
    fromTab: fromTab?.slice(0, 6) || 'null'
  }
  console.warn(`[CROSS_TAB][${tabId}] ignored: same user or null`, ignoredData)
  addDebugLog('ignored: same user or null', ignoredData)
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
      console.warn(`[BC_RECEIVE][${tabId}] raw event:`, event.data)
      addDebugLog('BC raw receive', { data: event.data })

      const payload = event.data || {}
      if (payload.userId !== undefined) {
        console.warn(`[BC_RECEIVE][${tabId}] calling handleIncomingAuthSwitch`)
        handleIncomingAuthSwitch(payload)
      } else {
        console.warn(`[BC_RECEIVE][${tabId}] SKIP: payload.userId is undefined`)
      }
    }
    authChannel.onmessageerror = (event) => {
      console.error(`[BC_ERROR][${tabId}] message error:`, event)
      addDebugLog('BC error', { event: 'messageerror' })
    }
    console.warn(`[AUTH_LISTENER][${tabId}] BroadcastChannel READY (channel=${AUTH_CHANNEL_NAME})`)
    addDebugLog('LISTENER ready', { type: 'BroadcastChannel', channel: AUTH_CHANNEL_NAME })
  } catch (e) {
    console.warn(`[AUTH_LISTENER][${tabId}] BroadcastChannel not supported:`, e)
    addDebugLog('LISTENER error', { type: 'BroadcastChannel', error: String(e) })
    authChannel = null
  }

  // 🆕 localStorage storage event listener
  window.addEventListener('storage', (event) => {
    // 全てのstorage eventをログ（デバッグ用）
    if (event.key === CROSS_TAB_AUTH_KEY) {
      console.warn(`[LS_RECEIVE][${tabId}] storage event: key=${event.key} newValue=${event.newValue?.slice(0, 50)}...`)
      addDebugLog('LS raw receive', { key: event.key, hasNewValue: !!event.newValue })
    }

    if (event.key !== CROSS_TAB_AUTH_KEY || !event.newValue) return

    try {
      const payload = JSON.parse(event.newValue)
      console.warn(`[LS_RECEIVE][${tabId}] calling handleIncomingAuthSwitch`)
      handleIncomingAuthSwitch(payload)
    } catch (e) {
      console.warn(`[LS_RECEIVE][${tabId}] parse error:`, e)
      addDebugLog('LS parse error', { error: String(e) })
    }
  })
  console.warn(`[AUTH_LISTENER][${tabId}] storage READY`)
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
  console.warn(`[BROADCAST][${tabId}][send] userId=${userId?.slice(0, 8) || 'null'} source=${source}`)
  addDebugLog('BROADCAST send', sendData)

  // 🆕 BroadcastChannel送信
  let bcSent = false
  if (authChannel) {
    try {
      authChannel.postMessage(payload)
      bcSent = true
      console.warn(`[BROADCAST][${tabId}] BroadcastChannel postMessage SUCCESS`)
    } catch (e) {
      console.warn(`[BROADCAST][${tabId}] BroadcastChannel postMessage FAILED:`, e)
    }
  } else {
    console.warn(`[BROADCAST][${tabId}] BroadcastChannel is NULL`)
  }

  // 🆕 localStorage送信（BroadcastChannelのバックアップ）
  let lsSent = false
  try {
    // 🚨 CRITICAL: localStorage storage eventは値が変わった時のみ発火
    // 同じ値を書き込むとイベントが発火しないため、必ず違う値にする
    localStorage.setItem(CROSS_TAB_AUTH_KEY, JSON.stringify(payload))
    lsSent = true
    console.warn(`[BROADCAST][${tabId}] localStorage setItem SUCCESS`)
  } catch (e) {
    console.warn(`[BROADCAST][${tabId}] localStorage setItem FAILED:`, e)
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
    console.warn(`[BOOT][${tabId}] PATH_NOW_KEY set from location: ${locationPath}`)
  }

  const pathNow = getPathNow()
  const isAuth = isAuthPageNow()
  const base = getBaseUserId()
  const pending = getPendingUserId()
  const guardAge = getGuardAge()
  const actionFlag = hasAuthActionFlag()

  // bootログ（必須）
  const bootData = {
    path: pathNow,
    authPage: isAuth,
    base: base?.slice(0, 8) || 'null',
    pending: pending?.slice(0, 8) || 'null',
    guard: guardAge !== null ? `${guardAge}ms` : 'null',
    actionFlag
  }
  console.warn(`[BOOT][${tabId}] path=${pathNow} authPage=${isAuth} base=${base?.slice(0, 8) || 'null'} pending=${pending?.slice(0, 8) || 'null'} guard=${guardAge !== null ? `${guardAge}ms` : 'null'} actionFlag=${actionFlag}`)
  addDebugLog('BOOT', bootData)

  // 🚨 CRITICAL: 非authページで auth_action が残っていたら stale として即クリア
  if (actionFlag && !isAuth) {
    console.warn(`[BOOT][${tabId}] clearing stale auth_action on non-auth page: path=${pathNow}`)
    clearAuthActionFlag()
  }

  // 🚨 CRITICAL: pending があり、かつ guard が生きている場合のみ base を更新
  // guardが生きている = alertが表示されてreloadが発生した証拠
  // guardがない状態でpendingだけあるのは異常（alertなしでpendingが設定された）
  if (pending) {
    if (guardAge !== null && guardAge < RELOAD_GUARD_MS) {
      // ✅ 正常ケース: alert後のreload
      updateBaseUserId(pending, 'boot-pending')
      clearPendingUserId()
      console.warn(`[BOOT][${tabId}] applied pending -> base updated: ${pending.slice(0, 8)} (guard active: ${guardAge}ms)`)
      addDebugLog('BOOT applied pending', { pending: pending.slice(0, 8), guardAge: `${guardAge}ms` })
    } else {
      // ❌ 異常ケース: alertなしでpendingがある → pendingをクリアしてbase更新しない
      console.warn(`[BOOT][${tabId}] pending found but NO guard - clearing stale pending (pending=${pending.slice(0, 8)} guardAge=${guardAge})`)
      addDebugLog('BOOT stale pending cleared', { pending: pending.slice(0, 8), guardAge })
      clearPendingUserId()
    }
  }
}

// モジュール読み込み時に即実行（全ページ共通）
if (typeof window !== 'undefined') {
  applyPendingUserOnBoot()
}

// =====================================================
// Zustand Store
// =====================================================
interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isInitialized: boolean
  isInitializing: boolean
  authReady: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
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

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),

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
        console.warn(`[AUTH_SWITCH][${tabId}] onAuthStateChange FIRED`, {
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
          console.warn(`[AUTH_SWITCH][${tabId}] clearing stale actionFlag (pathNow=${pathNow})`)
          clearAuthActionFlag()
          actionFlag = false
        }

        console.warn(`[AUTH_SWITCH][${tabId}] onAuthStateChange`, {
          new: newUserId?.slice(0, 8) || 'none',
          base: baseUserId?.slice(0, 8) || 'none',
          pathNow,
          isAuth,
          actionFlag
        })

        // null → user（初回ログイン）
        if (!baseUserId && newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] initial login`)
          setBaseUserIdOnce(newUserId)
          set({ user: newUser })
          broadcastAuthChange(newUserId, 'initial')
          clearAuthActionFlag()
          return
        }

        // user → null（ログアウト）
        if (baseUserId && !newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] logout`)
          clearBaseUserId()
          clearPendingUserId()
          set({ user: null })
          broadcastAuthChange(null, 'logout')
          return
        }

        // 同一ユーザー
        if (baseUserId === newUserId) {
          set({ user: newUser })
          return
        }

        // user → different user（ユーザー切替）
        if (baseUserId && newUserId && baseUserId !== newUserId) {
          console.warn(`[AUTH_SWITCH][${tabId}] 🚨 USER SWITCH DETECTED`, {
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
            console.warn(`[AUTH_SWITCH][${tabId}] 🎯 LOCAL LOGIN (auth page + action flag) - calling broadcastAuthChange`)
            addDebugLog('LOCAL_LOGIN', { action: 'updating base and broadcasting' })
            updateBaseUserId(newUserId, 'auth-action')
            set({ user: newUser })
            broadcastAuthChange(newUserId, 'local-switch')
            clearAuthActionFlag()
            return
          }

          // 🚨 非操作タブ（受け身）
          // base は絶対に触らない（これが核心）
          // Zustand state のみ更新（表示用）
          // broadcast 送信のみ（alert/reload は受信ハンドラに任せる）
          console.warn(`[AUTH_SWITCH][${tabId}] 📡 PASSIVE TAB - calling broadcastAuthChange`)
          addDebugLog('PASSIVE_SWITCH', { action: 'broadcasting only, no base update' })
          set({ user: newUser })
          broadcastAuthChange(newUserId, 'passive-switch')
          console.warn(`[AUTH_SWITCH][${tabId}] passive tab - broadcast completed`)
        }
      })

      console.warn(`[AUTH_INIT][${tabId}] onAuthStateChange listener setup complete`)
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
