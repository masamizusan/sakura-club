'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageSelector } from '@/components/LanguageSelector'
import HeroSlideshow from '@/components/HeroSlideshow'

// ─── 翻訳（全面改訂版） ──────────────────────────────────────────────────────
const T = {
  ja: {
    nav: { howItWorks: 'How It Works', safety: 'Safety & Trust', login: 'ログイン', signup: 'Join Free' },
    heroMainLine1: 'あなたは何しに日本に来るの？',
    heroMainLine2: '日本の日常を、特別な人と。',
    heroSub: '日本を愛する海外の男性と、日本人女性をつなぐ出会いの場。',
    ctaWomen: '日本人女性（無料）',
    ctaMen: '海外の男性として登録',
    alreadyMember: 'すでに登録済みの方はこちら',
    menTag: '海外の男性の方へ',
    menTitle: '日本の中へ、一緒に入ろう。',
    menSub: '一つの出会いから、たくさんの日本が見えてくる。',
    menBody: '観光地では出会えない日本がある。地元の食事、静かな神社、何気ない日常の風景。彼女と一緒だから、初めて見えてくるものがある。',
    menCta: '登録する',
    womenTag: '日本人女性の方へ',
    womenTitleLine1: '日本に興味を持ってくれた彼に、',
    womenTitleLine2: '本当の日本を知ってもらいたい。',
    womenSub: 'おもてなしの心は、あなたの世界も広げていく。',
    womenBody: 'プロのガイドじゃなくていい。あなたの日本を、彼と分かち合って。彼はあなたの日常に興味を持っている。それだけで十分特別。',
    womenCta: '無料で始める',
    howTitle: '出会いから、日本体験へ。',
    step1Title: 'プロフィールを作成',
    step1Body: 'あなたのことを教えてください。好きな場所、興味のある文化、大切にしていること。',
    step2Title: '出会いを見つける',
    step2Body: '日本を愛する海外の男性と、日本人女性をつなぐ出会いの場。',
    step3Title: '本物の日本を体験する',
    step3Body: '彼女を通して、日本はただの旅先以上のものになる。',
    whyTitle: '本物の日本は、一つの出会いから始まる。',
    feature1Title: '安心・安全',
    feature1Body: 'AI審査で身元確認。安心して出会える環境を整えています。',
    feature2Title: '4言語対応',
    feature2Body: '日本語・英語・韓国語・繁体字中国語対応。言語が違っても、気持ちは伝わる。',
    feature3Title: '翻訳機能内蔵',
    feature3Body: 'メッセージを送る前に翻訳確認。あなたの言葉で、彼・彼女に届けよう。',
    feature4Title: '文化交流',
    feature4Body: '観光地じゃない。地元の人が愛する日本を、一緒に。',
    planTitle: 'あなたの日本物語を、始めよう。',
    planFree: '日本人女性は、完全無料。',
    planSub: '一つの出会いから。たくさんの日本が、見えてくる。',
    planMonthly: '月額', plan3month: '3ヶ月', plan6month: '6ヶ月', planYearly: '年額', planPopular: 'おすすめ',
    ctaTitle: 'ここから始まる、\nあなただけの日本。',
    ctaSub: '日本を愛してくれた彼を、あなたの日本へ。',
    footerNav: ['About', 'Safety', 'Privacy', 'Terms'],
  },
  en: {
    nav: { howItWorks: 'How It Works', safety: 'Safety & Trust', login: 'Login', signup: 'Join Free' },
    heroMainLine1: 'Why do you come to Japan?',
    heroMainLine2: 'Experience everyday Japan with someone special.',
    heroSub: 'Step inside Japan, together.',
    ctaWomen: 'Japanese Women (Free)',
    ctaMen: 'Foreign Men (Join)',
    alreadyMember: 'Already a member? Sign in',
    menTag: 'For Foreign Men',
    menTitle: "Let her bring you into it.",
    menSub: 'One encounter. A world of Japan to discover.',
    menBody: "There's a Japan you can't find on tourist maps. Local food, quiet shrines, everyday moments. With her beside you, Japan reveals itself.",
    menCta: 'Get Started',
    womenTag: 'For Japanese Women',
    womenTitleLine1: 'Welcome him — someone who cherishes Japan',
    womenTitleLine2: '— with your own hands.',
    womenSub: 'Connect with him through the spirit of omotenashi.',
    womenBody: "You don't need to be a guide. Just share your Japan with him. He's curious about your everyday life. That's already something special.",
    womenCta: 'Join Free',
    howTitle: 'From connection to experience.',
    step1Title: 'Create Your Profile',
    step1Body: 'Tell us about yourself. Your favorite places, your culture, what matters to you.',
    step2Title: 'Find Your Connection',
    step2Body: 'Where foreign men who love Japan meet Japanese women who want to welcome them.',
    step3Title: 'Experience Real Japan',
    step3Body: 'Through her, Japan becomes more than a destination.',
    whyTitle: 'The real Japan begins with a real connection.',
    feature1Title: 'Verified & Safe',
    feature1Body: 'AI-powered identity verification for a safe and trusted experience.',
    feature2Title: '4 Languages',
    feature2Body: 'Japanese, English, Korean, Traditional Chinese. Feelings translate themselves.',
    feature3Title: 'Built-in Translation',
    feature3Body: 'Preview your message before sending. Your words, delivered naturally.',
    feature4Title: 'Authentic Japan',
    feature4Body: "Not tourist spots. The Japan locals love — shared between two people.",
    planTitle: 'Start Your Japan Story.',
    planFree: "For women, it's always free.",
    planSub: 'One encounter. A world of Japan to discover.',
    planMonthly: 'Monthly', plan3month: '3 Months', plan6month: '6 Months', planYearly: 'Annual', planPopular: 'Popular',
    ctaTitle: 'Your Japan starts here.',
    ctaSub: 'Welcome him — the one who fell in love with Japan — into your Japan.',
    footerNav: ['About', 'Safety', 'Privacy', 'Terms'],
  },
  ko: {
    nav: { howItWorks: '이용 방법', safety: 'Safety & Trust', login: '로그인', signup: '무료 가입' },
    heroMainLine1: '당신은 왜 일본에 오나요?',
    heroMainLine2: '일본의 일상을, 특별한 사람과 함께.',
    heroSub: '일본 안으로, 함께 들어가자.',
    ctaWomen: '일본 여성（무료）',
    ctaMen: '외국인 남성으로 가입',
    alreadyMember: '이미 회원이신가요? 로그인',
    menTag: '외국인 남성 분들께',
    menTitle: '그녀가 일본 안으로 데려가 줄 거예요.',
    menSub: '하나의 만남에서. 수많은 일본이 보이기 시작합니다.',
    menBody: '관광지에서는 만날 수 없는 일본이 있습니다. 현지 음식, 조용한 신사, 일상의 풍경. 그녀와 함께이기에 처음으로 보이는 것들이 있습니다.',
    menCta: '시작하기',
    womenTag: '일본인 여성 분들께',
    womenTitleLine1: '일본을 사랑해준 그를',
    womenTitleLine2: '당신의 손으로 맞이해보세요.',
    womenSub: '오모테나시의 마음으로 그와 연결되세요.',
    womenBody: '전문 가이드가 아니어도 됩니다. 당신의 일본을 그와 나눠보세요. 그는 당신의 일상에 관심을 갖고 있습니다. 그것만으로도 충분히 특별합니다.',
    womenCta: '무료로 시작하기',
    howTitle: '만남에서 일본 체험으로.',
    step1Title: '프로필 만들기',
    step1Body: '당신에 대해 알려주세요. 좋아하는 장소, 관심 있는 문화, 소중히 여기는 것들.',
    step2Title: '만남 찾기',
    step2Body: '일본을 사랑하는 외국인 남성과 그를 맞이하고 싶은 일본 여성이 만나는 곳.',
    step3Title: '진짜 일본 체험하기',
    step3Body: '그녀를 통해 일본은 단순한 여행지 그 이상이 됩니다.',
    whyTitle: '진짜 일본은 진짜 만남에서 시작됩니다.',
    feature1Title: '안심 · 안전',
    feature1Body: 'AI 심사로 신원 확인. 안심하고 만날 수 있는 환경.',
    feature2Title: '4개 언어 지원',
    feature2Body: '일본어·영어·한국어·번체 중국어 지원. 언어가 달라도 마음은 전해집니다.',
    feature3Title: '번역 기능 내장',
    feature3Body: '메시지 전송 전 번역 확인. 당신의 말을 자연스럽게 전달.',
    feature4Title: '문화 교류',
    feature4Body: '관광지가 아닌, 현지인이 사랑하는 일본을 함께.',
    planTitle: '당신의 일본 이야기를 시작하세요.',
    planFree: '여성은 완전 무료입니다.',
    planSub: '하나의 만남에서. 수많은 일본이 보이기 시작합니다.',
    planMonthly: '월간', plan3month: '3개월', plan6month: '6개월', planYearly: '연간', planPopular: '추천',
    ctaTitle: '진짜 일본은 진짜 만남에서 시작됩니다.',
    ctaSub: '일본을 사랑해준 그를, 당신의 일본으로.',
    footerNav: ['About', 'Safety', 'Privacy', 'Terms'],
  },
  'zh-tw': {
    nav: { howItWorks: '使用方式', safety: 'Safety & Trust', login: '登入', signup: '免費加入' },
    heroMainLine1: '你來日本是為了什麼？',
    heroMainLine2: '與特別的人，共享日本的日常。',
    heroSub: '一起走進日本的內裡。',
    ctaWomen: '日本女性（免費）',
    ctaMen: '外籍男性加入',
    alreadyMember: '已是會員？立即登入',
    menTag: '外國男性',
    menTitle: '讓她帶你走進真正的日本。',
    menSub: '一次相遇。無數個日本等你發現。',
    menBody: '有一個日本，是旅遊景點找不到的。當地美食、寧靜神社、日常風景。因為有她在身邊，日本才真正展現自己。',
    menCta: '立即開始',
    womenTag: '日本女性',
    womenTitleLine1: '用你的雙手，',
    womenTitleLine2: '迎接那個愛上日本的他。',
    womenSub: '以款待之心與他連結。',
    womenBody: '不需要是專業導遊。只需將你的日本與他分享。他對你的日常生活感到好奇，這本身就已經很特別了。',
    womenCta: '免費加入',
    howTitle: '從相遇到體驗日本。',
    step1Title: '建立個人檔案',
    step1Body: '告訴我們關於你的事。喜愛的地方、感興趣的文化、珍視的事物。',
    step2Title: '尋找緣分',
    step2Body: '熱愛日本的外國男性，與想要迎接他們的日本女性相遇的地方。',
    step3Title: '體驗真實的日本',
    step3Body: '透過她，日本不再只是一個目的地。',
    whyTitle: '真實的日本，從真實的相遇開始。',
    feature1Title: '安心・安全',
    feature1Body: 'AI審核身份驗證。為您打造安心的相遇環境。',
    feature2Title: '4種語言支援',
    feature2Body: '日語・英語・韓語・繁體中文。語言不同，心意自然傳達。',
    feature3Title: '內建翻譯功能',
    feature3Body: '傳送前確認翻譯。讓你的話自然地傳遞給對方。',
    feature4Title: '文化交流',
    feature4Body: '不是觀光景點。而是當地人所愛的日本，兩人一同分享。',
    planTitle: '開始你的日本故事。',
    planFree: '女性永久免費。',
    planSub: '一次相遇。無數個日本等你發現。',
    planMonthly: '月繳', plan3month: '3個月', plan6month: '6個月', planYearly: '年繳', planPopular: '推薦',
    ctaTitle: '真實的日本，從真實的相遇開始。',
    ctaSub: '將那個愛上日本的他，迎入你的日本。',
    footerNav: ['About', 'Safety', 'Privacy', 'Terms'],
  },
}

// ─── SVG 装飾コンポーネント ───────────────────────────────────────────────────
function BambooSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="0" width="8" height="320" rx="4" fill="#1A1A2E" fillOpacity="0.15" />
      <rect x="11" y="60" width="10" height="4" rx="2" fill="#1A1A2E" fillOpacity="0.2" />
      <rect x="11" y="130" width="10" height="4" rx="2" fill="#1A1A2E" fillOpacity="0.2" />
      <rect x="11" y="200" width="10" height="4" rx="2" fill="#1A1A2E" fillOpacity="0.2" />
      <rect x="11" y="270" width="10" height="4" rx="2" fill="#1A1A2E" fillOpacity="0.2" />
      <rect x="36" y="40" width="7" height="280" rx="3" fill="#1A1A2E" fillOpacity="0.1" />
      <rect x="35" y="100" width="9" height="3" rx="1.5" fill="#1A1A2E" fillOpacity="0.15" />
      <rect x="35" y="180" width="9" height="3" rx="1.5" fill="#1A1A2E" fillOpacity="0.15" />
      <rect x="35" y="260" width="9" height="3" rx="1.5" fill="#1A1A2E" fillOpacity="0.15" />
      <ellipse cx="20" cy="55" rx="14" ry="5" transform="rotate(-35 20 55)" fill="#1A1A2E" fillOpacity="0.12" />
      <ellipse cx="24" cy="125" rx="14" ry="5" transform="rotate(30 24 125)" fill="#1A1A2E" fillOpacity="0.12" />
      <ellipse cx="40" cy="95" rx="12" ry="4" transform="rotate(-25 40 95)" fill="#1A1A2E" fillOpacity="0.1" />
    </svg>
  )
}

function EnsoSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" stroke="#1A1A2E" strokeWidth="6"
        fill="none" strokeDasharray="440 60" strokeLinecap="round"
        transform="rotate(-30 100 100)" />
    </svg>
  )
}

function SakuraSVG({ className = '', color = '#8B2040' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {[0, 72, 144, 216, 288].map((deg, i) => (
        <ellipse key={i} cx="50" cy="30" rx="10" ry="18"
          fill={color} fillOpacity="0.85" transform={`rotate(${deg} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="7" fill={color} fillOpacity="0.5" />
    </svg>
  )
}

// ─── スクロールフェードアップ フック ─────────────────────────────────────────
function useScrollFade() {
  useEffect(() => {
    const els = document.querySelectorAll('.scroll-fade')
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.15 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

type Translations = typeof T.ja

// ─── メインコンポーネント ─────────────────────────────────────────────────────
export default function LandingPage() {
  const { currentLanguage } = useLanguage()
  const t = T[currentLanguage as keyof typeof T] ?? T.en
  useScrollFade()

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: 'var(--color-washi)' }}>
      <Nav t={t} />
      <HeroSection t={t} />
      <SplitSection t={t} />
      <HowItWorksSection t={t} />
      <WhySection t={t} />
      <CtaSection t={t} />
      <Footer t={t} />
    </div>
  )
}

// ─── ナビゲーション ───────────────────────────────────────────────────────────
function Nav({ t }: { t: Translations }) {
  const [open, setOpen] = useState(false)

  return (
    <header style={{ backgroundColor: 'var(--color-washi)', borderBottom: '1px solid var(--color-gold)' }}
      className="sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-cormorant font-light text-2xl"
          style={{ color: 'var(--color-sumi)', letterSpacing: '0.25em' }}>
          SAKURA CLUB
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#how" className="font-zen-kaku text-sm transition-opacity hover:opacity-60"
            style={{ color: 'var(--color-usuzumi)', fontWeight: 300, letterSpacing: '0.08em' }}>{t.nav.howItWorks}</a>
          <a href="#why" className="font-zen-kaku text-sm transition-opacity hover:opacity-60"
            style={{ color: 'var(--color-usuzumi)', fontWeight: 300, letterSpacing: '0.08em' }}>{t.nav.safety}</a>
          <LanguageSelector variant="light" size="sm" showIcon={false} />
          {/*
            上段ヘッダーは「再訪ユーザー専用エリア」として深紅アウトライン Login のみ。
            新規登録動線（Join Free）はヒーロー中央CTAに集約。
            参考: kikonclub.com の動線分離パターン。
          */}
          <Link href="/login" className="font-zen-kaku text-sm px-5 py-2 rounded-full transition-colors"
            style={{
              border: '1.5px solid var(--color-beni)',
              color: 'var(--color-beni)',
              backgroundColor: 'transparent',
              fontWeight: 300,
              letterSpacing: '0.08em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(139, 26, 46, 0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
            {t.nav.login}
          </Link>
        </nav>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}
          style={{ color: 'var(--color-sumi)' }}>
          <span className="text-xl">{open ? '✕' : '☰'}</span>
        </button>
      </div>
      {open && (
        <div className="md:hidden px-6 pb-6 space-y-4" style={{ backgroundColor: 'var(--color-washi)' }}>
          <a href="#how" className="block font-zen-kaku text-sm" style={{ color: 'var(--color-usuzumi)', fontWeight: 300, letterSpacing: '0.08em' }}>{t.nav.howItWorks}</a>
          <a href="#why" className="block font-zen-kaku text-sm" style={{ color: 'var(--color-usuzumi)', fontWeight: 300, letterSpacing: '0.08em' }}>{t.nav.safety}</a>
          <div className="pt-2"><LanguageSelector variant="light" size="sm" showIcon={false} /></div>
          {/* モバイルメニューも上段は Login のみ。新規登録は中央CTAへ集約 */}
          <Link href="/login" className="block font-zen-kaku text-sm text-center py-2 rounded-full"
            style={{
              border: '1.5px solid var(--color-beni)',
              color: 'var(--color-beni)',
              backgroundColor: 'transparent',
              fontWeight: 300,
              letterSpacing: '0.08em',
            }}>
            {t.nav.login}
          </Link>
        </div>
      )}
    </header>
  )
}

// ─── SECTION 1：Hero ──────────────────────────────────────────────────────────
function HeroSection({ t }: { t: Translations }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: 'var(--color-washi)' }}>
      {/* 四季の日本庭園 4枚クロスフェードスライドショー（背面） */}
      <HeroSlideshow />
      {/* 竹装飾・左 */}
      <div className="absolute left-0 top-0 h-full w-24 opacity-40 pointer-events-none animate-bamboo">
        <BambooSVG className="h-full w-full" />
      </div>
      {/* 竹装飾・右（反転） */}
      <div className="absolute right-0 top-0 h-full w-24 opacity-30 pointer-events-none animate-bamboo"
        style={{ animationDelay: '0.5s', transform: 'scaleX(-1)' }}>
        <BambooSVG className="h-full w-full" />
      </div>
      {/* 円相・右下 */}
      <div className="absolute bottom-8 right-8 w-48 h-48 opacity-10 pointer-events-none">
        <EnsoSVG className="w-full h-full" />
      </div>
      {/* 「桜」装飾文字 */}
      <div className="absolute top-8 left-16 font-serif-jp text-8xl md:text-9xl pointer-events-none select-none"
        style={{ color: 'var(--color-beni)', opacity: 0.07, lineHeight: 1 }}>
        桜
      </div>
      {/* 金ライン */}
      <div className="absolute bottom-16 right-12 w-24 h-px pointer-events-none"
        style={{ backgroundColor: 'var(--color-gold)' }} />
      <div className="absolute bottom-12 right-8 w-12 h-px pointer-events-none"
        style={{ backgroundColor: 'var(--color-gold)' }} />

      {/* コンテンツ */}
      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        {/* メインキャッチ */}
        <p className="text-2xl md:text-5xl animate-fade-in"
          style={{
            fontFamily: "'Cormorant Garamond', 'Shippori Mincho B1', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 300,
            color: 'var(--color-sumi)',
            letterSpacing: '0.05em',
            lineHeight: 1.7,
          }}>
          <span className="block">{t.heroMainLine1}</span>
          <span className="block">{t.heroMainLine2}</span>
        </p>

        {/* 区切り線 */}
        <div className="w-20 h-px mx-auto my-8 animate-fade-up animate-delay-200"
          style={{ backgroundColor: 'var(--color-gold)' }} />

        {/* サブコピー */}
        <p className="text-base md:text-lg animate-fade-up animate-delay-400"
          style={{
            fontFamily: "'Shippori Mincho B1', var(--font-noto-serif-jp), serif",
            fontWeight: 400,
            color: 'var(--color-beni)',
            letterSpacing: '0.1em',
            lineHeight: 2.0,
          }}>
          {t.heroSub}
        </p>

        {/* CTAボタン */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12 animate-fade-up animate-delay-600">
          <Link href="/signup?gender=female"
            className="font-zen-kaku px-8 py-3 rounded-full text-white text-sm transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-beni)', fontWeight: 300, letterSpacing: '0.08em' }}>
            {t.ctaWomen}
          </Link>
          <Link href="/signup?gender=male"
            className="font-zen-kaku px-8 py-3 rounded-full text-sm transition-opacity hover:opacity-70"
            style={{
              border: '1.5px solid var(--color-gold)',
              color: 'var(--color-sumi)',
              backgroundColor: 'rgba(245, 235, 224, 0.85)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              fontWeight: 300,
              letterSpacing: '0.08em',
            }}>
            {t.ctaMen}
          </Link>
        </div>

        {/* 再訪ユーザー向けログインリンク（kikonclub.com 参考の動線分離） */}
        <div className="text-center mt-6 animate-fade-up animate-delay-600">
          <Link
            href="/login"
            className="font-zen-kaku text-sm underline underline-offset-4 transition-colors hover:no-underline"
            style={{
              color: 'var(--color-beni)',
              fontWeight: 300,
              letterSpacing: '0.05em',
            }}>
            {t.alreadyMember}
          </Link>
          <p className="text-xs mt-3"
            style={{ color: 'var(--color-usuzumi)' }}>
            ※18歳未満の方はご登録いただけません。
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 2：二分割 ────────────────────────────────────────────────────────
function SplitSection({ t }: { t: Translations }) {
  return (
    <section className="scroll-fade">
      <div className="flex flex-col md:flex-row min-h-[520px]">
        {/* 左：外国人男性 */}
        <div className="flex-1 relative flex flex-col justify-center px-10 py-16"
          style={{ backgroundColor: 'rgba(74,103,65,0.07)' }}>
          <div className="absolute top-6 right-6 opacity-20">
            <BambooSVG className="w-12 h-32" />
          </div>
          <span className="font-shippori text-xs tracking-widest mb-4"
            style={{ color: 'var(--color-take)', letterSpacing: '0.12em' }}>{t.menTag}</span>
          <h2 className="font-shippori text-xl md:text-2xl mb-3"
            style={{ color: 'var(--color-sumi)', letterSpacing: '0.05em', lineHeight: 1.7 }}>
            {t.menTitle}
          </h2>
          <p className="font-cormorant italic text-base mb-5"
            style={{ color: 'var(--color-beni)', letterSpacing: '0.05em' }}>
            {t.menSub}
          </p>
          <p className="font-zen-kaku text-sm leading-relaxed mb-8 max-w-sm"
            style={{ color: 'var(--color-usuzumi)', fontWeight: 300, letterSpacing: '0.05em' }}>
            {t.menBody}
          </p>
          <Link href="/signup?gender=male"
            className="font-zen-kaku inline-block w-fit px-7 py-3 rounded-full text-sm text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-beni)', fontWeight: 300, letterSpacing: '0.08em' }}>
            {t.menCta}
          </Link>
        </div>

        {/* 区切り線 */}
        <div className="hidden md:block w-px self-stretch my-8"
          style={{ backgroundColor: 'var(--color-gold)', opacity: 0.4 }} />

        {/* 右：日本人女性 */}
        <div className="flex-1 relative flex flex-col justify-center px-10 py-16"
          style={{ backgroundColor: 'rgba(232,196,204,0.22)' }}>
          <div className="absolute top-6 left-6 opacity-25">
            <SakuraSVG className="w-14 h-14" color="var(--color-beni)" />
          </div>
          <span className="font-shippori text-xs mb-4"
            style={{ color: 'var(--color-beni)', letterSpacing: '0.12em' }}>{t.womenTag}</span>
          <h2 className="font-shippori text-lg md:text-3xl mb-3"
            style={{ color: 'var(--color-sumi)', letterSpacing: '0.08em', lineHeight: 1.7 }}>
            <span className="block">{t.womenTitleLine1}</span>
            <span className="block">{t.womenTitleLine2}</span>
          </h2>
          <p className="font-cormorant italic text-base mb-5"
            style={{ color: 'var(--color-beni)', letterSpacing: '0.05em' }}>
            {t.womenSub}
          </p>
          <p className="font-zen-kaku text-sm leading-relaxed mb-8 max-w-sm"
            style={{ color: 'var(--color-usuzumi)', fontWeight: 300, letterSpacing: '0.05em' }}>
            {t.womenBody}
          </p>
          <Link href="/signup?gender=female"
            className="font-zen-kaku inline-block w-fit px-7 py-3 rounded-full text-sm text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-beni)', fontWeight: 300, letterSpacing: '0.08em' }}>
            {t.womenCta}
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 3：How It Works ──────────────────────────────────────────────────
function HowItWorksSection({ t }: { t: Translations }) {
  const steps = [
    { num: '01', eng: 'Create Your Profile', title: t.step1Title, body: t.step1Body },
    { num: '02', eng: 'Find Your Connection',  title: t.step2Title, body: t.step2Body },
    { num: '03', eng: 'Experience Real Japan', title: t.step3Title, body: t.step3Body },
  ]
  return (
    <section id="how" className="py-24 scroll-fade" style={{ backgroundColor: 'var(--color-sumi)' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="font-cormorant italic text-base mb-2"
            style={{ color: 'var(--color-gold)', fontWeight: 300, letterSpacing: '0.08em' }}>How It Works</p>
          <h2 className="font-shippori text-2xl md:text-3xl"
            style={{ color: '#fff', letterSpacing: '0.1em', lineHeight: 1.7 }}>{t.howTitle}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map(s => (
            <div key={s.num} className="text-center">
              <div className="font-cormorant text-5xl mb-4" style={{ color: 'var(--color-gold)', fontWeight: 300 }}>{s.num}</div>
              <div className="w-px h-10 mx-auto mb-4" style={{ backgroundColor: 'var(--color-gold)', opacity: 0.4 }} />
              <p className="font-cormorant italic text-sm mb-2"
                style={{ color: 'var(--color-gold)', opacity: 0.8, fontWeight: 300, letterSpacing: '0.08em' }}>{s.eng}</p>
              <p className="font-shippori text-base mb-3"
                style={{ color: '#fff', letterSpacing: '0.08em', lineHeight: 1.8 }}>{s.title}</p>
              <p className="font-zen-kaku text-xs leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 300, letterSpacing: '0.05em' }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 4：Why SAKURA CLUB ───────────────────────────────────────────────
function WhySection({ t }: { t: Translations }) {
  const features = [
    { icon: '🪪', title: t.feature1Title, body: t.feature1Body },
    { icon: '🌏', title: t.feature2Title, body: t.feature2Body },
    { icon: '💬', title: t.feature3Title, body: t.feature3Body },
    { icon: '🎋', title: t.feature4Title, body: t.feature4Body },
  ]
  return (
    <section id="why" className="py-24 scroll-fade" style={{ backgroundColor: 'var(--color-washi)' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="font-cormorant italic text-base mb-2"
            style={{ color: 'var(--color-usuzumi)', fontWeight: 300, letterSpacing: '0.08em' }}>
            The real Japan begins with a real connection.
          </p>
          <h2 className="font-cormorant italic text-base md:text-3xl"
            style={{ color: 'var(--color-sumi)', fontWeight: 300, letterSpacing: '0.08em' }}>{t.whyTitle}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map(f => (
            <div key={f.title}
              className="p-6 rounded-lg transition-shadow hover:shadow-md"
              style={{ border: '1px solid var(--color-gold)', backgroundColor: '#fff' }}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-shippori text-base mb-2"
                style={{ color: 'var(--color-sumi)', letterSpacing: '0.08em' }}>
                {f.title}
              </h3>
              <p className="font-zen-kaku text-xs leading-relaxed"
                style={{ color: 'var(--color-usuzumi)', fontWeight: 300, letterSpacing: '0.05em' }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 6：CTA ───────────────────────────────────────────────────────────
function CtaSection({ t }: { t: Translations }) {
  return (
    <section className="relative py-28 overflow-hidden scroll-fade" style={{ backgroundColor: 'var(--color-sumi)' }}>
      <div className="absolute left-0 top-0 h-full w-16 opacity-10 pointer-events-none animate-bamboo">
        <BambooSVG className="h-full w-full" />
      </div>
      <div className="absolute right-0 top-0 h-full w-16 opacity-10 pointer-events-none animate-bamboo"
        style={{ animationDelay: '1s', transform: 'scaleX(-1)' }}>
        <BambooSVG className="h-full w-full" />
      </div>
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        <p className="font-cormorant italic text-3xl md:text-5xl leading-tight mb-4 whitespace-pre-line"
          style={{ color: '#fff', fontWeight: 300, letterSpacing: '0.05em', lineHeight: 1.7 }}>
          {t.ctaTitle}
        </p>
        <div className="w-16 h-px mx-auto my-6" style={{ backgroundColor: 'var(--color-gold)' }} />
        <p className="font-shippori text-sm mb-12"
          style={{ color: 'var(--color-gold)', letterSpacing: '0.1em', lineHeight: 2.0 }}>
          {t.ctaSub}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup?gender=female"
            className="font-zen-kaku px-8 py-3 rounded-full text-white text-sm transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-beni)', fontWeight: 300, letterSpacing: '0.08em' }}>
            {t.ctaWomen}
          </Link>
          <Link href="/signup?gender=male"
            className="font-zen-kaku px-8 py-3 rounded-full text-sm transition-opacity hover:opacity-70"
            style={{ border: '1.5px solid var(--color-gold)', color: 'var(--color-gold)', backgroundColor: 'transparent', fontWeight: 300, letterSpacing: '0.08em' }}>
            {t.ctaMen}
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 7：フッター ──────────────────────────────────────────────────────
function Footer({ t }: { t: Translations }) {
  return (
    <footer className="py-10 px-6" style={{ backgroundColor: '#2A2A3E' }}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <span className="font-cormorant" style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 300, letterSpacing: '0.25em' }}>SAKURA CLUB</span>
        <nav className="flex gap-6">
          {t.footerNav.map(item => (
            <a key={item} href="#" className="font-zen-kaku text-xs transition-opacity hover:opacity-60"
              style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 300, letterSpacing: '0.08em' }}>{item}</a>
          ))}
        </nav>
        <p className="font-zen-kaku text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 300 }}>© 2026 SAKURA CLUB</p>
      </div>
    </footer>
  )
}
