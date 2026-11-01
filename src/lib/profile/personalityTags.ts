/**
 * 性格の項目（27 項目）の唯一の表
 *
 * - 選ぶ画面（src/utils/translations.ts の personality）と、
 *   表示（src/utils/profileTagFormatters.ts の formatPersonalityTag）は、この表の表示名にそろえる
 * - DB の personality_tags には、今は「選んだときの画面の言語の表示名」が入っている
 *   （昔の訳のままの値もある）。表示するときは LEGACY_LABELS も使ってキーに直す
 */

import type { SupportedLanguage } from '@/utils/language'

export type PersonalityKey =
  | 'gentle' | 'calm' | 'lonely' | 'composed' | 'caring' | 'humble' | 'cool'
  | 'honest' | 'bright' | 'friendly' | 'helpful' | 'considerate' | 'responsible'
  | 'decisive' | 'sociable' | 'competitive' | 'passionate' | 'indoor' | 'active'
  | 'intellectual' | 'meticulous' | 'optimistic' | 'shy' | 'attentive'
  | 'refreshing' | 'natural' | 'ownPace'

type PersonalityTag = {
  key: PersonalityKey
  // DB に保存する日本語の値（今は表示名 ja と同じ）
  value: string
  labels: Record<SupportedLanguage, string>
}

export const PERSONALITY_TAGS: readonly PersonalityTag[] = [
  { key: 'gentle', value: '優しい', labels: { ja: '優しい', en: 'Gentle', ko: '다정한', 'zh-tw': '溫柔' } },
  { key: 'calm', value: '穏やか', labels: { ja: '穏やか', en: 'Calm', ko: '차분한', 'zh-tw': '溫和' } },
  { key: 'lonely', value: '寂しがりや', labels: { ja: '寂しがりや', en: 'Gets lonely easily', ko: '외로움을 잘 타는', 'zh-tw': '怕寂寞' } },
  { key: 'composed', value: '落ち着いている', labels: { ja: '落ち着いている', en: 'Composed', ko: '침착한', 'zh-tw': '沉穩' } },
  { key: 'caring', value: '思いやりがある', labels: { ja: '思いやりがある', en: 'Caring', ko: '배려심 있는', 'zh-tw': '體貼' } },
  { key: 'humble', value: '謙虚', labels: { ja: '謙虚', en: 'Humble', ko: '겸손한', 'zh-tw': '謙虛' } },
  { key: 'cool', value: '冷静', labels: { ja: '冷静', en: 'Cool-headed', ko: '이성적인', 'zh-tw': '冷靜' } },
  { key: 'honest', value: '素直', labels: { ja: '素直', en: 'Honest', ko: '솔직한', 'zh-tw': '坦率' } },
  { key: 'bright', value: '明るい', labels: { ja: '明るい', en: 'Bright', ko: '밝은', 'zh-tw': '開朗' } },
  { key: 'friendly', value: '親しみやすい', labels: { ja: '親しみやすい', en: 'Friendly', ko: '친근한', 'zh-tw': '親切' } },
  { key: 'helpful', value: '面倒見が良い', labels: { ja: '面倒見が良い', en: 'Takes care of others', ko: '잘 돌봐주는', 'zh-tw': '愛照顧人' } },
  { key: 'considerate', value: '気が利く', labels: { ja: '気が利く', en: 'Thoughtful', ko: '눈치가 빠른', 'zh-tw': '機靈' } },
  { key: 'responsible', value: '責任感がある', labels: { ja: '責任感がある', en: 'Responsible', ko: '책임감 있는', 'zh-tw': '有責任感' } },
  { key: 'decisive', value: '決断力がある', labels: { ja: '決断力がある', en: 'Decisive', ko: '결단력 있는', 'zh-tw': '有決斷力' } },
  { key: 'sociable', value: '社交的', labels: { ja: '社交的', en: 'Sociable', ko: '사교적인', 'zh-tw': '善於交際' } },
  { key: 'competitive', value: '負けず嫌い', labels: { ja: '負けず嫌い', en: 'Competitive', ko: '승부욕 강한', 'zh-tw': '不服輸' } },
  { key: 'passionate', value: '熱血', labels: { ja: '熱血', en: 'Passionate', ko: '열정적인', 'zh-tw': '熱情' } },
  { key: 'indoor', value: 'インドア', labels: { ja: 'インドア', en: 'Homebody', ko: '실내형', 'zh-tw': '室內派' } },
  { key: 'active', value: 'アクティブ', labels: { ja: 'アクティブ', en: 'Active', ko: '활동적인', 'zh-tw': '活躍' } },
  { key: 'intellectual', value: '知的', labels: { ja: '知的', en: 'Intellectual', ko: '지적인', 'zh-tw': '知性' } },
  { key: 'meticulous', value: '几帳面', labels: { ja: '几帳面', en: 'Meticulous', ko: '꼼꼼한', 'zh-tw': '一絲不苟' } },
  { key: 'optimistic', value: '楽観的', labels: { ja: '楽観的', en: 'Optimistic', ko: '낙천적인', 'zh-tw': '樂觀' } },
  { key: 'shy', value: 'シャイ', labels: { ja: 'シャイ', en: 'Shy', ko: '수줍은', 'zh-tw': '害羞' } },
  { key: 'attentive', value: 'マメ', labels: { ja: 'マメ', en: 'Attentive', ko: '자상한', 'zh-tw': '細心周到' } },
  { key: 'refreshing', value: 'さわやか', labels: { ja: 'さわやか', en: 'Fresh and clean-cut', ko: '산뜻한', 'zh-tw': '爽朗' } },
  { key: 'natural', value: '天然', labels: { ja: '天然', en: 'A bit spacey', ko: '엉뚱한', 'zh-tw': '天然呆' } },
  { key: 'ownPace', value: 'マイペース', labels: { ja: 'マイペース', en: 'Goes at my own pace', ko: '자기 페이스대로', 'zh-tw': '按自己的步調' } },
]

/**
 * 昔の表示名 → キー（今の表示名に無いものだけ）
 * 選ぶ画面の辞書（translations.ts）と表示の辞書（profileTagFormatters.ts）の昔の値。
 * 2 つの辞書で別の項目を指していた値は、保存に使われた「選ぶ画面」の意味を採る
 * （例：韓国語 세심한・繁体字 細心 は選ぶ画面では「マメ」）。
 * ただし今の表示名と同じ値（例：繁体字 體貼 ＝ 今の「思いやりがある」）は今の意味を採る。
 */
const LEGACY_LABELS: Record<string, PersonalityKey> = {
  // 英語
  'Lonely': 'lonely',
  'Reserved': 'lonely',
  'Helpful': 'helpful',
  'Considerate': 'considerate',
  'Indoor': 'indoor',
  'Refreshing': 'refreshing',
  'Natural': 'natural',
  'Own pace': 'ownPace',
  // 韓国語
  '상냥한': 'gentle',
  '외로움을 타는': 'lonely',
  '내향적인': 'lonely',
  '배려하는': 'caring',
  '냉정한': 'cool',
  '도움이 되는': 'helpful',
  '신경 쓰는': 'considerate',
  '인도어': 'indoor',
  '낙관적인': 'optimistic',
  '세심한': 'attentive',
  '상쾌한': 'refreshing',
  '천연': 'natural',
  '자연스러운 타입': 'natural',
  '자연스러운': 'natural',
  '마이페이스': 'ownPace',
  '자기 스타일이 뚜렷한': 'ownPace',
  // 繁体字
  '沉靜': 'calm',
  '容易寂寞': 'lonely',
  '內向': 'lonely',
  '貼心': 'caring',
  '謙遜': 'humble',
  '率直': 'honest',
  '樂於助人': 'helpful',
  '社交能力強': 'sociable',
  '好勝': 'competitive',
  '偏好室內活動': 'indoor',
  '細心': 'attentive',
  '清新': 'refreshing',
  '自然派': 'natural',
  '按自己的節奏': 'ownPace',
  '我行我素': 'ownPace',
}

const TAG_BY_KEY = new Map<string, PersonalityTag>(PERSONALITY_TAGS.map(tag => [tag.key, tag]))

// 今の表示名（4 言語）→ キー。昔の表示名より優先する
const CURRENT_LABELS: Record<string, PersonalityKey> = {}
for (const tag of PERSONALITY_TAGS) {
  for (const label of Object.values(tag.labels)) {
    CURRENT_LABELS[label] = tag.key
  }
}

/**
 * 保存されている値（キー・今の表示名・昔の表示名のどれでもよい）→ キー。分からなければ null
 */
export function personalityKeyFromValue(value: string | null | undefined): PersonalityKey | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (TAG_BY_KEY.has(trimmed)) return trimmed as PersonalityKey
  return CURRENT_LABELS[trimmed] ?? LEGACY_LABELS[trimmed] ?? null
}

/**
 * キー → その言語の表示名
 */
export function getPersonalityLabel(key: PersonalityKey, language: SupportedLanguage): string {
  const tag = TAG_BY_KEY.get(key)
  if (!tag) return key
  return tag.labels[language] ?? tag.labels.ja
}

/**
 * 保存されている値 → 今の画面の言語の表示名。分からない値は原文のまま返す
 */
export function formatPersonalityValue(value: string, language: SupportedLanguage = 'ja'): string {
  if (!value) return ''
  const key = personalityKeyFromValue(value)
  return key ? getPersonalityLabel(key, language) : value
}
