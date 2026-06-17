import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// NOTE: クライアントはハンドラ内で生成（ビルド時に環境変数なしでクラッシュするのを防ぐ）

const SYSTEM_PROMPT = `
あなたはマッチングアプリのメッセージ安全監視AIです。
以下のカテゴリに該当するか判定し、JSONで返してください。

カテゴリ：
- money: 金銭要求・送金・投資・ギフト
- contact_exchange: LINE ID・メールアドレス・電話番号などの直接連絡先の交換
- spam: 他の出会い系サービス・マッチングアプリへの誘導、業者的勧誘、外部URL共有
- redirect: 他サービスへの誘導
- inappropriate: 性的・ハラスメント・暴力
- personal_info: 住所・口座・パスワード収集

返答形式（必ずJSONのみ）：
{
  "flagged": true/false,
  "category": "カテゴリ名 or null",
  "score": 0.0〜1.0,
  "reason": "理由（日本語）"
}
`

export async function POST(req: NextRequest) {
  try {
    // service_role で RLS をバイパス（ビルド時クラッシュ防止のためハンドラ内で初期化）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { message_id, content, sender_id } = await req.json()

    if (!content || !message_id) {
      return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 })
    }

    // OpenAI API key check
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ ok: true, judgment: { flagged: false } })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `メッセージ内容：「${content}」` },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ ok: true, judgment: { flagged: false } })
    }

    const data = await response.json()
    const judgment = JSON.parse(data.choices[0].message.content || '{}')

    console.log('AI判定結果:', judgment)

    // スコア0.7以上でフラグを立てる
    if (judgment.flagged && judgment.score >= 0.7) {
      const { data: flagData, error: flagError } = await supabaseAdmin.from('message_flags').insert({
        message_id,
        flag_type: judgment.category,
        score: judgment.score,
        detail: judgment.reason,
        reviewed: false,
        status: 'pending',
      })

      console.log('フラグ書き込み:', { data: flagData, error: flagError })

      if (flagError) {
        console.error('[moderate] message_flags書き込みエラー:', flagError)
      }

      // contact_exchange（LINE/メール/電話番号交換）はカウントのみ・管理者通知なし
      if (judgment.category === 'contact_exchange') {
        return NextResponse.json({ ok: true, judgment })
      }

      // それ以外のカテゴリは管理者通知あり
      const adminUserId = process.env.ADMIN_USER_ID
      if (adminUserId) {
        await supabaseAdmin.from('notifications').insert({
          user_id: adminUserId,
          type: 'ai_flag',
          content: `AIが不審なメッセージを検知しました: ${judgment.reason}`,
          related_id: message_id,
        })
      }
    }

    return NextResponse.json({ ok: true, judgment })
  } catch (error) {
    // エラーでも送信は止めない
    console.error('[moderate] error:', error)
    return NextResponse.json({ ok: true, judgment: { flagged: false } })
  }
}
