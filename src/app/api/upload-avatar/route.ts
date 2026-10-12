/**
 * 🚀 /api/upload-avatar - サーバーサイドStorage upload（RLS準拠版）
 *
 * 目的: Base64 avatar を Supabase Storage にアップロードし、storage path を返却
 *
 * 🔒 SECURITY:
 * - userIdをリクエストから受け取らない（偽装不可能）
 * - authUser.idのみを使用
 * - Storage操作はservice_role使用（Storageポリシー用）
 *
 * Input: { dataUrl: string }
 * Output: { success: boolean, path?: string, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { requireActiveProfile } from '@/lib/auth/requireActiveProfile'
import { parseDataUrl, generateStoragePath } from '@/utils/base64Utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET_NAME = 'avatars'

// Service Role Client（Storage操作用 - Storageポリシーは別管理）
let supabaseAdmin: any = null
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

interface UploadAvatarRequest {
  dataUrl: string
  // userId は受け取らない（authUser.idを使用）
}

interface UploadAvatarResponse {
  success: boolean
  path?: string
  code?: string
  publicUrl?: string
  error?: string
  meta?: {
    originalSize: number
    compressedSize: number
    savedBytes: number
    ext: string
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadAvatarResponse>> {
  try {
    console.log('🚀 /api/upload-avatar: Starting server-side upload...')

    // 1. 環境変数確認
    if (!supabaseAdmin || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing required environment variables or Supabase client not initialized')
      return NextResponse.json({
        success: false,
        error: 'Server configuration error: Missing Supabase credentials'
      }, { status: 500 })
    }

    // 🔒 認証チェック（ユーザーセッションクライアント）
    const supabaseAuth = createServerClient(request)
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !authUser) {
      console.warn('🚨 upload-avatar API: 認証失敗', {
        authError: authError?.message,
        hasAuthUser: !!authUser
      })
      return NextResponse.json({
        success: false,
        error: '認証が必要です'
      }, { status: 401 })
    }

    // #10: memory #1 の 2 層防御: suspended ユーザーをここで弾く（service_role でのアップロード防止）
    const guard = await requireActiveProfile(authUser.id)
    if (!guard.ok) {
      return NextResponse.json({
        success: false,
        error: guard.message,
        code: guard.code
      }, { status: guard.httpStatus })
    }

    // 🔒 CRITICAL: userIdはauthUser.idのみを使用（リクエストからは受け取らない）
    const userId = authUser.id

    console.log('✅ upload-avatar API: 認証OK', {
      userId: userId?.slice(0, 8),
      email: authUser.email
    })

    // 2. リクエスト解析
    let body: UploadAvatarRequest
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('❌ Invalid JSON payload:', parseError)
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON payload'
      }, { status: 400 })
    }

    const { dataUrl } = body

    // 3. バリデーション
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid dataUrl. Expected data:image/* format.'
      }, { status: 400 })
    }

    console.log('📋 Upload request:', {
      userId: userId?.slice(0, 8),
      dataUrlSize: Math.round(dataUrl.length / 1024) + 'KB',
      dataUrlPreview: dataUrl.substring(0, 50) + '...'
    })

    // 4. Base64 → Buffer 変換
    let parsed: ReturnType<typeof parseDataUrl>
    try {
      parsed = parseDataUrl(dataUrl)
    } catch (parseError) {
      console.error('❌ Failed to parse data URL:', parseError)
      return NextResponse.json({
        success: false,
        error: 'Invalid data URL format'
      }, { status: 400 })
    }

    const { buffer, contentType, ext } = parsed

    // 5. Storage path 生成（authUser.idを使用）
    const storagePath = generateStoragePath(userId, ext)

    console.log('📁 Storage upload starting:', {
      storagePath,
      contentType,
      bufferSize: Math.round(buffer.length / 1024) + 'KB'
    })

    // 6. Supabase Storage アップロード（service_role - Storage専用）
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError)
      return NextResponse.json({
        success: false,
        error: `Storage upload failed: ${uploadError.message}`
      }, { status: 500 })
    }

    console.log('✅ Storage upload success:', uploadData.path)

    // 7. Public URL 生成
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath)

    const publicUrl = publicUrlData.publicUrl

    // 8. メタデータ作成
    const meta = {
      originalSize: dataUrl.length,
      compressedSize: storagePath.length,
      savedBytes: dataUrl.length - storagePath.length,
      ext
    }

    console.log('🎉 Upload complete:', {
      path: storagePath,
      publicUrl: publicUrl?.substring(0, 60) + '...',
      savedBytes: Math.round(meta.savedBytes / 1024) + 'KB'
    })

    return NextResponse.json({
      success: true,
      path: storagePath,
      publicUrl,
      meta
    })

  } catch (error) {
    console.error('❌ /api/upload-avatar unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: `Unexpected server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
