/**
 * #5 使われていない Storage のファイルの削除
 *
 * 実行（リポジトリのルートで）:
 *   node --experimental-strip-types scripts/cleanup/05_delete_unused_files.ts                         … dry-run（何も消さない）
 *   node --experimental-strip-types scripts/cleanup/05_delete_unused_files.ts --execute --expect <dry-run のログ>
 *
 * 対象
 *   avatars            … profiles.photo_urls・avatar_url から参照されていないファイル
 *   identity-documents … profiles.id_document_url から参照されていないファイル
 *   chat-images        … messages.image_url から参照されていないファイル
 *   avatars-quarantine・chat-images-quarantine … テストで隔離したもの（全部）
 *
 * 安全装置（対象から外す）
 *   ・作られてから 24 時間以内のファイル（アップロード中・保存前の可能性）
 *   ・.emptyFolderPlaceholder など「.」で始まる置き物
 *   ・ほかのテーブル（EXTRA_REFERENCE_TABLES）のどこかにパスかファイル名が出てくるもの
 *   ・--execute のときは --expect 必須。dry-run のログと対象が 1 件でも違えば止める
 *
 * storage.objects には直接 DELETE を止めるトリガーがあるため、Storage API（remove）で消す。
 * 結果は docs/cleanup/05_delete_files_log_<日時>.json に残す（.gitignore 済み）
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

config({ path: '.env.local', quiet: true })

const MIN_AGE_MS = 24 * 60 * 60 * 1000

// 「参照されていない」の判定に使う列のほかに、画像のパスが入りうるテーブル。
// 行全体を文字列にして、パスかファイル名が出てきたら対象から外す。
// profile_photo_cleanup_logs は「消したファイル」の履歴なので含めない。
const EXTRA_REFERENCE_TABLES = [
  'experiences',
  'notifications',
  'profile_photo_flags',
  'message_flags',
  'archived_violations',
  'reports',
  'conversations',
]

type StorageFile = { bucket: string; path: string; createdAt: string | null }

type Candidate = StorageFile & { owner: string; reason: string }

type Skipped = StorageFile & { reason: string }

function fail(message: string): never {
  console.error(`停止: ${message}`)
  process.exit(1)
}

async function fetchAll(admin: SupabaseClient, table: string, columns: string): Promise<Array<Record<string, unknown>>> {
  const rows: Array<Record<string, unknown>> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + 999)
    if (error) throw new Error(`${table} の取得に失敗: ${error.message}`)
    rows.push(...((data ?? []) as unknown as Array<Record<string, unknown>>))
    if (!data || data.length < 1000) break
  }
  return rows
}

// バケットのファイルを全部（サブフォルダもたどって）一覧にする
async function listBucket(admin: SupabaseClient, bucket: string, folder = ''): Promise<StorageFile[]> {
  const files: StorageFile[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000, offset })
    if (error) throw new Error(`${bucket}/${folder} の一覧取得に失敗: ${error.message}`)
    for (const item of data ?? []) {
      const path = folder ? `${folder}/${item.name}` : item.name
      if (item.id) {
        files.push({ bucket, path, createdAt: item.created_at ?? null })
      } else {
        files.push(...await listBucket(admin, bucket, path))
      }
    }
    if (!data || data.length < 1000) break
  }
  return files
}

// URL・パスのどちらでも、バケット内のパスにそろえる
function toPath(value: unknown, bucket: string): string | null {
  if (typeof value !== 'string' || value === '') return null
  const marker = `/${bucket}/`
  const index = value.indexOf(marker)
  let path = value
  if (index !== -1) {
    path = value.slice(index + marker.length).split(/[?#]/)[0]
  } else if (/^[a-z]+:/i.test(value)) {
    return null
  }
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

function writeLog(payload: unknown): string {
  const dir = join('docs', 'cleanup')
  mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = join(dir, `05_delete_files_log_${stamp}.json`)
  writeFileSync(file, JSON.stringify(payload, null, 2))
  return file
}

async function main() {
  const execute = process.argv.includes('--execute')
  const expectIndex = process.argv.indexOf('--expect')
  const expectFile = expectIndex !== -1 ? process.argv[expectIndex + 1] : null
  if (execute && !expectFile) fail('--execute のときは --expect <dry-run のログ> が必要です')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) fail('.env.local に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です')
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

  // 参照されているパス
  const profiles = await fetchAll(admin, 'profiles', 'id, name, photo_urls, avatar_url, id_document_url')
  const messages = await fetchAll(admin, 'messages', 'image_url')
  const conversations = await fetchAll(admin, 'conversations', 'id, user1_id, user2_id')

  const referenced: Record<string, Set<string>> = { avatars: new Set(), 'identity-documents': new Set(), 'chat-images': new Set() }
  for (const p of profiles) {
    const urls = Array.isArray(p.photo_urls) ? p.photo_urls : []
    for (const u of [...urls, p.avatar_url]) {
      const path = toPath(u, 'avatars')
      if (path) referenced.avatars.add(path)
    }
    const doc = toPath(p.id_document_url, 'identity-documents')
    if (doc) referenced['identity-documents'].add(doc)
  }
  for (const m of messages) {
    const path = toPath(m.image_url, 'chat-images')
    if (path) referenced['chat-images'].add(path)
  }

  // ほかのテーブルの中身（文字列）
  const extraTexts: Array<{ table: string; text: string }> = []
  for (const table of EXTRA_REFERENCE_TABLES) {
    const rows = await fetchAll(admin, table, '*')
    extraTexts.push({ table, text: JSON.stringify(rows) })
  }
  const findExtraReference = (path: string): string | null => {
    const name = path.split('/').pop() ?? path
    for (const { table, text } of extraTexts) {
      if (text.includes(path) || text.includes(encodeURIComponent(path)) || (name.length >= 10 && text.includes(name))) return table
    }
    return null
  }

  // 持ち主の表示
  const profileName = new Map(profiles.map(p => [String(p.id), String(p.name ?? '') || '（名前なし）']))
  const conversationById = new Map(conversations.map(c => [String(c.id), c]))
  const ownerOf = (bucket: string, path: string): string => {
    const folder = path.split('/')[0]
    if (bucket.startsWith('chat-images')) {
      const c = conversationById.get(folder)
      if (!c) return '持ち主なし（会話なし）'
      return `会話：${profileName.get(String(c.user1_id)) ?? '持ち主なし'}・${profileName.get(String(c.user2_id)) ?? '持ち主なし'}`
    }
    return profileName.get(folder) ?? '持ち主なし'
  }

  const now = Date.now()
  const candidates: Candidate[] = []
  const skipped: Skipped[] = []
  const totals: Record<string, number> = {}

  const buckets: Array<{ bucket: string; mode: 'unreferenced' | 'all' }> = [
    { bucket: 'avatars', mode: 'unreferenced' },
    { bucket: 'identity-documents', mode: 'unreferenced' },
    { bucket: 'chat-images', mode: 'unreferenced' },
    { bucket: 'avatars-quarantine', mode: 'all' },
    { bucket: 'chat-images-quarantine', mode: 'all' },
  ]

  for (const { bucket, mode } of buckets) {
    const files = await listBucket(admin, bucket)
    totals[bucket] = files.length
    for (const file of files) {
      const name = file.path.split('/').pop() ?? ''
      if (name.startsWith('.')) {
        skipped.push({ ...file, reason: '置き物' })
        continue
      }
      if (mode === 'unreferenced' && referenced[bucket].has(file.path)) continue
      if (!file.createdAt || now - new Date(file.createdAt).getTime() < MIN_AGE_MS) {
        skipped.push({ ...file, reason: '24 時間以内（または作成日不明）' })
        continue
      }
      if (mode === 'unreferenced') {
        const table = findExtraReference(file.path)
        if (table) {
          skipped.push({ ...file, reason: `${table} から参照あり` })
          continue
        }
      }
      candidates.push({ ...file, owner: ownerOf(bucket, file.path), reason: mode === 'all' ? '隔離したもの' : '参照なし' })
    }
  }

  const blockers: string[] = []
  if (expectFile) {
    const expected = JSON.parse(readFileSync(expectFile, 'utf8')) as { candidates?: StorageFile[] }
    const key = (f: StorageFile) => `${f.bucket}/${f.path}`
    const expectedKeys = (expected.candidates ?? []).map(key).sort().join('\n')
    const currentKeys = candidates.map(key).sort().join('\n')
    if (expectedKeys !== currentKeys) blockers.push(`対象が ${expectFile} と一致しません（ログ ${(expected.candidates ?? []).length} 件・今回 ${candidates.length} 件）`)
  }

  console.log(`モード: ${execute ? '本番（--execute）' : 'dry-run（何も消しません）'}`)
  console.table(buckets.map(({ bucket }) => ({
    bucket,
    total: totals[bucket],
    delete: candidates.filter(c => c.bucket === bucket).length,
    skipped: skipped.filter(s => s.bucket === bucket).length,
  })))
  if (skipped.length > 0) {
    console.log('対象から外したもの:')
    for (const s of skipped) console.log(`  ${s.bucket}/${s.path}  ${s.reason}  ${s.createdAt ?? ''}`)
  }

  const log: Record<string, unknown> = { mode: execute ? 'execute' : 'dry-run', startedAt: new Date().toISOString(), totals, blockers, candidates, skipped }

  if (blockers.length > 0) {
    console.error('安全装置に当たったため、何も消しません:')
    for (const b of blockers) console.error(`  - ${b}`)
    console.log(`ログ: ${writeLog(log)}`)
    process.exit(1)
  }

  if (!execute) {
    console.log(`dry-run のため、何も消していません（対象 ${candidates.length} 件）。`)
    console.log(`ログ: ${writeLog(log)}`)
    return
  }

  const results: Array<{ bucket: string; requested: number; removed: number; error?: string }> = []
  for (const { bucket } of buckets) {
    const paths = candidates.filter(c => c.bucket === bucket).map(c => c.path)
    let removed = 0
    for (let i = 0; i < paths.length; i += 100) {
      const { data, error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100))
      if (error) {
        results.push({ bucket, requested: paths.length, removed, error: error.message })
        log.results = results
        console.error(`${bucket}: 削除に失敗（${removed} 件まで消えています）: ${error.message}。ここで止めます`)
        console.log(`ログ: ${writeLog(log)}`)
        process.exit(1)
      }
      removed += data?.length ?? 0
    }
    results.push({ bucket, requested: paths.length, removed })
  }

  // 消えたことを確かめる
  const remaining: string[] = []
  for (const { bucket } of buckets) {
    const left = new Set((await listBucket(admin, bucket)).map(f => f.path))
    for (const c of candidates.filter(c => c.bucket === bucket)) if (left.has(c.path)) remaining.push(`${bucket}/${c.path}`)
  }
  log.results = results
  log.remaining = remaining
  log.finishedAt = new Date().toISOString()
  console.table(results)
  console.log(remaining.length === 0 ? '確認：対象はすべて消えています' : `確認：${remaining.length} 件残っています`)
  console.log(`ログ: ${writeLog(log)}`)
  if (remaining.length > 0) process.exit(1)
}

main().catch(e => fail(e instanceof Error ? e.message : String(e)))
