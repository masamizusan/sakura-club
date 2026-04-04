import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
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
        is_verified: false,
        verification_status: 'rejected',
      })
      .eq('id', userId)

    if (error) {
      console.error('[admin/verification/reject] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[admin/verification/reject] rejected user:', userId.slice(0, 8))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[admin/verification/reject] unexpected error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
