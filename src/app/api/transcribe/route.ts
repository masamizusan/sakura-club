import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/auth/requireActiveProfile'
import { isJapaneseWoman } from '@/utils/userHelpers'

export const dynamic = 'force-dynamic'

// 文字起こしモデル（優先 → エラー時のフォールバック）
const PRIMARY_MODEL = 'gpt-4o-mini-transcribe'
const FALLBACK_MODEL = 'whisper-1'

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
    // 言語判定用のプロフィール取得と並列に実行（画面から送られた language は使わない）
    const [guard, { data: profile, error: profileError }] = await Promise.all([
      requireActiveProfile(user.id),
      supabase
        .from('profiles')
        .select('gender, nationality')
        .eq('id', user.id)
        .maybeSingle(),
    ])
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

    // 言語はログインユーザーのプロフィールで決める
    // 日本人女性 → 'ja' を指定 / 外国人男性・その他 → 指定しない（自動判定）
    if (profileError) {
      console.error('[transcribe] profile fetch error:', profileError.message)
    }
    const language = isJapaneseWoman(profile) ? 'ja' : null

    // 文字起こし（ファイル名は実際の形式に合わせる）
    const fileName = `recording.${resolveAudioExtension(audio)}`
    const transcribe = async (model: string) => {
      const transcriptionFormData = new FormData()
      transcriptionFormData.append('file', audio, fileName)
      transcriptionFormData.append('model', model)
      if (language) {
        transcriptionFormData.append('language', language)
      }
      const startedAt = Date.now()
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: transcriptionFormData,
      })
      // 計測ログ（ユーザーID・本文は出さない）
      console.log(`[transcribe] model=${model} ms=${Date.now() - startedAt} bytes=${audio.size} status=${res.status}`)
      return res
    }

    // gpt-4o-mini-transcribe を優先し、エラー時は whisper-1 で 1 回だけ再実行（フォールバック）
    let response = await transcribe(PRIMARY_MODEL)
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[transcribe] ${PRIMARY_MODEL} error, falling back to ${FALLBACK_MODEL}:`, errorText)
      response = await transcribe(FALLBACK_MODEL)
    }

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
