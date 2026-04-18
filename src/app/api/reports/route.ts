import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()

  // 認証ユーザー取得（anon key で Cookie セッション確認）
  const supabaseUser = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* Route Handler では不要 */ },
      },
    }
  )

  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { reported_id, reason, detail } = await req.json()

  if (!reported_id || !reason) {
    return NextResponse.json({ error: 'reported_id and reason are required' }, { status: 400 })
  }

  // RLS をバイパスして書き込む（service_role）
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from('reports')
    .insert({
      reporter_id: user.id,
      reported_id,
      reason,
      detail: detail || null,
      status: 'pending',
    })

  if (error) {
    console.error('reports insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
