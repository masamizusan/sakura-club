/**
 * 画像の AI 審査（OpenAI moderation API・omni-moderation-latest・無料）
 *
 * #17（チャット画像）で作った判定を、#67（プロフィール写真）でも使うために共通化したもの。
 * - 判定するのは 性的・自傷・暴力 だけ（連絡先は判定しない）
 * - 性的・自傷・暴力（生々しいもの）→ quarantine（隔離する）
 *   暴力（生々しくないもの）だけ → record（隔離せず、記録だけ）
 * - OpenAI の失敗・タイムアウトは null（呼び出し側で image_unchecked として記録する）
 */

const OPENAI_TIMEOUT_MS = 8000

export type ImageModerationResult = {
  flagged: boolean
  categories: Record<string, boolean>
  category_scores: Record<string, number>
}

export type ImageModerationDecision =
  | { action: 'ok' }
  | { action: 'quarantine' | 'record'; flagType: string; score: number; detail: string }

// 隔離するカテゴリ → flag_type
const QUARANTINE_CATEGORIES: Array<{ category: string; flagType: string }> = [
  { category: 'sexual', flagType: 'image_sexual' },
  { category: 'sexual/minors', flagType: 'image_sexual' },
  { category: 'self-harm', flagType: 'image_self_harm' },
  { category: 'self-harm/intent', flagType: 'image_self_harm' },
  { category: 'self-harm/instructions', flagType: 'image_self_harm' },
  { category: 'violence/graphic', flagType: 'image_violence' },
]
// 記録だけするカテゴリ
const RECORD_ONLY_CATEGORIES: Array<{ category: string; flagType: string }> = [
  { category: 'violence', flagType: 'image_violence' },
]

// テスト用の強制隔離で使う結果（OpenAI を呼ばずに「性的」と判定された扱い。detail に forced_test が入る）
export const FORCED_TEST_RESULT: ImageModerationResult = {
  flagged: true,
  categories: { sexual: true },
  category_scores: { sexual: 1, forced_test: 1 },
}

// 画像の URL（署名付き URL など、OpenAI から読めるもの）を判定する。失敗したら null
export async function moderateImage(imageUrl: string, logPrefix = '[moderateImage]'): Promise<ImageModerationResult | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error(`${logPrefix} OPENAI_API_KEY is not configured`)
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS)
  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: [{ type: 'image_url', image_url: { url: imageUrl } }],
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      console.error(`${logPrefix} OpenAI moderation error:`, response.status)
      return null
    }
    const data = await response.json()
    const result = data?.results?.[0]
    if (!result || typeof result.flagged !== 'boolean') {
      console.error(`${logPrefix} OpenAI moderation returned no result`)
      return null
    }
    return {
      flagged: result.flagged,
      categories: result.categories ?? {},
      category_scores: result.category_scores ?? {},
    }
  } catch (e) {
    console.error(`${logPrefix} OpenAI moderation failed:`, e instanceof Error ? e.name : 'unknown')
    return null
  } finally {
    clearTimeout(timer)
  }
}

// 判定結果から、隔離する・記録だけ・問題なし を決める
// flag_type・score は当たったカテゴリの一番高いもの、detail は全カテゴリの値（JSON の文字）
export function decideImageModeration(result: ImageModerationResult): ImageModerationDecision {
  const scores = result.category_scores
  const hit = (list: typeof QUARANTINE_CATEGORIES) => list.filter(c => result.categories[c.category] === true)
  const quarantineHits = hit(QUARANTINE_CATEGORIES)
  const recordOnlyHits = hit(RECORD_ONLY_CATEGORIES)
  const hits = quarantineHits.length > 0 ? quarantineHits : recordOnlyHits
  if (hits.length === 0) return { action: 'ok' }

  const top = hits.reduce((a, b) => ((scores[b.category] ?? 0) > (scores[a.category] ?? 0) ? b : a))
  return {
    action: quarantineHits.length > 0 ? 'quarantine' : 'record',
    flagType: top.flagType,
    score: Math.min(Math.max(scores[top.category] ?? 0, 0), 1),
    detail: JSON.stringify(scores),
  }
}
