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
 * POST /api/footprints/read
 *
 * 自分の足跡を既読にする（service_role でRLSをバイパス）
 * Body: { visitor_id?: string }
 *   visitor_id 指定時 → その1人分だけ既読
 *   未指定      → 全件既読
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

    const body = await request.json().catch(() => ({}))
    const visitorId: string | undefined = body?.visitor_id

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = supabaseAdmin
      .from('footprints')
      .update({ is_read: true })
      .eq('profile_owner_id', user.id)
      .eq('is_read', false)

    if (visitorId) {
      query = query.eq('visitor_id', visitorId)
    }

    await query

    return NextResponse.json({ ok: true }, { headers: noCacheHeaders })
  } catch (error) {
    console.error('[footprints/read] error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: noCacheHeaders })
  }
}
