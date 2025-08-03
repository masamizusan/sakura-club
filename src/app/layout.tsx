import type { Metadata } from 'next'
import { Inter, Noto_Sans_JP } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const notoSansJP = Noto_Sans_JP({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-jp'
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Sakura Club - 文化体験を通じた真の出会い',
  description: '訪日外国人男性と日本人女性が、茶道・書道・料理教室などの文化体験を通じて自然な出会いを楽しめる、安心・安全なプラットフォームです。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className={`${inter.className} ${notoSansJP.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}