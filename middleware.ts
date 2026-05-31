import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .maybeSingle()

    const status = profile?.status

    // 1) 管理者による停止 → / (top page)
    //    指示書 #33: 「停止 = ログイン不可」モデルへの転換。
    //    停止ユーザーは行き先を意識させず、自然に未認証 LP に戻す。
    //    新規ログインは Supabase 側で ban_duration により拒否される(指示書 #30)
    if (status === 'suspended') {
      // 既に top page にいる場合は redirect しない(無限ループ防止)
      // C 案: deleted_pending / deleted_permanent の /account-deleted 誘導は維持しつつ、
      // suspended の / リダイレクトだけをループから守る最小スキップ
      if (pathname === '/') return supabaseResponse
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
