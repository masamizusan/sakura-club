/**
 * 🔄 Avatar Storage アップロード処理（Path方式）
 * 
 * 目的: 
 * - DBにはStorage pathのみ保存（data:image禁止）
 * - Supabase Storage public bucketに確実保存
 * - 既存データとの互換性維持
 */

import { createClient } from '@/lib/supabase'
import { generateAvatarPath, getFileExtension } from './imageResolver'

const BUCKET_NAME = 'avatars'

export interface UploadResult {
  success: boolean
  storagePath?: string
  publicUrl?: string
  error?: string
  originalFormat?: 'base64' | 'file' | 'blob'
}

/**
 * 🔧 Base64文字列からBlobに変換
 */
function base64ToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid base64 data URL format')
  }
  
  const mimeType = matches[1]
  const base64Data = matches[2]
  
  // Base64 → Uint8Array
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  const blob = new Blob([bytes], { type: mimeType })
  return { blob, mimeType }
}

/**
 * 🔄 統一アバターアップロード関数
 * 
 * @param imageData - File | Blob | Base64文字列
 * @param userId - ユーザーID
 * @param supabaseClient - オプションのSupabaseクライアント
 * @returns UploadResult (storagePath + publicUrl)
 */
export async function uploadAvatarToStorage(
  imageData: File | Blob | string,
  userId: string,
  supabaseClient?: any
): Promise<UploadResult> {
  
  console.log('🔄 uploadAvatarToStorage started:', {
    userId,
    dataType: typeof imageData,
    isBase64: typeof imageData === 'string' && imageData.startsWith('data:image/')
  })
  
  try {
    const supabase = supabaseClient || createClient()
    
    let blob: Blob
    let mimeType: string
    let originalFormat: 'base64' | 'file' | 'blob'
    
    // 1. 入力データを統一的にBlobに変換
    if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
      // Base64 Data URL
      const { blob: convertedBlob, mimeType: detectedType } = base64ToBlob(imageData)
      blob = convertedBlob
      mimeType = detectedType
      originalFormat = 'base64'
      
      console.log('📋 Base64 converted to blob:', {
        size: Math.round(blob.size / 1024) + 'KB',
        mimeType
      })
      
    } else if (imageData instanceof File) {
      // File
      blob = imageData
      mimeType = imageData.type
      originalFormat = 'file'
      
    } else if (imageData instanceof Blob) {
      // Blob
      blob = imageData
      mimeType = imageData.type || 'image/jpeg'
      originalFormat = 'blob'
      
    } else {
      throw new Error('Unsupported image data format')
    }
    
    // 2. ファイル拡張子を決定
    const extension = getFileExtension(blob, mimeType)
    
    // 3. Storage path生成（固定命名規則）
    const storagePath = generateAvatarPath(userId, extension)
    
    console.log('📁 Storage upload starting:', {
      storagePath,
      size: Math.round(blob.size / 1024) + 'KB',
      mimeType
    })
    
    // 4. Storage アップロード（upsert = true で上書き）
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, blob, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true // 同じパスは上書き
      })
    
    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError)
      return {
        success: false,
        error: `Storage upload failed: ${uploadError.message}`,
        originalFormat
      }
    }
    
    console.log('✅ Storage upload success:', uploadData.path)
    
    // 5. Public URL取得
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath)
    
    const publicUrl = publicUrlData.publicUrl
    
    console.log('🔗 Public URL generated:', publicUrl?.substring(0, 60) + '...')
    
    return {
      success: true,
      storagePath,
      publicUrl,
      originalFormat
    }
    
  } catch (error) {
    console.error('❌ uploadAvatarToStorage error:', error)
    return {
      success: false,
      error: `Upload failed: ${error}`,
      originalFormat: 'unknown' as any
    }
  }
}

/**
 * 🔧 プロフィール更新時のアバター処理（段階的移行対応）
 * 
 * アップロード + DB更新をセットで実行
 * 
 * @param imageData - アップロード対象の画像データ
 * @param userId - ユーザーID
 * @param supabaseClient - Supabaseクライアント
 * @returns UploadResult & DBUpdateResult
 */
export async function updateProfileAvatar(
  imageData: File | Blob | string,
  userId: string,
  supabaseClient?: any
): Promise<UploadResult & { dbUpdateSuccess?: boolean }> {
  
  const supabase = supabaseClient || createClient()
  
  // 1. Storage アップロード
  const uploadResult = await uploadAvatarToStorage(imageData, userId, supabase)
  
  if (!uploadResult.success) {
    return uploadResult
  }
  
  // 🔄 段階的移行: avatar_pathカラム優先、fallbackはavatar_url
  console.log('💾 Updating profiles.avatar_path (safe migration):', uploadResult.storagePath)
  
  const updateData: any = {
    updated_at: new Date().toISOString()
  }
  
  // 🔄 avatar_pathカラムが存在するかチェック（段階的移行対応）
  try {
    // まずavatar_pathに保存を試行
    updateData.avatar_path = uploadResult.storagePath
    console.log('🆕 Trying to save to avatar_path column')
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
    
    if (updateError && updateError.code === '42703') {
      // カラムが存在しない場合はavatar_urlにfallback（安全版）
      console.log('🔄 avatar_path column not found, fallback to avatar_url')
      delete updateData.avatar_path
      updateData.avatar_url = uploadResult.storagePath
      
      const { error: fallbackError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId)
      
      if (fallbackError) {
        console.error('❌ Profile fallback update failed:', fallbackError)
        return {
          ...uploadResult,
          dbUpdateSuccess: false,
          error: `Fallback DB update failed: ${fallbackError.message}`
        }
      }
      
      console.log('✅ Profile avatar_url updated (fallback)')
    } else if (updateError) {
      console.error('❌ Profile avatar_path update failed:', updateError)
      return {
        ...uploadResult,
        dbUpdateSuccess: false,
        error: `DB update failed: ${updateError.message}`
      }
    } else {
      console.log('✅ Profile avatar_path updated successfully')
    }
  } catch (error) {
    console.error('❌ Profile update error:', error)
    return {
      ...uploadResult,
      dbUpdateSuccess: false,
      error: `DB update error: ${error}`
    }
  }
  
  return {
    ...uploadResult,
    dbUpdateSuccess: true
  }
}

/**
 * 🗑️ 古いアバター削除（オプション）
 * 
 * @param userId - ユーザーID
 * @param excludePath - 削除しないパス（新しくアップロードしたもの）
 */
export async function cleanupOldAvatars(
  userId: string,
  excludePath?: string,
  supabaseClient?: any
): Promise<void> {
  
  try {
    const supabase = supabaseClient || createClient()
    
    // ユーザーフォルダ内のファイルを一覧取得
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(`avatars/${userId}`)
    
    if (listError || !files) {
      console.warn('⚠️ Failed to list user files for cleanup:', listError)
      return
    }
    
    // 除外パス以外を削除対象とする
    const filesToDelete = files
      .map((file: any) => `avatars/${userId}/${file.name}`)
      .filter((path: string) => path !== excludePath)
    
    if (filesToDelete.length > 0) {
      console.log('🗑️ Cleaning up old avatars:', filesToDelete)
      
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filesToDelete)
      
      if (deleteError) {
        console.warn('⚠️ Cleanup partially failed:', deleteError)
      } else {
        console.log('✅ Old avatars cleaned up successfully')
      }
    }
    
  } catch (error) {
    console.warn('⚠️ Avatar cleanup error (non-critical):', error)
  }
}