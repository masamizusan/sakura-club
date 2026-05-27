import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { requireActiveProfile } from '@/lib/auth/requireActiveProfile'

// 完全に動的（キャッシュ無効）
export const dynamic = 'force-dynamic'
export const revalidate = 0

// no-cacheヘッダー
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

/**
 * POST /api/profile/update
 *
 * プロフィール更新API（RLS安全版）
 * - 認証必須（auth.uid()で自分を特定）
 * - 更新可能フィールドをホワイトリストで制限
 * - クライアントからの直接DB操作を廃止し、このAPIに統一
 */

// 更新可能なフィールドのホワイトリスト
const ALLOWED_UPDATE_FIELDS = [
  'name', 'first_name', 'last_name', 'gender', 'age', 'birth_date',
  'nationality', 'residence', 'prefecture', 'city',
  'bio', 'self_introduction', 'interests', 'hobbies',
  'avatar_url', 'profile_image', 'photo_urls',
  'occupation', 'height', 'body_type', 'marital_status',
  'personality', 'personality_tags', 'culture_tags',
  'japanese_level', 'english_level', 'language_skills',
  'visit_schedule', 'travel_companion', 'planned_prefectures', 'planned_stations',
  'profile_initialized', 'updated_at'
]

export async function POST(request: NextRequest) {
  console.log('🚀 [profile/update] API started')

  try {
    // cookies() from next/headers を使用
    const cookieStore = cookies()
    const allCookies = cookieStore.getAll()
    const hasSbCookies = allCookies.some(c => c.name.startsWith('sb-'))

    console.log('🍪 [profile/update] Cookies:', {
      count: allCookies.length,
      hasSbCookies
    })

    // Supabaseクライアント作成
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            // Route Handlerでは設定不要
          },
        },
      }
    )

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('🔐 [profile/update] Auth result:', {
      hasUser: !!user,
      userId: user?.id?.slice(0, 8),
      error: authError?.message
    })

    if (authError || !user) {
      return NextResponse.json({
        error: 'Authentication required',
        debug: { hasSbCookies }
      }, { status: 401, headers: noCacheHeaders })
    }

    // memory #1 の 2 層防御: suspended ユーザーをここで弾く (指示書 #31)
    const guard = await requireActiveProfile(user.id)
    if (!guard.ok) {
      return NextResponse.json(
        { error: guard.message, code: guard.code },
        { status: guard.httpStatus }
      )
    }

    // リクエストボディ取得
    const body = await request.json()
    const { updates } = body

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'updates object required' }, { status: 400 })
    }

    // ホワイトリストでフィルタリング
    const safeUpdates: Record<string, any> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (ALLOWED_UPDATE_FIELDS.includes(key)) {
        safeUpdates[key] = value
      } else {
        console.warn(`[profile/update] Ignored field: ${key}`)
      }
    }

    // updated_at を自動追加
    safeUpdates.updated_at = new Date().toISOString()

    console.log('📝 [profile/update] Safe updates:', Object.keys(safeUpdates))

    // プロフィール更新（user_idで特定）
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('user_id', user.id)
      .select('id, user_id, name, avatar_url, profile_image, updated_at')
      .single()

    if (updateError) {
      console.error('[profile/update] Update error:', updateError)
      return NextResponse.json({
        error: 'Profile update failed',
        debug: { message: updateError.message, code: updateError.code }
      }, { status: 500, headers: noCacheHeaders })
    }

    console.log('✅ [profile/update] Success:', {
      profileId: updatedProfile?.id?.slice(0, 8)
    })

    return NextResponse.json({
      success: true,
      profile: updatedProfile
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error('[profile/update] Unexpected error:', error)
    return NextResponse.json({
      error: 'Unexpected error',
      debug: { message: error instanceof Error ? error.message : String(error) }
    }, { status: 500, headers: noCacheHeaders })
  }
}
