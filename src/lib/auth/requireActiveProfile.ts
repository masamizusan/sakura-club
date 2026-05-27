import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

/**
 * profiles.status='suspended' をブロックする 2 層防御(API レイヤー)の共通ヘルパー。
 *
 * 設計方針(指示書 #31):
 * - service_role クライアントを内部生成して RLS をバイパスし profiles.status を確実に読む
 * - 結果は API ハンドラ側で `if (!result.ok) return NextResponse.json(...)` で短絡する
 * - `suspended` と `deleted_permanent` はブロック対象、`active` と `deleted_pending` は通過
 *   - `deleted_pending` を許可する理由: 自己退会の撤回や問い合わせ等の延長線上の API を将来許可するため
 *     API 側で `guard.status === 'deleted_pending'` を見て個別判定可能にする
 *
 * memory 遵守:
 * - #1: フロントエンドチェックは UX 補助、API + RLS の 2 層防御を徹底
 * - #18: サイレント失敗禁止 — エラーは必ず console.error し、httpStatus 付きで返却
 */

export type ProfileGuardOk = {
  ok: true
  status: 'active' | 'deleted_pending'
  profile: { id: string; status: string }
}

export type ProfileGuardFail = {
  ok: false
  code: 'profile_not_found' | 'account_suspended' | 'account_deleted' | 'internal_error'
  httpStatus: 403 | 404 | 500
  message: string
}

export type ProfileGuardResult = ProfileGuardOk | ProfileGuardFail

export async function requireActiveProfile(userId: string): Promise<ProfileGuardResult> {
  if (!userId) {
    return {
      ok: false,
      code: 'profile_not_found',
      httpStatus: 404,
      message: 'User ID not provided',
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('[requireActiveProfile] Missing env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
    return {
      ok: false,
      code: 'internal_error',
      httpStatus: 500,
      message: 'Server misconfigured',
    }
  }

  const admin: SupabaseClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await admin
    .from('profiles')
    .select('id, status')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[requireActiveProfile] DB error:', error.message)
    return {
      ok: false,
      code: 'internal_error',
      httpStatus: 500,
      message: 'Failed to load profile',
    }
  }

  if (!data) {
    return {
      ok: false,
      code: 'profile_not_found',
      httpStatus: 404,
      message: 'Profile not found',
    }
  }

  if (data.status === 'suspended') {
    return {
      ok: false,
      code: 'account_suspended',
      httpStatus: 403,
      message: 'Account is suspended',
    }
  }

  // deleted_permanent はログイン自体できないはずだが、保険として弾く
  if (data.status === 'deleted_permanent') {
    return {
      ok: false,
      code: 'account_deleted',
      httpStatus: 403,
      message: 'Account is permanently deleted',
    }
  }

  // active と deleted_pending は ok=true で返す
  // deleted_pending を許可する API では、呼び出し側で guard.status を見て個別判定可能
  return {
    ok: true,
    status: data.status === 'deleted_pending' ? 'deleted_pending' : 'active',
    profile: { id: data.id, status: data.status },
  }
}
