'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, User, Loader2, Globe } from 'lucide-react'
import { type SupportedLanguage } from '@/utils/language'
import { useTranslation } from '@/utils/translations'

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
const getOccupationLabel = (value: string, t: any): string => {
  const occupationLabels: Record<string, string> = {
    'noEntry': t('occupations.noEntry'),
    '経営者・役員': t('occupations.executiveManager'),
    '会社員': t('occupations.companyEmployee'),
    '公務員': t('occupations.publicServant'),
    '自営業': t('occupations.selfEmployed'),
    'フリーランス': t('occupations.freelance'),
    '学生': t('occupations.student'),
    '主婦': t('occupations.housewife'),
    '主夫': t('occupations.houseHusband'),
    '主婦、主夫': t('occupations.housewife'),
    'その他': t('occupations.other')
  }
  return occupationLabels[value] || value
}

// 性格の表示を多言語対応で変換するヘルパー関数
const getPersonalityLabel = (value: string, t: any): string => {
  const personalityLabels: Record<string, string> = {
    // 日本語マッピング
    '優しい': t('personality.gentle'),
    '穏やか': t('personality.calm'),
    '寂しがりや': t('personality.lonely'),
    '落ち着いている': t('personality.composed'),
    '思いやりがある': t('personality.caring'),
    '謙虚': t('personality.humble'),
    '冷静': t('personality.cool'),
    '素直': t('personality.honest'),
    '明るい': t('personality.bright'),
    '親しみやすい': t('personality.friendly'),
    '面倒見が良い': t('personality.helpful'),
    '気が利く': t('personality.considerate'),
    '責任感がある': t('personality.responsible'),
    '決断力がある': t('personality.decisive'),
    '社交的': t('personality.sociable'),
    '負けず嫌い': t('personality.competitive'),
    '熱血': t('personality.passionate'),
    'インドア': t('personality.indoor'),
    'アクティブ': t('personality.active'),
    '知的': t('personality.intellectual'),
    '几帳面': t('personality.meticulous'),
    '楽観的': t('personality.optimistic'),
    'シャイ': t('personality.shy'),
    'マメ': t('personality.attentive'),
    'さわやか': t('personality.refreshing'),
    '天然': t('personality.natural'),
    'マイペース': t('personality.ownPace'),
    // 英語キー形式マッピング
    'gentle': t('personality.gentle'),
    'calm': t('personality.calm'),
    'lonely': t('personality.lonely'),
    'composed': t('personality.composed'),
    'caring': t('personality.caring'),
    'humble': t('personality.humble'),
    'cool': t('personality.cool'),
    'honest': t('personality.honest'),
    'bright': t('personality.bright'),
    'friendly': t('personality.friendly'),
    'helpful': t('personality.helpful'),
    'considerate': t('personality.considerate'),
    'responsible': t('personality.responsible'),
    'decisive': t('personality.decisive'),
    'sociable': t('personality.sociable'),
    'competitive': t('personality.competitive'),
    'passionate': t('personality.passionate'),
    'indoor': t('personality.indoor'),
    'active': t('personality.active'),
    'intellectual': t('personality.intellectual'),
    'meticulous': t('personality.meticulous'),
    'optimistic': t('personality.optimistic'),
    'shy': t('personality.shy'),
    'attentive': t('personality.attentive'),
    'refreshing': t('personality.refreshing'),
    'natural': t('personality.natural'),
    'ownPace': t('personality.ownPace'),
    // 大文字英語マッピング
    'Gentle': t('personality.gentle'),
    'Calm': t('personality.calm'),
    'Lonely': t('personality.lonely'),
    'Composed': t('personality.composed'),
    'Caring': t('personality.caring'),
    'Humble': t('personality.humble'),
    'Cool': t('personality.cool'),
    'Honest': t('personality.honest'),
    'Bright': t('personality.bright'),
    'Friendly': t('personality.friendly'),
    'Helpful': t('personality.helpful'),
    'Considerate': t('personality.considerate'),
    'Responsible': t('personality.responsible'),
    'Decisive': t('personality.decisive'),
    'Sociable': t('personality.sociable')
  }
  return personalityLabels[value] || value
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

// 日本文化の表示を多言語対応で変換するヘルパー関数
const getCultureLabel = (value: string, t: any): string => {
  const cultureLabels: Record<string, string> = {
    // 基本的な日本語マッピング
    'お茶': t('culture.tea'),
    '茶道': t('culture.teaCeremony'),
    '書道': t('culture.calligraphy'),
    '華道': t('culture.flowerArrangement'),
    '着物': t('culture.kimono'),
    '武道': t('culture.martialArts'),
    '禅': t('culture.zen'),
    'J-POP': t('culture.jpop'),
    'アニメ': t('culture.anime'),
    'マンガ': t('culture.manga'),
    '日本料理': t('culture.japaneseCuisine'),
    'ゲーム': t('culture.games'),
    'その他': t('culture.other'),
    // 詳細版日本語マッピング
    '和菓子': t('culture.wagashi'),
    '陶芸': t('culture.pottery'),
    '折り紙': t('culture.origami'),
    '盆栽': t('culture.bonsai'),
    '神社仏閣': t('culture.shrinesTemples'),
    '御朱印集め': t('culture.sealCollection'),
    // 食べ物系日本文化
    '寿司': t('culture.sushi'),
    '天ぷら': t('culture.tempura'),
    'うなぎ': t('culture.unagi'),
    '牛丼': t('culture.gyudon'),
    'とんかつ': t('culture.tonkatsu'),
    'ラーメン': t('culture.ramen'),
    'お好み焼き': t('culture.okonomiyaki'),
    'たこ焼き': t('culture.takoyaki'),
    // 英語キー形式のマッピング
    'tea': t('culture.tea'),
    'teaCeremony': t('culture.teaCeremony'),
    'Tea Ceremony': t('culture.teaCeremony'),
    'calligraphy': t('culture.calligraphy'),
    'Calligraphy': t('culture.calligraphy'),
    'ikebana': t('culture.flowerArrangement'),
    'flowerArrangement': t('culture.flowerArrangement'),
    'Flower Arrangement': t('culture.flowerArrangement'),
    'kimono': t('culture.kimono'),
    'Kimono': t('culture.kimono'),
    'martialArts': t('culture.martialArts'),
    'zen': t('culture.zen'),
    'Zen': t('culture.zen'),
    'jpop': t('culture.jpop'),
    'anime': t('culture.anime'),
    'Anime': t('culture.anime'),
    'manga': t('culture.manga'),
    'Manga': t('culture.manga'),
    'japaneseCuisine': t('culture.japaneseCuisine'),
    'games': t('culture.games'),
    'other': t('culture.other'),
    'wagashi': t('culture.wagashi'),
    'Wagashi': t('culture.wagashi'),
    'pottery': t('culture.pottery'),
    'Pottery': t('culture.pottery'),
    'origami': t('culture.origami'),
    'Origami': t('culture.origami'),
    'bonsai': t('culture.bonsai'),
    'Bonsai': t('culture.bonsai'),
    'shrinesTemples': t('culture.shrinesTemples'),
    'Shrines & Temples': t('culture.shrinesTemples'),
    'sealCollection': t('culture.sealCollection'),
    'Temple Seal Collection': t('culture.sealCollection'),
    // 英語版食べ物系文化
    'sushi': t('culture.sushi'),
    'Sushi': t('culture.sushi'),
    'tempura': t('culture.tempura'),
    'Tempura': t('culture.tempura'),
    'unagi': t('culture.unagi'),
    'Unagi': t('culture.unagi'),
    'gyudon': t('culture.gyudon'),
    'Gyudon': t('culture.gyudon'),
    'tonkatsu': t('culture.tonkatsu'),
    'Tonkatsu': t('culture.tonkatsu'),
    'ramen': t('culture.ramen'),
    'Ramen': t('culture.ramen'),
    'okonomiyaki': t('culture.okonomiyaki'),
    'Okonomiyaki': t('culture.okonomiyaki'),
    'takoyaki': t('culture.takoyaki'),
    'Takoyaki': t('culture.takoyaki'),
    // プレフィックス付きキー（culture.の対応）
    'culture.tea': t('culture.tea'),
    'culture.teaCeremony': t('culture.teaCeremony'),
    'culture.calligraphy': t('culture.calligraphy'),
    'culture.ikebana': t('culture.flowerArrangement'),
    'culture.flowerArrangement': t('culture.flowerArrangement'),
    'culture.kimono': t('culture.kimono'),
    'culture.martialArts': t('culture.martialArts'),
    'culture.zen': t('culture.zen'),
    'culture.jpop': t('culture.jpop'),
    'culture.anime': t('culture.anime'),
    'culture.manga': t('culture.manga'),
    'culture.japaneseCuisine': t('culture.japaneseCuisine'),
    'culture.games': t('culture.games'),
    'culture.other': t('culture.other'),
    'culture.wagashi': t('culture.wagashi'),
    'culture.pottery': t('culture.pottery'),
    'culture.origami': t('culture.origami'),
    'culture.bonsai': t('culture.bonsai'),
    'culture.shrinesTemples': t('culture.shrinesTemples'),
    'culture.sealCollection': t('culture.sealCollection'),
    // プレフィックス付き食べ物系
    'culture.sushi': t('culture.sushi'),
    'culture.tempura': t('culture.tempura'),
    'culture.unagi': t('culture.unagi'),
    'culture.gyudon': t('culture.gyudon'),
    'culture.tonkatsu': t('culture.tonkatsu'),
    'culture.ramen': t('culture.ramen'),
    'culture.okonomiyaki': t('culture.okonomiyaki'),
    'culture.takoyaki': t('culture.takoyaki')
  }
  return cultureLabels[value] || value
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
    'その他': t('nationalities.other')
  }
  return nationalityLabels[value] || value
}

function ProfilePreviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // エラーハンドリング用の状態
  const [hasError, setHasError] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  
  // 言語切り替え状態
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('ja')
  const { t } = useTranslation(currentLanguage)

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
      }
      
      // それでもない場合は全てのpreviewData関連キーを探す
      if (!savedData) {
        const allKeys = Object.keys(sessionStorage)
        const previewKeys = allKeys.filter(key => key.startsWith('previewData'))
        
        if (previewKeys.length > 0) {
          // 最初に見つかったpreviewDataキーを使用
          savedData = sessionStorage.getItem(previewKeys[0])
        }
      }
      
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        setPreviewData(parsedData)
      } else {
        // フォールバック：URLパラメータから取得
        const fallbackData = {
          nickname: searchParams?.get('nickname') || 'ニックネーム未設定',
          age: searchParams?.get('age') || '18',
          birth_date: searchParams?.get('birth_date') || null,
          gender: searchParams?.get('gender') || '',
          nationality: searchParams?.get('nationality') || '',
          prefecture: searchParams?.get('prefecture') || '',
          city: searchParams?.get('city') || '',
          occupation: searchParams?.get('occupation') || '',
          height: searchParams?.get('height') || '',
          body_type: searchParams?.get('body_type') || '',
          marital_status: searchParams?.get('marital_status') || '',
          english_level: searchParams?.get('english_level') || '',
          japanese_level: searchParams?.get('japanese_level') || '',
          self_introduction: searchParams?.get('self_introduction') || '',
          hobbies: [],
          personality: [],
          custom_culture: searchParams?.get('custom_culture') || '',
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
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => window.close()}
              className="mr-4 text-white hover:bg-orange-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
            <h1 className="text-xl font-bold">プレビュー | 相手からの見え方</h1>
          </div>
          
          {/* 言語切り替えボタン */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-white" />
            <Select
              value={currentLanguage}
              onValueChange={(value: SupportedLanguage) => {
                console.log('Language switching to:', value)
                setCurrentLanguage(value)
                // 強制的に再レンダリングを促す
                setHasError(false)
              }}
            >
              <SelectTrigger className="w-40 bg-orange-600 border-orange-400 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ja">🇯🇵 日本語</SelectItem>
                <SelectItem value="en">🇺🇸 English</SelectItem>
                <SelectItem value="ko">🇰🇷 한국어</SelectItem>
                <SelectItem value="zh-tw">🇹🇼 繁體中文（台湾）</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* プレビューコンテンツ */}
      <div className="py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* プロフィール画像 */}
            <div className="relative aspect-square bg-gray-100">
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
                  <p className="text-lg text-gray-600">{t('profile.age')}: {age}</p>
                </div>
              </div>

              {/* 基本プロフィール */}
              <div className="space-y-3 text-sm">
                {/* 1. 国籍（外国人男性の場合のみ）/ 居住地（日本人女性の場合） */}
                {gender === 'male' && nationality && nationality !== '日本' && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.nationality')}:</span>
                    <span className="text-gray-600">{getNationalityLabel(nationality, t)}</span>
                  </div>
                )}
                {gender === 'female' && prefecture && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.residence')}:</span>
                    <span className="text-gray-600">{prefecture}{city ? `・${city}` : ''}</span>
                  </div>
                )}
                
                {/* 2. 職業 */}
                {shouldDisplayValue(occupation) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.occupation')}:</span>
                    <span className="text-gray-600">{getOccupationLabel(occupation, t)}</span>
                  </div>
                )}
                
                {/* 3. 身長 */}
                {shouldDisplayValue(height) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.height')}:</span>
                    <span className="text-gray-600">{height}cm</span>
                  </div>
                )}
                
                {/* 4. 体型 */}
                {shouldDisplayValue(bodyType) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.bodyTypeLabel')}:</span>
                    <span className="text-gray-600">{getBodyTypeLabel(bodyType, t)}</span>
                  </div>
                )}
                
                {/* 5. 婚姻状況 */}
                {shouldDisplayValue(maritalStatus) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.marriageStatus')}:</span>
                    <span className="text-gray-600">{maritalStatus === 'single' ? t('maritalStatus.single') : t('maritalStatus.married')}</span>
                  </div>
                )}
                
                {/* 6. 日本語レベル（外国人男性）/ 英語レベル（日本人女性） */}
                {shouldDisplayValue(japaneseLevel) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.japaneseLanguage')}:</span>
                    <span className="text-gray-600">{getLanguageLevelLabel(japaneseLevel, t)}</span>
                  </div>
                )}
                {shouldDisplayValue(englishLevel) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.englishLanguage')}:</span>
                    <span className="text-gray-600">{getLanguageLevelLabel(englishLevel, t)}</span>
                  </div>
                )}
                
                {/* 7. 訪問予定（外国人男性の場合） */}
                {gender === 'male' && shouldDisplayValue(visit_schedule) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.visitPlan')}:</span>
                    <span className="text-gray-600">
                      {(() => {
                        if (visit_schedule === 'undecided') return t('schedule.undecided');
                        if (visit_schedule === 'no-entry') return t('schedule.noEntry');
                        if (visit_schedule === 'currently-in-japan') return t('schedule.currentlyInJapan');

                        // beyond-YYYY 形式の処理
                        if (visit_schedule.startsWith('beyond-')) {
                          const year = visit_schedule.split('-')[1];
                          return `${t('schedule.after')} ${year}`;
                        }

                        // YYYY-season 形式の処理
                        const match = visit_schedule.match(/^(\d{4})-(spring|summer|autumn|winter)$/);
                        if (match) {
                          const [, year, season] = match;
                          const seasonKey = `seasons.${season}`;
                          return `${year} ${t(seasonKey)}`;
                        }

                        // フォールバック：そのまま表示
                        return visit_schedule;
                      })()}
                    </span>
                  </div>
                )}
                
                {/* 8. 同行者（外国人男性の場合） */}
                {gender === 'male' && shouldDisplayValue(travel_companion) && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 w-20">{t('profile.companion')}:</span>
                    <span className="text-gray-600">{getTravelCompanionLabel(travel_companion, t)}</span>
                  </div>
                )}
                
                {/* 9. 行く予定の都道府県（外国人男性の場合） */}
                {gender === 'male' && planned_prefectures && planned_prefectures.length > 0 && (
                  <div className="flex items-start">
                    <span className="font-medium text-gray-700 w-20">{t('profile.plannedDestination')}:</span>
                    <span className="text-gray-600">{planned_prefectures.map((pref: string) => getPrefectureLabel(pref, t)).join(', ')}</span>
                  </div>
                )}

                {/* 訪問予定の駅（外国人男性の場合）- 順序は変更しない */}
                {gender === 'male' && planned_stations && planned_stations.length > 0 && (
                  <div className="flex items-start">
                    <span className="font-medium text-gray-700 w-20">{t('profile.plannedStationsLabel')}:</span>
                    <span className="text-gray-600">{planned_stations.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* 10. 自己紹介 */}
              {shouldDisplayValue(selfIntroduction) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{t('profile.selfIntroduction')}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {selfIntroduction}
                  </p>
                </div>
              )}

              {/* 11. 性格 */}
              {personality.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{t('profile.personalityLabel')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {personality.map((trait: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                      >
                        {getPersonalityLabel(trait, t)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 12. 学びたい日本文化 */}
              {(hobbies.length > 0 || shouldDisplayValue(customCulture)) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{t('profile.learnJapaneseCulture')}</h3>
                  <div className="space-y-2">
                    {hobbies.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {hobbies.map((hobby: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-sakura-100 text-sakura-800 rounded-full text-xs"
                          >
                            {getCultureLabel(hobby, t)}
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
                          english_level: englishLevel || null,
                          japanese_level: japaneseLevel || null,
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
                                          searchParams?.get('birth_date') || 
                                          searchParams?.get('birthday') || 
                                          searchParams?.get('dob') || 
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
                          profile_image: previewData.profile_image || profileImage || searchParams?.get('profile_image') || null,

                          // オプション情報（city JSONに格納）
                          optionalData: optionalData,

                          // interests配列
                          interests: extendedInterests,

                          // 外国人男性専用フィールドを追加（外国人男性のみ）
                          ...(gender === 'male' && nationality && nationality !== '日本' ? {
                            visit_schedule: previewData.visit_schedule || visit_schedule || null,
                            travel_companion: previewData.travel_companion || travel_companion || null,
                            planned_prefectures: previewData.planned_prefectures || planned_prefectures || null,
                            planned_stations: previewData.planned_stations || planned_stations || null
                          } : {})
                        }
                        
                        console.log('🔍 DEBUG: birth_date sources:', {
                          'previewData.birth_date': previewData.birth_date,
                          'previewData.birthday': previewData.birthday,  
                          'previewData.dob': previewData.dob,
                          'searchParams birth_date': searchParams?.get('birth_date'),
                          'searchParams birthday': searchParams?.get('birthday'),
                          'searchParams dob': searchParams?.get('dob'),
                          'final birth_date': birth_date
                        })
                        
                        console.log('🚨 COMPLETE SAVE: All profile data prepared', completeProfileData)
                        console.log('🔍 DEBUG: Individual data fields:', {
                          nickname,
                          selfIntroduction,
                          age,
                          birth_date,
                          gender,
                          nationality,
                          prefecture,
                          profileImage,
                          hobbies,
                          personality,
                          customCulture,
                          planned_prefectures,
                          visit_schedule,
                          travel_companion
                        })
                        
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
                        
                        if (savedCompleteData) {
                          console.log('✅ Complete data saved successfully:', JSON.parse(savedCompleteData))
                        } else {
                          console.error('❌ Complete data NOT saved!')
                        }
                        
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
                          
                          // localStorage保存完了後にマイページにリダイレクト（認証済みユーザーとして）
                          window.opener.location.href = '/mypage'
                          window.close()
                        } else {
                          // 直接マイページに遷移（認証済みユーザーとして）
                          console.log('🔄 Direct redirect to mypage after localStorage confirmation')
                          window.location.href = '/mypage'
                        }
                        
                    } catch (error) {
                      console.error('❌ Error preparing preview data:', error)
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