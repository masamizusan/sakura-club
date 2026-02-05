/**
 * 🔧 ensureAvatarStored - Base64→Storage変換の確実実行（指示書準拠版）
 *
 * 目的: DBに保存する前に、avatar_urlをStorage URLに変換する
 * 原理: data:image/ → Blob → Storage upload → publicUrl取得 → DB保存用URL返却
 *
 * @param supabase - Supabaseクライアント
 * @param userId - ユーザーID
 * @param avatarUrlOrDataUrl - 画像データ（dataURL, HTTP URL, Storage path, null）
 * @returns DB保存用URL | null（失敗時はthrow）
 */

import { createClient } from '@/lib/supabase'
import { logger } from '@/utils/logger'

export async function ensureAvatarStored(
  supabase: any,
  userId: string,
  avatarUrlOrDataUrl: string | null | undefined
): Promise<string | null> {

  // 1. null/undefined → null
  if (!avatarUrlOrDataUrl) {
    return null
  }

  // 2. すでにhttp(s)ならそのまま（=Storage URL想定）
  if (/^https?:\/\//.test(avatarUrlOrDataUrl)) {
    return avatarUrlOrDataUrl
  }

  // 3. dataURL または blob URL なら Blob化してupload
  if (avatarUrlOrDataUrl.startsWith("data:image/") || avatarUrlOrDataUrl.startsWith("blob:")) {
    const inputKind = avatarUrlOrDataUrl.startsWith("data:image/") ? 'data_uri' : 'blob_url'

    try {
      // dataURL または blob URL → Blob変換
      const res = await fetch(avatarUrlOrDataUrl)
      const blob = await res.blob()

      // 🚨 ユニークファイル名生成（上書き防止）
      const ext = blob.type === "image/png" ? "png" : "jpg"
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(7)
      const uniqueKey = `${timestamp}_${random}`
      const path = `${userId}/photo_${uniqueKey}.${ext}`

      // 🚨 Storage アップロード（既存avatarsバケット使用）
      const up = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: blob.type, upsert: false })

      if (up.error) {
        logger.error('[AVATAR] upload failed:', up.error.message)
        throw up.error
      }

      // Public URL取得（avatarsバケット）
      const pub = supabase.storage.from("avatars").getPublicUrl(path)
      const publicUrl = pub.data.publicUrl ?? null

      if (!publicUrl) {
        throw new Error('Failed to generate public URL')
      }

      logger.debug('[AVATAR] converted:', inputKind, '→ storage')
      return publicUrl

    } catch (error) {
      logger.error('[AVATAR] conversion failed:', error instanceof Error ? error.message : 'Unknown error')
      throw new Error(`Avatar Storage upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // 4. その他は不明なので拒否
  logger.warn('[AVATAR] unknown format')
  return null
}

/**
 * 🛡️ Base64遮断用安全装置（指示書準拠）- 再発防止
 *
 * DB保存直前に呼び出し、Base64がpayloadに残っていたら保存を阻止する
 *
 * @param payload - DB保存用データ
 * @throws Error Base64が検出された場合
 */
export function blockBase64FromDB(payload: any): void {
  if (payload.avatar_url?.startsWith("data:image/")) {
    logger.error('[AVATAR] BLOCKED: base64 in payload')
    throw new Error("Avatar must be stored in Supabase Storage before saving profile")
  }
}
