// Vercel Build Cache Buster
// このファイルは Vercel のビルドキャッシュを無効化し、フルビルドを強制します
console.log('='.repeat(80))
console.log('🌸 SAKURA CLUB - VERCEL BUILD CACHE BUSTER 🌸')
console.log('Forcing full rebuild at:', new Date().toISOString())
console.log('='.repeat(80))

// ビルド時の詳細ログ情報
console.log('📋 BUILD ENVIRONMENT INFO:')
console.log('  Node.js version:', process.version)
console.log('  Platform:', process.platform)
console.log('  Architecture:', process.arch)
console.log('  Working directory:', process.cwd())
console.log('  Memory usage:', JSON.stringify(process.memoryUsage(), null, 2))

// 環境変数の確認
console.log('\n🔧 ENVIRONMENT VARIABLES CHECK:')
console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set')
console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set')
console.log('  NODE_ENV:', process.env.NODE_ENV || 'undefined')
console.log('  VERCEL:', process.env.VERCEL || 'undefined')
console.log('  CI:', process.env.CI || 'undefined')

// ファイルシステムの確認
const fs = require('fs')
const path = require('path')

console.log('\n📁 CRITICAL FILES CHECK:')
const criticalFiles = [
  'src/components/ui/button.tsx',
  'src/components/auth/AuthGuard.tsx', 
  'src/store/authStore.ts',
  'src/lib/utils.ts',
  'tsconfig.json',
  'next.config.js'
]

criticalFiles.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath)
  const exists = fs.existsSync(fullPath)
  console.log(`  ${filePath}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`)
  
  if (exists) {
    const stats = fs.statSync(fullPath)
    console.log(`    Size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`)
  }
})

// tsconfig.jsonの内容確認
console.log('\n⚙️  TSCONFIG PATHS CHECK:')
try {
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
  console.log('  BaseURL:', tsconfig.compilerOptions?.baseUrl || 'undefined')
  console.log('  Paths:', JSON.stringify(tsconfig.compilerOptions?.paths || {}, null, 4))
} catch (error) {
  console.log('  ❌ Error reading tsconfig.json:', error.message)
}

console.log('\n' + '='.repeat(80))
console.log('🚀 CACHE BUSTER COMPLETED - PROCEEDING TO BUILD')
console.log('='.repeat(80) + '\n')

module.exports = {}