/**
 * 🚀 /api/upload-avatar - サーバーサイドStorage upload
 * 
 * 目的: Base64 avatar を Supabase Storage にアップロードし、storage path を返却
 * 特徴: Service Role使用でTest mode/Auth制限を回避
 * 
 * Input: { userId: string, dataUrl: string }
 * Output: { success: boolean, path?: string, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseDataUrl, generateStoragePath } from '@/utils/base64Utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET_NAME = 'avatars'

// Service Role Client（RLS回避・Storage権限フル）
// ビルド時は環境変数が無い場合があるのでnull許可
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
  userId: string
  dataUrl: string
}

interface UploadAvatarResponse {
  success: boolean
  path?: string
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
    
    const { userId, dataUrl } = body
    
    // 3. バリデーション
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid userId'
      }, { status: 400 })
    }
    
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid dataUrl. Expected data:image/* format.'
      }, { status: 400 })
    }
    
    console.log('📋 Upload request:', {
      userId,
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
    
    // 5. Storage path 生成
    const storagePath = generateStoragePath(userId, ext)
    
    console.log('📁 Storage upload starting:', {
      storagePath,
      contentType,
      bufferSize: Math.round(buffer.length / 1024) + 'KB'
    })
    
    // 6. Supabase Storage アップロード
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true // 上書き運用
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

// OPTIONS handler for CORS（Next.js App Routerでは通常不要だが念のため）
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