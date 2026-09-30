import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireActiveProfile } from '@/lib/auth/requireActiveProfile'
import { isForeignMaleUser } from '@/utils/userHelpers'

export const dynamic = 'force-dynamic'

// 段階3-2: さくらいいね回数券（単発決済）
// サブスク用の create-checkout とは別ルート。既存の価格・プランID には触れない
const SAKURA_PRICE_MAP: Record<number, string | undefined> = {
  1: process.env.STRIPE_PRICE_SAKURA_1,
  5: process.env.STRIPE_PRICE_SAKURA_5,
  30: process.env.STRIPE_PRICE_SAKURA_30,
}

export async function POST(req: NextRequest) {
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
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 401 })

    // memory #1 の 2 層防御: suspended ユーザーをここで弾く
    const guard = await requireActiveProfile(user.id)
    if (!guard.ok) {
      return NextResponse.json({ error: guard.message, code: guard.code }, { status: guard.httpStatus })
    }

    // 外国人男性のみ購入可（画面側の判定は UX 補助。ここで必ず判定する）
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gender, nationality')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[stripe/create-sakura-checkout] profile fetch error:', profileError.message)
      return NextResponse.json({ error: 'Failed to load profile', code: 'internal_error' }, { status: 500 })
    }
    if (!isForeignMaleUser(profile)) {
      return NextResponse.json({ error: 'Not eligible', code: 'not_eligible' }, { status: 403 })
    }

    const { pack } = await req.json()
    const packNumber = Number(pack)
    if (!(packNumber in SAKURA_PRICE_MAP)) {
      return NextResponse.json({ error: 'Invalid pack', code: 'invalid_pack' }, { status: 400 })
    }
    const priceId = SAKURA_PRICE_MAP[packNumber]
    if (!priceId) {
      console.error('[stripe/create-sakura-checkout] price env missing for pack:', packNumber)
      return NextResponse.json({ error: 'Price not configured', code: 'internal_error' }, { status: 500 })
    }

    // 既存のStripeカスタマーIDを確認（create-checkout と同じ方法）
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    let customerId = sub?.stripe_customer_id

    // カスタマーがなければ作成
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
    }

    const metadata = {
      supabase_user_id: user.id,
      kind: 'sakura_like',
      quantity: String(packNumber),
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?kind=sakura&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancel?kind=sakura`,
      metadata,
      payment_intent_data: { metadata },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/create-sakura-checkout] error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session', code: 'internal_error' }, { status: 500 })
  }
}
