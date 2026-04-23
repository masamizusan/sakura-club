import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // ユーザー認証
    const supabaseUser = createServerClient(req)
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { category, message } = await req.json()

    if (!category || !message?.trim()) {
      return NextResponse.json({ error: 'カテゴリとお問い合わせ内容は必須です' }, { status: 400 })
    }

    // service_role で notifications テーブルに保存
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ユーザー自身の通知として保存（受付確認）
    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'system',
        title: `お問い合わせを受け付けました：${category}`,
        message: `以下のお問い合わせを受け付けました。通常2〜3営業日以内にご返答いたします。\n\n【内容】\n${message.trim()}`,
        is_read: false,
      })

    if (notifError) {
      console.error('[api/contact] notifications insert error:', notifError.message)
      return NextResponse.json({ error: '送信に失敗しました' }, { status: 500 })
    }

    console.log('[api/contact] お問い合わせ受付:', { userId: user.id, category })
    return NextResponse.json({ ok: true })

  } catch (e) {
    console.error('[api/contact] error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
