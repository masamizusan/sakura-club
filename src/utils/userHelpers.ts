/**
 * ユーザータイプ判定ユーティリティ
 *
 * このアプリのユーザーは2種類：
 *   - 日本人女性: gender='female' (nationality='日本' のはずだが null の場合もある)
 *   - 外国人男性: gender='male' AND nationality≠日本
 *
 * gender を一次判定として使い、null/未設定時でも誤判定しない設計にする。
 */

export interface MinimalProfile {
  gender?: string | null
  nationality?: string | null
}

/**
 * 日本人女性かどうかを判定する
 * - gender='female' を優先判定とする
 * - nationality が '日本' でも gender='male' なら外国人男性扱い
 */
export function isJapaneseWoman(profile: MinimalProfile | null | undefined): boolean {
  if (!profile) return false
  return profile.gender === 'female'
}

/**
 * 外国人男性かどうかを判定する
 * - gender='male' AND nationality が日本でない
 */
export function isForeignMaleUser(profile: MinimalProfile | null | undefined): boolean {
  if (!profile) return false
  if (profile.gender !== 'male') return false
  const n = (profile.nationality || '').toLowerCase().trim()
  return n !== '日本' && n !== 'jp' && n !== 'japan' && n !== 'japanese'
}

/**
 * 翻訳のターゲット言語を返す
 * - 日本人女性: 相手（外国人男性）の英語メッセージを日本語に → 'ja'
 * - 外国人男性: 相手（日本人女性）の日本語メッセージを英語に → 'en'
 */
export function getTranslationTargetLang(profile: MinimalProfile | null | undefined): 'ja' | 'en' {
  // 日本人女性：日本語で入力 → 英語に翻訳して相手（外国人男性）へ届ける
  // 外国人男性：英語で入力 → 日本語に翻訳して相手（日本人女性）へ届ける
  return isJapaneseWoman(profile) ? 'en' : 'ja'
}

/**
 * 送信前プレビューラベルを返す
 * - 日本人女性: 'English:'
 * - 外国人男性: '日本語：'
 */
export function getPreviewLabel(profile: MinimalProfile | null | undefined): string {
  return isJapaneseWoman(profile) ? 'English:' : '日本語：'
}
