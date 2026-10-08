'use client'

import { useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NotificationCounts {
  unreadMessages: number
  unseenLikes: number
  unreadFootprints: number
  unreadNotifications: number
}

const POLL_INTERVAL_MS = 5000

const INITIAL_COUNTS: NotificationCounts = {
  unreadMessages: 0,
  unseenLikes: 0,
  unreadFootprints: 0,
  unreadNotifications: 0,
}

// ===== 共有ストア =====
// フックを何か所で呼んでも（BottomNav / Sidebar / mypage など）、タイマーは 1 つ・問い合わせは 1 回にする。
// 最初の購読で開始し、最後の購読解除で停止する。画面が裏（hidden）の間はタイマーを止める。

interface NotificationState {
  counts: NotificationCounts
  userId: string | null
}

const SERVER_STATE: NotificationState = { counts: INITIAL_COUNTS, userId: null }

let state: NotificationState = SERVER_STATE
const listeners = new Set<() => void>()
let subscriberCount = 0
let isActive = false
let activationId = 0      // start/stop の競合判定用
let fetchGeneration = 0   // ユーザー変更・停止で古い問い合わせ結果を捨てる用
let intervalId: ReturnType<typeof setInterval> | null = null
let isFetching = false
let hasPendingFetch = false
let immediateFetchTimer: ReturnType<typeof setTimeout> | null = null
let authSubscription: { unsubscribe: () => void } | null = null
let supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!supabaseClient) supabaseClient = createClient()
  return supabaseClient
}

function setState(next: NotificationState) {
  state = next
  listeners.forEach(listener => listener())
}

function isPageVisible() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden'
}

// 件数の取得（数え方は従来どおり）
async function fetchCounts(uid: string): Promise<NotificationCounts | null> {
  const supabase = getSupabase()
  try {
    // 1. 未読メッセージ数 + 未確認マッチ数（サーバーAPIで取得）
    let unreadMessages = 0
    try {
      const res = await fetch('/api/messages/unread-count', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        unreadMessages = (data.count || 0) + (data.newMatches || 0)
      }
    } catch {
      // フォールバック：直接クエリ
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, user1_id, user2_id')
      const myConvIds = (convs || [])
        .filter(c => c.user1_id === uid || c.user2_id === uid)
        .map(c => c.id)
      if (myConvIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', myConvIds)
          .neq('sender_id', uid)
          .eq('is_read', false)
        unreadMessages = count || 0
      }
    }

    // 2. 未確認いいね数
    const { count: likesCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('liked_user_id', uid)
      .eq('is_seen', false)

    // 3. 未読足跡数（ユニーク訪問者数）
    const { data: footprintsData } = await supabase
      .from('footprints')
      .select('visitor_id')
      .eq('profile_owner_id', uid)
      .eq('is_read', false)

    const uniqueFootprintsCount = new Set(footprintsData?.map(f => f.visitor_id)).size

    // 4. 未読通知数（warning/suspended/system 等）
    const { count: notifCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('is_read', false)

    return {
      unreadMessages,
      unseenLikes: likesCount || 0,
      unreadFootprints: uniqueFootprintsCount,
      unreadNotifications: notifCount || 0,
    }
  } catch (err) {
    console.error('Notification count fetch error:', err)
    return null
  }
}

// 共有の問い合わせを 1 回行い、全呼び出し元に反映（実行中なら終了後に 1 回だけ追加で行う）
async function runFetch(): Promise<void> {
  const uid = state.userId
  if (!isActive || !uid) return
  if (isFetching) {
    hasPendingFetch = true
    return
  }
  isFetching = true
  const generation = fetchGeneration
  try {
    const counts = await fetchCounts(uid)
    // 途中でユーザー変更・停止があった場合は結果を捨てる
    if (counts && generation === fetchGeneration && state.userId === uid) {
      setState({ ...state, counts })
    }
  } finally {
    isFetching = false
    if (hasPendingFetch) {
      hasPendingFetch = false
      runFetch()
    }
  }
}

// 同じタイミングの複数の要求（画面遷移で複数コンポーネントが同時にマウント等）を 1 回にまとめる
function scheduleImmediateFetch() {
  if (immediateFetchTimer) return
  immediateFetchTimer = setTimeout(() => {
    immediateFetchTimer = null
    runFetch()
  }, 0)
}

function startTimer() {
  if (intervalId || !state.userId || !isPageVisible()) return
  intervalId = setInterval(() => { runFetch() }, POLL_INTERVAL_MS)
}

function stopTimer() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

// 裏タブでは止め、前面に戻ったら即時に 1 回取ってタイマーを再開
function handleVisibilityChange() {
  if (!isActive) return
  if (document.visibilityState === 'hidden') {
    stopTimer()
  } else {
    scheduleImmediateFetch()
    startTimer()
  }
}

// ログインユーザーが変わったら共有の結果をリセット（変わった場合 true）
function applyUser(uid: string | null): boolean {
  if (uid === state.userId) return false
  fetchGeneration++
  setState({ counts: INITIAL_COUNTS, userId: uid })
  return true
}

async function start() {
  isActive = true
  const myActivation = ++activationId
  const supabase = getSupabase()

  // ログアウト・別アカウントへの切り替えを検知
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (!isActive || event === 'INITIAL_SESSION') return
    const uid = session?.user?.id ?? null
    if (event === 'SIGNED_OUT' || !uid) {
      stopTimer()
      applyUser(null)
      return
    }
    if (applyUser(uid)) {
      scheduleImmediateFetch()
      startTimer()
    }
  })
  authSubscription = subscription
  document.addEventListener('visibilitychange', handleVisibilityChange)

  const { data: { user } } = await supabase.auth.getUser()
  if (!isActive || myActivation !== activationId) return
  applyUser(user?.id ?? null)
  if (!user) return

  // 初回フェッチ（裏タブで開始した場合は前面に戻ったときに取得）
  if (isPageVisible()) {
    scheduleImmediateFetch()
    startTimer()
  }
}

function stop() {
  isActive = false
  activationId++
  fetchGeneration++
  stopTimer()
  if (immediateFetchTimer) {
    clearTimeout(immediateFetchTimer)
    immediateFetchTimer = null
  }
  authSubscription?.unsubscribe()
  authSubscription = null
  document.removeEventListener('visibilitychange', handleVisibilityChange)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  subscriberCount++
  if (subscriberCount === 1) {
    start()
  } else if (isActive && state.userId && isPageVisible()) {
    // 新しい呼び出し元が加わったとき（画面遷移など）は従来どおり即時に取り直す（同時の要求は 1 回にまとめる）
    scheduleImmediateFetch()
  }
  return () => {
    listeners.delete(listener)
    subscriberCount--
    if (subscriberCount === 0) stop()
  }
}

function getSnapshot() {
  return state
}

function getServerSnapshot() {
  return SERVER_STATE
}

function refetchShared() {
  return runFetch()
}

export function useNotifications() {
  const { counts, userId } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return { ...counts, userId, refetch: () => userId && refetchShared() }
}
