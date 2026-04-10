'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageSelector } from '@/components/LanguageSelector'

// ─── 翻訳 ────────────────────────────────────────────────────────────────────
const T = {
  ja: {
    nav: { howItWorks: '使い方', safety: '安全への取り組み', login: 'ログイン', signup: '新規登録' },
    heroEn: 'Where Japan meets love.',
    heroJa: '日本と恋が出会う場所。',
    subEn: 'Fall for Japan. Fall for her.',
    subJa: '日本に恋をする。そして、彼女に恋をする。',
    ctaWomen: '女性として無料登録',
    ctaMen: '外国人男性として登録',
    forMenTag: '外国人男性の方へ',
    forMenTitle: '日本に恋をする。\nそして、彼女に恋をする。',
    forMenBody: 'プロのガイドではなく、一人の日本人女性があなただけの日本へ連れて行ってくれる。SNSでは見つけられない場所で、予期せぬ恋が始まるかもしれない。',
    forMenBtn: 'Get Started',
    forWomenTag: '日本人女性の方へ',
    forWomenTitle: 'あなたの日本が、\n彼にとって特別な場所になる。',
    forWomenBody: 'プロのガイドじゃなくていい。あなたの好きな場所、あなたの日常が、一人の外国人の心を動かす。そして、それがあなた自身のときめきになる。',
    forWomenBtn: '無料で始める',
    howTitle: '出会いまでの3ステップ',
    step1: 'プロフィール作成',
    step1Sub: 'Create your profile',
    step2: 'マッチング＆発見',
    step2Sub: 'Discover your match',
    step3: 'メッセージ＆出会い',
    step3Sub: 'Start your Japan story',
    whyTitle: 'ガイドブックには\n載っていない日本が、ここにある。',
    whyEn: 'The Japan no guidebook can show you.',
    feat1Title: '本人確認済み',
    feat1Desc: 'AI審査で安全・安心\nVerified & Safe',
    feat2Title: '多言語対応',
    feat2Desc: '日英韓繁体字に対応\n4 Languages',
    feat3Title: '翻訳機能内蔵',
    feat3Desc: '言語の壁を超えて\nBuilt-in Translation',
    feat4Title: '文化交流',
    feat4Desc: '本物の日本体験\nAuthentic Japan',
    planTitle: 'あなたの日本物語を始めよう',
    planEn: 'Start Your Japan Story',
    planMonthly: '月額',
    plan3month: '3ヶ月',
    plan6month: '6ヶ月',
    planYearly: '年額',
    planPopular: 'おすすめ',
    planFreeNote: '日本人女性は完全無料でご利用いただけます',
    ctaFinalEn: 'Your Japan story starts here.',
    ctaFinalJa: 'あなたの日本物語は、ここから始まる。',
    footerNav: ['About', 'Safety', 'Privacy', 'Terms'],
  },
  en: {
    nav: { howItWorks: 'How It Works', safety: 'Safety', login: 'Login', signup: 'Sign Up' },
    heroEn: 'Where Japan meets love.',
    heroJa: 'The place where Japan and love come together.',
    subEn: 'Fall for Japan. Fall for her.',
    subJa: 'Fall in love with Japan. Fall in love with her.',
    ctaWomen: 'Join Free as a Woman',
    ctaMen: 'Join as a Man',
    forMenTag: 'For Foreign Men',
    forMenTitle: 'Fall for Japan.\nFall for her.',
    forMenBody: "Not a professional guide — a real Japanese woman who'll take you to her Japan. In places no tourist finds. Where unexpected love begins.",
    forMenBtn: 'Get Started',
    forWomenTag: 'For Japanese Women',
    forWomenTitle: 'Your Japan becomes\nhis favorite place.',
    forWomenBody: "You don't need to be a guide. Your favorite places, your everyday life — they move a foreigner's heart. And that becomes your own excitement.",
    forWomenBtn: 'Join Free',
    howTitle: '3 Simple Steps',
    step1: 'Create Profile',
    step1Sub: 'プロフィール作成',
    step2: 'Discover & Match',
    step2Sub: 'マッチング＆発見',
    step3: 'Message & Meet',
    step3Sub: 'メッセージ＆出会い',
    whyTitle: 'The Japan no guidebook\ncan show you.',
    whyEn: 'ガイドブックには載っていない日本が、ここにある。',
    feat1Title: 'Verified Members',
    feat1Desc: 'AI-powered ID verification\n本人確認済み',
    feat2Title: '4 Languages',
    feat2Desc: 'JA · EN · KO · ZH-TW\n多言語対応',
    feat3Title: 'Built-in Translation',
    feat3Desc: 'No language barrier\n翻訳機能内蔵',
    feat4Title: 'Authentic Japan',
    feat4Desc: 'Real cultural experiences\n文化交流',
    planTitle: 'Start Your Japan Story',
    planEn: 'あなたの日本物語を始めよう',
    planMonthly: 'Monthly',
    plan3month: '3 Months',
    plan6month: '6 Months',
    planYearly: 'Annual',
    planPopular: 'Popular',
    planFreeNote: 'Japanese women join completely free',
    ctaFinalEn: 'Your Japan story starts here.',
    ctaFinalJa: 'あなたの日本物語は、ここから始まる。',
    footerNav: ['About', 'Safety', 'Privacy', 'Terms'],
  },
  ko: {
    nav: { howItWorks: '이용 방법', safety: '안전', login: '로그인', signup: '회원가입' },
    heroEn: 'Where Japan meets love.',
    heroJa: '일본과 사랑이 만나는 곳.',
    subEn: 'Fall for Japan. Fall for her.',
    subJa: '일본에 반하다. 그녀에게 반하다.',
    ctaWomen: '여성으로 무료 가입',
    ctaMen: '외국인 남성으로 가입',
    forMenTag: '외국인 남성 분들께',
    forMenTitle: '일본에 반하다.\n그녀에게 반하다.',
    forMenBody: '전문 가이드가 아닌, 한 명의 일본 여성이 당신만의 일본으로 데려가 줍니다. SNS에서는 찾을 수 없는 장소에서, 예상치 못한 사랑이 시작될지도 모릅니다.',
    forMenBtn: 'Get Started',
    forWomenTag: '일본인 여성 분들께',
    forWomenTitle: '당신의 일본이\n그에게 특별한 장소가 됩니다.',
    forWomenBody: '전문 가이드가 아니어도 됩니다. 당신이 좋아하는 장소, 당신의 일상이 한 외국인의 마음을 움직입니다. 그리고 그것이 당신 자신의 설렘이 됩니다.',
    forWomenBtn: '무료로 시작',
    howTitle: '3단계로 시작',
    step1: '프로필 만들기',
    step1Sub: 'Create Profile',
    step2: '매칭 & 발견',
    step2Sub: 'Discover & Match',
    step3: '메시지 & 만남',
    step3Sub: 'Message & Meet',
    whyTitle: '가이드북에는 없는\n일본이 여기에 있습니다.',
    whyEn: 'The Japan no guidebook can show you.',
    feat1Title: '본인 확인 완료',
    feat1Desc: 'AI 심사로 안심·안전\nVerified & Safe',
    feat2Title: '다국어 지원',
    feat2Desc: '일영한중(번체)에 대응\n4 Languages',
    feat3Title: '번역 기능 내장',
    feat3Desc: '언어 장벽 없이 소통\nBuilt-in Translation',
    feat4Title: '문화 교류',
    feat4Desc: '진짜 일본 체험\nAuthentic Japan',
    planTitle: '당신의 일본 이야기를 시작하세요',
    planEn: 'Start Your Japan Story',
    planMonthly: '월간',
    plan3month: '3개월',
    plan6month: '6개월',
    planYearly: '연간',
    planPopular: '추천',
    planFreeNote: '일본인 여성은 완전 무료로 이용 가능합니다',
    ctaFinalEn: 'Your Japan story starts here.',
    ctaFinalJa: '당신의 일본 이야기는 여기서 시작됩니다.',
    footerNav: ['About', 'Safety', 'Privacy', 'Terms'],
  },
  'zh-tw': {
    nav: { howItWorks: '使用方式', safety: '安全保障', login: '登入', signup: '註冊' },
    heroEn: 'Where Japan meets love.',
    heroJa: '日本與愛相遇的地方。',
    subEn: 'Fall for Japan. Fall for her.',
    subJa: '愛上日本。愛上她。',
    ctaWomen: '以女性身份免費註冊',
    ctaMen: '以外國男性身份註冊',
    forMenTag: '外國男性',
    forMenTitle: '愛上日本。\n愛上她。',
    forMenBody: '不是專業導遊，而是一位日本女性帶你去她的日本。在社群媒體找不到的地方，意想不到的愛情或許就此開始。',
    forMenBtn: 'Get Started',
    forWomenTag: '日本女性',
    forWomenTitle: '你的日本，因為有你，\n成為他最特別的地方。',
    forWomenBody: '不需要是專業導遊。你喜愛的地方、你的日常，都能打動一位外國人的心。這也將成為你自己的怦然心動。',
    forWomenBtn: '免費開始',
    howTitle: '三個簡單步驟',
    step1: '建立個人檔案',
    step1Sub: 'Create Profile',
    step2: '探索與配對',
    step2Sub: 'Discover & Match',
    step3: '訊息與相遇',
    step3Sub: 'Message & Meet',
    whyTitle: '這裡有\n導覽書找不到的日本。',
    whyEn: 'The Japan no guidebook can show you.',
    feat1Title: '身份驗證完成',
    feat1Desc: 'AI審查安心安全\nVerified & Safe',
    feat2Title: '多語言支援',
    feat2Desc: '日英韓繁四語對應\n4 Languages',
    feat3Title: '內建翻譯功能',
    feat3Desc: '跨越語言障礙\nBuilt-in Translation',
    feat4Title: '文化交流',
    feat4Desc: '體驗真正的日本\nAuthentic Japan',
    planTitle: '開始你的日本故事',
    planEn: 'Start Your Japan Story',
    planMonthly: '月繳',
    plan3month: '3個月',
    plan6month: '6個月',
    planYearly: '年繳',
    planPopular: '推薦',
    planFreeNote: '日本女性完全免費使用',
    ctaFinalEn: 'Your Japan story starts here.',
    ctaFinalJa: '你的日本故事從這裡開始。',
    footerNav: ['About', 'Safety', 'Privacy', 'Terms'],
  },
}

// ─── SVG 装飾コンポーネント ───────────────────────────────────────────────────
function BambooSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 320" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 竹1本目 */}
      <rect x="12" y="0" width="8" height="320" rx="4" fill="#1A1A2E" fillOpacity="0.15" />
      <rect x="11" y="60" width="10" height="4" rx="2" fill="#1A1A2E" fillOpacity="0.2" />
      <rect x="11" y="130" width="10" height="4" rx="2" fill="#1A1A2E" fillOpacity="0.2" />
      <rect x="11" y="200" width="10" height="4" rx="2" fill="#1A1A2E" fillOpacity="0.2" />
      <rect x="11" y="270" width="10" height="4" rx="2" fill="#1A1A2E" fillOpacity="0.2" />
      {/* 竹2本目 */}
      <rect x="36" y="40" width="7" height="280" rx="3" fill="#1A1A2E" fillOpacity="0.1" />
      <rect x="35" y="100" width="9" height="3" rx="1.5" fill="#1A1A2E" fillOpacity="0.15" />
      <rect x="35" y="180" width="9" height="3" rx="1.5" fill="#1A1A2E" fillOpacity="0.15" />
      <rect x="35" y="260" width="9" height="3" rx="1.5" fill="#1A1A2E" fillOpacity="0.15" />
      {/* 葉 */}
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
        <ellipse key={i}
          cx="50" cy="30" rx="10" ry="18"
          fill={color} fillOpacity="0.85"
          transform={`rotate(${deg} 50 50)`}
        />
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
      <PricingSection t={t} />
      <CtaSection t={t} />
      <Footer t={t} />
    </div>
  )
}

// ─── ナビゲーション ───────────────────────────────────────────────────────────
type Translations = typeof T.ja
function Nav({ t }: { t: Translations }) {
  const [open, setOpen] = useState(false)

  return (
    <header style={{ backgroundColor: 'var(--color-washi)', borderBottom: '1px solid var(--color-gold)' }}
      className="sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* ロゴ */}
        <Link href="/" className="font-cormorant text-2xl font-light tracking-widest"
          style={{ color: 'var(--color-sumi)' }}>
          SAKURA CLUB
        </Link>

        {/* デスクトップナビ */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#how" className="text-sm tracking-wide transition-opacity hover:opacity-60"
            style={{ color: 'var(--color-usuzumi)' }}>{t.nav.howItWorks}</a>
          <a href="#why" className="text-sm tracking-wide transition-opacity hover:opacity-60"
            style={{ color: 'var(--color-usuzumi)' }}>{t.nav.safety}</a>
          <LanguageSelector variant="light" size="sm" showIcon={false} />
          <Link href="/login" className="text-sm tracking-wide transition-opacity hover:opacity-60"
            style={{ color: 'var(--color-sumi)' }}>{t.nav.login}</Link>
          <Link href="/signup" className="text-sm px-5 py-2 rounded-full text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-beni)' }}>{t.nav.signup}</Link>
        </nav>

        {/* モバイルハンバーガー */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}
          style={{ color: 'var(--color-sumi)' }}>
          <span className="text-xl">{open ? '✕' : '☰'}</span>
        </button>
      </div>

      {open && (
        <div className="md:hidden px-6 pb-6 space-y-4" style={{ backgroundColor: 'var(--color-washi)' }}>
          <a href="#how" className="block text-sm" style={{ color: 'var(--color-usuzumi)' }}>{t.nav.howItWorks}</a>
          <a href="#why" className="block text-sm" style={{ color: 'var(--color-usuzumi)' }}>{t.nav.safety}</a>
          <div className="pt-2"><LanguageSelector variant="light" size="sm" showIcon={false} /></div>
          <Link href="/login" className="block text-sm" style={{ color: 'var(--color-sumi)' }}>{t.nav.login}</Link>
          <Link href="/signup"
            className="block text-sm text-center py-2 rounded-full text-white"
            style={{ backgroundColor: 'var(--color-beni)' }}>{t.nav.signup}</Link>
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

      {/* 竹装飾・左 */}
      <div className="absolute left-0 top-0 h-full w-24 opacity-40 pointer-events-none animate-bamboo">
        <BambooSVG className="h-full w-full" />
      </div>
      {/* 竹装飾・右（反転） */}
      <div className="absolute right-0 top-0 h-full w-24 opacity-30 pointer-events-none animate-bamboo" style={{ animationDelay: '0.5s', transform: 'scaleX(-1)' }}>
        <BambooSVG className="h-full w-full" />
      </div>

      {/* 円相・右下 */}
      <div className="absolute bottom-8 right-8 w-48 h-48 opacity-10 pointer-events-none">
        <EnsoSVG className="w-full h-full" />
      </div>

      {/* 「桜」装飾文字・左上 */}
      <div className="absolute top-8 left-16 font-serif-jp text-8xl md:text-9xl pointer-events-none select-none"
        style={{ color: 'var(--color-beni)', opacity: 0.07, lineHeight: 1 }}>
        桜
      </div>

      {/* 金ライン・右下 */}
      <div className="absolute bottom-16 right-12 w-24 h-px pointer-events-none"
        style={{ backgroundColor: 'var(--color-gold)' }} />
      <div className="absolute bottom-12 right-8 w-12 h-px pointer-events-none"
        style={{ backgroundColor: 'var(--color-gold)' }} />

      {/* コンテンツ */}
      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        {/* 英語キャッチ */}
        <p className="font-cormorant italic text-4xl md:text-6xl animate-fade-in"
          style={{ color: 'var(--color-sumi)', letterSpacing: '0.02em' }}>
          {t.heroEn}
        </p>

        {/* 日本語サブ */}
        <p className="font-serif-jp text-base md:text-lg mt-3 animate-fade-up animate-delay-200"
          style={{ color: 'var(--color-usuzumi)' }}>
          {t.heroJa}
        </p>

        {/* 区切り線 */}
        <div className="w-20 h-px mx-auto my-8 animate-fade-up animate-delay-400"
          style={{ backgroundColor: 'var(--color-gold)' }} />

        {/* サブコピー英語 */}
        <p className="font-cormorant text-2xl md:text-3xl animate-fade-up animate-delay-400"
          style={{ color: 'var(--color-beni)' }}>
          {t.subEn}
        </p>

        {/* サブコピー日本語 */}
        <p className="font-serif-jp text-sm mt-2 animate-fade-up animate-delay-600"
          style={{ color: 'var(--color-usuzumi)' }}>
          {t.subJa}
        </p>

        {/* CTAボタン */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12 animate-fade-up animate-delay-600">
          <Link href="/signup?gender=female"
            className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-wider transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-beni)' }}>
            {t.ctaWomen}
          </Link>
          <Link href="/signup?gender=male"
            className="px-8 py-3 rounded-full text-sm font-medium tracking-wider transition-opacity hover:opacity-70"
            style={{ border: '1.5px solid var(--color-gold)', color: 'var(--color-sumi)', backgroundColor: 'transparent' }}>
            {t.ctaMen}
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 2：二分割 ────────────────────────────────────────────────────────
function SplitSection({ t }: { t: Translations }) {
  return (
    <section className="scroll-fade">
      <div className="flex flex-col md:flex-row min-h-[480px]">
        {/* 左：外国人男性 */}
        <div className="flex-1 relative flex flex-col justify-center px-10 py-16"
          style={{ backgroundColor: 'rgba(74,103,65,0.07)' }}>
          <div className="absolute top-6 right-6 opacity-20">
            <BambooSVG className="w-12 h-32" />
          </div>
          <span className="font-serif-jp text-xs tracking-widest mb-4"
            style={{ color: 'var(--color-take)' }}>{t.forMenTag}</span>
          <h2 className="font-cormorant text-3xl md:text-4xl leading-tight whitespace-pre-line mb-6"
            style={{ color: 'var(--color-sumi)' }}>
            {t.forMenTitle}
          </h2>
          <p className="text-sm leading-relaxed mb-8 max-w-sm"
            style={{ color: 'var(--color-usuzumi)' }}>
            {t.forMenBody}
          </p>
          <Link href="/signup?gender=male"
            className="inline-block w-fit px-7 py-3 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-beni)' }}>
            {t.forMenBtn}
          </Link>
        </div>

        {/* 区切り線 */}
        <div className="hidden md:block w-px self-stretch my-8" style={{ backgroundColor: 'var(--color-gold)', opacity: 0.4 }} />

        {/* 右：日本人女性 */}
        <div className="flex-1 relative flex flex-col justify-center px-10 py-16"
          style={{ backgroundColor: 'rgba(232,196,204,0.22)' }}>
          <div className="absolute top-6 left-6 opacity-25">
            <SakuraSVG className="w-14 h-14" color="var(--color-beni)" />
          </div>
          <span className="font-serif-jp text-xs tracking-widest mb-4"
            style={{ color: 'var(--color-beni)' }}>{t.forWomenTag}</span>
          <h2 className="font-serif-jp text-2xl md:text-3xl leading-relaxed whitespace-pre-line mb-6"
            style={{ color: 'var(--color-sumi)' }}>
            {t.forWomenTitle}
          </h2>
          <p className="text-sm leading-relaxed mb-8 max-w-sm"
            style={{ color: 'var(--color-usuzumi)' }}>
            {t.forWomenBody}
          </p>
          <Link href="/signup?gender=female"
            className="inline-block w-fit px-7 py-3 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-beni)' }}>
            {t.forWomenBtn}
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 3：How It Works ──────────────────────────────────────────────────
function HowItWorksSection({ t }: { t: Translations }) {
  const steps = [
    { num: '01', main: t.step1, sub: t.step1Sub, icon: '✦' },
    { num: '02', main: t.step2, sub: t.step2Sub, icon: '✦' },
    { num: '03', main: t.step3, sub: t.step3Sub, icon: '✦' },
  ]
  return (
    <section id="how" className="py-24 scroll-fade" style={{ backgroundColor: 'var(--color-sumi)' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="font-cormorant italic text-base mb-2" style={{ color: 'var(--color-gold)' }}>How It Works</p>
          <h2 className="font-serif-jp text-2xl md:text-3xl" style={{ color: '#fff' }}>{t.howTitle}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map(s => (
            <div key={s.num} className="text-center">
              <div className="font-cormorant text-5xl mb-4" style={{ color: 'var(--color-gold)' }}>{s.num}</div>
              {/* 水墨画風細線アイコン */}
              <div className="w-px h-12 mx-auto mb-4" style={{ backgroundColor: 'var(--color-gold)', opacity: 0.4 }} />
              <p className="font-serif-jp text-lg font-medium mb-1" style={{ color: '#fff' }}>{s.main}</p>
              <p className="font-cormorant italic text-sm" style={{ color: 'var(--color-gold)', opacity: 0.8 }}>{s.sub}</p>
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
    { icon: '🪪', title: t.feat1Title, desc: t.feat1Desc },
    { icon: '🌏', title: t.feat2Title, desc: t.feat2Desc },
    { icon: '💬', title: t.feat3Title, desc: t.feat3Desc },
    { icon: '🎋', title: t.feat4Title, desc: t.feat4Desc },
  ]
  return (
    <section id="why" className="py-24 scroll-fade" style={{ backgroundColor: 'var(--color-washi)' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="font-cormorant italic text-base mb-2" style={{ color: 'var(--color-usuzumi)' }}>{t.whyEn}</p>
          <h2 className="font-serif-jp text-2xl md:text-3xl whitespace-pre-line leading-relaxed"
            style={{ color: 'var(--color-sumi)' }}>{t.whyTitle}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map(f => (
            <div key={f.title}
              className="p-6 rounded-lg transition-shadow hover:shadow-md"
              style={{ border: '1px solid var(--color-gold)', backgroundColor: '#fff' }}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-serif-jp text-base font-semibold mb-2" style={{ color: 'var(--color-sumi)' }}>
                {f.title}
              </h3>
              <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-usuzumi)' }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 5：料金プラン ────────────────────────────────────────────────────
function PricingSection({ t }: { t: Translations }) {
  const plans = [
    { key: 'monthly', label: t.planMonthly, price: '$29.99', period: '/mo', perMonth: '$29.99', popular: false },
    { key: '3month',  label: t.plan3month,  price: '$74.99', period: '/3mo', perMonth: '$25.00', popular: true },
    { key: '6month',  label: t.plan6month,  price: '$134.99', period: '/6mo', perMonth: '$22.50', popular: false },
    { key: 'yearly',  label: t.planYearly,  price: '$215.99', period: '/yr', perMonth: '$18.00', popular: false },
  ]
  return (
    <section className="py-24 scroll-fade" style={{ backgroundColor: 'rgba(74,103,65,0.05)' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="font-cormorant italic text-base mb-2" style={{ color: 'var(--color-usuzumi)' }}>{t.planEn}</p>
          <h2 className="font-serif-jp text-2xl md:text-3xl" style={{ color: 'var(--color-sumi)' }}>{t.planTitle}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {plans.map(p => (
            <div key={p.key} className="relative rounded-xl p-5"
              style={{
                backgroundColor: 'var(--color-washi)',
                border: p.popular ? '2px solid var(--color-beni)' : '1px solid var(--color-gold)',
              }}>
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full font-medium"
                  style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-sumi)' }}>
                  {t.planPopular}
                </div>
              )}
              <p className="font-serif-jp text-sm font-medium mb-1" style={{ color: 'var(--color-sumi)' }}>{p.label}</p>
              <p className="font-cormorant text-3xl font-light" style={{ color: p.popular ? 'var(--color-beni)' : 'var(--color-sumi)' }}>
                {p.price}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-usuzumi)' }}>{p.period}</p>
              <p className="text-xs mt-2" style={{ color: 'var(--color-usuzumi)' }}>{p.perMonth}/mo</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs" style={{ color: 'var(--color-usuzumi)' }}>✦ {t.planFreeNote}</p>
      </div>
    </section>
  )
}

// ─── SECTION 6：CTA ───────────────────────────────────────────────────────────
function CtaSection({ t }: { t: Translations }) {
  return (
    <section className="relative py-28 overflow-hidden scroll-fade" style={{ backgroundColor: 'var(--color-sumi)' }}>
      {/* 竹装飾 */}
      <div className="absolute left-0 top-0 h-full w-16 opacity-10 pointer-events-none animate-bamboo">
        <BambooSVG className="h-full w-full" />
      </div>
      <div className="absolute right-0 top-0 h-full w-16 opacity-10 pointer-events-none animate-bamboo"
        style={{ animationDelay: '1s', transform: 'scaleX(-1)' }}>
        <BambooSVG className="h-full w-full" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        <p className="font-cormorant italic text-4xl md:text-5xl leading-tight mb-4" style={{ color: '#fff' }}>
          {t.ctaFinalEn}
        </p>
        <div className="w-16 h-px mx-auto my-6" style={{ backgroundColor: 'var(--color-gold)' }} />
        <p className="font-serif-jp text-sm mb-12" style={{ color: 'var(--color-gold)' }}>
          {t.ctaFinalJa}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup?gender=female"
            className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-wider transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--color-beni)' }}>
            {t.ctaWomen}
          </Link>
          <Link href="/signup?gender=male"
            className="px-8 py-3 rounded-full text-sm font-medium tracking-wider transition-opacity hover:opacity-70"
            style={{ border: '1.5px solid var(--color-gold)', color: 'var(--color-gold)', backgroundColor: 'transparent' }}>
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
        <span className="font-cormorant text-xl tracking-widest" style={{ color: '#fff' }}>SAKURA CLUB</span>
        <nav className="flex gap-6">
          {t.footerNav.map(item => (
            <a key={item} href="#" className="text-xs transition-opacity hover:opacity-60"
              style={{ color: 'rgba(255,255,255,0.5)' }}>{item}</a>
          ))}
        </nav>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>© 2026 SAKURA CLUB</p>
      </div>
    </footer>
  )
}
