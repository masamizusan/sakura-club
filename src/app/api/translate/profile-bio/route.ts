import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const SUPPORTED_LANGUAGES = ['ja', 'en', 'ko', 'zh'] as const
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  ja: 'Japanese',
  en: 'English',
  ko: 'Korean',
  zh: 'Traditional Chinese'
}

// Simple rate limiting (in-memory, resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10 // requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false
  }

  userLimit.count++
  return true
}

function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').substring(0, 32)
}

async function translateWithOpenAI(text: string, targetLang: SupportedLanguage): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const targetLanguageName = LANGUAGE_NAMES[targetLang]

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
          content: `You are a professional translator. Translate the following text to ${targetLanguageName}.
Rules:
- Output ONLY the translated text, nothing else
- Preserve the original tone and politeness level
- Keep proper nouns and place names as appropriate for the target language
- Do not add explanations or notes`
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('OpenAI API error:', error)
    throw new Error('Translation API failed')
  }

  const data = await response.json()
  return data.choices[0]?.message?.content?.trim() || ''
}

/**
 * POST /api/translate/profile-bio
 *
 * 自己紹介文をAI翻訳する
 * - 認証必須
 * - キャッシュあり（同一内容は再翻訳しない）
 * - レート制限あり
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // レート制限チェック
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // リクエストボディ取得
    const body = await request.json()
    const { userId, targetLang, text } = body

    // バリデーション
    if (!userId || !targetLang || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, targetLang, text' },
        { status: 400 }
      )
    }

    if (!SUPPORTED_LANGUAGES.includes(targetLang)) {
      return NextResponse.json(
        { error: `Unsupported language: ${targetLang}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}` },
        { status: 400 }
      )
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long (max 5000 characters)' },
        { status: 400 }
      )
    }

    const sourceHash = hashText(text)

    // キャッシュ確認
    const { data: cached } = await supabase
      .from('profile_translations')
      .select('translated_text')
      .eq('user_id', userId)
      .eq('field', 'bio')
      .eq('target_lang', targetLang)
      .eq('source_hash', sourceHash)
      .maybeSingle()

    if (cached) {
      return NextResponse.json({
        translatedText: cached.translated_text,
        cached: true
      })
    }

    // AI翻訳実行
    const translatedText = await translateWithOpenAI(text, targetLang as SupportedLanguage)

    if (!translatedText) {
      return NextResponse.json(
        { error: 'Translation failed' },
        { status: 500 }
      )
    }

    // キャッシュ保存（service_role使用）
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return [] },
          setAll() {},
        },
      }
    )

    await supabaseAdmin
      .from('profile_translations')
      .upsert({
        user_id: userId,
        field: 'bio',
        target_lang: targetLang,
        source_hash: sourceHash,
        translated_text: translatedText
      }, {
        onConflict: 'user_id,field,target_lang,source_hash'
      })

    return NextResponse.json({
      translatedText,
      cached: false
    })

  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    )
  }
}
