'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Clock, ShieldCheck } from 'lucide-react'

type VerificationRequest = {
  id: string
  name: string
  age: number
  nationality: string
  avatar_url: string | null
  verification_status: string
  id_document_type: string
  id_document_url: string
  verification_submitted_at: string
  ai_review_result: {
    id_type_detected: string
    has_face_photo: boolean
    birth_date: string | null
    age: number | null
    is_age_valid: boolean
    image_quality: string
    suspected_tampering: boolean
    flags: string[]
    requires_manual_review: boolean
    auto_approve: boolean
  } | null
  ai_review_flags: string[] | null
}

export default function AdminVerificationPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<Record<string, boolean>>({})

  const supabase = createClient()

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, age, nationality, avatar_url, verification_status, id_document_type, id_document_url, verification_submitted_at, ai_review_result, ai_review_flags')
      .eq('verification_status', 'requires_review')
      .order('verification_submitted_at', { ascending: true })

    if (error) {
      console.error('[admin/verification] fetch error:', error)
    }

    if (data) {
      setRequests(data)

      // 署名付きURLをAPI経由で取得（service role）
      for (const req of data) {
        if (req.id_document_url) {
          try {
            const res = await fetch('/api/admin/verification/signed-url', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: req.id_document_url }),
            })
            const result = await res.json()
            if (result.signedUrl) {
              setImageUrls(prev => ({ ...prev, [req.id]: result.signedUrl }))
            }
          } catch (e) {
            console.error('[admin/verification] signed URL error for', req.id, e)
          }
        }
      }
    }
    setLoading(false)
  }

  const handleApprove = async (userId: string) => {
    setProcessing(prev => ({ ...prev, [userId]: true }))
    try {
      const res = await fetch('/api/admin/verification/approve', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== userId))
      }
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleReject = async (userId: string) => {
    setProcessing(prev => ({ ...prev, [userId]: true }))
    try {
      const res = await fetch('/api/admin/verification/reject', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== userId))
      }
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-sakura-500 rounded-full animate-spin mx-auto mb-3" />
          読み込み中...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-7 h-7 text-sakura-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">身分証レビュー</h1>
            <p className="text-sm text-gray-500">
              要確認件数：
              <span className={`font-bold ${requests.length > 0 ? 'text-red-500' : 'text-green-600'}`}>
                {requests.length}件
              </span>
            </p>
          </div>
        </div>

        {/* 0件 */}
        {requests.length === 0 && (
          <div className="text-center text-gray-400 mt-24">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <p className="text-lg font-medium text-gray-600">確認待ちの申請はありません</p>
          </div>
        )}

        {/* 申請一覧 */}
        <div className="space-y-6">
          {requests.map((req) => {
            const ai = req.ai_review_result
            const isProcessing = processing[req.id]

            return (
              <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* ユーザー情報ヘッダー */}
                <div className="flex items-center gap-4 p-4 border-b border-gray-100 bg-gray-50">
                  {req.avatar_url ? (
                    <img
                      src={req.avatar_url}
                      alt={req.name}
                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl font-bold">
                      {req.name?.[0] || '?'}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">
                      {req.name}　{req.age ? `${req.age}歳` : ''}　{req.nationality || ''}
                    </p>
                    <p className="text-sm text-gray-400">
                      提出日時：{new Date(req.verification_submitted_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    要確認
                  </span>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 身分証画像 */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      身分証画像
                      <span className="ml-2 text-xs text-gray-400 font-normal">（種類: {req.id_document_type || '不明'}）</span>
                    </p>
                    {imageUrls[req.id] ? (
                      <img
                        src={imageUrls[req.id]}
                        alt="身分証"
                        className="w-full rounded-lg object-contain max-h-56 bg-gray-50 border border-gray-100"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                        <div className="text-center">
                          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin mx-auto mb-2" />
                          画像を読み込み中...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI審査結果 */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">AI審査結果</p>
                    {ai ? (
                      <div className="space-y-2 text-sm">
                        {[
                          { label: '身分証種別', value: ai.id_type_detected || '不明' },
                          { label: '顔写真', value: ai.has_face_photo ? '✅ あり' : '❌ なし' },
                          { label: '生年月日', value: ai.birth_date || '読取不可' },
                          { label: '検出年齢', value: ai.age != null ? `${ai.age}歳` : '不明' },
                          { label: '18歳以上', value: ai.is_age_valid ? '✅ はい' : '❌ いいえ' },
                          { label: '画質', value: ai.image_quality || '不明' },
                          { label: '加工疑い', value: ai.suspected_tampering ? '⚠️ あり' : '✅ なし' },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between border-b border-gray-50 pb-1.5">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-medium text-gray-800">{value}</span>
                          </div>
                        ))}

                        {/* 要確認フラグ */}
                        {req.ai_review_flags && req.ai_review_flags.length > 0 && (
                          <div className="mt-3 pt-2">
                            <p className="text-sm font-medium text-red-600 mb-1.5">⚠️ 要確認フラグ</p>
                            <div className="space-y-1">
                              {req.ai_review_flags.map((flag, i) => (
                                <p key={i} className="text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-md">
                                  {flag}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">AI審査データなし</p>
                    )}
                  </div>
                </div>

                {/* 承認・却下ボタン */}
                <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-full hover:bg-gray-100 font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    却下
                  </button>
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 bg-sakura-500 text-white rounded-full hover:bg-sakura-600 font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    承認
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
