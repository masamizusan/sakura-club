import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isAuthRetryableFetchError, isAuthSessionMissingError } from '@supabase/supabase-js'

// #60: サーバーがセッションを認めないときのエラーコード（取り消された・存在しない・トークンが不正）
// 通信エラー・一時的な失敗（AuthRetryableFetchError・5xx）は含めない（ログイン画面に移さない）
// user_banned（停止）は含めない：停止ユーザーは従来どおり（#33 の扱い）に任せる
const REJECTED_SESSION_CODES = new Set([
  'session_not_found',
  'session_expired',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'user_not_found',
  'bad_jwt',
])

// #60: 片付けの対象外（公開ページ）。ここではログイン画面に移さない
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/signup',
  '/register',
  '/reset-password',
  '/verify-email',
  '/auth',
  '/account-deleted',
  '/leave-completed',
  '/about',
  '/terms',
  '/privacy',
  '/tokushoho',
]

// Supabase の認証 cookie（sb-<プロジェクト>-auth-token、分割された .0 .1 や code-verifier も含む）
const AUTH_COOKIE_PATTERN = /^sb-.+-auth-token/

// hadAuthCookie：getUser() を呼ぶ前に、値の入った認証の cookie があったか
function isRejectedSessionError(error: unknown, hadAuthCookie: boolean): boolean {
  if (!error || typeof error !== 'object') return false
  if (isAuthRetryableFetchError(error)) return false
  // #60 追加：サーバーの session_not_found（403）は、ライブラリが AuthSessionMissingError（400・code なし）に
  // 作り替えて返す。cookie が無い人も同じエラーになるため、「cookie があったのに」の場合だけ「認めない」とする
  if (isAuthSessionMissingError(error)) return hadAuthCookie
  const e = error as { name?: unknown; code?: unknown; status?: unknown }
  if (typeof e.code === 'string' && REJECTED_SESSION_CODES.has(e.code)) return true
  // code が無い古い形式：401・403 のときだけ（5xx・0 は一時的な失敗として扱わない）
  return !e.code && (e.status === 401 || e.status === 403) && e.name === 'AuthApiError'
}
// 指示書 #33 案 D: middleware は anon キー + cookie session で
// 自分の status を読む方式に変更。service_role の別クライアントは不要。

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // #60 追加：getUser() の前に、値の入った認証の cookie を記録しておく
  // （getUser() がセッションを消すと、request の cookie の値が空になるため）
  const authCookiesBefore = request.cookies.getAll().filter(c => AUTH_COOKIE_PATTERN.test(c.name))
  const hadAuthCookie = authCookiesBefore.some(c => c.value !== '')

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // #11: API（/api/*）では getUser（認証サーバーへの通信）をしない。
  // ログインの確認・停止中の確認は各 API の中（getUser・requireActiveProfile）と RLS が行っており、
  // ここでは /api/ に対して停止中の確認も last_seen_at の更新もしていなかったため、二重の確認だけを外す。
  // ただしトークンの期限切れの更新は続ける：getSession は cookie を読むだけで、期限切れのときだけ更新して
  // 新しい cookie を API への request と応答の両方に書く（API 側の Supabase クライアントは cookie を書き戻せないため。
  // API 側で更新すると、ブラウザに古い refresh token が残り、使い回しと判定されてログアウトされるおそれがある）
  if (pathname.startsWith('/api/')) {
    await supabase.auth.getSession()
    return supabaseResponse
  }

  // IMPORTANT: Do not write any logic between createServerClient and
  // supabase.auth.getUser(). This refreshes the session if expired.
  const { data: { user }, error: getUserError } = await supabase.auth.getUser()

  // #60: ブラウザに認証の cookie があるのに、サーバーがそのセッションを認めない
  // （別の端末でのログアウト・取り消しなど）→ cookie を消してログイン画面へ。
  // こうしないと、画面は「ログイン中」のまま API だけが 401 を返し続ける
  // cookie が無い人（ログインしていない人）・公開ページ・一時的な失敗は今までどおり
  const authCookies = authCookiesBefore
  const isPublicPath = pathname === '/' || PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))
  if (!user && hadAuthCookie && !isPublicPath && isRejectedSessionError(getUserError, hadAuthCookie)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    const response = NextResponse.redirect(loginUrl)
    authCookies.forEach(c => response.cookies.set(c.name, '', { path: '/', maxAge: 0 }))
    return response
  }

  // 停止/退会ユーザーチェック（/account-deleted, /leave-completed,
  // /login, /signup, /api/, /register は除外）
  // 指示書 #33: /suspended ページを廃止し top page (/) へ統一したため、
  // isExcluded から /suspended を除外。/ への redirect は matcher で
  // 自動処理される(top page は middleware ループしない)
  const isExcluded =
    pathname.startsWith('/account-deleted') ||
    pathname.startsWith('/leave-completed') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/register')

  if (user && !isExcluded) {
    // 指示書 #33 案 D: service_role 別クライアントを廃止し、
    // 既存の anon キー + cookie session で「自分の status」を読む。
    // profiles SELECT RLS の `id = auth.uid()` 条件で自分の行は
    // 全状態(active/suspended/deleted_pending/deleted_permanent/
    // profile_initialized=false) で読める。
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('status, last_seen_at')
      .eq('id', user.id)
      .maybeSingle()

    // memory #18 是正: SELECT エラーをサイレント無視しない
    if (profileError) {
      console.error('[middleware] profile select error:', profileError.message)
    }

    const status = profile?.status

    // 1) 管理者による停止 → / (top page)
    //    指示書 #33: 「停止 = ログイン不可」モデルへの転換。
    //    停止ユーザーは行き先を意識させず、自然に未認証 LP に戻す。
    //    新規ログインは Supabase 側で ban_duration により拒否される(指示書 #30)
    if (status === 'suspended') {
      // 既に top page にいる場合は redirect しない(無限ループ防止)
      // C 案: deleted_pending / deleted_permanent の /account-deleted 誘導は維持しつつ、
      // suspended の / リダイレクトだけをループから守る最小スキップ
      if (pathname === '/') {
        return supabaseResponse
      }
      const topUrl = request.nextUrl.clone()
      topUrl.pathname = '/'
      return NextResponse.redirect(topUrl)
    }

    // 2) ユーザー自身の退会 → /account-deleted
    if (status === 'deleted_pending' || status === 'deleted_permanent') {
      const deletedUrl = request.nextUrl.clone()
      deletedUrl.pathname = '/account-deleted'
      return NextResponse.redirect(deletedUrl)
    }

    // 3) ⑫ last_seen_at の間引き更新 (15 分以上経過時のみ)
    //    - suspended / deleted_* は上で return 済のため、ここに到達するのは active のみ
    //    - isExcluded パス(/login, /api/ 等)はこの if ブロックの外なので走らない
    //    - void で fire-and-forget: middleware のレスポンスを遅延させない
    //    - エラーは console.error でログ（memory #18 サイレント失敗禁止）
    const LAST_SEEN_INTERVAL_MS = 15 * 60 * 1000
    const lastSeenAt = profile?.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0
    if (Date.now() - lastSeenAt > LAST_SEEN_INTERVAL_MS) {
      void supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(({ error: updateError }) => {
          if (updateError) {
            console.error('[middleware] last_seen_at update error:', updateError.message)
          }
        })
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
