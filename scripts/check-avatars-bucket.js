#!/usr/bin/env node

/**
 * 🪣 Supabase Storage bucket "avatars" 確認・作成スクリプト
 * 
 * 目的: Base64→Storage保存切替に必要なbucket準備
 * パス設計: <userId>/avatar.jpg（上書き運用）
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET_NAME = 'avatars'

console.log('🪣 Supabase Storage Bucket Check Started')
console.log('Environment Check:', {
  hasUrl: !!SUPABASE_URL,
  hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
  bucketName: BUCKET_NAME
})

if (!SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

// Service Role Client（Storage操作権限）
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Bucket存在確認・作成
 */
async function ensureAvatarsBucket() {
  try {
    console.log('\n🔍 Step 1: Check bucket existence')
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError)
      
      if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.log('💡 Note: SERVICE_ROLE_KEY not available. Using ANON key for read-only check.')
        
        // ANON keyでの簡易確認
        const { data: testData, error: testError } = await supabase.storage
          .from(BUCKET_NAME)
          .list('')
        
        if (testError) {
          console.log(`⚠️ Bucket "${BUCKET_NAME}" may not exist or is not accessible with ANON key`)
          console.log('📋 Manual setup required in Supabase Dashboard:')
          console.log(`   1. Go to Storage section`)
          console.log(`   2. Create bucket: ${BUCKET_NAME}`)
          console.log(`   3. Set public: true`)
          console.log(`   4. Add RLS policies for authenticated users`)
          return false
        } else {
          console.log(`✅ Bucket "${BUCKET_NAME}" exists and is accessible`)
          return true
        }
      }
      return false
    }
    
    const bucketExists = buckets.some(b => b.name === BUCKET_NAME)
    
    if (bucketExists) {
      console.log(`✅ Bucket "${BUCKET_NAME}" already exists`)
      return true
    }
    
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.log(`❌ Bucket "${BUCKET_NAME}" does not exist and cannot be created without SERVICE_ROLE_KEY`)
      console.log('📋 Manual setup required in Supabase Dashboard:')
      console.log(`   1. Create bucket: ${BUCKET_NAME}`)
      console.log(`   2. Set public: true`)
      console.log(`   3. Configure allowed mime types: image/*`)
      return false
    }
    
    console.log(`📁 Creating bucket: ${BUCKET_NAME}`)
    const { data: createData, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    })
    
    if (createError) {
      console.error('❌ Failed to create bucket:', createError)
      return false
    }
    
    console.log('✅ Bucket created successfully')
    return true
    
  } catch (error) {
    console.error('❌ Bucket setup error:', error)
    return false
  }
}

/**
 * テスト用アップロード確認
 */
async function testUploadCapability() {
  try {
    console.log('\n🧪 Step 2: Test upload capability')
    
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.log('⏭️ Skipping upload test (SERVICE_ROLE_KEY not available)')
      return true
    }
    
    // 1x1 pixel テスト画像（PNG）
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64')
    const testPath = 'test-user/avatar.png'
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(testPath, testImageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      })
    
    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError)
      return false
    }
    
    console.log('✅ Test upload success:', uploadData.path)
    
    // Public URL取得テスト
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(testPath)
    
    console.log('🔗 Public URL generated:', publicUrlData.publicUrl?.substring(0, 60) + '...')
    
    // テストファイル削除
    await supabase.storage.from(BUCKET_NAME).remove([testPath])
    console.log('🗑️ Test file cleaned up')
    
    return true
    
  } catch (error) {
    console.error('❌ Upload test error:', error)
    return false
  }
}

/**
 * Storage設定確認
 */
async function checkStorageSettings() {
  console.log('\n⚙️ Step 3: Check storage settings')
  
  console.log('📋 Recommended Settings:')
  console.log(`   Bucket Name: ${BUCKET_NAME}`)
  console.log(`   Public Access: true`)
  console.log(`   File Size Limit: 5MB`)
  console.log(`   Allowed MIME Types: image/jpeg, image/png, image/gif, image/webp`)
  console.log(`   Path Pattern: <userId>/avatar.<ext>`)
  console.log(`   Upsert Policy: true (overwrite existing)`)
  
  console.log('\n📋 Required RLS Policies:')
  console.log('   1. SELECT: Anyone can view uploaded images')
  console.log('   2. INSERT: Authenticated users can upload to their own folder')
  console.log('   3. UPDATE: Users can update their own images')
  console.log('   4. DELETE: Users can delete their own images')
  
  console.log('\n🔧 Sample RLS Policy SQL:')
  console.log(`-- Allow authenticated users to upload to their own folder`)
  console.log(`CREATE POLICY "Users can upload own avatars" ON storage.objects`)
  console.log(`  FOR INSERT WITH CHECK (`)
  console.log(`    bucket_id = '${BUCKET_NAME}' AND `)
  console.log(`    auth.uid()::text = (storage.foldername(name))[1]`)
  console.log(`  );`)
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🎯 目的: Base64→Storage保存切替のためのbucket準備')
    console.log('📋 要件: <userId>/avatar.jpg パターンで画像1枚上書き運用')
    
    const bucketReady = await ensureAvatarsBucket()
    
    if (!bucketReady) {
      console.log('\n⚠️ Bucket setup incomplete. Manual intervention required.')
      checkStorageSettings()
      process.exit(1)
    }
    
    const uploadReady = await testUploadCapability()
    
    checkStorageSettings()
    
    if (uploadReady) {
      console.log('\n🎉 Storage Setup Complete!')
      console.log('📋 Next steps:')
      console.log('   1. Implement Base64→Buffer conversion utility')
      console.log('   2. Create Next.js API route for server-side upload')
      console.log('   3. Modify profile save logic to use Storage')
      console.log('   4. Test Edit→Preview→MyPage→Edit cycle stability')
    } else {
      console.log('\n⚠️ Storage setup partially complete. Check settings manually.')
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

// スクリプト実行
if (require.main === module) {
  main()
}