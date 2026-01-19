import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * 🛡️ テストモード用プロフィール確保API（RLS回避版）
 * 
 * 目的:
 * - 匿名ユーザー・テストユーザーでのプロフィール作成を確実に実行
 * - service_role を使用してRLS制限を回避
 * - 新規登録→プロフィール編集の遷移を保証
 */

interface EnsureProfileRequest {
  userId: string
  email?: string
  isTestMode?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EnsureProfileRequest
    const { userId, email, isTestMode } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Service Role Client（RLS回避）
    const supabaseServiceRole = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🛡️ ensureProfile API: Starting profile creation with service role:', {
      userId,
      email,
      isTestMode
    })

    // 1. 既存プロフィールの確認
    const { data: existingProfile, error: searchError } = await supabaseServiceRole
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('🚨 ensureProfile API: Search error', searchError)
      return NextResponse.json(
        { error: `Search failed: ${searchError.message}` },
        { status: 500 }
      )
    }

    // 2. 既存プロフィールがある場合
    if (existingProfile) {
      console.log('✅ ensureProfile API: Profile already exists', {
        profileId: existingProfile.id,
        hasEmail: !!existingProfile.email
      })

      // 🚨 FIX: 既存プロフィールのemailがnullの場合はプレースホルダーで更新
      if (!existingProfile.email) {
        const placeholderEmail = email || `test-${userId.substring(0, 8)}@test.sakura-club.local`
        console.log('📧 API: 既存プロフィールのemail更新:', {
          profileId: existingProfile.id,
          oldEmail: existingProfile.email,
          newEmail: placeholderEmail
        })

        const { data: updatedProfile, error: updateError } = await supabaseServiceRole
          .from('profiles')
          .update({ email: placeholderEmail })
          .eq('id', existingProfile.id)
          .select('*')
          .single()

        if (updateError) {
          console.warn('⚠️ API: email更新失敗（続行可能）:', updateError)
          return NextResponse.json({
            success: true,
            profile: existingProfile,
            reason: 'Profile already exists (email update failed)'
          })
        }

        console.log('✅ API: 既存プロフィールのemail更新成功')
        return NextResponse.json({
          success: true,
          profile: updatedProfile,
          reason: 'Profile exists and email updated'
        })
      }

      return NextResponse.json({
        success: true,
        profile: existingProfile,
        reason: 'Profile already exists'
      })
    }

    // 3. Legacy profile（id = auth.uid）の確認・移行
    const { data: legacyProfile, error: legacyError } = await supabaseServiceRole
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (!legacyError && legacyProfile) {
      console.log('🔧 ensureProfile API: Migrating legacy profile')
      
      const { data: updatedProfile, error: updateError } = await supabaseServiceRole
        .from('profiles')
        .update({ user_id: userId })
        .eq('id', userId)
        .select('*')
        .single()

      if (updateError) {
        console.error('🚨 ensureProfile API: Legacy migration failed', updateError)
        return NextResponse.json(
          { error: `Legacy migration failed: ${updateError.message}` },
          { status: 500 }
        )
      }

      console.log('✅ ensureProfile API: Legacy profile migrated')
      return NextResponse.json({
        success: true,
        profile: updatedProfile,
        reason: 'Legacy profile migrated'
      })
    }

    // 4. 新規プロフィール作成（Service Roleでの確実な作成）
    console.log('🆕 ensureProfile API: Creating new profile with service role')

    // 🚨 FIX: テストモード（匿名ユーザー）の場合はプレースホルダーemailを設定
    const placeholderEmail = email || `test-${userId.substring(0, 8)}@test.sakura-club.local`
    console.log('📧 API Profile email設定:', {
      hasEmail: !!email,
      isTestMode,
      finalEmail: placeholderEmail
    })

    const newProfileData = {
      user_id: userId,
      email: placeholderEmail,
      created_at: new Date().toISOString(),
      // テストモード識別
      name: isTestMode ? null : null,
      gender: null,
      birth_date: null,
      // 🔧 FIXED: 新規プロフィールでは画像なし状態で初期化、空配列上書きを回避
      language_skills: []
    }

    const { data: newProfile, error: insertError } = await supabaseServiceRole
      .from('profiles')
      .insert(newProfileData)
      .select('*')
      .single()

    if (insertError) {
      console.error('🚨 ensureProfile API: Insert failed even with service role', insertError)
      return NextResponse.json(
        { error: `Insert failed: ${insertError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ ensureProfile API: New profile created successfully', {
      profileId: newProfile.id,
      userId: newProfile.user_id,
      isTestMode
    })

    return NextResponse.json({
      success: true,
      profile: newProfile,
      reason: 'New profile created with service role'
    })

  } catch (error) {
    console.error('🚨 ensureProfile API: Unexpected error', error)
    return NextResponse.json(
      { error: `Unexpected error: ${error}` },
      { status: 500 }
    )
  }
}