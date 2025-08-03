import type { Metadata } from 'next'
import { Inter, Noto_Sans_JP } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { locales, type Locale } from '@/i18n'
import { generateStructuredData } from '@/lib/metadata'
import '../globals.css'
import Layout from '@/components/layout/Layout'
import AuthProvider from '@/components/providers/AuthProvider'

const inter = Inter({ subsets: ['latin'] })
const notoSansJP = Noto_Sans_JP({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-jp'
})

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params: { locale }
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const messages = await getMessages()
  const homeMessages = messages.home as any

  const titles = {
    ja: 'Sakura Club - 文化体験を通じた真の出会い',
    en: 'Sakura Club - True Connections Through Cultural Experiences',
    zh: 'Sakura Club - 通过文化体验实现真正的邂逅',
    ko: 'Sakura Club - 문화 체험을 통한 진정한 만남'
  }

  const descriptions = {
    ja: '訪日外国人男性と日本人女性が、茶道・書道・料理教室などの文化体験を通じて自然な出会いを楽しめる、安心・安全なプラットフォームです。',
    en: 'A safe and secure platform where foreign men visiting Japan and Japanese women can enjoy natural encounters through cultural experiences like tea ceremony, calligraphy, and cooking classes.',
    zh: '为访日外国男性和日本女性提供的安全可靠平台，通过茶道、书道、料理教室等文化体验享受自然的邂逅。',
    ko: '방일 외국인 남성과 일본 여성이 다도, 서예, 요리 교실 등의 문화 체험을 통해 자연스러운 만남을 즐길 수 있는 안전하고 신뢰할 수 있는 플랫폼입니다.'
  }

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    title: titles[locale] || titles.ja,
    description: descriptions[locale] || descriptions.ja,
    keywords: ['文化交流', '国際交流', '日本文化', '出会い', '安全', 'マッチング'],
    manifest: '/manifest.json',
    themeColor: '#f8a5c2',
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 1,
      userScalable: false,
      viewportFit: 'cover'
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Sakura Club'
    },
    openGraph: {
      title: titles[locale] || titles.ja,
      description: descriptions[locale] || descriptions.ja,
      type: 'website',
      locale: locale === 'ja' ? 'ja_JP' : locale === 'en' ? 'en_US' : locale === 'zh' ? 'zh_CN' : 'ko_KR',
      url: `/${locale}`,
      siteName: 'Sakura Club',
    },
    twitter: {
      card: 'summary',
      title: titles[locale] || titles.ja,
      description: descriptions[locale] || descriptions.ja,
    },
    alternates: {
      languages: {
        'ja': '/',
        'en': '/en',
        'zh': '/zh',
        'ko': '/ko'
      }
    }
  }
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: Locale }
}) {
  const messages = await getMessages()
  const structuredData = generateStructuredData(locale)

  return (
    <html lang={locale} className={`${inter.className} ${notoSansJP.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-startup-image" href="/icons/splash-screen.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sakura Club" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#f8a5c2" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData)
          }}
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <Layout>
              {children}
            </Layout>
          </AuthProvider>
        </NextIntlClientProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}