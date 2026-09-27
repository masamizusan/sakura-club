import { createClient } from '@/lib/supabase/client'

/**
 * チャット画像（chat-images バケット）の表示用ヘルパー（段階1-B）
 *
 * - messages.image_url は新形式「{conversationId}/{ファイル名}」のパスを保存する
 * - 旧形式（getPublicUrl で作った公開 URL）もパスに変換して扱う（互換）
 * - 表示には createSignedUrls で発行した署名付き URL を使う（非公開バケット前提）
 */

const CHAT_IMAGES_BUCKET = 'chat-images'
const SIGNED_URL_EXPIRES_IN = 3600

// 「{UUID}/{ファイル名}」形式（サブフォルダ・パス区切りは不可）
const CHAT_IMAGE_PATH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^/\\]+$/i

// 旧形式の公開 URL に含まれるプレフィックス
const PUBLIC_URL_MARKER = `/storage/v1/object/public/${CHAT_IMAGES_BUCKET}/`

/**
 * image_url の値から chat-images のパスを取り出す。
 * - パス形式 → そのまま返す
 * - 旧形式の公開 URL → パス部分を decodeURIComponent して返す
 * - それ以外（外部 URL など）→ null
 */
export function extractChatImagePath(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null

  if (CHAT_IMAGE_PATH_REGEX.test(value)) return value

  const markerIndex = value.indexOf(PUBLIC_URL_MARKER)
  if (markerIndex === -1) return null

  // クエリ・フラグメントを除いたパス部分を取り出す
  const rawPath = value.slice(markerIndex + PUBLIC_URL_MARKER.length).split(/[?#]/)[0]
  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(rawPath)
  } catch {
    return null
  }

  return CHAT_IMAGE_PATH_REGEX.test(decodedPath) ? decodedPath : null
}

/**
 * image_url の値（パス / 旧公開 URL）をまとめて署名付き URL に変換する。
 * 戻り値は { 元の値 → 署名付き URL }。変換・署名に失敗したものは含めない。
 */
export async function resolveChatImageUrls(values: string[]): Promise<Record<string, string>> {
  const valueToPath = new Map<string, string>()
  for (const value of values) {
    const path = extractChatImagePath(value)
    if (path) valueToPath.set(value, path)
  }
  if (valueToPath.size === 0) return {}

  const uniquePaths = Array.from(new Set(valueToPath.values()))
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(CHAT_IMAGES_BUCKET)
    .createSignedUrls(uniquePaths, SIGNED_URL_EXPIRES_IN)

  if (error || !data) {
    console.error('[chatImages] createSignedUrls failed:', error?.message)
    return {}
  }

  const pathToSignedUrl = new Map<string, string>()
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) {
      pathToSignedUrl.set(item.path, item.signedUrl)
    }
  }

  const result: Record<string, string> = {}
  valueToPath.forEach((path, value) => {
    const signedUrl = pathToSignedUrl.get(path)
    if (signedUrl) result[value] = signedUrl
  })
  return result
}
