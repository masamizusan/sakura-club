import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
}

/**
 * POST /api/likes/seen
 *
 * 自分へのいいねを全て既読にする（service_role でRLSをバイパス）
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noCacheHeaders })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await supabaseAdmin
      .from('likes')
      .update({ is_seen: true })
      .eq('liked_user_id', user.id)
      .eq('is_seen', false)

    return NextResponse.json({ ok: true }, { headers: noCacheHeaders })
  } catch (error) {
    console.error('[likes/seen] error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: noCacheHeaders })
  }
}
