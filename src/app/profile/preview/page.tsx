'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User } from 'lucide-react'

export default function ProfilePreviewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // URLパラメーターから値を取得
  const nickname = searchParams.get('nickname') || 'ニックネーム未設定'
  const age = searchParams.get('age') || '18'
  const selfIntroduction = searchParams.get('self_introduction') || ''
  const hobbies = searchParams.get('hobbies')?.split(',').filter(h => h) || []
  const personality = searchParams.get('personality')?.split(',').filter(p => p) || []
  const customCulture = searchParams.get('custom_culture') || ''
  const profileImage = searchParams.get('image') || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      {/* ヘッダー */}
      <div className="bg-orange-500 text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center">
          <Button
            variant="ghost"
            onClick={() => window.close()}
            className="mr-4 text-white hover:bg-orange-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
          <h1 className="text-xl font-bold">プレビュー | 相手からの見え方</h1>
        </div>
      </div>

      {/* プレビューコンテンツ */}
      <div className="py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* プロフィール画像 */}
            <div className="relative h-80 bg-gray-100">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="プロフィール"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <User className="w-24 h-24 text-gray-400" />
                </div>
              )}
            </div>

            {/* プロフィール情報 */}
            <div className="p-6 space-y-4">
              {/* 基本情報 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{nickname}</h2>
                <p className="text-lg text-gray-600">{age}歳</p>
              </div>

              {/* 自己紹介 */}
              {selfIntroduction && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">自己紹介</h3>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {selfIntroduction}
                  </p>
                </div>
              )}

              {/* 趣味 */}
              {hobbies.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">趣味・興味</h3>
                  <div className="flex flex-wrap gap-2">
                    {hobbies.map((hobby, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-sakura-100 text-sakura-800 rounded-full text-xs"
                      >
                        {hobby}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 性格 */}
              {personality.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">性格</h3>
                  <div className="flex flex-wrap gap-2">
                    {personality.map((trait, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 共有したい日本文化 */}
              {customCulture && (
                <div className="bg-amber-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">共有したい日本文化</h3>
                  <p className="text-gray-700 text-sm">{customCulture}</p>
                </div>
              )}

              {/* アクションボタン */}
              <div className="pt-4">
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => {
                    // プロフィールを更新するボタン（実際の機能は編集ページで実装済み）
                    window.close()
                  }}
                >
                  この内容でプロフィールを更新する
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}