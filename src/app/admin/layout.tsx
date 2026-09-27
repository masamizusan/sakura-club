import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// 段階0: /admin 配下は管理者（app_metadata.role === 'admin'）のみ表示
// 未ログイン・非管理者はトップページへリダイレクト
// ※ 画面側の判定は UX 補助。データ取得・操作は /api/admin/* 側の requireAdmin で必ず判定する
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()
  if (!admin.ok) {
    redirect('/')
  }
  return <>{children}</>
}
