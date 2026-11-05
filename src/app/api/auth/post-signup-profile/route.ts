import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAllowedMaleNationality } from '@/utils/nationalityNormalize'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/post-signup-profile
 *
 * 新規登録直後に初期プロフィールデータをDBに保存する。
 * "Null-only update" パターン: 既にnull以外の値がある項目は上書きしない。
 *
 * 🔒 SECURITY:
 * - userIdをリクエストから受け取らない（authUser.idのみ使用）
 * - Authorization Bearer認証
 */

// ホワイトリスト: 受け付けるフィールド
// ⚠️ profile_initialized は意図的に含めない（プレビュー確定時のみtrueにする）
const ALLOWED_FIELDS = [
  'name', 'gender', 'birth_date', 'nationality', 'residence', 'language_skills'
] as const

/** birth_date (YYYY-MM-DD) から年齢を算出（日付ベース、TZ非依存） */
function calculateAgeFromBirthDate(birthDate: string): number | null {
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  const today = new Date()
  const ty = today.getFullYear()
  const tm = today.getMonth() + 1
  const td = today.getDate()
  let age = ty - y
  if (tm < m || (tm === m && td < d)) age--
  return age >= 0 ? age : null
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 認証
    const authHeader = request.headers.get('Authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    let supabase
    let authUser

    if (bearerToken) {
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${bearerToken}` } } }
      )
      const result = await supabase.auth.getUser(bearerToken)
      authUser = result.data?.user
      if (result.error || !authUser) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
      }
    } else {
      supabase = createServerClient(request)
      const result = await supabase.auth.getUser()
      authUser = result.data?.user
      if (result.error || !authUser) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
      }
    }

    const userId = authUser.id
    console.log('✅ post-signup-profile: 認証OK', { userId: userId.slice(0, 8) })

    // リクエストボディ取得
    const body = await request.json()

    // ホワイトリストフィルタ
    const filtered: Record<string, any> = {}
    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
        filtered[key] = body[key]
      }
    }

    // 性別・国籍の中身の確認（C9）。エラーにはせず、おかしな値だけ書かない（登録を止めない）
    if (filtered.gender !== undefined && filtered.gender !== 'male' && filtered.gender !== 'female') {
      delete filtered.gender
    }
    if (filtered.gender === 'female') {
      // 女性の国籍は常に「日本」
      filtered.nationality = '日本'
    } else if (filtered.gender === 'male' && filtered.nationality !== undefined) {
      // 男性は NATIONALITY_OPTIONS の国名だけ。それ以外は国籍だけ捨てる（編集画面で本人に選ばせる）
      if (isAllowedMaleNationality(filtered.nationality)) {
        filtered.nationality = filtered.nationality.trim()
      } else {
        delete filtered.nationality
      }
    } else if (filtered.gender === undefined && filtered.nationality !== undefined) {
      // 性別が分からないときは国籍を書かない
      delete filtered.nationality
    }

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ success: true, reason: 'No fields to update' })
    }

    // 既存プロフィール取得
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('🚨 post-signup-profile: fetch error', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // 修繕G': birth_date から age をサーバ側算出（リクエスト値は信用しない）
    // リクエストのbirth_date → 既存DBのbirth_date の順で使う
    const birthDateSource = filtered.birth_date || existing?.birth_date
    if (birthDateSource && typeof birthDateSource === 'string') {
      const computedAge = calculateAgeFromBirthDate(birthDateSource)
      if (computedAge !== null) {
        filtered.age = computedAge
        console.log('📅 post-signup-profile: age算出', {
          birth_date: birthDateSource,
          computedAge,
          existingAge: existing?.age,
          existingAgeType: typeof existing?.age,
        })
      }
    }
    // リクエストbodyのageは信用しない（サーバ算出のみ）
    if (filtered.age === undefined) delete filtered.age

    // Null-only update: 既存値がnull/空/0の項目のみ上書き
    const updateData: Record<string, any> = {}
    for (const [key, value] of Object.entries(filtered)) {
      const ev = existing?.[key]
      // null / undefined / 空文字 / 0(age用) を「未設定」とみなす
      const isEmpty = ev === null || ev === undefined || ev === ''
        || (key === 'age' && (ev === 0 || ev === '0'))
      if (isEmpty) {
        updateData[key] = value
      }
    }

    if (Object.keys(updateData).length === 0) {
      console.log('✅ post-signup-profile: All fields already populated, skipping')
      return NextResponse.json({ success: true, reason: 'All fields already have values' })
    }

    console.log('📝 post-signup-profile: Updating fields', { keys: Object.keys(updateData), updateData })

    if (existing) {
      // UPDATE
      const { data: updateResult, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select('age, birth_date')
        .maybeSingle()

      console.log('📝 post-signup-profile: UPDATE result', { updateResult, updateError: updateError?.message })

      if (updateError) {
        console.error('🚨 post-signup-profile: update error', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
      // プロフィールが存在しない場合はINSERT（ensure-profileが先に呼ばれているはずだが安全策）
      const { error: insertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          user_id: userId,
          email: authUser.email || null,
          ...updateData,
          created_at: new Date().toISOString(),
        }, { onConflict: 'id' })

      if (insertError) {
        console.error('🚨 post-signup-profile: insert error', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    console.log('✅ post-signup-profile: Done', { userId: userId.slice(0, 8), updated: Object.keys(updateData) })

    return NextResponse.json({
      success: true,
      updatedFields: Object.keys(updateData),
      reason: 'Profile initialized'
    })

  } catch (error) {
    console.error('🚨 post-signup-profile: Unexpected error', error)
    return NextResponse.json({ error: `Unexpected error: ${error}` }, { status: 500 })
  }
}
