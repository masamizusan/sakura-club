'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useAuth } from '@/store/authStore'
import { createClient } from '@/lib/supabase'
import AuthGuard from '@/components/auth/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'
import MultiImageUploader from '@/components/ui/multi-image-uploader'
import { User, Save, ArrowLeft, Loader2, AlertCircle, Camera, Globe } from 'lucide-react'
import { z } from 'zod'
import { calculateProfileCompletion as calculateSharedProfileCompletion } from '@/utils/profileCompletion'
import { determineLanguage, saveLanguagePreference, getLanguageDisplayName, type SupportedLanguage } from '@/utils/language'
import { useTranslation } from '@/utils/translations'

const baseProfileEditSchema = (t: any) => z.object({
  nickname: z.string().min(1, t('errors.nicknameRequired')).max(20, t('errors.nicknameMaxLength')),
  gender: z.enum(['male', 'female'], { required_error: t('errors.genderRequired') }),
  birth_date: z.string().min(1, t('errors.birthDateRequired')),
  age: z.number().min(18, t('errors.ageMinimum')).max(99, t('errors.ageMaximum')),
  nationality: z.string().optional(),
  prefecture: z.string().optional(),
  city: z.string().optional(),
  // 外国人男性向け新フィールド
  planned_prefectures: z.array(z.string()).max(3, '行く予定の都道府県は3つまで選択できます').optional(),
  visit_schedule: z.string().optional(),
  travel_companion: z.string().optional(),
  occupation: z.string().optional(),
  height: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(120, t('errors.heightMinimum')).max(250, t('errors.heightMaximum')).optional()
  ),
  body_type: z.string().optional(),
  marital_status: z.enum(['none', 'single', 'married', '']).optional(),
  english_level: z.string().optional(),
  japanese_level: z.string().optional(),
  hobbies: z.array(z.string()).min(1, t('errors.hobbiesMinimum')).max(8, t('errors.hobbiesMaximum')),
  custom_culture: z.string().max(100, t('errors.customCultureMaxLength')).optional(),
  personality: z.array(z.string()).max(5, '性格は5つまで選択できます').optional(),
  self_introduction: z.string().min(100, t('errors.selfIntroMinimum')).max(1000, t('errors.selfIntroMaximum')),
})

// 条件付きバリデーション関数
const createProfileEditSchema = (isForeignMale: boolean, t: any) => {
  const baseSchema = baseProfileEditSchema(t)
  if (isForeignMale) {
    return baseSchema.refine((data) => {
      // Nationality is required for foreign male users
      if (!data.nationality || data.nationality.trim() === '') {
        throw new z.ZodError([{
          code: z.ZodIssueCode.custom,
          message: t('errors.nationalityRequired'),
          path: ['nationality']
        }])
      }
      // 行く予定の都道府県は任意項目のため、必須チェックを削除
      // if (!data.planned_prefectures || data.planned_prefectures.length === 0) {
      //   throw new z.ZodError([{
      //     code: z.ZodIssueCode.custom,
      //     message: t('errors.prefecturesMinimum'),
      //     path: ['planned_prefectures']
      //   }])
      // }
      return true
    })
  } else {
    // Prefecture is required for Japanese female users
    return baseSchema.refine((data) => {
      if (!data.prefecture || data.prefecture.trim() === '') {
        throw new z.ZodError([{
          code: z.ZodIssueCode.custom,
          message: t('errors.cityRequired'),
          path: ['prefecture']
        }])
      }
      return true
    })
  }
}

type ProfileEditFormData = z.infer<ReturnType<typeof baseProfileEditSchema>>

// 性格オプション（翻訳対応）
const getPersonalityOptions = (t: any) => [
  { key: 'gentle', label: t('personality.gentle') },
  { key: 'calm', label: t('personality.calm') },
  { key: 'lonely', label: t('personality.lonely') },
  { key: 'composed', label: t('personality.composed') },
  { key: 'caring', label: t('personality.caring') },
  { key: 'humble', label: t('personality.humble') },
  { key: 'cool', label: t('personality.cool') },
  { key: 'honest', label: t('personality.honest') },
  { key: 'bright', label: t('personality.bright') },
  { key: 'friendly', label: t('personality.friendly') },
  { key: 'helpful', label: t('personality.helpful') },
  { key: 'considerate', label: t('personality.considerate') },
  { key: 'responsible', label: t('personality.responsible') },
  { key: 'decisive', label: t('personality.decisive') },
  { key: 'sociable', label: t('personality.sociable') },
  { key: 'competitive', label: t('personality.competitive') },
  { key: 'passionate', label: t('personality.passionate') },
  { key: 'indoor', label: t('personality.indoor') },
  { key: 'active', label: t('personality.active') },
  { key: 'intellectual', label: t('personality.intellectual') },
  { key: 'meticulous', label: t('personality.meticulous') },
  { key: 'optimistic', label: t('personality.optimistic') },
  { key: 'shy', label: t('personality.shy') },
  { key: 'attentive', label: t('personality.attentive') },
  { key: 'refreshing', label: t('personality.refreshing') },
  { key: 'natural', label: t('personality.natural') },
  { key: 'ownPace', label: t('personality.ownPace') }
]


// 後方互換性のため、フラットな配列も保持（翻訳対応）
const getHobbyOptions = (t: any) => getCultureCategories(t).flatMap(category => category.items)

// 結婚状況オプション
// 結婚状況選択肢（翻訳対応）
const getMaritalStatusOptions = (t: any) => [
  { value: 'none', label: t('maritalStatus.none') },
  { value: 'single', label: t('maritalStatus.single') },
  { value: 'married', label: t('maritalStatus.married') }
]

// 職業オプション
// 職業選択肢（翻訳対応）
const getOccupationOptions = (t: any) => [
  { value: 'none', label: t('occupations.noEntry') },
  { value: '主婦、主夫', label: t('occupations.housewife') },
  { value: '会社員', label: t('occupations.companyEmployee') },
  { value: '公務員', label: t('occupations.publicServant') },
  { value: '経営者・役員', label: t('occupations.executiveManager') },
  { value: 'フリーランス', label: t('occupations.freelance') },
  { value: '自営業', label: t('occupations.selfEmployed') },
  { value: '医師', label: t('occupations.doctor') },
  { value: '看護師', label: t('occupations.nurse') },
  { value: '教師・講師', label: t('occupations.teacher') },
  { value: 'エンジニア', label: t('occupations.engineer') },
  { value: 'デザイナー', label: t('occupations.designer') },
  { value: '営業', label: t('occupations.sales') },
  { value: 'マーケティング', label: t('occupations.marketing') },
  { value: '研究者', label: t('occupations.researcher') },
  { value: 'コンサルタント', label: t('occupations.consultant') },
  { value: '金融', label: t('occupations.finance') },
  { value: '法律関係', label: t('occupations.legal') },
  { value: 'サービス業', label: t('occupations.serviceIndustry') },
  { value: '小売業', label: t('occupations.retail') },
  { value: '製造業', label: t('occupations.manufacturing') },
  { value: '学生', label: t('occupations.student') },
  { value: 'その他', label: t('occupations.other') }
]

// Body type options (with translation support)
const getBodyTypeOptions = (t: any) => [
  { value: 'none', label: t('bodyType.noEntry') },
  { value: 'slim', label: t('bodyType.slim') },
  { value: 'average', label: t('bodyType.average') },
  { value: 'muscular', label: t('bodyType.muscular') },
  { value: 'plump', label: t('bodyType.plump') }
]

// 英語レベルオプション（翻訳対応）
const getEnglishLevelOptions = (t: any) => [
  { value: 'none', label: t('levels.none') },
  { value: 'beginner', label: t('levels.beginner') },
  { value: 'elementary', label: t('levels.elementary') },
  { value: 'intermediate', label: t('levels.intermediate') },
  { value: 'upperIntermediate', label: t('levels.upperIntermediate') },
  { value: 'advanced', label: t('levels.advanced') },
  { value: 'native', label: t('levels.native') }
]

// 日本語レベルオプション（翻訳対応）
const getJapaneseLevelOptions = (t: any) => [
  { value: 'none', label: t('levels.none') },
  { value: 'beginner', label: t('levels.beginner') },
  { value: 'elementary', label: t('levels.elementary') },
  { value: 'intermediate', label: t('levels.intermediate') },
  { value: 'upperIntermediate', label: t('levels.upperIntermediate') },
  { value: 'advanced', label: t('levels.advanced') },
  { value: 'native', label: t('levels.native') }
]

// 同行者選択肢（翻訳対応）
const getTravelCompanionOptions = (t: any) => [
  { value: 'noEntry', label: t('companion.noEntry') },
  { value: 'alone', label: t('companion.alone') },
  { value: 'friend', label: t('companion.friend') },
  { value: 'family', label: t('companion.family') },
  { value: 'partner', label: t('companion.partner') }
]


// Japanese culture categories (with translation support)
const getCultureCategories = (t: any) => [
  {
    name: t('cultureCategories.traditional'),
    items: [
      { value: '茶道', label: t('culture.teaCeremony') },
      { value: '華道', label: t('culture.flowerArrangement') },
      { value: '書道', label: t('culture.calligraphy') },
      { value: '着物・浴衣', label: t('culture.kimono') },
      { value: '和菓子', label: t('culture.wagashi') },
      { value: '陶芸', label: t('culture.pottery') },
      { value: '折り紙', label: t('culture.origami') },
      { value: '盆栽', label: t('culture.bonsai') },
      { value: '神社仏閣', label: t('culture.shrinesTemples') },
      { value: '御朱印集め', label: t('culture.sealCollection') },
      { value: '禅', label: t('culture.zen') }
    ]
  },
  {
    name: t('cultureCategories.food'),
    items: [
      { value: '寿司', label: t('culture.sushi') },
      { value: '天ぷら', label: t('culture.tempura') },
      { value: 'うなぎ', label: t('culture.unagi') },
      { value: '牛丼', label: t('culture.gyudon') },
      { value: 'とんかつ', label: t('culture.tonkatsu') },
      { value: 'ラーメン', label: t('culture.ramen') },
      { value: 'お好み焼き', label: t('culture.okonomiyaki') },
      { value: 'たこ焼き', label: t('culture.takoyaki') },
      { value: 'カレーライス', label: t('culture.curry') },
      { value: 'コンビニフード', label: t('culture.conbiniFood') },
      { value: 'ポテトチップス', label: t('culture.potatoChips') },
      { value: '出汁', label: t('culture.dashi') },
      { value: '味噌', label: t('culture.miso') },
      { value: '豆腐', label: t('culture.tofu') },
      { value: '梅干し', label: t('culture.umeboshi') },
      { value: '漬物', label: t('culture.pickles') },
      { value: '日本酒', label: t('culture.sake') },
      { value: '焼酎', label: t('culture.shochu') },
      { value: 'そば', label: t('culture.soba') },
      { value: 'うどん', label: t('culture.udon') }
    ]
  },
  {
    name: t('cultureCategories.sweets'),
    items: [
      { value: '抹茶スイーツ', label: t('culture.matchaSweets') },
      { value: '団子', label: t('culture.dango') },
      { value: 'たい焼き', label: t('culture.taiyaki') },
      { value: '大判焼き', label: t('culture.obanyaki') },
      { value: 'わらび餅', label: t('culture.warabimochi') },
      { value: 'りんご飴', label: t('culture.candiedApple') },
      { value: 'わたあめ', label: t('culture.cottonCandy') },
      { value: '駄菓子', label: t('culture.dagashi') },
      { value: 'コンビニスイーツ', label: t('culture.conbiniSweets') }
    ]
  },
  {
    name: t('cultureCategories.arts'),
    items: [
      { value: '相撲', label: t('culture.sumo') },
      { value: '剣道', label: t('culture.kendo') },
      { value: '柔道', label: t('culture.judo') },
      { value: '空手', label: t('culture.karate') },
      { value: '弓道', label: t('culture.kyudo') },
      { value: '合気道', label: t('culture.aikido') },
      { value: '薙刀', label: t('culture.naginata') },
      { value: '歌舞伎', label: t('culture.kabuki') },
      { value: '能', label: t('culture.noh') },
      { value: '日本舞踊', label: t('culture.japaneseDance') },
      { value: '邦楽', label: t('culture.hogaku') },
      { value: '演歌', label: t('culture.enka') },
      { value: '太鼓', label: t('culture.taiko') }
    ]
  },
  {
    name: t('cultureCategories.seasonal'),
    items: [
      { value: '桜見物', label: t('culture.cherryBlossom') },
      { value: '紅葉狩り', label: t('culture.autumnLeaves') },
      { value: '花火大会', label: t('culture.fireworks') },
      { value: '祭り参加', label: t('culture.festivals') },
      { value: '盆踊り', label: t('culture.bonDance') },
      { value: '雪景色', label: t('culture.snowScape') },
      { value: '日本庭園散策', label: t('culture.gardenWalk') }
    ]
  },
  {
    name: t('cultureCategories.lifestyle'),
    items: [
      { value: '障子', label: t('culture.shoji') },
      { value: '襖の張り替え', label: t('culture.fusuma') },
      { value: '畳', label: t('culture.tatami') },
      { value: '古民家カフェ', label: t('culture.oldHouseCafe') },
      { value: '銭湯', label: t('culture.sento') },
      { value: '昭和レトロ家電', label: t('culture.showaRetro') },
      { value: '和モダンインテリア', label: t('culture.waModernInterior') }
    ]
  },
  {
    name: t('cultureCategories.craftmanship'),
    items: [
      { value: '漆器', label: t('culture.lacquerware') },
      { value: '金箔貼り', label: t('culture.goldLeaf') },
      { value: '和紙漉き', label: t('culture.paperMaking') },
      { value: '染物', label: t('culture.dyeing') },
      { value: '刀鍛冶', label: t('culture.swordSmithing') },
      { value: '木工', label: t('culture.woodworking') },
      { value: '飴細工', label: t('culture.sugarCrafts') }
    ]
  },
  {
    name: t('cultureCategories.modernCulture'),
    items: [
      { value: 'アニメ', label: t('culture.anime') },
      { value: 'マンガ', label: t('culture.manga') },
      { value: 'コスプレ', label: t('culture.cosplay') },
      { value: '日本のゲーム', label: t('culture.japaneseGames') },
      { value: 'J-POP', label: t('culture.jpop') },
      { value: 'カラオケ', label: t('culture.karaoke') },
      { value: '日本映画', label: t('culture.japaneseMov') },
      { value: 'ドラマ', label: t('culture.drama') },
      { value: 'ボーカロイド', label: t('culture.vocaloid') },
      { value: 'アイドル文化', label: t('culture.idolCulture') }
    ]
  }
]

// 訪問予定時期選択肢（翻訳対応・動的生成）
const getVisitScheduleOptions = (t: any) => {
  const options = [
    { value: 'no-entry', label: t('schedule.noEntry') },
    { value: 'undecided', label: t('schedule.undecided') }
  ];

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11

  // 現在の季節を判定（春:2-4月、夏:5-7月、秋:8-10月、冬:11-1月）
  const currentSeason =
    currentMonth >= 2 && currentMonth <= 4 ? '春' :
    currentMonth >= 5 && currentMonth <= 7 ? '夏' :
    currentMonth >= 8 && currentMonth <= 10 ? '秋' : '冬';

  // 今年の残りの季節
  const seasons = ['春', '夏', '秋', '冬'];
  const currentSeasonIndex = seasons.indexOf(currentSeason);

  for (let i = currentSeasonIndex; i < seasons.length; i++) {
    options.push({
      value: `${currentYear}-${seasons[i]}`,
      label: `${currentYear}年${seasons[i]}`
    });
  }

  // 来年の全季節
  for (const season of seasons) {
    options.push({
      value: `${currentYear + 1}-${season}`,
      label: `${currentYear + 1}年${season}`
    });
  }

  // 2年以降の選択肢
  options.push({
    value: `beyond-${currentYear + 2}`,
    label: `${currentYear + 2}年以降`
  });

  return options;
}

// Dynamic visit schedule options generation function
const generateVisitScheduleOptions = () => {
  const options = [
    { value: 'no-entry', label: '記入しない' },
    { value: 'undecided', label: 'まだ決まっていない' }
  ];

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11

  // 現在の季節を判定（春:2-4月、夏:5-7月、秋:8-10月、冬:11-1月）
  const getCurrentSeason = () => {
    if (currentMonth >= 2 && currentMonth <= 4) return 'spring';
    if (currentMonth >= 5 && currentMonth <= 7) return 'summer';
    if (currentMonth >= 8 && currentMonth <= 10) return 'autumn';
    return 'winter';
  };

  const currentSeason = getCurrentSeason();
  const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
  const seasonLabels: Record<typeof seasons[number], string> = {
    spring: '春（3-5月）',
    summer: '夏（6-8月）',
    autumn: '秋（9-11月）',
    winter: '冬（12-2月）'
  };

  // 今後2年分の選択肢を生成
  for (let year = currentYear; year <= currentYear + 2; year++) {
    seasons.forEach((season, index) => {
      // 現在年の場合、過去の季節は除外
      if (year === currentYear) {
        const currentSeasonIndex = seasons.indexOf(currentSeason);
        if (index <= currentSeasonIndex) return; // 現在季節以前は除外
      }

      const value = `${year}-${season}`;
      const label = `${year}年${seasonLabels[season]}`;
      options.push({ value, label });
    });
  }

  // 2年以降の選択肢
  options.push({ value: `beyond-${currentYear + 2}`, label: `${currentYear + 2}年以降` });

  return options;
};

// 外国人男性向け選択肢
const VISIT_SCHEDULE_OPTIONS = generateVisitScheduleOptions();

// テストモード検出関数
const isTestMode = () => {
  if (typeof window === 'undefined') return false
  const urlParams = new URLSearchParams(window.location.search)
  return !!(urlParams.get('type') || urlParams.get('gender') || urlParams.get('nickname') || urlParams.get('birth_date') || urlParams.get('age') || urlParams.get('nationality'))
}

function ProfileEditContent() {
  // ALL HOOKS MUST BE AT THE VERY TOP - NO EARLY RETURNS BEFORE HOOKS
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const profileType = searchParams.get('type') // 'foreign-male' or 'japanese-female'
  
  // 言語設定
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('ja')
  const { t } = useTranslation(currentLanguage)

  // 新規ユーザーの早期セッションストレージクリア（デプロイ直後対策）
  useEffect(() => {
    const isFromSignup = searchParams.get('from') === 'signup'
    if (isFromSignup && typeof window !== 'undefined') {
      console.log('🧹 新規ユーザー: デプロイ直後対策でセッションストレージを早期クリア')
      try {
        // すべての画像関連セッションストレージを削除
        sessionStorage.removeItem('currentProfileImages')
        sessionStorage.removeItem('imageStateTimestamp')
        sessionStorage.removeItem('imageEditHistory')

        // ユーザー固有キーも削除
        const keys = Object.keys(sessionStorage)
        keys.forEach(key => {
          if (key.startsWith('currentProfileImages_') ||
              key.startsWith('imageStateTimestamp_')) {
            sessionStorage.removeItem(key)
          }
        })
      } catch (e) {
        console.warn('セッションストレージクリアエラー:', e)
      }
    }
  }, [searchParams])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [initializationError, setInitializationError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [userLoading, setUserLoading] = useState(true)
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([])
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([])
  const [selectedPlannedPrefectures, setSelectedPlannedPrefectures] = useState<string[]>([])
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [completedItems, setCompletedItems] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [profileImages, setProfileImages] = useState<Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>>([])
  const router = useRouter()
  const supabase = createClient()

  // Profile type flags
  // URLパラメータからの判定を優先し、なければユーザーのプロフィールから判定
  const [userBasedType, setUserBasedType] = useState<string | null>(null)
  const effectiveProfileType = profileType || userBasedType
  const isForeignMale = effectiveProfileType === 'foreign-male' || (!profileType && userBasedType === 'foreign-male')
  const isJapaneseFemale = effectiveProfileType === 'japanese-female' || (!profileType && userBasedType === 'japanese-female')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    getValues,
    formState: { errors }
  } = useForm<ProfileEditFormData>({
    resolver: zodResolver(createProfileEditSchema(isForeignMale, t)),
    mode: 'onChange',
    defaultValues: {
      nationality: typeof window !== 'undefined' && profileType === 'foreign-male'
        ? new URLSearchParams(window.location.search).get('nationality') || 'アメリカ'
        : undefined
    }
  })

  // 生年月日から年齢を計算
  const calculateAge = useCallback((birthDate: string): number => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }, [])

  // プロフィール画像の変更を監視して完成度を再計算
  useEffect(() => {
    console.log('🖼️ 画像状態変更検出 - 完成度再計算実行', {
      'profileImages.length': profileImages.length,
      'selectedHobbies.length': selectedHobbies.length,
      'selectedPersonality.length': selectedPersonality.length
    })
    const currentData = watch()
    calculateProfileCompletion({
      ...currentData,
      hobbies: selectedHobbies,
      personality: selectedPersonality,
    }, profileImages)  // 🔧 現在の画像配列を明示的に渡す
  }, [profileImages.length, selectedHobbies, selectedPersonality])

  // 生年月日変更時の年齢自動更新
  const handleBirthDateChange = useCallback((birthDate: string) => {
    if (birthDate) {
      const age = calculateAge(birthDate)
      setValue('age', age)
      setValue('birth_date', birthDate)
      
      // リアルタイム完成度更新
      const currentData = watch()
      // custom_culture は完成度計算から除外（コメント扱い）
      const { custom_culture, ...currentDataWithoutCustomCulture } = currentData || {}
      calculateProfileCompletion({
        ...currentDataWithoutCustomCulture,
        birth_date: birthDate,
        age: age,
        hobbies: selectedHobbies, // 状態から直接取得
        personality: selectedPersonality, // 状態から直接取得
        avatar_url: profileImages.length > 0 ? 'has_images' : null
      })
    }
  }, [calculateAge, setValue, watch, profileImages, selectedHobbies, selectedPersonality])

  // 統一されたプロフィール完成度計算関数（共通utilsを使用）
  const calculateProfileCompletion = useCallback((profileData: any, imageArray?: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>, source?: string, isNewUserOverride?: boolean) => {
    // 画像配列が空の場合は undefined を渡して fallback 検出を有効にする
    const imageArrayToPass = imageArray && imageArray.length > 0 ? imageArray : undefined

    // 🔍 Profile Edit専用: profileDataの詳細デバッグ
    console.log(`🔍 Profile Edit: profileData debug BEFORE shared function [${source || 'unknown'}]:`, {
      avatar_url: profileData?.avatar_url,
      avatarUrl: profileData?.avatarUrl,
      hasAvatarUrl: !!profileData?.avatar_url,
      hasAvatarUrlCamel: !!profileData?.avatarUrl,
      profileDataKeys: Object.keys(profileData || {}),
      nickname: profileData?.nickname || profileData?.name,
      age: profileData?.age,
      birth_date: profileData?.birth_date || profileData?.date_of_birth,
      prefecture: profileData?.prefecture || profileData?.residence,
      hobbies: profileData?.hobbies || profileData?.interests,
      self_introduction: profileData?.self_introduction || profileData?.bio,
      imageArrayLength: imageArray?.length || 0,
      imageArrayToPassLength: imageArrayToPass?.length || 0
    })

    // 共通関数を使用して計算
    const result = calculateSharedProfileCompletion(profileData, imageArrayToPass, isForeignMale, isNewUserOverride || false)

    // 既存のUI更新ロジックを維持
    setProfileCompletion(result.completion)
    setCompletedItems(result.completedFields)
    setTotalItems(result.totalFields)

    console.log(`📊 Profile Edit Completion [${source || 'unknown'}] (共通関数使用):`, {
      required: `${result.requiredCompleted}/${result.requiredTotal}`,
      optional: `${result.optionalCompleted}/${result.optionalTotal}`,
      images: `${result.hasImages ? 1 : 0}/1`,
      total: `${result.completedFields}/${result.totalFields}`,
      percentage: `${result.completion}%`,
      imageArrayPassed: imageArrayToPass ? `${imageArrayToPass.length} images` : 'undefined (using fallback)',
      profileAvatarUrl: profileData?.avatar_url,
      profileAvatarUrlExists: !!profileData?.avatarUrl,
      timestamp: new Date().toISOString()
    })

  }, [isForeignMale, profileImages, calculateSharedProfileCompletion])

  // 簡素化された国籍設定（他のフィールドと同様にresetで処理）

  // 削除された古いコード（305-519行目）は正常に削除されました
  // 写真変更フラグ（デバウンス計算との競合を避けるため）
  const [isImageChanging, setIsImageChanging] = useState(false)
  
  // 写真変更時のコールバック関数
  const handleImagesChange = useCallback(async (newImages: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>) => {
    console.log('🚨🚨🚨 HANDLE IMAGES CHANGE CALLED!')
    console.log('📸 写真変更:', 
      `新しい画像数: ${newImages.length}`,
      `avatar_url値: ${newImages.length > 0 ? 'has_images' : null}`,
      newImages
    )
    
    // 無限ループ防止：現在の状態と同じ場合は早期リターン
    if (JSON.stringify(profileImages) === JSON.stringify(newImages)) {
      console.log('🚫 同じ画像状態のため処理をスキップ')
      return
    }
    
    // 写真変更中フラグを設定（デバウンス計算を一時的に無効化）
    setIsImageChanging(true)
    setProfileImages(newImages)
    
    // 🔒 セキュリティ強化: ユーザー固有のセッションストレージ保存
    try {
      const userImageKey = `currentProfileImages_${user?.id}`
      const userTimestampKey = `imageStateTimestamp_${user?.id}`
      sessionStorage.setItem(userImageKey, JSON.stringify(newImages))
      sessionStorage.setItem(userTimestampKey, Date.now().toString())

      // 画像編集履歴を記録（完成度計算で使用）
      sessionStorage.setItem('imageEditHistory', 'true')

      console.log('💾 最新の画像状態をユーザー固有キーでセッションストレージに保存:', userImageKey)
      console.log('✏️ 画像編集履歴を記録')
    } catch (sessionError) {
      console.error('❌ セッションストレージ保存エラー:', sessionError)
    }
    
    // 写真変更時に即座データベースに保存（blob URLは除外）
    if (user) {
      try {
        // メイン画像を探す（blob URLでない場合のみ）
        let avatarUrl = null
        const mainImage = newImages.find(img => img.isMain)
        const firstImage = newImages[0]
        
        if (mainImage && !mainImage.url.startsWith('blob:')) {
          avatarUrl = mainImage.url
        } else if (firstImage && !firstImage.url.startsWith('blob:')) {
          avatarUrl = firstImage.url
        }
        
        console.log('💾 写真変更をデータベースに即座保存:', {
          hasImages: newImages.length > 0,
          hasBlobImages: newImages.some(img => img.url.startsWith('blob:')),
          avatarUrl,
          willSave: !!avatarUrl
        })
        
        // blob URLでない場合のみデータベースに保存
        if (avatarUrl) {
          const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', user.id)

          if (error) {
            console.error('❌ 写真保存エラー:', error)
          } else {
            console.log('✅ 写真がデータベースに保存されました')
          }
        } else if (newImages.length === 0) {
          // 画像が完全に削除された場合は、データベースのavatar_urlをnullに更新
          const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('id', user.id)

          if (error) {
            console.error('❌ 写真削除エラー:', error)
          } else {
            console.log('✅ 写真がデータベースから削除されました')
          }
        } else {
          console.log('⚠️ blob URL画像のため、データベース保存をスキップ（フォーム送信時に処理）')
        }
      } catch (error) {
        console.error('❌ 写真保存中にエラー:', error)
      }
    }
    // 写真変更時に完成度を再計算（最新の画像配列を直接渡す）
    const currentData = watch()
    // custom_culture は完成度計算から除外（コメント扱い）
    const { custom_culture, ...currentDataWithoutCustomCulture } = currentData || {}

    // 新規ユーザー判定（画像変更時）
    const urlParams = new URLSearchParams(window.location.search)
    const isFromSignup = urlParams.get('from') === 'signup'
    const isNewUserForImage = isFromSignup

    calculateProfileCompletion({
      ...currentDataWithoutCustomCulture,
      hobbies: selectedHobbies, // 状態から直接取得
      personality: selectedPersonality, // 状態から直接取得
      // 画像削除時はavatar_urlをnullに設定
      avatar_url: newImages.length > 0 ? 'has_images' : null
    }, newImages, 'image-change', isNewUserForImage)
    
    // 写真変更完了フラグをリセット
    setTimeout(() => {
      setIsImageChanging(false)
      console.log('📸 写真変更完了：デバウンス計算を再有効化')
    }, 100)
  }, [user, supabase, profileImages, watch, selectedHobbies, selectedPersonality, calculateProfileCompletion])

  // ALL useEffect hooks must be here (after all other hooks)
  // 強制初期化 - 複数のトリガーで確実に実行
  useEffect(() => {
    console.log('🔍 Page load check - user:', user?.id)
    
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const hasType = urlParams.get('type')
      const hasNickname = urlParams.get('nickname')
      
      console.log('🌐 Current URL:', window.location.href)
      console.log('🔑 Type parameter:', hasType)
      console.log('👤 Nickname parameter:', hasNickname)
      
      // MyPageからの遷移をチェック
      const isFromMyPageParam = urlParams.get('fromMyPage') === 'true'
      
      console.log('🔍 URL PARAMETER ANALYSIS:', {
        'fromMyPage param': urlParams.get('fromMyPage'),
        'isFromMyPageParam': isFromMyPageParam,
        'hasType': hasType,
        'hasNickname': hasNickname,
        'all params': Array.from(urlParams.entries())
      })
      
      // 新規登録フロー判定：typeとnicknameのパラメータがあり、かつMyPageからの遷移でない場合のみ新規登録
      const isSignupFlow = hasType && hasNickname && !isFromMyPageParam
      console.log('🚨 新規登録フロー判定:', { 
        hasType, 
        hasNickname, 
        isFromMyPageParam,
        isSignupFlow 
      })
      
      // 🚨 新規登録フロー検出時のみ既存データを完全クリア（MyPageからの遷移は除外）
      const enableProfileDeletion = isSignupFlow && !isFromMyPageParam
      console.log('⚠️ プロフィール削除機能:', enableProfileDeletion ? '有効' : '無効')
      
      if (enableProfileDeletion) {
        console.log('🚨 真の新規登録フロー検出！セキュアなプロフィール初期化開始')
        if (user) {
          secureProfileInitialization()
        } else {
          console.log('⏳ ユーザー認証待ち...')
          // ユーザー認証を待つ間隔実行
          const checkUser = setInterval(() => {
            if (user) {
              console.log('👤 認証完了 - 遅延セキュア初期化実行')
              secureProfileInitialization()
              clearInterval(checkUser)
            }
          }, 500)
          
          // 5秒後にタイムアウト
          setTimeout(() => clearInterval(checkUser), 5000)
        }
      } else if (isFromMyPageParam) {
        console.log('✅ MyPageからの安全な遷移検出 - データ削除をスキップ')
      }
    }
  }, [user])

  // プレビューウィンドウからのメッセージを受信 & localStorageを監視
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.action === 'updateProfile') {
        console.log('🎯 Received update profile message from preview window')
        executeProfileUpdate()
      }
    }

    const checkLocalStorageUpdate = () => {
      const shouldUpdate = localStorage.getItem('updateProfile')
      const timestamp = localStorage.getItem('updateProfileTimestamp')
      
      if (shouldUpdate === 'true' && timestamp) {
        const updateTime = parseInt(timestamp)
        const currentTime = Date.now()
        
        // 5秒以内のリクエストのみ有効とする
        if (currentTime - updateTime < 5000) {
          console.log('🎯 Detected profile update request from localStorage')
          localStorage.removeItem('updateProfile')
          localStorage.removeItem('updateProfileTimestamp')
          executeProfileUpdate()
        }
      }
    }

    const executeProfileUpdate = () => {
      console.log('🎯 executeProfileUpdate called - checking localStorage data')
      
      // プレビューからのlocalStorageデータを確認
      const previewOptionalData = localStorage.getItem('previewOptionalData')
      const previewExtendedInterests = localStorage.getItem('previewExtendedInterests')
      
      console.log('🔍 localStorage previewOptionalData:', previewOptionalData)
      console.log('🔍 localStorage previewExtendedInterests:', previewExtendedInterests)
      
      if (previewOptionalData) {
        try {
          const parsedData = JSON.parse(previewOptionalData)
          console.log('🚨 occupation:', parsedData.occupation)
          console.log('🚨 height:', parsedData.height)
          console.log('🚨 body_type:', parsedData.body_type)
          console.log('🚨 marital_status:', parsedData.marital_status)
          console.log('🚨 city:', parsedData.city)
          
          // フォームの値を更新
          setValue('occupation', parsedData.occupation || 'none')
          setValue('height', parsedData.height || undefined)
          setValue('body_type', parsedData.body_type || 'average')
          setValue('marital_status', parsedData.marital_status || 'single')
          setValue('city', parsedData.city || '')
        } catch (error) {
          console.error('❌ Error parsing localStorage data:', error)
        }
      }
      
      // 短い遅延の後でフォーム送信を実行（値の更新を確実にするため）
      setTimeout(() => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
        if (submitButton) {
          console.log('🎯 Clicking submit button after localStorage data processing')
          submitButton.click()
        }
      }, 100)
    }

    // メッセージリスナーを設定
    window.addEventListener('message', handleMessage)
    
    // localStorageを定期的にチェック
    const storageCheck = setInterval(checkLocalStorageUpdate, 1000)
    
    // 初回チェック
    checkLocalStorageUpdate()

    return () => {
      window.removeEventListener('message', handleMessage)
      clearInterval(storageCheck)
    }
  }, [handleSubmit])

  // 追加の安全策 - ページロード後に再チェック
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && user) {
        const urlParams = new URLSearchParams(window.location.search)
        const hasType = urlParams.get('type')
        
        // 一時的に無効化
        // if (hasType === 'japanese-female') {
        //   console.log('⏰ 遅延チェック - 強制初期化実行')
        //   forceCompleteReset()
        // }
      }
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [user])

  // Load current user data

  // フォーム入力時のリアルタイム完成度更新（デバウンス付き）
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const subscription = watch((value) => {
      if (value) {
        // 前の計算をキャンセル
        clearTimeout(timeoutId)
        
        // 500ms後に計算実行（デバウンス）
        timeoutId = setTimeout(() => {
          // 写真変更中は計算をスキップ
          if (isImageChanging) {
            console.log('🚫 写真変更中のためデバウンス計算をスキップ')
            return
          }
          
          const currentValues = getValues()
          // custom_culture は完成度計算から除外（コメント扱い）
          const { custom_culture, ...valueWithoutCustomCulture } = value || {}
          calculateProfileCompletion({
            ...valueWithoutCustomCulture,
            birth_date: currentValues.birth_date,
            hobbies: selectedHobbies, // 状態から直接取得
            personality: selectedPersonality, // 状態から直接取得
          }, profileImages)
        }, 500)
      }
    })
    
    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [watch, getValues, profileImages, selectedHobbies, selectedPersonality, calculateProfileCompletion, isImageChanging])

  // selectedHobbies変更時の完成度再計算
  useEffect(() => {
    console.log('🔍 selectedHobbies changed:', selectedHobbies)
    const currentData = watch()
    const { custom_culture, ...currentDataWithoutCustomCulture } = currentData || {}
    calculateProfileCompletion({
      ...currentDataWithoutCustomCulture,
      hobbies: selectedHobbies, // 最新のselectedHobbiesを使用
      personality: selectedPersonality,
    }, profileImages, 'selectedHobbies-change')
  }, [selectedHobbies, watch, selectedPersonality, calculateProfileCompletion, profileImages])

  // 🌐 プロフィールタイプ変更時の言語設定
  useEffect(() => {
    // 日本人女性の場合は強制的に日本語に設定
    if (isJapaneseFemale && currentLanguage !== 'ja') {
      setCurrentLanguage('ja')
      saveLanguagePreference('ja')
      console.log('🌐 Language forced to Japanese for Japanese female user')
    }
  }, [isJapaneseFemale, currentLanguage])

  // Constants and helper functions (moved from top level to after hooks)
  // 国籍の翻訳関数
  const getNationalityLabel = (value: string): string => {
    const nationalityMap: { [key: string]: { [lang: string]: string } } = {
      '日本': { ja: '日本', en: 'Japan', ko: '일본', 'zh-tw': '日本' },
      'アメリカ': { ja: 'アメリカ', en: 'United States', ko: '미국', 'zh-tw': '美國' },
      'イギリス': { ja: 'イギリス', en: 'United Kingdom', ko: '영국', 'zh-tw': '英國' },
      'カナダ': { ja: 'カナダ', en: 'Canada', ko: '캐나다', 'zh-tw': '加拿大' },
      'オーストラリア': { ja: 'オーストラリア', en: 'Australia', ko: '호주', 'zh-tw': '澳洲' },
      'ドイツ': { ja: 'ドイツ', en: 'Germany', ko: '독일', 'zh-tw': '德國' },
      'フランス': { ja: 'フランス', en: 'France', ko: '프랑스', 'zh-tw': '法國' },
      'オランダ': { ja: 'オランダ', en: 'Netherlands', ko: '네덜란드', 'zh-tw': '荷蘭' },
      'イタリア': { ja: 'イタリア', en: 'Italy', ko: '이탈리아', 'zh-tw': '義大利' },
      'スペイン': { ja: 'スペイン', en: 'Spain', ko: '스페인', 'zh-tw': '西班牙' },
      'スウェーデン': { ja: 'スウェーデン', en: 'Sweden', ko: '스웨덴', 'zh-tw': '瑞典' },
      'ノルウェー': { ja: 'ノルウェー', en: 'Norway', ko: '노르웨이', 'zh-tw': '挪威' },
      'デンマーク': { ja: 'デンマーク', en: 'Denmark', ko: '덴마크', 'zh-tw': '丹麥' },
      '韓国': { ja: '韓国', en: 'South Korea', ko: '한국', 'zh-tw': '韓國' },
      '中国': { ja: '中国', en: 'China', ko: '중국', 'zh-tw': '中國' },
      '台湾': { ja: '台湾', en: 'Taiwan', ko: '대만', 'zh-tw': '台灣' },
      'タイ': { ja: 'タイ', en: 'Thailand', ko: '태국', 'zh-tw': '泰國' },
      'シンガポール': { ja: 'シンガポール', en: 'Singapore', ko: '싱가포르', 'zh-tw': '新加坡' },
      'その他': { ja: 'その他', en: 'Other', ko: '기타', 'zh-tw': '其他' },
    }
    return nationalityMap[value]?.[currentLanguage] || value
  }

  // 都道府県の翻訳関数
  const getPrefectureLabel = (value: string): string => {
    const prefectureMap: { [key: string]: { [lang: string]: string } } = {
      '東京都': { ja: '東京都', en: 'Tokyo', ko: '도쿄도', 'zh-tw': '東京都' },
      '神奈川県': { ja: '神奈川県', en: 'Kanagawa', ko: '가나가와현', 'zh-tw': '神奈川縣' },
      '千葉県': { ja: '千葉県', en: 'Chiba', ko: '치바현', 'zh-tw': '千葉縣' },
      '埼玉県': { ja: '埼玉県', en: 'Saitama', ko: '사이타마현', 'zh-tw': '埼玉縣' },
      '大阪府': { ja: '大阪府', en: 'Osaka', ko: '오사카부', 'zh-tw': '大阪府' },
      '京都府': { ja: '京都府', en: 'Kyoto', ko: '교토부', 'zh-tw': '京都府' },
      '兵庫県': { ja: '兵庫県', en: 'Hyogo', ko: '효고현', 'zh-tw': '兵庫縣' },
      '愛知県': { ja: '愛知県', en: 'Aichi', ko: '아이치현', 'zh-tw': '愛知縣' },
      '福岡県': { ja: '福岡県', en: 'Fukuoka', ko: '후쿠오카현', 'zh-tw': '福岡縣' },
      '北海道': { ja: '北海道', en: 'Hokkaido', ko: '홋카이도', 'zh-tw': '北海道' },
      '宮城県': { ja: '宮城県', en: 'Miyagi', ko: '미야기현', 'zh-tw': '宮城縣' },
      '広島県': { ja: '広島県', en: 'Hiroshima', ko: '히로시마현', 'zh-tw': '廣島縣' },
      '静岡県': { ja: '静岡県', en: 'Shizuoka', ko: '시즈오카현', 'zh-tw': '靜岡縣' },
      '茨城県': { ja: '茨城県', en: 'Ibaraki', ko: '이바라키현', 'zh-tw': '茨城縣' },
      '栃木県': { ja: '栃木県', en: 'Tochigi', ko: '도치기현', 'zh-tw': '栃木縣' },
      '群馬県': { ja: '群馬県', en: 'Gunma', ko: '군마현', 'zh-tw': '群馬縣' },
      '新潟県': { ja: '新潟県', en: 'Niigata', ko: '니가타현', 'zh-tw': '新潟縣' },
      '長野県': { ja: '長野県', en: 'Nagano', ko: '나가노현', 'zh-tw': '長野縣' },
      '山梨県': { ja: '山梨県', en: 'Yamanashi', ko: '야마나시현', 'zh-tw': '山梨縣' },
      '岐阜県': { ja: '岐阜県', en: 'Gifu', ko: '기후현', 'zh-tw': '岐阜縣' },
      '三重県': { ja: '三重県', en: 'Mie', ko: '미에현', 'zh-tw': '三重縣' },
      '滋賀県': { ja: '滋賀県', en: 'Shiga', ko: '시가현', 'zh-tw': '滋賀縣' },
      '奈良県': { ja: '奈良県', en: 'Nara', ko: '나라현', 'zh-tw': '奈良縣' },
      '和歌山県': { ja: '和歌山県', en: 'Wakayama', ko: '와카야마현', 'zh-tw': '和歌山縣' },
      '鳥取県': { ja: '鳥取県', en: 'Tottori', ko: '돗토리현', 'zh-tw': '鳥取縣' },
      '島根県': { ja: '島根県', en: 'Shimane', ko: '시마네현', 'zh-tw': '島根縣' },
      '岡山県': { ja: '岡山県', en: 'Okayama', ko: '오카야마현', 'zh-tw': '岡山縣' },
      '山口県': { ja: '山口県', en: 'Yamaguchi', ko: '야마구치현', 'zh-tw': '山口縣' },
      '徳島県': { ja: '徳島県', en: 'Tokushima', ko: '도쿠시마현', 'zh-tw': '德島縣' },
      '香川県': { ja: '香川県', en: 'Kagawa', ko: '가가와현', 'zh-tw': '香川縣' },
      '愛媛県': { ja: '愛媛県', en: 'Ehime', ko: '에히메현', 'zh-tw': '愛媛縣' },
      '高知県': { ja: '高知県', en: 'Kochi', ko: '고치현', 'zh-tw': '高知縣' },
      '佐賀県': { ja: '佐賀県', en: 'Saga', ko: '사가현', 'zh-tw': '佐賀縣' },
      '長崎県': { ja: '長崎県', en: 'Nagasaki', ko: '나가사키현', 'zh-tw': '長崎縣' },
      '熊本県': { ja: '熊本県', en: 'Kumamoto', ko: '구마모토현', 'zh-tw': '熊本縣' },
      '大分県': { ja: '大分県', en: 'Oita', ko: '오이타현', 'zh-tw': '大分縣' },
      '宮崎県': { ja: '宮崎県', en: 'Miyazaki', ko: '미야자키현', 'zh-tw': '宮崎縣' },
      '鹿児島県': { ja: '鹿児島県', en: 'Kagoshima', ko: '가고시마현', 'zh-tw': '鹿兒島縣' },
      '沖縄県': { ja: '沖縄県', en: 'Okinawa', ko: '오키나와현', 'zh-tw': '沖繩縣' },
    }
    return prefectureMap[value]?.[currentLanguage] || value
  }

  // Visit Scheduleの翻訳関数
  const getVisitScheduleLabel = (value: string): string => {
    // 基本的な選択肢の翻訳
    const basicLabels: { [key: string]: { [lang: string]: string } } = {
      'no-entry': { ja: '記入しない', en: 'Not specified', ko: '기입하지 않음', 'zh-tw': '不填寫' },
      'undecided': { ja: 'まだ決まっていない', en: 'Not decided yet', ko: '아직 정하지 않음', 'zh-tw': '尚未決定' },
    }

    // 基本的な選択肢の場合
    if (basicLabels[value]) {
      return basicLabels[value][currentLanguage] || value
    }

    // beyond-YYYY 形式の処理
    if (value.startsWith('beyond-')) {
      const year = value.split('-')[1]
      const labels = {
        ja: `${year}年以降`,
        en: `${year} or later`,
        ko: `${year}년 이후`,
        'zh-tw': `${year}年以後`
      }
      return labels[currentLanguage] || value
    }

    // YYYY-season 形式の処理
    const seasonMatch = value.match(/^(\d{4})-(spring|summer|autumn|winter)$/)
    if (seasonMatch) {
      const [, year, season] = seasonMatch
      const seasonLabels: { [key: string]: { [lang: string]: string } } = {
        spring: { ja: '春（3-5月）', en: 'Spring (Mar-May)', ko: '봄 (3-5월)', 'zh-tw': '春季（3-5月）' },
        summer: { ja: '夏（6-8月）', en: 'Summer (Jun-Aug)', ko: '여름 (6-8월)', 'zh-tw': '夏季（6-8月）' },
        autumn: { ja: '秋（9-11月）', en: 'Autumn (Sep-Nov)', ko: '가을 (9-11월)', 'zh-tw': '秋季（9-11月）' },
        winter: { ja: '冬（12-2月）', en: 'Winter (Dec-Feb)', ko: '겨울 (12-2월)', 'zh-tw': '冬季（12-2月）' }
      }
      const seasonLabel = seasonLabels[season]?.[currentLanguage] || season
      return `${year}年${seasonLabel}`
    }

    return value
  }

  // Visit Schedule選択肢の動的生成（4言語対応）
  const getVisitScheduleOptionsTranslated = () => {
    const options = [
      { value: 'no-entry', label: getVisitScheduleLabel('no-entry') },
      { value: 'undecided', label: getVisitScheduleLabel('undecided') }
    ]

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() // 0-11

    // 現在の季節を判定（春:2-4月、夏:5-7月、秋:8-10月、冬:11-1月）
    const getCurrentSeason = () => {
      if (currentMonth >= 2 && currentMonth <= 4) return 'spring'
      if (currentMonth >= 5 && currentMonth <= 7) return 'summer'
      if (currentMonth >= 8 && currentMonth <= 10) return 'autumn'
      return 'winter'
    }

    const currentSeason = getCurrentSeason()
    const seasons = ['spring', 'summer', 'autumn', 'winter'] as const

    // 今後2年分の選択肢を生成
    for (let year = currentYear; year <= currentYear + 2; year++) {
      seasons.forEach((season, index) => {
        // 現在年の場合、過去の季節は除外
        if (year === currentYear) {
          const currentSeasonIndex = seasons.indexOf(currentSeason)
          if (index <= currentSeasonIndex) return // 現在季節以前は除外
        }

        const value = `${year}-${season}`
        const label = getVisitScheduleLabel(value)
        options.push({ value, label })
      })
    }

    // 2年以降の選択肢
    options.push({
      value: `beyond-${currentYear + 2}`,
      label: getVisitScheduleLabel(`beyond-${currentYear + 2}`)
    })

    return options
  }

  // 国籍オプション（プロフィールタイプに応じて順序変更）
  const getNationalities = () => {
    if (isJapaneseFemale) {
      // 日本人女性の場合、日本を最初に
      return [
        { value: '日本', label: getNationalityLabel('日本') },
        { value: 'アメリカ', label: getNationalityLabel('アメリカ') },
        { value: 'イギリス', label: getNationalityLabel('イギリス') },
        { value: 'カナダ', label: getNationalityLabel('カナダ') },
        { value: 'オーストラリア', label: getNationalityLabel('オーストラリア') },
        { value: 'ドイツ', label: getNationalityLabel('ドイツ') },
        { value: 'フランス', label: getNationalityLabel('フランス') },
        { value: 'オランダ', label: getNationalityLabel('オランダ') },
        { value: 'イタリア', label: getNationalityLabel('イタリア') },
        { value: 'スペイン', label: getNationalityLabel('スペイン') },
        { value: '韓国', label: getNationalityLabel('韓国') },
        { value: '中国', label: getNationalityLabel('中国') },
        { value: 'その他', label: getNationalityLabel('その他') },
      ]
    } else {
      // 外国人男性の場合、よくある国を最初に
      return [
        { value: 'アメリカ', label: getNationalityLabel('アメリカ') },
        { value: 'イギリス', label: getNationalityLabel('イギリス') },
        { value: 'カナダ', label: getNationalityLabel('カナダ') },
        { value: 'オーストラリア', label: getNationalityLabel('オーストラリア') },
        { value: 'ドイツ', label: getNationalityLabel('ドイツ') },
        { value: 'フランス', label: getNationalityLabel('フランス') },
        { value: 'イタリア', label: getNationalityLabel('イタリア') },
        { value: 'スペイン', label: getNationalityLabel('スペイン') },
        { value: 'オランダ', label: getNationalityLabel('オランダ') },
        { value: 'スウェーデン', label: getNationalityLabel('スウェーデン') },
        { value: 'ノルウェー', label: getNationalityLabel('ノルウェー') },
        { value: 'デンマーク', label: getNationalityLabel('デンマーク') },
        { value: '韓国', label: getNationalityLabel('韓国') },
        { value: '台湾', label: getNationalityLabel('台湾') },
        { value: 'タイ', label: getNationalityLabel('タイ') },
        { value: 'シンガポール', label: getNationalityLabel('シンガポール') },
        { value: 'その他', label: getNationalityLabel('その他') },
      ]
    }
  }

  const NATIONALITIES = getNationalities()

  // 都道府県オプション（翻訳対応）
  const getPrefectures = () => [
    '東京都', '神奈川県', '千葉県', '埼玉県', '大阪府', '京都府', '兵庫県', '愛知県',
    '福岡県', '北海道', '宮城県', '広島県', '静岡県', '茨城県', '栃木県', '群馬県',
    '新潟県', '長野県', '山梨県', '岐阜県', '三重県', '滋賀県', '奈良県', '和歌山県',
    '鳥取県', '島根県', '岡山県', '山口県', '徳島県', '香川県', '愛媛県', '高知県',
    '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  ].map(prefecture => ({
    value: prefecture,
    label: getPrefectureLabel(prefecture)
  }))
  
  const PREFECTURES = getPrefectures()

  // デバッグ用ログ
  console.log('Profile type debug:', {
    profileType,
    isForeignMale,
    isJapaneseFemale,
    searchParams: searchParams.toString()
  })

  // 緊急対応：avatar_urlを強制削除
  const forceRemoveAvatar = async () => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)
      
      if (error) {
        console.error('Avatar削除エラー:', error)
      } else {
        console.log('Avatar強制削除完了')
        window.location.reload()
      }
    } catch (error) {
      console.error('Avatar削除処理エラー:', error)
    }
  }

  // 新規登録時の安全なプロフィール初期化（セキュリティ強化版）
  const secureProfileInitialization = async () => {
    if (!user?.id) {
      console.error('❌ User ID not available for profile initialization')
      return
    }

    try {
      console.log('🔐 安全なプロフィール初期化開始 - User ID:', user.id)
      
      // 🛡️ セキュリティ強化: ユーザーID検証
      console.log('🔒 SECURITY: Validating user authentication')
      const { data: authUser, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser.user || authUser.user.id !== user.id) {
        console.error('🚨 SECURITY BREACH: User ID mismatch or invalid auth', {
          authError,
          authUserId: authUser?.user?.id,
          providedUserId: user.id
        })
        return
      }
      console.log('✅ User authentication validated')
      
      // まずプロフィールの存在確認（該当ユーザーのデータのみ）
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, created_at, email') // セキュリティ確認のためemailも取得
        .eq('id', user.id) // 🛡️ 厳格なユーザーID一致確認
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116以外のエラーは処理停止
        console.error('❌ Profile existence check error:', checkError)
        return
      }
      
      if (existingProfile) {
        console.log('⚠️ 既存プロフィール検出 - 安全な初期化を実行')
        console.log('🔒 SECURITY: Profile belongs to authenticated user - proceeding with DELETE+INSERT')
        
        // 🧹 新規登録時: 全フィールドを確実にNULLクリア（「新しい紙に完全リセット」アプローチ）
        console.log('🧹 NEW SIGNUP: Clearing ALL user data fields to NULL state')
        
        // 確実に存在するフィールドのみをNULLに設定（段階的アプローチ）
        const { error: resetError } = await supabase
          .from('profiles')
          .update({
            // 🧹 確実に存在する基本フィールドのみクリア
            name: null,
            bio: null,
            interests: null,
            avatar_url: null,
            city: null,
            
            // 注意: age, birth_date, gender, nationality, prefecture, residence等は
            // 存在しない可能性があるため除外
            // profile_image, profile_images, images等も除外
          })
          .eq('id', user.id)
        
        if (resetError) {
          console.error('❌ Failed to reset profile to NULL state:', resetError)
          console.error('🔍 Reset error details:', {
            message: resetError.message,
            details: resetError.details,
            hint: resetError.hint,
            code: resetError.code
          })
          return
        }
        
        console.log('✅ PROFILE COMPLETELY RESET: All user data cleared to NULL')
        console.log('🧹 Profile reset completed:', {
          method: 'SAFE_NULL_UPDATE',
          clearedFields: ['name', 'bio', 'interests', 'avatar_url', 'city'],
          note: 'Only existing columns updated to prevent schema errors',
          preservedFields: ['id', 'email', 'created_at'],
          userId: user.id,
          success: true
        })
      } else {
        console.log('ℹ️ 新規プロフィール - 初期化不要')
      }
      
      // フォームを完全に初期化（URLパラメータから基本情報のみ設定）
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        
        reset({
          nickname: urlParams.get('nickname') || '',
          gender: (urlParams.get('gender') as 'male' | 'female') || 'female',
          age: urlParams.get('age') ? parseInt(urlParams.get('age')!) : 18,
          birth_date: urlParams.get('birth_date') || '', // 🔧 URLパラメータから生年月日を設定
          nationality: urlParams.get('nationality') || '',
          prefecture: urlParams.get('prefecture') || '',
          city: '', // 完全に空
          // 外国人男性向け新フィールド
          planned_prefectures: [],
          visit_schedule: 'no-entry',
          travel_companion: 'noEntry',
          occupation: 'none', // デフォルト値設定
          height: undefined, // 🔧 数値フィールドなのでundefined
          body_type: 'none', // デフォルト値設定
          marital_status: 'none', // デフォルト値設定
          self_introduction: '', // 空
          hobbies: [], // 空配列
          personality: [], // 空配列
          custom_culture: '' // 空
        })
        
        // 状態も初期化
        setSelectedHobbies([])
        setSelectedPersonality([])
        setSelectedPlannedPrefectures([])
        setProfileImages([])

        // 新規ユーザーの場合のみ編集履歴をクリア
        sessionStorage.removeItem('imageEditHistory')
        console.log('🔄 新規ユーザー: 画像編集履歴をクリア')
        
        console.log('✅ セキュアな新規登録状態でフォーム初期化完了')
        
        // 完成度を再計算（フォームsetValue完了後に実行）
        setTimeout(() => {
          // フォームの実際の値を取得して計算
          const actualFormValues = getValues()
          console.log('🚀 Initial completion calculation with actual form values:', actualFormValues)
          console.log('🔍 Form nationality vs URL nationality:', {
            form_nationality: actualFormValues.nationality,
            url_nationality: urlParams.get('nationality'),
            should_match: true
          })
          calculateProfileCompletion(actualFormValues, profileImages, 'FORM_SETUP_1500MS')
        }, 1500) // フォーム設定完了を確実に待つ
      }
      
    } catch (error) {
      console.error('❌ Secure profile initialization error:', error)
    }
  }

  // 強制初期化 - 複数のトリガーで確実に実行
  useEffect(() => {
    console.log('🔍 Page load check - user:', user?.id)
    
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const hasType = urlParams.get('type')
      const hasNickname = urlParams.get('nickname')
      
      console.log('🌐 Current URL:', window.location.href)
      console.log('🔑 Type parameter:', hasType)
      console.log('👤 Nickname parameter:', hasNickname)
      
      // MyPageからの遷移をチェック
      const isFromMyPageParam = urlParams.get('fromMyPage') === 'true'
      
      console.log('🔍 URL PARAMETER ANALYSIS:', {
        'fromMyPage param': urlParams.get('fromMyPage'),
        'isFromMyPageParam': isFromMyPageParam,
        'hasType': hasType,
        'hasNickname': hasNickname,
        'all params': Array.from(urlParams.entries())
      })
      
      // 新規登録フロー判定：typeとnicknameのパラメータがあり、かつMyPageからの遷移でない場合のみ新規登録
      const isSignupFlow = hasType && hasNickname && !isFromMyPageParam
      console.log('🚨 新規登録フロー判定:', { 
        hasType, 
        hasNickname, 
        isFromMyPageParam,
        isSignupFlow 
      })
      
      // 🚨 新規登録フロー検出時のみ既存データを完全クリア（MyPageからの遷移は除外）
      const enableProfileDeletion = isSignupFlow && !isFromMyPageParam
      console.log('⚠️ プロフィール削除機能:', enableProfileDeletion ? '有効' : '無効')
      
      if (enableProfileDeletion) {
        console.log('🚨 真の新規登録フロー検出！セキュアなプロフィール初期化開始')
        if (user) {
          secureProfileInitialization()
        } else {
          console.log('⏳ ユーザー認証待ち...')
          // ユーザー認証を待つ間隔実行
          const checkUser = setInterval(() => {
            if (user) {
              console.log('👤 認証完了 - 遅延セキュア初期化実行')
              secureProfileInitialization()
              clearInterval(checkUser)
            }
          }, 500)
          
          // 5秒後にタイムアウト
          setTimeout(() => clearInterval(checkUser), 5000)
        }
      } else if (isFromMyPageParam) {
        console.log('✅ MyPageからの安全な遷移検出 - データ削除をスキップ')
      }
    }
  }, [user])

  // プレビューウィンドウからのメッセージを受信 & localStorageを監視
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.action === 'updateProfile') {
        console.log('🎯 Received update profile message from preview window')
        executeProfileUpdate()
      }
    }

    const checkLocalStorageUpdate = () => {
      const shouldUpdate = localStorage.getItem('updateProfile')
      const timestamp = localStorage.getItem('updateProfileTimestamp')
      
      if (shouldUpdate === 'true' && timestamp) {
        const updateTime = parseInt(timestamp)
        const currentTime = Date.now()
        
        // 5秒以内のリクエストのみ有効とする
        if (currentTime - updateTime < 5000) {
          console.log('🎯 Detected profile update request from localStorage')
          localStorage.removeItem('updateProfile')
          localStorage.removeItem('updateProfileTimestamp')
          executeProfileUpdate()
        }
      }
    }

    const executeProfileUpdate = () => {
      console.log('🎯 executeProfileUpdate called - checking localStorage data')
      
      // プレビューからのlocalStorageデータを確認
      const previewOptionalData = localStorage.getItem('previewOptionalData')
      const previewExtendedInterests = localStorage.getItem('previewExtendedInterests')
      
      console.log('🔍 localStorage previewOptionalData:', previewOptionalData)
      console.log('🔍 localStorage previewExtendedInterests:', previewExtendedInterests)
      
      if (previewOptionalData) {
        try {
          const parsedData = JSON.parse(previewOptionalData)
          console.log('🚨 occupation:', parsedData.occupation)
          console.log('🚨 height:', parsedData.height)
          console.log('🚨 body_type:', parsedData.body_type)
          console.log('🚨 marital_status:', parsedData.marital_status)
          console.log('🚨 city:', parsedData.city)
          
          // フォームの値を更新
          setValue('occupation', parsedData.occupation || 'none')
          setValue('height', parsedData.height || undefined)
          setValue('body_type', parsedData.body_type || 'average')
          setValue('marital_status', parsedData.marital_status || 'single')
          setValue('city', parsedData.city || '')
        } catch (error) {
          console.error('❌ Error parsing localStorage data:', error)
        }
      }
      
      // 短い遅延の後でフォーム送信を実行（値の更新を確実にするため）
      setTimeout(() => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
        if (submitButton) {
          console.log('🎯 Clicking submit button after localStorage data processing')
          submitButton.click()
        }
      }, 100)
    }

    // メッセージリスナーを設定
    window.addEventListener('message', handleMessage)
    
    // localStorageを定期的にチェック
    const storageCheck = setInterval(checkLocalStorageUpdate, 1000)
    
    // 初回チェック
    checkLocalStorageUpdate()

    return () => {
      window.removeEventListener('message', handleMessage)
      clearInterval(storageCheck)
    }
  }, [handleSubmit])

  // 追加の安全策 - ページロード後に再チェック
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && user) {
        const urlParams = new URLSearchParams(window.location.search)
        const hasType = urlParams.get('type')
        
        // 一時的に無効化
        // if (hasType === 'japanese-female') {
        //   console.log('⏰ 遅延チェック - 強制初期化実行')
        //   forceCompleteReset()
        // }
      }
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [user])

  const forceCompleteReset = async () => {
    if (!user) return
    
    try {
      console.log('🧹 全データクリア中...')
      
      // より包括的なデータクリア
      const { error } = await supabase
        .from('profiles')
        .update({
          name: null,
          bio: null,
          interests: null,
          height: null,
          avatar_url: null,
          personality: null,
          custom_culture: null,
          hobbies: null,
          marital_status: null
        })
        .eq('id', user.id)
      
      if (error) {
        console.error('❌ データクリアエラー:', error)
      } else {
        console.log('✅ 完全初期化完了 - すべてのフィールドをクリア')
        
        // フロントエンドの状態もクリア
        setProfileImages([])
        setSelectedHobbies([])
        setSelectedPersonality([])
        setSelectedPlannedPrefectures([])
        
        // フォームをリセット
        reset({
          nickname: '',
          self_introduction: '',
          gender: 'female',
          age: 18,
          planned_prefectures: [],
          visit_schedule: 'no-entry',
          travel_companion: 'noEntry',
          hobbies: [],
          personality: [],
          custom_culture: ''
        })
        
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (error) {
      console.error('初期化処理エラー:', error)
    }
  }

  // Load current user data
  useEffect(() => {
    console.log('🚀 useEffect開始 - ユーザー:', user?.id)
    const loadUserData = async () => {
      // テストモードの場合は認証をスキップ
      if (isTestMode() && !user) {
        console.log('🧪 テストモード検出 - 認証をスキップして初期化処理を実行')
        
        // マイページからの遷移の場合はlocalStorageからデータを読み込み
        const urlParams = new URLSearchParams(window.location.search)
        const isFromMyPage = urlParams.get('fromMyPage') === 'true'
        
        let initialData
        if (isFromMyPage) {
          console.log('🔄 マイページからの遷移 - localStorageからデータを読み込み')
          
          // localStorageからデータを取得
          const savedProfile = localStorage.getItem('updateProfile') || localStorage.getItem('previewCompleteData')
          if (savedProfile) {
            try {
              const profileData = JSON.parse(savedProfile)
              console.log('📦 localStorage from profile data:', profileData)
              
              initialData = {
                nickname: profileData.name || profileData.nickname || '',
                gender: profileData.gender || 'male',
                birth_date: profileData.birth_date || '',
                age: profileData.age || 18,
                nationality: profileData.nationality || '',
                prefecture: profileData.prefecture || profileData.residence || '',
                self_introduction: profileData.bio || profileData.self_introduction || '',
                hobbies: profileData.hobbies || profileData.interests || [],
                personality: profileData.personality || [],
                // 外国人男性向けフィールド
                planned_prefectures: profileData.planned_prefectures || [],
                visit_schedule: profileData.visit_schedule || 'no-entry',
                travel_companion: profileData.travel_companion || 'noEntry',
                japanese_level: profileData.japanese_level || 'none',
                planned_stations: profileData.planned_stations || [],
                // オプションフィールド
                occupation: profileData.occupation || 'none',
                height: profileData.height,
                body_type: profileData.body_type || 'none',
                marital_status: profileData.marital_status || 'none',
                english_level: profileData.english_level || 'none',
                city: profileData.city || ''
              }
            } catch (error) {
              console.error('❌ localStorage解析エラー:', error)
              initialData = null
            }
          }
        }
        
        // localStorageにデータがない場合はURLパラメータから取得
        if (!initialData) {
          console.log('🌐 URLパラメータからデータを取得')
          initialData = {
            nickname: urlParams.get('nickname') || '',
            gender: (urlParams.get('gender') as 'male' | 'female') || 'male',
            birth_date: urlParams.get('birth_date') || '',
            age: urlParams.get('age') ? parseInt(urlParams.get('age')!) : 18,
            nationality: urlParams.get('nationality') || '',
            prefecture: urlParams.get('prefecture') || '',
            self_introduction: '',
            hobbies: [],
            personality: [],
            // 外国人男性向けフィールド
            planned_prefectures: [],
            visit_schedule: 'no-entry',
            travel_companion: 'noEntry',
            // オプションフィールド
            occupation: 'none',
            height: undefined,
            body_type: 'none',
            marital_status: 'none' as 'none' | 'single' | 'married',
            japanese_level: 'none',
            english_level: 'none',
            city: ''
          }
        }
        
        console.log('🧪 テストモード - フォーム値設定:', initialData)
        
        // フォームを初期化
        reset({
          nickname: initialData.nickname,
          gender: initialData.gender,
          birth_date: initialData.birth_date,
          age: initialData.age,
          nationality: initialData.nationality,
          prefecture: initialData.prefecture,
          city: initialData.city,
          planned_prefectures: initialData.planned_prefectures,
          visit_schedule: initialData.visit_schedule,
          travel_companion: initialData.travel_companion,
          occupation: initialData.occupation,
          height: initialData.height,
          body_type: initialData.body_type,
          marital_status: initialData.marital_status as 'none' | 'single' | 'married',
          japanese_level: initialData.japanese_level,
          english_level: initialData.english_level,
          self_introduction: initialData.self_introduction,
          hobbies: initialData.hobbies,
          personality: initialData.personality,
          custom_culture: ''
        })
        
        // 状態も同期
        setSelectedHobbies(initialData.hobbies)
        setSelectedPersonality(initialData.personality)
        setSelectedPlannedPrefectures(initialData.planned_prefectures)
        
        // 画像も設定（localStorageから取得）
        if (isFromMyPage) {
          try {
            const savedImages = localStorage.getItem('currentProfileImages')
            if (savedImages) {
              const images = JSON.parse(savedImages)
              setProfileImages(images)
              console.log('🖼️ localStorage画像データを復元:', images)
            }
          } catch (error) {
            console.error('❌ 画像データ復元エラー:', error)
          }
        }
        
        setIsLoading(false)
        setUserLoading(false)
        
        return
      }
      
      // AuthGuardが認証確認中の場合は待機
      if (!user) {
        console.log('⏳ ユーザー認証確認中 - AuthGuardの処理完了を待機')
        return
      }
      
      console.log('✅ ユーザー確認完了 - プロフィール読み込み開始')

      try {
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          console.error('Profile load error:', profileError)
          setError('プロフィール情報の読み込みに失敗しました')
          setUserLoading(false)
          return
        }

        console.log('========== PROFILE EDIT DEBUG START ==========')
        console.log('Loaded profile data:', profile)
        console.log('🔍 Critical fields debug (Edit Page):')
        console.log('  - name:', profile?.name)
        console.log('  - bio:', profile?.bio)
        console.log('  - age:', profile?.age)
        console.log('  - birth_date:', profile?.birth_date)
        console.log('  - city (raw):', profile?.city, typeof profile?.city)
        console.log('  - interests (raw):', profile?.interests)
        console.log('  - height:', profile?.height)
        console.log('  - occupation:', profile?.occupation)
        console.log('  - body_type:', profile?.body_type)
        console.log('  - marital_status:', profile?.marital_status)
        
        console.log('🔍 DETAILED FIELD VALUES FOR MYPAGE COMPARISON:')
        console.log('Birth date related fields:', {
          birth_date: profile.birth_date,
          date_of_birth: profile.date_of_birth,
          birthday: profile.birthday,
          dob: profile.dob,
          age: profile.age
        })
        console.log('All occupation related fields:', {
          occupation: profile.occupation,
          job: profile.job,
          work: profile.work
        })
        console.log('All height related fields:', {
          height: profile.height,
          height_cm: profile.height_cm
        })
        console.log('========== PROFILE EDIT DEBUG END ==========')

        // 👤 URLにtypeパラメータがない場合、プロフィールから判定
        if (!profileType) {
          const detectedType = profile.gender === 'male' && profile.nationality && profile.nationality !== '日本'
            ? 'foreign-male'
            : 'japanese-female'
          setUserBasedType(detectedType)
          console.log('🔍 Auto-detected profile type:', {
            gender: profile.gender,
            nationality: profile.nationality,
            detectedType,
            reasoning: profile.gender === 'male' ? 'Male gender detected' : 'Female or no gender detected'
          })
        }

        // 🔍 cityフィールドからJSONデータをパースして各フィールドに分割
        let parsedOptionalData: {
          city?: string;
          occupation?: string;
          height?: number;
          body_type?: string;
          marital_status?: string;
        } = {}
        
        console.log('🔍 CITY FIELD PARSING ANALYSIS:')
        console.log('Raw city field:', profile.city)
        console.log('City field type:', typeof profile.city)
        console.log('Starts with {:', profile.city?.startsWith('{'))
        
        if (profile.city && typeof profile.city === 'string') {
          try {
            // JSONデータの場合はパース
            if (profile.city.startsWith('{')) {
              parsedOptionalData = JSON.parse(profile.city)
              console.log('📋 Parsed optional data from city field:', parsedOptionalData)
              console.log('📋 Individual parsed values:', {
                city: parsedOptionalData.city,
                occupation: parsedOptionalData.occupation,
                height: parsedOptionalData.height,
                body_type: parsedOptionalData.body_type,
                marital_status: parsedOptionalData.marital_status
              })
            } else {
              // 通常の文字列の場合はそのまま使用
              parsedOptionalData = { city: profile.city }
              console.log('📍 Using city as regular string:', parsedOptionalData)
            }
          } catch (e) {
            console.log('⚠️ Could not parse city field as JSON, treating as regular city data')
            console.log('Parse error:', e)
            parsedOptionalData = { city: profile.city }
          }
        } else {
          console.log('📍 No city field data to parse')
        }
        
        // マイページからの遷移かどうかを判定
        const urlParams = new URLSearchParams(window.location.search)
        const isFromMyPage = urlParams.get('fromMyPage') === 'true'
        
        console.log('🔍 MyPage Transition Check:')
        console.log('  - fromMyPage param:', isFromMyPage)
        console.log('  - Current URL:', window.location.href)
        console.log('  - Should skip signup data:', isFromMyPage)
        
        // マイページからの遷移の場合はURL パラメータからの初期化をスキップ
        let signupData = {}
        if (!isFromMyPage) {
          // 仮登録からの遷移の場合、URLパラメータからも初期値を取得
          signupData = {
            nickname: urlParams.get('nickname'),
            gender: urlParams.get('gender'),
            birth_date: urlParams.get('birth_date'),
            age: urlParams.get('age'),
            nationality: urlParams.get('nationality'),
            prefecture: urlParams.get('prefecture')
          }
          
          // デバッグ用ログ
          console.log('🔍 URL Parameters from signup:', {
            nationality: urlParams.get('nationality'),
            prefecture: urlParams.get('prefecture'),
            all_params: Object.fromEntries(urlParams.entries())
          })
        }
        
        // プロフィールタイプに基づくデフォルト値（仮登録データを優先）
        const getDefaults = () => {
          const baseDefaults = {
            gender: (signupData as any).gender || profile.gender || (isForeignMale ? 'male' : 'female'),
            nationality: (signupData as any).nationality || profile.nationality || (isJapaneseFemale ? '日本' : isForeignMale ? 'アメリカ' : ''),
            prefecture: (signupData as any).prefecture || profile.prefecture || '',
            birth_date: (signupData as any).birth_date || profile.birth_date || '',
            age: (signupData as any).age ? parseInt((signupData as any).age) : profile.age || 18,
          }
          
          console.log('🏗️ getDefaults calculation:', {
            signupData_nationality: (signupData as any).nationality,
            profile_nationality: profile.nationality,
            isForeignMale,
            final_nationality: baseDefaults.nationality
          })
          
          return baseDefaults
        }

        const defaults = getDefaults()
        
        // 新規登録フローかどうかを判定（マイページからの遷移は除外）
        const hasSignupParams = urlParams.get('type') === 'japanese-female' || urlParams.get('type') === 'foreign-male'
        const isFromSignup = hasSignupParams && !isFromMyPage
        
        console.log('=== Profile Edit Debug ===')
        console.log('Current URL:', window.location.href)
        console.log('Document referrer:', document.referrer)
        console.log('Is from mypage:', isFromMyPage)
        console.log('Has signup params:', hasSignupParams)
        console.log('isFromSignup:', isFromSignup)
        console.log('Signup data:', signupData)
        console.log('isFromMyPage param:', isFromMyPage)
        
        console.log('🚨 DATA COMPARISON DEBUG - Profile Edit vs MyPage')
        console.log('🔍 Raw profile data from DB (Profile Edit):')
        console.log('  - name:', profile.name)
        console.log('  - bio:', profile.bio) 
        console.log('  - age:', profile.age)
        console.log('  - birth_date:', profile.birth_date)
        console.log('  - city (raw):', profile.city)
        console.log('  - interests (raw):', profile.interests)
        console.log('  - height:', profile.height)
        console.log('  - occupation:', profile.occupation)
        console.log('  - marital_status:', profile.marital_status)
        console.log('  - body_type:', profile.body_type)
        
        console.log('🔍 Parsed optional data (Profile Edit):', parsedOptionalData)
        
        // 新規ユーザーかどうかを判定（マイページからの場合は必ず既存ユーザー扱い）
        // 🚨 危険なロジック修正: 茶道選択ユーザーを誤って新規ユーザー扱いしないよう修正
        const isTestData = profile.bio?.includes('テスト用の自己紹介です') || 
                          profile.name === 'テスト'
        // (profile.interests?.length === 1 && profile.interests[0] === '茶道') <- 削除：正当なユーザーを誤判定する危険
        
        console.log('🚨 CRITICAL: New user determination logic:')
        console.log('  - Original isTestData (with 茶道):', 
                    profile.bio?.includes('テスト用の自己紹介です') || 
                    profile.name === 'テスト' ||
                    (profile.interests?.length === 1 && profile.interests[0] === '茶道'))
        console.log('  - Safer isTestData (without 茶道):', isTestData)
        console.log('  - Profile has bio:', !!profile.bio)
        console.log('  - Profile has interests:', !!profile.interests)  
        console.log('  - Profile has name:', !!profile.name)
        
        // 🔒 セキュリティ強化: 新規ユーザー判定の厳格化
        const isNewUser = isFromMyPage ? false : 
          (isFromSignup || // 新規登録フローの場合は必ず新規扱い
           ((!profile.bio && !profile.interests && !profile.name && !profile.avatar_url && !profile.profile_images) || isTestData))
        
        console.log('🔍 New User Determination Debug:')
        console.log('  - isFromMyPage:', isFromMyPage)
        console.log('  - isTestData:', isTestData)
        console.log('  - isFromSignup:', isFromSignup)
        console.log('  - profile.bio exists:', !!profile.bio)
        console.log('  - profile.interests exists:', !!profile.interests)
        console.log('  - profile.name exists:', !!profile.name)
        console.log('  - FINAL isNewUser result:', isNewUser)

        // 新規登録フローの場合は必ずプロフィールをクリア（一時的に無効化）
        // このブロックは現在無効化されています
        /*
        if (isFromSignup && user?.id) {
          console.log('新規登録フロー検出 - プロフィールデータをクリア')
          await supabase
            .from('profiles')
            .update({
              name: null,
              bio: null,
              interests: null,
              height: null,
              avatar_url: null,
              personality: null
            })
            .eq('id', user.id)
          
          // データベースからプロフィールを再取得してクリーンな状態にする
          const { data: cleanProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (cleanProfile) {
            profile = cleanProfile
            console.log('プロフィールクリア完了:', profile)
          }
        }
        */
        
        // テストデータまたは既存データクリア（新規登録以外でも実行）
        // 🚨 危険なロジック修正: 茶道選択ユーザーのデータを誤ってクリアしないよう修正
        const isTestData2 = profile.bio?.includes('テスト用の自己紹介です') || 
                          profile.name === 'テスト'
        // (profile.interests?.length === 1 && profile.interests[0] === '茶道') <- 削除：正当なユーザーデータを誤削除する危険
        
        console.log('🚨 CRITICAL: Test data clear condition check:')
        console.log('  - isTestData2:', isTestData2)
        console.log('  - profile.name === "masamizu":', profile.name === 'masamizu')
        console.log('  - isFromMyPage:', isFromMyPage)
        console.log('  - Should clear data:', (isTestData2 || profile.name === 'masamizu') && user?.id)
        console.log('  - DANGER: This will clear data even from MyPage!')
        
        // 🚨 セキュリティ問題：MyPageからの遷移でもデータがクリアされる可能性
        // MyPageからの遷移時はデータクリアを防ぐ
        const shouldClearData = (isTestData2 || profile.name === 'masamizu') && user?.id && !isFromMyPage
        
        console.log('🛡️ SECURITY FIX: Modified condition:')
        console.log('  - shouldClearData (with MyPage protection):', shouldClearData)
        
        if (shouldClearData) {
          // 🛡️ セキュリティ強化: テストデータクリア時の追加検証
          console.log('🔒 SECURITY: Applying additional verification for test data clear')
          const { data: authUser } = await supabase.auth.getUser()
          
          await supabase
            .from('profiles')
            .update({
              name: null,
              bio: null,
              interests: null,
              height: null,
              avatar_url: null
            })
            .eq('id', user.id) // 🛡️ 主要条件：ユーザーID一致
            .eq('email', authUser?.user?.email) // 🛡️ 追加条件：email一致
          
          const { data: cleanProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (cleanProfile) {
            profile = cleanProfile
          }
        }

        // ニックネーム（仮登録から）
        const nicknameValue = (signupData as any).nickname || (isNewUser ? '' : (profile.name || profile.first_name || ''))

        // 既存ユーザーの場合：interests配列から性格データを抽出
        let existingPersonality: string[] = []
        let existingHobbies: string[] = []
        let existingCustomCulture: string = ''
        
        if (!isNewUser) {
          // interests配列から hobbies, personality, custom_culture を抽出
          if (profile.interests && Array.isArray(profile.interests)) {
            profile.interests.forEach((item: string) => {
              if (item.startsWith('personality:')) {
                existingPersonality.push(item.replace('personality:', ''))
              } else if (item.startsWith('custom_culture:')) {
                existingCustomCulture = item.replace('custom_culture:', '')
              } else if (item !== 'その他') {
                existingHobbies.push(item)
              }
            })
          }
          
          // 🔧 修正: separate personality field が存在する場合（新しいデータ形式）
          if (profile.personality && Array.isArray(profile.personality) && profile.personality.length > 0) {
            // separate field からのデータで上書き（prefixなしのクリーンなデータ）
            existingPersonality = profile.personality.filter((item: string) => item !== 'その他')
          }
          
          // custom_culture は direct field も確認
          if (!existingCustomCulture && profile.custom_culture) {
            existingCustomCulture = profile.custom_culture
          }
        }
        
        console.log('🔍 DATA EXTRACTION DEBUG:', {
          'profile.personality (direct field)': profile.personality,
          'profile.interests (array field)': profile.interests, 
          'profile.custom_culture (direct field)': profile.custom_culture,
          'extracted existingPersonality': existingPersonality,
          'extracted existingHobbies': existingHobbies,
          'extracted existingCustomCulture': existingCustomCulture,
          'isNewUser': isNewUser
        })
        
        console.log('🔍 RAW DATABASE FIELDS CHECK:', {
          'profile.interests type': typeof profile.interests,
          'profile.interests isArray': Array.isArray(profile.interests),
          'profile.interests content': profile.interests,
          'profile.personality type': typeof profile.personality,
          'profile.personality isArray': Array.isArray(profile.personality),
          'profile.personality content': profile.personality
        })
        
        // 状態更新は後でまとめて実行するため、ここでは実行しない
        console.log('🔧 DATA EXTRACTED - WILL SET STATE LATER:', {
          'existingPersonality': existingPersonality,
          'existingHobbies': existingHobbies,
          'isNewUser': isNewUser
        })

        // フォームフィールドをリセット（新規ユーザーはsignupデータとデフォルト値のみ使用）
        // MyPageからの遷移時は既存の生年月日を確実に保持
        let resetBirthDate
        if (isFromMyPage) {
          // MyPageからの遷移：既存の生年月日を必ず保持
          resetBirthDate = profile.birth_date || profile.date_of_birth || ''
          console.log('🔄 MyPage遷移 - 既存birth_dateを保持:', resetBirthDate)
        } else if (isNewUser) {
          // 新規ユーザー：signupデータまたは空
          resetBirthDate = defaults.birth_date || ''
          console.log('🆕 新規ユーザー - signup birth_date使用:', resetBirthDate)
        } else {
          // 既存ユーザー：既存データを使用
          resetBirthDate = profile.birth_date || profile.date_of_birth || defaults.birth_date || ''
          console.log('👤 既存ユーザー - profile birth_date使用:', resetBirthDate)
        }
        
        // birth_dateが空でageが存在する場合のみ、年齢から生年を推定（推定値であることを明示）
        if (!resetBirthDate && profile.age && typeof profile.age === 'number' && profile.age > 0 && profile.age < 120 && !isFromMyPage) {
          // MyPageからの遷移時は推定を行わず、ユーザーに実際の入力を促す
          resetBirthDate = ''
          console.log(`⚠️ Birth date not found, age is ${profile.age}. User should set actual birth_date.`)
        }
        
        console.log('🔍 Reset birth_date value:', {
          isNewUser,
          'defaults.birth_date': defaults.birth_date,
          'profile.birth_date': profile.birth_date,
          'profile.date_of_birth': profile.date_of_birth,
          'profile.age': profile.age,
          resetBirthDate
        })
        
        console.log('🔍 Form Reset Data Debug:')
        console.log('  - nicknameValue:', nicknameValue)
        console.log('  - resetBirthDate:', resetBirthDate)
        console.log('  - 🌍 nationality calculation:', {
          defaults_nationality: defaults.nationality,
          profile_nationality: profile.nationality,
          isNewUser,
          isForeignMale,
          final_nationality: isForeignMale ? (defaults.nationality || profile.nationality || (isNewUser ? 'アメリカ' : '')) : undefined
        })
        console.log('  - parsedOptionalData.city:', parsedOptionalData.city)
        console.log('  - parsedOptionalData.occupation:', parsedOptionalData.occupation)
        console.log('  - parsedOptionalData.height:', parsedOptionalData.height)
        console.log('  - parsedOptionalData.body_type:', parsedOptionalData.body_type)
        console.log('  - parsedOptionalData.marital_status:', parsedOptionalData.marital_status)
        console.log('  - existingHobbies:', existingHobbies)
        console.log('  - existingPersonality:', existingPersonality)
        console.log('  - existingCustomCulture:', existingCustomCulture)
        
        const resetData = {
          nickname: nicknameValue,
          gender: defaults.gender,
          birth_date: resetBirthDate,
          age: defaults.age || (isNewUser ? 18 : (profile.age || 18)),
          nationality: isForeignMale ? (defaults.nationality || profile.nationality || (isNewUser ? 'アメリカ' : '')) : undefined,
          prefecture: !isForeignMale ? (defaults.prefecture || (isNewUser ? '' : (profile.residence || profile.prefecture || ''))) : undefined,
          city: !isForeignMale ? (isNewUser ? '' : (parsedOptionalData.city || '')) : undefined,
          // 外国人男性向け新フィールド
          planned_prefectures: isForeignMale ? (isNewUser ? [] : (profile.planned_prefectures || [])) : undefined,
          visit_schedule: isForeignMale ? (isNewUser ? 'no-entry' : (profile.visit_schedule || 'no-entry')) : undefined,
          travel_companion: isForeignMale ? (isNewUser ? 'noEntry' : (profile.travel_companion || 'noEntry')) : undefined,
          occupation: isNewUser ? 'none' : (parsedOptionalData.occupation || profile.occupation || 'none'),
          height: isNewUser ? undefined : (parsedOptionalData.height || profile.height || undefined),
          body_type: isNewUser ? 'none' : (parsedOptionalData.body_type || profile.body_type || 'none'),
          marital_status: isNewUser ? 'none' : (parsedOptionalData.marital_status || profile.marital_status || 'none'),
          hobbies: isNewUser ? [] : existingHobbies,
          personality: isNewUser ? [] : existingPersonality,
          self_introduction: isNewUser ? '' : (profile.bio || profile.self_introduction || ''),
          custom_culture: isNewUser ? '' : existingCustomCulture,
        }
        
        console.log('🚨 Final Reset Data for Form:', resetData)
        
        // フォームリセット前の詳細ログ
        console.log('🔍 FORM RESET DETAILED ANALYSIS:')
        console.log('About to reset form with following data:')
        Object.keys(resetData).forEach(key => {
          const value = (resetData as any)[key]
          console.log(`  - ${key}: ${JSON.stringify(value)} (type: ${typeof value})`)
        })
        
        reset(resetData)
        console.log('✅ Form reset completed')
        
        // 国籍はresetDataに含まれているため、個別設定は不要
        
        // Select要素の値を個別に設定（signup データを優先）
        setValue('nickname', nicknameValue)
        setValue('gender', defaults.gender)
        
        // birth_date設定でも同じロジックを使用（resetBirthDateと一致させる）
        let finalBirthDate
        if (isFromMyPage) {
          // MyPageからの遷移：既存の生年月日を必ず保持
          finalBirthDate = profile.birth_date || profile.date_of_birth || ''
          console.log('🔄 setValue - MyPage遷移のbirth_date保持:', finalBirthDate)
        } else if (isNewUser) {
          // 新規ユーザー：signupデータまたは空
          finalBirthDate = defaults.birth_date || ''
          console.log('🆕 setValue - 新規ユーザーbirth_date:', finalBirthDate)
        } else {
          // 既存ユーザー：既存データを使用
          finalBirthDate = profile.birth_date || profile.date_of_birth || defaults.birth_date || ''
          console.log('👤 setValue - 既存ユーザーbirth_date:', finalBirthDate)
        }
        
        // finalBirthDateが空でageが存在する場合のみ警告（推定値は設定しない）
        if (!finalBirthDate && profile.age && typeof profile.age === 'number' && profile.age > 0 && profile.age < 120 && !isFromMyPage) {
          // 実際の生年月日がない場合は空文字のまま、ユーザーに入力を促す（MyPage遷移時は除く）
          finalBirthDate = ''
          console.log(`⚠️ Birth date not found (setValue), age is ${profile.age}. User should set actual birth_date.`)
        }
        
        console.log('🔍 Setting birth_date value:', {
          isNewUser,
          isFromMyPage,
          'defaults.birth_date': defaults.birth_date,
          'profile.birth_date': profile.birth_date,
          'profile.date_of_birth': profile.date_of_birth,
          'profile.age': profile.age,
          finalBirthDate
        })
        console.log('🔍 FORM FIELD SET VALUES DETAILED LOG:')
        console.log('Setting birth_date:', finalBirthDate)
        setValue('birth_date', finalBirthDate)
        
        // 国籍はresetDataで設定済み
        
        const prefectureValue = defaults.prefecture || (isNewUser ? '' : (profile.residence || profile.prefecture || ''));
        console.log('Setting prefecture:', prefectureValue)
        setValue('prefecture', prefectureValue)
        
        const ageValue = defaults.age || (isNewUser ? 18 : (profile.age || 18))
        console.log('Setting age:', ageValue)
        setValue('age', ageValue)
        
        const hobbiesValue = isNewUser ? [] : existingHobbies
        console.log('Setting hobbies:', hobbiesValue)
        setValue('hobbies', hobbiesValue)
        
        const personalityValue = isNewUser ? [] : existingPersonality
        console.log('Setting personality:', personalityValue)
        setValue('personality', personalityValue)
        
        const customCultureValue = isNewUser ? '' : existingCustomCulture
        console.log('Setting custom_culture:', customCultureValue)
        setValue('custom_culture', customCultureValue)
        
        // 外国人男性向けフィールドの設定
        if (isForeignMale) {
          try {
            // 新規ユーザーの場合は既存データを無視して空の状態で初期化
            const plannedPrefecturesValue = isNewUser ? [] :
              (Array.isArray(profile?.planned_prefectures) ? profile.planned_prefectures : [])
            console.log('Setting planned_prefectures:', plannedPrefecturesValue, 'isNewUser:', isNewUser)
            setValue('planned_prefectures', plannedPrefecturesValue, { shouldValidate: false })
            setSelectedPlannedPrefectures(plannedPrefecturesValue)

            const visitScheduleValue = isNewUser ? 'no-entry' :
              (typeof profile?.visit_schedule === 'string' && profile.visit_schedule !== '' && profile.visit_schedule !== 'no-entry'
                ? profile.visit_schedule : 'no-entry')
            console.log('Setting visit_schedule:', visitScheduleValue, 'isNewUser:', isNewUser, 'DB value:', profile?.visit_schedule)
            setValue('visit_schedule', visitScheduleValue, { shouldValidate: false })

            const travelCompanionValue = isNewUser ? 'noEntry' :
              (typeof profile?.travel_companion === 'string' && profile.travel_companion !== '' && profile.travel_companion !== 'noEntry'
                ? profile.travel_companion : 'noEntry')
            console.log('Setting travel_companion:', travelCompanionValue, 'isNewUser:', isNewUser, 'DB value:', profile?.travel_companion)
            setValue('travel_companion', travelCompanionValue, { shouldValidate: false })

          } catch (error) {
            console.error('🚨 外国人男性フィールド初期化エラー:', error)
            setInitializationError(`外国人男性フィールドの初期化に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
            // エラーが発生した場合はデフォルト値で初期化
            setValue('planned_prefectures', [], { shouldValidate: false })
            setValue('visit_schedule', 'no-entry', { shouldValidate: false })
            setValue('travel_companion', 'noEntry', { shouldValidate: false })
            setSelectedPlannedPrefectures([])
          }
        }
        
        console.log('🔍 HOBBY/PERSONALITY INITIALIZATION DEBUG:')
        console.log('  - existingHobbies:', existingHobbies)
        console.log('  - existingPersonality:', existingPersonality)
        console.log('  - isNewUser:', isNewUser)
        
        const finalHobbies = isNewUser ? [] : existingHobbies
        const finalPersonality = isNewUser ? [] : existingPersonality
        
        console.log('🚨 FINAL STATE SETTING:')
        console.log('  - setSelectedHobbies will be called with:', finalHobbies)
        console.log('  - setSelectedPersonality will be called with:', finalPersonality)
        
        setSelectedHobbies(finalHobbies)
        setSelectedPersonality(finalPersonality)
        
        console.log('✅ STATE SETTING COMPLETED')

        // 🌐 言語設定の初期化
        const nationality = profile.nationality || ((signupData as any)?.nationality)
        let detectedLanguage: SupportedLanguage
        
        // 日本人女性の場合は強制的に日本語、外国人男性の場合は国籍から判定
        if (isJapaneseFemale) {
          detectedLanguage = 'ja'
        } else {
          detectedLanguage = determineLanguage(nationality)
        }
        
        setCurrentLanguage(detectedLanguage)
        console.log('🌐 Language initialization:', {
          nationality,
          detectedLanguage,
          isJapaneseFemale,
          source: 'profile load'
        })
        
        console.log('🔍 PROFILE IMAGES INITIALIZATION CHECK:')
        console.log('  - isNewUser:', isNewUser)
        console.log('  - profile.avatar_url:', profile.avatar_url)
        console.log('  - profile.avatar_url exists:', !!profile.avatar_url)
        console.log('  - condition (!isNewUser && profile.avatar_url):', !isNewUser && profile.avatar_url)
        
        // 🔒 セキュリティ強化: ユーザー固有のセッションストレージチェック
        const userImageKey = `currentProfileImages_${user.id}`
        const userTimestampKey = `imageStateTimestamp_${user.id}`
        const currentImageState = sessionStorage.getItem(userImageKey)
        let shouldUseStorageImages = false
        let storageImages: any[] = []
        
        // 🚨 新規ユーザーの場合は絶対にセッションストレージを使用しない
        if (currentImageState && !isNewUser) {
          try {
            storageImages = JSON.parse(currentImageState)
            const storageTimestamp = sessionStorage.getItem(userTimestampKey)
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000 // 5分前
            
            if (storageTimestamp && parseInt(storageTimestamp) > fiveMinutesAgo) {
              shouldUseStorageImages = true
              console.log('💾 セッションストレージから最新の画像状態を使用:', storageImages.length, '枚')
            } else {
              console.log('🕰️ セッションストレージの画像状態が古いため破棄')
              sessionStorage.removeItem(userImageKey)
              sessionStorage.removeItem(userTimestampKey)
            }
          } catch (e) {
            console.warn('❕ セッションストレージの画像データが破損')
            sessionStorage.removeItem(userImageKey)
            sessionStorage.removeItem(userTimestampKey)
          }
        } else if (isNewUser) {
          console.log('🔒 新規ユーザー: セッションストレージの使用を禁止（セキュリティ保護）')
          // 新規ユーザーの場合は他ユーザーのデータを完全削除
          sessionStorage.removeItem('currentProfileImages')
          sessionStorage.removeItem('imageStateTimestamp')
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key?.startsWith('currentProfileImages_') || key?.startsWith('imageStateTimestamp_')) {
              sessionStorage.removeItem(key)
            }
          }
        }
        
        // 🔧 画像設定と完成度計算に使用する配列を決定
        let currentImageArray: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }> = []

        if (shouldUseStorageImages) {
          console.log('✅ セッションストレージから画像状態を復元:', storageImages)
          currentImageArray = storageImages
          setProfileImages(storageImages)
        } else {
          // 🔧 修正: 新規ユーザーでも有効な画像データがある場合は使用
          if (profile.avatar_url) {
            console.log('✅ プロフィール画像を設定:', profile.avatar_url.substring(0, 50) + '...')
            console.log('  - isNewUser:', isNewUser, ', 有効な画像データを検出')
            currentImageArray = [{
              id: '1',
              url: profile.avatar_url,
              originalUrl: profile.avatar_url,
              isMain: true,
              isEdited: false
            }]
            setProfileImages(currentImageArray)
          } else {
            console.log('❌ 画像なしで初期化')
            console.log('  - Reason: avatar_url=', !!profile.avatar_url)
            currentImageArray = []
          }
        }
        
        // プロフィール完成度を計算（新規ユーザーは新規データのみ）
        const profileDataWithSignup = isNewUser ? {
          // 新規ユーザーの場合：新規登録データのみ使用
          name: nicknameValue,
          gender: defaults.gender,
          age: defaults.age || 18,
          nationality: isForeignMale ? (urlParams.get('nationality') || defaults.nationality) : null,
          residence: defaults.prefecture,
          interests: [], // 新規は空
          bio: '', // 新規は空
          planned_prefectures: isForeignMale ? [] : undefined, // 外国人男性の必須フィールド
          // ユーザー画像情報を追加
          avatarUrl: user?.avatarUrl,
          avatar_url: user?.avatarUrl, // userオブジェクトはavatarUrlのみ
        } : {
          // 既存ユーザーの場合：既存データも含める
          ...profile,
          name: nicknameValue,
          gender: defaults.gender,
          age: defaults.age || profile.age || 18,
          nationality: isForeignMale ? (defaults.nationality || profile.nationality) : profile.nationality,
          residence: defaults.prefecture || profile.residence || profile.prefecture,
          interests: profile.interests || profile.hobbies || [],
          bio: profile.bio || profile.self_introduction || '',
          hobbies: existingHobbies,
          personality: existingPersonality,
          // 外国人男性専用フィールドを明示的に追加
          visit_schedule: profile.visit_schedule,
          travel_companion: profile.travel_companion,
          planned_prefectures: profile.planned_prefectures || [],
          japanese_level: profile.japanese_level,
          planned_stations: (profile as any).planned_stations || [],
          // その他のオプションフィールド
          occupation: profile.occupation,
          height: profile.height,
          body_type: profile.body_type,
          marital_status: profile.marital_status,
          city: profile.city,
          english_level: profile.english_level,
          // ユーザー画像情報を追加
          avatarUrl: user?.avatarUrl || profile.avatarUrl,
          avatar_url: user?.avatarUrl || profile.avatar_url, // userオブジェクトはavatarUrlのみ
        }
        // 🔧 修正: 正しい画像配列を完成度計算に渡す
        calculateProfileCompletion(profileDataWithSignup, currentImageArray, 'INITIAL_LOAD', isNewUser)
        
        // フォーム設定完了後の完成度再計算
        setTimeout(() => {
          const currentValues = getValues()
          console.log('📊 Post-form-setup completion recalculation with current values:', currentValues)
          console.log('🔍 Nationality comparison:', {
            initial_cleanup_nationality: urlParams.get('nationality') || (isForeignMale ? 'アメリカ' : ''),
            form_nationality: currentValues.nationality,
            are_equal: (urlParams.get('nationality') || (isForeignMale ? 'アメリカ' : '')) === currentValues.nationality
          })
          // ✅ 修正: currentValues + プロフィールデータ + ユーザー画像情報を統合
          const currentValuesWithUserData = {
            ...profile, // 既存のプロフィールデータを基盤として使用
            ...currentValues, // フォームの現在値で上書き
            hobbies: existingHobbies, // 状態管理された趣味
            personality: existingPersonality, // 状態管理された性格
            // 外国人男性専用フィールドを確実に含める
            visit_schedule: currentValues.visit_schedule || profile.visit_schedule,
            travel_companion: currentValues.travel_companion || profile.travel_companion,
            planned_prefectures: currentValues.planned_prefectures || profile.planned_prefectures || [],
            japanese_level: currentValues.japanese_level || profile.japanese_level,
            planned_stations: (currentValues as any).planned_stations || (profile as any).planned_stations || [],
            // ユーザー画像情報を追加
            avatarUrl: user?.avatarUrl || profile.avatarUrl,
            avatar_url: user?.avatarUrl || profile.avatar_url
          }
          calculateProfileCompletion(currentValuesWithUserData, profileImages, 'DELAYED_2000MS', isNewUser)
        }, 2000);

      } catch (error) {
        console.error('Error loading user data:', error)
        setError('ユーザー情報の読み込みに失敗しました')
      } finally {
        setUserLoading(false)
      }
    }

    loadUserData()
  }, [user, reset, router, setValue, supabase, isForeignMale, isJapaneseFemale])

  // Form submission handler
  const onSubmit = async (data: ProfileEditFormData, event?: React.BaseSyntheticEvent) => {
    console.log('🚀 Form submission started')
    console.log('📋 提出されたデータ:', data)
    console.log('📸 Current profile images:', profileImages)

    if (!user) {
      console.error('❌ No user found')
      setError('ユーザー情報が見つかりません')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      // 写真をアップロード
      const uploadedImageUrls: string[] = []
      
      for (const image of profileImages) {
        if (image.isEdited && image.originalUrl.startsWith('blob:')) {
          try {
            // Blob URLから実際のファイルを取得
            const response = await fetch(image.originalUrl)
            const blob = await response.blob()
            
            // ファイル名を生成（拡張子を推定）
            const fileExtension = blob.type.split('/')[1] || 'jpg'
            const fileName = `profile_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`
            
            console.log('📤 アップロード開始:', fileName)
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, blob, {
                cacheControl: '3600',
                upsert: false
              })

            if (uploadError) {
              console.error('❌ アップロードエラー:', uploadError)
              throw uploadError
            }

            // パブリックURLを取得
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(uploadData.path)

            uploadedImageUrls.push(publicUrl)
            console.log('✅ アップロード成功:', publicUrl)
          } catch (uploadError) {
            console.error('❌ 個別画像のアップロードエラー:', uploadError)
            throw uploadError
          }
        } else {
          // 既存の画像URLをそのまま使用
          // image.url または image.originalUrl のいずれかを使用
          const existingUrl = image.url || image.originalUrl
          if (existingUrl && !existingUrl.startsWith('blob:')) {
            uploadedImageUrls.push(existingUrl)
            console.log('✅ 既存画像URL使用:', existingUrl)
          } else {
            console.log('⚠️ 無効な既存画像URL:', existingUrl)
          }
        }
      }

      // メイン画像を決定
      const mainImageIndex = profileImages.findIndex(img => img.isMain)
      const avatarUrl = mainImageIndex !== -1 && uploadedImageUrls[mainImageIndex] 
        ? uploadedImageUrls[mainImageIndex] 
        : uploadedImageUrls[0] || null

      console.log('🎯 Selected avatar URL:', avatarUrl)
      console.log('📸 All uploaded URLs:', uploadedImageUrls)
      console.log('🔍 Profile images state:', profileImages)
      console.log('📊 Image processing summary:', {
        totalImages: profileImages.length,
        uploadedUrls: uploadedImageUrls.length,
        mainImageIndex,
        finalAvatarUrl: avatarUrl
      })

      // 🔧 修正: interests配列に hobbies, personality, custom_culture を統合
      const consolidatedInterests: string[] = []
      
      // hobbies (日本文化) を追加
      if (selectedHobbies.length > 0) {
        consolidatedInterests.push(...selectedHobbies)
      }
      
      // personality を prefix付きで追加  
      if (selectedPersonality.length > 0) {
        selectedPersonality.forEach(personality => {
          consolidatedInterests.push(`personality:${personality}`)
        })
      }
      
      // custom_culture を prefix付きで追加
      if (data.custom_culture && data.custom_culture.trim()) {
        consolidatedInterests.push(`custom_culture:${data.custom_culture.trim()}`)
      }
      
      // 空の場合はデフォルト値
      if (consolidatedInterests.length === 0) {
        consolidatedInterests.push('その他')
      }

      // プロフィール更新データを準備
      const updateData: any = {
        nickname: data.nickname,
        gender: data.gender,
        age: data.age,
        birth_date: data.birth_date,
        prefecture: data.prefecture,
        city: data.city === 'none' ? null : data.city,
        occupation: data.occupation === 'none' ? null : data.occupation,
        height: data.height ? data.height : null,
        body_type: data.body_type === 'none' ? null : data.body_type,
        marital_status: data.marital_status === 'none' ? null : data.marital_status,
        english_level: data.english_level === 'none' ? null : data.english_level,
        japanese_level: data.japanese_level === 'none' ? null : data.japanese_level,
        self_introduction: data.self_introduction,
        interests: consolidatedInterests,
        avatar_url: avatarUrl,
        profile_images: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
        updated_at: new Date().toISOString()
      }

      // 外国人男性の場合は国籍と専用フィールドも更新
      console.log('🔍 保存時の外国人男性判定デバッグ:', {
        isForeignMale,
        effectiveProfileType,
        profileType,
        userBasedType,
        formData_visit_schedule: data.visit_schedule,
        formData_travel_companion: data.travel_companion,
        formData_planned_prefectures: data.planned_prefectures
      })

      if (isForeignMale) {
        if (data.nationality) {
          updateData.nationality = data.nationality
        }
        // 外国人男性専用フィールドを追加
        updateData.visit_schedule = (data.visit_schedule && data.visit_schedule !== 'no-entry') ? data.visit_schedule : null
        updateData.travel_companion = (data.travel_companion && data.travel_companion !== 'no-entry') ? data.travel_companion : null
        updateData.planned_prefectures = (data.planned_prefectures && Array.isArray(data.planned_prefectures) && data.planned_prefectures.length > 0) ? data.planned_prefectures : null

        console.log('🌍 外国人男性保存フィールド追加:', {
          nationality: updateData.nationality,
          visit_schedule: updateData.visit_schedule,
          travel_companion: updateData.travel_companion,
          planned_prefectures: updateData.planned_prefectures,
        })
      } else {
        console.log('❌ 外国人男性判定がfalseのため、専用フィールドは保存されません')
      }

      // カスタム文化は既に consolidatedInterests に含まれているため、別途設定不要

      console.log('📝 Final update data:', updateData)
      console.log('🔍 Consolidated interests debug:', {
        selectedHobbies,
        selectedPersonality,
        customCulture: data.custom_culture,
        consolidatedInterests,
        totalItems: consolidatedInterests.length
      })

      // データベースを更新
      const { data: updateResult, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()

      if (updateError) {
        console.error('❌ プロフィール更新エラー:', updateError)
        throw updateError
      }

      console.log('✅ プロフィール更新成功:', updateResult)
      
      setSuccess('プロフィールが正常に更新されました')
      
      // 成功後に MyPage にリダイレクト
      setTimeout(() => {
        router.push('/mypage')
      }, 1500)

    } catch (error) {
      console.error('❌ プロフィール更新エラー:', error)
      setError(error instanceof Error ? error.message : 'プロフィールの更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Hobby selection handler
  const toggleHobby = (hobby: string) => {
    setSelectedHobbies(prev => {
      const newHobbies = prev.includes(hobby)
        ? prev.filter(h => h !== hobby)  // 単純にfilterのみ（空配列も許可）
        : prev.includes('その他')
          ? [hobby]
          : [...prev, hobby]
      
      // リアルタイム完成度更新
      setTimeout(() => {
        const currentData = watch()
        // custom_culture は完成度計算から除外（コメント扱い）
        const { custom_culture, ...currentDataWithoutCustomCulture } = currentData || {}
        calculateProfileCompletion({
          ...currentDataWithoutCustomCulture,
          hobbies: newHobbies,
          personality: selectedPersonality,
          avatar_url: profileImages.length > 0 ? 'has_images' : null
        }, profileImages, 'hobby-checkbox-change')
      }, 0)
      
      return newHobbies
    })
  }

  // Personality selection handler
  const togglePersonality = (trait: string) => {
    setSelectedPersonality(prev => {
      const newTraits = prev.includes(trait)
        ? prev.filter(t => t !== trait)  // 単純にfilterのみ（空配列も許可）
        : prev.includes('その他')
          ? [trait]
          : [...prev, trait]
      
      // リアルタイム完成度更新
      setTimeout(() => {
        const currentData = watch()
        calculateProfileCompletion({
          ...currentData,
          hobbies: selectedHobbies,
          personality: newTraits,
          custom_culture: currentData.custom_culture,
          avatar_url: profileImages.length > 0 ? 'has_images' : null
        })
      }, 0)
      
      return newTraits
    })
  }

  // 外国人男性向け: 行く予定の都道府県選択
  const togglePlannedPrefecture = (prefecture: string) => {
    setSelectedPlannedPrefectures(prev => {
      const newPrefectures = prev.includes(prefecture)
        ? prev.filter(p => p !== prefecture)
        : prev.length < 3
          ? [...prev, prefecture]
          : prev
      
      // フォームデータに反映
      setValue('planned_prefectures', newPrefectures)
      
      // リアルタイム完成度更新
      setTimeout(() => {
        const currentData = watch()
        calculateProfileCompletion({
          ...currentData,
          planned_prefectures: newPrefectures
        })
      }, 0)
      
      return newPrefectures
    })
  }


  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sakura-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">プロフィールを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">エラーが発生しました</h3>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <button 
              onClick={() => {
                setError('')
                window.location.reload()
              }}
              className="w-full bg-sakura-600 hover:bg-sakura-700 text-white font-medium py-2 px-4 rounded"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main return statement - normal profile editing interface  
  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      {/* Sidebar */}
      <Sidebar className="w-64 hidden md:block" />
      
      {/* Main Content */}
      <div className="md:ml-64 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* 言語切り替えボタン（外国人男性のみ表示） */}
          {isForeignMale && (
            <div className="flex justify-end mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-600" />
                <Select
                  value={currentLanguage}
                  onValueChange={(value: SupportedLanguage) => {
                    setCurrentLanguage(value)
                    saveLanguagePreference(value)
                    console.log('🌐 Language changed to:', value)
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">🇯🇵 日本語</SelectItem>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                    <SelectItem value="ko">🇰🇷 한국어</SelectItem>
                    <SelectItem value="zh-tw">🇹🇼 繁體中文</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-8">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.cancel')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isForeignMale ? t('profile.foreignMaleTitle') :
                 isJapaneseFemale ? t('profile.japaneseFemaleTitle') :
                 t('profile.editTitle')}
              </h1>
              <p className="text-gray-600">
                {isForeignMale ? t('profile.foreignMaleSubtitle') :
                 isJapaneseFemale ? t('profile.japaneseFemaleSubtitle') :
                 t('profile.defaultSubtitle')}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {initializationError && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
                <div>
                  <p className="text-orange-700 text-sm font-medium">初期化エラー</p>
                  <p className="text-orange-600 text-xs mt-1">{initializationError}</p>
                  <p className="text-orange-500 text-xs mt-2">エラーハンドリング v2.0 有効</p>
                </div>
              </div>
            )}

            {/* プロフィール完成度表示 */}
            <div className="mb-6 p-4 bg-gradient-to-r from-sakura-50 to-pink-50 rounded-lg border border-sakura-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{t('profile.profileCompletion')}</span>
                <span className="text-lg font-bold text-sakura-600">{profileCompletion}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-sakura-500 to-pink-500 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${profileCompletion}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">
                  {totalItems > 0 ? `${completedItems}/${totalItems} ${t('profile.itemsCompleted')}` : t('profile.calculating')}
                </p>
                <p className="text-xs text-gray-500">
                  {profileCompletion < 50 ? t('profile.completionLow') :
                   profileCompletion < 80 ? t('profile.completionMedium') :
                   profileCompletion < 100 ? t('profile.completionHigh') :
                   t('profile.completionPerfect')}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* プロフィール画像セクション */}
              <MultiImageUploader
                images={profileImages}
                onImagesChange={handleImagesChange}
                maxImages={3}
                currentLanguage={currentLanguage}
              />

              {/* 必須情報 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-sakura-200 pb-2 flex items-center">
                  <span className="text-red-500 mr-2">*</span>
                  {t('profile.requiredSection')}
                  <span className="text-sm font-normal text-gray-500 ml-2">{t('profile.requiredForPublication')}</span>
                </h3>
                
                {/* 自己紹介 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.selfIntroduction')} <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    placeholder={t('profile.selfIntroPlaceholder')}
                    rows={4}
                    {...register('self_introduction')}
                    className={errors.self_introduction ? 'border-red-500' : ''}
                  />
                  {errors.self_introduction && (
                    <p className="text-red-500 text-sm mt-1">{errors.self_introduction.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{t('profile.selfIntroNote')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.nickname')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder={t('placeholders.nickname')}
                    {...register('nickname')}
                    className={errors.nickname ? 'border-red-500' : ''}
                  />
                  {errors.nickname && (
                    <p className="text-red-500 text-sm mt-1">{errors.nickname.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{t('profile.nicknameDescription')}</p>
                </div>

                {/* 生年月日と年齢 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.birthDate')} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={watch('birth_date') ? watch('birth_date') : ''}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('profile.birthDateReadonly')}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('profile.birthDatePrivacy')}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.age')} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="18"
                      max="99"
                      placeholder={t('placeholders.age')}
                      {...register('age', { valueAsNumber: true })}
                      className={`${errors.age ? 'border-red-500' : ''} bg-gray-50`}
                      readOnly
                    />
                    {errors.age && (
                      <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{t('profile.ageAutoCalculation')}</p>
                  </div>
                </div>

                {/* 国籍フィールド（外国人男性のみ） */}
                {isForeignMale && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.nationality')} <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={(() => {
                        const currentNationality = watch('nationality') || ''
                        // 「オランジ」を「オランダ」に正規化
                        return currentNationality === 'オランジ' ? 'オランダ' : currentNationality
                      })()}
                      onValueChange={(value) => {
                        console.log('🔧 国籍選択変更:', value)
                        setValue('nationality', value, { shouldValidate: true })
                        // 国籍変更時に完成度を再計算
                        setTimeout(() => {
                          const formData = getValues()
                          calculateProfileCompletion(formData, profileImages, 'nationality-change')
                        }, 100)
                      }}
                    >
                      <SelectTrigger className={errors.nationality ? 'border-red-500' : ''}>
                        <SelectValue placeholder="国籍を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {NATIONALITIES.map((nationality) => (
                          <SelectItem key={nationality.value} value={nationality.value}>
                            {nationality.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.nationality && (
                      <p className="text-red-500 text-sm mt-1">{errors.nationality.message}</p>
                    )}
                  </div>
                )}

                {/* 居住地（日本人女性のみ） */}
                {isJapaneseFemale && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        都道府県 <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={watch('prefecture') || ''}
                        onValueChange={(value) => setValue('prefecture', value)}
                      >
                        <SelectTrigger className={errors.prefecture ? 'border-red-500' : ''}>
                          <SelectValue placeholder="都道府県を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {PREFECTURES.map((prefecture) => (
                            <SelectItem key={prefecture.value} value={prefecture.value}>
                              {prefecture.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.prefecture && (
                        <p className="text-red-500 text-sm mt-1">{errors.prefecture.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        市区町村
                      </label>
                      <Input
                        placeholder="市区町村を入力"
                        {...register('city')}
                        className={errors.city ? 'border-red-500' : ''}
                      />
                      {errors.city && (
                        <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* オプション情報セクション */}
                <div className="space-y-4">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('profile.occupation')}
                      </label>
                      <Select
                        value={watch('occupation') || 'none'}
                        onValueChange={(value) => setValue('occupation', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('placeholders.selectOccupation')} />
                        </SelectTrigger>
                        <SelectContent>
                          {getOccupationOptions(t).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('profile.height')}
                      </label>
                      <Input
                        type="number"
                        min="120"
                        max="250"
                        placeholder={t('placeholders.height')}
                        step="1"
                        onFocus={(e) => {
                          if (!e.target.value) {
                            e.target.value = '160'
                          }
                        }}
                        {...register('height', { valueAsNumber: true })}
                        className={errors.height ? 'border-red-500' : ''}
                      />
                      {errors.height && (
                        <p className="text-red-500 text-sm mt-1">{errors.height.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('profile.bodyType')}
                      </label>
                      <Select
                        value={watch('body_type') || 'none'}
                        onValueChange={(value) => setValue('body_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('placeholders.selectBodyType')} />
                        </SelectTrigger>
                        <SelectContent>
                          {getBodyTypeOptions(t).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('profile.maritalStatus')}
                      </label>
                      <Select
                        value={watch('marital_status') || 'none'}
                        onValueChange={(value) => setValue('marital_status', value as 'none' | 'single' | 'married')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('placeholders.selectMaritalStatus')} />
                        </SelectTrigger>
                        <SelectContent>
                          {getMaritalStatusOptions(t).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {isForeignMale && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.japaneseLevel')}
                        </label>
                        <Select
                          value={watch('japanese_level') || 'none'}
                          onValueChange={(value) => setValue('japanese_level', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('placeholders.selectJapaneseLevel')} />
                          </SelectTrigger>
                          <SelectContent>
                            {getJapaneseLevelOptions(t).map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {!isForeignMale && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          英語レベル
                        </label>
                        <Select
                          value={watch('english_level') || 'none'}
                          onValueChange={(value) => setValue('english_level', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="英語レベルを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {getEnglishLevelOptions(t).map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* 性格セクション - 独立したセクション */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.personalitySection')}
                  </label>
                  <p className="text-xs text-gray-500 mb-3">{t('profile.selectPersonalityNote')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {getPersonalityOptions(t).map((trait) => (
                      <button
                        key={trait.key}
                        type="button"
                        onClick={() => togglePersonality(trait.label)}
                        disabled={!selectedPersonality.includes(trait.label) && selectedPersonality.length >= 5}
                        className={`
                          px-3 py-2.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 ease-in-out text-center min-h-[2.75rem] flex items-center justify-center w-full
                          ${selectedPersonality.includes(trait.label)
                            ? 'bg-gradient-to-r from-red-800 to-red-900 text-white border-red-800 shadow-lg transform scale-105'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                          }
                          ${(!selectedPersonality.includes(trait.label) && selectedPersonality.length >= 5)
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer hover:shadow-md'
                          }
                        `}
                      >
                        {trait.label}
                      </button>
                    ))}
                  </div>
                </div>



                {/* 外国人男性向け専用フィールド */}
                {isForeignMale && (
                  <>
                    {/* 日本訪問計画 */}
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-gray-700 mt-6 mb-4">{t('profile.japanVisitPlan')}</h4>

                      {/* 訪問予定時期 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.visitSchedule')}
                        </label>
                        <Select
                          value={watch('visit_schedule') || 'no-entry'}
                          onValueChange={(value) => setValue('visit_schedule', value)}
                        >
                          <SelectTrigger className={errors.visit_schedule ? 'border-red-500' : ''}>
                            <SelectValue placeholder={t('placeholders.selectVisitSchedule')} />
                          </SelectTrigger>
                          <SelectContent>
                            {getVisitScheduleOptionsTranslated().map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.visit_schedule && (
                          <p className="text-red-500 text-sm mt-1">{errors.visit_schedule.message}</p>
                        )}
                      </div>

                      {/* 同行者 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profile.travelCompanion')}
                        </label>
                        <Select
                          value={watch('travel_companion') || 'noEntry'}
                          onValueChange={(value) => setValue('travel_companion', value)}
                        >
                          <SelectTrigger className={errors.travel_companion ? 'border-red-500' : ''}>
                            <SelectValue placeholder={t('placeholders.selectTravelCompanion')} />
                          </SelectTrigger>
                          <SelectContent>
                            {getTravelCompanionOptions(t).map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.travel_companion && (
                          <p className="text-red-500 text-sm mt-1">{errors.travel_companion.message}</p>
                        )}
                      </div>

                      {/* 行く予定の都道府県 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('profile.plannedPrefectures')}
                        </label>
                        <p className="text-xs text-gray-500 mb-3">{t('profile.maxSelection')}</p>

                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="prefectures">
                            <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-red-700">
                              {t('profile.selectPrefecturesWithCount')}（{selectedPlannedPrefectures.length}/3 {t('profile.selectedCount')}）
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                                {PREFECTURES.map((prefecture) => (
                                  <button
                                    key={prefecture.value}
                                    type="button"
                                    onClick={() => togglePlannedPrefecture(prefecture.value)}
                                    disabled={!selectedPlannedPrefectures.includes(prefecture.value) && selectedPlannedPrefectures.length >= 3}
                                    className={`
                                      px-3 py-2.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 ease-in-out text-center min-h-[2.75rem] flex items-center justify-center w-full
                                      ${selectedPlannedPrefectures.includes(prefecture.value)
                                        ? 'bg-gradient-to-r from-red-800 to-red-900 text-white border-red-800 shadow-lg transform scale-105'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                                      }
                                      ${(!selectedPlannedPrefectures.includes(prefecture.value) && selectedPlannedPrefectures.length >= 3)
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'cursor-pointer hover:shadow-md'
                                      }
                                    `}
                                  >
                                    {prefecture.label}
                                  </button>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>

                        {errors.planned_prefectures && (
                          <p className="text-red-500 text-sm mt-1">{errors.planned_prefectures.message}</p>
                        )}
                      </div>

                    </div>
                  </>
                )}

                {/* 興味・趣味セクション */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-700 mt-6 mb-4">
                    {isForeignMale ? t('profile.cultureSectionForeign') : t('profile.cultureSection')} <span className="text-red-500">*</span>
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    {t('profile.selectCultureNote')}
                  </p>
                  <Accordion type="multiple" className="w-full">
                    {getCultureCategories(t).map((category) => (
                      <AccordionItem key={category.name} value={category.name}>
                        <AccordionTrigger className="text-lg font-semibold">
                          {category.name}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-2">
                            {category.items.map((hobby) => (
                              <button
                                key={hobby.value}
                                type="button"
                                onClick={() => toggleHobby(hobby.value)}
                                disabled={!selectedHobbies.includes(hobby.value) && selectedHobbies.length >= 8}
                                className={`
                                  px-3 py-2.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 ease-in-out text-center min-h-[2.75rem] flex items-center justify-center w-full
                                  ${selectedHobbies.includes(hobby.value)
                                    ? 'bg-gradient-to-r from-red-800 to-red-900 text-white border-red-800 shadow-lg transform scale-105'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                                  }
                                  ${(!selectedHobbies.includes(hobby.value) && selectedHobbies.length >= 8)
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'cursor-pointer hover:shadow-md'
                                  }
                                `}
                              >
                                {hobby.label}
                              </button>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  {errors.hobbies && (
                    <p className="text-red-500 text-sm mt-1">{errors.hobbies.message}</p>
                  )}

                  {/* カスタム日本文化 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.otherCultureLabel')}
                    </label>
                    <Input
                      placeholder={t('placeholders.enterCustomCulture')}
                      {...register('custom_culture')}
                      className={errors.custom_culture ? 'border-red-500' : ''}
                    />
                    {errors.custom_culture && (
                      <p className="text-red-500 text-sm mt-1">{errors.custom_culture.message}</p>
                    )}
                  </div>

                </div>

                {/* プレビューボタン */}
                <div className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mb-4"
                    onClick={async () => {
                      try {
                        // 手動バリデーションを実行
                        const formData = watch()

                        console.log('🔍 Manual validation start:', {
                          isForeignMale,
                          formData: formData,
                          selectedHobbies,
                          selectedPlannedPrefectures
                        })

                        // 必須フィールドのチェック
                        const validationErrors = []

                        // 共通必須フィールド
                        if (!formData.nickname?.trim()) validationErrors.push('ニックネームを入力してください')
                        if (!formData.birth_date) validationErrors.push('生年月日を入力してください')
                        if (!formData.self_introduction || formData.self_introduction.length < 100) {
                          validationErrors.push('自己紹介は100文字以上で入力してください')
                        }
                        if (!selectedHobbies || selectedHobbies.length === 0) {
                          validationErrors.push('日本文化を1つ以上選択してください')
                        }

                        // 外国人男性の場合の追加チェック
                        if (isForeignMale) {
                          if (!formData.nationality?.trim()) validationErrors.push('国籍を選択してください')
                          if (!selectedPlannedPrefectures || selectedPlannedPrefectures.length === 0) {
                            validationErrors.push('行く予定の都道府県を少なくとも1つ選択してください')
                          }
                        } else {
                          // 日本人女性の場合
                          if (!formData.prefecture?.trim()) validationErrors.push('都道府県を入力してください')
                        }

                        if (validationErrors.length > 0) {
                          console.log('❌ Manual validation failed:', validationErrors)
                          alert(validationErrors[0])
                          return
                        }

                        console.log('✅ Manual validation passed')

                        // 手動バリデーションが成功した場合はReact Hook Formのバリデーションをスキップ
                        console.log('✅ Skipping React Hook Form validation as manual validation passed')

                        // 条件付きバリデーションは手動バリデーションで完了

                        // プレビュー用画像URL（blob URLまたは既存URL）
                        const previewImageUrl = profileImages.find(img => img.isMain)?.url || profileImages[0]?.url || null

                        const previewData = {
                          ...formData,
                          hobbies: selectedHobbies,
                          personality: selectedPersonality,
                          planned_prefectures: selectedPlannedPrefectures,
                          visit_schedule: formData.visit_schedule || '',
                          travel_companion: formData.travel_companion || '',
                          image: previewImageUrl,
                          profile_image: previewImageUrl
                        }

                        // 🔒 セキュリティ強化: ユーザー固有のプレビューデータ保存
                        const previewDataKey = `previewData_${user?.id || 'anonymous'}`
                        sessionStorage.setItem(previewDataKey, JSON.stringify(previewData))

                        const previewWindow = window.open(`/profile/preview?userId=${user?.id || ''}`, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
                        if (!previewWindow) {
                          alert('ポップアップがブロックされています。ブラウザの設定を確認してください。')
                        }
                      } catch (error) {
                        console.error('❌ Error opening preview:', error)
                        alert('プレビューの開用でエラーが発生しました。もう一度お試しください。')
                      }
                    }}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {t('buttons.previewCheck')}
                  </Button>
                </div>

                {/* 注意メッセージ */}
                <div className="pt-2 text-center text-gray-600">
                  <p className="text-sm">
                    {t('profile.previewAdvice')}
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfileEditPage() {
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // エラー状態のUI
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">エラーが発生しました</h3>
            <p className="text-sm text-gray-500 mb-6">
              {errorMessage || 'プロフィール編集画面の読み込み中にエラーが発生しました。ページを再読み込みしてください。'}
            </p>
            <Button 
              onClick={() => {
                setHasError(false)
                setErrorMessage('')
                window.location.reload()
              }}
              className="w-full bg-sakura-600 hover:bg-sakura-700 text-white"
            >
              ページを再読み込み
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <ProfileEditContent />
    </AuthGuard>
  )
}
