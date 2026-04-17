'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Clock, ShieldCheck, AlertTriangle, Ban, Flag } from 'lucide-react'

type TabType = 'requires_review' | 'auto_approved' | 'manual_approved' | 'rejected' | 'ai_flags'

// AIフラグ種別ラベル
const flagTypeLabel: Record<string, string> = {
  money:         '💰 金銭要求',
  spam:          '🚫 業者・スパム',
  redirect:      '↗️ 外部誘導',
  inappropriate: '⚠️ 不適切内容',
  personal_info: '🔒 個人情報収集',
}

type MessageFlag = {
  id: string
  flag_type: string
  score: number
  detail: string
  reviewed: boolean
  created_at: string
  messages: {
    content: string
    sender_id: string
    profiles: { name: string; gender: string; nationality: string } | null
  } | null
}

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

type TabCounts = Record<TabType, number>

const TAB_CONFIG: { key: TabType; label: string; icon: React.ReactNode; badgeColor: string }[] = [
  {
    key: 'requires_review',
    label: '要確認',
    icon: <AlertTriangle className="w-4 h-4" />,
    badgeColor: 'bg-yellow-100 text-yellow-800',
  },
  {
    key: 'auto_approved',
    label: 'AI自動承認',
    icon: <CheckCircle className="w-4 h-4" />,
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  {
    key: 'manual_approved',
    label: '手動承認',
    icon: <ShieldCheck className="w-4 h-4" />,
    badgeColor: 'bg-green-100 text-green-800',
  },
  {
    key: 'rejected',
    label: '却下',
    icon: <Ban className="w-4 h-4" />,
    badgeColor: 'bg-red-100 text-red-800',
  },
  {
    key: 'ai_flags',
    label: 'AIフラグ',
    icon: <Flag className="w-4 h-4" />,
    badgeColor: 'bg-orange-100 text-orange-800',
  },
]

// verification_statusのDBカラム値とタブTypeのマッピング
const TAB_STATUS_MAP: Record<TabType, string[]> = {
  requires_review: ['requires_review'],
  auto_approved: ['approved'],   // AI自動承認はstatus='approved' + ai_review_result.auto_approve=true
  manual_approved: ['approved'], // 手動承認はstatus='approved' + ai_review_result.auto_approve=false or null
  rejected: ['rejected'],
  ai_flags: [],
}

export default function AdminVerificationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('requires_review')
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [counts, setCounts] = useState<TabCounts>({ requires_review: 0, auto_approved: 0, manual_approved: 0, rejected: 0, ai_flags: 0 })
  const [loading, setLoading] = useState(true)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<Record<string, boolean>>({})

  // AIフラグ用state
  const [flags, setFlags] = useState<MessageFlag[]>([])
  const [flagsLoading, setFlagsLoading] = useState(false)

  const fetchFlags = useCallback(async () => {
    setFlagsLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('message_flags')
      .select(`*, messages(content, sender_id, profiles(name, gender, nationality))`)
      .eq('reviewed', false)
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
    setFlags((data as MessageFlag[]) || [])
    setFlagsLoading(false)
  }, [])

  const handleFlagAction = async (flagId: string, action: string) => {
    const supabase = createClient()
    const flag = flags.find(f => f.id === flagId)
    await supabase.from('message_flags').update({ reviewed: true }).eq('id', flagId)
    if (action === 'suspended' && flag?.messages?.sender_id) {
      await supabase.from('profiles').update({ is_active: false }).eq('id', flag.messages.sender_id)
    }
    fetchFlags()
    fetchCounts()
  }

  const fetchCounts = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, verification_status, ai_review_result')
      .in('verification_status', ['requires_review', 'approved', 'rejected'])

    if (data) {
      let requires = 0, auto = 0, manual = 0, rejected = 0
      for (const row of data) {
        if (row.verification_status === 'requires_review') requires++
        else if (row.verification_status === 'approved') {
          const ai = row.ai_review_result as { auto_approve?: boolean } | null
          if (ai?.auto_approve === true) auto++
          else manual++
        } else if (row.verification_status === 'rejected') rejected++
      }
      const supabase2 = createClient()
      const { count: flagCount } = await supabase2
        .from('message_flags')
        .select('id', { count: 'exact', head: true })
        .eq('reviewed', false)
      setCounts({ requires_review: requires, auto_approved: auto, manual_approved: manual, rejected, ai_flags: flagCount || 0 })
    }
  }, [])

  const fetchRequests = useCallback(async (tab: TabType) => {
    const supabase = createClient()
    setLoading(true)
    setImageUrls({})

    let query = supabase
      .from('profiles')
      .select('id, name, age, nationality, avatar_url, verification_status, id_document_type, id_document_url, verification_submitted_at, ai_review_result, ai_review_flags')
      .order('verification_submitted_at', { ascending: tab === 'requires_review' })

    if (tab === 'requires_review') {
      query = query.eq('verification_status', 'requires_review')
    } else if (tab === 'auto_approved') {
      query = query.eq('verification_status', 'approved')
    } else if (tab === 'manual_approved') {
      query = query.eq('verification_status', 'approved')
    } else if (tab === 'rejected') {
      query = query.eq('verification_status', 'rejected')
    }

    const { data, error } = await query

    if (error) {
      console.error('[admin/verification] fetch error:', error)
      setLoading(false)
      return
    }

    if (data) {
      let filtered = data as VerificationRequest[]

      // approved の場合、auto/manual で絞り込む
      if (tab === 'auto_approved') {
        filtered = filtered.filter(r => r.ai_review_result?.auto_approve === true)
      } else if (tab === 'manual_approved') {
        filtered = filtered.filter(r => !r.ai_review_result?.auto_approve)
      }

      setRequests(filtered)

      // 署名付きURLをAPI経由で取得（service role）
      for (const req of filtered) {
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
  }, [])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  useEffect(() => {
    if (activeTab === 'ai_flags') {
      fetchFlags()
    } else {
      fetchRequests(activeTab)
    }
  }, [activeTab, fetchRequests, fetchFlags])

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
        fetchCounts()
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
        fetchCounts()
      }
    } finally {
      setProcessing(prev => ({ ...prev, [userId]: false }))
    }
  }

  const getStatusBadge = (req: VerificationRequest) => {
    const status = req.verification_status
    if (status === 'requires_review') {
      return (
        <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          要確認
        </span>
      )
    } else if (status === 'approved') {
      const isAuto = req.ai_review_result?.auto_approve === true
      return (
        <span className={`text-sm px-3 py-1 rounded-full font-medium flex items-center gap-1 ${isAuto ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
          <CheckCircle className="w-3.5 h-3.5" />
          {isAuto ? 'AI承認' : '手動承認'}
        </span>
      )
    } else if (status === 'rejected') {
      return (
        <span className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
          <XCircle className="w-3.5 h-3.5" />
          却下
        </span>
      )
    }
    return null
  }

  const totalPending = counts.requires_review

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-7 h-7 text-[#8b1a2e]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">身分証レビュー</h1>
            <p className="text-sm text-gray-500">
              要確認件数：
              <span className={`font-bold ${totalPending > 0 ? 'text-red-500' : 'text-green-600'}`}>
                {totalPending}件
              </span>
            </p>
          </div>
        </div>

        {/* タブバー */}
        <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1.5 mb-6">
          {TAB_CONFIG.map(tab => {
            const count = counts[tab.key]
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#8b1a2e] text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/30 text-white' : tab.badgeColor}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ローディング */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center text-gray-500">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-[#8b1a2e] rounded-full animate-spin mx-auto mb-3" />
              読み込み中...
            </div>
          </div>
        ) : (
          <>
            {/* 0件 */}
            {requests.length === 0 && (
              <div className="text-center text-gray-400 mt-24">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <p className="text-lg font-medium text-gray-600">
                  {activeTab === 'requires_review' ? '確認待ちの申請はありません' : 'このタブには表示する項目がありません'}
                </p>
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
                      {getStatusBadge(req)}
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

                    {/* 承認・却下ボタン（requires_reviewタブのみ表示） */}
                    {activeTab === 'requires_review' && (
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
                          className="flex-1 py-2.5 bg-[#8b1a2e] text-white rounded-full hover:bg-[#8b1a2e] font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                        >
                          {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          承認
                        </button>
                      </div>
                    )}

                    {/* 承認済みの場合は再却下ボタンのみ表示 */}
                    {(activeTab === 'auto_approved' || activeTab === 'manual_approved') && (
                      <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={isProcessing}
                          className="py-2.5 px-6 border border-red-300 text-red-600 rounded-full hover:bg-red-50 font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                        >
                          {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          承認取り消し・却下
                        </button>
                      </div>
                    )}

                    {/* 却下済みの場合は再承認ボタンのみ表示 */}
                    {activeTab === 'rejected' && (
                      <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={isProcessing}
                          className="py-2.5 px-6 bg-[#8b1a2e] text-white rounded-full hover:bg-[#8b1a2e] font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                        >
                          {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          再承認
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* AIフラグタブ */}
        {activeTab === 'ai_flags' && (
          <>
            {flagsLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#8b1a2e] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : flags.length === 0 ? (
              <div className="text-center py-12 text-gray-500">未確認フラグはありません</div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-4 mb-4 text-sm text-gray-600">
                  <span>未確認フラグ: <strong className="text-[#8b1a2e]">{flags.length}</strong></span>
                  <span>本日検知数: <strong>{flags.filter(f => new Date(f.created_at).toDateString() === new Date().toDateString()).length}</strong></span>
                </div>
                {flags.map(flag => (
                  <div
                    key={flag.id}
                    className="rounded-xl p-4"
                    style={{
                      background: '#fdf6ef',
                      border: `1px solid ${flag.score >= 0.9 ? '#8b1a2e' : '#d4a89a'}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-white px-2.5 py-0.5 rounded-full" style={{ backgroundColor: '#8b1a2e' }}>
                        {flagTypeLabel[flag.flag_type] || flag.flag_type}
                      </span>
                      <span className="text-xs" style={{ color: '#6b4c3b' }}>
                        スコア: {Math.round(flag.score * 100)}%
                      </span>
                      <span className="text-xs ml-auto" style={{ color: '#6b4c3b' }}>
                        {new Date(flag.created_at).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <p className="text-sm mb-1" style={{ color: '#2c1810' }}>
                      「{flag.messages?.content}」
                    </p>
                    <p className="text-xs mb-1" style={{ color: '#6b4c3b' }}>
                      送信者: {flag.messages?.profiles?.name || '不明'}
                      {flag.messages?.profiles?.nationality && ` / ${flag.messages.profiles.nationality}`}
                    </p>
                    <p className="text-xs mb-3" style={{ color: '#8b1a2e' }}>
                      理由: {flag.detail}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleFlagAction(flag.id, 'resolved')}
                        className="px-3 py-1.5 text-xs rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
                      >
                        問題なし
                      </button>
                      <button
                        onClick={() => handleFlagAction(flag.id, 'warned')}
                        className="px-3 py-1.5 text-xs rounded-full border border-yellow-400 text-yellow-700 hover:bg-yellow-50 transition-colors"
                      >
                        ユーザーに警告
                      </button>
                      <button
                        onClick={() => handleFlagAction(flag.id, 'suspended')}
                        className="px-3 py-1.5 text-xs rounded-full text-white transition-colors"
                        style={{ backgroundColor: '#8b1a2e' }}
                      >
                        アカウント停止
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
