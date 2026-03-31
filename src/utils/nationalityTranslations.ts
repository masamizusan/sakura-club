export const nationalityLabels: Record<string, Record<string, string>> = {
  ja: {
    JP: '日本', US: 'アメリカ', GB: 'イギリス', CA: 'カナダ',
    AU: 'オーストラリア', DE: 'ドイツ', FR: 'フランス', IT: 'イタリア',
    ES: 'スペイン', KR: '韓国', CN: '中国', TW: '台湾',
    TH: 'タイ', VN: 'ベトナム', IN: 'インド',
  },
  en: {
    JP: 'Japan', US: 'USA', GB: 'UK', CA: 'Canada',
    AU: 'Australia', DE: 'Germany', FR: 'France', IT: 'Italy',
    ES: 'Spain', KR: 'Korea', CN: 'China', TW: 'Taiwan',
    TH: 'Thailand', VN: 'Vietnam', IN: 'India',
  },
  ko: {
    JP: '일본', US: '미국', GB: '영국', CA: '캐나다',
    AU: '호주', DE: '독일', FR: '프랑스', IT: '이탈리아',
    ES: '스페인', KR: '한국', CN: '중국', TW: '대만',
    TH: '태국', VN: '베트남', IN: '인도',
  },
  'zh-tw': {
    JP: '日本', US: '美國', GB: '英國', CA: '加拿大',
    AU: '澳洲', DE: '德國', FR: '法國', IT: '義大利',
    ES: '西班牙', KR: '韓國', CN: '中國', TW: '台灣',
    TH: '泰國', VN: '越南', IN: '印度',
  },
}

// 日本語 → ISOコードの逆引きマップ
const japaneseToISO: Record<string, string> = {
  '日本': 'JP', 'アメリカ': 'US', 'イギリス': 'GB', 'カナダ': 'CA',
  'オーストラリア': 'AU', 'ドイツ': 'DE', 'フランス': 'FR', 'イタリア': 'IT',
  'スペイン': 'ES', '韓国': 'KR', '中国': 'CN', '台湾': 'TW',
  'タイ': 'TH', 'ベトナム': 'VN', 'インド': 'IN',
}

// 英語テキスト → ISOコードの逆引きマップ
const englishToISO: Record<string, string> = {
  'japan': 'JP', 'usa': 'US', 'uk': 'GB', 'canada': 'CA',
  'australia': 'AU', 'germany': 'DE', 'france': 'FR', 'italy': 'IT',
  'spain': 'ES', 'korea': 'KR', 'china': 'CN', 'taiwan': 'TW',
  'thailand': 'TH', 'vietnam': 'VN', 'india': 'IN',
  'america': 'US', 'united states': 'US', 'united kingdom': 'GB',
}

export const getNationalityLabel = (code: string, lang: string): string => {
  if (!code) return ''
  // 日本語テキストが来た場合はISOコードに変換
  const isoFromJapanese = japaneseToISO[code]
  if (isoFromJapanese) {
    const langLabels = nationalityLabels[lang] || nationalityLabels['ja']
    return langLabels[isoFromJapanese] || code
  }
  // 英語テキストが来た場合はISOコードに変換（小文字で照合）
  const isoFromEnglish = englishToISO[code.toLowerCase()]
  if (isoFromEnglish) {
    const langLabels = nationalityLabels[lang] || nationalityLabels['ja']
    return langLabels[isoFromEnglish] || code
  }
  // ISOコード（2文字大文字）として試みる
  const isoCode = code.toUpperCase()
  const langLabels = nationalityLabels[lang] || nationalityLabels['ja']
  return langLabels[isoCode] || code
}
