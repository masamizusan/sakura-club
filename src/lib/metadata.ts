import { type Metadata } from 'next'
import { type Locale } from '@/i18n'

interface LocalizedMetadata {
  title: Record<Locale, string>
  description: Record<Locale, string>
  keywords?: Record<Locale, string[]>
}

export function generateLocalizedMetadata(
  localizedData: LocalizedMetadata,
  locale: Locale,
  pathname: string = '/'
): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // 各言語のURL生成
  const alternateLanguages = {
    'ja': `${baseUrl}${pathname}`,
    'en': `${baseUrl}/en${pathname}`,
    'zh': `${baseUrl}/zh${pathname}`,
    'ko': `${baseUrl}/ko${pathname}`
  }

  // 現在のページのURL
  const currentUrl = locale === 'ja' 
    ? `${baseUrl}${pathname}`
    : `${baseUrl}/${locale}${pathname}`

  // Open Graph locale設定
  const ogLocaleMap = {
    ja: 'ja_JP',
    en: 'en_US',
    zh: 'zh_CN',
    ko: 'ko_KR'
  }

  return {
    title: localizedData.title[locale],
    description: localizedData.description[locale],
    keywords: localizedData.keywords?.[locale]?.join(', '),
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: currentUrl,
      languages: alternateLanguages
    },
    openGraph: {
      title: localizedData.title[locale],
      description: localizedData.description[locale],
      url: currentUrl,
      siteName: 'Sakura Club',
      locale: ogLocaleMap[locale],
      type: 'website',
      alternateLocale: Object.values(ogLocaleMap).filter(l => l !== ogLocaleMap[locale])
    },
    twitter: {
      card: 'summary_large_image',
      title: localizedData.title[locale],
      description: localizedData.description[locale]
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1
      }
    }
  }
}

// よく使用されるページのメタデータテンプレート
export const pageMetadata = {
  home: {
    title: {
      ja: 'Sakura Club - 文化体験を通じた真の出会い',
      en: 'Sakura Club - True Connections Through Cultural Experiences',
      zh: 'Sakura Club - 通过文化体验实现真正的邂逅',
      ko: 'Sakura Club - 문화 체험을 통한 진정한 만남'
    },
    description: {
      ja: '訪日外国人男性と日本人女性が、茶道・書道・料理教室などの文化体験を通じて自然な出会いを楽しめる、安心・安全なプラットフォームです。',
      en: 'A safe and secure platform where foreign men visiting Japan and Japanese women can enjoy natural encounters through cultural experiences like tea ceremony, calligraphy, and cooking classes.',
      zh: '为访日外国男性和日本女性提供的安全可靠平台，通过茶道、书道、料理教室等文化体验享受自然的邂逅。',
      ko: '방일 외국인 남성과 일본 여성이 다도, 서예, 요리 교실 등의 문화 체험을 통해 자연스러운 만남을 즐길 수 있는 안전하고 신뢰할 수 있는 플랫폼입니다.'
    },
    keywords: {
      ja: ['文化交流', '国際交流', '日本文化', '出会い', '安全', 'マッチング', '茶道', '書道', '料理教室'],
      en: ['cultural exchange', 'international exchange', 'japanese culture', 'dating', 'safe', 'matching', 'tea ceremony', 'calligraphy', 'cooking class'],
      zh: ['文化交流', '国际交流', '日本文化', '约会', '安全', '配对', '茶道', '书法', '料理课'],
      ko: ['문화교류', '국제교류', '일본문화', '만남', '안전', '매칭', '다도', '서예', '요리교실']
    }
  },
  
  experiences: {
    title: {
      ja: '文化体験一覧 | Sakura Club',
      en: 'Cultural Experiences | Sakura Club',
      zh: '文化体验 | Sakura Club',
      ko: '문화 체험 | Sakura Club'
    },
    description: {
      ja: '茶道、書道、料理教室など、日本の伝統文化を体験しながら素敵な出会いを楽しめます。安全で質の高い文化体験プログラムをご用意しています。',
      en: 'Experience Japanese traditional culture through tea ceremony, calligraphy, cooking classes and more while enjoying wonderful encounters. We offer safe and high-quality cultural experience programs.',
      zh: '通过茶道、书道、料理教室等体验日本传统文化，同时享受美妙的邂逅。我们提供安全优质的文化体验项目。',
      ko: '다도, 서예, 요리 교실 등을 통해 일본 전통 문화를 체험하면서 멋진 만남을 즐겨보세요. 안전하고 고품질의 문화 체험 프로그램을 제공합니다.'
    },
    keywords: {
      ja: ['文化体験', '茶道体験', '書道体験', '料理教室', '日本文化', '体験プログラム'],
      en: ['cultural experiences', 'tea ceremony experience', 'calligraphy experience', 'cooking class', 'japanese culture', 'experience programs'],
      zh: ['文化体验', '茶道体验', '书法体验', '料理课', '日本文化', '体验项目'],
      ko: ['문화체험', '다도체험', '서예체험', '요리교실', '일본문화', '체험프로그램']
    }
  },

  about: {
    title: {
      ja: '私たちについて | Sakura Club',
      en: 'About Us | Sakura Club',
      zh: '关于我们 | Sakura Club',
      ko: '소개 | Sakura Club'
    },
    description: {
      ja: 'Sakura Clubは、文化体験を通じた真の国際交流を目指すプラットフォームです。安全性と質の高いサービスで、素敵な出会いをサポートします。',
      en: 'Sakura Club is a platform aimed at true international exchange through cultural experiences. We support wonderful encounters with safety and high-quality services.',
      zh: 'Sakura Club是一个旨在通过文化体验实现真正国际交流的平台。我们以安全性和高质量的服务支持美妙的邂逅。',
      ko: 'Sakura Club은 문화 체험을 통한 진정한 국제 교류를 목표로 하는 플랫폼입니다. 안전성과 고품질 서비스로 멋진 만남을 지원합니다.'
    }
  }
}

// JSON-LD structured data 생성 함수
export function generateStructuredData(locale: Locale, pathname: string = '/') {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  const currentUrl = locale === 'ja' 
    ? `${baseUrl}${pathname}`
    : `${baseUrl}/${locale}${pathname}`

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sakura Club',
    url: currentUrl,
    description: pageMetadata.home.description[locale],
    potentialAction: {
      '@type': 'SearchAction',
      target: `${currentUrl}/experiences?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    },
    author: {
      '@type': 'Organization',
      name: 'Sakura Club',
      url: baseUrl
    },
    inLanguage: locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : locale === 'zh' ? 'zh-CN' : 'ko-KR'
  }
}