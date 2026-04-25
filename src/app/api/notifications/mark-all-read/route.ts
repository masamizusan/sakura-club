import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// POST: 全ての通知を既読にする
// 認証は cookie ベース（anon role）で行うが、UPDATE 自体は service_role で実施。
// 過去の調査で notifications の RLS UPDATE policy で弾かれて 0 行更新になる問題が
// あったため、書き込みは service_role でバイパスする方針（contact/route.ts と同パターン）。
export async function POST(request: NextRequest) {
  try {
    // ユーザー認証（cookie 経由 / anon role）
    const supabaseUser = createServerClient(request)
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // service_role で UPDATE（RLS バイパス）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 注: notifications.updated_at カラムは本番スキーマキャッシュに存在せず、
    // 含めると "Could not find the 'updated_at' column" で UPDATE 全体が失敗する。
    // 既存の flags/route.ts と同様、is_read のみ更新する。
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .select('id')

    if (updateError) {
      console.error('[mark-all-read] update error:', updateError.message)
      return NextResponse.json(
        { error: '通知の更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log('[mark-all-read] updated:', { userId: user.id, count: updated?.length ?? 0 })
    return NextResponse.json({
      message: '全ての通知を既読にしました',
      count: updated?.length ?? 0,
    })

  } catch (error) {
    console.error('[mark-all-read] error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
