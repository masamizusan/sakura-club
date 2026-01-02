#!/usr/bin/env node

/**
 * 🔧 avatar_path カラム存在確認・追加スクリプト
 * 
 * 目的: 段階的移行に向けてavatar_pathカラムの準備状況を確認
 * 実行: node scripts/check-avatar-path-column.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Avatar Path Column Check Started')
console.log('Environment Check:', {
  hasUrl: !!SUPABASE_URL,
  hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
})

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables. Need SUPABASE_SERVICE_ROLE_KEY for database operations.')
  process.exit(1)
}

// Service Role Client（DDL操作権限）
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * カラム存在確認
 */
async function checkAvatarPathColumn() {
  try {
    console.log('\n🔍 Step 1: Check avatar_path column existence')
    
    // information_schemaからカラム情報取得
    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')
      .in('column_name', ['avatar_url', 'avatar_path'])
    
    if (schemaError) {
      console.error('❌ Failed to query schema:', schemaError)
      return false
    }
    
    const avatarUrlColumn = columns.find(col => col.column_name === 'avatar_url')
    const avatarPathColumn = columns.find(col => col.column_name === 'avatar_path')
    
    console.log('📊 Column Status:')
    console.log('  avatar_url:', avatarUrlColumn ? '✅ EXISTS' : '❌ MISSING')
    console.log('  avatar_path:', avatarPathColumn ? '✅ EXISTS' : '❌ MISSING')
    
    if (avatarPathColumn) {
      console.log('✅ avatar_path column already exists. Ready for gradual migration.')
      return true
    }
    
    console.log('⚠️ avatar_path column does not exist. Will attempt to add it.')
    return false
    
  } catch (error) {
    console.error('❌ Column check error:', error)
    return false
  }
}

/**
 * カラム追加
 */
async function addAvatarPathColumn() {
  try {
    console.log('\n🔧 Step 2: Adding avatar_path column')
    
    // DDL実行（カラム追加）
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS avatar_path TEXT;
        
        CREATE INDEX IF NOT EXISTS idx_profiles_avatar_path 
        ON profiles(avatar_path) 
        WHERE avatar_path IS NOT NULL;
      `
    })
    
    if (addColumnError) {
      // rpcが使えない場合は直接SQLでトライ
      console.log('⚠️ RPC approach failed. Trying direct approach...')
      
      // 代替：テスト更新でカラム存在確認
      const { error: testError } = await supabase
        .from('profiles')
        .update({ avatar_path: null })
        .eq('id', '00000000-0000-0000-0000-000000000000') // 存在しないID
      
      if (testError && testError.code === '42703') {
        console.error('❌ avatar_path column does not exist and cannot be added automatically.')
        console.log('📋 Manual migration required:')
        console.log(`
ALTER TABLE public.profiles ADD COLUMN avatar_path TEXT;
CREATE INDEX idx_profiles_avatar_path ON profiles(avatar_path) WHERE avatar_path IS NOT NULL;
        `)
        return false
      }
      
      console.log('✅ Column appears to exist (or test query worked)')
      return true
    }
    
    console.log('✅ avatar_path column added successfully')
    return true
    
  } catch (error) {
    console.error('❌ Column addition error:', error)
    return false
  }
}

/**
 * カラム利用準備確認
 */
async function testAvatarPathUsage() {
  try {
    console.log('\n🧪 Step 3: Test avatar_path column usage')
    
    // テスト用レコードでカラム利用確認
    const testUserId = '00000000-0000-0000-0000-000000000001'
    const testPath = 'avatars/test/avatar.jpg'
    
    const { error: testError } = await supabase
      .from('profiles')
      .upsert({
        id: testUserId,
        email: 'test@example.com',
        avatar_path: testPath
      })
    
    if (testError && testError.code === '42703') {
      console.log('❌ avatar_path column is not available for use')
      return false
    }
    
    // テストレコード削除
    await supabase
      .from('profiles')
      .delete()
      .eq('id', testUserId)
    
    console.log('✅ avatar_path column is ready for use')
    return true
    
  } catch (error) {
    console.error('❌ Usage test error:', error)
    return false
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    const columnExists = await checkAvatarPathColumn()
    
    if (!columnExists) {
      const addSuccess = await addAvatarPathColumn()
      if (!addSuccess) {
        console.log('\n❌ Failed to add avatar_path column automatically.')
        console.log('🛠️ Please run the migration manually in your Supabase dashboard:')
        console.log('ALTER TABLE public.profiles ADD COLUMN avatar_path TEXT;')
        process.exit(1)
      }
    }
    
    const usageReady = await testAvatarPathUsage()
    
    if (usageReady) {
      console.log('\n🎉 Avatar Path Migration Preparation Complete!')
      console.log('📋 Next steps:')
      console.log('1. Deploy updated imageResolver.ts and avatarUploader.ts')
      console.log('2. Test new image uploads save to avatar_path column')
      console.log('3. Run base64 migration script for existing data')
      console.log('4. Verify Edit→Preview→MyPage→Edit cycle stability')
    } else {
      console.log('\n⚠️ Avatar Path preparation incomplete. Manual intervention required.')
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

// スクリプト実行
if (require.main === module) {
  main()
}