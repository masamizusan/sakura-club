'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import AuthGuard from '@/components/auth/AuthGuard'
import {
  Heart,
  ArrowLeft,
  User,
  Loader2,
  MapPin,
  Globe,
  Languages
} from 'lucide-react'
import Link from 'next/link'
import { resolveAvatarSrc } from '@/utils/imageResolver'
import { createClient } from '@/lib/supabase'
import { LanguageSkill, LANGUAGE_LABELS } from '@/types/profile'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  formatOccupation,
  formatBodyType,
  formatMaritalStatus,
  formatLanguageLevel,
  formatTravelCompanion,
  formatVisitSchedule
} from '@/utils/profileFieldFormatters'

// 翻訳UI用の多言語テキスト
const translationUITexts: Record<string, Record<string, string>> = {
  ja: {
    translateButton: '翻訳して読む',
    translating: '翻訳中...',
    showOriginal: '原文を表示',
    aiTranslationNote: 'AI翻訳（参考）',
    translationFailed: '翻訳できませんでした',
    selfIntroduction: '自己紹介'
  },
  en: {
    translateButton: 'Translate',
    translating: 'Translating...',
    showOriginal: 'Show original',
    aiTranslationNote: 'AI Translation (reference)',
    translationFailed: 'Translation failed',
    selfIntroduction: 'Self Introduction'
  },
  ko: {
    translateButton: '번역하기',
    translating: '번역 중...',
    showOriginal: '원문 보기',
    aiTranslationNote: 'AI 번역 (참고용)',
    translationFailed: '번역할 수 없습니다',
    selfIntroduction: '자기소개'
  },
  'zh-tw': {
    translateButton: '翻譯',
    translating: '翻譯中...',
    showOriginal: '顯示原文',
    aiTranslationNote: 'AI翻譯（僅供參考）',
    translationFailed: '翻譯失敗',
    selfIntroduction: '自我介紹'
  }
}

// 任意項目が表示すべき値かチェックするヘルパー関数
const shouldDisplayValue = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value !== '' && value !== 'none'
}

function ProfileDetailContent() {
  const params = useParams()
  const router = useRouter()
  const profileId = params?.id as string
  const [profile, setProfile] = useState<any>(null)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [likesRemaining, setLikesRemaining] = useState<number>(10)
  const [isLiking, setIsLiking] = useState(false)
  const [hasLiked, setHasLiked] = useState(false)
  const supabase = createClient()

  // 言語コンテキスト
  const { currentLanguage } = useLanguage()

  // 翻訳用state
  const [translatedBio, setTranslatedBio] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [translationError, setTranslationError] = useState<string | null>(null)

  // 翻訳UIテキスト取得
  const getTranslationText = (key: string): string => {
    const texts = translationUITexts[currentLanguage] || translationUITexts['ja']
    return texts[key] || translationUITexts['ja'][key] || key
  }

  // API言語コード変換（zh-tw -> zh）
  const getApiLanguageCode = (): string => {
    if (currentLanguage === 'zh-tw') return 'zh'
    return currentLanguage
  }

  // 翻訳実行
  const handleTranslate = async (bioText: string) => {
    if (isTranslating || !bioText) return

    setIsTranslating(true)
    setTranslationError(null)

    try {
      const response = await fetch('/api/translate/profile-bio', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profileId,
          targetLang: getApiLanguageCode(),
          text: bioText
        })
      })

      const data = await response.json()

      if (response.ok && data.translatedText) {
        setTranslatedBio(data.translatedText)
        setShowTranslation(true)
      } else {
        // エラー詳細を設定
        const errorMsg = data.error || getTranslationText('translationFailed')
        setTranslationError(errorMsg)
        console.error('Translation API error:', data)
      }
    } catch (err) {
      console.error('Translation error:', err)
      setTranslationError(getTranslationText('translationFailed'))
    } finally {
      setIsTranslating(false)
    }
  }

  // プロフィール取得
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/profile/${profileId}`, {
          cache: 'no-store',
          credentials: 'include'
        })

        const data = await response.json()

        if (!response.ok) {
          if (response.status === 404) {
            setError('プロフィールが見つかりません')
          } else if (response.status === 401) {
            setError('ログインが必要です')
          } else {
            setError(data.error || 'エラーが発生しました')
          }
          return
        }

        setProfile(data.profile)
        setViewerId(data.viewerId)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('プロフィールの読み込みに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    if (profileId) {
      fetchProfile()
    }
  }, [profileId])

  // 残りいいね数を取得
  useEffect(() => {
    const fetchLikesRemaining = async () => {
      try {
        const response = await fetch('/api/likes/remaining', {
          cache: 'no-store',
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setLikesRemaining(data.remaining)
        }
      } catch (error) {
        console.error('Failed to fetch likes remaining:', error)
      }
    }
    fetchLikesRemaining()
  }, [])

  // いいね送信
  const handleLike = async () => {
    if (isLiking || hasLiked || likesRemaining <= 0) return

    setIsLiking(true)
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          likedUserId: profileId,
          action: 'like'
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setHasLiked(true)
        if (typeof result.remaining === 'number') {
          setLikesRemaining(result.remaining)
        } else {
          setLikesRemaining(prev => Math.max(0, prev - 1))
        }

        if (result.matched) {
          alert('マッチしました！メッセージを送ってみましょう。')
        }
      } else if (response.status === 429) {
        setLikesRemaining(0)
        alert('本日のいいね上限（10回）に達しました。明日またお試しください。')
      } else {
        alert(result.error || 'いいねの送信に失敗しました。')
      }
    } catch (error) {
      console.error('Error liking user:', error)
      alert('エラーが発生しました。')
    } finally {
      setIsLiking(false)
    }
  }

  // ローディング
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sakura-600" />
          <p className="text-gray-600">プロフィールを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  // エラー
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'プロフィールが見つかりません'}
          </h2>
          <Link href="/matches">
            <Button variant="sakura">さがすに戻る</Button>
          </Link>
        </div>
      </div>
    )
  }

  // データ展開
  const {
    name = '名前未設定',
    age,
    gender,
    nationality,
    residence,
    city,
    bio,
    interests = [],
    personality_tags = [],
    language_skills = [],
    occupation,
    height,
    body_type,
    marital_status,
    visit_schedule,
    travel_companion,
    planned_prefectures = [],
    avatar_url,
    photo_urls = []
  } = profile

  // 日本人判定
  const isJapanese = !nationality ||
    nationality === '' ||
    nationality.toLowerCase() === 'jp' ||
    nationality.toLowerCase() === 'japan' ||
    nationality === '日本' ||
    nationality.toLowerCase() === 'japanese'

  const isForeignMale = gender === 'male' && !isJapanese

  // 画像表示
  const displayImages = Array.isArray(photo_urls) && photo_urls.length > 0
    ? photo_urls
    : avatar_url ? [avatar_url] : []
  const mainImage = displayImages[0] || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            戻る
          </button>
          <div className="flex items-center gap-2">
            <Heart className={`w-5 h-5 ${likesRemaining > 0 ? 'text-sakura-500' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-600">
              残り <span className="font-bold">{likesRemaining}</span>/10
            </span>
          </div>
        </div>
      </div>

      {/* プロフィールコンテンツ */}
      <div className="py-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* メイン画像 */}
            <div className="relative aspect-square bg-gray-100">
              {mainImage ? (
                <img
                  src={resolveAvatarSrc(mainImage, supabase) || ''}
                  alt={`${name}のプロフィール`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sakura-100 to-sakura-200">
                  <User className="w-24 h-24 text-sakura-300" />
                </div>
              )}

              {/* サブ画像 */}
              {displayImages.length > 1 && (
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {displayImages.slice(1, 3).map((url, index) => {
                    const src = resolveAvatarSrc(url, supabase)
                    return src ? (
                      <img
                        key={index}
                        src={src}
                        alt={`サブ画像${index + 1}`}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-white shadow-sm"
                      />
                    ) : null
                  })}
                  {displayImages.length > 3 && (
                    <div className="w-12 h-12 rounded-lg bg-black/50 flex items-center justify-center border-2 border-white">
                      <span className="text-white text-xs">+{displayImages.length - 3}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* プロフィール情報 */}
            <div className="p-6 space-y-4">
              {/* 基本情報 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
                <div className="flex items-center gap-2 mt-1 text-gray-600">
                  <span className="text-lg">{age}歳</span>
                  {isForeignMale && nationality && (
                    <span className="flex items-center text-sm bg-gray-100 px-2 py-0.5 rounded-full">
                      <Globe className="w-3 h-3 mr-1" />
                      {nationality}
                    </span>
                  )}
                  {!isForeignMale && residence && (
                    <span className="flex items-center text-sm bg-gray-100 px-2 py-0.5 rounded-full">
                      <MapPin className="w-3 h-3 mr-1" />
                      {residence}
                    </span>
                  )}
                </div>
              </div>

              {/* 詳細プロフィール */}
              <div className="space-y-3 text-sm">
                {/* 職業 */}
                {shouldDisplayValue(occupation) && (
                  <div className="flex">
                    <span className="font-medium text-gray-700 w-24">職業:</span>
                    <span className="text-gray-600">{formatOccupation(occupation, currentLanguage)}</span>
                  </div>
                )}

                {/* 身長 */}
                {shouldDisplayValue(height) && (
                  <div className="flex">
                    <span className="font-medium text-gray-700 w-24">身長:</span>
                    <span className="text-gray-600">{height}cm</span>
                  </div>
                )}

                {/* 体型 */}
                {shouldDisplayValue(body_type) && (
                  <div className="flex">
                    <span className="font-medium text-gray-700 w-24">体型:</span>
                    <span className="text-gray-600">{formatBodyType(body_type, currentLanguage)}</span>
                  </div>
                )}

                {/* 婚姻状況 */}
                {shouldDisplayValue(marital_status) && (
                  <div className="flex">
                    <span className="font-medium text-gray-700 w-24">婚姻状況:</span>
                    <span className="text-gray-600">{formatMaritalStatus(marital_status, currentLanguage)}</span>
                  </div>
                )}

                {/* 言語スキル */}
                {Array.isArray(language_skills) && language_skills.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">言語:</span>
                    <div className="mt-1 space-y-1">
                      {language_skills.map((skill: LanguageSkill, index: number) => (
                        skill.language && skill.level && skill.language !== 'none' && skill.level !== 'none' ? (
                          <div key={index} className="flex ml-4">
                            <span className="text-gray-600">
                              {LANGUAGE_LABELS[skill.language as keyof typeof LANGUAGE_LABELS] || skill.language}: {formatLanguageLevel(skill.level, currentLanguage)}
                            </span>
                          </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                )}

                {/* 外国人男性専用項目 */}
                {isForeignMale && (
                  <>
                    {shouldDisplayValue(visit_schedule) && (
                      <div className="flex">
                        <span className="font-medium text-gray-700 w-24">訪問予定:</span>
                        <span className="text-gray-600">{formatVisitSchedule(visit_schedule, currentLanguage)}</span>
                      </div>
                    )}

                    {shouldDisplayValue(travel_companion) && (
                      <div className="flex">
                        <span className="font-medium text-gray-700 w-24">同行者:</span>
                        <span className="text-gray-600">{formatTravelCompanion(travel_companion, currentLanguage)}</span>
                      </div>
                    )}

                    {Array.isArray(planned_prefectures) && planned_prefectures.length > 0 && (
                      <div className="flex">
                        <span className="font-medium text-gray-700 w-24">行く予定:</span>
                        <span className="text-gray-600">{planned_prefectures.join(', ')}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 自己紹介 */}
              {shouldDisplayValue(bio) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{getTranslationText('selfIntroduction')}</h3>

                  {/* 翻訳表示 or 原文表示 */}
                  {showTranslation && translatedBio ? (
                    <div>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{translatedBio}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-400 italic">
                          {getTranslationText('aiTranslationNote')}
                        </span>
                        <button
                          onClick={() => setShowTranslation(false)}
                          className="text-xs text-sakura-600 hover:text-sakura-700 underline"
                        >
                          {getTranslationText('showOriginal')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{bio}</p>

                      {/* 翻訳ボタン（原文と異なる言語の場合のみ表示） */}
                      <div className="mt-2">
                        {translationError ? (
                          <div className="text-xs text-red-500">
                            <span>{getTranslationText('translationFailed')}</span>
                            {process.env.NODE_ENV === 'development' && (
                              <span className="block text-gray-400 mt-1">{translationError}</span>
                            )}
                            <button
                              onClick={() => { setTranslationError(null); handleTranslate(bio); }}
                              className="ml-2 text-sakura-600 underline"
                            >
                              Retry
                            </button>
                          </div>
                        ) : translatedBio ? (
                          <button
                            onClick={() => setShowTranslation(true)}
                            className="text-xs text-sakura-600 hover:text-sakura-700 flex items-center gap-1"
                          >
                            <Languages className="w-3 h-3" />
                            {getTranslationText('translateButton')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTranslate(bio)}
                            disabled={isTranslating}
                            className="text-xs text-sakura-600 hover:text-sakura-700 flex items-center gap-1 disabled:opacity-50"
                          >
                            {isTranslating ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {getTranslationText('translating')}
                              </>
                            ) : (
                              <>
                                <Languages className="w-3 h-3" />
                                {getTranslationText('translateButton')}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 性格 */}
              {Array.isArray(personality_tags) && personality_tags.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">性格</h3>
                  <div className="flex flex-wrap gap-2">
                    {personality_tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 興味・関心 */}
              {Array.isArray(interests) && interests.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">学びたい日本文化</h3>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-sakura-100 text-sakura-800 rounded-full text-xs"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* いいねボタン */}
              <div className="pt-4">
                <Button
                  variant="sakura"
                  className="w-full"
                  size="lg"
                  onClick={handleLike}
                  disabled={isLiking || hasLiked || likesRemaining <= 0 || viewerId === profileId}
                >
                  {isLiking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      送信中...
                    </>
                  ) : hasLiked ? (
                    <>
                      <Heart className="w-4 h-4 mr-2 fill-current" />
                      いいね済み
                    </>
                  ) : likesRemaining <= 0 ? (
                    '本日の上限に達しました'
                  ) : viewerId === profileId ? (
                    '自分のプロフィールです'
                  ) : (
                    <>
                      <Heart className="w-4 h-4 mr-2" />
                      いいね
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* さがすに戻るリンク */}
          <div className="mt-6 text-center">
            <Link href="/matches" className="text-sakura-600 hover:text-sakura-700 text-sm">
              ← さがすに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfileDetailPage() {
  return (
    <AuthGuard>
      <ProfileDetailContent />
    </AuthGuard>
  )
}
