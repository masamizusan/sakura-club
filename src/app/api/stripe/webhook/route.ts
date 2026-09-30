import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

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
      const planType = session.metadata?.plan_type

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

      if (!userId || !session.subscription) break

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        plan_type: planType,
        status: 'active',
        current_period_end: getSubscriptionPeriodEnd(subscription),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = getInvoiceSubscriptionId(invoice)
      if (!subscriptionId) break

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer
      const userId = customer.metadata?.supabase_user_id
      if (!userId) break

      const priceId = subscription.items.data[0]?.price.id

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        plan_type: getPlanType(priceId),
        status: 'active',
        current_period_end: getSubscriptionPeriodEnd(subscription),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('subscriptions')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id)
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

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = getInvoiceSubscriptionId(invoice)
      if (!subscriptionId) break

      await supabase.from('subscriptions')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscriptionId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
