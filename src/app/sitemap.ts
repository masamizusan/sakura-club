import { MetadataRoute } from 'next'
import { EXPERIENCES_COMING_SOON } from '@/lib/featureFlags'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // 基本的なページ一覧（#20・#45：実在するページだけを載せる）
  // ・言語付きの URL（/en/... など）のページは無い（言語は画面の中で切り替える）ので載せない
  // ・/how-it-works・/safety のページは無いので載せない
  // ・体験一覧は公開まで「存在しない」扱い（EXPERIENCES_COMING_SOON が true の間は 404）なので載せない
  const pages = [
    '',
    '/about',
    ...(EXPERIENCES_COMING_SOON ? [] : ['/experiences']),
    '/login',
    '/signup'
  ]

  return pages.map(page => ({
    url: `${baseUrl}${page}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: page === '' ? 1.0 : 0.8
  }))
}
