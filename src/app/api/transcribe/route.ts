import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/auth/requireActiveProfile'
import { isJapaneseWoman } from '@/utils/userHelpers'

export const dynamic = 'force-dynamic'

// Whisper API のファイルサイズ上限（25MB）
const MAX_AUDIO_BYTES = 25 * 1024 * 1024

// MIME タイプ → 拡張子（Whisper はファイル名の拡張子で形式を判定する）
const MIME_TO_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
}
const ALLOWED_EXTS = new Set(['webm', 'mp4', 'm4a', 'mp3', 'mpeg', 'mpga', 'wav', 'ogg', 'oga', 'flac'])

// 拡張子を audio.name → MIME タイプ（"audio/webm;codecs=opus" などのパラメータは除く）の順で決める
function resolveAudioExtension(audio: File): string {
  const nameExt = (audio.name?.split('.').pop() || '').toLowerCase()
  if (ALLOWED_EXTS.has(nameExt)) return nameExt
  const baseType = (audio.type || '').split(';')[0].trim().toLowerCase()
  return MIME_TO_EXT[baseType] || 'webm'
}

export async function POST(request: NextRequest) {
  try {
    // 認証（未ログインは 401）
    const supabase = createClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // memory #1 の 2 層防御: suspended ユーザーをここで弾く（OpenAI コスト発生防止）
    const guard = await requireActiveProfile(user.id)
    if (!guard.ok) {
      return NextResponse.json(
        { error: guard.message, code: guard.code },
        { status: guard.httpStatus }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const formData = await request.formData()
    const audio = formData.get('audio') as File | null

    if (!audio || typeof audio === 'string') {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 })
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 })
    }

    // 言語はログインユーザーのプロフィールで決める（画面から送られた language は使わない）
    // 日本人女性 → 'ja' を指定 / 外国人男性・その他 → 指定しない（Whisper の自動判定）
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gender, nationality')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) {
      console.error('[transcribe] profile fetch error:', profileError.message)
    }
    const language = isJapaneseWoman(profile) ? 'ja' : null

    // Whisper APIにリクエスト（ファイル名は実際の形式に合わせる）
    const whisperFormData = new FormData()
    whisperFormData.append('file', audio, `recording.${resolveAudioExtension(audio)}`)
    whisperFormData.append('model', 'whisper-1')
    if (language) {
      whisperFormData.append('language', language)
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: whisperFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Whisper API error:', errorText)
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
    }

    const result = await response.json()
    return NextResponse.json({ text: result.text })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
