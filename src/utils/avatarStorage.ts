/**
 * 🛡️ Avatar Storage 恒久ガード・URL化ユーティリティ
 * 
 * 目的: プロフィール保存時にbase64を必ずStorage URLに変換
 * 使用箇所: 保存処理の直前（saveProfile, updateProfile等）
 */

import { createClient } from '@/lib/supabase'
import { logger } from '@/utils/logger'

const BUCKET_NAME = 'avatars'

export interface AvatarProcessResult {
  success: boolean
  avatarUrl: string | null
  storagePath?: string
  error?: string
  wasBase64?: boolean
}

/**
 * Base64文字列からバイナリデータとMIMEタイプを抽出
 */
function parseBase64DataUrl(dataUrl: string) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid data URL format')
  }
  
  const mimeType = matches[1]
  const base64Data = matches[2]
  
  // Base64をArrayBufferに変換
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  // ファイル拡張子を決定
  const extension = mimeType.includes('jpeg') ? 'jpg' : 
                   mimeType.includes('png') ? 'png' : 
                   mimeType.includes('gif') ? 'gif' : 
                   mimeType.includes('webp') ? 'webp' : 'jpg'
  
  return {
    buffer: bytes,
    mimeType,
    extension,
    size: bytes.length
  }
}

/**
 * 🔧 Avatar URL の正規化（恒久ガード）
 * 
 * @param avatarUrl - 処理対象のavatarUrl
 * @param userId - ユーザーID（Storageパス生成用）
 * @returns AvatarProcessResult
 */
export async function normalizeAvatarUrl(
  avatarUrl: string | null | undefined,
  userId: string
): Promise<AvatarProcessResult> {
  
  // 1. null/undefined/空文字の場合はそのまま返す
  if (!avatarUrl || avatarUrl.trim() === '') {
    return {
      success: true,
      avatarUrl: null,
      wasBase64: false
    }
  }
  
  // 2. 既にHTTPS URLの場合はそのまま返す
  if (avatarUrl.startsWith('https://') || avatarUrl.startsWith('http://')) {
    return {
      success: true,
      avatarUrl: avatarUrl,
      wasBase64: false
    }
  }
  
  // 3. Base64 Data URLの場合は Storage にアップロード
  if (avatarUrl.startsWith('data:image/')) {
    logger.debug('[AVATAR] base64→storage convert')
    
    try {
      // 3-1. Base64解析
      const { buffer, mimeType, extension, size } = parseBase64DataUrl(avatarUrl)
      logger.debug('[AVATAR] parsed:', Math.round(size / 1024), 'KB')
      
      // サイズチェック（5MB制限）
      if (size > 5242880) {
        return {
          success: false,
          avatarUrl: null,
          error: 'Image size exceeds 5MB limit',
          wasBase64: true
        }
      }
      
      // 3-2. Storage パス生成
      const timestamp = Date.now()
      const fileName = `avatar_${timestamp}.${extension}`
      const storagePath = `${userId}/${fileName}`
      
      // 3-3. Supabase Storage にアップロード
      const supabase = createClient()
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) {
        logger.error('[AVATAR] upload failed:', uploadError.message)
        return {
          success: false,
          avatarUrl: null,
          error: `Upload failed: ${uploadError.message}`,
          wasBase64: true
        }
      }
      
      // 3-4. Public URL取得
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath)
      
      const publicUrl = publicUrlData.publicUrl
      
      logger.debug('[AVATAR] converted to storage')
      
      return {
        success: true,
        avatarUrl: publicUrl,
        storagePath: storagePath,
        wasBase64: true
      }
      
    } catch (error) {
      logger.error('[AVATAR] base64 processing failed')
      return {
        success: false,
        avatarUrl: null,
        error: `Base64 processing failed: ${error}`,
        wasBase64: true
      }
    }
  }
  
  // 4. その他の形式（不明）の場合は警告してnull
  logger.warn('[AVATAR] unknown format')
  return {
    success: true,
    avatarUrl: null,
    wasBase64: false
  }
}

/**
 * 🛡️ プロフィールデータの Avatar URL 正規化（保存前処理）
 * 
 * @param profileData - 保存予定のプロフィールデータ
 * @param userId - ユーザーID
 * @returns 正規化済みプロフィールデータ
 */
export async function normalizeProfileAvatars(
  profileData: any,
  userId: string
): Promise<{ profileData: any; normalizeResults: AvatarProcessResult[] }> {
  
  const results: AvatarProcessResult[] = []
  const normalizedData = { ...profileData }
  
  // avatar_url の正規化
  if (profileData.avatar_url !== undefined) {
    const result = await normalizeAvatarUrl(profileData.avatar_url, userId)
    results.push(result)
    
    if (!result.success) {
      logger.error('[AVATAR] normalization failed:', result.error)
      // 失敗時はnullに設定（base64を保存しない）
      normalizedData.avatar_url = null
    } else {
      normalizedData.avatar_url = result.avatarUrl
    }
  }
  
  // profile_image の正規化（もしあれば）
  if (profileData.profile_image !== undefined) {
    const result = await normalizeAvatarUrl(profileData.profile_image, userId)
    results.push(result)
    
    if (!result.success) {
      logger.error('[AVATAR] profile image normalization failed:', result.error)
      normalizedData.profile_image = null
    } else {
      normalizedData.profile_image = result.avatarUrl
    }
  }
  
  // 結果ログ
  const base64Count = results.filter(r => r.wasBase64).length
  if (base64Count > 0) {
    logger.debug('[AVATAR] normalized:', base64Count, 'converted')
  }
  
  return {
    profileData: normalizedData,
    normalizeResults: results
  }
}

/**
 * 🚨 Base64検出・警告機能
 */
export function detectBase64InProfile(profileData: any): boolean {
  const base64Fields = []
  
  if (profileData.avatar_url?.startsWith('data:image/')) {
    base64Fields.push('avatar_url')
  }
  if (profileData.profile_image?.startsWith('data:image/')) {
    base64Fields.push('profile_image')
  }
  
  if (base64Fields.length > 0) {
    logger.error('[AVATAR] base64 detected:', base64Fields.join(', '))
    return true
  }
  
  return false
}