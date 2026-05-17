/**
 * 47都道府県の4言語ラベル辞書 + 地方区分メタデータ。
 *
 * 既存 `src/utils/profileFieldFormatters.ts` の `formatPrefecture` は ko 8件 /
 * zh-tw 6件のみで 47件揃っていなかったため、絞り込みモーダル用に新規完備辞書を提供。
 * ko / zh-tw は機械翻訳ベース、ネイティブレビューは別タスク。
 */

import type { SupportedLanguage } from '@/utils/language'

export const PREFECTURES_JA = [
  '北海道',
  '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
] as const

export type PrefectureJa = typeof PREFECTURES_JA[number]

export type RegionKey =
  | 'hokkaido'
  | 'tohoku'
  | 'kanto'
  | 'chubu'
  | 'kinki'
  | 'chugoku'
  | 'shikoku'
  | 'kyushu'

export const PREFECTURE_REGIONS: Array<{ key: RegionKey; prefectures: PrefectureJa[] }> = [
  { key: 'hokkaido', prefectures: ['北海道'] },
  { key: 'tohoku',   prefectures: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  { key: 'kanto',    prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'] },
  { key: 'chubu',    prefectures: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県'] },
  { key: 'kinki',    prefectures: ['滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
  { key: 'chugoku',  prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'] },
  { key: 'shikoku',  prefectures: ['徳島県', '香川県', '愛媛県', '高知県'] },
  { key: 'kyushu',   prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'] },
]

export const REGION_LABELS: Record<SupportedLanguage, Record<RegionKey, string>> = {
  ja: {
    hokkaido: '北海道', tohoku: '東北', kanto: '関東', chubu: '中部',
    kinki: '近畿', chugoku: '中国', shikoku: '四国', kyushu: '九州・沖縄',
  },
  en: {
    hokkaido: 'Hokkaido', tohoku: 'Tohoku', kanto: 'Kanto', chubu: 'Chubu',
    kinki: 'Kinki', chugoku: 'Chugoku', shikoku: 'Shikoku', kyushu: 'Kyushu & Okinawa',
  },
  ko: {
    hokkaido: '홋카이도', tohoku: '도호쿠', kanto: '간토', chubu: '주부',
    kinki: '긴키', chugoku: '주고쿠', shikoku: '시코쿠', kyushu: '규슈・오키나와',
  },
  'zh-tw': {
    hokkaido: '北海道', tohoku: '東北', kanto: '關東', chubu: '中部',
    kinki: '近畿', chugoku: '中國', shikoku: '四國', kyushu: '九州・沖繩',
  },
}

const PREFECTURE_LABELS_EN: Record<PrefectureJa, string> = {
  '北海道': 'Hokkaido',
  '青森県': 'Aomori', '岩手県': 'Iwate', '宮城県': 'Miyagi',
  '秋田県': 'Akita', '山形県': 'Yamagata', '福島県': 'Fukushima',
  '茨城県': 'Ibaraki', '栃木県': 'Tochigi', '群馬県': 'Gunma',
  '埼玉県': 'Saitama', '千葉県': 'Chiba', '東京都': 'Tokyo', '神奈川県': 'Kanagawa',
  '新潟県': 'Niigata', '富山県': 'Toyama', '石川県': 'Ishikawa', '福井県': 'Fukui',
  '山梨県': 'Yamanashi', '長野県': 'Nagano',
  '岐阜県': 'Gifu', '静岡県': 'Shizuoka', '愛知県': 'Aichi', '三重県': 'Mie',
  '滋賀県': 'Shiga', '京都府': 'Kyoto', '大阪府': 'Osaka', '兵庫県': 'Hyogo',
  '奈良県': 'Nara', '和歌山県': 'Wakayama',
  '鳥取県': 'Tottori', '島根県': 'Shimane', '岡山県': 'Okayama',
  '広島県': 'Hiroshima', '山口県': 'Yamaguchi',
  '徳島県': 'Tokushima', '香川県': 'Kagawa', '愛媛県': 'Ehime', '高知県': 'Kochi',
  '福岡県': 'Fukuoka', '佐賀県': 'Saga', '長崎県': 'Nagasaki', '熊本県': 'Kumamoto',
  '大分県': 'Oita', '宮崎県': 'Miyazaki', '鹿児島県': 'Kagoshima', '沖縄県': 'Okinawa',
}

const PREFECTURE_LABELS_KO: Record<PrefectureJa, string> = {
  '北海道': '홋카이도',
  '青森県': '아오모리', '岩手県': '이와테', '宮城県': '미야기',
  '秋田県': '아키타', '山形県': '야마가타', '福島県': '후쿠시마',
  '茨城県': '이바라키', '栃木県': '도치기', '群馬県': '군마',
  '埼玉県': '사이타마', '千葉県': '치바', '東京都': '도쿄', '神奈川県': '가나가와',
  '新潟県': '니가타', '富山県': '도야마', '石川県': '이시카와', '福井県': '후쿠이',
  '山梨県': '야마나시', '長野県': '나가노',
  '岐阜県': '기후', '静岡県': '시즈오카', '愛知県': '아이치', '三重県': '미에',
  '滋賀県': '시가', '京都府': '교토', '大阪府': '오사카', '兵庫県': '효고',
  '奈良県': '나라', '和歌山県': '와카야마',
  '鳥取県': '돗토리', '島根県': '시마네', '岡山県': '오카야마',
  '広島県': '히로시마', '山口県': '야마구치',
  '徳島県': '도쿠시마', '香川県': '가가와', '愛媛県': '에히메', '高知県': '고치',
  '福岡県': '후쿠오카', '佐賀県': '사가', '長崎県': '나가사키', '熊本県': '구마모토',
  '大分県': '오이타', '宮崎県': '미야자키', '鹿児島県': '가고시마', '沖縄県': '오키나와',
}

const PREFECTURE_LABELS_ZH_TW: Record<PrefectureJa, string> = {
  '北海道': '北海道',
  '青森県': '青森', '岩手県': '岩手', '宮城県': '宮城',
  '秋田県': '秋田', '山形県': '山形', '福島県': '福島',
  '茨城県': '茨城', '栃木県': '櫪木', '群馬県': '群馬',
  '埼玉県': '埼玉', '千葉県': '千葉', '東京都': '東京', '神奈川県': '神奈川',
  '新潟県': '新潟', '富山県': '富山', '石川県': '石川', '福井県': '福井',
  '山梨県': '山梨', '長野県': '長野',
  '岐阜県': '岐阜', '静岡県': '靜岡', '愛知県': '愛知', '三重県': '三重',
  '滋賀県': '滋賀', '京都府': '京都', '大阪府': '大阪', '兵庫県': '兵庫',
  '奈良県': '奈良', '和歌山県': '和歌山',
  '鳥取県': '鳥取', '島根県': '島根', '岡山県': '岡山',
  '広島県': '廣島', '山口県': '山口',
  '徳島県': '德島', '香川県': '香川', '愛媛県': '愛媛', '高知県': '高知',
  '福岡県': '福岡', '佐賀県': '佐賀', '長崎県': '長崎', '熊本県': '熊本',
  '大分県': '大分', '宮崎県': '宮崎', '鹿児島県': '鹿兒島', '沖縄県': '沖繩',
}

const PREFECTURE_LABELS_JA: Record<PrefectureJa, string> = PREFECTURES_JA.reduce(
  (acc, p) => ({ ...acc, [p]: p }),
  {} as Record<PrefectureJa, string>,
)

export const PREFECTURE_LABELS: Record<SupportedLanguage, Record<PrefectureJa, string>> = {
  ja: PREFECTURE_LABELS_JA,
  en: PREFECTURE_LABELS_EN,
  ko: PREFECTURE_LABELS_KO,
  'zh-tw': PREFECTURE_LABELS_ZH_TW,
}

/**
 * 日本語表記の都道府県名を指定言語のラベルに変換。
 * 未知の値はそのまま返す(プロフィール保存値が古い表記の場合のフォールバック)。
 */
export function getPrefectureLabel(
  prefectureJa: string,
  language: SupportedLanguage,
): string {
  const dict = PREFECTURE_LABELS[language] ?? PREFECTURE_LABELS.ja
  return (dict as Record<string, string>)[prefectureJa] ?? prefectureJa
}
