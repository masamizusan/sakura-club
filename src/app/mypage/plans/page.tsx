'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import { useAuth } from '@/store/authStore'
import { createClient } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { ArrowLeft, Check, X, Crown } from 'lucide-react'

const translations: Record<string, Record<string, string>> = {
  ja: {
    title: '料金プラン',
    back: '戻る',
    freeMember: '無料会員',
    paidMember: '有料会員',
    featureComparison: '機能比較',
    feature: '機能',
    free: '無料',
    paid: '有料',
    browseProfiles: 'プロフィール閲覧',
    sendLikes: 'いいね送信（1日10回）',
    footprints: '足跡を残す・確認する',
    receiveMessages: 'メッセージの受信',
    sendMessages: 'メッセージの送信・返信',
    choosePlan: 'プランを選択',
    popular: 'おすすめ',
    perMonth: '/月',
    savings: 'お得',
    subscribe: 'このプランで始める',
    managePlan: '現在ご利用中のプランを管理する',
    currentPlanNote: '有料プランをご利用中です',
    processingPayment: '処理中...',
    monthly: '月額',
    threeMonth: '3ヶ月（おすすめ）',
    sixMonth: '6ヶ月',
    yearly: '年間',
    sakuraTitle: '🌸 さくらいいね',
    sakuraDesc1: 'お相手の「お相手から」一覧の上位に、特別に表示されます。',
    sakuraDesc2: '一言メッセージを添えられます（年齢確認済み・有料プラン会員のみ）。',
    sakuraBalance: '残り',
    sakuraUnit: '個',
    sakuraNextExpiry: '次の失効日',
    sakuraPack1: '1個',
    sakuraPack5: '5個',
    sakuraPack30: '30個',
    sakuraPerUnit: '1個あたり',
    sakuraBuy: '購入する',
    sakuraNotice: '有効期限は購入から180日です。未使用分・期限切れ分の返金はできません。',
    sakuraPurchaseError: '購入手続きを開始できませんでした。時間をおいて再度お試しください。',
  },
  en: {
    title: 'Pricing Plans',
    back: 'Back',
    freeMember: 'Free Member',
    paidMember: 'Paid Member',
    featureComparison: 'Feature Comparison',
    feature: 'Feature',
    free: 'Free',
    paid: 'Paid',
    browseProfiles: 'Browse Profiles',
    sendLikes: 'Send Likes (10/day)',
    footprints: 'View & Leave Footprints',
    receiveMessages: 'Receive Messages',
    sendMessages: 'Send & Reply to Messages',
    choosePlan: 'Choose a Plan',
    popular: 'Popular',
    perMonth: '/mo',
    savings: 'savings',
    subscribe: 'Get Started',
    managePlan: 'Manage your current plan',
    currentPlanNote: 'You are on a paid plan',
    processingPayment: 'Processing...',
    monthly: 'Monthly',
    threeMonth: '3 Months (Recommended)',
    sixMonth: '6 Months',
    yearly: 'Annual',
    sakuraTitle: '🌸 Sakura Like',
    sakuraDesc1: 'Your like is specially shown at the top of her “Likes received” list.',
    sakuraDesc2: 'You can add a short message (verified age and paid members only).',
    sakuraBalance: 'Remaining',
    sakuraUnit: '',
    sakuraNextExpiry: 'Next expiry',
    sakuraPack1: '1 Like',
    sakuraPack5: '5 Likes',
    sakuraPack30: '30 Likes',
    sakuraPerUnit: 'per like',
    sakuraBuy: 'Buy',
    sakuraNotice: 'Sakura Likes expire 180 days after purchase. Unused or expired Sakura Likes are non-refundable.',
    sakuraPurchaseError: 'Could not start checkout. Please try again later.',
  },
  ko: {
    title: '요금제',
    back: '뒤로',
    freeMember: '무료 회원',
    paidMember: '유료 회원',
    featureComparison: '기능 비교',
    feature: '기능',
    free: '무료',
    paid: '유료',
    browseProfiles: '프로필 열람',
    sendLikes: '좋아요 보내기（하루 10회）',
    footprints: '발자국 남기기・확인하기',
    receiveMessages: '메시지 수신',
    sendMessages: '메시지 보내기・답장',
    choosePlan: '플랜 선택',
    popular: '추천',
    perMonth: '/월',
    savings: '절약',
    subscribe: '시작하기',
    managePlan: '현재 이용 중인 플랜 관리',
    currentPlanNote: '유료 플랜을 이용 중입니다',
    processingPayment: '처리 중...',
    monthly: '월정액',
    threeMonth: '3개월（추천）',
    sixMonth: '6개월',
    yearly: '연간',
    sakuraTitle: '🌸 사쿠라 좋아요',
    sakuraDesc1: '상대방의 「받은 좋아요」 목록 상단에 특별히 표시됩니다.',
    sakuraDesc2: '한마디 메시지를 함께 보낼 수 있습니다(연령 확인 완료・유료 플랜 회원 한정).',
    sakuraBalance: '남은 개수',
    sakuraUnit: '개',
    sakuraNextExpiry: '다음 만료일',
    sakuraPack1: '1개',
    sakuraPack5: '5개',
    sakuraPack30: '30개',
    sakuraPerUnit: '1개당',
    sakuraBuy: '구매하기',
    sakuraNotice: '유효기간은 구매일로부터 180일입니다. 미사용분・만료분은 환불되지 않습니다.',
    sakuraPurchaseError: '결제를 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  },
  'zh-tw': {
    title: '定價方案',
    back: '返回',
    freeMember: '免費會員',
    paidMember: '付費會員',
    featureComparison: '功能比較',
    feature: '功能',
    free: '免費',
    paid: '付費',
    browseProfiles: '瀏覽個人資料',
    sendLikes: '發送喜歡（每日10次）',
    footprints: '留下・確認足跡',
    receiveMessages: '接收訊息',
    sendMessages: '發送・回覆訊息',
    choosePlan: '選擇方案',
    popular: '推薦',
    perMonth: '/月',
    savings: '優惠',
    subscribe: '立即開始',
    managePlan: '管理目前使用中的方案',
    currentPlanNote: '您正在使用付費方案',
    processingPayment: '處理中...',
    monthly: '月費',
    threeMonth: '3個月（推薦）',
    sixMonth: '6個月',
    yearly: '年費',
    sakuraTitle: '🌸 櫻花讚',
    sakuraDesc1: '會特別顯示在對方「收到的讚」列表的最上方。',
    sakuraDesc2: '可附上一句話留言（僅限已完成年齡驗證的付費方案會員）。',
    sakuraBalance: '剩餘',
    sakuraUnit: '個',
    sakuraNextExpiry: '下次到期日',
    sakuraPack1: '1個',
    sakuraPack5: '5個',
    sakuraPack30: '30個',
    sakuraPerUnit: '每個',
    sakuraBuy: '購買',
    sakuraNotice: '有效期限為購買日起180天。未使用及已過期的部分恕不退款。',
    sakuraPurchaseError: '無法開始結帳，請稍後再試。',
  },
}

const plans = [
  {
    id: 'monthly',
    labelKey: 'monthly',
    price: '$29.99',
    period: '/月',
    periodEn: '/month',
    perMonth: '$29.99/月',
    perMonthEn: '$29.99/mo',
    savings: null,
    popular: false,
  },
  {
    id: '3month',
    labelKey: 'threeMonth',
    price: '$74.97',
    period: '/3ヶ月',
    periodEn: '/3 months',
    perMonth: '$24.99/月',
    perMonthEn: '$24.99/mo',
    savings: '約17%お得',
    savingsEn: '~17% savings',
    popular: true,
  },
  {
    id: '6month',
    labelKey: 'sixMonth',
    price: '$134.94',
    period: '/6ヶ月',
    periodEn: '/6 months',
    perMonth: '$22.49/月',
    perMonthEn: '$22.49/mo',
    savings: '約25%お得',
    savingsEn: '~25% savings',
    popular: false,
  },
  {
    id: 'yearly',
    labelKey: 'yearly',
    price: '$215.88',
    period: '/年',
    periodEn: '/year',
    perMonth: '$17.99/月',
    perMonthEn: '$17.99/mo',
    savings: '約40%お得',
    savingsEn: '~40% savings',
    popular: false,
  },
]

// 段階3-2: さくらいいね回数券（表示価格は既存プランと同じく直書き。Stripe の Price と揃えること）
const sakuraPacks = [
  { pack: 1, labelKey: 'sakuraPack1', price: '$3.99', perUnit: '$3.99' },
  { pack: 5, labelKey: 'sakuraPack5', price: '$13.99', perUnit: '$2.80' },
  { pack: 30, labelKey: 'sakuraPack30', price: '$49.99', perUnit: '$1.67' },
] as const

const DATE_LOCALES: Record<string, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  ko: 'ko-KR',
  'zh-tw': 'zh-TW',
}

const features = [
  { key: 'browseProfiles', free: true, paid: true },
  { key: 'sendLikes', free: true, paid: true },
  { key: 'footprints', free: true, paid: true },
  { key: 'receiveMessages', free: true, paid: true },
  { key: 'sendMessages', free: false, paid: true },
]

function PlansContent() {
  const { user } = useAuth()
  const router = useRouter()
  const { currentLanguage } = useLanguage()
  const [hasSubscription, setHasSubscription] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState('3month')
  const [isProcessing, setIsProcessing] = useState(false)
  // さくらいいね回数券
  const [sakuraBalance, setSakuraBalance] = useState<number | null>(null)
  const [sakuraNextExpiry, setSakuraNextExpiry] = useState<string | null>(null)
  const [sakuraProcessingPack, setSakuraProcessingPack] = useState<number | null>(null)

  const supabase = createClient()

  const t = (key: string) => {
    const dict = translations[currentLanguage] || translations['ja']
    return dict[key] || translations['ja'][key] || key
  }

  const isJa = currentLanguage === 'ja'

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setIsLoading(false)
        return
      }

      try {
        // Check gender/nationality - redirect if Japanese female
        const { data: profile } = await supabase
          .from('profiles')
          .select('gender, nationality')
          .eq('id', user.id)
          .single()

        if (profile?.gender === 'female') {
          router.push('/mypage')
          return
        }

        // Check subscription
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()

        setHasSubscription(!!subData)
      } catch {
        // continue
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user])

  // さくらいいね: 残り枚数と次の失効日
  useEffect(() => {
    if (!user?.id) return
    const loadSakuraBalance = async () => {
      try {
        const res = await fetch('/api/sakura/balance', { cache: 'no-store', credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        setSakuraBalance(typeof data.balance === 'number' ? data.balance : 0)
        setSakuraNextExpiry(data.next_expiry ?? null)
      } catch (e) {
        console.error('[plans] sakura balance fetch error:', e)
      }
    }
    loadSakuraBalance()
  }, [user])

  // /mypage/plans#sakura で遷移してきた場合、読み込み完了後にさくらいいね欄へスクロール
  useEffect(() => {
    if (isLoading) return
    if (typeof window !== 'undefined' && window.location.hash === '#sakura') {
      document.getElementById('sakura')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isLoading])

  const handleSakuraPurchase = async (pack: number) => {
    if (sakuraProcessingPack !== null) return
    setSakuraProcessingPack(pack)
    try {
      const res = await fetch('/api/stripe/create-sakura-checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      alert(t('sakuraPurchaseError'))
    } catch {
      alert(t('sakuraPurchaseError'))
    } finally {
      setSakuraProcessingPack(null)
    }
  }

  const handleSubscribe = async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ planType: selectedPlan }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // error handling
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Sidebar className="w-64 hidden md:block" />

      {/* Header */}
      <div
        className="md:ml-64 shadow-sm sticky top-0 z-10"
        style={{ backgroundColor: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/mypage')}
            style={{ color: 'var(--color-text-sub)' }}
            className="hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-shippori text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            {t('title')}
          </h1>
        </div>
      </div>

      <div className="md:ml-64 pb-12">
        <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">

          {/* Subscription Status Badge */}
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5" style={{ color: hasSubscription ? '#8b1a2e' : 'var(--color-text-sub)' }} />
            <span
              className="text-sm font-medium px-3 py-1 rounded-full"
              style={{
                backgroundColor: hasSubscription ? '#fdf6ef' : '#ede0d4',
                color: hasSubscription ? '#8b1a2e' : 'var(--color-text-sub)',
                border: hasSubscription ? '1px solid #d4a89a' : '1px solid #c9a96e',
              }}
            >
              {hasSubscription ? `✓ ${t('paidMember')}` : t('freeMember')}
            </span>
          </div>

          {/* Feature Comparison Table */}
          <div className="app-card overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="font-shippori text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                {t('featureComparison')}
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#fdf6ef' }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-sub)', width: '60%' }}>
                    {t('feature')}
                  </th>
                  <th className="text-center px-3 py-3 font-medium" style={{ color: 'var(--color-text-sub)' }}>
                    {t('free')}
                  </th>
                  <th className="text-center px-3 py-3 font-medium" style={{ color: '#8b1a2e' }}>
                    {t('paid')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, idx) => (
                  <tr
                    key={feature.key}
                    style={{ borderTop: idx > 0 ? '1px solid var(--color-border)' : undefined }}
                  >
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                      {t(feature.key)}
                    </td>
                    <td className="text-center px-3 py-3">
                      {feature.free ? (
                        <Check className="w-5 h-5 mx-auto text-green-500" />
                      ) : (
                        <X className="w-5 h-5 mx-auto text-gray-300" />
                      )}
                    </td>
                    <td className="text-center px-3 py-3">
                      {feature.paid ? (
                        <Check className="w-5 h-5 mx-auto" style={{ color: '#8b1a2e' }} />
                      ) : (
                        <X className="w-5 h-5 mx-auto text-gray-300" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Plan Cards */}
          {!hasSubscription && (
            <div>
              <h2 className="font-shippori text-base font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                {t('choosePlan')}
              </h2>
              <div className="space-y-3">
                {plans.map((plan) => {
                  const isSelected = selectedPlan === plan.id
                  const savingsText = isJa ? plan.savings : plan.savingsEn
                  const periodText = isJa ? plan.period : plan.periodEn
                  const perMonthText = isJa ? plan.perMonth : plan.perMonthEn

                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className="w-full text-left rounded-2xl p-4 transition-all"
                      style={{
                        backgroundColor: 'var(--color-bg-card)',
                        border: isSelected ? '2px solid #8b1a2e' : '1px solid var(--color-border)',
                        boxShadow: isSelected ? '0 2px 8px rgba(139,26,46,0.12)' : undefined,
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-shippori font-semibold text-base" style={{ color: 'var(--color-text)' }}>
                            {t(plan.labelKey)}
                          </span>
                          {plan.popular && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: '#8b1a2e', color: '#fff' }}
                            >
                              {t('popular')}
                            </span>
                          )}
                          {savingsText && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#fdf6ef', color: '#8b1a2e', border: '1px solid #d4a89a' }}
                            >
                              {savingsText}
                            </span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className="text-lg font-bold" style={{ color: '#8b1a2e' }}>
                            {plan.price}
                          </span>
                          <span className="text-sm" style={{ color: 'var(--color-text-sub)' }}>
                            {periodText}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-sub)' }}>
                        {perMonthText}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* Subscribe Button */}
              <button
                onClick={handleSubscribe}
                disabled={isProcessing}
                className="w-full mt-5 btn-primary py-4 rounded-full font-medium text-base transition-opacity disabled:opacity-60"
                style={{ letterSpacing: '0.08em' }}
              >
                {isProcessing ? t('processingPayment') : t('subscribe')}
              </button>
            </div>
          )}

          {/* Already subscribed */}
          {hasSubscription && (
            <div className="app-card p-5 text-center">
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-sub)' }}>
                {t('currentPlanNote')}
              </p>
              <button
                onClick={() => alert('Stripe customer portal coming soon')}
                className="w-full py-3 rounded-full font-medium text-sm border transition-colors"
                style={{
                  color: 'var(--color-text-sub)',
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'transparent',
                }}
              >
                {t('managePlan')}
              </button>
            </div>
          )}

          {/* さくらいいね（段階3-2。サブスクの有無に関係なく表示） */}
          <div id="sakura" className="app-card p-5 mt-6">
            <h2 className="font-shippori text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              {t('sakuraTitle')}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-sub)' }}>{t('sakuraDesc1')}</p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-sub)' }}>{t('sakuraDesc2')}</p>

            {sakuraBalance !== null && (
              <div className="rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: '#fdf6ef', border: '1px solid #d4a89a' }}>
                <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                  {t('sakuraBalance')}: <span className="font-bold" style={{ color: '#8b1a2e' }}>{sakuraBalance}</span>{t('sakuraUnit') ? ` ${t('sakuraUnit')}` : ''}
                </p>
                {sakuraBalance > 0 && sakuraNextExpiry && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-sub)' }}>
                    {t('sakuraNextExpiry')}: {new Date(sakuraNextExpiry).toLocaleDateString(DATE_LOCALES[currentLanguage] ?? 'ja-JP')}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              {sakuraPacks.map((p) => (
                <div
                  key={p.pack}
                  className="flex items-center justify-between rounded-2xl p-4"
                  style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
                >
                  <div>
                    <p className="font-shippori font-semibold text-base" style={{ color: 'var(--color-text)' }}>
                      {t(p.labelKey)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-sub)' }}>
                      {t('sakuraPerUnit')} {p.perUnit}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-lg font-bold" style={{ color: '#8b1a2e' }}>{p.price}</span>
                    <button
                      onClick={() => handleSakuraPurchase(p.pack)}
                      disabled={sakuraProcessingPack !== null}
                      className="btn-primary px-4 py-2 rounded-full text-sm font-medium transition-opacity disabled:opacity-60"
                    >
                      {sakuraProcessingPack === p.pack ? t('processingPayment') : t('sakuraBuy')}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs mt-4" style={{ color: 'var(--color-text-sub)' }}>
              {t('sakuraNotice')}
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function PlansPage() {
  return (
    <AuthGuard>
      <PlansContent />
    </AuthGuard>
  )
}
