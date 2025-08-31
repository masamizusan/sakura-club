'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Loader2 } from 'lucide-react'

function ProfilePreviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // URLパラメーターから値を取得
  const nickname = searchParams.get('nickname') || 'ニックネーム未設定'
  const age = searchParams.get('age') || '18'
  const gender = searchParams.get('gender') || ''
  const nationality = searchParams.get('nationality') || ''
  const prefecture = searchParams.get('prefecture') || ''
  const city = searchParams.get('city') || ''
  const occupation = searchParams.get('occupation') || ''
  const height = searchParams.get('height') || ''
  const bodyType = searchParams.get('body_type') || ''
  const maritalStatus = searchParams.get('marital_status') || ''
  const selfIntroduction = searchParams.get('self_introduction') || ''
  // 配列データの正しい解析
  const hobbies = (() => {
    const hobbiesParam = searchParams.get('hobbies')
    if (!hobbiesParam) return []
    try {
      // JSON形式の場合
      if (hobbiesParam.startsWith('[')) {
        return JSON.parse(hobbiesParam)
      }
      // カンマ区切りの場合
      return hobbiesParam.split(',').filter(h => h)
    } catch {
      return hobbiesParam.split(',').filter(h => h)
    }
  })()
  
  const personality = (() => {
    const personalityParam = searchParams.get('personality')
    if (!personalityParam) return []
    try {
      // JSON形式の場合
      if (personalityParam.startsWith('[')) {
        return JSON.parse(personalityParam)
      }
      // カンマ区切りの場合
      return personalityParam.split(',').filter(p => p)
    } catch {
      return personalityParam.split(',').filter(p => p)
    }
  })()
  const customCulture = searchParams.get('custom_culture') || ''
  const profileImage = searchParams.get('image') || ''
  
  // デバッグログ
  console.log('🖼️ Profile image from URL:', profileImage)
  console.log('🎭 All search params:', Object.fromEntries(searchParams.entries()))

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
                <div className="space-y-1">
                  <p className="text-lg text-gray-600">{age}歳</p>
                  {gender && (
                    <p className="text-sm text-gray-500">
                      {gender === 'male' ? '男性' : '女性'}
                    </p>
                  )}
                </div>
              </div>

              {/* 基本プロフィール */}
              <div className="space-y-3 text-sm">
                {nationality && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">国籍:</span>
                    <span className="text-gray-600">{nationality}</span>
                  </div>
                )}
                {prefecture && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">居住地:</span>
                    <span className="text-gray-600">{prefecture}{city ? `・${city}` : ''}</span>
                  </div>
                )}
                {occupation && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">職業:</span>
                    <span className="text-gray-600">{occupation}</span>
                  </div>
                )}
                {height && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">身長:</span>
                    <span className="text-gray-600">{height}cm</span>
                  </div>
                )}
                {bodyType && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">体型:</span>
                    <span className="text-gray-600">{bodyType}</span>
                  </div>
                )}
                {maritalStatus && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">結婚:</span>
                    <span className="text-gray-600">{maritalStatus === 'single' ? '未婚' : '既婚'}</span>
                  </div>
                )}
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

              {/* 共有したい日本文化 */}
              {(hobbies.length > 0 || customCulture) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">共有したい日本文化</h3>
                  <div className="space-y-2">
                    {hobbies.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {hobbies.map((hobby: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-sakura-100 text-sakura-800 rounded-full text-xs"
                          >
                            {hobby}
                          </span>
                        ))}
                      </div>
                    )}
                    {customCulture && (
                      <div className="bg-amber-50 rounded-lg p-3">
                        <p className="text-gray-700 text-sm">{customCulture}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 性格 */}
              {personality.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">性格</h3>
                  <div className="flex flex-wrap gap-2">
                    {personality.map((trait: string, index: number) => (
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


              {/* アクションボタン */}
              <div className="pt-4">
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={async () => {
                    console.log('🎯 Preview update button clicked!')
                    
                    // 🚨 直接データベースに保存する処理を追加
                    try {
                      // URLパラメータからデータを取得
                      const urlParams = new URLSearchParams(window.location.search)
                      
                      console.log('🚨 DIRECT SAVE: Extracting data from URL params')
                      console.log('🚨 occupation:', urlParams.get('occupation'))
                      console.log('🚨 height:', urlParams.get('height'))
                      console.log('🚨 body_type:', urlParams.get('body_type'))
                      console.log('🚨 marital_status:', urlParams.get('marital_status'))
                      console.log('🚨 personality:', urlParams.get('personality'))
                      
                      // オプションデータをJSONで準備
                      const optionalData = {
                        city: urlParams.get('city') || null,
                        occupation: urlParams.get('occupation') || null,
                        height: urlParams.get('height') ? Number(urlParams.get('height')) : null,
                        body_type: urlParams.get('body_type') || null,
                        marital_status: urlParams.get('marital_status') || null,
                      }
                      
                      // personalityとhobbiesを拡張interests配列として準備
                      const hobbies = urlParams.get('hobbies') ? JSON.parse(urlParams.get('hobbies') || '[]') : []
                      const personality = urlParams.get('personality') ? urlParams.get('personality')?.split(',') : []
                      const customCulture = urlParams.get('custom_culture') || ''
                      
                      const extendedInterests = [...hobbies]
                      
                      // personalityを追加
                      if (personality && personality.length > 0) {
                        personality.forEach(p => {
                          if (p && p.trim()) {
                            extendedInterests.push(`personality:${p.trim()}`)
                          }
                        })
                      }
                      
                      // custom_cultureを追加
                      if (customCulture && customCulture.trim()) {
                        extendedInterests.push(`custom_culture:${customCulture.trim()}`)
                      }
                      
                      console.log('🚨 DIRECT SAVE: Prepared data', {
                        optionalData,
                        extendedInterests
                      })
                      
                      // localStorageにオプションデータを保存（プロフィール編集ページで使用）
                      localStorage.setItem('previewOptionalData', JSON.stringify(optionalData))
                      localStorage.setItem('previewExtendedInterests', JSON.stringify(extendedInterests))
                      
                    } catch (error) {
                      console.error('❌ Error preparing preview data:', error)
                    }
                    
                    // localStorageにプロフィール更新フラグを設定
                    localStorage.setItem('updateProfile', 'true')
                    localStorage.setItem('updateProfileTimestamp', Date.now().toString())
                    
                    console.log('💾 localStorage set with optional data')
                    
                    // 親ウィンドウ（プロフィール編集画面）にメッセージを送信
                    console.log('🔍 Checking window.opener:', !!window.opener)
                    
                    if (window.opener) {
                      console.log('📡 Sending postMessage to opener')
                      window.opener.postMessage({ action: 'updateProfile' }, '*')
                      console.log('🚪 Closing preview window and redirecting opener to mypage')
                      
                      // プロフィール更新後、親ウィンドウをマイページにリダイレクト
                      setTimeout(() => {
                        window.opener.location.href = '/mypage'
                        window.close()
                      }, 500)
                    } else {
                      console.log('🔄 No window.opener, redirecting to mypage after update')
                      window.location.href = '/profile/edit?action=update&redirect=mypage'
                    }
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

export default function ProfilePreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sakura-600" />
          <p className="text-gray-600">プレビューを読み込んでいます...</p>
        </div>
      </div>
    }>
      <ProfilePreviewContent />
    </Suspense>
  )
}