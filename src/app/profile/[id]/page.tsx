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
import { LanguageSkill } from '@/types/profile'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  formatOccupation,
  formatBodyType,
  formatMaritalStatus,
  formatLanguageLevel,
  formatTravelCompanion,
  formatVisitSchedule,
  formatPrefecture,
  formatLanguageName,
  formatNationality
} from '@/utils/profileFieldFormatters'
import {
  formatPersonalityTag,
  formatCultureTag
} from '@/utils/profileTagFormatters'

// プロフィール詳細画面の多言語テキスト（ラベル + UI）
const profileDetailTexts: Record<string, Record<string, string>> = {
  ja: {
    // UI
    back: '戻る',
    remaining: '残り',
    translateButton: '翻訳して読む',
    translating: '翻訳中...',
    showOriginal: '原文を表示',
    aiTranslationNote: 'AI翻訳（参考）',
    translationFailed: '翻訳に失敗しました。時間をおいて再試行してください。',
    retry: '再試行',
    backToSearch: 'さがすに戻る',
    loading: 'プロフィールを読み込んでいます...',
    notFound: 'プロフィールが見つかりません',
    loginRequired: 'ログインが必要です',
    errorOccurred: 'エラーが発生しました',
    // ボタン
    sending: '送信中...',
    liked: 'いいね済み',
    dailyLimitReached: '本日の上限に達しました',
    ownProfile: '自分のプロフィールです',
    like: 'いいね',
    // ラベル
    occupation: '職業',
    height: '身長',
    bodyType: '体型',
    maritalStatus: '婚姻状況',
    languages: '言語',
    visitSchedule: '訪問予定',
    travelCompanion: '同行者',
    plannedPrefectures: '行く予定',
    selfIntroduction: '自己紹介',
    personality: '性格',
    japaneseCulture: '学びたい日本文化',
    yearsOld: '歳'
  },
  en: {
    // UI
    back: 'Back',
    remaining: 'Remaining',
    translateButton: 'Translate',
    translating: 'Translating...',
    showOriginal: 'Show original',
    aiTranslationNote: 'AI Translation (reference)',
    translationFailed: 'Translation failed. Please try again later.',
    retry: 'Retry',
    backToSearch: 'Back to Search',
    loading: 'Loading profile...',
    notFound: 'Profile not found',
    loginRequired: 'Login required',
    errorOccurred: 'An error occurred',
    // ボタン
    sending: 'Sending...',
    liked: 'Liked',
    dailyLimitReached: 'Daily limit reached',
    ownProfile: 'This is your profile',
    like: 'Like',
    // ラベル
    occupation: 'Occupation',
    height: 'Height',
    bodyType: 'Body Type',
    maritalStatus: 'Marital Status',
    languages: 'Languages',
    visitSchedule: 'Visit Schedule',
    travelCompanion: 'Travel Companion',
    plannedPrefectures: 'Planned Prefectures',
    selfIntroduction: 'Self Introduction',
    personality: 'Personality',
    japaneseCulture: 'Japanese Culture Interests',
    yearsOld: ' y/o'
  },
  ko: {
    // UI
    back: '뒤로',
    remaining: '남은',
    translateButton: '번역하기',
    translating: '번역 중...',
    showOriginal: '원문 보기',
    aiTranslationNote: 'AI 번역 (참고용)',
    translationFailed: '번역에 실패했습니다. 잠시 후 다시 시도해주세요.',
    retry: '재시도',
    backToSearch: '검색으로 돌아가기',
    loading: '프로필을 불러오는 중...',
    notFound: '프로필을 찾을 수 없습니다',
    loginRequired: '로그인이 필요합니다',
    errorOccurred: '오류가 발생했습니다',
    // ボタン
    sending: '전송 중...',
    liked: '좋아요 완료',
    dailyLimitReached: '오늘의 한도에 도달했습니다',
    ownProfile: '본인의 프로필입니다',
    like: '좋아요',
    // ラベル
    occupation: '직업',
    height: '키',
    bodyType: '체형',
    maritalStatus: '결혼 여부',
    languages: '언어',
    visitSchedule: '방문 예정',
    travelCompanion: '동행자',
    plannedPrefectures: '방문 예정 지역',
    selfIntroduction: '자기소개',
    personality: '성격',
    japaneseCulture: '배우고 싶은 일본 문화',
    yearsOld: '세'
  },
  'zh-tw': {
    // UI
    back: '返回',
    remaining: '剩餘',
    translateButton: '翻譯',
    translating: '翻譯中...',
    showOriginal: '顯示原文',
    aiTranslationNote: 'AI翻譯（僅供參考）',
    translationFailed: '翻譯失敗，請稍後再試。',
    retry: '重試',
    backToSearch: '返回搜尋',
    loading: '正在載入個人資料...',
    notFound: '找不到個人資料',
    loginRequired: '需要登入',
    errorOccurred: '發生錯誤',
    // ボタン
    sending: '發送中...',
    liked: '已按讚',
    dailyLimitReached: '已達到今日上限',
    ownProfile: '這是您的個人資料',
    like: '按讚',
    // ラベル
    occupation: '職業',
    height: '身高',
    bodyType: '體型',
    maritalStatus: '婚姻狀況',
    languages: '語言',
    visitSchedule: '訪問計畫',
    travelCompanion: '同行者',
    plannedPrefectures: '預計前往地區',
    selfIntroduction: '自我介紹',
    personality: '性格',
    japaneseCulture: '想學習的日本文化',
    yearsOld: '歲'
  }
}

// alert用多言語テキスト
const matchedTexts: Record<string, string> = {
  ja: 'マッチしました！メッセージを送ってみましょう。',
  en: "It's a match! Send them a message.",
  ko: '매칭되었습니다! 메시지를 보내보세요.',
  'zh-tw': '配對成功！來發送訊息吧。',
}
const dailyLimitTexts: Record<string, string> = {
  ja: '本日のいいね上限（10回）に達しました。明日またお試しください。',
  en: "You've reached your daily like limit (10). Please try again tomorrow.",
  ko: '오늘의 좋아요 한도(10회)에 도달했습니다. 내일 다시 시도해주세요.',
  'zh-tw': '已達到今日按讚上限（10次）。請明天再試。',
}
const likeFailedTexts: Record<string, string> = {
  ja: 'いいねの送信に失敗しました。',
  en: 'Failed to send like.',
  ko: '좋아요 전송에 실패했습니다.',
  'zh-tw': '按讚發送失敗。',
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

  // 翻訳テキスト取得
  const t = (key: string): string => {
    const texts = profileDetailTexts[currentLanguage] || profileDetailTexts['ja']
    return texts[key] || profileDetailTexts['ja'][key] || key
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
        const errorMsg = data.error || t('translationFailed')
        setTranslationError(errorMsg)
        console.error('Translation API error:', data)
      }
    } catch (err) {
      console.error('Translation error:', err)
      setTranslationError(t('translationFailed'))
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
            setError(t('notFound'))
          } else if (response.status === 401) {
            setError(t('loginRequired'))
          } else {
            setError(data.error || t('errorOccurred'))
          }
          return
        }

        setProfile(data.profile)
        setViewerId(data.viewerId)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(t('errorOccurred'))
      } finally {
        setIsLoading(false)
      }
    }

    if (profileId) {
      fetchProfile()
    }
  }, [profileId])

  // 足跡を記録（自分以外のプロフィール閲覧時）
  useEffect(() => {
    const recordFootprint = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id === profileId) return

      await supabase
        .from('footprints')
        .insert({
          profile_owner_id: profileId,
          visitor_id: user.id,
        })
    }

    if (profileId) {
      recordFootprint()
    }
  }, [profileId])

  // 足跡・いいねを個別既読（プロフィール詳細を開いた時点でバッジを消す）
  useEffect(() => {
    const markAsRead = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id === profileId) return

      // 足跡の既読（自分が見られた記録 = profile_owner_id が自分、visitor_id がこのプロフィールの人）
      await supabase
        .from('footprints')
        .update({ is_read: true })
        .eq('profile_owner_id', user.id)
        .eq('visitor_id', profileId)
        .eq('is_read', false)

      // いいねの既読（自分がいいねされた記録 = liked_user_id が自分、liker_id がこのプロフィールの人）
      await supabase
        .from('likes')
        .update({ is_seen: true })
        .eq('liked_user_id', user.id)
        .eq('liker_id', profileId)
        .eq('is_seen', false)

      window.dispatchEvent(new Event('footprints-read'))
      window.dispatchEvent(new Event('likes-seen'))
    }

    if (profileId) {
      markAsRead()
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
          alert(matchedTexts[currentLanguage] || matchedTexts.ja)
        }
      } else if (response.status === 429) {
        setLikesRemaining(0)
        alert(dailyLimitTexts[currentLanguage] || dailyLimitTexts.ja)
      } else {
        alert(result.error || likeFailedTexts[currentLanguage] || likeFailedTexts.ja)
      }
    } catch (error) {
      console.error('Error liking user:', error)
      alert(t('errorOccurred'))
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
          <p className="text-gray-600">{t('loading')}</p>
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
            {error || t('notFound')}
          </h2>
          <Link href="/matches">
            <Button variant="sakura">{t('backToSearch')}</Button>
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
            {t('back')}
          </button>
          <div className="flex items-center gap-2">
            <Heart className={`w-5 h-5 ${likesRemaining > 0 ? 'text-sakura-500' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-600">
              {t('remaining')} <span className="font-bold">{likesRemaining}</span>/10
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
                  <span className="text-lg">{age}{t('yearsOld')}</span>
                  {isForeignMale && nationality && (
                    <span className="flex items-center text-sm bg-gray-100 px-2 py-0.5 rounded-full">
                      <Globe className="w-3 h-3 mr-1" />
                      {formatNationality(nationality, currentLanguage) || nationality}
                    </span>
                  )}
                  {!isForeignMale && residence && (
                    <span className="flex items-center text-sm bg-gray-100 px-2 py-0.5 rounded-full">
                      <MapPin className="w-3 h-3 mr-1" />
                      {formatPrefecture(residence, currentLanguage) || residence}
                    </span>
                  )}
                </div>
              </div>

              {/* 詳細プロフィール */}
              <div className="space-y-3 text-sm">
                {/* 職業 */}
                {shouldDisplayValue(occupation) && (
                  <div className="flex">
                    <span className="font-medium text-gray-700 w-28">{t('occupation')}:</span>
                    <span className="text-gray-600">{formatOccupation(occupation, currentLanguage)}</span>
                  </div>
                )}

                {/* 身長 */}
                {shouldDisplayValue(height) && (
                  <div className="flex">
                    <span className="font-medium text-gray-700 w-28">{t('height')}:</span>
                    <span className="text-gray-600">{height}cm</span>
                  </div>
                )}

                {/* 体型 */}
                {shouldDisplayValue(body_type) && (
                  <div className="flex">
                    <span className="font-medium text-gray-700 w-28">{t('bodyType')}:</span>
                    <span className="text-gray-600">{formatBodyType(body_type, currentLanguage)}</span>
                  </div>
                )}

                {/* 婚姻状況 */}
                {shouldDisplayValue(marital_status) && (
                  <div className="flex">
                    <span className="font-medium text-gray-700 w-28">{t('maritalStatus')}:</span>
                    <span className="text-gray-600">{formatMaritalStatus(marital_status, currentLanguage)}</span>
                  </div>
                )}

                {/* 言語スキル */}
                {Array.isArray(language_skills) && language_skills.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">{t('languages')}:</span>
                    <div className="mt-1 space-y-1">
                      {language_skills.map((skill: LanguageSkill, index: number) => (
                        skill.language && skill.level && skill.language !== 'none' && skill.level !== 'none' ? (
                          <div key={index} className="flex ml-4">
                            <span className="text-gray-600">
                              {formatLanguageName(skill.language, currentLanguage)}: {formatLanguageLevel(skill.level, currentLanguage)}
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
                        <span className="font-medium text-gray-700 w-28">{t('visitSchedule')}:</span>
                        <span className="text-gray-600">{formatVisitSchedule(visit_schedule, currentLanguage)}</span>
                      </div>
                    )}

                    {shouldDisplayValue(travel_companion) && (
                      <div className="flex">
                        <span className="font-medium text-gray-700 w-28">{t('travelCompanion')}:</span>
                        <span className="text-gray-600">{formatTravelCompanion(travel_companion, currentLanguage)}</span>
                      </div>
                    )}

                    {Array.isArray(planned_prefectures) && planned_prefectures.length > 0 && (
                      <div className="flex">
                        <span className="font-medium text-gray-700 w-28">{t('plannedPrefectures')}:</span>
                        <span className="text-gray-600">
                          {planned_prefectures.map(p => formatPrefecture(p, currentLanguage) || p).join(', ')}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 自己紹介 */}
              {shouldDisplayValue(bio) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{t('selfIntroduction')}</h3>

                  {/* 翻訳表示 or 原文表示 */}
                  {showTranslation && translatedBio ? (
                    <div>
                      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{translatedBio}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-400 italic">
                          {t('aiTranslationNote')}
                        </span>
                        <button
                          onClick={() => setShowTranslation(false)}
                          className="text-xs text-sakura-600 hover:text-sakura-700 underline"
                        >
                          {t('showOriginal')}
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
                            <span>{t('translationFailed')}</span>
                            {(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugAuth') === '1') && (
                              <span className="block text-gray-400 mt-1">{translationError}</span>
                            )}
                            <button
                              onClick={() => { setTranslationError(null); handleTranslate(bio); }}
                              className="ml-2 text-sakura-600 underline"
                            >
                              {t('retry')}
                            </button>
                          </div>
                        ) : translatedBio ? (
                          <button
                            onClick={() => setShowTranslation(true)}
                            className="text-xs text-sakura-600 hover:text-sakura-700 flex items-center gap-1"
                          >
                            <Languages className="w-3 h-3" />
                            {t('translateButton')}
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
                                {t('translating')}
                              </>
                            ) : (
                              <>
                                <Languages className="w-3 h-3" />
                                {t('translateButton')}
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
                  <h3 className="font-medium text-gray-900 mb-2">{t('personality')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {personality_tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                      >
                        {formatPersonalityTag(tag, currentLanguage)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 興味・関心 */}
              {Array.isArray(interests) && interests.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{t('japaneseCulture')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {interests.map((interest: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-sakura-100 text-sakura-800 rounded-full text-xs"
                      >
                        {formatCultureTag(interest, currentLanguage)}
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
                      {t('sending')}
                    </>
                  ) : hasLiked ? (
                    <>
                      <Heart className="w-4 h-4 mr-2 fill-current" />
                      {t('liked')}
                    </>
                  ) : likesRemaining <= 0 ? (
                    t('dailyLimitReached')
                  ) : viewerId === profileId ? (
                    t('ownProfile')
                  ) : (
                    <>
                      <Heart className="w-4 h-4 mr-2" />
                      {t('like')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* さがすに戻るリンク */}
          <div className="mt-6 text-center">
            <Link href="/matches" className="text-sakura-600 hover:text-sakura-700 text-sm">
              ← {t('backToSearch')}
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
