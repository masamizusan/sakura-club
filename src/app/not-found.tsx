import type { Metadata } from 'next'
import NotFoundContent from '@/components/errors/NotFoundContent'

// 存在しない URL・notFound()（体験機能を隠している /experiences など）で出る 404 画面
// HTTP の状態（404）と検索エンジン向けの noindex は Next.js が付ける
// タブの題名は日本語を初期値にし、画面の言語に合わせて部品側で書き換える
export const metadata: Metadata = {
  title: 'ページが見つかりません | SAKURA CLUB',
}

export default function NotFound() {
  return <NotFoundContent />
}
