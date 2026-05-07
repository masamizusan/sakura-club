import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

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

    // service_role：物理削除を行うため admin 権限が必要
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ユーザー属性のスナップショット（退会後も leave_surveys / archived_violations から参照する）
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, gender, nationality')
      .eq('id', user.id)
      .maybeSingle()

    // ─────────────────────────────────────────────────────────────────
    // 1) leave_surveys にアンケート保存
    // ─────────────────────────────────────────────────────────────────
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
      console.error('[LEAVE] survey insert error:', surveyError.message)
      return NextResponse.json(
        { error: 'アンケート保存に失敗しました' },
        { status: 500 }
      )
    }

    // ─────────────────────────────────────────────────────────────────
    // 2) 違反履歴を archived_violations にスナップショット保存
    //    （reports と message_flags は profiles CASCADE 削除で消える前に退避）
    // ─────────────────────────────────────────────────────────────────
    const { data: receivedReports } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('reported_id', user.id)

    const { data: userMessages } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('sender_id', user.id)

    const messageIds = (userMessages ?? []).map((m: { id: string }) => m.id)
    let userFlags: Array<Record<string, unknown>> = []
    if (messageIds.length > 0) {
      const { data: flags } = await supabaseAdmin
        .from('message_flags')
        .select('*')
        .in('message_id', messageIds)
      userFlags = flags ?? []
    }

    const archivedRows: Array<Record<string, unknown>> = []
    for (const report of receivedReports ?? []) {
      archivedRows.push({
        original_user_id: user.id,
        user_email: user.email ?? null,
        user_name: profile?.name ?? null,
        user_gender: profile?.gender ?? null,
        user_nationality: profile?.nationality ?? null,
        violation_type: 'reported',
        original_status: (report as { status?: string }).status ?? 'pending',
        violation_content: report,
        original_created_at: (report as { created_at?: string }).created_at ?? null,
      })
    }
    for (const flag of userFlags) {
      archivedRows.push({
        original_user_id: user.id,
        user_email: user.email ?? null,
        user_name: profile?.name ?? null,
        user_gender: profile?.gender ?? null,
        user_nationality: profile?.nationality ?? null,
        violation_type: 'flagged',
        original_status: (flag as { status?: string }).status ?? 'pending',
        violation_content: flag,
        original_created_at: (flag as { created_at?: string }).created_at ?? null,
      })
    }

    if (archivedRows.length > 0) {
      const { error: archiveError } = await supabaseAdmin
        .from('archived_violations')
        .insert(archivedRows)
      if (archiveError) {
        console.error('[LEAVE] archive failed:', archiveError)
        return NextResponse.json(
          { error: '違反履歴のアーカイブに失敗しました。時間をおいて再度お試しください。' },
          { status: 500 }
        )
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 3) Stripe サブスクリプション cancel
    //    失敗時は退会自体を中断（profiles / auth.users は削除しない）
    // ─────────────────────────────────────────────────────────────────
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, stripe_subscription_id, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (subscription?.stripe_subscription_id && subscription.status === 'active') {
      try {
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id)
        console.log('[LEAVE] Stripe subscription cancelled:', subscription.stripe_subscription_id)
      } catch (stripeError) {
        console.error('[LEAVE] Stripe cancel failed:', stripeError)
        const detail = stripeError instanceof Error ? stripeError.message : String(stripeError)
        return NextResponse.json(
          {
            error: '課金システムでエラーが発生しました。時間をおいて再度お試しください。',
            detail,
          },
          { status: 500 }
        )
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // 4) 物理削除（subscriptions → likes → profiles → auth.users の順）
    //    profiles と likes は ON DELETE CASCADE で auth.users 経由でも消えるが、
    //    エラー検知のため明示削除を先に実行する。
    // ─────────────────────────────────────────────────────────────────
    await supabaseAdmin.from('subscriptions').delete().eq('user_id', user.id)

    await supabaseAdmin
      .from('likes')
      .delete()
      .or(`liker_id.eq.${user.id},liked_user_id.eq.${user.id}`)

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id)
    if (profileError) {
      console.error('[LEAVE] profile delete failed:', profileError)
      return NextResponse.json(
        { error: 'プロフィールの削除に失敗しました。' },
        { status: 500 }
      )
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (authDeleteError) {
      console.error('[LEAVE] auth.users delete failed:', authDeleteError)
      // この時点で profiles は既に削除済みなので、エラーは記録するが処理は継続。
      // ユーザーには成功を返すが、運営に通知が必要（実装はフェーズ2で）。
      console.warn('[LEAVE] CRITICAL: profiles deleted but auth.users remains. user_id:', user.id)
    }

    // 5) セッションを破棄（クライアント側で signOut も併用するが、サーバ側でも破棄）
    await supabaseUser.auth.signOut()

    console.log('[LEAVE] success:', {
      userId: user.id.slice(0, 8),
      reasons: reasons.length,
      feedbackLen: feedback.length,
      archivedViolations: archivedRows.length,
      stripeCancelled: !!(subscription?.stripe_subscription_id && subscription.status === 'active'),
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[LEAVE] unexpected error:', e)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
