import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// 検証はサーバーサイドのみ。INVITE_CODE は NEXT_PUBLIC_ プレフィックス無しで管理し、
// 値そのものをログに出力しない（漏洩防止）。

// POST /api/auth/check-invite-code
// body: { inviteCode: string }
// 200: { ok: true }
// 400: { error: '...' }   入力欠落
// 403: { error: '...' }   コード不一致
// 500: { error: '...' }   サーバー設定不備（環境変数未設定）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as { inviteCode?: unknown } | null
    const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode : ''

    if (!inviteCode.trim()) {
      return NextResponse.json(
        { error: '招待コードを入力してください' },
        { status: 400 }
      )
    }

    const validCode = process.env.INVITE_CODE
    if (!validCode || !validCode.trim()) {
      // 値そのものは出さず、未設定であることだけログに残す
      console.error('[check-invite-code] INVITE_CODE env var is not set')
      return NextResponse.json(
        { error: 'サーバー設定エラーです。管理者にお問い合わせください。' },
        { status: 500 }
      )
    }

    // 大文字小文字は区別、前後空白だけ除去（タイポ救済）
    if (inviteCode.trim() !== validCode.trim()) {
      // どこが違うかは出さない（ブルートフォース耐性）
      return NextResponse.json(
        { error: '招待コードが正しくありません' },
        { status: 403 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[check-invite-code] error:', e instanceof Error ? e.message : 'unknown')
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
