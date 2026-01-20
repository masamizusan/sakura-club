/**
 * 🗑️ TASK E: 孤児画像掃除スクリプト
 *
 * 目的: Storageに存在するが、どのprofilesレコードからも参照されていない画像を削除
 *
 * 実行方法:
 *   node scripts/cleanupOrphanAvatars.js
 *
 * 環境変数が必要:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 安全機能:
 *   - dry-run モード（デフォルト）で実際には削除しない
 *   - --execute フラグで実際に削除
 */

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ 環境変数が設定されていません')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const BUCKET_NAME = 'avatars'

async function main() {
  const isDryRun = !process.argv.includes('--execute')

  console.log('='.repeat(60))
  console.log('🗑️ TASK E: 孤児画像掃除スクリプト')
  console.log('='.repeat(60))
  console.log(`モード: ${isDryRun ? '🔍 DRY-RUN（削除しない）' : '⚠️ EXECUTE（実際に削除）'}`)
  console.log('')

  // Step 1: DBから全ての参照URLを収集
  console.log('📋 Step 1: DBから参照URL一覧を取得...')
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, photo_urls, avatar_url')

  if (profileError) {
    console.error('❌ profiles取得エラー:', profileError)
    process.exit(1)
  }

  // 参照されているURLをSetで管理
  const referencedUrls = new Set()

  for (const profile of profiles) {
    // photo_urls から収集
    if (Array.isArray(profile.photo_urls)) {
      profile.photo_urls.forEach(url => {
        if (url && typeof url === 'string') {
          referencedUrls.add(url)
        }
      })
    }

    // avatar_url から収集（互換用）
    if (profile.avatar_url && typeof profile.avatar_url === 'string') {
      referencedUrls.add(profile.avatar_url)
    }
  }

  console.log(`   プロフィール数: ${profiles.length}`)
  console.log(`   参照URL数: ${referencedUrls.size}`)
  console.log('')

  // Step 2: Storageの全ファイルを取得
  console.log('📁 Step 2: Storageファイル一覧を取得...')

  // まずルートのフォルダ（ユーザーID）を取得
  const { data: folders, error: folderError } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', { limit: 1000 })

  if (folderError) {
    console.error('❌ Storageフォルダ取得エラー:', folderError)
    process.exit(1)
  }

  // 全ファイルを収集
  const storageFiles = []

  for (const folder of folders) {
    if (folder.id === null) continue // フォルダのみ処理

    const { data: files, error: fileError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folder.name, { limit: 1000 })

    if (fileError) {
      console.warn(`⚠️ フォルダ ${folder.name} の取得エラー:`, fileError)
      continue
    }

    for (const file of files) {
      if (file.id === null) continue // ファイルのみ処理

      const path = `${folder.name}/${file.name}`
      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`

      storageFiles.push({
        path,
        url,
        size: file.metadata?.size || 0,
        createdAt: file.created_at
      })
    }
  }

  console.log(`   Storageファイル数: ${storageFiles.length}`)
  console.log('')

  // Step 3: 孤児ファイルを特定
  console.log('🔍 Step 3: 孤児ファイルを特定...')

  const orphanFiles = storageFiles.filter(file => !referencedUrls.has(file.url))

  console.log(`   孤児ファイル数: ${orphanFiles.length}`)

  if (orphanFiles.length === 0) {
    console.log('')
    console.log('✅ 孤児ファイルはありません。掃除不要です。')
    return
  }

  // 孤児ファイル一覧を表示
  console.log('')
  console.log('📋 孤児ファイル一覧:')
  let totalSize = 0
  for (const file of orphanFiles) {
    console.log(`   - ${file.path} (${formatBytes(file.size)})`)
    totalSize += file.size
  }
  console.log(`   合計サイズ: ${formatBytes(totalSize)}`)
  console.log('')

  // Step 4: 削除実行（または dry-run）
  if (isDryRun) {
    console.log('🔍 DRY-RUN モード: 実際には削除しません')
    console.log('')
    console.log('実際に削除するには以下を実行:')
    console.log('   node scripts/cleanupOrphanAvatars.js --execute')
    return
  }

  console.log('⚠️ EXECUTE モード: 削除を実行します...')

  const pathsToDelete = orphanFiles.map(f => f.path)

  // バッチで削除（100件ずつ）
  const BATCH_SIZE = 100
  let deletedCount = 0

  for (let i = 0; i < pathsToDelete.length; i += BATCH_SIZE) {
    const batch = pathsToDelete.slice(i, i + BATCH_SIZE)

    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(batch)

    if (deleteError) {
      console.error(`❌ 削除エラー (batch ${i / BATCH_SIZE + 1}):`, deleteError)
    } else {
      deletedCount += batch.length
      console.log(`   削除完了: ${deletedCount}/${pathsToDelete.length}`)
    }
  }

  console.log('')
  console.log('='.repeat(60))
  console.log(`✅ 完了: ${deletedCount}件の孤児ファイルを削除しました`)
  console.log(`   解放容量: ${formatBytes(totalSize)}`)
  console.log('='.repeat(60))
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

main().catch(err => {
  console.error('❌ 予期しないエラー:', err)
  process.exit(1)
})
