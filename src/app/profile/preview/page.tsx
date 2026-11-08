'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, User, Loader2, Globe, AlertCircle } from 'lucide-react'
import { type SupportedLanguage } from '@/utils/language'
import { useUnifiedTranslation } from '@/utils/translations'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageSelector } from '@/components/LanguageSelector'
import { LanguageSkill, LANGUAGE_LABELS } from '@/types/profile'
import { resolveAvatarSrc } from '@/utils/imageResolver'
import PhotoGallery from '@/components/profile/PhotoGallery'
import { createClient } from '@/lib/supabase'
import { logger, maskImageValue, sanitizePayload } from '@/utils/logger'
import { formatPersonalityValue } from '@/lib/profile/personalityTags'
import { formatCultureValue } from '@/lib/profile/cultureTags'
import { getCultureWishText, pickByGender } from '@/lib/i18n/cultureWish'
import { isForeignMaleUser } from '@/utils/userHelpers'
import {
  formatOccupation,
  formatBodyType,
  formatMaritalStatus,
  formatLanguageLevel,
  formatTravelCompanion,
  formatVisitSchedule,
  formatPrefecture,
  formatNationality
} from '@/utils/profileFieldFormatters'

// プレビューの見出し（相手のプロフィール profile/[id] と同じ文言。translations.ts は編集画面と共用のため使わない）
type PreviewLabelDict = {
  occupation: string
  height: string
  bodyType: string
  maritalStatus: string
  languages: string
  visitSchedule: string
  travelCompanion: string
  plannedPrefectures: string
  selfIntroduction: string
  personality: string
}

const PREVIEW_LABELS: Record<SupportedLanguage, PreviewLabelDict> = {
  ja: {
    occupation: '職業', height: '身長', bodyType: '体型', maritalStatus: '婚姻状況', languages: '言語',
    visitSchedule: '訪問予定', travelCompanion: '同行者', plannedPrefectures: '行く予定',
    selfIntroduction: '自己紹介', personality: '性格',
  },
  en: {
    occupation: 'Occupation', height: 'Height', bodyType: 'Body Type', maritalStatus: 'Marital Status', languages: 'Languages',
    visitSchedule: 'Visit Schedule', travelCompanion: 'Travel Companion', plannedPrefectures: 'Planned Prefectures',
    selfIntroduction: 'Self Introduction', personality: 'Personality',
  },
  ko: {
    occupation: '직업', height: '키', bodyType: '체형', maritalStatus: '결혼 여부', languages: '언어',
    visitSchedule: '방문 시기', travelCompanion: '동행자', plannedPrefectures: '방문 예정 지역',
    selfIntroduction: '자기소개', personality: '성격',
  },
  'zh-tw': {
    occupation: '職業', height: '身高', bodyType: '體型', maritalStatus: '婚姻狀況', languages: '語言',
    visitSchedule: '訪問時期', travelCompanion: '同行者', plannedPrefectures: '預計前往地區',
    selfIntroduction: '自我介紹', personality: '性格',
  },
}

// 主婦・主夫は、外国人男性なら「主夫」の表記にする（以前のプレビューの出し方を残す）
const HOMEMAKER_VALUES = new Set(['主婦', '主夫', '主婦、主夫'])

// 任意項目が表示すべき値かチェックするヘルパー関数
const shouldDisplayValue = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value !== '' && value !== 'none'
}

// 体型の英語値を多言語対応で変換するヘルパー関数
const getBodyTypeLabel = (value: string, t: any): string => {
  const bodyTypeLabels: Record<string, string> = {
    'slim': t('bodyType.slim'),
    'average': t('bodyType.average'),
    'muscular': t('bodyType.muscular'),
    'plump': t('bodyType.plump')
  }
  return bodyTypeLabels[value] || value
}

// 言語レベルの英語値を多言語対応で変換するヘルパー関数
const getLanguageLevelLabel = (value: string, t: any): string => {
  const levelLabels: Record<string, string> = {
    'none': t('levels.none'),
    'beginner': t('levels.beginner'),
    'elementary': t('levels.elementary'),
    'intermediate': t('levels.intermediate'),
    'upperIntermediate': t('levels.upperIntermediate'),
    'advanced': t('levels.advanced'),
    'native': t('levels.native')
  }
  return levelLabels[value] || value
}

// 同行者の英語値を多言語対応で変換するヘルパー関数
const getTravelCompanionLabel = (value: string, t: any): string => {
  const companionLabels: Record<string, string> = {
    'noEntry': t('companion.noEntry'),
    'alone': t('companion.alone'),
    'friend': t('companion.friend'),
    'family': t('companion.family'),
    'partner': t('companion.partner'),
    'solo': t('companion.alone'),
    'couple': t('companion.partner'),
    'friends': t('companion.friend'),
    'colleagues': t('companion.friend'),
    'group': t('companion.friend'),
    'other': t('companion.noEntry'),
    'no-entry': t('companion.noEntry')
  }
  return companionLabels[value] || value
}

// 職業の表示を多言語対応で変換するヘルパー関数
const getOccupationLabel = (value: string, t: any, isForeignMale: boolean = false): string => {
  const occupationLabels: Record<string, string> = {
    'noEntry': t('occupations.noEntry'),
    '経営者・役員': t('occupations.executiveManager'),
    '会社員': t('occupations.companyEmployee'),
    '公務員': t('occupations.publicServant'),
    '自営業': t('occupations.selfEmployed'),
    'フリーランス': t('occupations.freelance'),
    '学生': t('occupations.student'),
    '主婦': isForeignMale ? t('occupations.houseHusband') : t('occupations.housewife'),
    '主夫': isForeignMale ? t('occupations.houseHusband') : t('occupations.housewife'),
    '主婦、主夫': isForeignMale ? t('occupations.houseHusband') : t('occupations.housewife'),
    // #54: プロフィール編集の選択肢のうち足りなかったもの（編集画面と同じ occupations.* の訳）
    '医師': t('occupations.doctor'),
    '看護師': t('occupations.nurse'),
    '教師・講師': t('occupations.teacher'),
    'エンジニア': t('occupations.engineer'),
    'デザイナー': t('occupations.designer'),
    '営業': t('occupations.sales'),
    'マーケティング': t('occupations.marketing'),
    '研究者': t('occupations.researcher'),
    'コンサルタント': t('occupations.consultant'),
    '金融': t('occupations.finance'),
    '法律関係': t('occupations.legal'),
    'サービス業': t('occupations.serviceIndustry'),
    '小売業': t('occupations.retail'),
    '製造業': t('occupations.manufacturing'),
    'その他': t('occupations.other')
  }
  return occupationLabels[value] || value
}


// 都道府県の表示を多言語対応で変換するヘルパー関数
const getPrefectureLabel = (value: string, t: any): string => {
  const prefectureLabels: Record<string, string> = {
    '北海道': t('prefectures.hokkaido'),
    '青森県': t('prefectures.aomori'),
    '岩手県': t('prefectures.iwate'),
    '宮城県': t('prefectures.miyagi'),
    '秋田県': t('prefectures.akita'),
    '山形県': t('prefectures.yamagata'),
    '福島県': t('prefectures.fukushima'),
    '茨城県': t('prefectures.ibaraki'),
    '栃木県': t('prefectures.tochigi'),
    '群馬県': t('prefectures.gunma'),
    '埼玉県': t('prefectures.saitama'),
    '千葉県': t('prefectures.chiba'),
    '東京都': t('prefectures.tokyo'),
    '神奈川県': t('prefectures.kanagawa'),
    '新潟県': t('prefectures.niigata'),
    '富山県': t('prefectures.toyama'),
    '石川県': t('prefectures.ishikawa'),
    '福井県': t('prefectures.fukui'),
    '山梨県': t('prefectures.yamanashi'),
    '長野県': t('prefectures.nagano'),
    '岐阜県': t('prefectures.gifu'),
    '静岡県': t('prefectures.shizuoka'),
    '愛知県': t('prefectures.aichi'),
    '三重県': t('prefectures.mie'),
    '滋賀県': t('prefectures.shiga'),
    '京都府': t('prefectures.kyoto'),
    '大阪府': t('prefectures.osaka'),
    '兵庫県': t('prefectures.hyogo'),
    '奈良県': t('prefectures.nara'),
    '和歌山県': t('prefectures.wakayama'),
    '鳥取県': t('prefectures.tottori'),
    '島根県': t('prefectures.shimane'),
    '岡山県': t('prefectures.okayama'),
    '広島県': t('prefectures.hiroshima'),
    '山口県': t('prefectures.yamaguchi'),
    '徳島県': t('prefectures.tokushima'),
    '香川県': t('prefectures.kagawa'),
    '愛媛県': t('prefectures.ehime'),
    '高知県': t('prefectures.kochi'),
    '福岡県': t('prefectures.fukuoka'),
    '佐賀県': t('prefectures.saga'),
    '長崎県': t('prefectures.nagasaki'),
    '熊本県': t('prefectures.kumamoto'),
    '大分県': t('prefectures.oita'),
    '宮崎県': t('prefectures.miyazaki'),
    '鹿児島県': t('prefectures.kagoshima'),
    '沖縄県': t('prefectures.okinawa')
  }
  return prefectureLabels[value] || value
}


// 国籍の表示を多言語対応で変換するヘルパー関数
const getNationalityLabel = (value: string, t: any): string => {
  const nationalityLabels: Record<string, string> = {
    'カナダ': t('nationalities.canada'),
    'アメリカ': t('nationalities.usa'),
    'イギリス': t('nationalities.uk'),
    'オーストラリア': t('nationalities.australia'),
    'ドイツ': t('nationalities.germany'),
    'フランス': t('nationalities.france'),
    'イタリア': t('nationalities.italy'),
    'スペイン': t('nationalities.spain'),
    '韓国': t('nationalities.korea'),
    '中国': t('nationalities.china'),
    // 多言語化 5：プロフィールで選べる国籍（NATIONALITY_OPTIONS）のうち足りなかったもの
    '台湾': t('nationalities.taiwan'),
    'タイ': t('nationalities.thailand'),
    'オランダ': t('nationalities.netherlands'),
    'スウェーデン': t('nationalities.sweden'),
    'ノルウェー': t('nationalities.norway'),
    'デンマーク': t('nationalities.denmark'),
    'シンガポール': t('nationalities.singapore'),
    'その他': t('nationalities.other')
  }
  return nationalityLabels[value] || value
}

// 多言語化 5：プレビュー画面に出る文言（4 言語）
type PreviewTextDict = {
  loading: string
  leaveConfirm: string
  errorTitle: string
  errorMessage: string
  close: string
  mismatchTitle: string
  mismatchMessage: string
  reload: string
  backToMyPage: string
  unsavedTitle: string
  unsavedMessage: (buttonLabel: string) => string
  photoAlt: string
  subPhotoAlt: (n: number) => string
  saveFailed: (message: string) => string
}

const PREVIEW_TEXT: Record<SupportedLanguage, PreviewTextDict> = {
  ja: {
    loading: 'プレビューを読み込んでいます...',
    leaveConfirm: '変更内容が保存されていません。このページを離れますか？',
    errorTitle: 'プレビューエラー',
    errorMessage: 'プレビューの読み込みに失敗しました。',
    close: '閉じる',
    mismatchTitle: '別タブまたは認証状態の切替を検出しました',
    mismatchMessage: '正しいプロフィールを表示するために、再読み込みするかマイページへ戻ってください。',
    reload: '再読み込み',
    backToMyPage: 'マイページへ戻る',
    unsavedTitle: '⚠️ まだ変更は反映されていません',
    unsavedMessage: (buttonLabel) => `「${buttonLabel}」を押すと、プロフィールに反映されます。`,
    photoAlt: 'プロフィール',
    subPhotoAlt: (n) => `サブ画像${n}`,
    saveFailed: (message) => `プロフィールの保存に失敗しました: ${message}`,
  },
  en: {
    loading: 'Loading preview...',
    leaveConfirm: "Your changes haven't been saved. Leave this page?",
    errorTitle: 'Preview error',
    errorMessage: "Couldn't load the preview.",
    close: 'Close',
    mismatchTitle: 'Another tab or a change in your sign-in was detected',
    mismatchMessage: 'To show the correct profile, please reload the page or go back to My Page.',
    reload: 'Reload',
    backToMyPage: 'Back to My Page',
    unsavedTitle: "⚠️ Your changes haven't been applied yet",
    unsavedMessage: (buttonLabel) => `Press "${buttonLabel}" to apply them to your profile.`,
    photoAlt: 'Profile photo',
    subPhotoAlt: (n) => `Additional photo ${n}`,
    saveFailed: (message) => `Couldn't save your profile: ${message}`,
  },
  ko: {
    loading: '미리보기를 불러오는 중...',
    leaveConfirm: '변경 내용이 저장되지 않았습니다. 이 페이지를 나가시겠습니까?',
    errorTitle: '미리보기 오류',
    errorMessage: '미리보기를 불러오지 못했습니다.',
    close: '닫기',
    mismatchTitle: '다른 탭 또는 로그인 상태의 변경이 감지되었습니다',
    mismatchMessage: '올바른 프로필을 표시하려면 새로고침하거나 마이페이지로 돌아가 주세요.',
    reload: '새로고침',
    backToMyPage: '마이페이지로 돌아가기',
    unsavedTitle: '⚠️ 아직 변경 사항이 반영되지 않았습니다',
    unsavedMessage: (buttonLabel) => `'${buttonLabel}' 버튼을 누르면 프로필에 반영됩니다.`,
    photoAlt: '프로필 사진',
    subPhotoAlt: (n) => `추가 사진 ${n}`,
    saveFailed: (message) => `프로필을 저장하지 못했습니다: ${message}`,
  },
  'zh-tw': {
    loading: '正在載入預覽...',
    leaveConfirm: '變更內容尚未儲存。確定要離開此頁面嗎？',
    errorTitle: '預覽錯誤',
    errorMessage: '無法載入預覽。',
    close: '關閉',
    mismatchTitle: '偵測到其他分頁或登入狀態已變更',
    mismatchMessage: '為了顯示正確的個人資料，請重新載入或返回我的頁面。',
    reload: '重新載入',
    backToMyPage: '返回我的頁面',
    unsavedTitle: '⚠️ 變更尚未套用',
    unsavedMessage: (buttonLabel) => `按下「${buttonLabel}」後，就會套用到您的個人資料。`,
    photoAlt: '個人照片',
    subPhotoAlt: (n) => `其他照片 ${n}`,
    saveFailed: (message) => `無法儲存個人資料：${message}`,
  },
}

// Suspense の fallback 用（ページの辞書が届かない場所）
function PreviewLoadingText() {
  const { currentLanguage } = useLanguage()
  return <>{(PREVIEW_TEXT[currentLanguage] ?? PREVIEW_TEXT.ja).loading}</>
}

function ProfilePreviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // エラーハンドリング用の状態
  const [hasError, setHasError] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  // 🔒 修繕A: オーナー不一致検出
  const [ownerMismatchDetected, setOwnerMismatchDetected] = useState(false)

  // 🚨 未保存警告用フラグ（Option B実装）
  const isConfirmedRef = useRef(false)
  const isSavingRef = useRef(false) // 🔒 二重保存防止ミューテックス
  
  // 統一言語設定
  const { t, language: currentLanguage } = useUnifiedTranslation()
  const pl = PREVIEW_LABELS[currentLanguage as SupportedLanguage] ?? PREVIEW_LABELS.ja
  const { currentLanguage: contextLanguage } = useLanguage()
  
  // 🌍 Preview専用翻訳辞書
  const previewTranslations: Record<string, Record<string, string>> = {
    ja: {
      headerTitle: 'プレビュー｜相手からの見え方'
    },
    en: {
      headerTitle: 'Preview | How others see you'
    },
    ko: {
      headerTitle: '미리보기｜상대가 보는 내 모습'
    },
    'zh-tw': {
      headerTitle: '預覽｜對方看到的樣子'
    }
  }
  
  // 多言語化 5：画面の文言
  const pt = PREVIEW_TEXT[contextLanguage] ?? PREVIEW_TEXT.ja
  // 離脱確認は登録時（マウント時）の handler から読むため、最新の言語の文を ref に入れておく
  const leaveConfirmTextRef = useRef(pt.leaveConfirm)
  leaveConfirmTextRef.current = pt.leaveConfirm

  // Preview専用翻訳関数
  const getPreviewTranslation = (key: string) => {
    const translations = previewTranslations[contextLanguage] || previewTranslations['ja']
    return translations[key] || previewTranslations['ja'][key] || key
  }
  
  // Supabase client for image resolution
  const supabase = createClient()

  // 🔒 セキュリティ強化: ユーザー固有のsessionStorageからデータを取得
  useEffect(() => {
    const loadPreviewData = async () => {
    try {
      // 🔒 SECURITY: userIdはauthUser.idのみ使用（URLパラメータは信頼しない）
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const authUserId = authUser?.id
      const previewDataKey = authUserId ? `previewData_${authUserId}` : null

      let savedData: string | null = null
      if (previewDataKey) {
        savedData = sessionStorage.getItem(previewDataKey)
      }

      // 🔒 レガシーキーへのフォールバックは廃止（混線の温床）

      if (savedData) {
        const parsedData = JSON.parse(savedData)
        // 🔒 __ownerUserId 検証: 別ユーザーのデータなら破棄
        if (parsedData.__ownerUserId && authUserId && parsedData.__ownerUserId !== authUserId) {
          console.error('🚨 PREVIEW DATA OWNER MISMATCH - 破棄', {
            ownerUserId: parsedData.__ownerUserId?.slice(0, 8),
            authUserId: authUserId?.slice(0, 8)
          })
          sessionStorage.removeItem(previewDataKey!)
          setOwnerMismatchDetected(true)
          // fallback to URL params below
        } else {
          setPreviewData(parsedData)
        }
      } else {
        // フォールバック：URLパラメータから取得
        const fallbackData = {
          nickname: searchParams?.get('nickname') || 'ニックネーム未設定',
          age: searchParams?.get('age') || '18',
          birth_date: searchParams?.get('birth_date') || null,
          gender: searchParams?.get('gender') || '',
          nationality: searchParams?.get('nationality') || '',
          prefecture: searchParams?.get('prefecture') || '',
          occupation: searchParams?.get('occupation') || '',
          height: searchParams?.get('height') || '',
          body_type: searchParams?.get('body_type') || '',
          marital_status: searchParams?.get('marital_status') || '',
          english_level: searchParams?.get('english_level') || '',
          japanese_level: searchParams?.get('japanese_level') || '',
          self_introduction: searchParams?.get('self_introduction') || '',
          hobbies: [],
          personality: [],
          culture_wish: searchParams?.get('culture_wish') || '',
          image: searchParams?.get('image') || '',
          profile_image: searchParams?.get('profile_image') || null,
          // 外国人男性特有のフィールド
          planned_prefectures: [],
          planned_stations: [],
          visit_schedule: searchParams?.get('visit_schedule') || '',
          travel_companion: searchParams?.get('travel_companion') || ''
        }
        setPreviewData(fallbackData)
      }
    } catch (error) {
      console.error('❌ Error loading preview data:', error)
      setHasError(true)
    }
    }
    loadPreviewData()
  }, [searchParams])

  // 🚨 beforeunload（タブ閉じ・リロード対策）
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isConfirmedRef.current) return // 保存済みなら警告しない
      e.preventDefault()
      e.returnValue = leaveConfirmTextRef.current
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // 🚨 popstate（ブラウザバック対策）
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isConfirmedRef.current) return // 保存済みなら警告しない
      const ok = window.confirm(leaveConfirmTextRef.current)
      if (!ok) {
        history.pushState(null, '', location.href)
      }
    }
    // 初期履歴エントリー追加
    history.pushState(null, '', location.href)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // 「←」・エラー画面の「閉じる」：編集画面へ戻る（同じタブで開いているため window.close は使わない）
  // 確定前なら離れる確認を出し、OK なら beforeunload の警告を止めてから移る。入力中の内容は残らない（編集画面は DB から読み込む）
  const handleBackToEdit = () => {
    if (!isConfirmedRef.current && !window.confirm(leaveConfirmTextRef.current)) return
    isConfirmedRef.current = true
    const params = new URLSearchParams({ fromMyPage: 'true' })
    const type = searchParams?.get('type')
    const lang = searchParams?.get('lang')
    if (type) params.set('type', type)
    if (lang) params.set('lang', lang)
    router.push(`/profile/edit?${params.toString()}`)
  }

  // データが読み込まれていない場合
  if (!previewData) {
    return (
      <div className="min-h-screen bg-[#f5ebe0] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#8b1a2e]" />
          <p className="text-gray-600">{pt.loading}</p>
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
    occupation = '',
    height = '',
    body_type: bodyType = '',
    marital_status: maritalStatus = '',
    english_level: englishLevel = '',
    japanese_level: japaneseLevel = '',
    self_introduction: selfIntroduction = '',
    hobbies = [],
    // 外国人男性特有のフィールド
    planned_prefectures = [],
    planned_stations = [],
    visit_schedule = '',
    travel_companion = '',
    personality = [],
    culture_wish: cultureWish = '',
    image: profileImage = '',
    photo_urls = [] // 🖼️ NEW: 複数画像対応
  } = previewData

  // エラー画面
  if (hasError) {
    return (
      <div className="min-h-screen bg-[#f5ebe0] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{pt.errorTitle}</h1>
          <p className="text-gray-600 mb-6">{pt.errorMessage}</p>
          <Button onClick={handleBackToEdit}>{pt.close}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5ebe0]">
      {/* 🔒 修繕A: オーナー不一致オーバーレイ */}
      {ownerMismatchDetected && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 mx-4 max-w-md text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">{pt.mismatchTitle}</h2>
            <p className="text-gray-600 mb-6">{pt.mismatchMessage}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-[#8b1a2e] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6e1525] transition-colors"
              >
                {pt.reload}
              </button>
              <button
                onClick={() => window.location.href = '/mypage'}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                {pt.backToMyPage}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ヘッダー */}
      <div className="bg-orange-500 text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={handleBackToEdit}
              className="mr-4 text-white hover:bg-orange-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
            <h1 className="text-xl font-bold">{getPreviewTranslation('headerTitle')}</h1>
          </div>
          
          {/* 言語切り替えボタン */}
          <div className="flex items-center gap-2">
            <LanguageSelector variant="dark" size="md" showIcon={true} />
          </div>
        </div>
      </div>

      {/* プレビューコンテンツ */}
      <div className="py-12 px-4">
        <div className="max-w-md mx-auto">
          {/* 🚨 未保存警告バナー（Option B実装 - 最優先） */}
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {pt.unsavedTitle}<br />
            {pt.unsavedMessage(t('profile.updateProfile'))}
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* プロフィール画像 - 複数画像対応（#55：相手のプロフィールと同じ部品で、横にめくる・押すと全画面） */}
            {(() => {
              // 🖼️ STEP 1: photo_urls優先表示（複数画像対応）
              let galleryPhotos: string[] = []
              if (Array.isArray(photo_urls) && photo_urls.length > 0) {
                galleryPhotos = photo_urls
                logger.debug('🔄 プレビュー画像: photo_urls[0]使用:', maskImageValue(photo_urls[0]))
              }
              // 🔧 STEP 2: 後方互換でprofileImage使用
              else if (profileImage) {
                galleryPhotos = [profileImage]
                logger.debug('🔄 プレビュー画像: profileImage使用（後方互換）:', maskImageValue(profileImage))
              }

              return <PhotoGallery photos={galleryPhotos} name={nickname} />
            })()}

            {/* プロフィール情報 */}
            <div className="p-6 space-y-4">
              {/* 基本情報 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{nickname}</h2>
                <div className="space-y-1">
                  <p className="text-lg text-gray-600">{t('profile.age')}: {age}</p>
                </div>
              </div>

              {/* 基本プロフィール */}
              <div className="space-y-3 text-sm">
                {(() => {
                  // 外国人男性判定
                  const isForeignMale = gender === 'male' && nationality && nationality !== '日本'
                  
                  return (
                    <>
                      {/* 1. 国籍（外国人男性の場合のみ）/ 居住地（日本人女性の場合） */}
                      {isForeignMale && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-28">{t('profile.nationality')}:</span>
                          <span className="text-gray-600">{formatNationality(nationality, currentLanguage) || nationality}</span>
                        </div>
                      )}
                      {gender === 'female' && prefecture && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-28">{t('profile.residence')}:</span>
                          <span className="text-gray-600">{formatPrefecture(prefecture, currentLanguage) || prefecture}</span>
                        </div>
                      )}
                      
                      {/* 2. 職業 */}
                      {shouldDisplayValue(occupation) && (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 w-28">{pl.occupation}:</span>
                          <span className="text-gray-600">{formatOccupation(isForeignMale && HOMEMAKER_VALUES.has(occupation) ? '主夫' : occupation, currentLanguage)}</span>
                        </div>
                      )}
                    </>
                  )
                })()}
                
                {/* 3. 身長 */}
                {shouldDisplayValue(height) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-28">{pl.height}:</span>
                    <span className="text-gray-600">{height}cm</span>
                  </div>
                )}
                
                {/* 4. 体型 */}
                {shouldDisplayValue(bodyType) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-28">{pl.bodyType}:</span>
                    <span className="text-gray-600">{formatBodyType(bodyType, currentLanguage)}</span>
                  </div>
                )}
                
                {/* 5. 婚姻状況 */}
                {shouldDisplayValue(maritalStatus) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-28">{pl.maritalStatus}:</span>
                    <span className="text-gray-600">{formatMaritalStatus(maritalStatus, currentLanguage)}</span>
                  </div>
                )}
                
                {/* 6. 使用言語情報（language_skills優先、レガシーフィールドは後方互換） */}
                {(() => {
                  // language_skillsを取得（URLパラメータまたはsessionStorageから）
                  let effectiveLanguageSkills: LanguageSkill[] = []
                  
                  try {
                    const languageSkillsParam = searchParams?.get('language_skills')
                    if (languageSkillsParam) {
                      effectiveLanguageSkills = JSON.parse(decodeURIComponent(languageSkillsParam))
                    }
                  } catch (e) {
                    logger.debug('Language skills parse error from URL:', e)
                  }
                  
                  // 🚀 CRITICAL FIX: 正しいpreviewDataキーからsessionStorageを取得
                  if (!effectiveLanguageSkills.length && typeof window !== 'undefined') {
                    try {
                      // URLパラメータからユーザーIDを取得
                      const urlParams = new URLSearchParams(window.location.search)
                      const userId = urlParams.get('userId')
                      const previewDataKey = userId ? `previewData_${userId}` : 'previewData'
                      
                      const sessionData = window.sessionStorage.getItem(previewDataKey)
                      if (sessionData) {
                        const parsedData = JSON.parse(sessionData)
                        if (parsedData.language_skills) {
                          effectiveLanguageSkills = parsedData.language_skills
                        }
                      }
                    } catch (e) {
                      logger.debug('Language skills session parse error:', e)
                    }
                  }
                  
                  // レガシーフィールドからの後方互換（language_skillsが空の場合のみ）
                  if (!effectiveLanguageSkills.length) {
                    if (shouldDisplayValue(japaneseLevel)) {
                      effectiveLanguageSkills.push({
                        language: 'ja',
                        level: japaneseLevel
                      })
                    }
                    if (shouldDisplayValue(englishLevel)) {
                      effectiveLanguageSkills.push({
                        language: 'en',
                        level: englishLevel
                      })
                    }
                  }
                  
                  // 統一された言語表示ラベルを使用
                  // 多言語化 5：言語名は表示言語で（profile.languageOptions.*）。それ以外のコードは従来の表示
                  const getLanguageDisplayLabel = (lang: string): string => {
                    const optionKey: Record<string, string> = { ja: 'ja', en: 'en', ko: 'ko', 'zh-TW': 'zh_tw' }
                    if (optionKey[lang]) return t(`profile.languageOptions.${optionKey[lang]}`)
                    return LANGUAGE_LABELS[lang as keyof typeof LANGUAGE_LABELS] || lang
                  }
                  
                  return effectiveLanguageSkills.length > 0 ? (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">{pl.languages}</h3>
                      <div className="space-y-2">
                        {effectiveLanguageSkills.map((skill: LanguageSkill, index: number) => (
                          skill.language && skill.level && skill.language !== 'none' && skill.level !== 'none' ? (
                            <div key={index} className="flex items-center">
                              <span className="font-medium text-gray-700 w-28">{getLanguageDisplayLabel(skill.language)}:</span>
                              <span className="text-gray-600">{formatLanguageLevel(skill.level, currentLanguage) || skill.level}</span>
                            </div>
                          ) : null
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}
                
                {/* 7. 訪問予定（外国人男性の場合） */}
                {gender === 'male' && shouldDisplayValue(visit_schedule) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-28">{pl.visitSchedule}:</span>
                    <span className="text-gray-600">
                      {formatVisitSchedule(visit_schedule, currentLanguage) || visit_schedule}
                    </span>
                  </div>
                )}
                
                {/* 8. 同行者（外国人男性の場合） */}
                {gender === 'male' && shouldDisplayValue(travel_companion) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-28">{pl.travelCompanion}:</span>
                    <span className="text-gray-600">{formatTravelCompanion(travel_companion, currentLanguage)}</span>
                  </div>
                )}
                
                {/* 訪問予定の駅（外国人男性の場合）- 順序は変更しない */}
                {gender === 'male' && planned_stations && planned_stations.length > 0 && (
                  <div className="flex items-start">
                    <span className="font-medium text-gray-700 w-28">{t('profile.plannedStationsLabel')}:</span>
                    <span className="text-gray-600">{planned_stations.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* 10. 自己紹介 */}
              {shouldDisplayValue(selfIntroduction) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{pl.selfIntroduction}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {selfIntroduction}
                  </p>
                </div>
              )}

              {/* 11. 日本文化のまとまり（① 自由記入 → ② タグ）。見出しは男女で出し分け */}
              {(() => {
                const cw = getCultureWishText(currentLanguage)
                const isForeignMaleView = isForeignMaleUser({ gender, nationality })
                return (
                  <>
                    {shouldDisplayValue(cultureWish) && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">{pickByGender(cw.displayLabel, isForeignMaleView)}</h3>
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {cultureWish}
                        </p>
                      </div>
                    )}

                    {hobbies.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">{pickByGender(cw.tagHeading, isForeignMaleView)}</h3>
                        <div className="flex flex-wrap gap-2">
                          {hobbies.map((hobby: string, index: number) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-[#fdf6ef] text-[#8b1a2e] rounded-full text-xs"
                            >
                              {formatCultureValue(hobby, currentLanguage)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* 行く予定の都道府県（外国人男性の場合）。日本文化のタグと性格の間に、見出し付きのまとまりで出す */}
              {gender === 'male' && planned_prefectures && planned_prefectures.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{pl.plannedPrefectures}</h3>
                  <p className="text-gray-600 text-sm">
                    {planned_prefectures.map((pref: string) => formatPrefecture(pref, currentLanguage) || pref).join(', ')}
                  </p>
                </div>
              )}

              {/* 12. 性格 */}
              {personality.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{pl.personality}</h3>
                  <div className="flex flex-wrap gap-2">
                    {personality.map((trait: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                      >
                        {formatPersonalityValue(trait, currentLanguage)}
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
                    // 🔒 二重保存防止
                    if (isSavingRef.current) return
                    isSavingRef.current = true

                    // 🚀 CRITICAL: 指示書対応 - シンプルで確実な保存処理
                    logger.debug('[PREVIEW] confirm start')

                    try {
                      // 🚀 Step 1: ユーザー認証確認
                      const { createClient } = await import('@/lib/supabase')
                      const supabase = createClient()
                      const { data: { user }, error: userError } = await supabase.auth.getUser()
                      
                      if (!user) {
                        throw new Error('ユーザー情報の取得に失敗しました')
                      }

                      // 🔒 修繕D: SSOT_ID_CHECK を Supabase セッション vs previewOwner に一本化
                      // sc_real_login_user はグローバルキーでタブ間で上書きされるため判定材料にしない
                      {
                        const currentAuthUserId = user.id
                        const previewOwnerUserId = previewData?.__ownerUserId || null
                        const realLoginUser = localStorage.getItem('sc_real_login_user') // ログ用のみ
                        const ownerMatch = !previewOwnerUserId || previewOwnerUserId === currentAuthUserId
                          logger.debug('[PREVIEW] SSOT check:', ownerMatch ? 'OK' : 'MISMATCH')
                        if (!ownerMatch) {
                          const reason = 'owner_user_mismatch'
                          console.error('🚫 PRE_SAVE_BLOCKED', { reason, route: '/profile/preview/confirm', currentAuthUserId: currentAuthUserId?.slice(0, 8), previewOwnerUserId: previewOwnerUserId?.slice(0, 8) })
                          isSavingRef.current = false
                          setOwnerMismatchDetected(true)
                          return
                        }
                      }

                      // 🚀 Step 2: 保存ペイロード準備（指示書対応）

                      // 🚨 SSOT: language_skills を必ずDBに保存（指示書対応）
                      let sessionLanguageSkills = []
                      try {
                        // 🔒 SECURITY: userIdはauthUser.idのみ使用（URLパラメータは信頼しない）
                        const previewDataKey = `previewData_${user.id}`
                        const savedData = sessionStorage.getItem(previewDataKey)
                        if (savedData) {
                          const sessionData = JSON.parse(savedData)
                          sessionLanguageSkills = Array.isArray(sessionData.language_skills) ? sessionData.language_skills : []
                        }
                      } catch (error) {
                        logger.debug('⚠️ sessionStorage language_skills取得失敗:', error)
                      }
                      
                      const skills = previewData?.language_skills ?? sessionLanguageSkills ?? []
                      const normalizedLanguageSkills = Array.isArray(skills) ? skills : []

                      // 🚨 TASK C: photo_urls取得（0枚保存対応版）
                      // 🔥 修正: photo_urlsが空配列の場合はフォールバックしない（0枚保存を尊重）
                      let finalPhotoUrls: string[] = []
                      if (Array.isArray(photo_urls) && photo_urls.length > 0) {
                        finalPhotoUrls = photo_urls
                      } else if (Array.isArray(photo_urls) && photo_urls.length === 0) {
                        finalPhotoUrls = []
                      } else if (previewData.profile_image || profileImage) {
                        finalPhotoUrls = [previewData.profile_image || profileImage]
                      }
                      logger.debug('[PREVIEW] photos:', finalPhotoUrls.length)

                      // 🔒 A案: ensure-profile で行の存在を保証してから UPDATE のみ
                      // 🔒 Bearer方式: Cookie同期に依存せず access_token を直接渡す
                      try {
                        const { data: { session: currentSession } } = await supabase.auth.getSession()
                        const accessToken = currentSession?.access_token
                        if (!accessToken) {
                          console.error('🚫 PRE_SAVE_BLOCKED', {
                            reason: 'no_access_token',
                            route: '/profile/preview/confirm',
                            authUid: user?.id?.slice(0, 8) || null,
                          })
                          isSavingRef.current = false
                          setOwnerMismatchDetected(true)
                          return
                        }
                        const ensureRes = await fetch('/api/ensure-profile', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`
                          },
                          body: JSON.stringify({})
                        })
                        if (ensureRes.status === 401) {
                          // 🚨 401 = セッションが無効。保存を続行すると別ユーザーに書き込む危険
                          console.error('🚨 ensure-profile 401: セッション無効 - 保存中止→ログインへ退避')
                          isSavingRef.current = false
                          router.replace('/login?reason=ensure_401')
                          return
                        } else if (!ensureRes.ok) {
                          logger.error('[PREVIEW] ensure-profile failed:', ensureRes.status)
                        }
                        // 成功 or 既存行がある前提で続行
                      } catch (ensureErr) {
                        console.error('🚨 ensure-profile error:', ensureErr)
                      }

                      const savePayload: any = {
                        // 🔒 id/user_id/email/created_at はペイロードに含めない（UPDATE専用）
                        // 基本情報
                        name: nickname || null,
                        bio: selfIntroduction || null,
                        age: age ? Number(age) : null,
                        birth_date: previewData.birth_date || previewData.birthday || previewData.dob || null,
                        gender: gender || null,
                        nationality: nationality || null,
                        residence: prefecture || null,  // 🚨 FIX: DBカラム名はresidence
                        // 🚀 CRITICAL: personality_tags必須（指示書対応）
                        personality_tags: personality && personality.length > 0
                          ? personality.filter((p: string) => p && p.trim()).map((p: string) => p.trim())
                          : null,
                        // 🚀 CRITICAL: interests必須（指示書対応）
                        interests: hobbies && hobbies.length > 0 ? hobbies : null,
                        // 日本文化の自由記入（前後の空白を除いて保存。DB は 200 文字までの CHECK あり）
                        culture_wish: typeof cultureWish === 'string' && cultureWish.trim() ? cultureWish.trim() : null,
                        // 🚨 SSOT: language_skills必須DB保存（指示書対応）
                        language_skills: normalizedLanguageSkills,
                        // 🚨 TASK C FIX: photo_urls必須（0枚保存時は空配列[]を確実にDBに送信）
                        // 🔥 修正: nullではなく空配列[]を送信することで、saveProfileToDbで正しく処理される
                        photo_urls: finalPhotoUrls, // 0枚=[], N枚=[url1,...urlN]
                        // 🚀 CRITICAL: avatar_url必須（指示書対応）
                        avatar_url: finalPhotoUrls.length > 0 ? finalPhotoUrls[0] : null,
                        // その他項目
                        occupation: occupation || null,
                        height: height || null,
                        body_type: bodyType || null,
                        marital_status: maritalStatus || null,
                        // 外国人男性専用
                        visit_schedule: visit_schedule || null,
                        travel_companion: travel_companion || null,
                        planned_prefectures: planned_prefectures || null,
                        planned_stations: planned_stations || null,
                        updated_at: new Date().toISOString()
                      }

                      // 🔧 CRITICAL: allowlistによるDBスキーマ厳格制限（指示書対応）
                      const ALLOWED_PROFILE_KEYS = new Set([
                        'name',
                        'bio',
                        'age',
                        'birth_date',
                        'gender',
                        'nationality',
                        'residence',          // 居住地（都道府県など）
                        'personality_tags',
                        'interests',
                        'culture_wish',       // 日本文化の自由記入（入れ忘れると保存されない）
                        'avatar_url',
                        'occupation',
                        'height',
                        'body_type',
                        'marital_status',
                        'visit_schedule',
                        'travel_companion',
                        'planned_prefectures', // 訪問予定（これが本命）
                        'japanese_level',
                        'english_level',
                        'membership_type',
                        'is_verified',
                        // 🚨 SSOT追加: language_skillsをDB永続化（指示書対応）
                        'language_skills',
                        // 🚨 CRITICAL FIX: photo_urlsをwhitelistに追加（根本問題解決）
                        'photo_urls'
                        // 'updated_at' ← 絶対に入れない（DB側で自動更新に任せる）
                      ])

                      // ② 念のためブラックリストで最終除去（今後の地雷対策）
                      // 🚨 CRITICAL: profile_images等DBに存在しないカラムを完全ブロック
                      const BLOCKED_KEYS = new Set(['id', 'user_id', 'email', 'created_at', 'updated_at', 'prefecture', 'planned_stations', 'profile_images', 'personality', 'images', 'profile_image'])

                      const sanitizedPayload = Object.fromEntries(
                        Object.entries(savePayload).filter(([k]) => ALLOWED_PROFILE_KEYS.has(k) && !BLOCKED_KEYS.has(k))
                      )



                      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                      // 🔒 PRE-SAVE ASSERT GATE（修繕D: Supabaseセッション vs previewOwner に一本化）
                      // sc_real_login_user はグローバルキーでタブ間汚染するため判定材料から除外
                      //
                      // 退避reason定数:
                      //   no_auth_user          … authUser が null
                      //   owner_user_mismatch   … __ownerUserId ≠ authUser.id
                      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                      {
                        const ROUTE = '/profile/preview/confirm'
                        const authUid = user?.id || null
                        const ownerUserId = previewData?.__ownerUserId || null

                        // Assert 1: authUser が存在する
                        if (!authUid) {
                          logger.error('[PREVIEW] blocked: no_auth_user')
                          isSavingRef.current = false
                          setOwnerMismatchDetected(true)
                          return
                        }
                        // Assert 2: __ownerUserId と authUser.id が一致（唯一の比較軸）
                        if (ownerUserId && ownerUserId !== authUid) {
                          logger.error('[PREVIEW] blocked: owner_mismatch')
                          isSavingRef.current = false
                          setOwnerMismatchDetected(true)
                          return
                        }
                      }

                      // 🚨 Step 4: 統一パイプライン経由でBase64遮断保証upsert（指示書準拠）
                      logger.info('📍 profiles write entry: profile/preview confirm')

                      
                      // 🔒 UPSERT一本化: id=authUser.id で確実にINSERT or UPDATE
                      const { upsertProfile } = await import('@/utils/saveProfileToDb')
                      const upsertPayload = {
                        ...sanitizedPayload,
                        id: user.id,
                        user_id: user.id,
                        email: user.email || null,
                        profile_initialized: true,
                      }
                      const saveResult = await upsertProfile(
                        supabase,
                        user.id,
                        upsertPayload,
                        'profile/preview/page.tsx/confirm',
                        ['id']
                      )

                      if (!saveResult.success) {
                        logger.error('[PREVIEW] save failed:', saveResult.error)
                        throw new Error(saveResult.error || 'Profile save failed')
                      }

                      logger.debug('[PREVIEW] save OK:', user.id?.slice(0, 8))

                      // 🚨 CRITICAL FIX: 5-2 DB結果による状態同期（再発防止）
                      if (saveResult.data && saveResult.data[0]) {
                        const savedProfile = saveResult.data[0]

                        // sessionStorageの保存データをDB結果で上書き
                        const previewDataKey = `previewData_${user?.id || 'anonymous'}`
                        try {
                          const currentPreviewData = sessionStorage.getItem(previewDataKey)
                          if (currentPreviewData) {
                            const parsedData = JSON.parse(currentPreviewData)
                            if (Array.isArray(savedProfile.photo_urls)) {
                              parsedData.photo_urls = savedProfile.photo_urls
                            }
                            parsedData.avatar_url = savedProfile.avatar_url
                            parsedData.image = savedProfile.avatar_url || savedProfile.photo_urls?.[0] || parsedData.image

                            sessionStorage.setItem(previewDataKey, JSON.stringify(parsedData))
                          }
                        } catch (sessionError) {
                          logger.warn('[PREVIEW] session update failed')
                        }
                      }

                      // 🚨 保存完了フラグ設定（未保存警告を無効化）
                      isConfirmedRef.current = true

                      // 🛡️ 同一タブ遷移に統一（window.opener廃止）
                      router.push('/mypage')

                    } catch (error) {
                      logger.error('[PREVIEW] save error:', (error as Error).message)
                      isSavingRef.current = false
                      alert(pt.saveFailed((error as Error).message))
                      return
                    }
                  }}
                >
                  {t('profile.updateProfile')}
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
      <div className="min-h-screen bg-[#f5ebe0] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#8b1a2e]" />
          <p className="text-gray-600"><PreviewLoadingText /></p>
        </div>
      </div>
    }>
      <ProfilePreviewContent />
    </Suspense>
  )
}