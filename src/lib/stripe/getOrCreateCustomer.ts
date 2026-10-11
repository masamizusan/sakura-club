import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

// #2-3: Stripe の customer を 1 人 1 つに使い回す
// customer は必ずこの関数経由で作る（決済開始のたびに作ると重複するため）
// stripe_customers は service_role のみ読み書きできる（stage8）
// Stripe API・DB の失敗は例外を投げる（呼び出し側で 500 にする）

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// Stripe 上でまだ有効な customer か（消えている・削除済みなら false）
async function isLiveCustomer(customerId: string): Promise<boolean> {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return !customer.deleted
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
      return false
    }
    throw error
  }
}

export async function getOrCreateCustomer(userId: string, email: string | undefined): Promise<string> {
  const supabase = getServiceSupabase()

  // (1) stripe_customers から探す
  const { data: saved, error: savedError } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (savedError) {
    throw new Error(`stripe_customers select failed: ${savedError.message}`)
  }

  let candidateId: string | null = saved?.stripe_customer_id ?? null

  // (2) なければ subscriptions から探す（今あるデータの引き継ぎ）
  if (!candidateId) {
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (subError) {
      throw new Error(`subscriptions select failed: ${subError.message}`)
    }
    candidateId = sub?.stripe_customer_id ?? null
  }

  // (3) Stripe 上で有効か確認。消えていれば「見つからなかった」扱い
  let missingId: string | null = null
  let customerId: string | null = null
  if (candidateId) {
    if (await isLiveCustomer(candidateId)) {
      customerId = candidateId
    } else {
      missingId = candidateId
      console.warn('[getOrCreateCustomer] saved customer is missing on Stripe; creating a new one')
    }
  }

  // (5) なければ作る（同時押しでも 1 件だけ作るよう idempotency key を付ける。
  //     古い ID が消えて作り直す場合は鍵が変わる）
  if (!customerId) {
    const customer = await stripe.customers.create(
      {
        email,
        metadata: { supabase_user_id: userId },
      },
      { idempotencyKey: `customer-create-${userId}-${missingId ?? 'none'}` }
    )
    customerId = customer.id
  }

  // (4)(6) stripe_customers に記録して返す
  if (customerId !== saved?.stripe_customer_id) {
    const { error: upsertError } = await supabase
      .from('stripe_customers')
      .upsert(
        { user_id: userId, stripe_customer_id: customerId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (upsertError) {
      throw new Error(`stripe_customers upsert failed: ${upsertError.message}`)
    }
  }

  return customerId
}
