import type { Metadata } from 'next'
import { Inter, Noto_Sans_JP, Noto_Serif_JP, Cormorant_Garamond } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import SimpleHeader from '@/components/layout/SimpleHeader'
import AuthProvider from '@/components/auth/AuthProvider'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AuthSwitchGuard } from '@/components/AuthSwitchGuard'
import { AuthDebugPanel } from '@/components/auth/AuthDebugPanel'
import { AuthSwitchBanner } from '@/components/auth/AuthSwitchBanner'
import BottomNav from '@/components/layout/BottomNav'

const inter = Inter({ subsets: ['latin'] })
const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-jp'
})
const notoSerifJP = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-noto-serif-jp',
})
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
})

export const metadata: Metadata = {
  title: 'Sakura Club - 文化体験を通じた真の出会い',
  description: '訪日外国人男性と日本人女性が、茶道・書道・料理教室などの文化体験を通じて自然な出会いを楽しめる、安心・安全なプラットフォームです。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={`${inter.className} ${notoSansJP.variable} ${notoSerifJP.variable} ${cormorant.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@400;500&family=Cormorant+Garamond:ital,wght@0,300;1,300;1,400&family=Zen+Kaku+Gothic+New:wght@300;400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <LanguageProvider>
          <AuthProvider>
            <AuthSwitchGuard />
            {/*
              モバイル時はボトムナビ(h-16=64px)+iOS Safe Area分の下余白を確保し、
              ページ最下部の固定/通常CTAボタンがボトムナビに隠れないようにする。
              md以上では Sidebar のみなので余白は不要(0)。
              ボトムナビ自身は LP/login/signup 等で null を返すが、ここでは
              一律に padding を付与しても無害（LP はフッター後の余白が増えるだけ）。
            */}
            <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
              {children}
            </main>
            <Suspense fallback={null}>
              <AuthDebugPanel />
            </Suspense>
            <AuthSwitchBanner />
            {/* モバイル用ボトムナビ。LP・login・signup 等では内部で null を返す */}
            <BottomNav />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}