import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireActiveProfile } from '@/lib/auth/requireActiveProfile'
import { isForeignMaleUser } from '@/utils/userHelpers'
import { getOrCreateCustomer } from '@/lib/stripe/getOrCreateCustomer'

export const dynamic = 'force-dynamic'

const PRICE_MAP: Record<string, string> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  '3month': process.env.STRIPE_PRICE_3MONTH!,
  '6month': process.env.STRIPE_PRICE_6MONTH!,
  yearly: process.env.STRIPE_PRICE_YEARLY!,
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // #2-3 (1) memory #1 の 2 層防御: suspended ユーザーをここで弾く
    const guard = await requireActiveProfile(user.id)
    if (!guard.ok) {
      return NextResponse.json({ error: guard.message, code: guard.code }, { status: guard.httpStatus })
    }

    // #2-3 (2) 外国人男性のみ申し込み可（画面側の判定は UX 補助。ここで必ず判定する）
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gender, nationality')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) {
      console.error('[stripe/create-checkout] profile fetch error:', profileError.message)
      return NextResponse.json({ error: 'Failed to load profile', code: 'internal_error' }, { status: 500 })
    }
    if (!isForeignMaleUser(profile)) {
      return NextResponse.json({ error: 'Not eligible', code: 'not_eligible' }, { status: 403 })
    }

    // #2-3 (3) 二重契約の防止：すでに有料プラン（active。past_due も含む）なら申し込ませない
    const { data: activeSub, error: activeSubError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    if (activeSubError) {
      console.error('[stripe/create-checkout] subscription fetch error:', activeSubError.message)
      return NextResponse.json({ error: 'Failed to load subscription', code: 'internal_error' }, { status: 500 })
    }
    if (activeSub) {
      return NextResponse.json({ error: 'Already subscribed', code: 'already_subscribed' }, { status: 409 })
    }

    const { planType } = await req.json()
    const priceId = PRICE_MAP[planType]
    if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    // #2-3: Stripe の customer は 1 人 1 つを使い回す（stripe_customers → subscriptions → 新規作成）
    const customerId = await getOrCreateCustomer(user.id, user.email)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancel`,
      metadata: {
        supabase_user_id: user.id,
        plan_type: planType,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/create-checkout] error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
