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
        error: 'Not authenticated'
      }, { status: 401 })
    }

    // プロフィールテーブルから1件取得してカラム構造を確認
    const { data: sampleProfile, error: sampleError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single()

    // 空のプロフィールを作成してみて、どのフィールドが必要かを確認
    const { data: insertTest, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: 'test-schema-check-' + Date.now(),
        email: 'test@example.com',
        name: 'Test User'
      })
      .select()

    // テスト用プロフィールを削除
    if (insertTest && insertTest.length > 0) {
      await supabase
        .from('profiles')
        .delete()
        .eq('id', insertTest[0].id)
    }

    return NextResponse.json({
      debug: {
        sampleProfile: sampleProfile || null,
        sampleError: sampleError?.message || null,
        insertTest: insertTest || null,
        insertError: insertError?.message || null,
        availableColumns: sampleProfile ? Object.keys(sampleProfile) : [],
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Schema debug API error:', error)
    return NextResponse.json({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}