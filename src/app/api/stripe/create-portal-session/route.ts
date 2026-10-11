import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// #2-2: Stripe カスタマーポータル（解約・支払い方法の管理）を開く
// 停止中（suspended）の人も解約できるよう、requireActiveProfile は付けない
export async function POST() {
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

    // 本人の Stripe customer ID
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (subError) {
      console.error('[stripe/create-portal-session] subscriptions fetch error:', subError.message)
      return NextResponse.json({ error: 'Failed to load subscription', code: 'internal_error' }, { status: 500 })
    }
    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'Subscription not found', code: 'not_found' }, { status: 404 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/mypage/plans`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/create-portal-session] error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Failed to create portal session', code: 'internal_error' }, { status: 500 })
  }
}
