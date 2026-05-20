/**
 * nationality カラムの表記揺れを ISO 2文字コードに正規化するユーティリティ。
 *
 * 2026/05/18 時点の DB 実値:
 *   japan(6) / アメリカ(3) / ドイツ(3) / スペイン(1) / イギリス(1) /
 *   イタリア(1) / 台湾(1) / null(3)
 * 過去の手動 INSERT や seed 由来で英語小文字・カタカナ・ISO 等が混在しているため、
 * 比較する前に必ず本ユーティリティで ISO に正規化する。
 *
 * 既存 `src/utils/nationalityTranslations.ts` の japaneseToISO / englishToISO とは
 * 互換性を保ちつつ、絞り込み用途で必要な「ISO → DB 実値候補」の逆引きを提供する。
 */

const RAW_TO_ISO: Record<string, string> = {
  // 日本
  'japan': 'JP', 'japanese': 'JP', 'jp': 'JP', 'jpn': 'JP', '日本': 'JP',
  // アメリカ
  'usa': 'US', 'us': 'US', 'unitedstates': 'US', 'america': 'US', 'アメリカ': 'US',
  // イギリス
  'uk': 'GB', 'gb': 'GB', 'unitedkingdom': 'GB', 'england': 'GB', 'britain': 'GB',
  'イギリス': 'GB',
  // カナダ
  'canada': 'CA', 'ca': 'CA', 'カナダ': 'CA',
  // オーストラリア
  'australia': 'AU', 'au': 'AU', 'オーストラリア': 'AU',
  // ニュージーランド
  'newzealand': 'NZ', 'nz': 'NZ', 'ニュージーランド': 'NZ',
  // ドイツ
  'germany': 'DE', 'de': 'DE', 'ドイツ': 'DE',
  // フランス
  'france': 'FR', 'fr': 'FR', 'フランス': 'FR',
  // イタリア
  'italy': 'IT', 'it': 'IT', 'イタリア': 'IT',
  // スペイン
  'spain': 'ES', 'es': 'ES', 'スペイン': 'ES',
  // オランダ
  'netherlands': 'NL', 'nl': 'NL', 'オランダ': 'NL',
  // スイス
  'switzerland': 'CH', 'ch': 'CH', 'スイス': 'CH',
  // 韓国
  'korea': 'KR', 'southkorea': 'KR', 'kr': 'KR', 'kor': 'KR', '韓国': 'KR',
  // 中国
  'china': 'CN', 'cn': 'CN', '中国': 'CN',
  // 台湾
  'taiwan': 'TW', 'tw': 'TW', 'twn': 'TW', '台湾': 'TW',
  // タイ
  'thailand': 'TH', 'th': 'TH', 'タイ': 'TH',
  // ベトナム
  'vietnam': 'VN', 'vn': 'VN', 'ベトナム': 'VN',
  // フィリピン
  'philippines': 'PH', 'ph': 'PH', 'フィリピン': 'PH',
  // インドネシア
  'indonesia': 'ID', 'id': 'ID', 'インドネシア': 'ID',
  // シンガポール
  'singapore': 'SG', 'sg': 'SG', 'シンガポール': 'SG',
  // マレーシア
  'malaysia': 'MY', 'my': 'MY', 'マレーシア': 'MY',
  // インド
  'india': 'IN', 'in': 'IN', 'インド': 'IN',
  // ブラジル
  'brazil': 'BR', 'br': 'BR', 'ブラジル': 'BR',
  // メキシコ
  'mexico': 'MX', 'mx': 'MX', 'メキシコ': 'MX',
  // ロシア
  'russia': 'RU', 'ru': 'RU', 'ロシア': 'RU',
}

/**
 * 任意の nationality 表記を ISO 2文字コードに正規化。
 * 大文字小文字・スペース・アンダースコア・ハイフンを除いてマッチ。
 * 未知の値は null を返す。
 */
export function normalizeNationality(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  // カタカナを含む可能性があるため、まずは生キーで一致確認
  if (RAW_TO_ISO[trimmed]) return RAW_TO_ISO[trimmed]
  const stripped = trimmed.toLowerCase().replace(/[\s_-]/g, '')
  return RAW_TO_ISO[stripped] ?? null
}

/**
 * ISO コード → DB に存在しうる全 raw 値候補(query.in() 構築用)。
 * 例: 'US' → ['usa','us','unitedstates','america','アメリカ']
 */
export function isoToDbValueCandidates(iso: string): string[] {
  const upperIso = iso.toUpperCase()
  const out: string[] = []
  for (const [raw, code] of Object.entries(RAW_TO_ISO)) {
    if (code === upperIso) out.push(raw)
  }
  return out
}

/**
 * モーダル UI 用: 絞り込み選択肢リスト。
 * 日本(JP)は絞り込み対象外(日本人女性検索時はそもそも非表示、外国人男性検索時は
 * 相手が外国人男性なので JP は選ばれない前提)。
 * 機械翻訳ベース、ネイティブレビューは別タスク。
 */
export const NATIONALITY_FILTER_OPTIONS: Array<{
  iso: string
  labels: { ja: string; en: string; ko: string; 'zh-tw': string }
}> = [
  { iso: 'US', labels: { ja: 'アメリカ',       en: 'USA',         ko: '미국',     'zh-tw': '美國' } },
  { iso: 'GB', labels: { ja: 'イギリス',       en: 'UK',          ko: '영국',     'zh-tw': '英國' } },
  { iso: 'CA', labels: { ja: 'カナダ',         en: 'Canada',      ko: '캐나다',   'zh-tw': '加拿大' } },
  { iso: 'AU', labels: { ja: 'オーストラリア', en: 'Australia',   ko: '호주',     'zh-tw': '澳洲' } },
  { iso: 'NZ', labels: { ja: 'ニュージーランド', en: 'New Zealand', ko: '뉴질랜드', 'zh-tw': '紐西蘭' } },
  { iso: 'DE', labels: { ja: 'ドイツ',         en: 'Germany',     ko: '독일',     'zh-tw': '德國' } },
  { iso: 'FR', labels: { ja: 'フランス',       en: 'France',      ko: '프랑스',   'zh-tw': '法國' } },
  { iso: 'IT', labels: { ja: 'イタリア',       en: 'Italy',       ko: '이탈리아', 'zh-tw': '義大利' } },
  { iso: 'ES', labels: { ja: 'スペイン',       en: 'Spain',       ko: '스페인',   'zh-tw': '西班牙' } },
  { iso: 'NL', labels: { ja: 'オランダ',       en: 'Netherlands', ko: '네덜란드', 'zh-tw': '荷蘭' } },
  { iso: 'CH', labels: { ja: 'スイス',         en: 'Switzerland', ko: '스위스',   'zh-tw': '瑞士' } },
  { iso: 'KR', labels: { ja: '韓国',           en: 'Korea',       ko: '한국',     'zh-tw': '韓國' } },
  { iso: 'CN', labels: { ja: '中国',           en: 'China',       ko: '중국',     'zh-tw': '中國' } },
  { iso: 'TW', labels: { ja: '台湾',           en: 'Taiwan',      ko: '대만',     'zh-tw': '台灣' } },
  { iso: 'TH', labels: { ja: 'タイ',           en: 'Thailand',    ko: '태국',     'zh-tw': '泰國' } },
  { iso: 'VN', labels: { ja: 'ベトナム',       en: 'Vietnam',     ko: '베트남',   'zh-tw': '越南' } },
  { iso: 'PH', labels: { ja: 'フィリピン',     en: 'Philippines', ko: '필리핀',   'zh-tw': '菲律賓' } },
  { iso: 'ID', labels: { ja: 'インドネシア',   en: 'Indonesia',   ko: '인도네시아', 'zh-tw': '印尼' } },
  { iso: 'SG', labels: { ja: 'シンガポール',   en: 'Singapore',   ko: '싱가포르', 'zh-tw': '新加坡' } },
  { iso: 'MY', labels: { ja: 'マレーシア',     en: 'Malaysia',    ko: '말레이시아', 'zh-tw': '馬來西亞' } },
  { iso: 'IN', labels: { ja: 'インド',         en: 'India',       ko: '인도',     'zh-tw': '印度' } },
  { iso: 'BR', labels: { ja: 'ブラジル',       en: 'Brazil',      ko: '브라질',   'zh-tw': '巴西' } },
  { iso: 'MX', labels: { ja: 'メキシコ',       en: 'Mexico',      ko: '멕시코',   'zh-tw': '墨西哥' } },
  { iso: 'RU', labels: { ja: 'ロシア',         en: 'Russia',      ko: '러시아',   'zh-tw': '俄羅斯' } },
]

// =====================================================================
// 共通国籍マスター (NATIONALITY_OPTIONS)
// ---------------------------------------------------------------------
// signup / profile-edit / matches 絞り込みが全てここを参照する単一ソース。
// 過去は3箇所(signup の FOREIGN_NATIONALITIES、profile-edit の getNationalities、
// matches の NATIONALITY_FILTER_OPTIONS)で重複していたが、2026/05/20 に統合。
//
// - 17選択肢 + 「その他」、外国人男性向け(日本人女性は signup 時に '日本' 自動)
// - dbValue は日本語カタカナ(過去の DB 実値との後方互換)
// - 「その他」は iso=null、isOther=true、絞り込みでは完全一致(eq) で扱う
// =====================================================================

import type { SupportedLanguage } from '@/utils/language'

export interface NationalityOption {
  /** signup/profile-edit で DB に保存される値(現状の DB 実値踏襲) */
  dbValue: string
  /** ISO 2文字コード(「その他」は null) */
  iso: string | null
  /** 4言語表示ラベル */
  labels: Record<SupportedLanguage, string>
  /** 「その他」フラグ(絞り込み API での特殊扱い用) */
  isOther?: boolean
}

export const NATIONALITY_OPTIONS: readonly NationalityOption[] = [
  { dbValue: 'アメリカ',     iso: 'US', labels: { ja: 'アメリカ',     en: 'USA',         ko: '미국',     'zh-tw': '美國' } },
  { dbValue: 'イギリス',     iso: 'GB', labels: { ja: 'イギリス',     en: 'UK',          ko: '영국',     'zh-tw': '英國' } },
  { dbValue: 'カナダ',       iso: 'CA', labels: { ja: 'カナダ',       en: 'Canada',      ko: '캐나다',   'zh-tw': '加拿大' } },
  { dbValue: 'オーストラリア', iso: 'AU', labels: { ja: 'オーストラリア', en: 'Australia',   ko: '호주',     'zh-tw': '澳洲' } },
  { dbValue: 'ドイツ',       iso: 'DE', labels: { ja: 'ドイツ',       en: 'Germany',     ko: '독일',     'zh-tw': '德國' } },
  { dbValue: 'フランス',     iso: 'FR', labels: { ja: 'フランス',     en: 'France',      ko: '프랑스',   'zh-tw': '法國' } },
  { dbValue: 'イタリア',     iso: 'IT', labels: { ja: 'イタリア',     en: 'Italy',       ko: '이탈리아', 'zh-tw': '義大利' } },
  { dbValue: 'スペイン',     iso: 'ES', labels: { ja: 'スペイン',     en: 'Spain',       ko: '스페인',   'zh-tw': '西班牙' } },
  { dbValue: 'オランダ',     iso: 'NL', labels: { ja: 'オランダ',     en: 'Netherlands', ko: '네덜란드', 'zh-tw': '荷蘭' } },
  { dbValue: 'スウェーデン', iso: 'SE', labels: { ja: 'スウェーデン', en: 'Sweden',      ko: '스웨덴',   'zh-tw': '瑞典' } },
  { dbValue: 'ノルウェー',   iso: 'NO', labels: { ja: 'ノルウェー',   en: 'Norway',      ko: '노르웨이', 'zh-tw': '挪威' } },
  { dbValue: 'デンマーク',   iso: 'DK', labels: { ja: 'デンマーク',   en: 'Denmark',     ko: '덴마크',   'zh-tw': '丹麥' } },
  { dbValue: '韓国',         iso: 'KR', labels: { ja: '韓国',         en: 'Korea',       ko: '한국',     'zh-tw': '韓國' } },
  { dbValue: '台湾',         iso: 'TW', labels: { ja: '台湾',         en: 'Taiwan',      ko: '대만',     'zh-tw': '台灣' } },
  { dbValue: 'タイ',         iso: 'TH', labels: { ja: 'タイ',         en: 'Thailand',    ko: '태국',     'zh-tw': '泰國' } },
  { dbValue: 'シンガポール', iso: 'SG', labels: { ja: 'シンガポール', en: 'Singapore',   ko: '싱가포르', 'zh-tw': '新加坡' } },
  { dbValue: 'その他',       iso: null, labels: { ja: 'その他',       en: 'Other',       ko: '기타',     'zh-tw': '其他' }, isOther: true },
] as const

/**
 * dbValue から NationalityOption を引く。O(N) だが N=17 なので実用上問題なし。
 * 未知の値(過去の手動 INSERT 等)は undefined を返す。
 */
export function findNationalityOption(dbValue: string | null | undefined): NationalityOption | undefined {
  if (!dbValue) return undefined
  return NATIONALITY_OPTIONS.find(opt => opt.dbValue === dbValue)
}

/**
 * 言語に応じた表示ラベルを返す。マスターに無い値は dbValue をそのまま fallback。
 * 既存 `nationalityTranslations.ts` の `getNationalityLabel()` とは引数構造が異なるため
 * 共存可能(あちらは ISO ベース、こちらは dbValue ベース)。
 */
export function getNationalityLabel(
  dbValue: string | null | undefined,
  lang: SupportedLanguage,
): string {
  if (!dbValue) return ''
  const opt = findNationalityOption(dbValue)
  return opt?.labels[lang] ?? dbValue
}
