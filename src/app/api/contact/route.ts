import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getLanguageFromNationality } from '@/utils/language'
import { buildContactReceiptNotification } from '@/utils/contactNotifications'

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

    // 受信者（=問い合わせ送信者本人）の言語を nationality から解決。
    // 取得失敗時は getLanguageFromNationality(undefined) -> 'en' にフォールバック。
    const { data: recipientProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('nationality')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[api/contact] recipient profile fetch error:', profileError.message)
    }

    const lang = getLanguageFromNationality(recipientProfile?.nationality)
    const { title, message: notifMessage } = buildContactReceiptNotification(
      lang,
      category,
      message.trim(),
    )

    // ユーザー自身の通知として保存（受付確認）
    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'system',
        title,
        message: notifMessage,
        is_read: false,
      })

    if (notifError) {
      console.error('[api/contact] notifications insert error:', notifError.message)
      return NextResponse.json({ error: '送信に失敗しました' }, { status: 500 })
    }

    console.log('[api/contact] お問い合わせ受付:', { userId: user.id, category, lang })
    return NextResponse.json({ ok: true })

  } catch (e) {
    console.error('[api/contact] error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
