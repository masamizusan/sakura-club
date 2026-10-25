import { timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 画像の AI 審査の API（#17 チャット画像・#67 プロフィール写真）で共通の処理
 */

// 時間差の出ない比べ方で合言葉を照合する（長さが違うときも同じ処理をしてから false）
// 合言葉はログに出さない
export function isValidWebhookSecret(received: string | null, expected: string | undefined): boolean {
  if (!expected || !received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    timingSafeEqual(b, b)
    return false
  }
  return timingSafeEqual(a, b)
}

// 画像を隔離用バケットの同じパスへ移す。成功したら true
// バケットをまたいだ移動ができない場合は、取り出し → 保存 → 元を削除
export async function moveToQuarantine(
  supabaseAdmin: SupabaseClient,
  fromBucket: string,
  quarantineBucket: string,
  path: string,
  logPrefix: string
): Promise<boolean> {
  const { error: moveError } = await supabaseAdmin.storage
    .from(fromBucket)
    .move(path, path, { destinationBucket: quarantineBucket })
  if (!moveError) return true

  console.error(`${logPrefix} move error, falling back to copy:`, moveError.message)
  const { data: blob, error: downloadError } = await supabaseAdmin.storage.from(fromBucket).download(path)
  if (downloadError || !blob) {
    console.error(`${logPrefix} download error:`, downloadError?.message)
    return false
  }
  const { error: uploadError } = await supabaseAdmin.storage
    .from(quarantineBucket)
    .upload(path, blob, { contentType: blob.type || undefined, upsert: true })
  if (uploadError) {
    console.error(`${logPrefix} quarantine upload error:`, uploadError.message)
    return false
  }
  const { error: removeError } = await supabaseAdmin.storage.from(fromBucket).remove([path])
  if (removeError) {
    console.error(`${logPrefix} original remove error:`, removeError.message)
    return false
  }
  return true
}
