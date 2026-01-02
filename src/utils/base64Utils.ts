/**
 * 🔧 Base64 → Buffer 変換ユーティリティ
 * 
 * 目的: データURL形式（data:image/jpeg;base64,...）からBufferとメタデータを抽出
 * 用途: 保存時のみBase64→Storage変換（表示は現状維持）
 */

export interface ParsedDataUrl {
  contentType: string
  buffer: Buffer
  ext: string
  size: number
}

/**
 * dataURL形式から必要な情報を抽出
 * 
 * @param dataUrl - data:image/jpeg;base64,... 形式の文字列
 * @returns 解析結果（contentType, buffer, ext, size）
 * @throws Error - 無効なdataURL形式の場合
 */
export function parseDataUrl(dataUrl: string): ParsedDataUrl {
  // data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  
  if (!matches) {
    throw new Error('Invalid data URL format. Expected: data:image/*;base64,...')
  }
  
  const contentType = matches[1] // image/jpeg
  const base64Data = matches[2]  // /9j/4AAQSkZJRgABAQEA...
  
  // Base64 → Buffer 変換
  const buffer = Buffer.from(base64Data, 'base64')
  
  // ファイル拡張子を決定
  const ext = getExtensionFromContentType(contentType)
  
  console.log('🔧 parseDataUrl:', {
    contentType,
    ext,
    originalSize: dataUrl.length,
    bufferSize: buffer.length,
    compressionRatio: Math.round((buffer.length / dataUrl.length) * 100) + '%'
  })
  
  return {
    contentType,
    buffer,
    ext,
    size: buffer.length
  }
}

/**
 * Content-Typeから適切なファイル拡張子を取得
 * 
 * @param contentType - image/jpeg, image/png 等
 * @returns 拡張子文字列（jpg, png, webp, gif）
 */
function getExtensionFromContentType(contentType: string): string {
  const type = contentType.toLowerCase()
  
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg'
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  if (type.includes('gif')) return 'gif'
  
  // デフォルト（大部分がJPEG）
  console.warn('⚠️ Unknown content type, defaulting to jpg:', contentType)
  return 'jpg'
}

/**
 * Storage path生成（統一命名規則）
 * 
 * @param userId - ユーザーID
 * @param ext - ファイル拡張子
 * @returns Storage path文字列（例：user123/avatar.jpg）
 */
export function generateStoragePath(userId: string, ext: string): string {
  // パス設計：<userId>/avatar.<ext>（上書き運用）
  return `${userId}/avatar.${ext}`
}

/**
 * Base64データURL判定
 * 
 * @param value - チェック対象の文字列
 * @returns Base64データURLかどうか
 */
export function isBase64DataUrl(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  
  return value.startsWith('data:image/') && value.includes(';base64,')
}

/**
 * Storageパス判定（既にStorage形式かチェック）
 * 
 * @param value - チェック対象の文字列
 * @returns Storageパス形式かどうか
 */
export function isStoragePath(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  
  // HTTP URLは除外
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return false
  }
  
  // Base64は除外
  if (isBase64DataUrl(value)) {
    return false
  }
  
  // Storage pathパターン（userId/avatar.ext または avatars/userId/avatar.ext）
  const storagePathPattern = /^(avatars\/)?[\w-]+\/avatar\.(jpg|jpeg|png|webp|gif)$/
  return storagePathPattern.test(value)
}

/**
 * 画像URL正規化（保存前の最終確認用）
 * 
 * @param value - avatar_url候補値
 * @returns 正規化結果と判定
 */
export function normalizeImageUrl(value: string): {
  type: 'base64' | 'http' | 'storage' | 'invalid'
  needsConversion: boolean
  originalValue: string
} {
  if (!value || typeof value !== 'string') {
    return {
      type: 'invalid',
      needsConversion: false,
      originalValue: value
    }
  }
  
  if (isBase64DataUrl(value)) {
    return {
      type: 'base64',
      needsConversion: true, // 🚨 要Storage変換
      originalValue: value
    }
  }
  
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return {
      type: 'http',
      needsConversion: false, // そのまま保存OK
      originalValue: value
    }
  }
  
  if (isStoragePath(value)) {
    return {
      type: 'storage',
      needsConversion: false, // 既にStorage形式
      originalValue: value
    }
  }
  
  return {
    type: 'invalid',
    needsConversion: false,
    originalValue: value
  }
}

/**
 * 開発・デバッグ用：Base64サイズ分析
 * 
 * @param dataUrl - Base64データURL
 * @returns サイズ分析結果
 */
export function analyzeBase64Size(dataUrl: string): {
  originalBytes: number
  originalKB: number
  estimatedFileBytes: number
  estimatedFileKB: number
  overhead: string
} {
  const originalBytes = dataUrl.length
  const originalKB = Math.round(originalBytes / 1024)
  
  // Base64は実データの約133%になる
  const estimatedFileBytes = Math.round((originalBytes - dataUrl.indexOf(',')) * 0.75)
  const estimatedFileKB = Math.round(estimatedFileBytes / 1024)
  
  const overhead = Math.round(((originalBytes - estimatedFileBytes) / estimatedFileBytes) * 100) + '%'
  
  return {
    originalBytes,
    originalKB,
    estimatedFileBytes,
    estimatedFileKB,
    overhead
  }
}