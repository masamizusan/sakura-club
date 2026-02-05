/**
 * 🛡️ saveProfileToDb - profiles書き込み統一パイプライン（指示書準拠）
 *
 * 目的: 全てのprofiles書き込みを1箇所に集約し、Base64のDB混入を完全阻止
 *
 * 必須処理順序:
 * 1. payload.avatar_url = await ensureAvatarStored(...)
 * 2. blockBase64FromDB(payload)（ここで data:image/ が残ってたら throw）
 * 3. DB書き込み（insert/update/upsert）
 * 4. 🆕 TASK D: 削除された画像をStorageから掃除（差分削除）
 */

import { ensureAvatarStored, blockBase64FromDB } from '@/utils/ensureAvatarStored'
import { logger } from '@/utils/logger'

/**
 * 🗑️ TASK D: Storage URL から path を抽出
 * URL例: https://xxx.supabase.co/storage/v1/object/public/avatars/<userId>/photo_xxx.jpg
 * → path: <userId>/photo_xxx.jpg
 */
export function extractStoragePath(url: string): string | null {
  if (!url || typeof url !== 'string') return null

  // avatars バケットのパスを抽出
  const match = url.match(/\/storage\/v1\/object\/public\/avatars\/(.+)$/)
  if (match && match[1]) {
    return match[1]
  }
  return null
}

/**
 * 🗑️ TASK D: 削除された画像をStorageから掃除（差分削除）+ 証跡DB保存
 *
 * @param supabase - Supabaseクライアント
 * @param userId - ユーザーID
 * @param prevUrls - DB保存前のphoto_urls
 * @param nextUrls - DB保存後のphoto_urls
 * @param entryPoint - 呼び出し元識別子
 * @returns CleanupResult 削除結果
 */
export interface CleanupResult {
  success: boolean
  deletedCount: number
  deletedPaths: string[]
  oldCount: number
  newCount: number
  errorMessage: string | null
}

export async function cleanupRemovedImages(
  supabase: any,
  userId: string,
  prevUrls: string[],
  nextUrls: string[],
  entryPoint: string
): Promise<CleanupResult> {
  // 削除対象 = prev - next
  const removedUrls = prevUrls.filter(url => !nextUrls.includes(url))

  // ✅✅✅ TASKD_PROOF: 開始ログ（削除対象なしも記録）
  logger.debug('[TASKD] CLEANUP_START', {
    userId,
    oldCount: prevUrls.length,
    newCount: nextUrls.length,
    toDeleteCount: removedUrls.length,
    entryPoint
  })

  // 削除対象なし → 証跡のみ保存して終了
  if (removedUrls.length === 0) {
    logger.debug('[TASKD] NO_DELETE_NEEDED', {
      userId,
      reason: '差分なし（削除対象画像なし）'
    })

    // 証跡DB保存（削除なしも記録）
    await saveCleanupLog(supabase, {
      user_id: userId,
      deleted_paths: [],
      requested_delete_count: 0,
      old_photo_urls: prevUrls,
      new_photo_urls: nextUrls,
      success: true,
      error_message: null,
      entry_point: entryPoint
    })

    return {
      success: true,
      deletedCount: 0,
      deletedPaths: [],
      oldCount: prevUrls.length,
      newCount: nextUrls.length,
      errorMessage: null
    }
  }

  // URL → Storage path に変換
  const paths = removedUrls
    .map(url => extractStoragePath(url))
    .filter((path): path is string => path !== null)

  // ✅✅✅ TASKD_PROOF: 削除対象パス一覧
  logger.debug('[TASKD] DELETE_START', {
    userId,
    pathsToDelete: paths,
    oldCount: prevUrls.length,
    newCount: nextUrls.length,
    removedUrls: removedUrls.map(u => u.substring(0, 80))
  })

  if (paths.length === 0) {
    logger.debug('[TASKD] SKIP_DELETE', {
      userId,
      reason: '有効なStorage pathなし（外部URLの可能性）'
    })

    // 証跡DB保存（変換失敗も記録）
    await saveCleanupLog(supabase, {
      user_id: userId,
      deleted_paths: [],
      requested_delete_count: removedUrls.length,
      old_photo_urls: prevUrls,
      new_photo_urls: nextUrls,
      success: true,
      error_message: 'No valid storage paths (external URLs)',
      entry_point: entryPoint
    })

    return {
      success: true,
      deletedCount: 0,
      deletedPaths: [],
      oldCount: prevUrls.length,
      newCount: nextUrls.length,
      errorMessage: 'No valid storage paths (external URLs)'
    }
  }

  try {
    const { error, data } = await supabase.storage.from('avatars').remove(paths)

    if (error) {
      // ❌❌❌ TASKD_PROOF: 削除失敗
      logger.error('[TASKD] DELETE_FAILED', {
        userId,
        pathsToDelete: paths,
        error: error.message || JSON.stringify(error)
      })

      // 証跡DB保存（失敗）
      await saveCleanupLog(supabase, {
        user_id: userId,
        deleted_paths: paths,
        requested_delete_count: paths.length,
        old_photo_urls: prevUrls,
        new_photo_urls: nextUrls,
        success: false,
        error_message: error.message || JSON.stringify(error),
        entry_point: entryPoint
      })

      return {
        success: false,
        deletedCount: 0,
        deletedPaths: paths,
        oldCount: prevUrls.length,
        newCount: nextUrls.length,
        errorMessage: error.message || JSON.stringify(error)
      }
    } else {
      // ✅✅✅ TASKD_PROOF: 削除成功
      logger.debug('[TASKD] DELETE_RESULT', {
        userId,
        deleted: paths,
        result: 'SUCCESS',
        deletedCount: paths.length
      })

      // 証跡DB保存（成功）
      await saveCleanupLog(supabase, {
        user_id: userId,
        deleted_paths: paths,
        requested_delete_count: paths.length,
        old_photo_urls: prevUrls,
        new_photo_urls: nextUrls,
        success: true,
        error_message: null,
        entry_point: entryPoint
      })

      return {
        success: true,
        deletedCount: paths.length,
        deletedPaths: paths,
        oldCount: prevUrls.length,
        newCount: nextUrls.length,
        errorMessage: null
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'

    // ❌❌❌ TASKD_PROOF: 例外発生
    logger.error('[TASKD] DELETE_EXCEPTION', {
      userId,
      pathsToDelete: paths,
      error: errorMessage
    })

    // 証跡DB保存（例外）
    await saveCleanupLog(supabase, {
      user_id: userId,
      deleted_paths: paths,
      requested_delete_count: paths.length,
      old_photo_urls: prevUrls,
      new_photo_urls: nextUrls,
      success: false,
      error_message: `Exception: ${errorMessage}`,
      entry_point: entryPoint
    })

    return {
      success: false,
      deletedCount: 0,
      deletedPaths: paths,
      oldCount: prevUrls.length,
      newCount: nextUrls.length,
      errorMessage: `Exception: ${errorMessage}`
    }
  }
}

/**
 * 🗂️ TASK D: 証跡DB保存（profile_photo_cleanup_logs）
 */
interface CleanupLogData {
  user_id: string
  deleted_paths: string[]
  requested_delete_count: number
  old_photo_urls: string[]
  new_photo_urls: string[]
  success: boolean
  error_message: string | null
  entry_point: string
}

async function saveCleanupLog(
  supabase: any,
  logData: CleanupLogData
): Promise<void> {
  try {
    const { error } = await supabase
      .from('profile_photo_cleanup_logs')
      .insert(logData)

    if (error) {
      // 証跡保存失敗は警告のみ（メイン処理には影響させない）
      logger.warn('[TASKD] LOG_SAVE_FAILED', {
        error: error.message,
        logData: {
          user_id: logData.user_id,
          requested_delete_count: logData.requested_delete_count,
          success: logData.success
        }
      })
    } else {
      logger.debug('[TASKD] LOG_SAVED', {
        user_id: logData.user_id,
        deleted_count: logData.deleted_paths.length,
        success: logData.success
      })
    }
  } catch (err) {
    // 証跡保存例外は警告のみ
    logger.warn('[TASKD] LOG_SAVE_EXCEPTION', {
      error: err instanceof Error ? err.message : 'Unknown error'
    })
  }
}

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
  logger.info('📍 profiles write entry:', entryPoint)

  // 🛡️ CRITICAL: セッションユーザーIDと引数userIdの一致チェック（誤保存防止）
  let authUid: string | null = null
  try {
    const { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser()

    if (sessionError) {
      logger.warn('[SAVE] セッション取得エラー（続行）', sessionError.message)
    } else if (sessionUser) {
      authUid = sessionUser.id

      // ✅ AUTH USER ログ（必須）
      logger.debug('[SAVE] AUTH USER:', sessionUser.id?.slice(0, 8))

      if (sessionUser.id !== userId) {
        // 🚨 CRITICAL: ユーザーID不一致 → 保存をブロック
        logger.error('[SAVE] USER_MISMATCH BLOCK SAVE', {
          sessionUser: sessionUser.id,
          payloadUser: userId,
          sessionEmail: sessionUser.email,
          entryPoint
        })
        throw new Error(`User mismatch - blocked for safety (session: ${sessionUser.id}, payload: ${userId})`)
      } else {
        logger.debug('[SAVE] user match OK')
      }
    }
  } catch (sessionCheckErr: any) {
    // User mismatchエラーの場合は再throw
    if (sessionCheckErr?.message?.includes('User mismatch')) {
      throw sessionCheckErr
    }
    // その他のエラーは警告のみ（セッション取得失敗時も保存は続行）
    logger.warn('[SAVE] セッションチェック例外（続行）', sessionCheckErr?.message)
  }

  // ✅ PROFILE SAVE ログ（必須）
  logger.debug('[SAVE] start:', userId?.slice(0, 8), entryPoint)

  // 🔍 TASK D DEBUG: 入力されたphoto_urlsを最初に記録（処理前の状態）
  const inputPhotoUrls = Array.isArray(payload.photo_urls) ? [...payload.photo_urls] : []

  logger.debug('[SAVE] op:', operation.operation, 'photos:', inputPhotoUrls.length)

  // ✅✅✅ [TASKD_PROOF] INPUT_RECEIVED: 呼び出し元から受け取った値を記録
  logger.debug('[TASKD] input:', inputPhotoUrls.length, 'photos')

  // 🗑️ TASK D: 差分削除用に現在のphoto_urlsを取得（DB保存前の値）
  let prevPhotoUrls: string[] = []

  try {
    // photo_urlsが更新される場合のみ、現在値を取得
    if (payload.photo_urls !== undefined) {
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, photo_urls')
        .eq('user_id', userId)
        .maybeSingle()

      if (fetchError) {
        logger.debug('[TASKD] fetch skip (new user)')
      }

      // ✅ PROFILE FETCH ログ（必須）
      logger.debug('[SAVE] fetched profile:', currentProfile?.id?.slice(0, 8) || 'null')

      prevPhotoUrls = Array.isArray(currentProfile?.photo_urls) ? currentProfile.photo_urls : []

      // ✅✅✅ [TASKD_PROOF] DB_CURRENT_STATE: DBの現在値を記録
      logger.debug('[TASKD] db current:', prevPhotoUrls.length, 'photos')
    }
  } catch (fetchErr) {
    // 取得失敗しても保存は続行（新規ユーザーの場合など）
    logger.debug('[TASKD] fetch skipped')
  }

  try {
    // ✅ Upload cache for this save operation (prevents double upload of same data_uri)
    const uploadCache = new Map<string, string>()

    const ensureAvatarStoredCached = async (input: string | null | undefined): Promise<string | null> => {
      if (!input) return input as null

      // ✅ If already converted in this save cycle, reuse it
      const cached = uploadCache.get(input)
      if (cached) {
        logger.debug('[SAVE] cache hit')
        return cached
      }

      const result = await ensureAvatarStored(supabase, userId, input)

      // ✅ Only cache if input was data_uri and output is URL
      if (typeof input === 'string' && input.startsWith('data:') && typeof result === 'string' && result.startsWith('http')) {
        uploadCache.set(input, result)
        logger.debug('[SAVE] cache set')
      }

      return result
    }

    // 1. avatar_url処理 - ensureAvatarStoredCached で確実に変換（キャッシュ有効）
    if (payload.avatar_url !== undefined) {
      logger.debug('[SAVE] processing avatar')
      payload.avatar_url = await ensureAvatarStoredCached(payload.avatar_url)
    } else {
      logger.debug('[SAVE] avatar: not_provided')
      
      
    }

    // 2. photo_urls処理 - 複数画像対応（修正版）
    if (payload.photo_urls !== undefined) {
      if (Array.isArray(payload.photo_urls) && payload.photo_urls.length > 0) {
        // 各画像URLを Storage に保存（最適化版）
        const processedUrls = []
        for (let i = 0; i < Math.min(payload.photo_urls.length, 3); i++) {
          const url = payload.photo_urls[i]
          if (url && typeof url === 'string' && url.trim().length > 0) {
            // 🔧 FIX: 既にStorage URLまたはHTTP URLの場合は変換をスキップ
            if (url.includes('/storage/') || url.startsWith('http')) {
              processedUrls.push(url)
            } else {
              // data URIやblob URLの場合のみ変換（キャッシュ有効）
              const processedUrl = await ensureAvatarStoredCached(url)
              processedUrls.push(processedUrl)
            }
          }
        }

        payload.photo_urls = processedUrls
        logger.debug('[SAVE] photos processed:', processedUrls.length)

        // avatar_url との同期（メイン画像）- 5-3 整合ルール固定
        if (processedUrls.length > 0) {
          payload.avatar_url = processedUrls[0]
        } else {
          payload.avatar_url = null
        }
      } else if (Array.isArray(payload.photo_urls) && payload.photo_urls.length === 0) {
        // 🚨 CRITICAL FIX: 空配列[]は有効な値として保持（画像全削除をDBに反映）
        payload.avatar_url = null
      } else {
        // undefinedやnullの場合のみpayloadから削除（意図しない上書き防止）
        delete payload.photo_urls
      }
    }

    // 2. 🛡️ Base64遮断安全装置（必須）
    try {
      blockBase64FromDB(payload)
      logger.debug('[SAVE] base64 check passed')
    } catch (blockError) {
      logger.error('[SAVE] base64 blocked - DB保存を完全阻止')
      throw blockError
    }

    // 2.5 🛡️🛡️🛡️ FORBIDDEN KEYS GUARD: DBに存在しないカラムを強制削除（最終防衛）
    // 🚨 CRITICAL: INSERT時は email/created_at が必要（NOT NULL制約）
    const ALWAYS_FORBIDDEN = ['profile_images', 'personality', 'prefecture', 'images', 'profile_image', 'updated_at'] as const
    const UPDATE_ONLY_FORBIDDEN = ['id', 'created_at', 'email'] as const
    const isWriteNew = operation.operation === 'insert' || operation.operation === 'upsert'
    const FORBIDDEN_KEYS = isWriteNew
      ? [...ALWAYS_FORBIDDEN]  // INSERT/UPSERT: email/created_at/id は許可（NOT NULL制約対応）
      : [...ALWAYS_FORBIDDEN, ...UPDATE_ONLY_FORBIDDEN] as readonly string[]

    // 🔥 STEP 1: 初回削除
    for (const key of FORBIDDEN_KEYS) {
      if (key in payload) {
        logger.warn('[SAVE] forbidden key:', key)
        delete (payload as any)[key]
      }
    }

    // 🔥 STEP 2: 安全なpayloadを新規オブジェクトとして再構築（プロトタイプ汚染防止）
    const sanitizedPayload: Record<string, any> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (!FORBIDDEN_KEYS.includes(key as any)) {
        sanitizedPayload[key] = value
      } else {
        logger.warn('[SAVE] forbidden key:', key)
      }
    }

    // 🛡️🛡️🛡️ FINAL CHECK: DB書き込み直前の最終確認

    // 🔥 STEP 3: 念のための最終削除（万が一に備えて）
    for (const key of FORBIDDEN_KEYS) {
      if (key in sanitizedPayload) {
        logger.error('[SAVE] forbidden key at final:', key)
        delete sanitizedPayload[key]
      }
    }

    // payloadをsanitizedPayloadで置き換え
    payload = sanitizedPayload

    // 🛡️🛡️🛡️ タスクB: 保存直前にbase64混入をブロック（最終防衛）
    if (Array.isArray(payload.photo_urls)) {
      // 1) photo_urls から data:image を除去
      const cleanPhotoUrls = payload.photo_urls.filter((url: string) => {
        const isDataUrl = url && url.startsWith('data:')
        if (isDataUrl) {
          logger.warn('[SAVE] data URL removed')
        }
        return !isDataUrl
      })

      // 2) もし photo_urls[0] が data:image だったら（除去後に空になったら）警告
      const hasDataUrlInOriginal = payload.photo_urls.some((url: string) => url && url.startsWith('data:'))

      // 3) avatar_url = photo_urls[0] を強制同期
      payload.photo_urls = cleanPhotoUrls
      payload.avatar_url = cleanPhotoUrls.length > 0 ? cleanPhotoUrls[0] : null

      // 4) 同期確認

      // 5) もし除去後も data:image が残っていたら保存禁止
      const stillHasDataUrl = cleanPhotoUrls.some((url: string) => url && url.startsWith('data:'))
      if (stillHasDataUrl) {
        logger.error('[SAVE] blocked: photo_urls data:image')
        throw new Error('BLOCK SAVE: photo_urls contains data:image - upload failed')
      }
    }

    // avatar_url 単体のチェック
    if (payload.avatar_url && payload.avatar_url.startsWith('data:')) {
      logger.error('[SAVE] blocked: avatar_url data:image')
      throw new Error('BLOCK SAVE: avatar_url is data:image - upload failed')
    }

    // 3. DB書き込み実行
    let dbResult: any

    switch (operation.operation) {
      case 'insert':
        logger.debug('[SAVE] INSERT')
        dbResult = await supabase
          .from(operation.tableName || 'profiles')
          .insert(payload)
          .select('*')

        break

      case 'update':
        logger.debug('[SAVE] UPDATE')
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
        logger.debug('[SAVE] UPSERT')
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
      logger.error('[SAVE] DB failed:', dbResult.error)
      throw new Error(`${operation.operation.toUpperCase()} failed: ${dbResult.error.message}`)
    }

    logger.debug('[SAVE] success:', operation.operation)

    // 🛡️ タスクC: DB保存後のメイン画像確認ログ
    if (dbResult.data && dbResult.data[0]) {
      const savedProfile = dbResult.data[0]
      const dbPhotoUrls = Array.isArray(savedProfile.photo_urls) ? savedProfile.photo_urls : []
      const dbAvatarUrl = savedProfile.avatar_url
      const mainPhotoMatch = dbPhotoUrls.length === 0 || dbPhotoUrls[0] === dbAvatarUrl

      logger.debug('[SAVE] photos synced:', dbPhotoUrls.length)

      if (!mainPhotoMatch && dbPhotoUrls.length > 0) {
        logger.warn('[SAVE] photo mismatch: avatar_url と photo_urls[0] が不一致')
      }
    }

    // 🗑️ TASK D: DB保存成功後にStorage掃除（差分削除）+ 証跡保存
    // 🚨 CRITICAL FIX: awaitで完了を待つ（ページ遷移前に確実に実行）
    if (payload.photo_urls !== undefined) {
      const nextPhotoUrls = Array.isArray(payload.photo_urls) ? payload.photo_urls : []

      // ✅✅✅ [TASKD_PROOF] DIFF_CALCULATION: 差分計算の入力値を記録
      const deletedUrls = prevPhotoUrls.filter(url => !nextPhotoUrls.includes(url))

      logger.debug('[TASKD] DIFF_CALCULATION', {
        userId,
        entryPoint,
        old_count: prevPhotoUrls.length,
        new_count: nextPhotoUrls.length,
        deleted_count: deletedUrls.length,
        old_urls: prevPhotoUrls.map((u: string) => u?.substring(0, 60) + '...'),
        new_urls: nextPhotoUrls.map((u: string) => u?.substring(0, 60) + '...'),
        to_delete_urls: deletedUrls.map((u: string) => u?.substring(0, 60) + '...')
      })

      // 🚨 TASK D FIX: awaitで完了を待つ（非同期だとページ遷移で中断される）
      try {
        const cleanupResult = await cleanupRemovedImages(supabase, userId, prevPhotoUrls, nextPhotoUrls, entryPoint)
        logger.debug('[TASKD] CLEANUP_COMPLETE', {
          userId,
          entryPoint,
          result: cleanupResult
        })
      } catch (err) {
        // cleanup失敗してもDB保存は成功扱い（ログは残す）
        logger.error('[TASKD] CLEANUP_ERROR', {
          userId,
          entryPoint,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    return {
      success: true,
      data: dbResult.data,
      operation: operation.operation,
      entryPoint
    }

  } catch (error) {
    logger.error('[SAVE] failed', {
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
      whereClause: { user_id: userId }
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
  conflictKeys: string[] = ['user_id']
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