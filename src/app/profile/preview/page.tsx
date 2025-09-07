'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Loader2 } from 'lucide-react'

function ProfilePreviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // エラーハンドリング用の状態
  const [hasError, setHasError] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)

  // sessionStorageからデータを取得
  useEffect(() => {
    try {
      const savedData = sessionStorage.getItem('previewData')
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        setPreviewData(parsedData)
        console.log('📋 Preview data loaded from sessionStorage:', parsedData)
      } else {
        // フォールバック：URLパラメータから取得
        const fallbackData = {
          nickname: searchParams.get('nickname') || 'ニックネーム未設定',
          age: searchParams.get('age') || '18',
          gender: searchParams.get('gender') || '',
          nationality: searchParams.get('nationality') || '',
          prefecture: searchParams.get('prefecture') || '',
          city: searchParams.get('city') || '',
          occupation: searchParams.get('occupation') || '',
          height: searchParams.get('height') || '',
          body_type: searchParams.get('body_type') || '',
          marital_status: searchParams.get('marital_status') || '',
          self_introduction: searchParams.get('self_introduction') || '',
          hobbies: [],
          personality: [],
          custom_culture: searchParams.get('custom_culture') || '',
          image: searchParams.get('image') || ''
        }
        setPreviewData(fallbackData)
        console.log('📋 Using fallback data from URL params')
      }
    } catch (error) {
      console.error('❌ Error loading preview data:', error)
      setHasError(true)
    }
  }, [searchParams])

  // データが読み込まれていない場合
  if (!previewData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sakura-600" />
          <p className="text-gray-600">プレビューを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  // データから値を取得
  const {
    nickname = 'ニックネーム未設定',
    age = '18',
    gender = '',
    nationality = '',
    prefecture = '',
    city = '',
    occupation = '',
    height = '',
    body_type: bodyType = '',
    marital_status: maritalStatus = '',
    self_introduction: selfIntroduction = '',
    hobbies = [],
    personality = [],
    custom_culture: customCulture = '',
    image: profileImage = ''
  } = previewData

  // エラー画面
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">プレビューエラー</h1>
          <p className="text-gray-600 mb-6">プレビューの読み込みに失敗しました。</p>
          <Button onClick={() => window.close()}>閉じる</Button>
        </div>
      </div>
    )
  }

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
                    
                    // sessionStorageからデータを取得してプロフィール更新用データを準備
                    try {
                      console.log('🚨 DIRECT SAVE: Using sessionStorage data')
                      
                      // オプションデータをJSONで準備
                      const optionalData = {
                        city: city || null,
                        occupation: occupation || null,
                        height: height ? Number(height) : null,
                        body_type: bodyType || null,
                        marital_status: maritalStatus || null,
                      }
                      
                      // personalityとhobbiesを拡張interests配列として準備
                      const extendedInterests = [...hobbies]
                      
                      // personalityを追加
                      if (personality && personality.length > 0) {
                        personality.forEach((p: string) => {
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
                      
                      // 🛠️ 修正: 全フィールドのデータを準備（オプションデータ以外も含む）
                      console.log('🔍 DEBUG: previewData contents:', previewData)
                      console.log('🔍 DEBUG: Individual field values:', {
                        nickname, selfIntroduction, age, gender, nationality, prefecture, city,
                        occupation, height, bodyType, maritalStatus, hobbies, personality, customCulture
                      })
                      
                      const completeProfileData = {
                        // 基本情報
                        name: nickname || null,
                        bio: selfIntroduction || null,
                        age: age ? Number(age) : null,
                        birth_date: previewData.birth_date || null,
                        gender: gender || null,
                        nationality: nationality || null,
                        prefecture: prefecture || null,
                        residence: prefecture || null, // compatibilityのため
                        
                        // オプション情報（city JSONに格納）
                        optionalData: optionalData,
                        
                        // interests配列
                        interests: extendedInterests
                      }
                      
                      console.log('🔍 DEBUG: birth_date sources:', {
                        'previewData.birth_date': previewData.birth_date,
                        'previewData.birthday': previewData.birthday,  
                        'previewData.dob': previewData.dob
                      })
                      
                      console.log('🚨 COMPLETE SAVE: All profile data prepared', completeProfileData)
                      
                      // localStorageに完全なプロフィールデータを保存
                      localStorage.setItem('previewCompleteData', JSON.stringify(completeProfileData))
                      localStorage.setItem('previewOptionalData', JSON.stringify(optionalData))
                      localStorage.setItem('previewExtendedInterests', JSON.stringify(extendedInterests))
                      
                      // sessionStorageをクリア
                      sessionStorage.removeItem('previewData')
                      
                    } catch (error) {
                      console.error('❌ Error preparing preview data:', error)
                    }
                    
                    // localStorageにプロフィール更新フラグを設定
                    localStorage.setItem('updateProfile', 'true')
                    localStorage.setItem('updateProfileTimestamp', Date.now().toString())
                    
                    console.log('💾 localStorage set with optional data')
                    
                    // 親ウィンドウ（プロフィール編集画面）にメッセージを送信
                    console.log('🔍 Checking window.opener:', !!window.opener)
                    
                    // 直接マイページに遷移し、バックグラウンドでプロフィール更新
                    console.log('🎯 Redirecting directly to mypage')
                    
                    if (window.opener) {
                      // プレビューウィンドウを閉じて、親ウィンドウをマイページにリダイレクト
                      console.log('📡 Redirecting opener to mypage and closing preview')
                      window.opener.postMessage({ action: 'updateProfile' }, '*')
                      
                      // 即座にマイページにリダイレクト
                      window.opener.location.href = '/mypage'
                      window.close()
                    } else {
                      // 直接マイページに遷移（プロフィール編集画面を経由しない）
                      console.log('🔄 Direct redirect to mypage')
                      window.location.href = '/mypage'
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