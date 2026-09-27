import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// identity-documents の保存パス: `${user.id}/${Date.now()}.${ext}`（verification/upload/page.tsx）
const IDENTITY_DOC_PATH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^/\\]+$/i

export async function POST(req: NextRequest) {
  try {
    // 段階0: 管理者のみ許可（未ログイン 401 / 非管理者 403）
    const admin = await requireAdmin()
    if (!admin.ok) {
      return NextResponse.json(
        { error: admin.message, code: admin.code },
        { status: admin.httpStatus }
      )
    }

    const { filePath } = await req.json()

    if (!filePath) {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 })
    }

    // `{UUID}/{ファイル名}` 形式のみ許可（パストラバーサル・先頭スラッシュ・サブフォルダを拒否）
    if (typeof filePath !== 'string' || !IDENTITY_DOC_PATH_REGEX.test(filePath) || filePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid filePath' }, { status: 400 })
    }

    // Service roleクライアント（関数内で初期化）
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1時間有効な署名付きURL
    const { data, error } = await serviceSupabase.storage
      .from('identity-documents')
      .createSignedUrl(filePath, 3600)

    if (error || !data?.signedUrl) {
      console.error('[admin/verification/signed-url] error:', error)
      return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 })
    }

    return NextResponse.json({ signedUrl: data.signedUrl })
  } catch (error) {
    console.error('[admin/verification/signed-url] unexpected error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
