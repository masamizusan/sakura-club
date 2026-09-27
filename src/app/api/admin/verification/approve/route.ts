import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // 段階0: 管理者のみ許可（未ログイン 401 / 非管理者 403）
    const admin = await requireAdmin()
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.message, code: admin.code },
        { status: admin.httpStatus }
      )
    }

    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Service roleクライアント（関数内で初期化）
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await serviceSupabase
      .from('profiles')
      .update({
        is_verified: true,
        verification_status: 'approved',
      })
      .eq('id', userId)

    if (error) {
      console.error('[admin/verification/approve] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[admin/verification/approve] approved user:', userId.slice(0, 8))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[admin/verification/approve] unexpected error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
