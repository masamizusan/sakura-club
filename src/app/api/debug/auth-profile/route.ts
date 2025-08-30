import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(request)
    
    // 現在の認証ユーザーを取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Not authenticated',
        authError: authError?.message
      }, { status: 401 })
    }

    // プロフィール情報を取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // 全てのプロフィールでこのメールアドレスを検索
    const { data: profilesByEmail, error: emailSearchError } = await supabase
      .from('profiles')
      .select('id, email, name, created_at')
      .eq('email', user.email || '')

    // データベーススキーマ情報を取得（テーブル構造確認）
    let schemaInfo = null
    let schemaError = null
    try {
      const result = await supabase.rpc('get_table_columns', { table_name: 'profiles' })
      schemaInfo = result.data
      schemaError = result.error
    } catch (error) {
      schemaError = error instanceof Error ? error.message : 'Schema check failed'
    }

    return NextResponse.json({
      debug: {
        currentUser: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
          emailConfirmed: user.email_confirmed_at,
          lastSignIn: user.last_sign_in_at
        },
        profile: profile || null,
        profileError: profileError?.message || null,
        profilesByEmail: profilesByEmail || [],
        emailSearchError: emailSearchError?.message || null,
        schemaInfo: schemaInfo || 'Schema info not available',
        schemaError: schemaError?.message || null,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}