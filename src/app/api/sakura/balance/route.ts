import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

/**
 * GET /api/sakura/balance
 *
 * 段階3-2: さくらいいね回数券の残り枚数と、次に失効する日時を返す
 * （DB 関数 get_sakura_balance をユーザーセッションで実行）
 */
export async function GET() {
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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: noCacheHeaders })
    }

    const { data, error } = await supabase.rpc('get_sakura_balance')
    if (error || !data) {
      console.error('[sakura/balance] get_sakura_balance error:', error?.message)
      return NextResponse.json({ error: 'Database error' }, { status: 500, headers: noCacheHeaders })
    }

    const { balance, next_expiry } = data as { balance: number; next_expiry: string | null }
    return NextResponse.json({ balance, next_expiry }, { headers: noCacheHeaders })
  } catch (error) {
    console.error('[sakura/balance] unexpected error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500, headers: noCacheHeaders })
  }
}
