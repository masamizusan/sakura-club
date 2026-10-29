import { notFound } from 'next/navigation'
import { EXPERIENCES_COMING_SOON } from '@/lib/featureFlags'

// #20・#45: 体験機能は公開まで「存在しない」扱いにする
// EXPERIENCES_COMING_SOON が true の間は、/experiences 以下のページ（一覧・作成・詳細）をすべて 404 にする
// 各ページの中の「準備中」の表示は、フラグを false にしたとき用に残している
export default function ExperiencesLayout({ children }: { children: React.ReactNode }) {
  if (EXPERIENCES_COMING_SOON) notFound()
  return <>{children}</>
}
