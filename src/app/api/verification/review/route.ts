import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { userId, filePath, idType } = await req.json()
    console.log('[verification/review] called:', { userId: userId?.slice(0, 8), filePath, idType })

    if (!userId || !filePath || !idType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Service roleクライアント（関数内で初期化）
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 署名付きURLを取得（非公開バケット）
    console.log('[verification/review] creating signed URL for:', filePath)
    const { data: signedData, error: signedError } = await serviceSupabase.storage
      .from('identity-documents')
      .createSignedUrl(filePath, 120)

    console.log('[verification/review] signed URL result:', { hasUrl: !!signedData?.signedUrl, signedError })
    if (signedError || !signedData?.signedUrl) {
      console.error('[verification/review] Signed URL error:', signedError)
      return NextResponse.json({ error: 'Failed to get signed URL' }, { status: 500 })
    }

    // OpenAI Vision APIで審査（OpenAI APIキーが設定されていない場合はスキップ）
    let result: any = { requires_manual_review: true, auto_approve: false, flags: [] }

    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      try {
        const prompt = `この身分証画像を審査してください。以下の項目をJSONで返してください：
{
  "id_type_detected": "検出された身分証の種類（passport/license/mynumber/other/unknown）",
  "has_face_photo": true/false,
  "birth_date": "YYYY-MM-DD または null",
  "age": 数値 または null,
  "is_age_valid": true/false （18歳以上かどうか）,
  "image_quality": "good/poor/unreadable",
  "suspected_tampering": true/false,
  "flags": ["要確認の理由があれば配列で記載"],
  "requires_manual_review": true/false,
  "auto_approve": true/false
}
auto_approveはis_age_validがtrue、suspected_tamperingがfalse、image_qualityがgood、has_face_photoがtrueの場合のみtrueにしてください。
JSONのみ返してください。`

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: signedData.signedUrl } }
                ]
              }
            ],
            max_tokens: 500,
          }),
        })

        if (aiResponse.ok) {
          const aiData = await aiResponse.json()
          const resultText = aiData.choices?.[0]?.message?.content || '{}'
          try {
            result = JSON.parse(resultText.replace(/```json|```/g, '').trim())
          } catch {
            result = { requires_manual_review: true, auto_approve: false, flags: ['AI解析エラー'] }
          }
        } else {
          console.error('[verification/review] OpenAI API error:', aiResponse.status)
          result = { requires_manual_review: true, auto_approve: false, flags: ['AI審査エラー'] }
        }
      } catch (aiError) {
        console.error('[verification/review] OpenAI error:', aiError)
        result = { requires_manual_review: true, auto_approve: false, flags: ['AI審査エラー'] }
      }
    } else {
      console.warn('[verification/review] OPENAI_API_KEY not set - falling back to manual review')
    }

    // 審査結果をDBに保存
    const status = result.auto_approve
      ? 'approved'
      : result.requires_manual_review
        ? 'requires_review'
        : 'pending'

    const { error: updateError } = await serviceSupabase
      .from('profiles')
      .update({
        is_verified: result.auto_approve === true,
        verification_status: status,
        verification_submitted_at: new Date().toISOString(),
        id_document_url: filePath,
        id_document_type: idType,
        ai_review_result: result,
        ai_review_flags: result.flags || [],
      })
      .eq('id', userId)

    if (updateError) {
      console.error('[verification/review] DB update error:', updateError)
      return NextResponse.json({ error: 'Failed to save review result' }, { status: 500 })
    }

    console.log(`[verification/review] User ${userId.slice(0, 8)} → status: ${status}`)

    return NextResponse.json({ status, result })
  } catch (error) {
    console.error('[verification/review] Unexpected error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
