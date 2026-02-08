import { createBrowserClient } from '@supabase/ssr'

/**
 * ブラウザ用Supabaseクライアント（SSR対応・cookie同期）
 *
 * @supabase/ssr の createBrowserClient を使用することで、
 * セッションが自動的にcookieに同期され、サーバー側（API Routes）でも
 * 同じセッションを読み取れるようになる。
 *
 * 重要：このクライアントを auth 操作（signIn, signUp, signOut）に使用すること
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 後方互換性のため、createBrowserClient も直接エクスポート
export { createBrowserClient }
