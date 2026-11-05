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
import { formatCultureValue, getVisibleCultureLabels, resolveCultureValue } from '@/lib/profile/cultureTags'

// 性格タグの表と変換は src/lib/profile/personalityTags.ts にまとめた（選ぶ画面と同じ表示名）
// 日本文化のタグの表と変換は src/lib/profile/cultureTags.ts にまとめた（7 分類・46 項目。昔の値も新しい項目で表示）

/**
 * タグを正規化する
 * - 性格：キー（例: gentle）に変換
 * - 日本文化：新しい値（日本語。例: 着物・浴衣）に変換
 */
export function normalizeTagToKey(tag: string, type: 'personality' | 'culture'): string | null {
  if (!tag) return null

  if (type === 'personality') {
    return personalityKeyFromValue(tag)
  }

  // 日本文化のタグは新しい値（日本語）を返す。消す値・分からない値は null
  return resolveCultureValue(tag) ?? null
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
  // 消す値は ''、マッピングにない値は原文をそのまま返す
  return formatCultureValue(tag, language)
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
  // 消す値を除き、同じ項目は 1 つにまとめる
  return getVisibleCultureLabels(tags, language)
}
