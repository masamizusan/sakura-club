/**
 * 🛡️ saveProfileToDb - profiles書き込み統一パイプライン（指示書準拠）
 * 
 * 目的: 全てのprofiles書き込みを1箇所に集約し、Base64のDB混入を完全阻止
 * 
 * 必須処理順序:
 * 1. payload.avatar_url = await ensureAvatarStored(...)
 * 2. blockBase64FromDB(payload)（ここで data:image/ が残ってたら throw）
 * 3. DB書き込み（insert/update/upsert）
 */

import { ensureAvatarStored, blockBase64FromDB } from '@/utils/ensureAvatarStored'

export interface ProfileDbOperation {
  operation: 'insert' | 'update' | 'upsert'
  tableName?: string
  whereClause?: Record<string, any>
  conflictKeys?: string[]
}

export interface SaveProfileResult {
  success: boolean
  data?: any
  error?: string
  operation: string
  entryPoint: string
}

/**
 * 🛡️ profiles書き込み統一エントリーポイント
 * 
 * @param supabase - Supabaseクライアント
 * @param userId - ユーザーID
 * @param payload - 保存データ（avatar_urlが含まれる可能性あり）
 * @param operation - DB操作種別
 * @param entryPoint - 呼び出し元の識別（ログ用）
 * @returns 保存結果
 */
export async function saveProfileToDb(
  supabase: any,
  userId: string,
  payload: any,
  operation: ProfileDbOperation,
  entryPoint: string
): Promise<SaveProfileResult> {
  
  // 📍 エントリーポイント特定ログ（必須）
  console.log('📍 profiles write entry:', entryPoint)
  console.log('🔧 saveProfileToDb: 開始', {
    userId,
    operation: operation.operation,
    hasAvatarUrl: !!payload.avatar_url,
    hasPhotoUrls: !!payload.photo_urls,
    entryPoint
  })

  try {
    // 1. avatar_url処理 - ensureAvatarStored で確実に変換
    if (payload.avatar_url !== undefined) {
      console.log('🔄 Processing avatar_url...')
      payload.avatar_url = await ensureAvatarStored(supabase, userId, payload.avatar_url)
    } else {
      console.log('📋 avatar input kind: not_provided')
      console.log('📋 upload attempted: false')
      console.log('📋 final avatar_url for DB: not_provided')
    }

    // 2. photo_urls処理 - 複数画像対応（修正版）
    if (payload.photo_urls !== undefined) {
      console.log('🖼️ Processing photo_urls array...', { 
        count: Array.isArray(payload.photo_urls) ? payload.photo_urls.length : 0,
        first_url_preview: Array.isArray(payload.photo_urls) && payload.photo_urls[0] 
          ? payload.photo_urls[0].substring(0, 50) + '...' 
          : 'none'
      })
      
      if (Array.isArray(payload.photo_urls) && payload.photo_urls.length > 0) {
        console.log('🔍 photo_urls内容詳細:', payload.photo_urls.map((url: string, i: number) => ({
          index: i,
          url_preview: url ? url.substring(0, 50) + '...' : 'empty',
          is_data_uri: url ? url.startsWith('data:image/') : false,
          is_http_url: url ? url.startsWith('http') : false
        })))
        
        // 各画像URLを Storage に保存（最適化版）
        const processedUrls = []
        for (let i = 0; i < Math.min(payload.photo_urls.length, 3); i++) {
          const url = payload.photo_urls[i]
          if (url && typeof url === 'string' && url.trim().length > 0) {
            console.log(`🔄 Processing photo_urls[${i}]:`, {
              original: url.substring(0, 50) + '...',
              type: url.startsWith('data:') ? 'base64' : 
                    url.startsWith('http') ? 'http_url' : 
                    url.includes('/storage/') ? 'storage_url' : 'other'
            })
            
            // 🔧 FIX: 既にStorage URLまたはHTTP URLの場合は変換をスキップ
            if (url.includes('/storage/') || url.startsWith('http')) {
              // 既存の正当なURL：そのまま使用
              console.log(`✅ Existing URL used as-is: photo_urls[${i}]`)
              processedUrls.push(url)
            } else {
              // data URIやblob URLの場合のみ変換
              const processedUrl = await ensureAvatarStored(supabase, userId, url)
              processedUrls.push(processedUrl)
              
              console.log(`✅ Converted photo_urls[${i}]:`, {
                from: url.startsWith('data:') ? 'data_uri' : 'blob_url',
                result: processedUrl ? processedUrl.substring(0, 50) + '...' : 'null'
              })
            }
          }
        }
        
        payload.photo_urls = processedUrls
        console.log('🖼️ photo_urls処理完了:', {
          original_count: Array.isArray(payload.photo_urls) ? payload.photo_urls.length : 0,
          processed_count: processedUrls.length,
          all_processed_urls: processedUrls.map((url: string | null) => url ? url.substring(0, 50) + '...' : 'null')
        })
        
        // avatar_url との同期（メイン画像）- 5-3 整合ルール固定
        if (processedUrls.length > 0) {
          payload.avatar_url = processedUrls[0]
          console.log('🔄 avatar_url synced with photo_urls[0]:', payload.avatar_url.substring(0, 50) + '...')
        } else {
          // photo_urls空配列の場合はavatar_urlもnullに統一
          payload.avatar_url = null
          console.log('🔄 avatar_url set to null (photo_urls empty)')
        }
      } else {
        console.log('🖼️ photo_urls is empty or not array, excluding from payload to prevent overwrite')
        delete payload.photo_urls  // 🚨 FIX: 空配列上書き防止 - payloadから削除
      }
    }

    // 2. 🛡️ Base64遮断安全装置（必須）
    try {
      blockBase64FromDB(payload)
      console.log('🚫 blockBase64FromDB passed')
    } catch (blockError) {
      console.error('❌ Base64遮断装置が発動 - DB保存を完全阻止')
      throw blockError
    }

    // 3. DB書き込み実行
    let dbResult: any

    switch (operation.operation) {
      case 'insert':
        console.log('📊 Executing INSERT operation')
        dbResult = await supabase
          .from(operation.tableName || 'profiles')
          .insert(payload)
          .select('*')

        break

      case 'update':
        console.log('📊 Executing UPDATE operation')
        if (!operation.whereClause) {
          throw new Error('UPDATE operation requires whereClause')
        }

        let updateQuery = supabase
          .from(operation.tableName || 'profiles')
          .update(payload)

        // where句を動的に追加
        Object.entries(operation.whereClause).forEach(([key, value]) => {
          updateQuery = updateQuery.eq(key, value)
        })

        dbResult = await updateQuery.select('*')
        break

      case 'upsert':
        console.log('📊 Executing UPSERT operation')
        const upsertOptions: any = {}
        if (operation.conflictKeys) {
          upsertOptions.onConflict = operation.conflictKeys.join(',')
        }

        dbResult = await supabase
          .from(operation.tableName || 'profiles')
          .upsert(payload, upsertOptions)
          .select('*')

        break

      default:
        throw new Error(`Unsupported operation: ${operation.operation}`)
    }

    // 4. 結果確認
    if (dbResult.error) {
      console.error('❌ DB operation failed:', dbResult.error)
      throw new Error(`${operation.operation.toUpperCase()} failed: ${dbResult.error.message}`)
    }

    console.log('✅ saveProfileToDb: 成功', {
      operation: operation.operation,
      entryPoint,
      recordCount: dbResult.data?.length || 0
    })

    return {
      success: true,
      data: dbResult.data,
      operation: operation.operation,
      entryPoint
    }

  } catch (error) {
    console.error('❌ saveProfileToDb: 失敗', {
      operation: operation.operation,
      entryPoint,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: operation.operation,
      entryPoint
    }
  }
}

/**
 * 🔧 プロフィール更新の簡易ヘルパー
 */
export async function updateProfile(
  supabase: any,
  userId: string,
  updateData: any,
  entryPoint: string
): Promise<SaveProfileResult> {
  return saveProfileToDb(
    supabase,
    userId,
    updateData,
    {
      operation: 'update',
      whereClause: { id: userId }
    },
    entryPoint
  )
}

/**
 * 🔧 プロフィール作成の簡易ヘルパー
 */
export async function insertProfile(
  supabase: any,
  userId: string,
  insertData: any,
  entryPoint: string
): Promise<SaveProfileResult> {
  return saveProfileToDb(
    supabase,
    userId,
    insertData,
    {
      operation: 'insert'
    },
    entryPoint
  )
}

/**
 * 🔧 プロフィールupsertの簡易ヘルパー
 */
export async function upsertProfile(
  supabase: any,
  userId: string,
  upsertData: any,
  entryPoint: string,
  conflictKeys: string[] = ['id']
): Promise<SaveProfileResult> {
  return saveProfileToDb(
    supabase,
    userId,
    upsertData,
    {
      operation: 'upsert',
      conflictKeys
    },
    entryPoint
  )
}