import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { logger } from '@/utils/logger'

export const dynamic = 'force-dynamic'

// Service roleクライアント（Webhookからの書き込み用）
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const getPlanType = (priceId: string): string => {
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return 'monthly'
  if (priceId === process.env.STRIPE_PRICE_3MONTH) return '3month'
  if (priceId === process.env.STRIPE_PRICE_6MONTH) return '6month'
  if (priceId === process.env.STRIPE_PRICE_YEARLY) return 'yearly'
  return 'monthly'
}

// In Stripe v22, current_period_end moved from Subscription to SubscriptionItem
function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const periodEnd = subscription.items.data[0]?.current_period_end
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null
}

// In Stripe v22, invoice.subscription moved to invoice.parent.subscription_details.subscription
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription
  if (!sub) return null
  return typeof sub === 'string' ? sub : sub.id
}

// ===== サブスクの状態の反映（#2-1） =====
// 状態はイベントの中身を信じず、毎回 Stripe から最新のサブスクを取得して決める
// （古いイベントが後から届いても、解約済みの人が有効に戻らないようにするため）

// Stripe の status → DB の status（DB は 'active' / 'inactive' の 2 値のみ）
// past_due は支払いの再試行中。再試行が終わるまでは使える状態のままにする
const ACTIVE_STRIPE_STATUSES: ReadonlySet<Stripe.Subscription.Status> = new Set<Stripe.Subscription.Status>([
  'active',
  'trialing',
  'past_due',
])

function toDbSubscriptionStatus(status: Stripe.Subscription.Status): 'active' | 'inactive' {
  return ACTIVE_STRIPE_STATUSES.has(status) ? 'active' : 'inactive'
}

// #42: 二重サブスク（同じ利用者に有効なサブスクが 2 つ以上）を管理者に知らせる
// 自動の解約・返金はしない。同じ利用者・同じサブスクの組み合わせでは 1 回だけ通知する
// 通知の失敗では webhook を失敗にしない（warn のみ）
async function notifyAdminsOfDuplicateSubscriptions(
  supabase: ReturnType<typeof getServiceSupabase>,
  userId: string,
  subscriptionIds: string[]
): Promise<void> {
  try {
    // 管理者 = app_metadata.role === 'admin'（requireAdmin と同じ基準）
    const adminIds: string[] = []
    const perPage = 1000
    for (let page = 1; ; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
      if (error) {
        logger.warn('[stripe/webhook] duplicate notify: listUsers failed:', error.message)
        return
      }
      for (const u of data.users) {
        if (u.app_metadata?.role === 'admin') adminIds.push(u.id)
      }
      if (data.users.length < perPage) break
    }
    if (adminIds.length === 0) {
      logger.warn('[stripe/webhook] duplicate notify: no admin users')
      return
    }

    const notifData = { kind: 'duplicate_subscription', user_id: userId, subscription_ids: subscriptionIds }
    for (const adminId of adminIds) {
      // 同じ組み合わせの通知が既にあれば作らない
      const { data: existing, error: existingError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', adminId)
        .eq('type', 'system')
        .contains('data', notifData)
        .limit(1)
      if (existingError) {
        logger.warn('[stripe/webhook] duplicate notify: select failed:', existingError.message)
        continue
      }
      if (existing && existing.length > 0) continue

      const { error: insertError } = await supabase.from('notifications').insert({
        user_id: adminId,
        type: 'system',
        title: '【管理】二重サブスクを検知',
        message: `同じ利用者に有効なサブスクが ${subscriptionIds.length} 件あります。Stripe で確認し、不要な方の解約・返金を行ってください。`,
        data: notifData,
      })
      if (insertError) {
        logger.warn('[stripe/webhook] duplicate notify: insert failed:', insertError.message)
      }
    }
  } catch (error) {
    logger.warn('[stripe/webhook] duplicate notify failed:', error instanceof Error ? error.message : 'unknown')
  }
}

// 最新のサブスクを Stripe から取得して subscriptions に反映する
// DB の書き込み失敗・Stripe API の例外は呼び出し元へ投げる（呼び出し元で 500 を返し、Stripe に再送させる）
// #42: DB の行（1 利用者 1 行）は、その customer の「有効なサブスク」を指すようにする（作成日が古い方を優先）。
//      イベントのサブスクが解約されても、ほかに有効なサブスクがあれば inactive にしない
async function syncSubscriptionFromStripe(
  supabase: ReturnType<typeof getServiceSupabase>,
  subscriptionId: string,
  eventType: string
): Promise<void> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // 利用者 ID は invoice.payment_succeeded と同じく、Stripe の customer の metadata から取る
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id
  const customer = await stripe.customers.retrieve(customerId)
  const userId = customer.deleted ? null : customer.metadata?.supabase_user_id
  if (!userId) {
    // 再送しても直らないため 200 で終える（ユーザー ID・本文は出さない）
    console.error('[stripe/webhook] subscription sync skipped: no supabase_user_id on customer', { eventType, subscriptionId })
    return
  }

  // その customer の有効なサブスク（active・trialing・past_due）を、作成日の古い順に
  const customerSubscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 })
  const activeSubscriptions = customerSubscriptions.data
    .filter(s => ACTIVE_STRIPE_STATUSES.has(s.status))
    .sort((a, b) => a.created - b.created)

  if (activeSubscriptions.length >= 2) {
    const duplicateIds = activeSubscriptions.map(s => s.id)
    logger.error('[stripe/webhook] duplicate active subscriptions:', duplicateIds.length, duplicateIds.join(','))
    await notifyAdminsOfDuplicateSubscriptions(supabase, userId, duplicateIds)
  }

  // DB に書くサブスク：有効なものがあれば、いちばん古い有効なサブスク
  let target: Stripe.Subscription = activeSubscriptions[0] ?? subscription

  if (activeSubscriptions.length === 0) {
    // 有効なサブスクが 1 つも無い → 無効にする
    const { data: existing, error: existingError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', userId)
      .maybeSingle()
    if (existingError) {
      throw new Error(`subscriptions select failed: ${existingError.message}`)
    }
    // 行が無い（退会で削除済み等）なら、無効にする対象が無いので新しく作らない
    if (!existing) {
      console.warn('[stripe/webhook] subscription sync skipped: no subscriptions row to deactivate', { eventType, subscriptionId })
      return
    }
    // 行が別のサブスクを指している場合は、そのサブスクの最新の内容で無効にする（行のサブスク ID を古いもので書き換えない）
    if (existing.stripe_subscription_id && existing.stripe_subscription_id !== subscription.id) {
      target = customerSubscriptions.data.find(s => s.id === existing.stripe_subscription_id)
        ?? await stripe.subscriptions.retrieve(existing.stripe_subscription_id)
    }
  }

  const dbStatus = toDbSubscriptionStatus(target.status)
  const priceId = target.items.data[0]?.price.id
  const currentPeriodEnd = getSubscriptionPeriodEnd(target)

  // #2-2: 解約予約（期間の終わりに解約 / 日付指定の解約）。予約を取り消した場合は false / null に戻る
  const cancelAtIso = target.cancel_at ? new Date(target.cancel_at * 1000).toISOString() : null
  const cancelAtPeriodEnd = target.cancel_at_period_end === true || cancelAtIso !== null
  const cancelAt = cancelAtIso ?? (target.cancel_at_period_end ? currentPeriodEnd : null)

  const { error: upsertError } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: target.id,
    plan_type: getPlanType(priceId),
    status: dbStatus,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: cancelAtPeriodEnd,
    cancel_at: cancelAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (upsertError) {
    throw new Error(`subscriptions upsert failed: ${upsertError.message}`)
  }
}

// サブスクの処理が失敗したときの返事（500 で Stripe に再送させる）
function subscriptionSyncFailed(eventType: string, error: unknown) {
  console.error('[stripe/webhook] subscription sync failed:', { eventType, message: error instanceof Error ? error.message : String(error) })
  return NextResponse.json({ error: 'Failed to sync subscription' }, { status: 500 })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id

      // 段階3-2: さくらいいね回数券（単発決済）。サブスク処理には進まない
      if (session.mode === 'payment' && session.metadata?.kind === 'sakura_like') {
        if (session.payment_status !== 'paid') break

        const quantity = Number(session.metadata?.quantity)
        if (![1, 5, 30].includes(quantity) || !userId) {
          console.error('[stripe/webhook] sakura_like invalid metadata:', { sessionId: session.id, quantity: session.metadata?.quantity, hasUser: !!userId })
          break
        }

        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null

        const { data: grantResult, error: grantError } = await supabase.rpc('grant_sakura_tickets', {
          p_user: userId,
          p_quantity: quantity,
          p_session_id: session.id,
          p_payment_intent: paymentIntentId,
          p_amount_total: session.amount_total,
          p_currency: session.currency,
        })

        if (grantError) {
          // Stripe に再送させる（grant_sakura_tickets は同じ session_id を 1 回だけ付与するため再送しても二重付与しない）
          console.error('[stripe/webhook] grant_sakura_tickets error:', grantError.message)
          return NextResponse.json({ error: 'Failed to grant sakura tickets' }, { status: 500 })
        }
        if (!grantResult?.ok) {
          console.error('[stripe/webhook] grant_sakura_tickets not ok:', { sessionId: session.id, code: grantResult?.code })
        }
        break
      }

      // サブスク：最新のサブスクを Stripe から取得して反映
      if (!session.subscription) break
      const checkoutSubscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id
      try {
        await syncSubscriptionFromStripe(supabase, checkoutSubscriptionId, event.type)
      } catch (error) {
        return subscriptionSyncFailed(event.type, error)
      }
      break
    }

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed': {
      // 支払い失敗でもすぐに inactive にはしない（past_due の間は active のまま。状態は Stripe の最新で決める）
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = getInvoiceSubscriptionId(invoice)
      if (!subscriptionId) break
      try {
        await syncSubscriptionFromStripe(supabase, subscriptionId, event.type)
      } catch (error) {
        return subscriptionSyncFailed(event.type, error)
      }
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      // deleted も共通処理で反映（取得した最新の status が canceled → inactive）
      const sub = event.data.object as Stripe.Subscription
      try {
        await syncSubscriptionFromStripe(supabase, sub.id, event.type)
      } catch (error) {
        return subscriptionSyncFailed(event.type, error)
      }
      break
    }

    // 段階3-2: 返金時にその決済のさくらいいね回数券の残りを 0 にする
    // （さくらいいね以外の決済では updated:0 になるだけなので条件分岐は不要）
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId = typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id ?? null
      if (!paymentIntentId) break

      const { error: revokeError } = await supabase.rpc('revoke_sakura_tickets', {
        p_payment_intent: paymentIntentId,
      })
      if (revokeError) {
        console.error('[stripe/webhook] revoke_sakura_tickets error:', revokeError.message)
        return NextResponse.json({ error: 'Failed to revoke sakura tickets' }, { status: 500 })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
