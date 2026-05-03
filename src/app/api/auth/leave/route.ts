import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// 退会受付に必須の最小入力
type LeaveBody = {
  reasons?: unknown
  feedback?: unknown
}

// 想定される退会理由キー（フロントとサーバで二重バリデーション）
const ALLOWED_REASON_KEYS = new Set([
  'foundMatch',
  'noMatch',
  'expensive',
  'languageBarrier',
  'hardToUse',
  'tempLeave',
  'other',
])

const FEEDBACK_MIN_LENGTH = 10

export async function POST(req: NextRequest) {
  try {
    // 認証（cookie 経由 / anon role）
    const supabaseUser = createServerClient(req)
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // バリデーション
    const body = (await req.json()) as LeaveBody
    const reasonsInput = Array.isArray(body.reasons) ? body.reasons : []
    const reasons = reasonsInput
      .filter((r): r is string => typeof r === 'string')
      .filter((r) => ALLOWED_REASON_KEYS.has(r))

    const feedbackRaw = typeof body.feedback === 'string' ? body.feedback : ''
    const feedback = feedbackRaw.trim()

    if (reasons.length === 0) {
      return NextResponse.json(
        { error: '退会理由を1つ以上選択してください' },
        { status: 400 }
      )
    }
    if (feedback.length < FEEDBACK_MIN_LENGTH) {
      return NextResponse.json(
        { error: `ご意見を${FEEDBACK_MIN_LENGTH}文字以上入力してください` },
        { status: 400 }
      )
    }

    // service_role：profiles のスナップショット取得 + 退会反映 + アンケート保存
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ユーザー属性のスナップショット
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, gender, nationality')
      .eq('id', user.id)
      .maybeSingle()

    // 1) アンケート保存（service_role なので RLS 関係なく書ける）
    const { error: surveyError } = await supabaseAdmin
      .from('leave_surveys')
      .insert({
        user_id: user.id,
        user_email: user.email ?? null,
        user_nickname: profile?.name ?? null,
        user_gender: profile?.gender ?? null,
        user_nationality: profile?.nationality ?? null,
        reasons,
        feedback,
      })

    if (surveyError) {
      console.error('[auth/leave] survey insert error:', surveyError.message)
      return NextResponse.json(
        { error: 'アンケート保存に失敗しました' },
        { status: 500 }
      )
    }

    // 2) profiles を論理削除状態に
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'deleted_pending',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('[auth/leave] profile update error:', profileError.message)
      return NextResponse.json(
        { error: 'アカウントの退会処理に失敗しました' },
        { status: 500 }
      )
    }

    // 3) セッションを破棄（クライアント側で signOut も併用するが、サーバ側でも破棄しておく）
    await supabaseUser.auth.signOut()

    console.log('[auth/leave] success:', { userId: user.id.slice(0, 8), reasons: reasons.length, feedbackLen: feedback.length })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[auth/leave] unexpected error:', e)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
