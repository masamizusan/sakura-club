/**
 * #5 テストアカウントの削除（匿名ユーザー 17 人 + 指定の 3 人 = 20 人）
 *
 * 実行（リポジトリのルートで）:
 *   node --experimental-strip-types scripts/cleanup/05_delete_accounts.ts            … dry-run（何も消さない）
 *   node --experimental-strip-types scripts/cleanup/05_delete_accounts.ts --execute  … 実際に消す
 *
 * - .env.local の NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を使う（キーは表示・記録しない）
 * - 安全装置に 1 つでも当たったら、何も消さずに止める
 *   ・対象が 20 人でない／指定の 3 人が 1 人に特定できない
 *   ・残す 12 人（docs/cleanup/05_test_account_audit.sql の keep と同じ）が含まれる
 *   ・active のサブスク・Stripe 顧客・チケットがある人がいる
 *   ・関係データの件数が取れない（テーブル・列が無いなど）
 * - 消す順番（1 人ずつ）：会話 id を控える → 違反履歴の退避（/api/auth/leave と同じ）
 *   → Storage を API で削除 → subscriptions・likes の行を削除（/api/auth/leave と同じ）→ auth.admin.deleteUser → 確認
 * - 結果は docs/cleanup/05_delete_log_<日時>.json に残す（.gitignore 済み）
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

config({ path: '.env.local' })

const EXPECTED_TARGET_COUNT = 20

// docs/cleanup/05_test_account_audit.sql の keep と同じ（前方一致）
const KEEP_IDS = [
  '9c645969',
  '31cb1dc9',
  '8f01da3c',
  '2b6f201e-aebb-4c8c-9ee2-e1c2a96c8302',
  'f1ca609d-5cab-484c-a6b1-cd08e97d00f5',
  '668e8e6c-0bb6-4c6e-a22c-4dc84e3cd559',
  '840984dd-da94-4b9b-bdc2-a5c87267e90c',
  'cb397188-da66-4e2e-8f5f-05687a996d5f',
  '570b1fbb-8630-421f-a24a-9b900114a754',
  '7199e941-e60a-4430-b771-ac80a4fde904',
  'fee46b32-c950-426f-b6d0-6b866183085b',
  'd282870c-dfdb-4fef-be23-a20afa8d3615',
]

// 匿名以外の対象：id の先頭 8 文字とメールの先頭の両方で 1 人に特定する
const NAMED_TARGETS = [
  { idPrefix: 'a6ec050c', emailPrefix: 'david.wilson.test@gmail.com' },
  { idPrefix: '588a20ac', emailPrefix: 'fm.marco.rossi@test.sakura-clu' },
  { idPrefix: '493d7cb7', emailPrefix: 'leave-test-001@test.sakura-clu' },
]

const USER_FOLDER_BUCKETS = ['avatars', 'identity-documents', 'avatars-quarantine']
const CONVERSATION_FOLDER_BUCKETS = ['chat-images', 'chat-images-quarantine']

type Target = { user: User; category: 'anonymous' | 'named' }

type Counts = Record<string, number>

type TargetReport = {
  id: string
  email: string | null
  name: string | null
  category: Target['category']
  counts: Counts
  conversationIds: string[]
  archive: { reports: number; messageFlags: number }
  storageFiles: string[]
  blockers: string[]
  result?: { deleted: boolean; verified: boolean; error?: string }
}

function fail(message: string): never {
  console.error(`停止: ${message}`)
  process.exit(1)
}

async function listAllUsers(admin: SupabaseClient): Promise<User[]> {
  const users: User[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) fail(`auth.users の取得に失敗: ${error.message}`)
    users.push(...data.users)
    if (data.users.length < 1000) break
  }
  return users
}

async function countRows(admin: SupabaseClient, table: string, filter: { or?: string; eq?: Array<[string, string]> }): Promise<number> {
  let query = admin.from(table).select('*', { count: 'exact', head: true })
  if (filter.or) query = query.or(filter.or)
  for (const [column, value] of filter.eq ?? []) query = query.eq(column, value)
  const { count, error } = await query
  if (error) throw new Error(`${table} の件数取得に失敗: ${error.message}`)
  return count ?? 0
}

async function listFolder(admin: SupabaseClient, bucket: string, folder: string): Promise<string[]> {
  const paths: string[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000, offset })
    if (error) throw new Error(`${bucket}/${folder} の一覧取得に失敗: ${error.message}`)
    // id が null の項目はサブフォルダ（このアプリのパスは 1 階層だけ）
    for (const item of data ?? []) {
      if (item.id) paths.push(`${bucket}/${folder}/${item.name}`)
    }
    if (!data || data.length < 1000) break
  }
  return paths
}

async function inspect(admin: SupabaseClient, target: Target): Promise<TargetReport> {
  const id = target.user.id
  const { data: profile, error: profileError } = await admin
    .from('profiles').select('name').eq('id', id).maybeSingle()
  if (profileError) throw new Error(`profiles の取得に失敗: ${profileError.message}`)

  const { data: conversations, error: convError } = await admin
    .from('conversations').select('id').or(`user1_id.eq.${id},user2_id.eq.${id}`)
  if (convError) throw new Error(`conversations の取得に失敗: ${convError.message}`)
  const conversationIds = (conversations ?? []).map((c: { id: string }) => c.id)

  const counts: Counts = {
    conversations: conversationIds.length,
    messages: await countRows(admin, 'messages', { or: `sender_id.eq.${id},receiver_id.eq.${id}` }),
    likes: await countRows(admin, 'likes', { or: `liker_id.eq.${id},liked_user_id.eq.${id}` }),
    matches: await countRows(admin, 'matches', { or: `user1_id.eq.${id},user2_id.eq.${id}` }),
    subscriptions: await countRows(admin, 'subscriptions', { eq: [['user_id', id]] }),
    activeSubscriptions: await countRows(admin, 'subscriptions', { eq: [['user_id', id], ['status', 'active']] }),
    subscriptionsWithStripeCustomer: await countRows(admin, 'subscriptions', { eq: [['user_id', id]], or: 'stripe_customer_id.not.is.null' }),
    tickets: await countRows(admin, 'sakura_ticket_purchases', { eq: [['user_id', id]] }),
    stripeCustomers: await countRows(admin, 'stripe_customers', { eq: [['user_id', id]] }),
    reports: await countRows(admin, 'reports', { or: `reporter_id.eq.${id},reported_id.eq.${id}` }),
    blocks: await countRows(admin, 'blocks', { or: `blocker_id.eq.${id},blocked_id.eq.${id}` }),
    footprints: await countRows(admin, 'footprints', { or: `visitor_id.eq.${id},profile_owner_id.eq.${id}` }),
    notifications: await countRows(admin, 'notifications', { eq: [['user_id', id]] }),
  }

  // 違反履歴の退避の対象（/api/auth/leave と同じ：受けた通報・自分が送ったメッセージのフラグ）
  const reportsReceived = await countRows(admin, 'reports', { eq: [['reported_id', id]] })
  const { data: sent, error: sentError } = await admin.from('messages').select('id').eq('sender_id', id)
  if (sentError) throw new Error(`messages の取得に失敗: ${sentError.message}`)
  const sentIds = (sent ?? []).map((m: { id: string }) => m.id)
  let messageFlags = 0
  if (sentIds.length > 0) {
    const { count, error } = await admin.from('message_flags').select('*', { count: 'exact', head: true }).in('message_id', sentIds)
    if (error) throw new Error(`message_flags の件数取得に失敗: ${error.message}`)
    messageFlags = count ?? 0
  }

  const storageFiles: string[] = []
  for (const bucket of USER_FOLDER_BUCKETS) storageFiles.push(...await listFolder(admin, bucket, id))
  for (const conversationId of conversationIds) {
    for (const bucket of CONVERSATION_FOLDER_BUCKETS) storageFiles.push(...await listFolder(admin, bucket, conversationId))
  }

  const blockers: string[] = []
  if (KEEP_IDS.some(k => id.startsWith(k))) blockers.push('残す 12 人に含まれる')
  if (counts.activeSubscriptions > 0) blockers.push('active のサブスクがある')
  if (counts.stripeCustomers > 0 || counts.subscriptionsWithStripeCustomer > 0) blockers.push('Stripe 顧客がある')
  if (counts.tickets > 0) blockers.push('さくらいいねのチケットがある')

  return {
    id,
    email: target.user.email ?? null,
    name: (profile as { name?: string | null } | null)?.name ?? null,
    category: target.category,
    counts,
    conversationIds,
    archive: { reports: reportsReceived, messageFlags },
    storageFiles,
    blockers,
  }
}

// /api/auth/leave の 2) と同じ形で archived_violations に退避する
async function archiveViolations(admin: SupabaseClient, report: TargetReport): Promise<number> {
  const id = report.id
  const { data: profile } = await admin.from('profiles').select('name, gender, nationality').eq('id', id).maybeSingle()
  const p = profile as { name?: string | null; gender?: string | null; nationality?: string | null } | null
  const base = {
    original_user_id: id,
    user_email: report.email,
    user_name: p?.name ?? null,
    user_gender: p?.gender ?? null,
    user_nationality: p?.nationality ?? null,
  }

  const { data: received, error: reportsError } = await admin.from('reports').select('*').eq('reported_id', id)
  if (reportsError) throw new Error(`reports の取得に失敗: ${reportsError.message}`)
  const { data: sent, error: sentError } = await admin.from('messages').select('id').eq('sender_id', id)
  if (sentError) throw new Error(`messages の取得に失敗: ${sentError.message}`)
  const sentIds = (sent ?? []).map((m: { id: string }) => m.id)
  let flags: Array<Record<string, unknown>> = []
  if (sentIds.length > 0) {
    const { data, error } = await admin.from('message_flags').select('*').in('message_id', sentIds)
    if (error) throw new Error(`message_flags の取得に失敗: ${error.message}`)
    flags = data ?? []
  }

  const rows: Array<Record<string, unknown>> = []
  for (const r of (received ?? []) as Array<Record<string, unknown>>) {
    rows.push({ ...base, violation_type: 'reported', original_status: r.status ?? 'pending', violation_content: r, original_created_at: r.created_at ?? null })
  }
  for (const f of flags) {
    rows.push({ ...base, violation_type: 'flagged', original_status: f.status ?? 'pending', violation_content: f, original_created_at: f.created_at ?? null })
  }
  if (rows.length > 0) {
    const { error } = await admin.from('archived_violations').insert(rows)
    if (error) throw new Error(`archived_violations への退避に失敗: ${error.message}`)
  }
  return rows.length
}

async function removeFiles(admin: SupabaseClient, files: string[]): Promise<void> {
  const byBucket = new Map<string, string[]>()
  for (const file of files) {
    const slash = file.indexOf('/')
    const bucket = file.slice(0, slash)
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), file.slice(slash + 1)])
  }
  for (const [bucket, paths] of Array.from(byBucket.entries())) {
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100))
      if (error) throw new Error(`${bucket} のファイル削除に失敗: ${error.message}`)
    }
  }
}

async function deleteOne(admin: SupabaseClient, report: TargetReport): Promise<void> {
  const id = report.id
  // 2. 違反履歴の退避
  await archiveViolations(admin, report)
  // 3. Storage（会話 id は inspect の時点で控えたもの）
  await removeFiles(admin, report.storageFiles)
  // 4. /api/auth/leave と同じく subscriptions・likes を先に消してから auth.users
  const { error: subError } = await admin.from('subscriptions').delete().eq('user_id', id)
  if (subError) throw new Error(`subscriptions の削除に失敗: ${subError.message}`)
  const { error: likesError } = await admin.from('likes').delete().or(`liker_id.eq.${id},liked_user_id.eq.${id}`)
  if (likesError) throw new Error(`likes の削除に失敗: ${likesError.message}`)
  const { error: deleteError } = await admin.auth.admin.deleteUser(id)
  if (deleteError) throw new Error(`auth.users の削除に失敗: ${deleteError.message}`)
}

async function verifyDeleted(admin: SupabaseClient, report: TargetReport): Promise<boolean> {
  const { data } = await admin.auth.admin.getUserById(report.id)
  if (data?.user) return false
  const { data: profile, error } = await admin.from('profiles').select('id').eq('id', report.id).maybeSingle()
  if (error || profile) return false
  for (const bucket of USER_FOLDER_BUCKETS) {
    if ((await listFolder(admin, bucket, report.id)).length > 0) return false
  }
  return true
}

function writeLog(payload: unknown): string {
  const dir = join('docs', 'cleanup')
  mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const file = join(dir, `05_delete_log_${stamp}.json`)
  writeFileSync(file, JSON.stringify(payload, null, 2))
  return file
}

async function main() {
  const execute = process.argv.includes('--execute')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) fail('.env.local に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です')

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const users = await listAllUsers(admin)

  const targets: Target[] = users.filter(u => u.is_anonymous === true).map(user => ({ user, category: 'anonymous' as const }))
  for (const named of NAMED_TARGETS) {
    const hits = users.filter(u => u.id.startsWith(named.idPrefix))
    if (hits.length !== 1) fail(`${named.idPrefix} に当たる人が ${hits.length} 人です`)
    const emailHits = users.filter(u => (u.email ?? '').startsWith(named.emailPrefix))
    if (emailHits.length !== 1 || emailHits[0].id !== hits[0].id) fail(`${named.idPrefix} の id とメール（${named.emailPrefix}…）が一致しません`)
    if (hits[0].is_anonymous) fail(`${named.idPrefix} は匿名ユーザーです（二重に数えています）`)
    targets.push({ user: hits[0], category: 'named' })
  }

  const reports: TargetReport[] = []
  for (const target of targets) {
    try {
      reports.push(await inspect(admin, target))
    } catch (e) {
      fail(`${target.user.id.slice(0, 8)} の確認中にエラー: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const globalBlockers: string[] = []
  if (reports.length !== EXPECTED_TARGET_COUNT) globalBlockers.push(`対象が ${reports.length} 人です（${EXPECTED_TARGET_COUNT} 人のはず）`)
  for (const r of reports) for (const b of r.blockers) globalBlockers.push(`${r.id.slice(0, 8)}: ${b}`)

  console.log(`モード: ${execute ? '本番（--execute）' : 'dry-run（何も消しません）'}`)
  console.log(`対象: ${reports.length} 人（匿名 ${reports.filter(r => r.category === 'anonymous').length}・指定 ${reports.filter(r => r.category === 'named').length}）`)
  console.table(reports.map(r => ({
    id: r.id.slice(0, 8),
    category: r.category,
    email: (r.email ?? '').slice(0, 30),
    name: (r.name ?? '').slice(0, 12),
    conv: r.counts.conversations,
    msg: r.counts.messages,
    likes: r.counts.likes,
    match: r.counts.matches,
    sub: r.counts.subscriptions,
    ticket: r.counts.tickets,
    stripe: r.counts.stripeCustomers,
    report: r.counts.reports,
    block: r.counts.blocks,
    foot: r.counts.footprints,
    notif: r.counts.notifications,
    archive: r.archive.reports + r.archive.messageFlags,
    files: r.storageFiles.length,
  })))
  const allFiles = reports.flatMap(r => r.storageFiles)
  console.log(`消す予定の Storage のファイル: ${allFiles.length} 件`)
  for (const file of allFiles) console.log(`  ${file}`)

  const log: Record<string, unknown> = { mode: execute ? 'execute' : 'dry-run', startedAt: new Date().toISOString(), targetCount: reports.length, blockers: globalBlockers, targets: reports }

  if (globalBlockers.length > 0) {
    console.error('安全装置に当たったため、何も消しません:')
    for (const b of globalBlockers) console.error(`  - ${b}`)
    console.log(`ログ: ${writeLog(log)}`)
    process.exit(1)
  }

  if (!execute) {
    console.log('dry-run のため、何も消していません。')
    console.log(`ログ: ${writeLog(log)}`)
    return
  }

  for (const report of reports) {
    try {
      await deleteOne(admin, report)
      const verified = await verifyDeleted(admin, report)
      report.result = { deleted: true, verified }
      console.log(`${report.id.slice(0, 8)}: 削除 ${verified ? '確認済み' : '確認できず'}`)
      if (!verified) throw new Error('削除後の確認で残りが見つかりました')
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      report.result = { ...(report.result ?? { deleted: false, verified: false }), error: message }
      console.error(`${report.id.slice(0, 8)}: ${message}。ここで止めます`)
      log.finishedAt = new Date().toISOString()
      console.log(`ログ: ${writeLog(log)}`)
      process.exit(1)
    }
  }
  log.finishedAt = new Date().toISOString()
  console.log(`完了: ${reports.length} 人を削除しました`)
  console.log(`ログ: ${writeLog(log)}`)
}

main().catch(e => fail(e instanceof Error ? e.message : String(e)))
