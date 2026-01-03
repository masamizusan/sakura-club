/**
 * 🔧 ensureAvatarStored - Base64→Storage変換の確実実行
 * 
 * 目的: DBに保存する前に、avatar_urlをStorage URLに変換する
 * 原理: data:image/ → Storage upload → publicUrl取得 → DB保存用URL返却
 */

import { createClient } from '@/lib/supabase'

export interface AvatarStorageResult {
  success: boolean
  avatarUrlForDb: string | null
  uploadAttempted: boolean
  uploadResult: 'success' | 'failed' | 'skipped'
  uploadError?: string
  originalFormat: 'data_url' | 'blob/file' | 'storage_path' | 'http_url' | 'null'
  savedBytes?: number
}

/**
 * Avatar確実Storage保存 - DB保存直前で呼ぶ
 * 
 * @param avatar - 画像データ（dataURL, blob:, HTTP URL, Storage path, null）
 * @param userId - ユーザーID
 * @param supabaseClient - Supabaseクライアント
 * @returns Storage保存結果とDB用URL
 */
export async function ensureAvatarStored(
  avatar: string | null,
  userId: string,
  supabaseClient?: any
): Promise<AvatarStorageResult> {
  
  console.log('🔧 ensureAvatarStored: 開始', {
    userId,
    avatarExists: !!avatar,
    avatarType: typeof avatar,
    avatarLength: avatar?.length || 0,
    avatarPreview: avatar?.substring(0, 50) + '...' || 'null'
  })
  
  // 1. null/undefined チェック
  if (!avatar || typeof avatar !== 'string') {
    return {
      success: true,
      avatarUrlForDb: null,
      uploadAttempted: false,
      uploadResult: 'skipped',
      originalFormat: 'null'
    }
  }
  
  // 2. 形式判定
  let originalFormat: AvatarStorageResult['originalFormat']
  
  if (avatar.startsWith('data:image/')) {
    originalFormat = 'data_url'
  } else if (avatar.startsWith('blob:')) {
    originalFormat = 'blob/file'
  } else if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    originalFormat = 'http_url'
  } else if (avatar.includes('avatars/') || avatar.includes('/storage/')) {
    originalFormat = 'storage_path'
  } else {
    console.warn('⚠️ Unknown avatar format:', avatar.substring(0, 50))
    return {
      success: false,
      avatarUrlForDb: avatar,
      uploadAttempted: false,
      uploadResult: 'skipped',
      originalFormat: 'http_url', // フォールバック
      uploadError: 'Unknown format'
    }
  }
  
  console.log('📋 Avatar format detected:', originalFormat)
  
  // 3. Base64のみStorage変換が必要
  if (originalFormat !== 'data_url') {
    return {
      success: true,
      avatarUrlForDb: avatar, // そのまま使用（HTTP URL/Storage pathは変換不要）
      uploadAttempted: false,
      uploadResult: 'skipped',
      originalFormat
    }
  }
  
  // 4. 🚨 Base64 → Storage変換実行
  console.log('🚨 Base64 detected → Storage conversion required')
  
  try {
    const supabase = supabaseClient || createClient()
    
    // データURL解析
    const matches = avatar.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      throw new Error('Invalid data URL format')
    }
    
    const contentType = matches[1]
    const base64Data = matches[2]
    
    console.log('📋 Base64 parsing:', {
      contentType,
      base64Size: base64Data.length,
      estimatedFileSize: Math.round(base64Data.length * 0.75 / 1024) + 'KB'
    })
    
    // Base64 → Buffer
    const buffer = Buffer.from(base64Data, 'base64')
    
    // ファイル拡張子決定
    const extension = contentType.includes('png') ? 'png' : 
                     contentType.includes('gif') ? 'gif' :
                     contentType.includes('webp') ? 'webp' : 'jpg'
    
    // Storage path生成（代表1枚固定名）
    const storagePath = `avatars/${userId}/avatar.${extension}`
    
    console.log('📁 Storage upload starting:', {
      storagePath,
      contentType,
      bufferSize: Math.round(buffer.length / 1024) + 'KB'
    })
    
    // Storage アップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true // 代表1枚は上書きOK
      })
    
    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError)
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }
    
    console.log('✅ Storage upload success:', uploadData.path)
    
    // Public URL取得
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(storagePath)
    
    const publicUrl = publicUrlData.publicUrl
    
    if (!publicUrl) {
      throw new Error('Failed to generate public URL')
    }
    
    const savedBytes = avatar.length - publicUrl.length
    
    console.log('🎉 Base64 → Storage conversion complete:', {
      originalSize: avatar.length,
      newSize: publicUrl.length,
      savedBytes,
      publicUrl: publicUrl.substring(0, 60) + '...'
    })
    
    return {
      success: true,
      avatarUrlForDb: publicUrl, // DB保存用はpublic URL
      uploadAttempted: true,
      uploadResult: 'success',
      originalFormat: 'data_url',
      savedBytes
    }
    
  } catch (error) {
    console.error('❌ ensureAvatarStored failed:', error)
    
    return {
      success: false,
      avatarUrlForDb: avatar, // フォールバック：元のBase64を保存
      uploadAttempted: true,
      uploadResult: 'failed',
      originalFormat: 'data_url',
      uploadError: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * blob: URL → File変換（必要に応じて）
 */
export async function blobUrlToFile(blobUrl: string, fileName: string): Promise<File> {
  const response = await fetch(blobUrl)
  const blob = await response.blob()
  return new File([blob], fileName, { type: blob.type })
}

/**
 * 複数Avatar処理（将来の拡張用）
 */
export async function ensureMultipleAvatarsStored(
  avatars: (string | null)[],
  userId: string,
  supabaseClient?: any
): Promise<AvatarStorageResult[]> {
  
  console.log('🔧 ensureMultipleAvatarsStored:', {
    userId,
    avatarCount: avatars.length,
    validAvatars: avatars.filter(Boolean).length
  })
  
  const results: AvatarStorageResult[] = []
  
  // 順次処理（レート制限対策）
  for (let i = 0; i < avatars.length; i++) {
    const avatar = avatars[i]
    console.log(`📋 Processing avatar ${i + 1}/${avatars.length}`)
    
    const result = await ensureAvatarStored(avatar, userId, supabaseClient)
    results.push(result)
    
    // レート制限対策
    if (i < avatars.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  const successCount = results.filter(r => r.success).length
  const uploadCount = results.filter(r => r.uploadAttempted).length
  
  console.log('🎉 Multiple avatar processing complete:', {
    totalAvatars: avatars.length,
    successCount,
    uploadCount,
    failures: results.length - successCount
  })
  
  return results
}