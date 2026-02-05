/**
 * 🖼️ Avatar Image URL 解決ユーティリティ
 * 
 * 目的: マイページのアバター画像を常に表示させる
 * 方針: 
 * - data:image/* → そのまま表示（互換性）
 * - http/https → そのまま表示
 * - Storage path → publicURL変換
 * - null/undefined → null（デフォルトアイコン）
 */

import { createClient } from '@/lib/supabase'
import { logger } from '@/utils/logger'

const BUCKET_NAME = 'avatars'

/**
 * 🔧 Avatar URL 解決関数（全画面統一）
 * 
 * @param avatar_url - DB内のavatar_urlフィールド値（またはavatar_path）
 * @param supabaseClient - オプションのSupabaseクライアント（未提供時は新規作成）
 * @returns 表示用URL文字列 | null
 */
export function resolveAvatarSrc(
  avatar_url: string | null | undefined,
  supabaseClient?: any
): string | null {
  
  // 1. null/undefined/空文字 → デフォルトアイコン
  if (!avatar_url || avatar_url.trim() === '') {
    return null
  }

  // 2. Base64 Data URL → そのまま表示（互換性保持）
  if (avatar_url.startsWith('data:image/')) {
    return avatar_url
  }

  // 3. HTTP/HTTPS URL → そのまま表示
  if (avatar_url.startsWith('http://') || avatar_url.startsWith('https://')) {
    return avatar_url
  }

  // 4. Storage path → publicURL変換
  try {
    const supabase = supabaseClient || createClient()
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(avatar_url)

    return data.publicUrl
  } catch (error) {
    logger.error('[IMAGE] resolve failed:', avatar_url?.slice(0, 30))
    return null
  }
}

/**
 * 🖼️ プロフィール画像解決（複数フィールド対応・avatar_path優先）
 * 
 * MyPage/Preview等でavatar_path、avatar_url、profile_image、avatarUrl等を
 * 統一的に処理するためのヘルパー関数
 * 
 * @param profileData - プロフィールデータオブジェクト
 * @param supabaseClient - オプションのSupabaseクライアント
 * @returns 表示用URL文字列 | null
 */
export function resolveProfileImageSrc(
  profileData: any,
  supabaseClient?: any
): string | null {
  
  if (!profileData) {
    return null
  }
  
  // 🔄 段階的移行: avatar_path優先、なければavatar_url（安全版）
  const candidateUrls = [
    profileData.avatar_path,    // 🆕 Storage pathを最優先
    profileData.avatar_url,     // 既存（Base64/HTTP/Storage path互換）
    profileData.profile_image,
    profileData.avatarUrl
  ].filter(Boolean) // null/undefined を除外
  
  // 最初に有効な値を解決
  for (const url of candidateUrls) {
    const resolved = resolveAvatarSrc(url, supabaseClient)
    if (resolved) {
      return resolved
    }
  }

  return null
}

/**
 * 🔧 Storage Path 生成（アップロード時用）
 * 
 * 命名規則: avatars/{user_id}/avatar.{ext}
 * 
 * @param userId - ユーザーID
 * @param fileExtension - ファイル拡張子（jpg/png/webp）
 * @returns Storage path文字列
 */
export function generateAvatarPath(userId: string, fileExtension: string = 'jpg'): string {
  // 拡張子の正規化（ドット削除）
  const ext = fileExtension.replace(/^\./, '').toLowerCase()
  
  return `avatars/${userId}/avatar.${ext}`
}

/**
 * 🗂️ ファイルタイプから拡張子を判定
 */
export function getFileExtension(file: File | Blob, mimeType?: string): string {
  const type = mimeType || (file as File).type
  
  if (type?.includes('jpeg') || type?.includes('jpg')) return 'jpg'
  if (type?.includes('png')) return 'png'
  if (type?.includes('webp')) return 'webp'
  if (type?.includes('gif')) return 'gif'
  
  // デフォルトはjpg
  return 'jpg'
}

/**
 * 🚨 Base64検出・警告（開発者向け）
 */
export function detectBase64InImageFields(data: any): boolean {
  if (!data) return false
  
  const base64Fields = []
  
  // 各画像フィールドをチェック
  const imageFields = ['avatar_url', 'profile_image', 'avatarUrl']
  
  for (const field of imageFields) {
    if (data[field]?.startsWith('data:image/')) {
      base64Fields.push(field)
    }
  }
  
  if (base64Fields.length > 0) {
    logger.warn('[IMAGE] Base64 detected:', base64Fields.join(', '))
    return true
  }
  
  return false
}