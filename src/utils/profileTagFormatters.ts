/**
 * プロフィールタグ（性格・文化）のフォーマット共通関数
 * /matches, /profile/[id], /profile/preview で共通利用
 *
 * NOTE:
 * このファイルは性格タグ・文化タグの翻訳を担当する唯一の変換レイヤー。
 * DBには日本語で保存されているタグを、4言語で表示するために使用。
 * 新しいタグを追加する場合は、必ずここのマッピングも更新すること。
 */

import { SupportedLanguage } from '@/utils/language'
import { formatPersonalityValue, personalityKeyFromValue } from '@/lib/profile/personalityTags'

// 性格タグの表と変換は src/lib/profile/personalityTags.ts にまとめた（選ぶ画面と同じ表示名）

// 日本語タグ → 翻訳キーのマッピング（文化タグ）
const cultureJaToKey: Record<string, string> = {
  '茶道': 'teaCeremony',
  '華道': 'flowerArrangement',
  '書道': 'calligraphy',
  '着物・浴衣': 'kimono',
  '和菓子': 'wagashi',
  '陶芸': 'pottery',
  '折り紙': 'origami',
  '盆栽': 'bonsai',
  '神社仏閣': 'shrinesTemples',
  '御朱印集め': 'sealCollection',
  '禅': 'zen',
  '寿司': 'sushi',
  '天ぷら': 'tempura',
  'うなぎ': 'unagi',
  '牛丼': 'gyudon',
  'とんかつ': 'tonkatsu',
  'ラーメン': 'ramen',
  'お好み焼き': 'okonomiyaki',
  'たこ焼き': 'takoyaki',
  'カレーライス': 'curry',
  'コンビニフード': 'conbiniFood',
  'ポテトチップス': 'potatoChips',
  '出汁': 'dashi',
  '味噌': 'miso',
  '豆腐': 'tofu',
  '梅干し': 'umeboshi',
  '漬物': 'pickles',
  '日本酒': 'sake',
  '焼酎': 'shochu',
  'そば': 'soba',
  'うどん': 'udon',
  '桜見物': 'cherryBlossom',
  '紅葉狩り': 'autumnLeaves',
  '温泉': 'hotSprings',
  '祭り': 'festivals',
  '花火大会': 'fireworks',
  '雪景色': 'snowScape',
  '日本の四季': 'fourSeasons',
  '盆踊り': 'bonDance',
  '日本庭園散策': 'gardenWalk',
  '抹茶スイーツ': 'matchaSweets',
  '団子': 'dango',
  'たい焼き': 'taiyaki',
  '大判焼き': 'obanyaki',
  'わらび餅': 'warabimochi',
  'りんご飴': 'candiedApple',
  'わたあめ': 'cottonCandy',
  '駄菓子': 'dagashi',
  'コンビニスイーツ': 'conbiniSweets',
  '相撲': 'sumo',
  '剣道': 'kendo',
  '柔道': 'judo',
  '空手': 'karate',
  '弓道': 'kyudo',
  '合気道': 'aikido',
  '薙刀': 'naginata',
  '歌舞伎': 'kabuki',
  '能': 'noh',
  '日本舞踊': 'japaneseDance',
  '邦楽': 'hogaku',
  '演歌': 'enka',
  '太鼓': 'taiko',
  '障子': 'shoji',
  '襖の張り替え': 'fusuma',
  '畳': 'tatami',
  '古民家カフェ': 'oldHouseCafe',
  '銭湯': 'sento',
  '昭和レトロ家電': 'showaRetro',
  '和モダンインテリア': 'waModernInterior',
  'アニメ': 'anime',
  'マンガ': 'manga',
  'コスプレ': 'cosplay',
  '日本のゲーム': 'japaneseGames',
  'J-POP': 'jpop',
  'カラオケ': 'karaoke',
  '日本映画': 'japaneseMov',
  'ドラマ': 'drama',
  'ボーカロイド': 'vocaloid',
  'アイドル文化': 'idolCulture',
  '漆器': 'lacquerware',
  '金箔貼り': 'goldLeaf',
  '和紙漉き': 'paperMaking',
  '染物': 'dyeing',
  '刀鍛冶': 'swordSmithing',
  '木工': 'woodworking',
  '飴細工': 'sugarCrafts'
}

// 韓国語タグ → 翻訳キーのマッピング（文化タグ）- 主要なもののみ
const cultureKoToKey: Record<string, string> = {
  '다도': 'teaCeremony',
  '꽃꽂이': 'flowerArrangement',
  '서예': 'calligraphy',
  '기모노': 'kimono',
  '스시': 'sushi',
  '텐푸라': 'tempura',
  '라멘': 'ramen',
  '온천': 'hotSprings',
  '벚꽃놀이': 'cherryBlossom',
  '단풍구경': 'autumnLeaves',
  '축제': 'festivals',
  '검도': 'kendo',
  '유도': 'judo',
  '가라테': 'karate',
  '애니메이션': 'anime',
  '만화': 'manga',
  '코스프레': 'cosplay',
  '노래방': 'karaoke'
}

// 繁体字タグ → 翻訳キーのマッピング（文化タグ）- 主要なもののみ
const cultureZhToKey: Record<string, string> = {
  '茶道': 'teaCeremony',
  '花道': 'flowerArrangement',
  '書道': 'calligraphy',
  '和服': 'kimono',
  '壽司': 'sushi',
  '天婦羅': 'tempura',
  '拉麵': 'ramen',
  '溫泉': 'hotSprings',
  '賞櫻': 'cherryBlossom',
  '賞楓': 'autumnLeaves',
  '祭典': 'festivals',
  '劍道': 'kendo',
  '柔道': 'judo',
  '空手道': 'karate',
  '動畫': 'anime',
  '漫畫': 'manga',
  '卡拉OK': 'karaoke'
}

// 4言語翻訳辞書（文化タグ）
const cultureTranslations: Record<string, Record<string, string>> = {
  ja: {
    teaCeremony: '茶道',
    flowerArrangement: '華道',
    calligraphy: '書道',
    kimono: '着物・浴衣',
    wagashi: '和菓子',
    pottery: '陶芸',
    origami: '折り紙',
    bonsai: '盆栽',
    shrinesTemples: '神社仏閣',
    sealCollection: '御朱印集め',
    zen: '禅',
    sushi: '寿司',
    tempura: '天ぷら',
    unagi: 'うなぎ',
    gyudon: '牛丼',
    tonkatsu: 'とんかつ',
    ramen: 'ラーメン',
    okonomiyaki: 'お好み焼き',
    takoyaki: 'たこ焼き',
    curry: 'カレーライス',
    conbiniFood: 'コンビニフード',
    potatoChips: 'ポテトチップス',
    dashi: '出汁',
    miso: '味噌',
    tofu: '豆腐',
    umeboshi: '梅干し',
    pickles: '漬物',
    sake: '日本酒',
    shochu: '焼酎',
    soba: 'そば',
    udon: 'うどん',
    cherryBlossom: '桜見物',
    autumnLeaves: '紅葉狩り',
    hotSprings: '温泉',
    festivals: '祭り',
    fireworks: '花火大会',
    snowScape: '雪景色',
    fourSeasons: '日本の四季',
    bonDance: '盆踊り',
    gardenWalk: '日本庭園散策',
    matchaSweets: '抹茶スイーツ',
    dango: '団子',
    taiyaki: 'たい焼き',
    obanyaki: '大判焼き',
    warabimochi: 'わらび餅',
    candiedApple: 'りんご飴',
    cottonCandy: 'わたあめ',
    dagashi: '駄菓子',
    conbiniSweets: 'コンビニスイーツ',
    sumo: '相撲',
    kendo: '剣道',
    judo: '柔道',
    karate: '空手',
    kyudo: '弓道',
    aikido: '合気道',
    naginata: '薙刀',
    kabuki: '歌舞伎',
    noh: '能',
    japaneseDance: '日本舞踊',
    hogaku: '邦楽',
    enka: '演歌',
    taiko: '太鼓',
    shoji: '障子',
    fusuma: '襖の張り替え',
    tatami: '畳',
    oldHouseCafe: '古民家カフェ',
    sento: '銭湯',
    showaRetro: '昭和レトロ家電',
    waModernInterior: '和モダンインテリア',
    anime: 'アニメ',
    manga: 'マンガ',
    cosplay: 'コスプレ',
    japaneseGames: '日本のゲーム',
    jpop: 'J-POP',
    karaoke: 'カラオケ',
    japaneseMov: '日本映画',
    drama: 'ドラマ',
    vocaloid: 'ボーカロイド',
    idolCulture: 'アイドル文化',
    lacquerware: '漆器',
    goldLeaf: '金箔貼り',
    paperMaking: '和紙漉き',
    dyeing: '染物',
    swordSmithing: '刀鍛冶',
    woodworking: '木工',
    sugarCrafts: '飴細工'
  },
  en: {
    teaCeremony: 'Tea Ceremony',
    flowerArrangement: 'Flower Arrangement',
    calligraphy: 'Calligraphy',
    kimono: 'Kimono & Yukata',
    wagashi: 'Wagashi',
    pottery: 'Pottery',
    origami: 'Origami',
    bonsai: 'Bonsai',
    shrinesTemples: 'Shrines & Temples',
    sealCollection: 'Goshuin Collection',
    zen: 'Zen',
    sushi: 'Sushi',
    tempura: 'Tempura',
    unagi: 'Unagi',
    gyudon: 'Gyudon',
    tonkatsu: 'Tonkatsu',
    ramen: 'Ramen',
    okonomiyaki: 'Okonomiyaki',
    takoyaki: 'Takoyaki',
    curry: 'Japanese Curry',
    conbiniFood: 'Konbini Food',
    potatoChips: 'Japanese Chips',
    dashi: 'Dashi',
    miso: 'Miso',
    tofu: 'Tofu',
    umeboshi: 'Umeboshi',
    pickles: 'Japanese Pickles',
    sake: 'Sake',
    shochu: 'Shochu',
    soba: 'Soba',
    udon: 'Udon',
    cherryBlossom: 'Cherry Blossom Viewing',
    autumnLeaves: 'Autumn Leaves Viewing',
    hotSprings: 'Hot Springs',
    festivals: 'Festivals',
    fireworks: 'Fireworks Display',
    snowScape: 'Snowy Scenery',
    fourSeasons: 'Four Seasons',
    bonDance: 'Bon Dance',
    gardenWalk: 'Japanese Garden Walk',
    matchaSweets: 'Matcha Sweets',
    dango: 'Dango',
    taiyaki: 'Taiyaki',
    obanyaki: 'Obanyaki',
    warabimochi: 'Warabimochi',
    candiedApple: 'Candied Apple',
    cottonCandy: 'Cotton Candy',
    dagashi: 'Dagashi',
    conbiniSweets: 'Convenience Store Sweets',
    sumo: 'Sumo',
    kendo: 'Kendo',
    judo: 'Judo',
    karate: 'Karate',
    kyudo: 'Kyudo',
    aikido: 'Aikido',
    naginata: 'Naginata',
    kabuki: 'Kabuki',
    noh: 'Noh',
    japaneseDance: 'Japanese Dance',
    hogaku: 'Traditional Music',
    enka: 'Enka',
    taiko: 'Taiko',
    shoji: 'Shoji',
    fusuma: 'Fusuma',
    tatami: 'Tatami',
    oldHouseCafe: 'Kominka Cafe',
    sento: 'Sento',
    showaRetro: 'Showa Retro',
    waModernInterior: 'Japanese Modern Interior',
    anime: 'Anime',
    manga: 'Manga',
    cosplay: 'Cosplay',
    japaneseGames: 'Japanese Games',
    jpop: 'J-POP',
    karaoke: 'Karaoke',
    japaneseMov: 'Japanese Movies',
    drama: 'Japanese Drama',
    vocaloid: 'Vocaloid',
    idolCulture: 'Idol Culture',
    lacquerware: 'Lacquerware',
    goldLeaf: 'Gold Leaf Application',
    paperMaking: 'Japanese Paper Making',
    dyeing: 'Traditional Dyeing',
    swordSmithing: 'Sword Smithing',
    woodworking: 'Woodworking',
    sugarCrafts: 'Japanese Sugar Art'
  },
  ko: {
    teaCeremony: '다도',
    flowerArrangement: '꽃꽂이',
    calligraphy: '서예',
    kimono: '기모노 & 유카타',
    wagashi: '화과자',
    pottery: '도예',
    origami: '종이접기',
    bonsai: '분재',
    shrinesTemples: '신사 & 절',
    sealCollection: '고슈인 수집',
    zen: '선',
    sushi: '스시',
    tempura: '텐푸라',
    unagi: '장어',
    gyudon: '규동',
    tonkatsu: '돈카츠',
    ramen: '라멘',
    okonomiyaki: '오코노미야키',
    takoyaki: '타코야키',
    curry: '일본 카레',
    conbiniFood: '편의점 음식',
    potatoChips: '일본 과자',
    dashi: '다시',
    miso: '미소',
    tofu: '두부',
    umeboshi: '우메보시',
    pickles: '절임 반찬',
    sake: '사케',
    shochu: '소주',
    soba: '소바',
    udon: '우동',
    cherryBlossom: '벚꽃놀이',
    autumnLeaves: '단풍구경',
    hotSprings: '온천',
    festivals: '축제',
    fireworks: '불꽃놀이',
    snowScape: '설경',
    fourSeasons: '일본의 사계절',
    bonDance: '봉오도리',
    gardenWalk: '일본 정원 산책',
    matchaSweets: '말차 디저트',
    dango: '당고',
    taiyaki: '타이야키',
    obanyaki: '오반야키',
    warabimochi: '와라비모치',
    candiedApple: '사과사탕',
    cottonCandy: '솜사탕',
    dagashi: '다가시',
    conbiniSweets: '편의점 디저트',
    sumo: '스모',
    kendo: '검도',
    judo: '유도',
    karate: '가라테',
    kyudo: '궁도',
    aikido: '합기도',
    naginata: '나기나타',
    kabuki: '가부키',
    noh: '노',
    japaneseDance: '일본 무용',
    hogaku: '전통 음악',
    enka: '엔카',
    taiko: '타이코',
    shoji: '쇼지',
    fusuma: '후스마',
    tatami: '다다미',
    oldHouseCafe: '고민가 카페',
    sento: '센토',
    showaRetro: '쇼와 레트로',
    waModernInterior: '일본 모던 인테리어',
    anime: '애니메이션',
    manga: '만화',
    cosplay: '코스프레',
    japaneseGames: '일본 게임',
    jpop: 'J-POP',
    karaoke: '노래방',
    japaneseMov: '일본 영화',
    drama: '일본 드라마',
    vocaloid: '보컬로이드',
    idolCulture: '아이돌 문화',
    lacquerware: '칠기',
    goldLeaf: '금박 공예',
    paperMaking: '화지 공예',
    dyeing: '전통 염색',
    swordSmithing: '일본도 제작',
    woodworking: '목공예',
    sugarCrafts: '설탕 공예'
  },
  'zh-tw': {
    teaCeremony: '茶道',
    flowerArrangement: '花道',
    calligraphy: '書道',
    kimono: '和服・浴衣',
    wagashi: '和菓子',
    pottery: '陶藝',
    origami: '摺紙',
    bonsai: '盆栽',
    shrinesTemples: '神社寺廟',
    sealCollection: '御朱印收集',
    zen: '禪',
    sushi: '壽司',
    tempura: '天婦羅',
    unagi: '鰻魚',
    gyudon: '牛丼',
    tonkatsu: '炸豬排',
    ramen: '拉麵',
    okonomiyaki: '大阪燒',
    takoyaki: '章魚燒',
    curry: '日式咖哩',
    conbiniFood: '便利商店美食',
    potatoChips: '日本零食',
    dashi: '高湯',
    miso: '味噌',
    tofu: '豆腐',
    umeboshi: '梅干',
    pickles: '漬物',
    sake: '日本酒',
    shochu: '燒酎',
    soba: '蕎麥麵',
    udon: '烏龍麵',
    cherryBlossom: '賞櫻',
    autumnLeaves: '賞楓',
    hotSprings: '溫泉',
    festivals: '祭典',
    fireworks: '煙火大會',
    snowScape: '雪景',
    fourSeasons: '日本四季',
    bonDance: '盆舞',
    gardenWalk: '日本庭園散步',
    matchaSweets: '抹茶甜點',
    dango: '糰子',
    taiyaki: '鯛魚燒',
    obanyaki: '大判燒',
    warabimochi: '蕨餅',
    candiedApple: '蘋果糖',
    cottonCandy: '棉花糖',
    dagashi: '駄菓子',
    conbiniSweets: '便利商店甜點',
    sumo: '相撲',
    kendo: '劍道',
    judo: '柔道',
    karate: '空手道',
    kyudo: '弓道',
    aikido: '合氣道',
    naginata: '薙刀',
    kabuki: '歌舞伎',
    noh: '能劇',
    japaneseDance: '日本舞踊',
    hogaku: '邦樂',
    enka: '演歌',
    taiko: '太鼓',
    shoji: '障子',
    fusuma: '襖',
    tatami: '榻榻米',
    oldHouseCafe: '古民家咖啡館',
    sento: '錢湯',
    showaRetro: '昭和復古',
    waModernInterior: '和式現代風格',
    anime: '動畫',
    manga: '漫畫',
    cosplay: 'Cosplay',
    japaneseGames: '日本遊戲',
    jpop: 'J-POP',
    karaoke: '卡拉OK',
    japaneseMov: '日本電影',
    drama: '日劇',
    vocaloid: 'Vocaloid',
    idolCulture: '偶像文化',
    lacquerware: '漆器',
    goldLeaf: '金箔工藝',
    paperMaking: '和紙工藝',
    dyeing: '傳統染色',
    swordSmithing: '鑄劍',
    woodworking: '木工',
    sugarCrafts: '糖藝'
  }
}

/**
 * タグを翻訳キーに正規化する
 * すでにキー（例: sushi, gentle）ならそのまま返す
 * 日本語・韓国語・繁体字文字列なら対応するキーに変換
 */
export function normalizeTagToKey(tag: string, type: 'personality' | 'culture'): string | null {
  if (!tag) return null

  if (type === 'personality') {
    return personalityKeyFromValue(tag)
  }

  const trimmed = tag.trim()

  // 既にキーの場合（英数字のみ）
  if (cultureTranslations.en[trimmed]) {
    return trimmed
  }

  // 日本語からキーへ変換
  if (cultureJaToKey[trimmed]) {
    return cultureJaToKey[trimmed]
  }

  // 韓国語からキーへ変換
  if (cultureKoToKey[trimmed]) {
    return cultureKoToKey[trimmed]
  }

  // 繁体字からキーへ変換
  if (cultureZhToKey[trimmed]) {
    return cultureZhToKey[trimmed]
  }

  return null
}

/**
 * 性格タグをフォーマット（多言語対応）
 */
export function formatPersonalityTag(
  tag: string,
  language: SupportedLanguage = 'ja'
): string {
  // マッピングにない場合は原文をそのまま返す
  return formatPersonalityValue(tag, language)
}

/**
 * 文化タグをフォーマット（多言語対応）
 */
export function formatCultureTag(
  tag: string,
  language: SupportedLanguage = 'ja'
): string {
  if (!tag) return ''

  const key = normalizeTagToKey(tag, 'culture')
  if (!key) {
    // マッピングにない場合は原文をそのまま返す
    return tag
  }

  const langDict = cultureTranslations[language] || cultureTranslations['ja']
  return langDict[key] || tag
}

/**
 * タグ配列を一括でフォーマット
 */
export function formatPersonalityTags(
  tags: string[],
  language: SupportedLanguage = 'ja'
): string[] {
  if (!Array.isArray(tags)) return []
  return tags.map(tag => formatPersonalityTag(tag, language))
}

export function formatCultureTags(
  tags: string[],
  language: SupportedLanguage = 'ja'
): string[] {
  if (!Array.isArray(tags)) return []
  return tags.map(tag => formatCultureTag(tag, language))
}
