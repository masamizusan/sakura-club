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
 * 自分の足跡を全て既読にする（service_role でRLSをバイパス）
 */
export async function POST(request: NextRequest) {
  try {
    // ユーザー認証（anon key + cookie）
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

    // service_role で既読更新（RLS回避）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { count } = await supabaseAdmin
      .from('footprints')
      .update({ is_read: true })
      .eq('profile_owner_id', user.id)
      .eq('is_read', false)
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({ updated: count || 0 }, { headers: noCacheHeaders })
  } catch (error) {
    console.error('[footprints/read] error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: noCacheHeaders })
  }
}
