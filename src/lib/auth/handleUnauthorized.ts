import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/utils/logger'

// #60 追加（B1）：API が 401 を返したときに画面から呼ぶ
// ブラウザのセッションを Supabase に確かめ、認められなければ（消えた・取り消された・cookie が無い）
// この端末だけログアウトしてログイン画面へ移す。
// 戻り値：true = ログイン画面へ移す処理を始めた（呼び出し元はエラー表示をしない）
//         false = セッションは有効、または通信エラーで確かめられなかった（今までどおりのエラー表示）

// ログイン画面へ移すのは 1 回だけ（同時に複数の 401 が来てもループしない）
let isRedirectingToLogin = false

export async function handleUnauthorized(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (isRedirectingToLogin) return true
  // すでにログイン画面なら何もしない
  if (window.location.pathname.startsWith('/login')) return false

  const supabase = createClient()
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    // セッションは有効（401 の理由は別）→ 今までどおりのエラー表示
    if (user && !error) return false
    // 通信エラーなどで確かめられない → ログイン画面には移さない
    if (error && isAuthRetryableFetchError(error)) return false
  } catch (error) {
    logger.warn('[AUTH] handleUnauthorized: getUser failed:', error instanceof Error ? error.message : 'unknown')
    return false
  }

  isRedirectingToLogin = true
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // ログアウトに失敗しても、ログイン画面へは移す
  }
  window.location.replace('/login')
  return true
}
