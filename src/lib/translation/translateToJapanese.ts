/**
 * さくらいいねの一言メッセージ用 日本語翻訳（段階3-3）
 *
 * src/app/api/translate/message/route.ts の translateWithOpenAI の処理（プロンプト・モデル・
 * max_tokens・temperature）を、翻訳先を日本語（targetLang === 'ja' の分岐）に固定して複製したもの。
 * translate/message/route.ts 本体は変更しない。
 *
 * 失敗時（API キーなし・OpenAI のエラー・空の翻訳・例外）は null を返す。
 *
 * 段階3-4（さくらいいね専用の調整。チャットの翻訳 route は変更しない）:
 * - 原文がすでに日本語（ひらがな・カタカナを含む）なら OpenAI を呼ばずに原文をそのまま返す
 * - REQUIREMENTS に「原文にない言葉・絵文字・記号を追加しない」を追加
 */

const TARGET_LANGUAGE_NAME = 'Japanese'

// ひらがな（U+3040–309F）・カタカナ（U+30A0–30FF）を含むか
const KANA_REGEX = /[\u3040-\u309F\u30A0-\u30FF]/

export async function translateToJapanese(text: string): Promise<string | null> {
  // すでに日本語なら翻訳しない（原文と訳が同じになり、画面の切り替えも出ない）
  if (KANA_REGEX.test(text)) {
    return text
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[translateToJapanese] OPENAI_API_KEY is not configured')
    return null
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator for a dating/social app. Translate the following message into ${TARGET_LANGUAGE_NAME}.

REQUIREMENTS:
1. Translate naturally and conversationally
2. Preserve emojis and emoticons as-is
3. Keep the tone friendly and casual
4. Output ONLY the translated text, nothing else
5. If the text is already in ${TARGET_LANGUAGE_NAME}, return it as-is
6. Romanized Japanese proper nouns (e.g. Asakusa, Kaminarimon, Senso-ji) must be converted to proper Japanese (kanji/hiragana)
   Examples: "Asakusa" → 浅草 / "Kaminarimon" → 雷門 / "Senso-ji" → 浅草寺 / "Monjayaki" → もんじゃ焼き
7. Unknown proper nouns that cannot be converted should be written in katakana
8. Do NOT over-translate English proper nouns into Japanese
9. Do NOT add any words, emojis, or symbols that are not in the original text`
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[translateToJapanese] OpenAI API error:', response.status, errorText)
      return null
    }

    const data = await response.json()
    const translated = data.choices[0]?.message?.content?.trim() || ''

    if (!translated) {
      console.error('[translateToJapanese] OpenAI returned empty translation')
      return null
    }

    return translated
  } catch (error) {
    console.error('[translateToJapanese] error:', error)
    return null
  }
}
