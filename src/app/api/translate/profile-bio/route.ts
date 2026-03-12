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

// エラーコード定義
const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  RATE_LIMIT: 'RATE_LIMIT',
  INVALID_PARAMS: 'INVALID_PARAMS',
  UNSUPPORTED_LANG: 'UNSUPPORTED_LANG',
  TEXT_TOO_LONG: 'TEXT_TOO_LONG',
  OPENAI_KEY_MISSING: 'OPENAI_KEY_MISSING',
  OPENAI_API_ERROR: 'OPENAI_API_ERROR',
  TRANSLATION_EMPTY: 'TRANSLATION_EMPTY',
  CACHE_ERROR: 'CACHE_ERROR',
  UNKNOWN: 'UNKNOWN'
} as const

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

// プロンプトバージョン: プロンプト改善時にインクリメントしてキャッシュを無効化
const PROMPT_VERSION = 'v2'

function hashText(text: string): string {
  // プロンプトバージョンを含めることで、プロンプト改善時に自動的に再翻訳される
  return crypto.createHash('sha256').update(`${PROMPT_VERSION}:${text}`).digest('hex').substring(0, 32)
}

async function translateWithOpenAI(text: string, targetLang: SupportedLanguage): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[TRANSLATE] OPENAI_API_KEY is not configured')
    throw new Error(ERROR_CODES.OPENAI_KEY_MISSING)
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
          content: `You are a professional translator. Translate the following text completely into ${targetLanguageName}.

CRITICAL RULES:
- Translate EVERY word into ${targetLanguageName}. Do NOT leave any words in the source language (Japanese, Korean, Chinese, etc.)
- The output must contain ONLY ${targetLanguageName} text with no foreign language words mixed in
- Output ONLY the translated text, nothing else
- Preserve the original tone, politeness level, and meaning
- Translate proper nouns and place names appropriately for the target language
- Do not add explanations, notes, or commentary
- Ensure the translation reads naturally in ${targetLanguageName}`
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
    const errorText = await response.text()
    console.error('[TRANSLATE] OpenAI API error:', response.status, errorText)
    throw new Error(`${ERROR_CODES.OPENAI_API_ERROR}:${response.status}`)
  }

  const data = await response.json()
  const translated = data.choices[0]?.message?.content?.trim() || ''

  if (!translated) {
    console.error('[TRANSLATE] OpenAI returned empty translation')
    throw new Error(ERROR_CODES.TRANSLATION_EMPTY)
  }

  return translated
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
  const startTime = Date.now()

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
    if (authError) {
      console.error('[TRANSLATE] Auth error:', authError.message)
    }
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: ERROR_CODES.AUTH_REQUIRED },
        { status: 401 }
      )
    }

    // レート制限チェック
    if (!checkRateLimit(user.id)) {
      console.warn('[TRANSLATE] Rate limit exceeded for user:', user.id.slice(0, 8))
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.', code: ERROR_CODES.RATE_LIMIT },
        { status: 429 }
      )
    }

    // リクエストボディ取得
    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: ERROR_CODES.INVALID_PARAMS },
        { status: 400 }
      )
    }

    const { userId, targetLang, text } = body

    // バリデーション
    if (!userId || !targetLang || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, targetLang, text', code: ERROR_CODES.INVALID_PARAMS },
        { status: 400 }
      )
    }

    if (!SUPPORTED_LANGUAGES.includes(targetLang)) {
      return NextResponse.json(
        {
          error: `Unsupported language: ${targetLang}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
          code: ERROR_CODES.UNSUPPORTED_LANG
        },
        { status: 400 }
      )
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long (max 5000 characters)', code: ERROR_CODES.TEXT_TOO_LONG },
        { status: 400 }
      )
    }

    const sourceHash = hashText(text)

    // キャッシュ確認
    const { data: cached, error: cacheReadError } = await supabase
      .from('profile_translations')
      .select('translated_text')
      .eq('user_id', userId)
      .eq('field', 'bio')
      .eq('target_lang', targetLang)
      .eq('source_hash', sourceHash)
      .maybeSingle()

    if (cacheReadError) {
      console.error('[TRANSLATE] Cache read error:', cacheReadError.message)
      // キャッシュ読み取りエラーは続行（翻訳を実行）
    }

    if (cached) {
      console.log('[TRANSLATE] Cache hit for user:', userId.slice(0, 8), 'lang:', targetLang)
      return NextResponse.json({
        translatedText: cached.translated_text,
        cached: true
      })
    }

    // AI翻訳実行
    let translatedText: string
    try {
      translatedText = await translateWithOpenAI(text, targetLang as SupportedLanguage)
    } catch (translateError) {
      const errMsg = translateError instanceof Error ? translateError.message : 'Unknown error'
      console.error('[TRANSLATE] Translation failed:', errMsg)

      // エラーコードを解析
      if (errMsg === ERROR_CODES.OPENAI_KEY_MISSING) {
        return NextResponse.json(
          { error: 'Translation service not configured', code: ERROR_CODES.OPENAI_KEY_MISSING },
          { status: 503 }
        )
      }
      if (errMsg.startsWith(ERROR_CODES.OPENAI_API_ERROR)) {
        const status = errMsg.split(':')[1] || '500'
        return NextResponse.json(
          { error: 'Translation API error', code: ERROR_CODES.OPENAI_API_ERROR, detail: `status:${status}` },
          { status: 502 }
        )
      }
      if (errMsg === ERROR_CODES.TRANSLATION_EMPTY) {
        return NextResponse.json(
          { error: 'Translation returned empty', code: ERROR_CODES.TRANSLATION_EMPTY },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: 'Translation failed', code: ERROR_CODES.UNKNOWN },
        { status: 500 }
      )
    }

    // キャッシュ保存（service_role使用）
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error('[TRANSLATE] SUPABASE_SERVICE_ROLE_KEY is not configured - cache will not be saved')
      // キャッシュ保存できなくても翻訳結果は返す
      return NextResponse.json({
        translatedText,
        cached: false
      })
    }

    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        cookies: {
          getAll() { return [] },
          setAll() {},
        },
      }
    )

    const { error: cacheWriteError } = await supabaseAdmin
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

    if (cacheWriteError) {
      console.error('[TRANSLATE] Cache write error:', cacheWriteError.message)
      // キャッシュ保存エラーでも翻訳結果は返す
    }

    const duration = Date.now() - startTime
    console.log('[TRANSLATE] Success for user:', userId.slice(0, 8), 'lang:', targetLang, 'duration:', duration, 'ms')

    return NextResponse.json({
      translatedText,
      cached: false
    })

  } catch (error) {
    console.error('[TRANSLATE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Translation failed', code: ERROR_CODES.UNKNOWN },
      { status: 500 }
    )
  }
}
