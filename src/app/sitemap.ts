import { MetadataRoute } from 'next'
import { locales } from '@/i18n'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // 基本的なページ一覧
  const pages = [
    '',
    '/about',
    '/how-it-works',
    '/safety',
    '/experiences',
    '/login',
    '/signup'
  ]

  // 各ページを全言語分生成
  const sitemapEntries: MetadataRoute.Sitemap = []

  pages.forEach(page => {
    locales.forEach(locale => {
      const url = locale === 'ja' 
        ? `${baseUrl}${page}`
        : `${baseUrl}/${locale}${page}`

      sitemapEntries.push({
        url,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: page === '' ? 1.0 : 0.8
      })
    })
  })

  return sitemapEntries
}