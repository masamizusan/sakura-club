/**
 * さくらいいねの一言メッセージ用 AI 審査（段階3-3）
 *
 * src/app/api/messages/moderate/route.ts の判定部分（SYSTEM_PROMPT・モデル・response_format・
 * JSON の解釈・閾値 score >= 0.7）をそのまま複製したもの。moderate/route.ts 本体は変更しない。
 *
 * moderate との違い（さくらいいねは「審査を通ってから届ける」ため）:
 * - API キーが無い・OpenAI のエラー・JSON 解析失敗のときは { ok: false }（審査なしで通さない）
 * - contact_exchange も含め、すべてのカテゴリでフラグ付き＝送信不可（判定は呼び出し側）
 */

// moderate/route.ts の SYSTEM_PROMPT を一字一句そのまま複製
const SYSTEM_PROMPT = `
あなたはマッチングアプリのメッセージ安全監視AIです。
以下のカテゴリに該当するか判定し、JSONで返してください。

カテゴリ：
- money: 金銭要求・送金・投資・ギフト
- contact_exchange: LINE ID・メールアドレス・電話番号などの直接連絡先の交換
- spam: 他の出会い系サービス・マッチングアプリへの誘導、業者的勧誘、外部URL共有
- redirect: 他サービスへの誘導
- inappropriate: 性的・ハラスメント・暴力
- personal_info: 住所・口座・パスワード収集

返答形式（必ずJSONのみ）：
{
  "flagged": true/false,
  "category": "カテゴリ名 or null",
  "score": 0.0〜1.0,
  "reason": "理由（日本語）"
}
`

export type ModerateSpecialMessageResult =
  | { ok: true; flagged: boolean; category: string | null; score: number | null; reason: string | null }
  | { ok: false }

export async function moderateSpecialMessage(content: string): Promise<ModerateSpecialMessageResult> {
  // OpenAI API key check
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[moderateSpecialMessage] OPENAI_API_KEY is not configured')
    return { ok: false }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `メッセージ内容：「${content}」` },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      console.error('[moderateSpecialMessage] OpenAI API error:', response.status)
      return { ok: false }
    }

    const data = await response.json()
    const judgment = JSON.parse(data.choices[0].message.content || '{}')

    // moderate/route.ts と同じ閾値: スコア0.7以上でフラグを立てる
    const flagged = !!(judgment.flagged && judgment.score >= 0.7)

    return {
      ok: true,
      flagged,
      category: typeof judgment.category === 'string' ? judgment.category : null,
      score: typeof judgment.score === 'number' ? judgment.score : null,
      reason: typeof judgment.reason === 'string' ? judgment.reason : null,
    }
  } catch (error) {
    console.error('[moderateSpecialMessage] error:', error)
    return { ok: false }
  }
}
