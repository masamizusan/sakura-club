import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * ブラウザ用Supabaseクライアント（SSR対応・cookie同期・シングルトン）
 *
 * @supabase/ssr の createBrowserClient を使用することで、
 * セッションが自動的にcookieに同期され、サーバー側（API Routes）でも
 * 同じセッションを読み取れるようになる。
 *
 * シングルトン化により "Multiple GoTrueClient instances" 警告を防止。
 */

let browserClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  // シングルトン: 既存インスタンスがあれば再利用
  if (browserClient) {
    return browserClient
  }

  // 新規作成
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return browserClient
}

// 後方互換性のため、createBrowserClient も直接エクスポート
export { createBrowserClient }
