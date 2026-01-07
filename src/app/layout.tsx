import type { Metadata } from 'next'
import { Inter, Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import SimpleHeader from '@/components/layout/SimpleHeader'
import AuthProvider from '@/components/auth/AuthProvider'
import { LanguageProvider } from '@/contexts/LanguageContext'

const inter = Inter({ subsets: ['latin'] })
const notoSansJP = Noto_Sans_JP({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-jp'
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
    <html lang="ja" className={`${inter.className} ${notoSansJP.variable}`}>
      <body className="antialiased">
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}