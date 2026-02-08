import { redirect } from 'next/navigation'

/**
 * /dashboard は /matches にリダイレクト
 *
 * 互換性維持のため、旧URLからのアクセスを新URLに転送
 */
export default function DashboardPage() {
  redirect('/matches')
}
