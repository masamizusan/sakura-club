import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * 管理者判定の共通ヘルパー(API ルート / サーバーコンポーネント共用)。
 *
 * 設計方針(段階0: 管理API保護):
 * - Cookie のユーザーセッションでクライアントを作り、supabase.auth.getUser() で検証する
 *   (getSession() は Cookie の内容をそのまま信用するため使わない)
 * - 管理者判定は app_metadata.role === 'admin' のみ
 *   (app_metadata はユーザー自身が書き換えられない。user_metadata は使用禁止)
 * - 結果は API ハンドラ側で `if (!admin.ok) return NextResponse.json(...)` で短絡する
 *
 * memory 遵守:
 * - #1: フロントエンドチェックは UX 補助、API 側で必ず判定する
 * - #18: サイレント失敗禁止 — 判定失敗は httpStatus 付きで返却
 */

export type AdminGuardOk = {
  ok: true
  user: User
}

export type AdminGuardFail = {
  ok: false
  code: 'unauthorized' | 'forbidden'
  httpStatus: 401 | 403
  message: string
}

export type AdminGuardResult = AdminGuardOk | AdminGuardFail

export async function requireAdmin(): Promise<AdminGuardResult> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      ok: false,
      code: 'unauthorized',
      httpStatus: 401,
      message: 'Authentication required',
    }
  }

  if (user.app_metadata?.role !== 'admin') {
    console.warn('[requireAdmin] forbidden:', user.id.slice(0, 8))
    return {
      ok: false,
      code: 'forbidden',
      httpStatus: 403,
      message: 'Admin only',
    }
  }

  return { ok: true, user }
}
