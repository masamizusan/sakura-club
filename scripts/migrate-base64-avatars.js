#!/usr/bin/env node

/**
 * 🔧 profiles.avatar_url base64 一括移行スクリプト
 * 
 * 目的: DB内の data:image/* を Supabase Storage URL に一括変換
 * 実行: node scripts/migrate-base64-avatars.js
 * 
 * 処理フロー:
 * 1. profiles.avatar_url LIKE 'data:image/%' の全レコード取得
 * 2. base64をデコード → Storage uploadで URL取得
 * 3. profiles.avatar_url を URL に更新
 * 4. avatar_path カラム（オプション）にpath保存
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 環境変数読み込み
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET_NAME = 'avatars'

console.log('🚀 Base64 Avatar Migration Script Started')
console.log('Environment Check:', {
  hasUrl: !!SUPABASE_URL,
  hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
  bucketName: BUCKET_NAME
})

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL)
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY)
  process.exit(1)
}

// Service Role Client（RLS回避・Storage権限フル）
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Base64文字列からバイナリデータとMIMEタイプを抽出
 */
function parseBase64DataUrl(dataUrl) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid data URL format')
  }
  
  const mimeType = matches[1]
  const base64Data = matches[2]
  const buffer = Buffer.from(base64Data, 'base64')
  
  // ファイル拡張子を決定
  const extension = mimeType.includes('jpeg') ? 'jpg' : 
                   mimeType.includes('png') ? 'png' : 
                   mimeType.includes('gif') ? 'gif' : 
                   mimeType.includes('webp') ? 'webp' : 'jpg'
  
  return {
    buffer,
    mimeType,
    extension,
    size: buffer.length
  }
}

/**
 * 1つのレコードを移行
 */
async function migrateRecord(record) {
  const { id, user_id, avatar_url } = record
  
  try {
    console.log(`\n📝 Processing record: ${id}`)
    console.log(`   User ID: ${user_id}`)
    console.log(`   Avatar size: ${Math.round(avatar_url.length / 1024)}KB`)
    
    // 1. Base64解析
    const { buffer, mimeType, extension, size } = parseBase64DataUrl(avatar_url)
    console.log(`   📋 Parsed: ${mimeType}, ${Math.round(size / 1024)}KB`)
    
    // 2. Storage パス生成
    const timestamp = Date.now()
    const fileName = `avatar_${timestamp}.${extension}`
    const storagePath = `${user_id}/${fileName}`
    
    console.log(`   📁 Storage path: ${storagePath}`)
    
    // 🔍 冪等性チェック: 既にStorageにファイルが存在するかチェック
    const { data: existingFiles, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(`${user_id}`)
    
    if (!listError && existingFiles) {
      const existingFile = existingFiles.find(f => f.name === fileName)
      if (existingFile) {
        console.log(`   ⏭️ Storage file already exists: ${fileName}, reusing existing`)
        // 既存のファイルを使用（重複アップロードを避ける）
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath)
        
        return {
          success: true,
          record: { ...record, avatar_url: storagePath },
          storagePath,
          publicUrl: publicUrlData.publicUrl,
          originalSize: avatar_url.length,
          newSize: storagePath.length,
          note: 'Reused existing storage file'
        }
      }
    }
    
    // 3. Storage アップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true // 冪等性のためupsert=trueに変更
      })
    
    if (uploadError) {
      console.error(`   ❌ Upload failed:`, uploadError)
      return { success: false, error: uploadError, record }
    }
    
    console.log(`   ✅ Upload success: ${uploadData.path}`)
    
    // 4. Public URL取得
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath)
    
    const publicUrl = publicUrlData.publicUrl
    console.log(`   🔗 Public URL (for reference): ${publicUrl.substring(0, 60)}...`)
    console.log(`   📁 Storage path (will be saved to DB): ${storagePath}`)
    
    // 5. DB更新（段階的移行対応：avatar_path優先、fallbackはavatar_url）
    const updateData = {
      updated_at: new Date().toISOString()
    }
    
    let updateError = null
    
    try {
      // まずavatar_pathカラムに保存を試行
      updateData.avatar_path = storagePath
      console.log(`   🆕 Trying to save to avatar_path column`)
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', id)
      
      if (error && error.code === '42703') {
        // カラムが存在しない場合はavatar_urlにfallback
        console.log(`   🔄 avatar_path column not found, fallback to avatar_url`)
        delete updateData.avatar_path
        updateData.avatar_url = storagePath
        
        const { error: fallbackError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', id)
        
        updateError = fallbackError
      } else {
        updateError = error
      }
    } catch (err) {
      updateError = err
    }
    
    if (updateError) {
      console.error(`   ❌ DB update failed:`, updateError)
      // アップロードしたファイルをクリーンアップ
      await supabase.storage.from(BUCKET_NAME).remove([storagePath])
      return { success: false, error: updateError, record }
    }
    
    console.log(`   ✅ DB updated successfully`)
    
    return {
      success: true,
      record: { ...record, avatar_url: storagePath },
      storagePath,
      publicUrl,
      originalSize: avatar_url.length,
      newSize: storagePath.length
    }
    
  } catch (error) {
    console.error(`   ❌ Migration failed:`, error)
    return { success: false, error, record }
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('\n🔍 Step 1: Check bucket existence')
    
    // Bucket存在確認・作成
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    if (listError) {
      console.error('❌ Failed to list buckets:', listError)
      return
    }
    
    const bucketExists = buckets.some(b => b.name === BUCKET_NAME)
    
    if (!bucketExists) {
      console.log(`📁 Creating bucket: ${BUCKET_NAME}`)
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      })
      
      if (createError) {
        console.error('❌ Failed to create bucket:', createError)
        return
      }
      console.log('✅ Bucket created successfully')
    } else {
      console.log('✅ Bucket already exists')
    }
    
    console.log('\n🔍 Step 2: Find base64 records')
    
    // Base64レコード検索（冪等性チェック含む）
    const { data: base64Records, error: selectError } = await supabase
      .from('profiles')
      .select('id, user_id, avatar_url, avatar_path')
      .like('avatar_url', 'data:image/%')
      .limit(100) // 安全のため最初は100件まで
    
    if (selectError) {
      console.error('❌ Failed to find base64 records:', selectError)
      return
    }
    
    console.log(`📊 Found ${base64Records.length} records with base64 avatars`)
    
    if (base64Records.length === 0) {
      console.log('🎉 No base64 records found. Migration complete!')
      return
    }
    
    // 🔄 冪等性チェック: 既にmigration済みのレコードをスキップ
    const recordsNeedingMigration = base64Records.filter(record => {
      // avatar_pathが既に存在する場合は移行済み
      const alreadyMigrated = record.avatar_path && !record.avatar_path.startsWith('data:image/')
      if (alreadyMigrated) {
        console.log(`   ⏭️ Skipping ${record.user_id}: already migrated (avatar_path exists)`)
        return false
      }
      return true
    })
    
    console.log(`📊 Migration status: ${recordsNeedingMigration.length} need migration, ${base64Records.length - recordsNeedingMigration.length} already migrated`)
    
    if (recordsNeedingMigration.length === 0) {
      console.log('🎉 All records already migrated! No work needed.')
      return
    }
    
    // 確認プロンプト
    console.log('\n⚠️  This will migrate the following records:')
    recordsNeedingMigration.forEach((record, index) => {
      const sizeKB = Math.round(record.avatar_url.length / 1024)
      console.log(`   ${index + 1}. ${record.user_id} (${sizeKB}KB)`)
    })
    
    console.log('\n🚀 Step 3: Begin migration')
    
    const results = {
      success: [],
      failed: [],
      totalOriginalSize: 0,
      totalNewSize: 0
    }
    
    // 順次処理（並行処理は Storage制限でエラーになる可能性があるため）
    for (let i = 0; i < recordsNeedingMigration.length; i++) {
      const record = recordsNeedingMigration[i]
      console.log(`\n📋 Progress: ${i + 1}/${recordsNeedingMigration.length}`)
      
      const result = await migrateRecord(record)
      
      if (result.success) {
        results.success.push(result)
        results.totalOriginalSize += result.originalSize
        results.totalNewSize += result.newSize
      } else {
        results.failed.push(result)
      }
      
      // レート制限対策
      if (i < recordsNeedingMigration.length - 1) {
        console.log('   ⏳ Waiting 1 second...')
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    console.log('\n🎉 Migration Complete!')
    console.log('📊 Results Summary:')
    console.log(`   ✅ Success: ${results.success.length}`)
    console.log(`   ❌ Failed: ${results.failed.length}`)
    console.log(`   💾 Size reduction: ${Math.round((results.totalOriginalSize - results.totalNewSize) / 1024)}KB saved`)
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed records:')
      results.failed.forEach(({ record, error }) => {
        console.log(`   - ${record.user_id}: ${error.message}`)
      })
    }
    
    console.log('\n🔍 Next steps:')
    console.log('1. Verify migrated images display correctly in MyPage/Preview')
    console.log('2. Check profile completion percentages are maintained')
    console.log('3. Consider adding avatar_path column for better management')
    
  } catch (error) {
    console.error('❌ Migration script failed:', error)
    process.exit(1)
  }
}

// スクリプト実行
if (require.main === module) {
  main()
}