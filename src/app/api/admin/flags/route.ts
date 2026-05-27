import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLanguageFromNationality } from '@/utils/language'
import {
  buildFlagWarningNotification,
  localeForLanguage,
  truncateSnippet,
} from '@/utils/violationCategories'

export const dynamic = 'force-dynamic'

// GET /api/admin/flags                       → 未対応フラグ一覧（既定）
// GET /api/admin/flags?status=pending        → 未対応（reviewed=false）
// GET /api/admin/flags?status=done           → 対応済み（reviewed=true、resolved/warned/suspended全て）
// GET /api/admin/flags?status=resolved       → 対応済みのうち「問題なし」のみ
// GET /api/admin/flags?status=warned         → 対応済みのうち「警告」のみ
// GET /api/admin/flags?status=suspended      → 対応済みのうち「停止」のみ
// GET /api/admin/flags?count_only=true       → 件数のみ（status クエリと併用可）
// PATCH /api/admin/flags                     → フラグアクション（確認済み・警告・停止）

type FlagStatusFilter = 'pending' | 'done' | 'resolved' | 'warned' | 'suspended'

function parseStatus(raw: string | null): FlagStatusFilter {
  if (raw === 'done' || raw === 'resolved' || raw === 'warned' || raw === 'suspended') {
    return raw
  }
  return 'pending'
}

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const countOnly = req.nextUrl.searchParams.get('count_only') === 'true'
    const status = parseStatus(req.nextUrl.searchParams.get('status'))

    if (countOnly) {
      let countQuery = supabaseAdmin
        .from('message_flags')
        .select('id', { count: 'exact', head: true })
      if (status === 'pending') {
        countQuery = countQuery.eq('reviewed', false)
      } else if (status === 'done') {
        countQuery = countQuery.eq('reviewed', true)
      } else {
        countQuery = countQuery.eq('reviewed', true).eq('status', status)
      }
      const { count, error } = await countQuery
      if (error) {
        console.error('[admin/flags] count error:', error)
        return NextResponse.json({ count: 0 })
      }
      return NextResponse.json({ count: count || 0 })
    }

    let listQuery = supabaseAdmin.from('message_flags').select('*')
    if (status === 'pending') {
      listQuery = listQuery.eq('reviewed', false)
    } else if (status === 'done') {
      listQuery = listQuery.eq('reviewed', true)
    } else {
      listQuery = listQuery.eq('reviewed', true).eq('status', status)
    }
    // 未対応はスコア降順優先、対応済みは新しい順
    const ordered = status === 'pending'
      ? listQuery.order('score', { ascending: false }).order('created_at', { ascending: false })
      : listQuery.order('created_at', { ascending: false })
    const { data, error } = await ordered

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!data || data.length === 0) {
      return NextResponse.json({ flags: [], count: 0 })
    }

    // message_id から messages + sender profile を2ステップで取得（FKなしでも動作）
    const messageIds = data.map((f: { message_id: string }) => f.message_id).filter(Boolean)
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, content, sender_id')
      .in('id', messageIds)

    const senderIds = (messages || []).map((m: { sender_id: string }) => m.sender_id).filter(Boolean)
    const { data: profiles } = senderIds.length > 0
      ? await supabaseAdmin.from('profiles').select('id, name, gender, nationality').in('id', senderIds)
      : { data: [] }

    const messageMap: Record<string, { content: string; sender_id: string }> = {}
    for (const m of messages || []) {
      messageMap[m.id] = { content: m.content, sender_id: m.sender_id }
    }
    const profileMap: Record<string, { name: string; gender: string; nationality: string }> = {}
    for (const p of profiles || []) {
      profileMap[p.id] = { name: p.name ?? '', gender: p.gender ?? '', nationality: p.nationality ?? '' }
    }

    const enriched = data.map((f: { message_id: string }) => {
      const msg = messageMap[f.message_id] ?? null
      const profile = msg ? profileMap[msg.sender_id] ?? null : null
      return {
        ...f,
        messages: msg ? { content: msg.content, sender_id: msg.sender_id, profiles: profile } : null,
      }
    })

    return NextResponse.json({ flags: enriched, count: enriched.length })
  } catch (e) {
    console.error('[admin/flags] GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { flagId, action } = await req.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ① flagId → message_id → sender_id + メッセージ詳細 + フラグ詳細をサーバーサイドで解決
    const { data: flagRow, error: flagFetchError } = await supabaseAdmin
      .from('message_flags')
      .select('message_id, flag_type')
      .eq('id', flagId)
      .maybeSingle()

    if (flagFetchError) {
      console.error('[admin/flags] flagRow fetch error:', flagFetchError.message)
    }

    let senderId: string | null = null
    let messageContent: string | null = null
    let messageCreatedAt: string | null = null
    if (flagRow?.message_id) {
      const { data: msgRow } = await supabaseAdmin
        .from('messages')
        .select('sender_id, content, created_at')
        .eq('id', flagRow.message_id)
        .maybeSingle()
      senderId = msgRow?.sender_id ?? null
      messageContent = msgRow?.content ?? null
      messageCreatedAt = msgRow?.created_at ?? null
    }

    // ② フラグを確認済み + ステータス更新
    const { error: updateError } = await supabaseAdmin
      .from('message_flags')
      .update({ reviewed: true, status: action })
      .eq('id', flagId)

    if (updateError) {
      console.error('[admin/flags] PATCH flags error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // ③ 警告通知を送信（受信者の言語に応じてローカライズ + 日時/抜粋/カテゴリを含める）
    if (action === 'warned' && senderId) {
      // 受信者（=違反メッセージ送信者）の国籍から表示言語を決定
      const { data: recipientProfile } = await supabaseAdmin
        .from('profiles')
        .select('nationality')
        .eq('id', senderId)
        .maybeSingle()

      const lang = getLanguageFromNationality(recipientProfile?.nationality)
      const date = messageCreatedAt ? new Date(messageCreatedAt) : new Date()
      const formattedDate = new Intl.DateTimeFormat(localeForLanguage(lang), {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(date)
      const snippet = truncateSnippet(messageContent)

      const { title, message } = buildFlagWarningNotification({
        lang,
        formattedDate,
        snippet,
        category: flagRow?.flag_type ?? '',
      })

      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: senderId,
          type: 'warning',
          title,
          message,
          is_read: false,
        })
      if (notifError) console.error('[admin/flags] 警告通知エラー:', notifError.message)
    }

    // ④ アカウント停止：status='suspended' + 停止通知
    if (action === 'suspended' && senderId) {
      const { error: suspendError } = await supabaseAdmin
        .from('profiles')
        .update({ status: 'suspended' })
        .eq('id', senderId)
      if (suspendError) console.error('[admin/flags] 停止エラー:', suspendError.message)

      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: senderId,
          type: 'suspended',
          title: '🚫 アカウント停止',
          message: '規約違反のため、アカウントが停止されました。',
          is_read: false,
        })
      if (notifError) console.error('[admin/flags] 停止通知エラー:', notifError.message)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/flags] PATCH error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
