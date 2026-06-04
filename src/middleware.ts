import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
// 指示書 #33 案 D: middleware は anon キー + cookie session で
// 自分の status を読む方式に変更。service_role の別クライアントは不要。
// 旧 import: import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log('[middleware] enter:', pathname) // [#33-DIAG]

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

  // IMPORTANT: Do not write any logic between createServerClient and
  // supabase.auth.getUser(). This refreshes the session if expired.
  const { data: { user } } = await supabase.auth.getUser()

  console.log('[middleware] user:', user?.id?.slice(0, 8) ?? 'null') // [#33-DIAG]

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

  console.log('[middleware] isExcluded:', isExcluded) // [#33-DIAG]

  if (user && !isExcluded) {
    // 指示書 #33 案 D: service_role 別クライアントを廃止し、
    // 既存の anon キー + cookie session で「自分の status」を読む。
    // profiles SELECT RLS の `id = auth.uid()` 条件で自分の行は
    // 全状態(active/suspended/deleted_pending/deleted_permanent/
    // profile_initialized=false) で読める。
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()

    // memory #18 是正: SELECT エラーをサイレント無視しない
    if (profileError) {
      console.error('[middleware] profile select error:', profileError.message)
    }

    const status = profile?.status

    console.log('[middleware] status:', status ?? 'undefined', 'profileError:', profileError?.message ?? 'none') // [#33-DIAG]

    // 1) 管理者による停止 → / (top page)
    //    指示書 #33: 「停止 = ログイン不可」モデルへの転換。
    //    停止ユーザーは行き先を意識させず、自然に未認証 LP に戻す。
    //    新規ログインは Supabase 側で ban_duration により拒否される(指示書 #30)
    if (status === 'suspended') {
      // 既に top page にいる場合は redirect しない(無限ループ防止)
      // C 案: deleted_pending / deleted_permanent の /account-deleted 誘導は維持しつつ、
      // suspended の / リダイレクトだけをループから守る最小スキップ
      if (pathname === '/') {
        console.log('[middleware] suspended on /, skip redirect (loop防止)') // [#33-DIAG]
        return supabaseResponse
      }
      console.log('[middleware] suspended → redirect to /') // [#33-DIAG]
      const topUrl = request.nextUrl.clone()
      topUrl.pathname = '/'
      return NextResponse.redirect(topUrl)
    }

    // 2) ユーザー自身の退会 → /account-deleted
    if (status === 'deleted_pending' || status === 'deleted_permanent') {
      console.log('[middleware] deleted → redirect to /account-deleted') // [#33-DIAG]
      const deletedUrl = request.nextUrl.clone()
      deletedUrl.pathname = '/account-deleted'
      return NextResponse.redirect(deletedUrl)
    }
  }

  console.log('[middleware] passthrough (no redirect)') // [#33-DIAG]
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
