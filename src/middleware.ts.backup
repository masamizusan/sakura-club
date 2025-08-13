import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n'

// 国際化ミドルウェアの作成（localePrefix: 'never'でURLパスに言語プレフィックスを追加しない）
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'never'
})

export async function middleware(request: NextRequest) {
  // 静的ファイル、API、特殊パスは処理をスキップ
  if (request.nextUrl.pathname.startsWith('/_next') || 
      request.nextUrl.pathname.startsWith('/api') ||
      request.nextUrl.pathname.includes('.') ||
      request.nextUrl.pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  // ルートパス（/）への直接アクセスを許可
  if (request.nextUrl.pathname === '/') {
    return intlMiddleware(request)
  }

  // その他のパスも国際化処理を適用
  return intlMiddleware(request)
}


export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     * - manifest.json (PWA manifest)
     * - icons directory
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}