/**
 * 🔧 プロフィール保存処理（Base64→Storage変換統合版）
 * 
 * 目的: 保存時のみBase64をStorage pathに変換（表示は現状維持）
 * 特徴: 編集→プレビュー→マイページ→編集のフローを崩さない
 */

import { isBase64DataUrl, normalizeImageUrl } from './base64Utils'
import { logger } from '@/utils/logger'

interface ProcessAvatarResult {
  finalAvatarUrl: string | null
  wasConverted: boolean
  originalFormat: 'base64' | 'http' | 'storage' | 'blob' | 'invalid'
  savedBytes?: number
  error?: string
}

/**
 * アバター画像の保存前処理（Base64→Storage変換）
 * 
 * @param avatarUrl - プロフィール画像URL（Base64 or HTTP or Storage or blob:）
 * @param userId - ユーザーID
 * @returns 変換結果と最終的なavatar_url
 */
export async function processAvatarForSave(
  avatarUrl: string | null,
  userId: string
): Promise<ProcessAvatarResult> {
  logger.debug('🔧 processAvatarForSave:', {
    userId,
    avatarUrl: avatarUrl?.substring(0, 60) + '...' || 'null',
    avatarType: typeof avatarUrl
  })
  
  // 1. null/undefined チェック
  if (!avatarUrl || typeof avatarUrl !== 'string') {
    return {
      finalAvatarUrl: null,
      wasConverted: false,
      originalFormat: 'invalid'
    }
  }
  
  // 2. blob: URL処理（既存ロジック維持）
  if (avatarUrl.startsWith('blob:')) {
    return {
      finalAvatarUrl: avatarUrl, // blob:は既存処理に委譲
      wasConverted: false,
      originalFormat: 'blob'
    }
  }
  
  // 3. 画像URL正規化・判定
  const normalized = normalizeImageUrl(avatarUrl)
  
  logger.debug('📋 Image URL analysis:', {
    type: normalized.type,
    needsConversion: normalized.needsConversion,
    originalLength: avatarUrl.length
  })
  
  // 4. Base64変換が必要かチェック
  if (!normalized.needsConversion) {
    // HTTP URL または Storage path → そのまま
    return {
      finalAvatarUrl: avatarUrl,
      wasConverted: false,
      originalFormat: normalized.type as any
    }
  }
  
  // 5. 🚨 Base64 → Storage 変換実行
  if (normalized.type === 'base64') {
    logger.debug('🚨 Base64 detected → Starting Storage conversion...')
    
    try {
      // 🔒 SECURITY: userIdはAPIサーバー側でauthUser.idから取得（リクエストに含めない）
      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dataUrl: avatarUrl  // userIdは送らない - サーバー側で認証から取得
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API upload failed:', response.status, errorText)
        throw new Error(`Upload API failed: ${response.status} ${errorText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        console.error('❌ Storage upload failed:', result.error)
        throw new Error(`Storage upload failed: ${result.error}`)
      }
      
      const { path, meta } = result
      
      logger.debug('✅ Base64 → Storage conversion success:', {
        originalSize: meta?.originalSize || avatarUrl.length,
        storagePath: path,
        savedBytes: meta?.savedBytes || (avatarUrl.length - path.length)
      })
      
      return {
        finalAvatarUrl: path, // Storage path（例：user123/avatar.jpg）
        wasConverted: true,
        originalFormat: 'base64',
        savedBytes: meta?.savedBytes || (avatarUrl.length - path.length)
      }
      
    } catch (error) {
      console.error('❌ Base64 → Storage conversion failed:', error)
      
      // 🔧 フォールバック: 変換失敗時は元のBase64を保存（既存動作維持）
      logger.debug('🔄 Fallback: Saving original Base64 (conversion failed)')
      
      return {
        finalAvatarUrl: avatarUrl,
        wasConverted: false,
        originalFormat: 'base64',
        error: error instanceof Error ? error.message : 'Unknown conversion error'
      }
    }
  }
  
  // 6. その他（想定外）
  return {
    finalAvatarUrl: avatarUrl,
    wasConverted: false,
    originalFormat: 'invalid',
    error: 'Unexpected image format'
  }
}

/**
 * 複数画像の一括処理（将来の拡張用）
 * 
 * @param imageUrls - 画像URL配列
 * @param userId - ユーザーID
 * @returns 変換結果配列
 */
export async function processMultipleImagesForSave(
  imageUrls: string[],
  userId: string
): Promise<ProcessAvatarResult[]> {
  logger.debug('🔧 processMultipleImagesForSave:', {
    userId,
    imageCount: imageUrls.length,
    imagePreviews: imageUrls.map(url => url?.substring(0, 30) + '...' || 'null')
  })
  
  const results: ProcessAvatarResult[] = []
  
  // 順次処理（並行処理だとAPI制限に引っかかる可能性）
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i]
    logger.debug(`📋 Processing image ${i + 1}/${imageUrls.length}`)
    
    const result = await processAvatarForSave(imageUrl, userId)
    results.push(result)
    
    // レート制限対策
    if (i < imageUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  const conversions = results.filter(r => r.wasConverted).length
  const totalSavedBytes = results.reduce((sum, r) => sum + (r.savedBytes || 0), 0)
  
  logger.debug('🎉 Batch processing complete:', {
    totalImages: imageUrls.length,
    conversions,
    totalSavedKB: Math.round(totalSavedBytes / 1024)
  })
  
  return results
}

/**
 * プロフィール保存時のavatar_url処理ラッパー
 * 
 * @param profileData - プロフィールデータ
 * @param userId - ユーザーID
 * @returns 変換後のプロフィールデータ
 */
export async function prepareProfileForSave<T extends { avatar_url?: string | null }>(
  profileData: T,
  userId: string
): Promise<T & { avatar_conversion_log?: ProcessAvatarResult }> {
  logger.debug('🔧 prepareProfileForSave:', {
    userId,
    hasAvatarUrl: !!profileData.avatar_url,
    avatarUrlPreview: profileData.avatar_url?.substring(0, 30) + '...' || 'null'
  })
  
  if (!profileData.avatar_url) {
    return {
      ...profileData,
      avatar_conversion_log: {
        finalAvatarUrl: null,
        wasConverted: false,
        originalFormat: 'invalid'
      }
    }
  }
  
  const conversionResult = await processAvatarForSave(profileData.avatar_url, userId)
  
  return {
    ...profileData,
    avatar_url: conversionResult.finalAvatarUrl,
    avatar_conversion_log: conversionResult
  }
}