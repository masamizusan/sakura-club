'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Loader2 } from 'lucide-react'

// 任意項目が表示すべき値かチェックするヘルパー関数
const shouldDisplayValue = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value !== '' && value !== 'none'
}

function ProfilePreviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // エラーハンドリング用の状態
  const [hasError, setHasError] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)

  // 🔒 セキュリティ強化: ユーザー固有のsessionStorageからデータを取得
  useEffect(() => {
    try {
      // まず新形式（ユーザー固有）のキーを試す
      const urlParams = new URLSearchParams(window.location.search)
      const userId = urlParams.get('userId') // URLパラメータからユーザーIDを取得
      const previewDataKey = userId ? `previewData_${userId}` : 'previewData'
      
      let savedData = sessionStorage.getItem(previewDataKey)
      
      // 新形式がない場合は旧形式も試す（後方互換性）
      if (!savedData && previewDataKey !== 'previewData') {
        savedData = sessionStorage.getItem('previewData')
        console.log('🔄 旧形式のプレビューデータを使用（後方互換性）')
      }
      
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        setPreviewData(parsedData)
        console.log('📋 Preview data loaded from sessionStorage:', previewDataKey, parsedData)
      } else {
        // フォールバック：URLパラメータから取得
        const fallbackData = {
          nickname: searchParams.get('nickname') || 'ニックネーム未設定',
          age: searchParams.get('age') || '18',
          birth_date: searchParams.get('birth_date') || null,
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
          image: searchParams.get('image') || '',
          profile_image: searchParams.get('profile_image') || null,
          // 外国人男性特有のフィールド
          planned_prefectures: [],
          visit_schedule: searchParams.get('visit_schedule') || '',
          travel_companion: searchParams.get('travel_companion') || ''
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
    // 外国人男性特有のフィールド
    planned_prefectures = [],
    visit_schedule = '',
    travel_companion = '',
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
                {/* 外国人男性の場合のみ国籍を表示 */}
                {gender === 'male' && nationality && nationality !== '日本' && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">国籍:</span>
                    <span className="text-gray-600">{nationality}</span>
                  </div>
                )}
                
                {/* 外国人男性の場合：行く予定の都道府県 */}
                {gender === 'male' && planned_prefectures && planned_prefectures.length > 0 && (
                  <div className="flex items-start">
                    <span className="font-medium text-gray-700 w-20">行く予定:</span>
                    <span className="text-gray-600">{planned_prefectures.join(', ')}</span>
                  </div>
                )}
                
                {/* 外国人男性の場合：訪問予定 */}
                {gender === 'male' && shouldDisplayValue(visit_schedule) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">訪問予定:</span>
                    <span className="text-gray-600">
                      {visit_schedule === 'within_month' ? '1ヶ月以内' :
                       visit_schedule === 'within_3months' ? '3ヶ月以内' :
                       visit_schedule === 'within_6months' ? '6ヶ月以内' :
                       visit_schedule === 'within_year' ? '1年以内' :
                       visit_schedule === 'undecided' ? '未定' : visit_schedule}
                    </span>
                  </div>
                )}
                
                {/* 外国人男性の場合：同行者 */}
                {gender === 'male' && shouldDisplayValue(travel_companion) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">同行者:</span>
                    <span className="text-gray-600">
                      {travel_companion === 'alone' ? '一人' :
                       travel_companion === 'friends' ? '友人' :
                       travel_companion === 'family' ? '家族' :
                       travel_companion === 'colleagues' ? '同僚・仕事仲間' :
                       travel_companion === 'group' ? 'グループ・団体' :
                       travel_companion === 'other' ? 'その他' : travel_companion}
                    </span>
                  </div>
                )}
                
                {/* 日本人女性の場合：居住地 */}
                {gender === 'female' && prefecture && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">居住地:</span>
                    <span className="text-gray-600">{prefecture}{city ? `・${city}` : ''}</span>
                  </div>
                )}
                {shouldDisplayValue(occupation) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">職業:</span>
                    <span className="text-gray-600">{occupation}</span>
                  </div>
                )}
                {shouldDisplayValue(height) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">身長:</span>
                    <span className="text-gray-600">{height}cm</span>
                  </div>
                )}
                {shouldDisplayValue(bodyType) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">体型:</span>
                    <span className="text-gray-600">{bodyType}</span>
                  </div>
                )}
                {shouldDisplayValue(maritalStatus) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">結婚:</span>
                    <span className="text-gray-600">{maritalStatus === 'single' ? '未婚' : '既婚'}</span>
                  </div>
                )}
              </div>

              {/* 自己紹介 */}
              {shouldDisplayValue(selfIntroduction) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">自己紹介</h3>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {selfIntroduction}
                  </p>
                </div>
              )}

              {/* 共有したい日本文化 */}
              {(hobbies.length > 0 || shouldDisplayValue(customCulture)) && (
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
                    {shouldDisplayValue(customCulture) && (
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

                    // 🔍 バリデーション: 必須項目のチェック
                    const validationErrors = []

                    if (!nickname || nickname === 'ニックネーム未設定') {
                      validationErrors.push('ニックネームを入力してください')
                    }

                    if (!age || age < 18) {
                      validationErrors.push('年齢は18歳以上で入力してください')
                    }

                    // birth_dateのチェック（previewDataから取得）
                    const birth_date = previewData.birth_date || previewData.birthday || previewData.dob
                    if (!birth_date) {
                      validationErrors.push('生年月日を入力してください')
                    }

                    if (!selfIntroduction || selfIntroduction.length < 100) {
                      validationErrors.push('自己紹介は100文字以上で入力してください')
                    }

                    if (!hobbies || hobbies.length === 0 || (hobbies.length === 1 && hobbies[0] === 'その他')) {
                      validationErrors.push('共有したい日本文化を1つ以上選択してください')
                    }

                    // 性別による必須項目チェック
                    if (gender === 'male') {
                      // 外国人男性の場合
                      if (!nationality) {
                        validationErrors.push('国籍を選択してください')
                      }
                      if (!planned_prefectures || planned_prefectures.length === 0) {
                        validationErrors.push('行く予定の都道府県を少なくとも1つ選択してください')
                      }
                    } else {
                      // 日本人女性の場合
                      if (!prefecture) {
                        validationErrors.push('都道府県を入力してください')
                      }
                    }

                    // バリデーションエラーがある場合は保存を中止
                    if (validationErrors.length > 0) {
                      alert('以下の項目を確認してください:\n\n' + validationErrors.join('\n'))
                      console.log('❌ Validation errors:', validationErrors)
                      return
                    }

                    console.log('✅ All validation checks passed')

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
                        
                        // birth_dateの確実な取得
                        const birth_date = previewData.birth_date || 
                                          previewData.birthday || 
                                          previewData.dob || 
                                          searchParams.get('birth_date') || 
                                          searchParams.get('birthday') || 
                                          searchParams.get('dob') || 
                                          null
                        
                        const completeProfileData = {
                          // 基本情報
                          name: nickname || null,
                          bio: selfIntroduction || null,
                          age: age ? Number(age) : null,
                          birth_date: birth_date,
                          gender: gender || null,
                          nationality: nationality || null,
                          prefecture: prefecture || null,
                          residence: prefecture || null, // compatibilityのため

                          // 写真データ（既存の写真を含める）
                          profile_image: previewData.profile_image || profileImage || searchParams.get('profile_image') || null,

                          // オプション情報（city JSONに格納）
                          optionalData: optionalData,

                          // interests配列
                          interests: extendedInterests,

                          // 外国人男性専用フィールドを追加（外国人男性のみ）
                          ...(gender === 'male' && nationality && nationality !== '日本' ? {
                            visit_schedule: previewData.visit_schedule || visit_schedule || null,
                            travel_companion: previewData.travel_companion || travel_companion || null,
                            planned_prefectures: previewData.planned_prefectures || planned_prefectures || null
                          } : {})
                        }
                        
                        console.log('🔍 DEBUG: birth_date sources:', {
                          'previewData.birth_date': previewData.birth_date,
                          'previewData.birthday': previewData.birthday,  
                          'previewData.dob': previewData.dob,
                          'searchParams birth_date': searchParams.get('birth_date'),
                          'searchParams birthday': searchParams.get('birthday'),
                          'searchParams dob': searchParams.get('dob'),
                          'final birth_date': birth_date
                        })
                        
                        console.log('🚨 COMPLETE SAVE: All profile data prepared', completeProfileData)
                        
                        // localStorageに完全なプロフィールデータを保存
                        localStorage.setItem('previewCompleteData', JSON.stringify(completeProfileData))
                        localStorage.setItem('previewOptionalData', JSON.stringify(optionalData))
                        localStorage.setItem('previewExtendedInterests', JSON.stringify(extendedInterests))
                        
                        // sessionStorageをクリア
                        sessionStorage.removeItem('previewData')
                        
                        // 🛠️ 修正: localStorageへの保存を確実に完了してから遷移
                        // localStorageにプロフィール更新フラグを設定
                        localStorage.setItem('updateProfile', 'true')
                        localStorage.setItem('updateProfileTimestamp', Date.now().toString())
                        
                        // 🔒 localStorage保存の確認
                        const savedUpdateFlag = localStorage.getItem('updateProfile')
                        const savedCompleteData = localStorage.getItem('previewCompleteData')
                        const savedOptionalData = localStorage.getItem('previewOptionalData')
                        const savedInterestsData = localStorage.getItem('previewExtendedInterests')
                        
                        console.log('💾 localStorage保存完了確認:', {
                          updateProfile: savedUpdateFlag,
                          hasCompleteData: !!savedCompleteData,
                          hasOptionalData: !!savedOptionalData,
                          hasInterestsData: !!savedInterestsData
                        })
                        
                        // localStorage保存が完了するまで少し待機
                        await new Promise(resolve => setTimeout(resolve, 100))
                        
                        // 親ウィンドウ（プロフィール編集画面）にメッセージを送信
                        console.log('🔍 Checking window.opener:', !!window.opener)
                        
                        // 直接マイページに遷移し、バックグラウンドでプロフィール更新
                        console.log('🎯 Redirecting directly to mypage after localStorage confirmation')
                        
                        if (window.opener) {
                          // プレビューウィンドウを閉じて、親ウィンドウをマイページにリダイレクト
                          console.log('📡 Redirecting opener to mypage and closing preview')
                          window.opener.postMessage({ action: 'updateProfile' }, '*')
                          
                          // localStorage保存完了後にマイページにリダイレクト
                          window.opener.location.href = '/mypage'
                          window.close()
                        } else {
                          // 直接マイページに遷移（プロフィール編集画面を経由しない）
                          console.log('🔄 Direct redirect to mypage after localStorage confirmation')
                          window.location.href = '/mypage'
                        }
                        
                    } catch (error) {
                      console.error('❌ Error preparing preview data:', error)
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