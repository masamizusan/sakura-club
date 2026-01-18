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

export async function ensureAvatarStored(
  supabase: any,
  userId: string,
  avatarUrlOrDataUrl: string | null | undefined
): Promise<string | null> {
  
  // 🔍 必須ログ（指示書準拠）- 原因の切り分け
  console.log('🔧 ensureAvatarStored: 開始', {
    userId,
    avatarExists: !!avatarUrlOrDataUrl,
    avatarType: typeof avatarUrlOrDataUrl,
    avatarLength: avatarUrlOrDataUrl?.length || 0,
    avatarPreview: avatarUrlOrDataUrl?.substring(0, 30) + '...' || 'null'
  })
  
  // 1. null/undefined → null
  if (!avatarUrlOrDataUrl) {
    console.log('📋 avatar input kind: null')
    console.log('📋 upload attempted: false')
    console.log('📋 final avatar_url for DB: null')
    return null
  }

  // 2. すでにhttp(s)ならそのまま（=Storage URL想定）
  if (/^https?:\/\//.test(avatarUrlOrDataUrl)) {
    console.log('📋 avatar input kind: url')
    console.log('📋 upload attempted: false')
    console.log('📋 final avatar_url for DB:', avatarUrlOrDataUrl.substring(0, 30) + '...')
    return avatarUrlOrDataUrl
  }

  // 3. dataURL または blob URL なら Blob化してupload
  if (avatarUrlOrDataUrl.startsWith("data:image/") || avatarUrlOrDataUrl.startsWith("blob:")) {
    const inputKind = avatarUrlOrDataUrl.startsWith("data:image/") ? 'data_uri' : 'blob_url'
    console.log(`📋 avatar input kind: ${inputKind}`)
    console.log('📋 upload attempted: true')

    try {
      // dataURL または blob URL → Blob変換
      const res = await fetch(avatarUrlOrDataUrl)
      const blob = await res.blob()
      
      // 🚨 3) ユニークファイル名生成（上書き防止）
      const ext = blob.type === "image/png" ? "png" : "jpg"
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(7)
      const uniqueKey = `${timestamp}_${random}`
      const path = `${userId}/photo_${uniqueKey}.${ext}`
      
      console.log('🚨 [STORAGE OVERWRITE CHECK] ユニークパス生成:', {
        old_pattern: 'userId/avatar.ext (固定名)',
        new_pattern: 'userId/photo_{timestamp}_{random}.ext',
        generated_path: path
      })
      
      console.log('📁 Storage upload starting:', {
        path,
        blobType: blob.type,
        blobSize: Math.round(blob.size / 1024) + 'KB'
      })
      
      // 🚨 Storage アップロード（既存avatarsバケット使用）
      const up = await supabase.storage
        .from("avatars")  // 既存バケット使用（profile-imagesは未作成のためavatarsに統一）
        .upload(path, blob, { contentType: blob.type, upsert: false })  // upsert: false で上書き防止
      
      if (up.error) {
        console.log('📋 upload success: false')
        console.log('📋 upload error:', up.error.message)
        throw up.error
      }
      
      console.log('✅ Storage upload success:', up.data.path)

      // Public URL取得（avatarsバケット）
      const pub = supabase.storage.from("avatars").getPublicUrl(path)
      const publicUrl = pub.data.publicUrl ?? null
      
      if (!publicUrl) {
        console.log('📋 upload success: false')
        console.log('📋 upload error: Failed to generate public URL')
        throw new Error('Failed to generate public URL')
      }
      
      const savedBytes = avatarUrlOrDataUrl.length - publicUrl.length
      
      console.log('📋 upload success: true')
      console.log('📋 final avatar_url for DB:', publicUrl.substring(0, 30) + '...')
      console.log(`🎉 ${inputKind === 'data_uri' ? 'Base64' : 'Blob URL'} → Storage conversion complete:`, {
        inputKind,
        originalSize: avatarUrlOrDataUrl.length,
        newUrlSize: publicUrl.length,
        savedBytes: savedBytes > 0 ? savedBytes : 'N/A'
      })
      
      return publicUrl
      
    } catch (error) {
      console.log('📋 upload success: false')
      console.log('📋 upload error:', error instanceof Error ? error.message : 'Unknown error')
      
      // 指示書準拠：失敗時はthrow（新規保存を失敗させる）
      throw new Error(`Avatar Storage upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // 4. その他は不明なので拒否（またはnull）
  console.log('📋 avatar input kind: unknown')
  console.log('📋 upload attempted: false')
  console.log('📋 final avatar_url for DB: null')
  console.warn('⚠️ Unknown avatar format, returning null:', avatarUrlOrDataUrl.substring(0, 30))
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
    console.error("[avatar] BLOCKED: base64 would be saved to DB")
    console.error("payload.avatar_url:", payload.avatar_url.substring(0, 50) + "...")
    throw new Error("Avatar must be stored in Supabase Storage before saving profile")
  }
  
  console.log('🛡️ Base64遮断チェック: 通過（安全）')
}