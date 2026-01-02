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
    console.log('🖼️ resolveAvatarSrc: No avatar_url provided → null (default icon)')
    return null
  }
  
  // 2. Base64 Data URL → そのまま表示（互換性保持）
  if (avatar_url.startsWith('data:image/')) {
    console.log('🖼️ resolveAvatarSrc: Base64 detected → direct display (compatibility)')
    return avatar_url
  }
  
  // 3. HTTP/HTTPS URL → そのまま表示
  if (avatar_url.startsWith('http://') || avatar_url.startsWith('https://')) {
    console.log('🖼️ resolveAvatarSrc: HTTP URL detected → direct display')
    return avatar_url
  }
  
  // 4. Storage path → publicURL変換
  try {
    const supabase = supabaseClient || createClient()
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(avatar_url)
    
    const publicUrl = data.publicUrl
    
    console.log('🖼️ resolveAvatarSrc: Storage path converted →', publicUrl?.substring(0, 60) + '...')
    return publicUrl
    
  } catch (error) {
    console.error('🚨 resolveAvatarSrc: Failed to resolve storage path:', error)
    console.error('   avatar_url:', avatar_url)
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
  
  console.log('🔄 resolveProfileImageSrc: 段階的移行対応', {
    avatar_path_exists: !!profileData.avatar_path,
    avatar_url_exists: !!profileData.avatar_url,
    avatar_path_preview: profileData.avatar_path?.substring(0, 30) || 'none',
    avatar_url_preview: profileData.avatar_url?.substring(0, 30) || 'none',
    migration_strategy: 'avatar_path優先'
  })
  
  // 最初に有効な値を解決
  for (const url of candidateUrls) {
    const resolved = resolveAvatarSrc(url, supabaseClient)
    if (resolved) {
      return resolved
    }
  }
  
  console.log('🖼️ resolveProfileImageSrc: No valid image found in profile data')
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
  
  const path = `avatars/${userId}/avatar.${ext}`
  console.log('🖼️ generateAvatarPath:', path)
  return path
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
    console.warn('🚨 Base64 Data URL detected in image fields:', base64Fields)
    console.warn('   This should be migrated to Storage path')
    console.warn('   Run: npm run migrate-avatars')
    return true
  }
  
  return false
}