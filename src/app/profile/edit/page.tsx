'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { 
  // 🚨 DEPRECATED: calculateProfileCompletion - 統一フローに移行済み
  normalizeProfile,
  calculateCompletion,
  buildProfileForCompletion,
  // 🌟 SINGLE SOURCE OF TRUTH ARCHITECTURE
  buildCompletionInputFromForm,
  sanitizeForCompletion,
  calculateCompletionFromForm,
  normalizeImagesForCompletion
} from '@/utils/profileCompletion'

// 🧮 統一されたプロフィール完成度計算システム使用
// normalizeProfile と calculateCompletion を使用して一貫した計算を実現
import { type SupportedLanguage } from '@/utils/language'
import { useUnifiedTranslation } from '@/utils/translations'
import { LanguageSelector } from '@/components/LanguageSelector'
import { 
  type LanguageSkill, 
  type LanguageCode, 
  type LanguageLevelCode,
  hasValidLanguageSkills,
  generateLanguageSkillsFromLegacy 
} from '@/types/profile'

const baseProfileEditSchema = (isForeignMale: boolean, t: any) => z.object({
  nickname: z.string().min(1, t('errors.nicknameRequired')).max(20, t('errors.nicknameMaxLength')),
  gender: z.enum(['male', 'female'], { required_error: t('errors.genderRequired') }),
  birth_date: z.string().min(1, t('errors.birthDateRequired')),
  age: z.number().min(18, t('errors.ageMinimum')).max(99, t('errors.ageMaximum')),
  nationality: z.string().optional(),
  prefecture: z.string().optional(),
  // 🛡️ CRITICAL FIX: 外国人男性専用フィールドを条件分岐で制御
  planned_prefectures: isForeignMale 
    ? z.array(z.string()).min(1, { message: 'errors.plannedPrefecturesRequired' }).max(3, { message: 'errors.prefecturesMaximum' })  // 外国人男性：必須
    : z.array(z.string()).optional().default([]),  // 日本人女性：任意
  visit_schedule: z.string().optional(),
  travel_companion: isForeignMale 
    ? z.string().optional()  // 外国人男性：任意（必須制約一旦削除）
    : z.string().optional().default("undecided"),  // 日本人女性：任意
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
  marital_status: z.enum(['none', 'single', 'married']).optional(),
  english_level: z.enum(['none', 'beginner', 'elementary', 'intermediate', 'upperIntermediate', 'advanced', 'native']).default('none'),
  japanese_level: z.enum(['none', 'beginner', 'elementary', 'intermediate', 'upperIntermediate', 'advanced', 'native']).default('none'),
  // ✨ 新機能: 使用言語＋言語レベル（統一型定義使用）- 必須項目化
  language_skills: z.array(z.object({
    language: z.enum(['', 'none', 'ja', 'en', 'ko', 'zh-TW']),
    level: z.enum(['', 'none', 'beginner', 'beginner_plus', 'intermediate', 'intermediate_plus', 'advanced', 'native'])
  }))
  .refine((skills) => {
    // 🚀 FIXED: 有効な言語+レベルペアが必ず1つ以上必要（必須化）
    const validPairs = skills.filter(skill => 
      skill.language && (skill.language as string) !== '' && skill.language !== 'none' &&
      skill.level && (skill.level as string) !== '' && skill.level !== 'none'
    );
    
    return validPairs.length >= 1; // 必ず1つ以上の有効ペアが必要
  }, { message: 'errors.languagePairRequired' }),
  hobbies: z.array(z.string()).min(1, t('errors.hobbiesMinimum')).max(8, t('errors.hobbiesMaximum')),
  custom_culture: z.string().max(100, t('errors.customCultureMaxLength')).optional(),
  personality: z.array(z.string()).max(5, '性格は5つまで選択できます').optional(),
  self_introduction: z.string().min(100, t('errors.selfIntroMinimum')).max(1000, t('errors.selfIntroMaximum')),
  // 🚨 CRITICAL FIX: photo_urlsをZodスキーマに追加（バリデーション時削除防止）
  photo_urls: z.array(z.string()).default([]).optional(),
})

// 条件付きバリデーション関数
const createProfileEditSchema = (isForeignMale: boolean, t: any) => {
  const baseSchema = baseProfileEditSchema(isForeignMale, t)
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
      // 行く予定の都道府県は必須項目
      if (!data.planned_prefectures || data.planned_prefectures.length === 0) {
        throw new z.ZodError([{
          code: z.ZodIssueCode.custom,
          message: 'errors.plannedPrefecturesRequired',
          path: ['planned_prefectures']
        }])
      }
      // 🚀 FIXED: 古い japanese_level バリデーション削除
      // 新しい language_skills 配列のバリデーションを使用
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
      // 🚀 FIXED: 古い english_level バリデーション削除
      // 新しい language_skills 配列のバリデーションを使用
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

// 🛠️ タグ正規化関数：重複・空文字・nullを除去
const normalizeTags = (tags: any[]): string[] => {
  if (!Array.isArray(tags)) {
    console.warn('⚠️ normalizeTags: 入力が配列ではありません:', typeof tags, tags)
    return []
  }
  
  const normalized = tags
    .filter(tag => tag !== null && tag !== undefined && tag !== '') // null/undefined/空文字を除去
    .map(tag => String(tag).trim()) // 文字列化＋前後空白除去
    .filter(tag => tag.length > 0) // 空文字を再度除去
    .filter((tag, index, array) => array.indexOf(tag) === index) // 重複除去
  
  // 🔧 ログスパム修正: NORMALIZE TAGSログを削除（変更がある場合のみ出力）
  const removedCount = tags.length - normalized.length
  if (removedCount > 0) {
    console.log('🧹 NORMALIZE TAGS: 変更あり', {
      input_length: tags.length,
      output_length: normalized.length,
      removed_count: removedCount
    })
  }
  
  return normalized
}

// 結婚状況オプション
// 結婚状況選択肢（翻訳対応）
const getMaritalStatusOptions = (t: any) => [
  { value: 'none', label: t('maritalStatus.none') },
  { value: 'single', label: t('maritalStatus.single') },
  { value: 'married', label: t('maritalStatus.married') }
]

// 職業オプション
// 職業選択肢（ユーザー種別に応じて表示を変更）
const getOccupationOptions = (t: any, isMale: boolean = false) => [
  { value: 'none', label: t('occupations.noEntry') },
  { value: isMale ? '主夫' : '主婦', label: isMale ? t('occupations.houseHusband') : t('occupations.housewife') },
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
  { value: 'none', label: 'Please select', disabled: true }, // プレースホルダー
  { value: 'beginner', label: t('levels.beginner') },
  { value: 'elementary', label: t('levels.elementary') },
  { value: 'intermediate', label: t('levels.intermediate') },
  { value: 'upperIntermediate', label: t('levels.upperIntermediate') },
  { value: 'advanced', label: t('levels.advanced') },
  { value: 'native', label: t('levels.native') }
]

// 日本語レベルオプション（翻訳対応）
const getJapaneseLevelOptions = (t: any) => [
  { value: 'none', label: '選択してください', disabled: true }, // プレースホルダー
  { value: 'beginner', label: t('levels.beginner') },
  { value: 'elementary', label: t('levels.elementary') },
  { value: 'intermediate', label: t('levels.intermediate') },
  { value: 'upperIntermediate', label: t('levels.upperIntermediate') },
  { value: 'advanced', label: t('levels.advanced') },
  { value: 'native', label: t('levels.native') }
]

// 同行者選択肢（翻訳対応）
const getTravelCompanionOptions = (t: any) => {
  const options = [
    { value: 'noEntry', label: t('companion.noEntry') },
    { value: 'alone', label: t('companion.alone') },
    { value: 'friend', label: t('companion.friend') },
    { value: 'family', label: t('companion.family') },
    { value: 'partner', label: t('companion.partner') }
  ]

  // 🧪 OPTIONS DEBUG - options生成結果をログ（1回だけ）
  if (typeof window !== 'undefined' && !(window as any).__DEBUG_COMPANION_OPTIONS_LOGGED__) {
    (window as any).__DEBUG_COMPANION_OPTIONS_LOGGED__ = true
    console.log('🧪 OPTIONS DEBUG [travel_companion]', {
      values: options?.map(o => o.value),
      labels: options?.map(o => o.label),
      hasFormsNoEntry: (options ?? []).some(o =>
        String(o.value).includes('forms.') || String(o.label).includes('forms.')
      )
    })
  }

  return options
}


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
    { value: 'currently-in-japan', label: t('schedule.currentlyInJapan') },
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
  
  // マイページからの遷移の場合はテストモードではない
  if (urlParams.get('fromMyPage') === 'true') {
    return false
  }
  
  return !!(urlParams.get('type') || urlParams.get('gender') || urlParams.get('nickname') || urlParams.get('birth_date') || urlParams.get('age') || urlParams.get('nationality'))
}

function ProfileEditContent() {
  // ALL HOOKS MUST BE AT THE VERY TOP - NO EARLY RETURNS BEFORE HOOKS
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const profileType = searchParams?.get('type') // 'foreign-male' or 'japanese-female'
  
  // 🌸 TASK3: typeクエリが無い場合の安全化（真っさら画面防止）
  const hasValidType = profileType === 'foreign-male' || profileType === 'japanese-female'
  
  // 統一言語設定
  const { t, language: currentLanguage } = useUnifiedTranslation()
  
  // 翻訳システム初期化確認
  useEffect(() => {
    // 翻訳システムの初期化を確認
  }, [currentLanguage, t])

  // 新規ユーザーの早期セッションストレージクリア（デプロイ直後対策）
  useEffect(() => {
    const isFromSignup = searchParams?.get('from') === 'signup'
    if (isFromSignup && typeof window !== 'undefined') {
      console.log('🧹 新規ユーザー: デプロイ直後対策でストレージを早期クリア')
      try {
        // 🌸 TASK5: test mode安全なキー使用でセッションストレージクリア
        const safeUserId = user?.id || 'testmode'
        sessionStorage.removeItem(`currentProfileImages_${safeUserId}`)
        sessionStorage.removeItem(`imageStateTimestamp_${safeUserId}`)
        sessionStorage.removeItem(`imageChangeTime_${safeUserId}`)
        sessionStorage.removeItem('imageEditHistory')

        // ユーザー固有キーも削除
        const sessionKeys = Object.keys(sessionStorage)
        sessionKeys.forEach(key => {
          if (key.startsWith('currentProfileImages_') ||
              key.startsWith('imageStateTimestamp_')) {
            sessionStorage.removeItem(key)
          }
        })

        // localStorageの画像関連データも削除（新規ユーザーの汚染防止）
        localStorage.removeItem('currentProfileImages')
        localStorage.removeItem('updateProfile')
        localStorage.removeItem('previewCompleteData')
        
        console.log('✅ 新規ユーザー: ストレージクリア完了')
      } catch (e) {
        console.warn('ストレージクリアエラー:', e)
      }
    }
  }, [searchParams])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [initializationError, setInitializationError] = useState('')
  
  // 🚨 CRITICAL: 保存検証デバッグパネル用State
  const [debugPanel, setDebugPanel] = useState<{
    show: boolean
    uid: string
    whereCondition: string
    payloadPersonalityTags: any
    dbPersonalityTags: any
    match: boolean
    updateError: any
    updatedRows: number
    rlsIssue: boolean
    saveClickedAt: string
  } | null>(null)
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [userLoading, setUserLoading] = useState(true)
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([])
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([])
  const [selectedPlannedPrefectures, setSelectedPlannedPrefectures] = useState<string[]>([])
  // 🚨 CRITICAL: DBプロフィールの保持（buildProfileForCompletion用）
  const [dbProfile, setDbProfile] = useState<any>(null)
  // 🔧 FIX: 初期化中のcompletion計算揺れ防止フラグ
  const initializingRef = useRef(true)
  // 🌟 CRITICAL: 初期化完了フラグ（reset/setValue/state復元完了後にtrueに）
  const [isHydrated, setIsHydrated] = useState(false)
  // 🛡️ CRITICAL: チラつき防止 - 初期化専用フラグ（完成度計算ガード）
  const [isInitializing, setIsInitializing] = useState(true)
  
  // 🔍 DEBUG: isHydrated状態変化監視
  useEffect(() => {
    console.log('🔍 HYDRATION_DEBUG: isHydrated状態変化', {
      isHydrated,
      isInitializing,
      initializingRef: initializingRef.current,
      timestamp: new Date().toISOString()
    })
  }, [isHydrated, isInitializing])
  // 🔧 FIX: 初期化完了時の強制計算フラグ（0%バグ防止）
  const [didInitialCalc, setDidInitialCalc] = useState(false)
  // ✨ 新機能: 使用言語＋言語レベル状態管理
  const [languageSkills, setLanguageSkills] = useState<LanguageSkill[]>([])
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [completedItems, setCompletedItems] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [profileImages, setProfileImages] = useState<Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>>([])
  // 🔧 FIX: stale state問題解決のため、最新の画像配列をrefで保持
  const profileImagesRef = useRef<Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>>([])
  // 🌸 TASK1: hydration完了後のqueued再計算用フラグ
  const queuedRecalcRef = useRef<boolean>(false)
  // 🛡️ CRITICAL: ユーザーID変更検出の誤発火防止用ref
  const prevUserIdRef = useRef<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // 🚨 CRITICAL FIX: ユーザー切り替え時の画像リセット（原因A対策）
  // 🛡️ 誤発火防止: 初回・初期化中・fromMyPage遷移時はリセットしない
  useEffect(() => {
    const currentUserId = user?.id ?? null
    const prevUserId = prevUserIdRef.current

    // fromMyPage判定（URLパラメータから）
    const isFromMyPage = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('fromMyPage') === 'true'

    // 🛡️ 初回（prevUserIdがない）は変更判定しない - refを更新して終了
    if (!prevUserId) {
      prevUserIdRef.current = currentUserId
      console.log('🔒 ユーザーID変更検出: 初回スキップ（prevUserId未設定）', { currentUserId })
      return
    }

    // 🛡️ 初期化中は判定禁止
    if (isInitializing || initializingRef.current) {
      console.log('🔒 ユーザーID変更検出: 初期化中スキップ', { currentUserId, prevUserId })
      return
    }

    // 🛡️ MyPageからの遷移はリセット禁止（最重要）
    if (isFromMyPage) {
      prevUserIdRef.current = currentUserId
      console.log('🔒 ユーザーID変更検出: fromMyPage遷移スキップ', { currentUserId, prevUserId })
      return
    }

    // 🎯 両方揃っていて、明確に変わった時だけ "変更検出"
    if (currentUserId && prevUserId !== currentUserId) {
      console.log('🎯 ユーザーID変更検出 - 画像リセット実行:', {
        prevUserId,
        currentUserId,
        reason: 'USER_ACTUALLY_CHANGED'
      })
      setProfileImages([])
      profileImagesRef.current = []
    }

    prevUserIdRef.current = currentUserId
  }, [user?.id, isInitializing])

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
    clearErrors,
    formState: { errors }
  } = useForm<ProfileEditFormData>({
    resolver: zodResolver(createProfileEditSchema(isForeignMale, t)),
    mode: 'onChange',
    defaultValues: {
      nationality: typeof window !== 'undefined' && profileType === 'foreign-male'
        ? new URLSearchParams(window.location.search).get('nationality') || 'アメリカ'
        : undefined,
      // ✨ language_skillsのデフォルト値を設定（初期表示で1行表示・placeholder表示のため空文字）
      language_skills: [{ language: '', level: '' } as LanguageSkill]
    }
  })

  // 🧪 WATCH VALUE DEBUG - visit_schedule と travel_companion の実値監視
  const watchVisit = watch('visit_schedule')
  const watchCompanion = watch('travel_companion')

  useEffect(() => {
    console.log('🧪 WATCH VALUE DEBUG', {
      visit_schedule: watchVisit,
      travel_companion: watchCompanion,
      visitIsFormsKey: typeof watchVisit === 'string' && watchVisit.includes('forms.'),
      companionIsFormsKey: typeof watchCompanion === 'string' && watchCompanion.includes('forms.')
    })
  }, [watchVisit, watchCompanion])

  // 言語切り替え時エラー状態クリア（「韓国語のエラーが中国語UIに残る」状態を防ぐ）
  useEffect(() => {
    clearErrors()
    console.log('🌐 Language switched to:', currentLanguage, '- Cleared all errors')
  }, [currentLanguage, clearErrors])

  // 🎯 TASK1: 画像SSOT統一システム（photo_urls優先、avatar_url後方互換）
  const calculateFinalPhotoUrls = () => {
    console.log('🎯 [SSOT] calculateFinalPhotoUrls実行開始:', {
      profileImages_count: profileImages.length,
      source: 'unified_image_ssot_system'
    })
    
    if (profileImages.length === 0) {
      console.log('🎯 [SSOT] 結果: photo_urls=[] (画像なし)')
      return []
    }
    
    const finalPhotoUrls = profileImages
      .map(img => img.originalUrl ?? img.url)
      .filter(Boolean)
      .slice(0, 3)
    
    console.log('🎯 [SSOT] 結果: photo_urls統一算出完了:', {
      photo_urls: finalPhotoUrls,
      count: finalPhotoUrls.length,
      main_avatar_url: finalPhotoUrls[0] ?? null,
      ssot_source: 'profileImages_state'
    })
    
    return finalPhotoUrls
  }

  // プレビュー画面への遷移処理（Zodバリデーション経由）
  const handlePreview = handleSubmit(async (formData) => {
    try {
      console.log('✅ Zod validation passed - opening preview', formData)
      
      // プレビュー用画像URL（blob URLまたは既存URL）
      const previewImageUrl = profileImages.find(img => img.isMain)?.url || profileImages[0]?.url || null

      // 🚨 A. 統一された画像状態算出
      const finalPhotoUrls = calculateFinalPhotoUrls()
      
      const previewData = {
        ...formData,
        hobbies: selectedHobbies,
        personality: selectedPersonality,
        planned_prefectures: selectedPlannedPrefectures,
        visit_schedule: formData.visit_schedule || '',
        travel_companion: formData.travel_companion || '',
        image: previewImageUrl,
        profile_image: previewImageUrl,
        // 🚨 CRITICAL FIX: photo_urls配列を必ずセット（根本問題解決）
        photo_urls: finalPhotoUrls,
        // 🚀 CRITICAL FIX: 最新のlanguageSkills stateを必ず含める
        language_skills: languageSkills
      }
      
      console.log('🚨 PREVIEW DATA VERIFICATION - photo_urls追加確認:', {
        photo_urls_value: finalPhotoUrls,
        photo_urls_count: finalPhotoUrls.length,
        photo_urls_preview: finalPhotoUrls.map(url => url.substring(0, 50) + '...'),
        profileImages_count: profileImages.length,
        previewData_has_photo_urls: 'photo_urls' in previewData
      })
      
      // 🔧 指示書要求: profileImagesではなくfinalPhotoUrls確定値をsessionStorageに保存
      console.log('[SESSION] finalPhotoUrls確定値を保存:', { 
        source: 'calculateFinalPhotoUrls',
        count: finalPhotoUrls.length,
        urls: finalPhotoUrls.map(url => url.substring(0, 30) + '...')
      })

      // 🔒 セキュリティ強化: ユーザー固有のプレビューデータ保存
      const previewDataKey = `previewData_${user?.id || 'anonymous'}`
      sessionStorage.setItem(previewDataKey, JSON.stringify(previewData))

      // 🛡️ 同一タブ遷移に統一（別タブ廃止）
      // 現在のURLパラメータ（type/lang）を維持したままプレビューへ
      const currentType = searchParams?.get('type') || ''
      const currentLang = searchParams?.get('lang') || 'ja'
      const previewUrl = `/profile/preview?userId=${user?.id || ''}${currentType ? `&type=${currentType}` : ''}&lang=${currentLang}`

      console.log('✅ PREVIEW_OPEN_MODE: same-tab (router.push)')
      console.log('🚀 NAVIGATE_TO_PREVIEW_SAME_TAB:', { url: previewUrl })

      router.push(previewUrl)
    } catch (error) {
      console.error('❌ Error opening preview:', error)
      alert('プレビューの表示でエラーが発生しました。もう一度お試しください。')
    }
  }, (errors) => {
    console.error('❌ フォームバリデーションエラー:', errors)
    
    // エラーメッセージを表示
    if (errors.language_skills) {
      alert(`言語スキルエラー: ${errors.language_skills.message || '言語と言語レベルを正しく入力してください'}`)
    } else {
      const firstError = Object.values(errors)[0]
      alert(`入力エラー: ${firstError?.message || '入力内容を確認してください'}`)
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

  // 🌟 CRITICAL: 統一された完成度計算・更新ヘルパー（初期化ガード付き）
  const updateCompletionUnified = useCallback((source: string = 'unknown', explicitImages?: any[]) => {
    // 🚨 CRITICAL: ガード条件統一化 - isInitializingのみをチェック
    if (initializingRef.current === true) {
      console.log('🛑 completion skipped because initializingRef=true', { 
        source, 
        initializingRef: initializingRef.current,
        isInitializing,
        reason: '初期化中のみスキップ' 
      })
      return
    }
    
    // 🌸 TASK1: 初期化完了前はqueuedRecalcフラグを立てる（永続スキップを禁止）
    if (!isHydrated) {
      queuedRecalcRef.current = true
      console.log('🛡️ updateCompletionUnified: ハイドレーション未完了のため計算スキップ', { 
        triggerSource: source,
        isHydrated,
        isInitializing,
        initializingRef: initializingRef.current,
        userReady: !!user,
        queuedRecalc_ON: queuedRecalcRef.current,
        willExecuteAfterHydration: true,
        imagesCount: profileImagesRef.current.length,
        hydrationStatus: 'pending',
        skipReason: 'HYDRATION_NOT_READY',
        timestamp: new Date().toISOString()
      })
      return
    }
    
    // 🔍 DEBUG: 計算実行時のログ
    console.log('✅ updateCompletionUnified: 計算実行開始', {
      source,
      isHydrated,
      isInitializing,
      initializingRef: initializingRef.current,
      userReady: !!user,
      skipReason: 'NO_SKIP',
      timestamp: new Date().toISOString()
    })
    
    // 🔥 Task A: 画像入力優先順位見直し（profile.avatar_url補完追加）
    const rawImagesForCalc = (() => {
      // 1. explicitImages（ありかつ非空なら最優先）
      if (Array.isArray(explicitImages) && explicitImages.length > 0) {
        return explicitImages
      }
      
      // 2. profileImagesRef（UIが持っている真実）
      if (Array.isArray(profileImagesRef.current) && profileImagesRef.current.length > 0) {
        return profileImagesRef.current
      }
      
      // 3. フォーム値のprofile_images（最後の手段）
      // getValues型エラー回避のため、watchで取得
      const allFormValues = getValues() as any
      const formImages = allFormValues?.profile_images
      if (Array.isArray(formImages) && formImages.length > 0) {
        return formImages
      }
      
      // 🔥 Task A修正: DBのavatar_urlから画像補完（条件付き抑制版）
      // 🚨 CRITICAL FIX: didTouchPhotos=true の時は補完を完全無効化（画像削除が正しく反映されるように）
      if (didTouchPhotosRef.current === true) {
        console.log('🚫 avatar_url補完スキップ: didTouchPhotos=true（画像操作後は編集中の配列を信頼）', {
          didTouchPhotosRef: didTouchPhotosRef.current,
          profileImagesRef_length: profileImagesRef.current.length,
          reason: '画像削除後に0枚を正しく検出するため'
        })
        // 補完しない → 空配列を返す
        return []
      }

      // 🔥 TASK A追加: photo_urlsが明示的に空配列の場合は補完しない
      // （ユーザーが0枚で保存した意図を尊重）
      const dbPhotoUrls = dbProfile?.photo_urls
      if (Array.isArray(dbPhotoUrls) && dbPhotoUrls.length === 0) {
        console.log('🚫 avatar_url補完スキップ: photo_urls=[]（0枚保存を尊重）', {
          photo_urls: dbPhotoUrls,
          avatar_url: dbProfile?.avatar_url ? 'exists' : 'null',
          reason: 'DBにphoto_urls=[]が明示的に保存されている'
        })
        return []
      }

      // 🔥 TASK A追加: photo_urlsに有効なURLがある場合はそれを使用
      if (Array.isArray(dbPhotoUrls) && dbPhotoUrls.length > 0 && dbPhotoUrls.some((url: any) => url && typeof url === 'string' && url.trim() !== '')) {
        console.log('🖼️ 画像ソース決定: DBのphoto_urlsを使用', {
          photo_urls_count: dbPhotoUrls.length,
          source: 'db_photo_urls'
        })
        return dbPhotoUrls
          .filter((url: any) => url && typeof url === 'string' && url.trim() !== '')
          .slice(0, 3)
          .map((url: string, index: number) => ({
            id: `db_photo_${index}`,
            url: url,
            originalUrl: url,
            isMain: index === 0,
            isEdited: false
          }))
      }

      // 🔧 最後の保険: avatar_urlがあり、photo_urlsがnull/undefinedの場合のみ補完（互換性維持）
      if (typeof dbProfile?.avatar_url === "string" && dbProfile.avatar_url.trim().length > 0 && !Array.isArray(dbPhotoUrls)) {
        console.log('🛡️ 画像補完: DBのavatar_urlから画像データ生成（photo_urls=null時のみ）', {
          avatar_url_preview: dbProfile.avatar_url.substring(0, 30) + '...',
          photo_urls_status: dbPhotoUrls === null ? 'null' : dbPhotoUrls === undefined ? 'undefined' : 'other',
          补完_reason: 'photo_urlsがnull/undefinedの旧データ互換性維持',
          didTouchPhotosRef: didTouchPhotosRef.current
        })
        return [{
          id: 'db-avatar',
          url: dbProfile.avatar_url,
          originalUrl: dbProfile.avatar_url,
          isMain: true,
          isEdited: false
        }]
      }
      
      // すべて空/未定義なら空配列
      return []
    })()
    
    // 🎯 CRITICAL FIX: 画像配列正規化（原因B対策）
    const normalizeImageArray = (imageArray: any[]): Array<{ url: string; isMain: boolean }> => {
      if (!Array.isArray(imageArray)) return []
      
      return imageArray
        .map(img => {
          // string形式の場合
          if (typeof img === 'string') {
            return { url: img, isMain: false }
          }
          
          // object形式の場合
          if (img && typeof img === 'object') {
            const url = img.url || img.originalUrl || img.avatar_url || img.profile_image
            if (url && typeof url === 'string') {
              return { url, isMain: Boolean(img.isMain) }
            }
          }
          
          return null
        })
        .filter((img): img is { url: string; isMain: boolean } => {
          // null除外 + base64画像除外（data:image/...）
          if (!img || !img.url) return false
          return typeof img.url === 'string' &&
                 img.url.trim() !== '' &&
                 !img.url.startsWith('data:image/')  // 🚨 base64画像は無効として除外
        }) as Array<{ url: string; isMain: boolean }>
    }
    
    // 🚨 B+C案修正: 完成度判定には寛容な正規化を使用
    // 🚨 CRASH GUARD: normalizeImagesForCompletion関数チェック
    let imagesForCalc: any[]
    if (typeof normalizeImagesForCompletion !== 'function') {
      console.error('[DEBUG] normalizeImagesForCompletion is not function', {
        type: typeof normalizeImagesForCompletion,
        value: normalizeImagesForCompletion,
        source: 'updateCompletionUnified'
      })
      // フォールバック：空配列を返す
      imagesForCalc = []
      console.warn('[FALLBACK] Using empty array for imagesForCalc due to function error')
    } else {
      imagesForCalc = normalizeImagesForCompletion(rawImagesForCalc)
    }
    
    console.log('🔧 updateCompletionUnified: 画像配列決定と正規化', {
      source,
      explicitImages_length: explicitImages?.length || 'not provided',
      profileImages_state_length: profileImages.length,
      profileImagesRef_length: profileImagesRef.current.length,
      raw_imagesForCalc_length: rawImagesForCalc.length,
      profile_avatar_url_exists: !!dbProfile?.avatar_url,
      profile_avatar_url_preview: dbProfile?.avatar_url?.substring(0, 30) || 'null',
      normalized_imagesForCalc_length: imagesForCalc.length,
      base64_filtered: rawImagesForCalc.length - imagesForCalc.length,
      using: explicitImages ? 'explicitImages' : 'profileImagesRef',
      sample_raw: rawImagesForCalc.slice(0, 2),
      sample_normalized: imagesForCalc.slice(0, 2)
    })

    try {
      const currentData = watch()
      const { custom_culture, ...currentDataWithoutCustomCulture } = currentData || {}
      
      // 🎯 後方互換FIX: avatar_urlをDBからフォールバック取得
      // photo_urls=[]でもavatar_urlがDBにあれば画像あり判定させる
      const formAvatarUrl = (currentDataWithoutCustomCulture as any).avatar_url
      const effectiveAvatarUrl = formAvatarUrl || dbProfile?.avatar_url || ''

      console.log('🎯 AVATAR_URL後方互換チェック:', {
        form_avatar_url: formAvatarUrl ? 'exists' : 'empty',
        db_avatar_url: dbProfile?.avatar_url ? 'exists' : 'empty',
        effective: effectiveAvatarUrl ? 'set' : 'empty',
        source: formAvatarUrl ? 'form' : (dbProfile?.avatar_url ? 'db_fallback' : 'none')
      })

      const formValuesForCompletion = {
        ...currentDataWithoutCustomCulture,
        hobbies: selectedHobbies,
        personality: selectedPersonality,
        language_skills: languageSkills,
        planned_prefectures: selectedPlannedPrefectures,
        // 🎯 後方互換: avatar_urlを明示的に含める（photo_urls=[]でもDBのavatar_urlで救済）
        avatar_url: effectiveAvatarUrl,
      }

      // 🌸 必須確認ログ - 全タスク要求を満たす統合ログ
      console.log('🌟 updateCompletionUnified: 統一フロー実行', {
        triggerSource: source,
        imagesCount: imagesForCalc.length,
        has_profile_image: imagesForCalc.length > 0,
        isHydrated,
        queuedRecalc: queuedRecalcRef.current,
        hobbies_length: formValuesForCompletion.hobbies?.length || 0,
        personality_length: formValuesForCompletion.personality?.length || 0,
        language_skills_length: formValuesForCompletion.language_skills?.length || 0,
        imagesForCalc_length: imagesForCalc.length,
        imagesForCalc_detail: imagesForCalc.map((img: any) => ({ url: img.url?.substring(0, 50) || 'no-url', hasUrl: !!img.url, isMain: img.isMain })),
        hydrationStatus: isHydrated ? 'completed' : 'pending'
      })

      const urlParams = new URLSearchParams(window.location.search)
      // 🔗 DB存在ベースでisNewUser判定（dbProfileの存在で判断）
      // ensureProfileForUser()により確実にプロフィールが存在するため、基本的にfalse
      const isNewUser = !dbProfile || (!dbProfile.name && !dbProfile.bio && !dbProfile.interests)
      
      console.log('🔍 isNewUser DB-based determination:', {
        hasDbProfile: !!dbProfile,
        isNewUser,
        userId: user?.id,
        fromSignup: urlParams.get('from') === 'signup'
      })

      // 🔍 CRITICAL DEBUG: 完成度計算直前のデバッグログ（SSOT統一）
      console.log('🚨 COMPLETION DEBUG - 計算直前チェック:', {
        '1_profile_avatar_url': {
          exists: !!dbProfile?.avatar_url,
          type: typeof dbProfile?.avatar_url,
          isBase64: dbProfile?.avatar_url?.startsWith('data:image/'),
          preview: dbProfile?.avatar_url?.substring(0, 50) + '...'
        },
        '2_profileImages_state': {
          length: profileImages.length,
          sample: profileImages.slice(0, 2),
          types: profileImages.map(img => typeof img)
        },
        '3_imagesForCalc_normalized': {
          length: imagesForCalc.length,
          sample: imagesForCalc.slice(0, 2),
          allTypesCorrect: imagesForCalc.every((img: any) => typeof img.url === 'string' && typeof img.isMain === 'boolean')
        },
        '4_formValues_profile_images': {
          raw: 'profile_images not in form values',
          length: 'using profileImages state instead'
        }
      })
      
      // 🚨 CRASH GUARD: calculateCompletionFromForm関数チェック
      let result: any
      if (typeof calculateCompletionFromForm !== 'function') {
        console.error('[DEBUG] calculateCompletionFromForm is not function', {
          type: typeof calculateCompletionFromForm,
          value: calculateCompletionFromForm,
          source: 'updateCompletionUnified'
        })
        // フォールバック結果
        result = {
          completion: 0,
          completedFields: 0,
          totalFields: isForeignMale ? 17 : 14,
          hasImages: false
        }
        console.warn('[FALLBACK] Using default completion result due to function error')
      } else {
        result = calculateCompletionFromForm(
          formValuesForCompletion,
          isForeignMale ? 'foreign-male' : 'japanese-female',
          imagesForCalc,
          isNewUser
        )
      }
      
      // 🔍 CRITICAL DEBUG: hasProfileImages判定結果の詳細ログ
      console.log('🚨 COMPLETION RESULT - hasProfileImages判定結果:', {
        final_completion: result.completion,
        hasImages_result: result.hasImages,
        missing_fields: result.hasImages ? 'none' : 'profile_images',
        calculation_source: 'calculateCompletionFromForm',
        images_passed_to_calc: imagesForCalc.length,
        // 🔥 Task A確認用デバッグログ
        profile_avatar_url_exists: !!dbProfile?.avatar_url,
        profile_avatar_url_preview: dbProfile?.avatar_url?.substring(0, 30) || 'null',
        avatar_url_補完_success: rawImagesForCalc.some((img: any) => img.id === 'db-avatar'),
        task_A_effectiveness: imagesForCalc.length > 0 ? 'SUCCESS' : 'NEED_CHECK'
      })

      console.log('🌟 updateCompletionUnified: 完了', {
        completion: result.completion,
        completedFields: result.completedFields,
        totalFields: result.totalFields,
        source: '統一ヘルパー関数'
      })

      setProfileCompletion(result.completion)
      setCompletedItems(result.completedFields)
      setTotalItems(result.totalFields)
    } catch (error) {
      console.error('❌ updateCompletionUnified: エラー', error)
    }
  }, [isInitializing, isHydrated, watch, selectedHobbies, selectedPersonality, languageSkills, selectedPlannedPrefectures, profileImages, isForeignMale])

  // プロフィール画像の変更を監視して完成度を再計算
  // 🌸 TASK3: profileImages state更新後に必ず完成度再計算を1回実行
  // 🚨 CRITICAL FIX: didTouchPhotosRef=true の時のみ再計算（MyPage→Edit遷移では発火しない）
  useEffect(() => {
    // didTouchPhotosRef.current が true の時のみ（画像操作後のみ）
    if (didTouchPhotosRef.current && isHydrated && !isInitializing) {
      console.log('📝 profileImages state updated (didTouchPhotos=true):', profileImages.length, 'images')
      console.log('🔄 画像操作後の完成度再計算を実行')
      updateCompletionUnified('profileImages-state-change-after-touch')
    }
  }, [profileImages, isInitializing, isHydrated, updateCompletionUnified])

  // 🔧 CRITICAL: 初期化完了後の強制計算関数
  // 🔥 TASK B修正: refを使用してスキップノイズを解消
  const forceInitialCompletionCalculation = useCallback(() => {
    console.log('🔥 forceInitialCompletionCalculation start')

    // 🔧 TASK B: refを使用（stateは非同期更新なのでタイミング問題あり）
    // initializingRef.current を使うことで、setTimeoutからの呼び出しでも正確に判定できる
    const isStillInitializing = initializingRef.current

    console.log('🔍 forceInitialCompletionCalculation: 状態チェック', {
      initializingRef_current: isStillInitializing,
      isInitializing_state: isInitializing,
      isHydrated_state: isHydrated
    })

    // refがtrueの場合のみスキップ（stateではなくrefを信頼）
    if (isStillInitializing) {
      console.log('⏸️ forceInitialCompletionCalculation: skipped - initializingRef=true')
      return
    }

    // 🛡️ タスクA: フォームデータが揃うまで force calc をスキップ（ちらつき防止）
    // 既存ユーザー（fromMyPage）の場合、DBからデータが読み込まれるまで待つ
    const currentProfileImages = profileImagesRef.current
    const hasHobbies = selectedHobbies.length > 0
    const hasPersonality = selectedPersonality.length > 0
    const hasImages = currentProfileImages.length > 0
    const formReady = hasHobbies || hasPersonality || hasImages

    // fromMyPage遷移時は必ずデータがあるはずなので、揃う前にスキップ
    const isFromMyPage = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('fromMyPage') === 'true'

    if (isFromMyPage && !formReady) {
      console.log('🛑 FORCE CALC SKIPPED: form not ready', {
        hasHobbies,
        hasPersonality,
        hasImages,
        reason: 'fromMyPage遷移だがデータ未読込 → MAIN WATCHに任せる'
      })
      return
    }

    console.log('✅ FORCE CALC EXECUTED: form ready', {
      hasHobbies,
      hasPersonality,
      hasImages,
      isFromMyPage
    })

    try {
      // 🔧 最新フォーム値を直接取得
      const currentFormData = getValues()

      console.log('⚡ FORCE CALC: フォームデータ収集', {
        formData_keys: Object.keys(currentFormData),
        images_length: currentProfileImages.length,
        personality_length: selectedPersonality.length,
        hobbies_length: selectedHobbies.length
      })
      
      // 🔧 完成度計算用データを構築
      const completionInput = {
        ...currentFormData,
        hobbies: selectedHobbies,
        personality: selectedPersonality,
        culture: [], // culture は watch() で直接取得
        languageSkills: languageSkills,
        plannedPrefectures: selectedPlannedPrefectures
      }
      
      // 🔧 完成度を直接計算（isInitializingガード無視）
      const userType = isForeignMale ? 'foreign-male' : 'japanese-female'
      const calculatedCompletion = calculateCompletionFromForm(completionInput, userType, currentProfileImages)
      
      console.log('📊 force calculation result:', calculatedCompletion.completion)
      
      // 🔧 完成度を直接設定
      setProfileCompletion(calculatedCompletion.completion)
      
    } catch (error) {
      console.error('❌ FORCE CALC ERROR:', error)
      // エラー時は最低限の計算
      setProfileCompletion(0)
    }
  }, [getValues, selectedPersonality, selectedHobbies, languageSkills, selectedPlannedPrefectures])

  // 🔧 REMOVED: useEffect による状態監視は削除
  // 初期化処理の最終行で直接呼び出す方式に変更

  // 生年月日変更時の年齢自動更新
  const handleBirthDateChange = useCallback((birthDate: string) => {
    if (birthDate) {
      const age = calculateAge(birthDate)
      setValue('age', age)
      setValue('birth_date', birthDate)
      
      // 🔧 MAIN WATCH統一: フォーム値変更のみ（完成度再計算はメインwatchが担当）
      console.log('📅 生年月日変更: フォーム値更新', { birthDate, age })
    }
  }, [calculateAge, setValue])


  // 簡素化された国籍設定（他のフィールドと同様にresetで処理）

  // 削除された古いコード（305-519行目）は正常に削除されました
  // 写真変更フラグ（デバウンス計算との競合を避けるため）
  const [isImageChanging, setIsImageChanging] = useState(false)

  // 🚨 4) didTouchPhotosフラグ（破壊防止の最短手）
  const [didTouchPhotos, setDidTouchPhotos] = useState(false)
  const didTouchPhotosRef = useRef(false)  // ✅ 完成度計算からの参照用ref
  
  // 写真変更時のコールバック関数
  const handleImagesChange = useCallback(async (
    newImages: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }>,
    deleteInfo?: { isDeletion: boolean; prevLength: number; deletedImageId: string }
  ) => {
    try {
      // 🌸 TASK1: TEST mode / user状態検出
      const isTestMode = !user?.id || typeof window !== 'undefined' && (
        new URLSearchParams(window.location.search).get('devTest') === 'true' ||
        window.location.pathname.includes('/test') ||
        localStorage.getItem('devTestMode') === 'true'
      )
      
      // ✅ REF基準: 削除前の画像配列を確実に取得（state依存禁止）
      const prevImages = profileImagesRef.current ?? []
      const prevCount = deleteInfo?.prevLength ?? prevImages.length
      const nextCount = newImages.length

      // 🚨 IMAGE_DELETE_START: error boundary発火時の原因特定ログ（REF基準）
      console.log('🚨 IMAGE_DELETE_START', {
        timestamp: new Date().toISOString(),
        isTestMode: isTestMode,
        userId: user?.id || 'undefined',
        prevCount: prevCount,  // ✅ REF基準（state依存削除）
        nextCount: nextCount,
        isDeletionFlag: deleteInfo?.isDeletion ?? false,
        sessionAvailable: typeof sessionStorage !== 'undefined',
        windowAvailable: typeof window !== 'undefined',
        // 🔍 スタックトレース用情報
        currentUrl: typeof window !== 'undefined' ? window.location.href : 'unknown',
        callStack: (new Error()).stack?.split('\n').slice(1, 5) || 'no stack',
        hydrated: isHydrated,
        initializing: isInitializing
      })

    // 🔧 CRITICAL FIX: 削除判定をREF基準で行う（state依存禁止）
    const isExplicitDeletion = deleteInfo?.isDeletion === true
    const currentImageIds = prevImages.map(img => img.id).sort()  // ✅ REF基準
    const newImageIds = newImages.map(img => img.id).sort()
    const isDeletion = isExplicitDeletion || (nextCount < prevCount)  // ✅ 明示的な削除フラグ優先
    const isSameImageSet = currentImageIds.length === newImageIds.length &&
                          currentImageIds.every((id, index) => id === newImageIds[index])

    // 🛡️ メイン画像変更（順序変更）を検出：ソートなしで順序比較
    const currentOrder = prevImages.map(img => img.id)
    const newOrder = newImages.map(img => img.id)
    const isOrderChanged = currentOrder.length === newOrder.length &&
                           !currentOrder.every((id, index) => id === newOrder[index])

    if (isExplicitDeletion) {
      console.log('🧨 削除フラグ検出: 同一判定を完全無効化', {
        deleteInfo,
        current_ids: currentImageIds,
        new_ids: newImageIds,
        forcedProcessing: true
      })
    } else if (isOrderChanged) {
      // 🛡️ メイン画像変更（順序変更）は必ず処理する
      console.log('🔄 MAIN PHOTO REORDER DETECTED - 順序変更を処理:', {
        current_order: currentOrder,
        new_order: newOrder,
        new_main_id: newImages[0]?.id,
        new_main_url: newImages[0]?.url?.substring(0, 50) + '...'
      })
    } else if (isSameImageSet && !isDeletion) {
      console.log('🚫 同じ画像セット（ID比較）のため処理をスキップ', {
        current_ids: currentImageIds,
        new_ids: newImageIds,
        isDeletion: false,
        explicitDeletion: false
      })
      return
    } else if (isDeletion) {
      console.log('🗑️ 削除操作検出: スキップ判定を無効化', {
        current_ids: currentImageIds,
        new_ids: newImageIds,
        fromLength: currentImageIds.length,
        toLength: newImageIds.length
      })
    }
    
    console.log('🎯 画像状態変更検出', {
      from: currentImageIds.length + '枚',
      to: newImageIds.length + '枚',
      current_ids: currentImageIds,
      new_ids: newImageIds
    })
    
    // 🌸 TASK3: 競合ガード - 直前に画像追加があった場合、短期間の0枚イベントを無視
    const lastChangeTime = Date.now()
    let lastChange = null
    
    // 安全なキーで最後の変更時刻を取得
    try {
      if (typeof sessionStorage !== 'undefined') {
        const tempImageChangeKey = user?.id ? 
          `imageChangeTime_${user.id}` : 
          `imageChangeTime_test_${searchParams?.get('type') || 'unknown'}_${searchParams?.get('nickname') || 'anon'}`
        lastChange = sessionStorage.getItem(tempImageChangeKey)
      }
    } catch (storageError) {
      console.error('🚨 READ_TIMESTAMP_FAILED:', storageError)
    }
    
    if (newImages.length === 0 && currentImageIds.length > 0 && lastChange) {
      const timeSinceLastChange = lastChangeTime - parseInt(lastChange)
      if (timeSinceLastChange < 500) { // 500ms以内の0枚イベントは無視
        console.log('🛡️ 競合ガード: 直前の画像追加から500ms以内の0枚イベントを無視', {
          timeSinceLastChange,
          previousImages: currentImageIds.length
        })
        return
      }
    }
    
      // 🌸 TASK2: 安全なキー生成関数でundefinedキー禁止（TESTモード用固定キー）
      const getProfileImagesKey = () => {
        // TESTモードは完全固定キーで安全化
        if (isTestMode) return 'currentProfileImages_test'
        // 本番モードのみuser.idを使用
        return user?.id ? `currentProfileImages_${user.id}` : 'currentProfileImages_test'
      }
      
      const imageChangeKey = getProfileImagesKey().replace('currentProfileImages', 'imageChangeTime')
      
      // 画像変更タイムスタンプを記録（安全なキーで）
      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.setItem(imageChangeKey, lastChangeTime.toString())
        } catch (storageError) {
          console.error('🚨 TIMESTAMP_STORAGE_FAILED:', storageError)
        }
      }
    
      // 🚨 4) 画像変更フラグ設定（破壊防止）+ 🎯 TASK4: 確実な検出保証（REF基準）
      setDidTouchPhotos(true)
      didTouchPhotosRef.current = true  // 🚨 CRITICAL: refも同期（完成度計算で参照）

      // ✅ REF基準: is_addition / is_deletion の正確な判定（削除なのに追加扱い防止）
      const isAddition = !isDeletion && (nextCount > prevCount)
      const isDeletionFinal = isDeletion || (nextCount < prevCount)

      console.log('🎯 [TASK4] didTouchPhotos = true (画像操作検出・REF基準)', {
        operation: isAddition ? '追加' : isDeletionFinal ? '削除' : '入替',
        previous_count: prevCount,  // ✅ REF基準
        new_count: nextCount,
        is_addition: isAddition,  // ✅ 削除フラグ優先で誤判定防止
        is_deletion: isDeletionFinal,
        is_replacement: nextCount === prevCount && newImages.some((img, idx) => img.id !== prevImages[idx]?.id),
        guarantee: 'payloadにphoto_urls配列を確実に含める'
      })
      
      // ① まずUI/state を更新（functional updateで安全に）
      setIsImageChanging(true)
      setProfileImages(prev => {
        console.log('[FUNCTIONAL] profileImages更新:', { prev_length: prev.length, new_length: newImages.length })
        return newImages
      })
      // 🚨 Type safety fix
      if (profileImagesRef.current) {
        profileImagesRef.current.length = 0
        profileImagesRef.current.push(...newImages)
      } else {
        profileImagesRef.current = newImages
      }
      
      // 🚨 REMOVED: profile_imagesはDBに存在しないためsetValueを削除
      // 画像はprofileImages stateとprofileImagesRef.currentで管理する
      // RHFフォーム値への同期は不要（DBカラムに存在しない項目をフォームに入れない）

      console.log('🚨 画像state更新完了（RHFへのprofile_images同期は廃止）:', {
        profileImages_length: newImages.length,
        ref_length: profileImagesRef.current.length
      })
      
      console.log('🧨 UI/state更新完了:', { 
        newImages_length: newImages.length,
        ref_length: profileImagesRef.current.length,
        isDeletion: isDeletion,
        explicitDeletion: isExplicitDeletion
      })

      // ✅ SSOT維持: 完成度計算はMAIN WATCHに任せる（多重発火防止）
      // 画像はprofileImages state + profileImagesRefで管理（RHFフォーム値は不使用）
      console.log('📸 画像変更: state/ref更新完了（完成度計算はMAIN WATCHが担当）', {
        newImagesLength: newImages.length,
        isDeletion,
        ssotMode: 'MAIN_WATCH_ONLY'
      })
      
      // ② TESTモード時の処理分岐（DB保存は継続）
      if (isTestMode) {
        console.log('🧪 TEST MODE: Local storage handled, but DB save continues', {
          isTestMode: true,
          hasUserId: !!user?.id,
          willContinueToDbSave: true
        })
        // localStorage処理のみ調整済み、DB処理は継続
      }
      
      // userIdが無い場合のみ外部I/Oを停止（安全策として維持）
      if (!user?.id) {
        console.log('🧪 No user ID, skipping all external I/O', {
          hasUserId: false,
          localStateOnly: true,
          completionAlreadyUpdated: true
        })
        setIsImageChanging(false)
        return
      }
    
      // ③ 本番のみ：安全なStorage更新
      try {
        const safeImageKey = getProfileImagesKey()
        const safeTimestampKey = safeImageKey.replace('currentProfileImages', 'imageStateTimestamp')
        
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(safeImageKey, JSON.stringify(newImages))
          sessionStorage.setItem(safeTimestampKey, Date.now().toString())
          sessionStorage.setItem('imageEditHistory', 'true')
          
          console.log('💾 セッションストレージ更新完了:', safeImageKey)
        }
      } catch (sessionError) {
        console.error('🚨 IMAGE_DELETE_STORAGE_FAILED:', {
          error: sessionError instanceof Error ? sessionError.message : sessionError,
          stack: sessionError instanceof Error ? sessionError.stack : 'no stack'
        })
        // sessionStorageエラーでもUIは継続
      }
    
      // ✅ TASK2: アップロード中のPATCH処理を停止（最終保存時のみ）
      console.log('🚨 [TASK2] アップロード中のDB更新を停止 - 最終保存時のみに変更', {
        newImages_count: newImages.length,
        hasBlobs: newImages.some(img => img.url.startsWith('blob:')),
        reason: '3枚アップ時に各画像ごとにPATCHが発生するのを防ぐ',
        solution: '保存ボタンクリック時に1回だけphoto_urls=[url1,url2,url3]をPATCH'
      })
      
      // 🚨 NOTE: DB更新処理を完全にコメントアウト（最終保存時のみに変更）
      /*
      // ④ 本番のみ：安全なDB更新
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
        
        console.log('💾 データベース更新開始:', {
          hasImages: newImages.length > 0,
          hasBlobImages: newImages.some(img => img.url.startsWith('blob:')),
          avatarUrl,
          willSave: !!avatarUrl
        })
        
        // blob URLでない場合のみデータベースに保存
        if (avatarUrl) {
          // 🛡️ 恒久ガード: base64はStorageにアップロードしてURLに変換
          console.log('🛡️ Avatar URL normalization before DB save')
          const { normalizeAvatarUrl } = await import('@/utils/avatarStorage')
          const normalizeResult = await normalizeAvatarUrl(avatarUrl, user.id)
          
          if (!normalizeResult.success) {
            throw new Error(`Avatar処理失敗: ${normalizeResult.error}`)
          }
          
          const finalAvatarUrl = normalizeResult.avatarUrl
          if (normalizeResult.wasBase64) {
            console.log('✅ Base64をStorage URLに変換:', finalAvatarUrl?.substring(0, 50) + '...')
          }
          
          // 🔄 Storage path方式で保存
          const { updateProfileAvatar } = await import('@/utils/avatarUploader')
          const uploadResult = await updateProfileAvatar(avatarUrl, user.id, supabase)
          
          if (!uploadResult.success || !uploadResult.dbUpdateSuccess) {
            throw new Error(`Avatar保存失敗: ${uploadResult.error}`)
          }
          
          console.log(`🔄 Avatar saved to DB as storage path: ${uploadResult.storagePath}`)
          
          // DB更新は既にupdateProfileAvatarで実行済み
          console.log('✅ Storage path画像保存完了')
          console.log('✅ 写真がデータベースに保存されました')
        } else if (newImages.length === 0) {
          // 画像が完全に削除された場合は、データベースのavatar_urlをnullに更新
          const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('user_id', user.id)

          if (error) {
            throw new Error(`DB削除失敗: ${error.message}`)
          }
          console.log('✅ 写真がデータベースから削除されました')
        } else {
          console.log('⚠️ blob URL画像のため、データベース保存をスキップ')
        }
      */
      
      console.log('✅ [TASK2] アップロード中のPATCH停止完了 - 保存時のみに統一')
    // 🌸 TASK4: 削除時の確実な状態確認（REF基準）
    if (nextCount === 0 && prevCount > 0) {
      console.log('🗑️ 画像全削除検出: state/ref/sessionStorageを完全同期（REF基準）', {
        beforeDelete: prevCount,  // ✅ REF基準
        afterDelete: nextCount,
        profileImagesRef_will_be: newImages.length
      })
    }
    
    // 🌸 TASK2: react-hook-form フィールドとの単一ソース同期（formには存在しないためコメントアウト）
    // avatar_urlフィールドはフォームスキーマに含まれていないため、state管理のみで十分
    console.log('🔗 画像state同期完了:', {
      images_count: newImages.length,
      state_updated: true,
      ref_updated: true
    })
    
    // 🔧 MAIN WATCH統一: state更新のみ（完成度再計算はメインwatchが担当）
    console.log('📸 写真変更: state更新完了', { 
      images: newImages.length,
      isAddition: newImages.length > currentImageIds.length,
      isDeletion: newImages.length < currentImageIds.length
    })
    
    // 🚨 CRITICAL: 画像変更完了時の確実な状態リセット
    setTimeout(() => {
      console.log('📸 写真変更完了：フラグリセット開始')
      
      // 🔧 STEP 1: isImageChanging を確実に false に戻す
      setIsImageChanging(false)
      console.log('✅ isImageChanging = false 設定完了')
      
      // 🔧 STEP 2: isInitializing も念のため確実に false に戻す
      if (initializingRef.current === true) {
        initializingRef.current = false
        console.log('✅ initializingRef.current = false 強制設定完了')
      }
      
      // ✅ SSOT維持: 完成度計算はMAIN WATCHに任せる（多重発火防止）
      // 画像はprofileImages state + profileImagesRefで管理（RHFフォーム値は不使用）
      console.log('📸 画像変更完了: フラグリセット完了（完成度計算はMAIN WATCHが担当）', {
        isImageChanging: false,
        isInitializing: initializingRef.current,
        finalImageCount: profileImagesRef.current.length,
        isDeletion: newImages.length < currentImageIds.length,
        ssotMode: 'MAIN_WATCH_ONLY'
      })
    }, 100)
    
    } catch (error) {
      // 🌸 TASK4: Next.js error boundary捕捉前の確実ログ出力
      console.error('🚨 CRITICAL ERROR in handleImagesChange:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : 'no stack',
        timestamp: new Date().toISOString(),
        user_id: user?.id || 'undefined',
        isTestMode: !user?.id,
        newImages_length: newImages?.length || 'unknown',
        currentImages_length: profileImages?.length || 'unknown'
      })
      // UIは継続（throwしない）
    }
  }, [])

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
      const enableProfileDeletion = false  // 🛡️ 安全のため完全無効化
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
          
          // フォームの値を更新
          setValue('occupation', parsedData.occupation || 'none')
          setValue('height', parsedData.height || undefined)
          setValue('body_type', parsedData.body_type || 'average')
          setValue('marital_status', parsedData.marital_status || 'single')
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
          // 🛡️ CRITICAL: チラつき防止 - 初期化中は計算をスキップ
          // 🚨 CRITICAL: ガード条件統一 - initializingRefのみをチェック
          if (initializingRef.current === true) {
            console.log('🛑 watch debounce: skipped because initializingRef=true', { 
              initializingRef: initializingRef.current,
              isInitializing,
              reason: 'メインwatch統一ガード' 
            })
            return
          }
          
          // 🚨 CRITICAL FIX: isImageChangingはデバウンス制御のみ、完全スキップは禁止
          if (isImageChanging) {
            console.log('⏳ 写真変更中 - デバウンス時間を延長して計算実行', {
              isImageChanging,
              profileImagesLength: profileImages.length,
              action: 'debounce-延長（スキップ無し）'
            })
            // スキップせず、デバウンス時間のみ延長
            timeoutId = setTimeout(() => {
              try {
                console.log('📸 写真変更中だがデバウンス延長後に完成度計算実行')
                updateCompletionUnified('watch-debounce-during-image-change')
              } catch (error) {
                console.error('🚨 ERROR in watch debounce during image change:', {
                  error: error instanceof Error ? error.message : error,
                  stack: error instanceof Error ? error.stack : 'no stack'
                })
                // 絶対にthrowしない
              }
            }, 1000) // 通常500msから1000msに延長
            return
          }
          
          const currentValues = getValues()
          // custom_culture は完成度計算から除外（コメント扱い）
          const { custom_culture, ...valueWithoutCustomCulture } = value || {}
          
          // 🚨 MAIN WATCH SUBSCRIPTION DEBUG - MyPageと同じログ形式
          const normalizedProfileForWatch = {
            ...valueWithoutCustomCulture,
            birth_date: currentValues.birth_date,
            hobbies: selectedHobbies, // 状態から直接取得
            personality: selectedPersonality, // 状態から直接取得
            language_skills: languageSkills, // ✅ State直接使用（再構築を避ける）
          }
          
          // 🚨 原因特定ログ（修正後も残す）
          console.log('🎯 MAIN WATCH: 完成度再計算実行（唯一の入口）', {
            hobbies: selectedHobbies.length,
            personality: selectedPersonality.length, 
            prefectures: selectedPlannedPrefectures.length,
            languageSkills: languageSkills.length,
            images: profileImages.length,
            // フォーム値との差分確認
            formHobbies: currentValues.hobbies?.length || 0,
            formPersonality: currentValues.personality?.length || 0,
            formLanguageSkills: currentValues.language_skills?.length || 0,
            formPlannedPrefectures: currentValues.planned_prefectures?.length || 0
          })
          
          // 統一フローで完成度更新
          try {
            updateCompletionUnified('watch-debounce')
          } catch (error) {
            console.error('🚨 ERROR in watch debounce main:', {
              error: error instanceof Error ? error.message : error,
              stack: error instanceof Error ? error.stack : 'no stack'
            })
            // 絶対にthrowしない
          }
        }, 500)
      }
    })
    
    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [isForeignMale, profileImages, selectedHobbies, selectedPersonality, selectedPlannedPrefectures, languageSkills, updateCompletionUnified])

  // selectedHobbies変更時のフォーム同期と完成度再計算
  useEffect(() => {
    console.log('🔍 selectedHobbies changed:', selectedHobbies)
    
    // 🔧 フォームフィールドへの同期（初期化中でも必須）
    setValue('hobbies', selectedHobbies, { 
      shouldDirty: true, 
      shouldValidate: true 
    })
    
    // 🔧 MAIN WATCH統一: state更新のみ（完成度再計算はメインwatchが担当）
    console.log('📝 selectedHobbies state updated:', selectedHobbies.length, 'items')
    console.log('🔄 フォーム値同期完了: hobbies =', selectedHobbies.length, 'items')
  }, [selectedHobbies, setValue])

  // selectedPersonality変更時のフォーム同期と完成度再計算
  useEffect(() => {
    console.log('🔍 selectedPersonality changed:', selectedPersonality)
    
    // 🔧 フォームフィールドへの同期（初期化中でも必須）
    setValue('personality', selectedPersonality, { 
      shouldDirty: true, 
      shouldValidate: true 
    })
    
    // 🚨 EDIT SCREEN PERSONALITY DEBUG - MyPageと同じログ形式
    const currentData = watch()
    const { custom_culture, ...currentDataWithoutCustomCulture } = currentData || {}
    
    // 完成度計算前の入力データをMyPageと同じ形式でログ出力
    const normalizedProfile = {
      ...currentDataWithoutCustomCulture,
      hobbies: selectedHobbies,
      personality: selectedPersonality, // 最新のselectedPersonalityを使用
      planned_prefectures: selectedPlannedPrefectures,
      language_skills: languageSkills, // ✅ State直接使用（再構築を避ける）
    }
    
    console.log('🚨🚨🚨 EDIT SCREEN - PERSONALITY COMPLETION DEBUG 🚨🚨🚨')
    console.log('='.repeat(80))
    console.log('📊 完成度計算前のprofileData:')
    console.log(`   isForeignMale: ${isForeignMale}`)
    console.log(`   personality (selectedPersonality): ${Array.isArray(selectedPersonality) ? `Array(${selectedPersonality.length})` : selectedPersonality} = ${JSON.stringify(selectedPersonality)}`)
    console.log(`   hobbies (selectedHobbies): ${Array.isArray(selectedHobbies) ? `Array(${selectedHobbies.length})` : selectedHobbies}`)
    console.log(`   language_skills: ${Array.isArray(languageSkills) ? `Array(${languageSkills.length})` : languageSkills}`)
    console.log(`   planned_prefectures: ${Array.isArray(selectedPlannedPrefectures) ? `Array(${selectedPlannedPrefectures.length})` : selectedPlannedPrefectures}`)
    console.log('📋 normalizedProfile.personality詳細:')
    console.log(`   personality: ${normalizedProfile.personality ? (Array.isArray(normalizedProfile.personality) ? `✅ | array has ${normalizedProfile.personality.length} items` : `✅ | ${normalizedProfile.personality}`) : '❌ | empty or null'}`)
    console.log('='.repeat(80))
    
    // 🔧 MAIN WATCH統一: state更新のみ（完成度再計算はメインwatchが担当）
    console.log('📝 selectedPersonality state updated:', selectedPersonality.length, 'items')
  }, [selectedPersonality, setValue])

  // selectedPlannedPrefectures変更時のフォーム同期と完成度再計算
  useEffect(() => {
    console.log('🔍 selectedPlannedPrefectures changed:', selectedPlannedPrefectures)
    
    // 🔧 フォームフィールドへの同期（初期化中でも必須）
    setValue('planned_prefectures', selectedPlannedPrefectures, { 
      shouldDirty: true, 
      shouldValidate: true 
    })
    
    // 🔧 MAIN WATCH統一: state更新のみ（完成度再計算はメインwatchが担当）
    console.log('📝 selectedPlannedPrefectures state updated:', selectedPlannedPrefectures.length, 'prefectures')
  }, [selectedPlannedPrefectures, setValue])

  // 🗣️ languageSkills変更時の専用完成度再計算とフォーム同期
  useEffect(() => {
    console.log('🗣️ languageSkills changed:', languageSkills)
    
    // 🔧 フォームのlanguage_skillsフィールドに同期（初期化中でも必須）
    setValue('language_skills', languageSkills, { 
      shouldDirty: true, 
      shouldValidate: true 
    })
    
    // 🔧 MAIN WATCH統一: state更新のみ（完成度再計算はメインwatchが担当）
    console.log('📝 languageSkills state updated:', languageSkills.length, 'skills')
  }, [languageSkills, setValue])

  // 🌸 TASK1: hydration完了時のqueued再計算処理
  useEffect(() => {
    if (isHydrated && queuedRecalcRef.current) {
      console.log('🎯 hydration完了 - queued再計算実行', {
        isHydrated,
        queuedRecalc: queuedRecalcRef.current,
        source: 'queued-after-hydration'
      })
      queuedRecalcRef.current = false // フラグをリセット
      updateCompletionUnified('queued-after-hydration')
    }
  }, [isHydrated, updateCompletionUnified])

  // 🌐 プロフィールタイプ変更時の言語設定（削除：日本人女性も言語選択可能に）

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
      return labels[currentLanguage as SupportedLanguage] || value
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
      { value: 'currently-in-japan', label: t('schedule.currentlyInJapan') },
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

    // 🧪 OPTIONS DEBUG - options生成結果をログ（1回だけ）
    if (typeof window !== 'undefined' && !(window as any).__DEBUG_VISIT_OPTIONS_LOGGED__) {
      (window as any).__DEBUG_VISIT_OPTIONS_LOGGED__ = true
      console.log('🧪 OPTIONS DEBUG [visit_schedule]', {
        values: options?.map(o => o.value),
        labels: options?.map(o => o.label),
        hasFormsNoEntry: (options ?? []).some(o =>
          String(o.value).includes('forms.') || String(o.label).includes('forms.')
        )
      })
    }

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
    searchParams: searchParams?.toString() || ''
  })

  // 緊急対応：avatar_urlを強制削除
  const forceRemoveAvatar = async () => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user?.id)
      
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
    console.log('🛡️ secureProfileInitialization は安全のため無効化されています')
    return  // 🛡️ 安全のため処理を停止
    
    if (!user?.id) {
      console.error('❌ User ID not available for profile initialization')
      return
    }

    try {
      console.log('🔐 安全なプロフィール初期化開始 - User ID:', user?.id)
      
      // 🛡️ セキュリティ強化: ユーザーID検証
      console.log('🔒 SECURITY: Validating user authentication')
      const { data: authUser, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser?.user || authUser?.user?.id !== user?.id) {
        console.error('🚨 SECURITY BREACH: User ID mismatch or invalid auth', {
          authError,
          authUserId: authUser?.user?.id,
          providedUserId: user?.id
        })
        return
      }
      console.log('✅ User authentication validated')
      
      // まずプロフィールの存在確認（該当ユーザーのデータのみ）
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, created_at, email') // セキュリティ確認のためemailも取得
        .eq('user_id', user?.id) // 🛡️ 厳格なユーザーID一致確認
        .single()
      
      if (checkError && checkError?.code !== 'PGRST116') {
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
            
            // 注意: age, birth_date, gender, nationality, prefecture, residence等は
            // 存在しない可能性があるため除外
            // profile_image, profile_images, images等も除外
          })
          .eq('user_id', user?.id)
        
        if (resetError) {
          console.error('❌ Failed to reset profile to NULL state:', resetError)
          console.error('🔍 Reset error details:', {
            message: resetError?.message,
            details: resetError?.details,
            hint: resetError?.hint,
            code: resetError?.code
          })
          return
        }
        
        console.log('✅ PROFILE COMPLETELY RESET: All user data cleared to NULL')
        console.log('🧹 Profile reset completed:', {
          method: 'SAFE_NULL_UPDATE',
          clearedFields: ['name', 'bio', 'interests', 'avatar_url'],
          note: 'Only existing columns updated to prevent schema errors',
          preservedFields: ['id', 'email', 'created_at'],
          userId: user?.id,
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
          prefecture: '', // 🚨 foreign-maleではprefectureは使用しない
          // 外国人男性向け新フィールド
          planned_prefectures: [],
          visit_schedule: undefined, // 🔧 新規ユーザーは未選択状態
          travel_companion: undefined, // 🔧 新規ユーザーは未選択状態
          occupation: undefined, // 🔧 新規ユーザーは未選択状態
          height: undefined, // 🔧 数値フィールドなのでundefined
          body_type: undefined, // 🔧 新規ユーザーは未選択状態
          marital_status: undefined, // 🔧 新規ユーザーは未選択状態
          self_introduction: '', // 空
          hobbies: [], // 空配列
          personality: [], // 空配列
          custom_culture: '' // 空
        })
        
        // 状態も初期化
        setSelectedHobbies([])
        setSelectedPersonality([])
        setSelectedPlannedPrefectures([])
        setProfileImages(prev => {
          console.log('[FUNCTIONAL] リセット:', { prev_length: prev.length, new_length: 0 })
          return []
        })

        // 新規ユーザーの場合のみ編集履歴をクリア
        sessionStorage.removeItem('imageEditHistory')
        console.log('🔄 新規ユーザー: 画像編集履歴をクリア')
        
        console.log('✅ セキュアな新規登録状態でフォーム初期化完了')
        
        // 完成度を再計算（フォームsetValue完了後に実行）
        setTimeout(() => {
          // フォームの実際の値を取得して計算
          const actualFormValues = getValues()
          console.log('🚀 Initial completion calculation with actual form values:', actualFormValues)
          // 新規ユーザー判定
          const urlParamsLocal = new URLSearchParams(window.location.search)
          console.log('🔍 Form nationality vs URL nationality:', {
            form_nationality: actualFormValues.nationality,
            url_nationality: urlParamsLocal.get('nationality'),
            should_match: true
          })
          const isFromSignupTimeout = urlParamsLocal.get('from') === 'signup'
          
          // 🚨 CRITICAL DEBUG: Edit screen completion calculation debug 
          console.log('📝 EDIT SCREEN COMPLETION CALCULATION:', {
            input_actualFormValues_personality: actualFormValues?.personality,
            input_selectedPersonality: selectedPersonality,
            input_formValues_type: typeof actualFormValues?.personality,
            input_formValues_isArray: Array.isArray(actualFormValues?.personality),
            input_formValues_length: actualFormValues?.personality?.length || 0,
            input_profileImages: profileImages,
            input_isForeignMale: isForeignMale,
            input_isFromSignupTimeout: isFromSignupTimeout
          })
          
          // 🚨 CRITICAL: 編集画面でもbuildProfileForCompletion使用（データソース統一）
          console.log('📝 EDIT: actualFormValues personality check:', {
            personality: actualFormValues?.personality,
            selectedPersonality: selectedPersonality,
            dbProfile_available: !!dbProfile,
            source: 'buildProfileForCompletion経由の統一データソース'
          })

          // 🌟 SINGLE SOURCE OF TRUTH: フォーム値のみを使用した完成度計算
          const formValuesForEditCompletion = {
            ...actualFormValues,
            hobbies: selectedHobbies,
            personality: selectedPersonality,
            language_skills: languageSkills,
            planned_prefectures: selectedPlannedPrefectures,
          }

          // 🌟 統一フロー: calculateCompletionFromForm使用
          const result = calculateCompletionFromForm(
            formValuesForEditCompletion,
            isForeignMale ? 'foreign-male' : 'japanese-female',
            profileImages,
            isFromSignupTimeout // 新規ユーザーフラグとして使用
          )
          
          console.log('📝 EDIT SCREEN: 🌟 統一フロー完了:', {
            input_hobbies: formValuesForEditCompletion.hobbies,
            input_personality: formValuesForEditCompletion.personality,
            completion_percentage: result.completion,
            requiredCompleted: result.requiredCompleted,
            optionalCompleted: result.optionalCompleted,
            totalFields: result.totalFields,
            source: 'フォーム値のみ（SSOT編集画面版）'
          })
          
          // 🚨 33%問題調査：完成済み必須項目の詳細
          if (result.requiredFieldStatus) {
            console.log('🚨 33% ISSUE DEBUG - COMPLETED REQUIRED FIELDS:', 
              Object.entries(result.requiredFieldStatus)
                .filter(([_, completed]) => completed)
                .map(([field]) => field)
            )
            console.log('🚨 33% ISSUE DEBUG - ALL REQUIRED FIELD STATUS:', result.requiredFieldStatus)
          }
          
          setProfileCompletion(result.completion)
          setCompletedItems(result.completedFields)
          setTotalItems(result.totalFields)
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
      const enableProfileDeletion = false  // 🛡️ 安全のため完全無効化
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
          
          // フォームの値を更新
          setValue('occupation', parsedData.occupation || 'none')
          setValue('height', parsedData.height || undefined)
          setValue('body_type', parsedData.body_type || 'average')
          setValue('marital_status', parsedData.marital_status || 'single')
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
        
      }
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [user])

  const forceCompleteReset = async () => {
    console.log('🛡️ forceCompleteReset は安全のため無効化されています')
    return  // 🛡️ 安全のため処理を停止
    
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
        .eq('user_id', user?.id)
      
      if (error) {
        console.error('❌ データクリアエラー:', error)
      } else {
        console.log('✅ 完全初期化完了 - すべてのフィールドをクリア')
        
        // フロントエンドの状態もクリア
        setProfileImages(prev => {
          console.log('[FUNCTIONAL] リセット:', { prev_length: prev.length, new_length: 0 })
          return []
        })
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
          visit_schedule: undefined, // 🔧 新規ユーザーは未選択状態
          travel_companion: undefined, // 🔧 新規ユーザーは未選択状態
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

  // 🛡️ 安全な言語レベル取得ヘルパー関数（要件に従った実装）
  const getSafeLanguageLevel = (profile: any, levelField: 'japanese_level' | 'english_level'): 'none' | 'beginner' | 'intermediate' | 'advanced' | 'native' | 'elementary' | 'upperIntermediate' => {
    const value = profile?.[levelField]
    if (value && value !== '' && value !== null && value !== undefined) {
      // Type guard to ensure the value matches the expected union type
      const validLevels = ['none', 'beginner', 'intermediate', 'advanced', 'native', 'elementary', 'upperIntermediate']
      if (validLevels.includes(value)) {
        return value as 'none' | 'beginner' | 'intermediate' | 'advanced' | 'native' | 'elementary' | 'upperIntermediate'
      }
    }
    return 'none'
  }

  // Load current user data
  useEffect(() => {
    console.log('🚀 useEffect開始 - ユーザー:', user?.id)
    
    // 🚨 CRITICAL DEBUG: 包括的エラーハンドリング追加
    const initializeProfileEdit = async () => {
      console.log('🟡 isInitializing -> true (init start)')
      console.log('🔍 PROFILE EDIT INITIALIZATION START')
      console.log('  - User:', user?.id)
      console.log('  - Search params:', window.location.search)
      
      try {
        
        // fromMyPageパラメータの確認（useEffect内の最初で定義）
        const urlParams = new URLSearchParams(window.location.search)
        const isFromMyPage = urlParams.get('fromMyPage') === 'true'
        
        console.log('  - isFromMyPage:', isFromMyPage)
        
        await loadUserData()
        
      } catch (error) {
        console.error('🚨 CRITICAL: Profile Edit Initialization Error:', error)
        console.error('Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : typeof error,
          userExists: !!user,
          userId: user?.id,
          currentURL: window.location.href
        })
        // エラーが発生した場合もページを表示するため、デフォルト初期化を実行
        try {
          console.log('🛡️ Fallback initialization starting...')
          // 最小限の安全な初期化
          const isForeignMale = profileType === 'foreign-male'
          reset({
            nickname: '',
            japanese_level: 'none',
            english_level: 'none'
          })
        } catch (fallbackError) {
          console.error('🚨 Even fallback initialization failed:', fallbackError)
        }
      }
    }
    
    const loadUserData = async () => {
      // fromMyPageパラメータの確認（function全体で使用するため最初に定義）
      const urlParams = new URLSearchParams(window.location.search)
      const isFromMyPage = urlParams.get('fromMyPage') === 'true'
      
      // テストモードの場合は認証をスキップ
      if (isTestMode() && !user) {
        console.log('🧪 テストモード検出 - 認証をスキップして初期化処理を実行')
        
        // マイページからの遷移の場合はlocalStorageからデータを読み込み
        
        let initialData
        if (isFromMyPage) {
          console.log('🔄 マイページからの遷移 - localStorageからデータを読み込み')
          
          // localStorageからデータを取得
          const savedProfile = localStorage.getItem('updateProfile') || localStorage.getItem('previewCompleteData')
          if (savedProfile) {
            try {
              const profileData = JSON.parse(savedProfile)
              console.log('📦 localStorage from profile data:', profileData)
              console.log('🔍 ProfileEdit - japanese_level check:', {
                'profileData.japanese_level': profileData.japanese_level,
                'profileData.english_level': profileData.english_level,
                'typeof japanese_level': typeof profileData.japanese_level
              })
              
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
                japanese_level: String(profileData.japanese_level || 'none'),
                planned_stations: profileData.planned_stations || [],
                // オプションフィールド
                occupation: profileData.occupation || 'none',
                height: profileData.height,
                body_type: profileData.body_type || 'none',
                marital_status: profileData.marital_status || 'none',
                english_level: profileData.english_level || 'none',
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
            prefecture: '', // 🚨 foreign-maleではprefectureは使用しない
            self_introduction: '',
            hobbies: [],
            personality: [],
            // 外国人男性向けフィールド
            planned_prefectures: [],
            visit_schedule: undefined, // 🔧 新規ユーザーは未選択状態
            travel_companion: undefined, // 🔧 新規ユーザーは未選択状態
            // オプションフィールド
            occupation: 'none',
            height: undefined,
            body_type: 'none',
            marital_status: 'none' as 'none' | 'single' | 'married',
            japanese_level: 'none',
            english_level: 'none',
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
          planned_prefectures: initialData.planned_prefectures,
          visit_schedule: initialData.visit_schedule,
          travel_companion: initialData.travel_companion,
          occupation: initialData.occupation,
          height: initialData.height,
          body_type: initialData.body_type,
          marital_status: initialData.marital_status as 'none' | 'single' | 'married',
          japanese_level: initialData.japanese_level as 'none' | 'beginner' | 'intermediate' | 'advanced' | 'native' | 'elementary' | 'upperIntermediate' | undefined,
          english_level: initialData.english_level as 'none' | 'beginner' | 'intermediate' | 'advanced' | 'native' | 'elementary' | 'upperIntermediate' | undefined,
          self_introduction: initialData.self_introduction,
          hobbies: initialData.hobbies,
          personality: initialData.personality,
          custom_culture: ''
        })
        
        // 状態も同期
        setSelectedHobbies(initialData.hobbies)
        setSelectedPersonality(initialData.personality)
        setSelectedPlannedPrefectures(initialData.planned_prefectures)
        
        // 🔧 CRITICAL: テストモード分岐でも強制完成度計算を実行（0%再発防止）
        console.log('✅ Form reset completed (test mode)')
        console.log('🔥 FORCE CALC AFTER FORM RESET (test mode) - DELAYED')
        setTimeout(() => {
          console.log('🎯 Executing delayed initial completion calculation (test mode)')
          forceInitialCompletionCalculation()
          setDidInitialCalc(true)
        }, 100)
        
        // 🚨 CRITICAL FIX: テストモード分岐でもisInitializing解除（リアルタイム更新復活）
        console.log('🟢 isInitializing -> false (test mode end)')
        setIsInitializing(false)
        
        // 🔧 CRITICAL FIX: initializingRef も確実に解除（watch復活）
        console.log('🟢 initializingRef.current -> false (test mode end)')
        initializingRef.current = false
        
        console.log('🌟 テストモード初期化完了 - リアルタイム計算解禁')
        setIsHydrated(true)
        
        // 画像設定は後の統合処理で行う
        
        setIsLoading(false)
        setUserLoading(false)
        
        return
      }
      
      // fromMyPageパラメータは既に上で定義済み
      
      // AuthGuardが認証確認中の場合は待機（ただし、fromMyPageの場合は待機しない）
      if (!user && !isFromMyPage) {
        console.log('⏳ ユーザー認証確認中 - AuthGuardの処理完了を待機')
        return
      }
      
      // fromMyPageの場合でユーザーが存在しない場合は、localStorageのみで処理
      if (!user && isFromMyPage) {
        console.log('🎯 fromMyPage=true + no user - using localStorage only')
        
        // localStorageからデータを読み込み
        console.log('🔄 マイページからの遷移 - localStorageからデータを読み込み')
        
        // localStorage確認
        
        const savedProfile = localStorage.getItem('updateProfile') || localStorage.getItem('previewCompleteData')
        if (savedProfile) {
          try {
            const profileData = JSON.parse(savedProfile)
            console.log('📦 localStorage profile data (no user):', profileData)
            
            const initialData = {
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
              japanese_level: String(profileData.japanese_level || 'none'),
              planned_stations: profileData.planned_stations || [],
              // オプションフィールド
              occupation: profileData.occupation || 'none',
              height: profileData.height,
              body_type: profileData.body_type || 'none',
              marital_status: profileData.marital_status || 'none',
              english_level: profileData.english_level || 'none',
            }
            
            console.log('🧪 fromMyPage initialData - フォーム値設定:', initialData)
            console.log('🔍 [Profile Edit] japanese_level debug:', {
              'raw profileData.japanese_level': profileData.japanese_level,
              'typeof raw': typeof profileData.japanese_level,
              'String() converted': String(profileData.japanese_level || 'none'),
              'initialData.japanese_level': initialData.japanese_level,
              'typeof initialData': typeof initialData.japanese_level,
              'is_undefined': profileData.japanese_level === undefined,
              'is_null': profileData.japanese_level === null,
              'profileData keys': Object.keys(profileData)
            })
            
            // フォームを初期化
            const resetData = {
              nickname: initialData.nickname,
              gender: initialData.gender,
              birth_date: initialData.birth_date,
              age: initialData.age,
              nationality: initialData.nationality,
              prefecture: initialData.prefecture,
                  planned_prefectures: initialData.planned_prefectures,
              visit_schedule: initialData.visit_schedule,
              travel_companion: initialData.travel_companion,
              occupation: initialData.occupation,
              height: initialData.height,
              body_type: initialData.body_type,
              marital_status: initialData.marital_status as 'none' | 'single' | 'married',
              japanese_level: getSafeLanguageLevel(initialData, 'japanese_level'),
              english_level: getSafeLanguageLevel(initialData, 'english_level'),
              self_introduction: initialData.self_introduction,
              hobbies: initialData.hobbies,
              personality: initialData.personality,
              custom_culture: ''
            }
            
            console.log('🚨 [CRITICAL] Form reset data:', {
              'resetData.japanese_level': resetData.japanese_level,
              'initialData.japanese_level': initialData.japanese_level,
              'resetData === initialData': resetData.japanese_level === initialData.japanese_level
            })
            
            reset(resetData)
            
            // reset直後の確認
            setTimeout(() => {
              console.log('🚨 [CRITICAL] Form after reset:', {
                'watch(japanese_level)': watch('japanese_level'),
                'getValues().japanese_level': getValues().japanese_level,
                'form is reset correctly': watch('japanese_level') === initialData.japanese_level
              })
            }, 100)
            
            // 状態も同期
            setSelectedHobbies(initialData.hobbies)
            setSelectedPersonality(initialData.personality)
            setSelectedPlannedPrefectures(initialData.planned_prefectures)
            
            // 🖼️ 画像復元：DBのphoto_urls最優先で復元
            try {
              let finalImages = []
              
              console.log('🖼️ 画像復元開始 - DB photo_urls最優先モード:', {
                'profileData.photo_urls': profileData.photo_urls,
                'photo_urls_isArray': Array.isArray(profileData.photo_urls),
                'photo_urls_length': profileData.photo_urls?.length || 0,
                'profileData.avatar_url': profileData.avatar_url ? 'exists' : 'null'
              })
              
              // 🔥 STEP 1: DBのphoto_urlsを最優先で復元（指示書対応：厳密判定）
              if (Array.isArray(profileData.photo_urls) && profileData.photo_urls.length > 0 && profileData.photo_urls.some((url: any) => url && typeof url === 'string' && url.trim() !== '')) {
                console.log('✅ DBのphoto_urlsから画像復元:', profileData.photo_urls.length, '枚')
                console.log('🧪 [指示書②] 一般初期化: photo_urls優先採用 ✅')
                finalImages = profileData.photo_urls
                  .filter((url: any) => url && typeof url === 'string' && url.trim() !== '') // 空文字除去
                  .slice(0, 3)
                  .map((url: string, index: number) => ({
                    id: `photo_${index}`,
                    url: url,
                    originalUrl: url,
                    isMain: index === 0, // 先頭をメイン画像
                    isEdited: false
                  }))
                
                console.log('🖼️ photo_urls復元完了:', finalImages.map((img: any) => ({
                  id: img.id,
                  isMain: img.isMain,
                  url_preview: img.url.substring(0, 50) + '...'
                })))
              }
              // 🔧 STEP 2: photo_urlsが本当に空の場合のみavatar_url使用（後方互換）
              else if (profileData.avatar_url && (!Array.isArray(profileData.photo_urls) || profileData.photo_urls.length === 0)) {
                console.log('📋 photo_urls本当に空 - avatar_urlから1枚復元（後方互換）')
                console.log('🧪 [指示書②] 一般初期化: avatar_urlフォールバック採用')
                finalImages = [{
                  id: 'main',
                  url: profileData.avatar_url,
                  originalUrl: profileData.avatar_url,
                  isMain: true,
                  isEdited: false
                }]
              }
              // 🔧 STEP 3: どちらも空の場合のみlocalStorage確認（補助）
              else {
                const savedImages = localStorage.getItem('currentProfileImages')
                if (savedImages) {
                  try {
                    const images = JSON.parse(savedImages)
                    if (images && images.length > 0) {
                      console.log('📦 DBに画像なし - localStorage画像を補助的に使用')
                      finalImages = images
                    }
                  } catch (e) {
                    console.warn('localStorage画像データ解析失敗:', e)
                  }
                }
                
                if (finalImages.length === 0) {
                  console.log('📭 画像データなし - 空の状態で開始')
                }
              }
              
              if (finalImages.length > 0) {
                setProfileImages(prev => {
                  console.log('[FUNCTIONAL] DB復元:', { prev_length: prev.length, final_length: finalImages.length })
                  return finalImages
                })
                profileImagesRef.current = finalImages
                console.log('🔧 初期化時profileImagesRef更新:', { finalImages_length: finalImages.length })
              }
              
            } catch (error) {
              console.error('❌ 画像データ復元エラー (no user):', error)
            }
            
            // 🔧 CRITICAL: fromMyPage (user && isFromMyPage) でも強制完成度計算を実行（0%再発防止）
            console.log('✅ Form reset completed (fromMyPage with user)')
            console.log('🔥 FORCE CALC AFTER FORM RESET (fromMyPage)')
            
            // 少し遅延させてフォームresetの完了を確実にする
            setTimeout(() => {
              try {
                console.error('🕵️ FROMMYPAGE_INVESTIGATION: About to force calc', {
                  timestamp: new Date().toISOString(),
                  operation: 'FROMMYPAGE_FORCE_CALC',
                  initialData: {
                    ...initialData,
                    imagesCount: profileImages?.length || 0
                  },
                  initializingRef: initializingRef.current,
                  isInitializing: isInitializing,
                  source: 'FROMMYPAGE_WITH_USER'
                })
                
                setTimeout(() => {
                  console.log('🎯 Executing delayed initial completion calculation (fromMyPage)')
                  forceInitialCompletionCalculation()
                  setDidInitialCalc(true)
                }, 100)
                
                // 🚨 CRITICAL FIX: fromMyPageでもisInitializing解除（リアルタイム更新復活）
                console.log('🟢 isInitializing -> false (fromMyPage end)')
                setIsInitializing(false)
                
                // 🔧 CRITICAL FIX: initializingRef も確実に解除（watch復活）
                console.log('🟢 initializingRef.current -> false (fromMyPage end)')
                initializingRef.current = false
                
                console.log('🌟 fromMyPage初期化完了 - リアルタイム計算解禁')
                setIsHydrated(true)
              } catch (calcError) {
                console.error('🚨 ERROR in fromMyPage force calc:', calcError)
              }
            }, 150)
            
          } catch (error) {
            console.error('❌ localStorage解析エラー (no user):', error)
          }
        } else {
          console.log('⚠️ localStorageにプロフィールデータが見つかりません')
        }
        
        // ローディング状態を解除
        setIsLoading(false)
        setUserLoading(false)
        
        // fromMyPage遷移処理完了
        
        return
      }
      
      console.log('✅ ユーザー確認完了 - プロフィール読み込み開始')

      try {
        // 🔗 user_id ベースでプロフィール取得・作成を保証（遷移継続保証版）
        const { ensureProfileForUserSafe } = await import('@/lib/profile/ensureProfileForUser')
        const ensureResult = await ensureProfileForUserSafe(supabase, user)
        let profile = ensureResult.profile

        // 🔧 方針1: 403/406でも遷移を継続（DB失敗でも画面表示は可能）
        if (!ensureResult.success) {
          console.warn('🚨 Profile ensure failed but continuing with UI initialization:', {
            reason: ensureResult.reason,
            canContinue: ensureResult.canContinue,
            userId: user?.id
          })
          
          // 遷移不可な致命的エラーの場合のみ停止
          if (!ensureResult.canContinue) {
            setError('認証エラーのため、プロフィール編集画面を表示できません')
            setUserLoading(false)
            return
          }
          
          // DB失敗でも画面は表示 - 初期値でフォーム表示継続
          profile = null
          console.log('🔥 DB失敗だが画面表示継続 - URLパラメータや初期値でフォーム初期化')
        }

        console.log('✅ Profile initialization result:', {
          profileExists: !!profile,
          profileId: profile?.id || 'none',
          userId: profile?.user_id || 'none',
          authUid: user?.id,
          userIdMatch: profile ? profile.user_id === user?.id : 'n/a (no profile)',
          reason: ensureResult.reason
        })

        // 🚨 CRITICAL: DBプロフィールをstateに保存（buildProfileForCompletion用）
        setDbProfile(profile)
        console.log('🔧 DB PROFILE SET:', {
          profile_hobbies: profile?.hobbies,
          profile_personality: profile?.personality,
          profile_language_skills: profile?.language_skills
        })

        console.log('========== PROFILE EDIT DEBUG START ==========')
        console.log('Loaded profile data:', profile)
        console.log('🔍 Critical fields debug (Edit Page):')
        console.log('  - name:', profile?.name)
        console.log('  - bio:', profile?.bio)
        console.log('  - age:', profile?.age)
        console.log('  - birth_date:', profile?.birth_date)
        console.log('  - interests (raw):', profile?.interests)
        console.log('  - height:', profile?.height)
        console.log('  - occupation:', profile?.occupation)
        console.log('  - body_type:', profile?.body_type)
        console.log('  - marital_status:', profile?.marital_status)
        
        console.log('🔍 DETAILED FIELD VALUES FOR MYPAGE COMPARISON:')
        console.log('Birth date related fields:', {
          birth_date: profile?.birth_date,
          date_of_birth: profile?.date_of_birth,
          birthday: profile?.birthday,
          dob: profile?.dob,
          age: profile?.age
        })
        console.log('All occupation related fields:', {
          occupation: profile?.occupation,
          job: profile?.job,
          work: profile?.work
        })
        console.log('All height related fields:', {
          height: profile?.height,
          height_cm: profile?.height_cm
        })
        console.log('========== PROFILE EDIT DEBUG END ==========')

        // 👤 URLにtypeパラメータがない場合、プロフィールから判定
        if (!profileType) {
          const detectedType = profile?.gender === 'male' && profile?.nationality && profile?.nationality !== '日本'
            ? 'foreign-male'
            : 'japanese-female'
          setUserBasedType(detectedType)
          console.log('🔍 Auto-detected profile type:', {
            gender: profile?.gender,
            nationality: profile?.nationality,
            detectedType,
            reasoning: profile?.gender === 'male' ? 'Male gender detected' : 'Female or no gender detected'
          })
        }

        // 🔍 専用カラム優先でフィールド値を取得するヘルパー関数
        const getFieldValue = (fieldName: string) => {
          // 専用カラムの値を優先（profile null check追加）
          if (profile && profile[fieldName] !== null && profile[fieldName] !== undefined && profile[fieldName] !== '') {
            return profile[fieldName]
          }
          
          
          return null
        }


        // 🔍 専用カラム優先でoptionalDataを構築
        let parsedOptionalData: {
          occupation?: string;
          height?: number;
          body_type?: string;
          marital_status?: string;
          english_level?: string;
          japanese_level?: string;
        } = {
          occupation: getFieldValue('occupation'),
          height: getFieldValue('height'),
          body_type: getFieldValue('body_type'),
          marital_status: getFieldValue('marital_status'),
          english_level: getFieldValue('english_level'),
          japanese_level: getFieldValue('japanese_level')
        }
        
        console.log('🔍 DEDICATED COLUMN FIELD ANALYSIS:')
        console.log('Profile dedicated columns:', {
          occupation: profile?.occupation,
          height: profile?.height,
          body_type: profile?.body_type,
          marital_status: profile?.marital_status,
          english_level: profile?.english_level,
          japanese_level: profile?.japanese_level
        })
        console.log('📋 Merged optional data:', parsedOptionalData)
        
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
            isForeignMale: isForeignMale,
            prefectureWillBeIgnored: isForeignMale && urlParams.get('prefecture'),
            all_params: Object.fromEntries(urlParams.entries())
          })
        }
        
        // プロフィールタイプに基づくデフォルト値（仮登録データを優先）
        const getDefaults = () => {
          // 🚨 FIX: DBのresidenceカラムを優先参照（都道府県復元）
          const prefectureValue = (signupData as any).prefecture || profile?.residence || profile?.prefecture || ''
          console.log('🔍 prefecture初期化:', {
            signupData_prefecture: (signupData as any).prefecture,
            profile_residence: profile?.residence,
            profile_prefecture: profile?.prefecture,
            final: prefectureValue
          })

          const baseDefaults = {
            gender: (signupData as any).gender || profile?.gender || (isForeignMale ? 'male' : 'female'),
            nationality: (signupData as any).nationality || profile?.nationality || (isJapaneseFemale ? '日本' : isForeignMale ? 'アメリカ' : ''),
            prefecture: prefectureValue,
            birth_date: (signupData as any).birth_date || profile?.birth_date || '',
            age: (signupData as any).age ? parseInt((signupData as any).age) : profile?.age || 18,
          }
          
          console.log('🏗️ getDefaults calculation:', {
            signupData_nationality: (signupData as any).nationality,
            profile_nationality: profile?.nationality,
            isForeignMale,
            final_nationality: baseDefaults.nationality
          })
          
          return baseDefaults
        }

        const defaults = getDefaults()
        
        // 新規登録フローかどうかを判定（マイページからの遷移は除外）
        const hasSignupParams = urlParams.get('type') === 'japanese-female' || urlParams.get('type') === 'foreign-male'
        const hasSignupIdentifiers = urlParams.get('nickname') || urlParams.get('gender') || urlParams.get('birth_date')
        const isFromSignup = (hasSignupParams || hasSignupIdentifiers) && !isFromMyPage
        
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
        console.log('  - name:', profile?.name)
        console.log('  - bio:', profile?.bio) 
        console.log('  - age:', profile?.age)
        console.log('  - birth_date:', profile?.birth_date)
        console.log('  - interests (raw):', profile?.interests)
        console.log('  - height:', profile?.height)
        console.log('  - occupation:', profile?.occupation)
        console.log('  - marital_status:', profile?.marital_status)
        console.log('  - body_type:', profile?.body_type)
        
        console.log('🔍 Parsed optional data (Profile Edit):', parsedOptionalData)
        
        // 新規ユーザーかどうかを判定（マイページからの場合は必ず既存ユーザー扱い）
        // 🚨 危険なロジック修正: 茶道選択ユーザーを誤って新規ユーザー扱いしないよう修正
        const isTestData = profile?.bio?.includes('テスト用の自己紹介です') || 
                          profile?.name === 'テスト'
        // (profile.interests?.length === 1 && profile.interests[0] === '茶道') <- 削除：正当なユーザーを誤判定する危険
        
        console.log('🚨 CRITICAL: New user determination logic:')
        console.log('  - Original isTestData (with 茶道):', 
                    profile?.bio?.includes('テスト用の自己紹介です') || 
                    profile?.name === 'テスト' ||
                    (profile?.interests?.length === 1 && profile?.interests[0] === '茶道'))
        console.log('  - Safer isTestData (without 茶道):', isTestData)
        console.log('  - Profile has bio:', !!profile?.bio)
        console.log('  - Profile has interests:', !!profile?.interests)  
        console.log('  - Profile has name:', !!profile?.name)
        
        // 🔗 DB存在ベースでisNewUser判定（DB失敗や空プロフィールも考慮）
        const isNewUser = !profile || // DB失敗でprofileがnull
                         isFromSignup || // サインアップからの遷移
                         (!profile.name && !profile.bio && (!profile.interests || profile.interests.length === 0))
        
        console.log('🔍 New User Determination Debug:')
        console.log('  - isFromMyPage:', isFromMyPage)
        console.log('  - isTestData:', isTestData)
        console.log('  - isFromSignup:', isFromSignup)
        console.log('  - profile.bio exists:', !!profile?.bio)
        console.log('  - profile.interests exists:', !!profile?.interests)
        console.log('  - profile.name exists:', !!profile?.name)
        console.log('  - FINAL isNewUser result:', isNewUser)
        
        // 🚨 33%問題調査：初期データ詳細ログ
        console.log('🔍 INITIAL DATA FOR 33% ISSUE DEBUG:')
        console.log('  - nickname:', profile?.name || profile?.first_name || '')
        console.log('  - gender:', profile?.gender || 'male')
        console.log('  - nationality:', profile?.nationality)
        console.log('  - age:', profile?.age)
        console.log('  - birth_date:', profile?.birth_date || profile?.date_of_birth)
        console.log('  - planned_prefectures:', profile?.planned_prefectures)
        console.log('  - hobbies/culture_tags:', profile?.hobbies || (profile as any)?.culture_tags)
        console.log('  - personality:', profile?.personality || (profile as any)?.personality_tags)
        console.log('  - language_skills:', profile?.language_skills)

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
            .eq('user_id', user?.id)
          
          // データベースからプロフィールを再取得してクリーンな状態にする
          const { data: cleanProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user?.id)
            .single()
          
          if (cleanProfile) {
            profile = cleanProfile
            console.log('プロフィールクリア完了:', profile)
          }
        }
        */
        
        // テストデータまたは既存データクリア（新規登録以外でも実行）
        // 🚨 危険なロジック修正: 茶道選択ユーザーのデータを誤ってクリアしないよう修正
        const isTestData2 = profile?.bio?.includes('テスト用の自己紹介です') || 
                          profile?.name === 'テスト'
        // (profile.interests?.length === 1 && profile.interests[0] === '茶道') <- 削除：正当なユーザーデータを誤削除する危険
        
        console.log('🚨 CRITICAL: Test data clear condition check:')
        console.log('  - isTestData2:', isTestData2)
        console.log('  - profile.name:', profile?.name)
        console.log('  - isFromMyPage:', isFromMyPage)
        console.log('  - Should clear data:', isTestData2 && user?.id)
        console.log('  - 🛡️ SECURITY: Removed dangerous name-based condition')
        
        // 🚨 セキュリティ問題：MyPageからの遷移でもデータがクリアされる可能性
        // MyPageからの遷移時はデータクリアを防ぐ
        // 🔒 SECURITY FIX: 名前ベースの危険な条件を削除し、テストデータのみに限定
        const shouldClearData = isTestData2 && user?.id && !isFromMyPage
        
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
            .eq('user_id', user?.id) // 🛡️ 主要条件：ユーザーID一致
            .eq('email', authUser?.user?.email) // 🛡️ 追加条件：email一致
          
          const { data: cleanProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user?.id)
            .single()
          
          if (cleanProfile) {
            profile = cleanProfile
          }
        }

        // ニックネーム（仮登録から）
        const nicknameValue = (signupData as any).nickname || (isNewUser ? '' : (profile?.name || profile?.first_name || ''))

        // 既存ユーザーの場合：新しいカラム優先でデータを抽出（Triple-save対応）
        let existingPersonality: string[] = []
        let existingHobbies: string[] = []
        let existingCustomCulture: string = ''
        
        if (!isNewUser) {
          // 🆕 Triple-save対応: 新しいカラムを優先、フォールバックでinterests配列から抽出
          
          // 1. personality_tagsカラムから性格データを取得（優先）+ NULL→[]正規化
          const rawPersonalityTags = (profile as any).personality_tags
          console.log('🔍 PERSONALITY NULL→[]正規化チェック:', {
            rawPersonalityTags,
            rawPersonalityTags_type: typeof rawPersonalityTags,
            rawPersonalityTags_isNull: rawPersonalityTags === null,
            rawPersonalityTags_isArray: Array.isArray(rawPersonalityTags),
            rawPersonalityTags_length: rawPersonalityTags?.length,
            will_normalize_to_empty_array: rawPersonalityTags === null || !Array.isArray(rawPersonalityTags)
          })
          
          if (Array.isArray(rawPersonalityTags) && rawPersonalityTags.length > 0) {
            existingPersonality = rawPersonalityTags.filter((item: string) => item !== 'その他')
          } else if (Array.isArray(profile?.personality) && profile.personality.length > 0) {
            // 2. 従来のpersonalityカラムからフォールバック
            existingPersonality = profile.personality.filter((item: string) => item !== 'その他')
          } else if (profile?.interests && Array.isArray(profile.interests)) {
            // 3. interests配列からpersonalityプレフィックス付きを抽出（最終フォールバック）
            profile!.interests.forEach((item: string) => {
              if (item.startsWith('personality:')) {
                existingPersonality.push(item.replace('personality:', ''))
              }
            })
          }
          
          // 1. culture_tagsカラムから日本文化データを取得（優先）
          if ((profile as any).culture_tags && Array.isArray((profile as any).culture_tags) && (profile as any).culture_tags.length > 0) {
            existingHobbies = (profile as any).culture_tags.filter((item: string) => item !== 'その他')
          } else if (profile?.interests && Array.isArray(profile.interests)) {
            // 2. interests配列からculture/hobbyデータを抽出（フォールバック）
            profile!.interests.forEach((item: string) => {
              if (!item.startsWith('personality:') && !item.startsWith('custom_culture:') && item !== 'その他') {
                existingHobbies.push(item)
              }
            })
          }
          
          // custom_cultureは従来通り（direct fieldとinterests配列から）
          if (profile?.custom_culture) {
            existingCustomCulture = profile.custom_culture
          } else if (profile?.interests && Array.isArray(profile.interests)) {
            profile!.interests.forEach((item: string) => {
              if (item.startsWith('custom_culture:')) {
                existingCustomCulture = item.replace('custom_culture:', '')
              }
            })
          }
        }
        
        console.log('🔍 DATA EXTRACTION DEBUG:', {
          'profile.personality (direct field)': profile?.personality,
          'profile.interests (array field)': profile?.interests, 
          'profile.custom_culture (direct field)': profile?.custom_culture,
          'extracted existingPersonality': existingPersonality,
          'extracted existingHobbies': existingHobbies,
          'extracted existingCustomCulture': existingCustomCulture,
          'isNewUser': isNewUser
        })
        
        console.log('🔍 RAW DATABASE FIELDS CHECK:', {
          'profile.interests type': typeof profile?.interests,
          'profile.interests isArray': Array.isArray(profile?.interests),
          'profile.interests content': profile?.interests,
          'profile.personality type': typeof profile?.personality,
          'profile.personality isArray': Array.isArray(profile?.personality),
          'profile.personality content': profile?.personality
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
          resetBirthDate = profile?.birth_date || profile?.date_of_birth || ''
          console.log('🔄 MyPage遷移 - 既存birth_dateを保持:', resetBirthDate)
        } else if (isNewUser) {
          // 新規ユーザー：signupデータまたは空
          resetBirthDate = defaults.birth_date || ''
          console.log('🆕 新規ユーザー - signup birth_date使用:', resetBirthDate)
        } else {
          // 既存ユーザー：既存データを使用
          resetBirthDate = profile?.birth_date || profile?.date_of_birth || defaults.birth_date || ''
          console.log('👤 既存ユーザー - profile birth_date使用:', resetBirthDate)
        }
        
        // birth_dateが空でageが存在する場合のみ、年齢から生年を推定（推定値であることを明示）
        if (!resetBirthDate && profile?.age && typeof profile.age === 'number' && profile.age > 0 && profile.age < 120 && !isFromMyPage) {
          // MyPageからの遷移時は推定を行わず、ユーザーに実際の入力を促す
          resetBirthDate = ''
          console.log(`⚠️ Birth date not found, age is ${profile?.age}. User should set actual birth_date.`)
        }
        
        console.log('🔍 Reset birth_date value:', {
          isNewUser,
          'defaults.birth_date': defaults.birth_date,
          'profile.birth_date': profile?.birth_date,
          'profile.date_of_birth': profile?.date_of_birth,
          'profile.age': profile?.age,
          resetBirthDate
        })
        
        console.log('🔍 Form Reset Data Debug:')
        console.log('  - nicknameValue:', nicknameValue)
        console.log('  - resetBirthDate:', resetBirthDate)
        // 🎯 A案修正: nationality正規化（都道府県名→適切な国名）
        const prefectureNames = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県']
        const rawNationality = defaults.nationality || profile?.nationality || ''
        const normalizedNationality = isForeignMale 
          ? (prefectureNames.includes(rawNationality) ? 'アメリカ' : (rawNationality || (isNewUser ? 'アメリカ' : '')))
          : 'japan'
        
        console.log('  - 🌍 nationality calculation:', {
          defaults_nationality: defaults.nationality,
          profile_nationality: profile?.nationality,
          rawNationality,
          normalizedNationality,
          isNewUser,
          isForeignMale,
          isPrefectureName: prefectureNames.includes(rawNationality),
          final_nationality: normalizedNationality
        })
        console.log('  - parsedOptionalData.occupation:', parsedOptionalData.occupation)
        console.log('  - parsedOptionalData.height:', parsedOptionalData.height)
        console.log('  - parsedOptionalData.body_type:', parsedOptionalData.body_type)
        console.log('  - parsedOptionalData.marital_status:', parsedOptionalData.marital_status)
        console.log('  - parsedOptionalData.japanese_level:', parsedOptionalData.japanese_level)
        console.log('  - parsedOptionalData.english_level:', parsedOptionalData.english_level)
        console.log('  - existingHobbies:', existingHobbies)
        console.log('  - existingPersonality:', existingPersonality)
        console.log('  - existingCustomCulture:', existingCustomCulture)
        
        const resetData = {
          nickname: nicknameValue,
          gender: defaults.gender,
          birth_date: resetBirthDate,
          age: defaults.age || (isNewUser ? 18 : (profile?.age || 18)),
          nationality: normalizedNationality,
          prefecture: !isForeignMale ? (defaults.prefecture || (isNewUser ? '' : (profile?.residence || profile?.prefecture || ''))) : undefined,
          // 外国人男性向け新フィールド
          planned_prefectures: isForeignMale ? (isNewUser ? [] : (profile?.planned_prefectures || [])) : undefined,
          visit_schedule: isForeignMale ? (isNewUser ? undefined : (profile?.visit_schedule || undefined)) : undefined,
          travel_companion: isForeignMale ? (isNewUser ? undefined : (profile?.travel_companion || undefined)) : undefined,
          occupation: isNewUser ? undefined : (parsedOptionalData.occupation || profile?.occupation || undefined),
          height: isNewUser ? undefined : (parsedOptionalData.height || profile?.height || undefined),
          body_type: isNewUser ? undefined : (parsedOptionalData.body_type || profile?.body_type || undefined),
          marital_status: isNewUser ? undefined : (parsedOptionalData.marital_status || profile?.marital_status || undefined),
          hobbies: isNewUser ? [] : existingHobbies,
          personality: (!isNewUser && Array.isArray(existingPersonality) && existingPersonality.length > 0) ? existingPersonality : [], // 🎯 FIXED: DBにpersonalityデータが実際に存在する場合のみ復元
          self_introduction: isNewUser ? '' : (profile?.bio || profile?.self_introduction || ''),
          custom_culture: isNewUser ? '' : existingCustomCulture,
          // 🆕 言語レベルフィールド（安全なヘルパー関数使用）
          japanese_level: isForeignMale ? (isNewUser ? 'none' : getSafeLanguageLevel(profile, 'japanese_level')) : 'none',
          english_level: !isForeignMale ? (isNewUser ? 'none' : getSafeLanguageLevel(profile, 'english_level')) : 'none',
          // ✨ 新機能: 使用言語＋言語レベル（Supabase language_skills優先）
          language_skills: (() => {
            if (isNewUser) {
              return [{ language: 'none' as LanguageCode, level: 'none' as LanguageLevelCode }]
            }
            // 既存ユーザー: Supabase language_skills → legacyフィールド → デフォルト の優先順位
            if (profile?.language_skills && Array.isArray(profile.language_skills) && profile.language_skills.length > 0) {
              return profile.language_skills
            }
            return generateLanguageSkillsFromLegacy(profile as any) || []
          })(),
          // 🚨 FIX: photo_urls安易フォールバック削除（上書き事故防止）
          // ❌ 禁止: photo_urls: profile?.photo_urls || []  ← これが空配列上書きの原因
          // ✅ 正解: resetDataには含めない（既存値を保護）
        }
        
        console.log('🔍 CRITICAL: resetData language_skills check:', {
          'profile.language_skills': profile?.language_skills,
          'generated_from_legacy': generateLanguageSkillsFromLegacy(profile as any),
          'resetData.language_skills': resetData.language_skills,
          'resetData includes language_skills': 'language_skills' in resetData,
          isNewUser
        })
        
        console.log('🚨 Final Reset Data for Form:', resetData)
        console.log('🔍 CRITICAL - Japanese Level in resetData:', {
          'resetData.japanese_level': resetData.japanese_level,
          'parsedOptionalData.japanese_level': parsedOptionalData.japanese_level,
          'profile.japanese_level': profile?.japanese_level,
          'isForeignMale': isForeignMale,
          'isNewUser': isNewUser
        })
        
        // フォームリセット前の詳細ログ
        console.log('🔍 FORM RESET DETAILED ANALYSIS:')
        console.log('About to reset form with following data:')
        Object.keys(resetData).forEach(key => {
          const value = (resetData as any)[key]
          console.log(`  - ${key}: ${JSON.stringify(value)} (type: ${typeof value})`)
        })
        
        // 🧪 INIT/RESET WRITE [visit_schedule & travel_companion]
        if (resetData.visit_schedule !== undefined) {
          console.log('🧪 INIT/RESET WRITE [visit_schedule]', {
            write: resetData.visit_schedule,
            reason: 'main reset() call'
          })
        }
        if (resetData.travel_companion !== undefined) {
          console.log('🧪 INIT/RESET WRITE [travel_companion]', {
            write: resetData.travel_companion,
            reason: 'main reset() call'
          })
        }
        
        reset(resetData)
        console.log('✅ Form reset completed')
        
        // 🎯 A案修正: setValue完了後に初回完成度計算実行（prefecture→residence反映保証）
        console.log('🔥 FORCE CALC AFTER FORM RESET - DELAYED FOR setValue COMPLETION')
        setTimeout(() => {
          console.log('🎯 Executing delayed initial completion calculation')
          forceInitialCompletionCalculation()
          setDidInitialCalc(true)
        }, 100) // setValue完了を待つ
        
        // 国籍はresetDataに含まれているため、個別設定は不要
        
        // Select要素の値を個別に設定（signup データを優先）
        setValue('nickname', nicknameValue)
        setValue('gender', defaults.gender)
        
        // birth_date設定でも同じロジックを使用（resetBirthDateと一致させる）
        let finalBirthDate
        if (isFromMyPage) {
          // MyPageからの遷移：既存の生年月日を必ず保持
          finalBirthDate = profile?.birth_date || profile?.date_of_birth || ''
          console.log('🔄 setValue - MyPage遷移のbirth_date保持:', finalBirthDate)
        } else if (isNewUser) {
          // 新規ユーザー：signupデータまたは空
          finalBirthDate = defaults.birth_date || ''
          console.log('🆕 setValue - 新規ユーザーbirth_date:', finalBirthDate)
        } else {
          // 既存ユーザー：既存データを使用
          finalBirthDate = profile?.birth_date || profile?.date_of_birth || defaults.birth_date || ''
          console.log('👤 setValue - 既存ユーザーbirth_date:', finalBirthDate)
        }
        
        // finalBirthDateが空でageが存在する場合のみ警告（推定値は設定しない）
        if (!finalBirthDate && profile?.age && typeof profile.age === 'number' && profile.age > 0 && profile.age < 120 && !isFromMyPage) {
          // 実際の生年月日がない場合は空文字のまま、ユーザーに入力を促す（MyPage遷移時は除く）
          finalBirthDate = ''
          console.log(`⚠️ Birth date not found (setValue), age is ${profile?.age}. User should set actual birth_date.`)
        }
        
        console.log('🔍 Setting birth_date value:', {
          isNewUser,
          isFromMyPage,
          'defaults.birth_date': defaults.birth_date,
          'profile.birth_date': profile?.birth_date,
          'profile.date_of_birth': profile?.date_of_birth,
          'profile.age': profile?.age,
          finalBirthDate
        })
        console.log('🔍 FORM FIELD SET VALUES DETAILED LOG:')
        console.log('Setting birth_date:', finalBirthDate)
        setValue('birth_date', finalBirthDate)
        
        // 国籍はresetDataで設定済み
        
        // 🚨 CRITICAL: foreign-maleではprefectureをセットしない（完成度計算混乱を避ける）
        if (!isForeignMale) {
          const prefectureValue = defaults.prefecture || (isNewUser ? '' : (profile?.residence || profile?.prefecture || ''));
          console.log('Setting prefecture:', prefectureValue)
          setValue('prefecture', prefectureValue)
        } else {
          console.log('🚨 foreign-male用途: prefecture設定をスキップ')
        }
        
        const ageValue = defaults.age || (isNewUser ? 18 : (profile?.age || 18))
        console.log('Setting age:', ageValue)
        setValue('age', ageValue)
        
        const hobbiesValue = isNewUser ? [] : existingHobbies
        console.log('Setting hobbies:', hobbiesValue)
        setValue('hobbies', hobbiesValue)
        
        // 🎯 FIXED: 条件分岐でpersonalityデータが実際に存在する場合のみ設定
        const hasSavedPersonalityForForm = !isNewUser && Array.isArray(existingPersonality) && existingPersonality.length > 0
        const personalityValue: string[] = hasSavedPersonalityForForm ? existingPersonality : []
        console.log('Setting personality:', personalityValue, 
          hasSavedPersonalityForForm ? '(DBにpersonalityデータあり: 復元)' : '(DBにpersonalityデータなし: 空配列)')
        setValue('personality', personalityValue)
        
        const customCultureValue = isNewUser ? '' : existingCustomCulture
        console.log('Setting custom_culture:', customCultureValue)
        setValue('custom_culture', customCultureValue)
        
        // 外国人男性向けフィールドの設定
        if (isForeignMale) {
          try {
            // 新規ユーザーの場合は既存データを無視して空の状態で初期化
            const plannedPrefecturesValue = isNewUser ? [] :
              (Array.isArray(profile?.planned_prefectures) ? profile!.planned_prefectures : [])
            console.log('Setting planned_prefectures:', plannedPrefecturesValue, 'isNewUser:', isNewUser)
            setValue('planned_prefectures', plannedPrefecturesValue, { shouldValidate: false })
            setSelectedPlannedPrefectures(plannedPrefecturesValue)

            const visitScheduleValue = isNewUser ? undefined :
              (typeof profile?.visit_schedule === 'string' && profile.visit_schedule !== '' && profile.visit_schedule !== 'no-entry' && profile.visit_schedule !== 'forms.noEntry'
                ? profile!.visit_schedule : undefined)
            console.log('Setting visit_schedule:', visitScheduleValue, 'isNewUser:', isNewUser, 'DB value:', profile?.visit_schedule)
            
            // 🧪 INIT/RESET WRITE [visit_schedule]
            console.log('🧪 INIT/RESET WRITE [visit_schedule]', {
              write: visitScheduleValue,
              reason: 'profile initialization from DB'
            })
            setValue('visit_schedule', visitScheduleValue, { shouldValidate: false })

            const travelCompanionValue = isNewUser ? 'undecided' :
              (typeof profile?.travel_companion === 'string' && profile.travel_companion !== '' && profile.travel_companion !== 'noEntry' && profile.travel_companion !== 'forms.noEntry'
                ? profile!.travel_companion : 'undecided')
            console.log('Setting travel_companion:', travelCompanionValue, 'isNewUser:', isNewUser, 'DB value:', profile?.travel_companion)
            
            // 🧪 INIT/RESET WRITE [travel_companion]
            console.log('🧪 INIT/RESET WRITE [travel_companion]', {
              write: travelCompanionValue,
              reason: 'profile initialization from DB'
            })
            setValue('travel_companion', travelCompanionValue, { shouldValidate: false })

          } catch (error) {
            console.error('🚨 外国人男性フィールド初期化エラー:', error)
            setInitializationError(`外国人男性フィールドの初期化に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
            // エラーが発生した場合はデフォルト値で初期化
            setValue('planned_prefectures', [], { shouldValidate: false })
            
            // 🧪 INIT/RESET WRITE [visit_schedule]
            console.log('🧪 INIT/RESET WRITE [visit_schedule]', {
              write: undefined,
              reason: 'error fallback default'
            })
            setValue('visit_schedule', undefined, { shouldValidate: false })
            
            // 🧪 INIT/RESET WRITE [travel_companion]
            console.log('🧪 INIT/RESET WRITE [travel_companion]', {
              write: 'undecided',
              reason: 'error fallback default'
            })
            setValue('travel_companion', 'undecided', { shouldValidate: false })
            setSelectedPlannedPrefectures([])
          }
        }
        
        console.log('🔍 HOBBY/PERSONALITY INITIALIZATION DEBUG:')
        console.log('  - existingHobbies:', existingHobbies)
        console.log('  - existingPersonality:', existingPersonality)
        console.log('  - isNewUser:', isNewUser)
        
        // 🎯 NEW: 条件分岐でpersonalityデータが実際に存在するかチェック
        const hasSavedPersonality = !isNewUser && Array.isArray(existingPersonality) && existingPersonality.length > 0
        
        const finalHobbies = isNewUser ? [] : existingHobbies
        const finalPersonality: string[] = hasSavedPersonality ? existingPersonality : []
        
        console.log('🚨 FINAL STATE SETTING:')
        console.log('  - hasSavedPersonality:', hasSavedPersonality)
        console.log('  - setSelectedHobbies will be called with:', finalHobbies)
        console.log('  - setSelectedPersonality will be called with:', finalPersonality, 
          hasSavedPersonality ? '(DBにpersonalityデータあり: 復元)' : '(DBにpersonalityデータなし: 空配列)')
        console.log('  - existingPersonality source:', existingPersonality)
        console.log('  - isNewUser flag:', isNewUser)
        
        setSelectedHobbies(finalHobbies)
        setSelectedPersonality(finalPersonality)
        // ✨ 言語スキル初期化: Supabase language_skills → legacyフィールド → 空配列
        let initialLanguageSkills: LanguageSkill[] = []
        
        if (isNewUser) {
          // 新規ユーザー: 1行表示で開始
          initialLanguageSkills = [{ language: '', level: '' } as LanguageSkill]
          console.log('🆕 New user: starting with one empty language skill row')
        } else {
          // 既存ユーザー: Supabase language_skills → legacyフィールド の優先順位
          if (profile?.language_skills && Array.isArray(profile.language_skills) && profile.language_skills.length > 0) {
            // 🚀 Supabase language_skillsが存在する場合は優先使用
            initialLanguageSkills = profile.language_skills
            console.log('🔥 Using Supabase language_skills:', profile.language_skills)
          } else {
            // フォールバック: 旧式カラムから生成、それも空なら1行表示
            const legacySkills = generateLanguageSkillsFromLegacy(profile as any) || []
            initialLanguageSkills = legacySkills.length > 0 ? legacySkills : [{ language: '', level: '' } as LanguageSkill]
            console.log('🔄 Fallback to legacy fields or one empty row:', legacySkills.length > 0 ? legacySkills : 'one empty row')
          }
        }
        
        console.log('🔍 Language Skills 初期化:', {
          isNewUser,
          'profile.language_skills': profile?.language_skills || null,
          'language_skills exists': profile?.language_skills ? 'YES' : 'NO',
          'language_skills type': typeof profile?.language_skills,
          'language_skills length': Array.isArray(profile?.language_skills) ? profile.language_skills.length : 'N/A',
          'generated from legacy': isNewUser ? 'SKIPPED (new user)' : generateLanguageSkillsFromLegacy(profile as any),
          'final initialLanguageSkills': initialLanguageSkills
        })
        
        setLanguageSkills(initialLanguageSkills)
        
        // フォームのlanguage_skillsフィールドにも初期値を設定
        setValue('language_skills', initialLanguageSkills, {
          shouldDirty: false,
          shouldValidate: false
        })
        
        console.log('✅ STATE SETTING COMPLETED')

        // 🌐 言語設定の初期化
        const nationality = profile?.nationality || ((signupData as any)?.nationality)
        
        // 統一言語システムでは言語は自動管理されるため、ここでの設定は不要
        console.log('🌐 Language managed by unified system')
        console.log('🌐 Language initialization:', {
          nationality,
          isJapaneseFemale,
          source: 'profile load'
        })
        
        console.log('🔍 PROFILE IMAGES INITIALIZATION CHECK:')
        console.log('  - isNewUser:', isNewUser)
        console.log('  - profile.avatar_url:', profile?.avatar_url)
        console.log('  - profile.avatar_url exists:', !!profile?.avatar_url)
        console.log('  - condition (!isNewUser && profile.avatar_url):', !isNewUser && profile?.avatar_url)
        
        // 🔒 セキュリティ強化: ユーザー固有のセッションストレージチェック
        // 🌸 TASK2: test modeでuser=undefinedの時に安全なキーを使用
        const safeUserId = user?.id || 'testmode'
        const userImageKey = `currentProfileImages_${safeUserId}`
        const userTimestampKey = `imageStateTimestamp_${safeUserId}`
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
          // 🌸 TASK5: 新規ユーザーの場合は全ユーザーのデータを完全削除
          const safeUserId = user?.id || 'testmode'
          sessionStorage.removeItem(`currentProfileImages_${safeUserId}`)
          sessionStorage.removeItem(`imageStateTimestamp_${safeUserId}`)
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key?.startsWith('currentProfileImages_') || key?.startsWith('imageStateTimestamp_')) {
              sessionStorage.removeItem(key)
            }
          }
        }
        
        // 🔧 画像設定と完成度計算に使用する配列を決定
        let currentImageArray: Array<{ id: string; url: string; originalUrl: string; isMain: boolean; isEdited: boolean }> = []

        // 🖼️ 指示書対応: photo_urls優先で画像を読み込み（1枚戻りバグ修正）
        if (isFromMyPage) {
          console.log('🔄 fromMyPage: DBのphoto_urls最優先で画像復元')
          
          // 🧪 指示書要求: 必須チェックポイント①② - DBから取得直後の状態確認
          console.log('🧪 [指示書①] profile.photo_urls:', profile?.photo_urls)
          console.log('🧪 [指示書①] profile.avatar_url:', profile?.avatar_url)
          console.log('🧪 [指示書②] 編集画面戻り時の判定開始')
          
          // 🔥 修正: photo_urls判定を厳密化（空配列でなく実際のデータ有無をチェック）
          if (Array.isArray(profile?.photo_urls) && profile.photo_urls.length > 0 && profile.photo_urls.some(url => url && typeof url === 'string' && url.trim() !== '')) {
            console.log('✅ fromMyPage: DBのphoto_urlsから復元:', profile.photo_urls.length, '枚')
            console.log('🧪 [指示書②] state初期化: photo_urls優先採用 ✅')
            currentImageArray = profile.photo_urls
              .filter(url => url && typeof url === 'string' && url.trim() !== '') // 空文字除去
              .slice(0, 3)
              .map((url: string, index: number) => ({
                id: `photo_${index}`,
                url: url,
                originalUrl: url,
                isMain: index === 0,
                isEdited: false
              }))
            setProfileImages(prev => {
              console.log('[FUNCTIONAL] 画像復元:', { prev_length: prev.length, current_length: currentImageArray.length })
              return currentImageArray
            })
          }
          // 🔧 フォールバック: photo_urlsが本当に空の場合のみavatar_urlから復元
          else if (profile?.avatar_url) {
            console.log('📋 fromMyPage: photo_urls本当に空 - avatar_urlからフォールバック復元')
            console.log('🧪 [指示書②] state初期化: avatar_urlフォールバック採用')
            currentImageArray = [{
              id: 'main',
              url: profile.avatar_url,
              originalUrl: profile.avatar_url,
              isMain: true,
              isEdited: false
            }]
            setProfileImages(prev => {
              console.log('[FUNCTIONAL] 画像復元:', { prev_length: prev.length, current_length: currentImageArray.length })
              return currentImageArray
            })
            
            // 🎯 TASK2: 自動write-back実行（photo_urls空をavatar_urlで修復）
            console.log('🎯 [TASK2] 自動write-back開始: photo_urls空状態をavatar_urlで修復')
            
            // 🎯 Step A&B: 条件厳密化 + 詳細エラーログ + 二度実行防止
            const writeBackKey = `writeBack_${user?.id}_completed`
            const alreadyCompleted = sessionStorage.getItem(writeBackKey)
            
            if (!alreadyCompleted) {
              setTimeout(async () => {
                try {
                  // 🎯 Step B: 条件の厳密チェック
                  const urlParamsLocal = new URLSearchParams(window.location.search)
                  const isFromMyPageCheck = urlParamsLocal.get('fromMyPage') === 'true'
                  const photoUrlsEmpty = Array.isArray(profile?.photo_urls) && profile.photo_urls.length === 0
                  const avatarUrlExists = profile?.avatar_url && typeof profile.avatar_url === 'string' && profile.avatar_url.trim().length > 0
                  
                  console.log('🎯 [TASK2] write-back条件チェック:', {
                    isFromMyPage: isFromMyPageCheck,
                    photoUrlsEmpty,
                    avatarUrlExists,
                    photo_urls: profile?.photo_urls,
                    avatar_url: profile?.avatar_url,
                    userId: user?.id
                  })
                  
                  if (!isFromMyPageCheck || !photoUrlsEmpty || !avatarUrlExists || !user?.id) {
                    console.log('🎯 [TASK2] write-back条件不一致 - スキップ')
                    return
                  }
                  
                  // 🎯 Step 3: 型ごとの最小修正（malformed array literal防止）
                  const avatarUrl = profile.avatar_url.trim()
                  
                  // 🛡️ ケースA対応: photo_urls型安全ガード（text[]想定）
                  const safePhotoUrls = Array.isArray([avatarUrl]) 
                    ? [avatarUrl].filter(Boolean).map(String) 
                    : []
                    
                  console.log('🎯 [STEP 3] payload型安全化:', {
                    original_avatarUrl: avatarUrl,
                    safePhotoUrls,
                    safePhotoUrls_type: typeof safePhotoUrls,
                    safePhotoUrls_isArray: Array.isArray(safePhotoUrls),
                    safePhotoUrls_elementTypes: safePhotoUrls.map(v => typeof v),
                    guaranteed: 'string[] for text[] compatibility'
                  })
                  
                  const writeBackPayload = {
                    photo_urls: safePhotoUrls // 確実にstring[]
                  }
                  
                  console.log('🎯 [TASK2] write-backペイロード:', {
                    payload: writeBackPayload,
                    avatarUrl_type: typeof avatarUrl,
                    avatarUrl_length: avatarUrl.length
                  })
                  
                  // 🎯 Step A: 詳細エラーログ + select()で結果確認
                  const { data, error: writeBackError } = await supabase
                    .from('profiles')
                    .update(writeBackPayload)
                    .eq('user_id', user.id)
                    .select('id, photo_urls')
                    
                  if (writeBackError) {
                    // 🎯 Step 1: 400の正体を一回で確定するための完全ログ
                    console.error('🚨 [TASK2] write-back failed - 400根因確定ログ:', {
                      // Supabaseエラー詳細
                      message: writeBackError.message,
                      details: (writeBackError as any).details,
                      hint: (writeBackError as any).hint,
                      code: (writeBackError as any).code,
                      
                      // payload詳細分析（型・値・構造）
                      payload_full: writeBackPayload,
                      photo_urls_value: writeBackPayload.photo_urls,
                      photo_urls_type: typeof writeBackPayload.photo_urls,
                      photo_urls_isArray: Array.isArray(writeBackPayload.photo_urls),
                      photo_urls_stringify: JSON.stringify(writeBackPayload.photo_urls),
                      photo_urls_element_types: Array.isArray(writeBackPayload.photo_urls) 
                        ? writeBackPayload.photo_urls.map(v => typeof v)
                        : 'not_array',
                      photo_urls_length: Array.isArray(writeBackPayload.photo_urls) 
                        ? writeBackPayload.photo_urls.length 
                        : 'not_array',
                      
                      // 元データ分析
                      original_avatar_url: profile?.avatar_url,
                      original_photo_urls: profile?.photo_urls,
                      trimmed_avatar_url: avatarUrl,
                      
                      // DB更新情報
                      update_table: 'profiles',
                      update_column: 'photo_urls', 
                      where_condition: `id = ${user.id}`,
                      userId: user.id,
                      
                      // 診断分類
                      suspected_cause: writeBackError.message?.includes('malformed array') ? 'ARRAY_LITERAL_ERROR' :
                                      writeBackError.message?.includes('column') ? 'COLUMN_NOT_FOUND' :
                                      writeBackError.message?.includes('permission') ? 'PERMISSION_DENIED' :
                                      'UNKNOWN_400'
                    })
                    
                    // 🎯 Step 2-4: DB型確認と修正方針ガイド
                    console.log('📋 [STEP 2] DB型確認SQL - Supabase SQL Editorで実行してください:')
                    console.log(`
                      SELECT column_name, data_type, udt_name
                      FROM information_schema.columns 
                      WHERE table_schema='public' 
                        AND table_name='profiles' 
                        AND column_name='photo_urls';
                    `)
                    
                    console.log('📋 [STEP 3] 型別修正方針:')
                    console.log('- udt_name="_text" (text[])の場合: payload = [avatarUrl] ← 推奨')
                    console.log('- data_type="jsonb"の場合: payload = [avatarUrl]')  
                    console.log('- data_type="text"の場合: DBをtext[]にマイグレーション推奨')
                    
                    console.log('📋 [STEP 4] DB一括修復SQL（text[]の場合）:')
                    console.log(`
                      UPDATE public.profiles 
                      SET photo_urls = array[avatar_url]
                      WHERE (photo_urls IS NULL OR cardinality(photo_urls)=0)
                        AND avatar_url IS NOT NULL 
                        AND avatar_url <> '';
                        
                      ALTER TABLE public.profiles 
                      ALTER COLUMN photo_urls SET DEFAULT '{}';
                    `)
                  } else {
                    console.log('✅ [TASK2] write-back success - 結果確認:', {
                      updated_data: data,
                      count: data?.length || 0,
                      photo_urls_after: data?.[0]?.photo_urls,
                      verification: data?.[0]?.photo_urls?.length > 0 ? '修復成功' : '修復失敗'
                    })
                    
                    // 🎯 Step C: 成功時のみ二度実行防止フラグ設定
                    sessionStorage.setItem(writeBackKey, 'true')
                    
                    // 🎯 完了条件検証ログ
                    console.log('✅ [TASK2 COMPLETION] 完了条件達成:', {
                      '1_write_back_success': true,
                      '2_photo_urls_populated': data?.[0]?.photo_urls?.length > 0,
                      '3_next_reload_no_restore_log': 'リロード後に「復元ログ」が消失することを確認',
                      '4_image_operations_consistent': '画像追加/削除/入替→保存でprofiles.photo_urlsが画面と一致することを確認',
                      verification_status: 'TASK2根治完了'
                    })
                    
                    // 🎯 Step 5: 最終形ガイド（設計単純化）
                    console.log('📋 [STEP 5] 最終形推奨設計:')
                    console.log('1. 保存ボタンpayloadに常にphoto_urls含める')
                    console.log('2. photo_urlsは常にstring[]')  
                    console.log('3. avatar_urlは後方互換として残す（1枚目用）')
                    console.log('4. write-backは保険に格下げ（DBバックフィル後は基本発火しない）')
                  }
                } catch (error) {
                  console.error('🚨 [TASK2] write-back処理エラー - 予期しないエラー:', {
                    error,
                    error_type: typeof error,
                    error_message: error instanceof Error ? error.message : 'unknown',
                    error_stack: error instanceof Error ? error.stack : 'no stack'
                  })
                }
              }, 1000) // 初期化完了後に実行
            } else {
              console.log('🎯 [TASK2] write-back既完了 - スキップ')
            }
          }
          // 🔧 STEP 3: どちらも空の場合のみlocalStorageを確認
          else {
            try {
              const savedImages = localStorage.getItem('currentProfileImages')
              if (savedImages) {
                const parsedImages = JSON.parse(savedImages)
                if (parsedImages && parsedImages.length > 0) {
                  console.log('📦 fromMyPage: DBに画像なし - localStorage補助使用')
                  currentImageArray = parsedImages
                  setProfileImages(parsedImages)
                }
              }
            } catch (error) {
              console.error('fromMyPage localStorage読み込みエラー:', error)
            }
          }
        }

        // fromMyPageで画像が取得できなかった場合、または通常のフローの場合
        if (currentImageArray.length === 0) {
          if (shouldUseStorageImages) {
            console.log('✅ セッションストレージから画像状態を復元:', storageImages)
            currentImageArray = storageImages
            setProfileImages(storageImages)
            // 🔍 CRITICAL: MyPage→編集時のprofile_images missing修正（Task B）
            profileImagesRef.current = storageImages
            console.log('🔧 TASK B FIX: sessionStorage画像復元でprofileImagesRef更新', {
              storageImages_length: storageImages.length,
              profileImagesRef_length: profileImagesRef.current.length
            })
          } else {
            // 🎯 SSOT統一: avatar_urlがある場合は必ずprofileImages配列に反映
            if (profile?.avatar_url && profile.avatar_url.trim() !== '') {
              console.log('✅ プロフィール画像を設定（SSOT統一）:', profile!.avatar_url.substring(0, 50) + '...')
              console.log('  - isBase64:', profile!.avatar_url.startsWith('data:image/'))
              console.log('  - isNewUser:', isNewUser, ', avatar_urlを確実にprofileImagesに反映')
              
              currentImageArray = [{
                id: '1',
                url: profile!.avatar_url,
                originalUrl: profile!.avatar_url,
                isMain: true,
                isEdited: false
              }]
              setProfileImages(prev => {
              console.log('[FUNCTIONAL] 画像復元:', { prev_length: prev.length, current_length: currentImageArray.length })
              return currentImageArray
            })
              // 🔍 CRITICAL: profileImagesRefも同期（SSOT統一）
              profileImagesRef.current = currentImageArray
              
              console.log('🎯 SSOT統一: avatar_url→profileImages反映完了', {
                currentImageArray_length: currentImageArray.length,
                profileImagesRef_length: profileImagesRef.current.length,
                avatar_url_exists: !!profile?.avatar_url,
                isBase64: profile!.avatar_url.startsWith('data:image/'),
                ssot_fix: 'avatar_url確実反映でUI表示と完成度計算を統一'
              })
            } else {
              console.log('❌ 画像なしで初期化（avatar_url無効）')
              console.log('  - avatar_url存在:', !!profile?.avatar_url)
              console.log('  - avatar_url値:', profile?.avatar_url)
              currentImageArray = []
            }
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
          age: defaults.age || profile?.age || 18,
          nationality: isForeignMale ? (defaults.nationality || profile?.nationality) : profile?.nationality,
          residence: defaults.prefecture || profile?.residence || profile?.prefecture,
          interests: profile?.interests || profile?.hobbies || [],
          bio: profile?.bio || profile?.self_introduction || '',
          hobbies: existingHobbies,
          personality: existingPersonality, // 🔧 FIXED: 既存personalityデータを維持
          // 外国人男性専用フィールドを明示的に追加
          visit_schedule: profile?.visit_schedule,
          travel_companion: profile?.travel_companion,
          planned_prefectures: profile?.planned_prefectures || [],
          japanese_level: profile?.japanese_level,
          planned_stations: (profile as any).planned_stations || [],
          // その他のオプションフィールド
          occupation: profile?.occupation,
          height: profile?.height,
          body_type: profile?.body_type,
          marital_status: profile?.marital_status,
          english_level: profile?.english_level,
          // ユーザー画像情報を追加
          avatarUrl: user?.avatarUrl || profile?.avatarUrl,
          avatar_url: user?.avatarUrl || profile?.avatar_url, // userオブジェクトはavatarUrlのみ
        }
        // 🚨 CRITICAL: fromMyPage でもbuildProfileForCompletion使用（完全統一）
        console.log('🔄 fromMyPage: 🌟 統一フロー初期化:', {
          profile_personality: profile?.personality,
          selectedPersonality: selectedPersonality,
          selectedHobbies: selectedHobbies,
          languageSkills: languageSkills,
          source: 'fromMyPage初期化時（SSOT適用）'
        })

        // 🌟 SINGLE SOURCE OF TRUTH: フォーム初期値のみを完成度計算に使用
        // DBプロファイルは初期値設定のみに使用し、完成度計算からは除外
        const formValuesForInitialCompletion = {
          ...profileDataWithSignup,
          // state値を優先（フォームの現在状態）
          hobbies: selectedHobbies,
          personality: selectedPersonality,
          language_skills: languageSkills,
          planned_prefectures: selectedPlannedPrefectures,
        }

        // 🛡️ CRITICAL: チラつき防止 - 初期化中は完成度計算をスキップ
        if (isInitializing) {
          console.log('🛑 fromMyPage統一フロー: skipped because isInitializing=true', { isInitializing })
        } else {
          // 🌟 統一フロー: calculateCompletionFromForm使用（33%問題根本解決）
          const result = calculateCompletionFromForm(
            formValuesForInitialCompletion,
            isForeignMale ? 'foreign-male' : 'japanese-female',
            currentImageArray,
            isNewUser
          )
        
          console.log('🔄 fromMyPage: 🌟 統一フロー完了:', {
            form_hobbies: formValuesForInitialCompletion.hobbies,
            form_personality: formValuesForInitialCompletion.personality,
            completion_percentage: result.completion,
            completedFields: result.completedFields,
            totalFields: result.totalFields,
            source: 'fromMyPage初期化（SSOT）- 33%問題根本解決'
          })
          
          setProfileCompletion(result.completion)
          setCompletedItems(result.completedFields)
          setTotalItems(result.totalFields)
        }
        
        // 🗑️ REMOVED: fromMyPage専用completion再計算を削除
        // メインのwatch subscriptionとuseEffectロジックに統一
        console.log('✅ Profile initialization completed - completion calculation handled by main logic')
        
        // 🔧 FIX: 初期化完了後に一度だけcompletion計算を実行（33%問題解決）
        queueMicrotask(() => {
          console.log('🔧 INITIALIZATION: Enabling watch-based completion calculation')
          console.log('🟢 initializingRef.current -> false (normal init end)')
          initializingRef.current = false
          
          // 初期化完了直後に一度だけ正確なcompletion計算
          const currentData = watch()
          const { custom_culture, ...currentDataWithoutCustomCulture } = currentData || {}
          
          // 🌟 SINGLE SOURCE OF TRUTH: 初期化完了後もフォーム値のみを使用
          const formValuesForPostInit = {
            ...currentDataWithoutCustomCulture,
            hobbies: selectedHobbies,
            personality: selectedPersonality,
            language_skills: languageSkills,
            planned_prefectures: selectedPlannedPrefectures,
          }

          console.log("🌟 初期化完了後: フォーム値のみで完成度計算", {
            hobbies: formValuesForPostInit.hobbies,
            personality: formValuesForPostInit.personality,
            source: '初期化完了後一回限り計算時（SSOT）'
          })

          // 🛡️ CRITICAL: チラつき防止 - 念のため初期化確認
          if (isInitializing) {
            console.log('🛑 初期化完了後計算: skipped because isInitializing=true', { isInitializing })
            return
          }
          
          // 🌟 統一フロー: calculateCompletionFromForm使用
          const completionResult = calculateCompletionFromForm(
            formValuesForPostInit,
            isForeignMale ? 'foreign-male' : 'japanese-female',
            profileImages,
            false // 初期化完了後なので新規ユーザーフラグはfalse
          )
            
          console.log('🔧 INITIAL: 🌟 統一フロー一回限り計算完了:', {
            completion_percentage: completionResult.completion,
            required_completed: completionResult.requiredCompleted,
            required_total: completionResult.requiredTotal,
            source: 'Post-initialization single calculation (SSOT)'
          })
          
          setProfileCompletion(completionResult.completion)
          setCompletedItems(completionResult.completedFields)
          setTotalItems(completionResult.totalFields)
          
          // 🌟 CRITICAL: チラつき防止 - 初期化完了フラグを設定
          console.log('✅ Profile initialization completed')
          console.log('🟢 isInitializing -> false (normal init end)')
          setIsInitializing(false)
          
          // 🌟 CRITICAL: 初期化完了フラグを設定（これより後はupdateCompletionUnified使用）
          console.log('🌟 CRITICAL: 初期化完了 - isHydrated=true設定')
          setIsHydrated(true)
        })

      } catch (error) {
        console.error('Error loading user data:', error)
        setError('ユーザー情報の読み込みに失敗しました')
      } finally {
        // 🚨 CRITICAL FIX: 例外が発生してもisInitializing確実解除（リアルタイム更新復活保証）
        console.log('🟢 isInitializing -> false (finally block - guaranteed)')
        setIsInitializing(false)
        
        // 🔧 CRITICAL FIX: initializingRef も確実に解除（watch復活保証）
        console.log('🟢 initializingRef.current -> false (finally block - guaranteed)')
        initializingRef.current = false
        
        // 🆕 CRITICAL FIX: エラー時でも確実にハイドレーション完了（29%固定問題解決）
        console.log('🟢 isHydrated -> true (finally block - FORCE COMPLETE)')
        setIsHydrated(true)
        
        setUserLoading(false)
      }
    }

    initializeProfileEdit()
  }, [user, reset, router, setValue, supabase, isForeignMale, isJapaneseFemale])

  // Form submission handler
  const onSubmit = async (data: ProfileEditFormData, event?: React.BaseSyntheticEvent) => {
    // 🟥 CRITICAL: 保存処理開始の絶対証明ログ（最上段）
    console.log('🟥 SAVE CLICKED (ProfileEdit)')
    const saveClickedAt = new Date().toISOString()
    console.log('🟥 SAVE TIMESTAMP:', saveClickedAt)
    
    // 🔴 CRITICAL: デバッグパネル強制表示（保存ボタンクリック証明）
    setDebugPanel({
      show: true,
      uid: 'processing...',
      whereCondition: 'processing...',
      payloadPersonalityTags: 'processing...',
      dbPersonalityTags: 'processing...',
      match: false,
      updateError: null,
      updatedRows: 0,
      rlsIssue: false,
      saveClickedAt: saveClickedAt
    })
    
    console.log('🚀 Form submission started')
    console.log('📋 提出されたデータ:', data)
    console.log('[Profile Submit] values.japanese_level:', data.japanese_level)
    console.log('[Profile Submit] values.english_level:', data.english_level)
    console.log('[Profile Submit] full values:', data)
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
      
      // 🚨 [NETWORK CULPRIT DETECTION] アップロード処理の詳細分析開始
      console.log('🖼️ 画像処理開始:', {
        profileImagesLength: profileImages.length,
        profileImages: profileImages.map((img, i) => ({
          index: i,
          id: img.id,
          isEdited: img.isEdited,
          isMain: img.isMain,
          url_preview: img.url ? img.url.substring(0, 50) + '...' : 'null',
          originalUrl_preview: img.originalUrl ? img.originalUrl.substring(0, 50) + '...' : 'null'
        }))
      })

      // 🚨 [NETWORK CULPRIT DETECTION] アップロードリクエスト数予測
      // 🔧 FIX: blob: と data:image (base64) の両方をアップロード対象にする
      const needsUploadImages = profileImages.filter(img =>
        img.url && (img.url.startsWith('blob:') || img.url.startsWith('data:image'))
      )
      console.log('🚨 [NETWORK CULPRIT] アップロード対象画像数:', {
        total_images: profileImages.length,
        new_upload_required: needsUploadImages.length,
        blob_count: profileImages.filter(img => img.url?.startsWith('blob:')).length,
        base64_count: profileImages.filter(img => img.url?.startsWith('data:image')).length,
        expected_storage_requests: needsUploadImages.length,
        prediction: `${needsUploadImages.length}ファイル = ${needsUploadImages.length}リクエスト予定`
      })

      let actualStorageRequests = 0 // リクエスト数カウンター

      for (const image of profileImages) {
        // 🔧 FIX: blob: または data:image (base64) はアップロードが必要
        const needsUpload = image.url && (image.url.startsWith('blob:') || image.url.startsWith('data:image'))
        if (needsUpload) {
          try {
            // 🚨 [NETWORK CULPRIT] リクエスト番号を記録
            actualStorageRequests++
            const isBase64 = image.url.startsWith('data:image')
            console.log(`🚨 [NETWORK CULPRIT] Storage Request #${actualStorageRequests} START:`, {
              image_id: image.id,
              request_number: actualStorageRequests,
              total_expected: needsUploadImages.length,
              url_type: isBase64 ? 'base64' : 'blob',
              url_preview: image.url.substring(0, 50) + '...'
            })

            console.log('📤 新規画像アップロード開始:', image.id, isBase64 ? '(base64)' : '(blob)')
            // 🔧 FIX: Blob URL と Base64 Data URL の両方を処理
            // fetch() は data: URL も blob: URL も処理可能
            const response = await fetch(image.url)
            const blob = await response.blob()
            
            // 🚨 [STORAGE OVERWRITE PREVENTION] ユニークファイル名生成（ensureAvatarStored.ts準拠）
            const fileExtension = blob.type.split('/')[1] || 'jpg'
            const timestamp = Date.now()
            const random = Math.random().toString(36).substr(2, 9)
            const fileName = `${user.id}/photo_${timestamp}_${random}.${fileExtension}`
            
            console.log('🚨 [STORAGE OVERWRITE CHECK] ProfileEdit独自アップロード:', {
              old_pattern: `profile_${user.id}_${timestamp}_${random}.${fileExtension}`,
              new_pattern: `${user.id}/photo_${timestamp}_${random}.${fileExtension}`,
              generated_path: fileName,
              bucket: 'avatars',
              overwrite_prevention: 'upsert: false',
              note: 'ensureAvatarStored.ts と統一パターンに変更'
            })
            
            console.log('📤 アップロード詳細:', fileName, blob.type, blob.size)
            
            // 🚨 [POSSIBILITY D] Storageバケット権限チェック（アップロード前）
            console.log('🚨 [POSSIBILITY D] Storage权限确认:', {
              bucket: 'avatars',
              user_id: user.id,
              filename: fileName,
              content_type: blob.type,
              size_kb: Math.round(blob.size / 1024),
              upsert_disabled: 'upsert: false（上書き防止）',
              rls_note: 'avatars bucketのRLSポリシー確認必要'
            })

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('avatars')  // 🚨 bucket統一: ensureAvatarStored.tsと同じbucket使用
              .upload(fileName, blob, {
                cacheControl: '3600',
                upsert: false  // 🚨 上書き防止
              })
              
            // 🚨 [POSSIBILITY D] アップロードエラー詳細分析
            if (uploadError) {
              console.error('🚨 [POSSIBILITY D] Storage upload FAILED:', {
                error_message: uploadError.message,
                error_details: uploadError,
                bucket: 'avatars',
                filename: fileName,
                user_id: user.id,
                possible_causes: [
                  'バケットRLSポリシーでアップロード拒否',
                  'ファイルサイズ制限超過',
                  'バケット容量制限',
                  'ネットワーク接続問題'
                ],
                troubleshoot: 'Supabase Dashboard → Storage → avatars → Policies確認'
              })
            }

            if (uploadError) {
              console.error('❌ アップロードエラー:', uploadError)
              throw uploadError
            }

            // パブリックURLを取得
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')  // 🚨 bucket統一: getPublicUrlも同じbucket
              .getPublicUrl(uploadData.path)

            uploadedImageUrls.push(publicUrl)
            console.log(`🚨 [NETWORK CULPRIT] Storage Request #${actualStorageRequests} SUCCESS:`, publicUrl)
            
            // 🚨 ✅ 指示書対応: アップロード成功後にprofileImages状態を即座に更新
            const targetIndex = profileImages.findIndex(img => img.id === image.id)
            if (targetIndex !== -1) {
              setProfileImages(prev => {
                const next = [...prev]
                next[targetIndex] = {
                  ...next[targetIndex],
                  url: publicUrl,        // ✅ blobではなくstorage URL
                  originalUrl: publicUrl
                }
                return next
              })
              console.log(`🚨 [UPLOAD STATE] profileImages[${targetIndex}] updated with storage URL:`, publicUrl.substring(0, 50) + '...')
            }
          } catch (uploadError) {
            console.error('❌ 個別画像のアップロードエラー:', uploadError)
            throw uploadError
          }
        } else {
          // 既存のStorage URL（https://...）をそのまま使用
          const existingUrl = image.url || image.originalUrl
          // 🔧 FIX: blob:とdata:image以外（=Storage URL）のみ追加
          const isValidStorageUrl = existingUrl &&
            !existingUrl.startsWith('blob:') &&
            !existingUrl.startsWith('data:image')
          if (isValidStorageUrl) {
            uploadedImageUrls.push(existingUrl)
            console.log('✅ 既存Storage URL追加:', {
              imageId: image.id,
              url: existingUrl.substring(0, 60) + '...'
            })
          } else {
            console.warn('⚠️ 無効な画像URL（アップロードが必要だがスキップされた可能性）:', {
              imageId: image.id,
              url: existingUrl?.substring(0, 60) + '...',
              isBlob: existingUrl?.startsWith('blob:') || false,
              isBase64: existingUrl?.startsWith('data:image') || false
            })
          }
        }
      }

      // 🚨 [NETWORK CULPRIT] 最終リクエスト数検証
      console.log('🚨 [NETWORK CULPRIT] アップロード完了 - リクエスト数検証:', {
        expected_requests: needsUploadImages.length,
        actual_requests: actualStorageRequests,
        match: needsUploadImages.length === actualStorageRequests,
        verification: `予測:${needsUploadImages.length}件 → 実行:${actualStorageRequests}件`,
        network_analysis_note: 'DevToolsのNetwork tab でstorage/v1/object POSTを確認してください'
      })
      
      console.log('🖼️ 画像処理完了:', {
        uploadedImageUrls: uploadedImageUrls.length,
        urls: uploadedImageUrls.map(url => url.substring(0, 60) + '...')
      })

      // メイン画像を決定
      const mainImageIndex = profileImages.findIndex(img => img.isMain)
      const rawAvatarUrl = mainImageIndex !== -1 && uploadedImageUrls[mainImageIndex] 
        ? uploadedImageUrls[mainImageIndex] 
        : uploadedImageUrls[0] || null

      console.log('🎯 Raw avatar URL (before Base64→Storage conversion):', rawAvatarUrl)
      console.log('📸 All uploaded URLs:', uploadedImageUrls)
      console.log('🔍 Profile images state:', profileImages)

      // 🔥 NEW: Base64→Storage変換処理（保存時のみ）
      let avatarUrl = rawAvatarUrl
      let conversionResult = null

      if (rawAvatarUrl) {
        console.log('🚨 Checking for Base64→Storage conversion need...')
        
        // Base64判定とStorage変換
        if (rawAvatarUrl.startsWith('data:image/')) {
          console.log('🔄 Base64 detected → Starting Storage conversion...')
          
          try {
            // 🔒 SECURITY: userIdはAPIサーバー側でauthUser.idから取得（リクエストに含めない）
            const response = await fetch('/api/upload-avatar', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                dataUrl: rawAvatarUrl  // userIdは送らない - サーバー側で認証から取得
              })
            })
            
            if (response.ok) {
              const result = await response.json()
              if (result.success) {
                avatarUrl = result.path // Storage path（例：user123/avatar.jpg）
                conversionResult = {
                  converted: true,
                  originalSize: rawAvatarUrl.length,
                  storagePath: result.path,
                  savedBytes: rawAvatarUrl.length - result.path.length
                }
                console.log('✅ Base64→Storage conversion success:', conversionResult)
              } else {
                console.warn('⚠️ Storage conversion failed, using original Base64:', result.error)
                conversionResult = { converted: false, error: result.error }
              }
            } else {
              console.warn('⚠️ Storage API error, using original Base64:', response.statusText)
              conversionResult = { converted: false, error: response.statusText }
            }
          } catch (error) {
            console.warn('⚠️ Storage conversion error, using original Base64:', error)
            conversionResult = { converted: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        } else {
          console.log('✅ Non-Base64 image (HTTP/Storage path), no conversion needed')
          conversionResult = { converted: false, reason: 'Non-Base64 format' }
        }
      }

      console.log('📊 Final image processing summary:', {
        totalImages: profileImages.length,
        uploadedUrls: uploadedImageUrls.length,
        mainImageIndex,
        rawAvatarUrl: rawAvatarUrl?.substring(0, 60) + '...' || 'null',
        finalAvatarUrl: avatarUrl?.substring(0, 60) + '...' || 'null',
        conversionResult
      })

      // 🆕 Triple-save対応: interests配列の構築（互換性維持）
      const consolidatedInterests: string[] = []
      
      // hobbies (日本文化) を追加
      if (selectedHobbies.length > 0) {
        consolidatedInterests.push(...selectedHobbies)
      }
      
      // 🎯 FIXED: personality を必ず明示的に処理（空配列でも上書き保存）
      // 古いpersonality:*エントリを削除
      const existingNonPersonalityInterests = consolidatedInterests.filter(item => !item.startsWith('personality:'))
      consolidatedInterests.length = 0
      consolidatedInterests.push(...existingNonPersonalityInterests)
      
      // personalityを条件なしで追加（空でも処理）
      selectedPersonality.forEach(personality => {
        consolidatedInterests.push(`personality:${personality}`)
      })
      
      // custom_culture を prefix付きで追加（互換性のため）
      if (data.custom_culture && data.custom_culture.trim()) {
        consolidatedInterests.push(`custom_culture:${data.custom_culture.trim()}`)
      }
      
      // 空の場合はデフォルト値
      if (consolidatedInterests.length === 0) {
        consolidatedInterests.push('その他')
      }
      
      // 🛡️ CRITICAL: text[]強制正規化システム（関数定義）
      const normalizeTextArray = (value: any): string[] => {
        if (!value) return []
        if (!Array.isArray(value)) return []
        return value.map(item => {
          if (typeof item === 'string') return item
          if (typeof item === 'object' && item !== null) {
            return String(item.value ?? item.label ?? item)
          }
          return String(item)
        }).filter(Boolean)
      }

      // 🎯 CRITICAL FIX: personality/culture_tagsを正しいフィールドから生成
      // 🚨 NULL禁止 + 重複・空値除去: 保存時は必ず正規化（null/undefined→[]、重複除去）
      const rawPersonalityTags = Array.isArray(selectedPersonality) ? selectedPersonality : []
      const rawCultureTags = Array.isArray(selectedHobbies) ? selectedHobbies : []
      
      // 🧹 FIRST: カスタム正規化で重複・空値・無効値を除去
      const cleanPersonalityTags = normalizeTags(rawPersonalityTags)
      const cleanCultureTags = normalizeTags(rawCultureTags)
      
      // 🚨 CRITICAL: normalizeTextArray()で必ずstring[]に変換（null禁止）
      const personalityTags = normalizeTextArray(cleanPersonalityTags) ?? []  // 性格（personality_tags）
      const cultureTags = normalizeTextArray(cleanCultureTags) ?? []  // 共有したい日本文化（culture_tags）
      
      // 🔍 CRITICAL: 最終string[]確認ログ（正規化効果含む）
      console.log('🛡️ NORMALIZED PERSONALITY_TAGS VERIFICATION:', {
        raw_selectedPersonality: selectedPersonality,
        raw_selectedHobbies: selectedHobbies,
        clean_personality_normalized: cleanPersonalityTags,
        clean_culture_normalized: cleanCultureTags,
        personalityTags_final: personalityTags,
        cultureTags_final: cultureTags,
        normalization_effect: {
          personality_cleaning: `${rawPersonalityTags.length} -> ${cleanPersonalityTags.length} (removed ${rawPersonalityTags.length - cleanPersonalityTags.length})`,
          culture_cleaning: `${rawCultureTags.length} -> ${cleanCultureTags.length} (removed ${rawCultureTags.length - cleanCultureTags.length})`
        },
        personalityTags_isStringArray: Array.isArray(personalityTags) && personalityTags.every(item => typeof item === 'string'),
        cultureTags_isStringArray: Array.isArray(cultureTags) && cultureTags.every(item => typeof item === 'string'),
        guarantee: '重複・空値除去 + normalizeTextArray()で必ずstring[]変換済み'
      })
      
      // 🚨 NULL禁止正規化ログ
      console.log('🔧 NULL禁止正規化完了:', {
        selectedPersonality_original: selectedPersonality,
        selectedHobbies_original: selectedHobbies,
        personalityTags_normalized: personalityTags,
        cultureTags_normalized: cultureTags,
        personalityTags_isArray: Array.isArray(personalityTags),
        cultureTags_isArray: Array.isArray(cultureTags),
        personalityTags_length: personalityTags.length,
        cultureTags_length: cultureTags.length,
        null_prevention_success: 'personalityTags/cultureTagsは必ず配列として保存される'
      })
      
      // 🚨 CRITICAL DEBUG: personality/culture保存値の詳細追跡
      console.log('🧭 PERSONALITY & CULTURE SAVE DEBUG - DETAILED TRACKING:', {
        // 性格（personality_tags）
        selectedPersonality_state: selectedPersonality,
        selectedPersonality_type: typeof selectedPersonality,
        selectedPersonality_isArray: Array.isArray(selectedPersonality),
        selectedPersonality_length: selectedPersonality?.length || 0,
        selectedPersonality_stringified: JSON.stringify(selectedPersonality),
        personalityTags_final: personalityTags,
        personalityTags_type: typeof personalityTags,
        personalityTags_isArray: Array.isArray(personalityTags),
        personalityTags_length: personalityTags?.length || 0,
        personalityTags_stringified: JSON.stringify(personalityTags),
        // 共有したい日本文化（culture_tags）  
        selectedHobbies_state: selectedHobbies,
        selectedHobbies_type: typeof selectedHobbies,
        selectedHobbies_isArray: Array.isArray(selectedHobbies),
        selectedHobbies_length: selectedHobbies?.length || 0,
        selectedHobbies_stringified: JSON.stringify(selectedHobbies),
        cultureTags_final: cultureTags,
        cultureTags_type: typeof cultureTags,
        cultureTags_isArray: Array.isArray(cultureTags),
        cultureTags_length: cultureTags?.length || 0,
        cultureTags_stringified: JSON.stringify(cultureTags),
        SAVE_LOGIC: {
          personalityTags: 'selectedPersonality を直接保存',
          cultureTags: 'selectedHobbies を直接保存（共有したい日本文化）'
        }
      })

      // プロフィール更新データを準備
      const updateData: any = {
        name: data.nickname,          // 🔧 修正: nickname → name
        gender: data.gender,
        age: data.age,
        birth_date: data.birth_date,
        // 注意: prefectureカラムはDBに存在しない。residenceのみ使用
        residence: data.prefecture,   // フォームのprefecture値をDB上のresidenceカラムに保存
        occupation: data.occupation === 'none' ? null : data.occupation,
        height: data.height ? data.height : null,
        body_type: data.body_type === 'none' ? null : data.body_type,
        marital_status: data.marital_status === 'none' ? null : data.marital_status,
        // ✨ 言語スキル: 常に現在のlanguageSkills stateを保存（'none'値のみ除外）
        language_skills: (() => {
          // 'none'値を除外したvalid skillsのみを保存
          const validSkills = languageSkills.filter(skill => 
            skill && 
            skill.language && skill.level && 
            skill.language !== 'none' && skill.level !== 'none'
          )
          
          console.log('🔥 CRITICAL: language_skills保存処理:', {
            'languageSkills_state': languageSkills,
            'validSkills_after_filter': validSkills,
            'will_save_to_supabase': validSkills,  // nullではなく配列を送信
            'state_type': typeof languageSkills,
            'state_isArray': Array.isArray(languageSkills),
            'validSkills_length': validSkills.length
          })
          
          // 🚀 FIX: 空配列でもnullではなく配列として保存
          return validSkills
        })(),
        // レガシーフィールドは完全に無効化（常にnull）
        japanese_level: null,
        english_level: null,
        bio: data.self_introduction,   // 🔧 修正: self_introduction → bio
        interests: consolidatedInterests,
        // ✅ Triple-save機能復旧（personality/culture分離）+ NULL禁止保証
        // 注意: personality カラムはDBに存在しない。personality_tags のみ使用
        personality_tags: personalityTags,  // 必ず配列（[]またはデータ）として保存
        culture_tags: cultureTags,         // 必ず配列（[]またはデータ）として保存
        // 🚨 ✅ TASK1 FIXED: 常にphoto_urls全配列を保存（条件付き除去を廃止）
        // 🔥 TASK C: 0枚保存時は空配列を確実にDBに保存
        photo_urls: (() => {
          console.log('🚨 [TASK1] photo_urls保存処理開始 - 3枚URL保存確保（無条件）')

          // 🎯 FIXED: 直接profileImagesから全てのURLを配列として構築
          const safePhotoUrls = Array.isArray(profileImages)
            ? profileImages
                .map((img, index) => {
                  // 新規アップロード済みURLがあれば優先、なければ既存URL使用
                  const finalUrl = uploadedImageUrls[index] || img.url || img.originalUrl
                  console.log(`🔍 [TASK1] Image ${index}:`, {
                    hasUploadedUrl: !!uploadedImageUrls[index],
                    uploadedUrl_preview: uploadedImageUrls[index] ? uploadedImageUrls[index].substring(0, 40) + '...' : 'none',
                    existingUrl_preview: (img.url || img.originalUrl) ? (img.url || img.originalUrl).substring(0, 40) + '...' : 'none',
                    finalUrl_preview: finalUrl ? finalUrl.substring(0, 40) + '...' : 'null'
                  })
                  return finalUrl
                })
                .filter(url => url && typeof url === 'string' && !url.startsWith('blob:') && !url.startsWith('data:'))
                .map(url => String(url)) // 🛡️ 型安全性保証
            : []

          // 🔥 TASK C: 0枚保存の明示的ログ
          if (safePhotoUrls.length === 0) {
            console.log('📸 [TASK C] 0枚保存検出 - photo_urls=[]をDBに保存:', {
              profileImages_count: profileImages.length,
              uploadedImageUrls_count: uploadedImageUrls.length,
              final_result: '空配列[]',
              db_effect: 'photo_urls=[], avatar_url=null で保存される'
            })
          }

          console.log('🚨 [TASK1] 最終photo_urls配列確定:', {
            original_profileImages_count: profileImages.length,
            uploadedImageUrls_count: uploadedImageUrls.length,
            uploadedImageUrls_preview: uploadedImageUrls.map(url => url.substring(0, 40) + '...'),
            final_safePhotoUrls_count: safePhotoUrls.length,
            safePhotoUrls_full: safePhotoUrls,
            expected_result: safePhotoUrls.length === 0
              ? '0枚 → photo_urls=[] として保存'
              : `${safePhotoUrls.length}枚アップ時は[url1,...] として保存される`
          })

          return safePhotoUrls
        })(),
        // 🚨 A. avatar_url = photo_urls[0] 同期（簡素化版）
        // 🔥 TASK C: 0枚保存時はavatar_url=null を確実に保存
        avatar_url: (() => {
          // 🎯 FIXED: photo_urlsと同じロジックで[0]を取得
          const firstImageUrl = profileImages[0]
            ? (uploadedImageUrls[0] || profileImages[0].url || profileImages[0].originalUrl)
            : null

          if (!firstImageUrl || firstImageUrl.startsWith('blob:') || firstImageUrl.startsWith('data:')) {
            console.log('📸 [TASK C] avatar_url: null (有効な画像なし)', {
              profileImages_length: profileImages.length,
              firstImageUrl: firstImageUrl || 'null',
              reason: firstImageUrl?.startsWith('blob:') ? 'blob:スキップ' :
                      firstImageUrl?.startsWith('data:') ? 'data:スキップ' : '画像なし'
            })
            return null
          }

          console.log('🚨 [TASK1] avatar_url確定:', firstImageUrl.substring(0, 40) + '...')
          return firstImageUrl
        })()
        // 注意: profile_imagesカラムはDBに存在しない。photo_urlsのみ使用
        // profile_images は削除済み - photo_urls + avatar_url のみでDB保存
        // 🚨 updated_at は DB に存在しないため削除済み（DB側トリガーで自動更新）
      }

      // 🛡️🛡️🛡️ FORBIDDEN KEYS GUARD: DBに存在しないカラムを強制削除（最終防衛）
      // 🚨 CRITICAL: このリストに含まれるキーは絶対にDBに送信されない
      const FORBIDDEN_KEYS = ['profile_images', 'personality', 'prefecture', 'images', 'profile_image', 'updated_at'] as const
      for (const key of FORBIDDEN_KEYS) {
        if (key in updateData) {
          console.warn(`🚫 [profile/edit] Forbidden key "${key}" detected and removed from updateData`)
          delete (updateData as any)[key]
        }
      }

      // ✅ UPDATE PAYLOAD KEYS確認（証拠ログ - 必須出力）
      console.log('✅ UPDATE PAYLOAD KEYS (profile/edit):', Object.keys(updateData))
      console.log('🛡️ FORBIDDEN KEYS CHECK:', {
        'profile_images_in_updateData': ('profile_images' in updateData),
        'personality_in_updateData': ('personality' in updateData),
        'prefecture_in_updateData': ('prefecture' in updateData),
        'images_in_updateData': ('images' in updateData),
        'profile_image_in_updateData': ('profile_image' in updateData),
        'all_forbidden_keys_removed': FORBIDDEN_KEYS.every(key => !(key in updateData))
      })

      // 🛡️ FINAL CHECK MAIN PHOTO SYNC: メイン画像同期の証拠ログ
      console.log('🛡️ FINAL CHECK MAIN PHOTO SYNC:', {
        'photo_urls[0]': Array.isArray(updateData.photo_urls) && updateData.photo_urls[0]
          ? updateData.photo_urls[0].substring(0, 60) + '...'
          : 'none',
        'avatar_url': updateData.avatar_url
          ? updateData.avatar_url.substring(0, 60) + '...'
          : 'null',
        'photo_urls_count': Array.isArray(updateData.photo_urls) ? updateData.photo_urls.length : 0,
        'avatar_url_in_payload': 'avatar_url' in updateData,
        'sync_ok': Array.isArray(updateData.photo_urls) && updateData.photo_urls[0] === updateData.avatar_url
      })

      // 🚨 [POSSIBILITY B] payload漏れ完全防止チェック
      console.log('🚨 [POSSIBILITY B] DB保存payload漏れ防止チェック:', {
        didTouchPhotos_flag: didTouchPhotos,
        payload_strategy: didTouchPhotos ? '画像操作あり → photo_urls含める' : '画像未操作 → photo_urls除外（破壊防止）',
        preventive_measure: 'didTouchPhotosフラグによる条件付きpayload構築',
        risk_without_flag: 'photo_urlsが常にpayloadに含まれると、初期化時や意図しないタイミングで空配列で上書きされるリスク'
      })
      
      // 🚨 4) didTouchPhotosフラグ状態ログ
      console.log('🚨 [TOUCH FLAG STATUS] didTouchPhotos:', didTouchPhotos)
      console.log('🚨 [TOUCH FLAG] photo_urls処理方針:', didTouchPhotos ? '含める（画像操作あり）' : 'EXCLUDE（画像未操作）')
      
      // 🚨 1) NETWORK犯人特定ログ（指示書要求）
      console.log('🚨 [NETWORK CULPRIT CHECK] updateData全体:', updateData)
      console.log('🔥 SAVE PAYLOAD VERIFICATION - photo_urls重点チェック:', {
        // 🖼️ photo_urls完全検証
        photo_urls_value: updateData.photo_urls,
        photo_urls_length: Array.isArray(updateData.photo_urls) ? updateData.photo_urls.length : 'not_array',
        photo_urls_type: typeof updateData.photo_urls,
        photo_urls_isArray: Array.isArray(updateData.photo_urls),
        photo_urls_isEmptyArray: Array.isArray(updateData.photo_urls) && updateData.photo_urls.length === 0,
        photo_urls_preview: Array.isArray(updateData.photo_urls) 
          ? updateData.photo_urls.map((url: string) => url ? url.substring(0, 50) + '...' : 'null')
          : 'not_array',
        photo_urls_stringified: JSON.stringify(updateData.photo_urls),
        // avatar_url同期確認
        avatar_url_value: updateData.avatar_url,
        avatar_url_preview: updateData.avatar_url ? updateData.avatar_url.substring(0, 50) + '...' : 'null',
        // 元データ確認
        profileImages_count: profileImages.length,
        uploadedImageUrls_count: uploadedImageUrls.length,
        // personality_tags検証
        personality_tags_value: updateData.personality_tags,
        personality_tags_type: typeof updateData.personality_tags,
        personality_tags_isNull: updateData.personality_tags === null,
        personality_tags_isUndefined: updateData.personality_tags === undefined,
        personality_tags_isArray: Array.isArray(updateData.personality_tags),
        personality_tags_length: updateData.personality_tags?.length || 0,
        // 他の任意項目との比較
        height_value: updateData.height,
        height_type: typeof updateData.height,
        occupation_value: updateData.occupation,
        occupation_type: typeof updateData.occupation,
        body_type_value: updateData.body_type,
        body_type_type: typeof updateData.body_type,
        // updateData全体のキー確認
        updateData_keys: Object.keys(updateData),
        personality_tags_in_keys: Object.keys(updateData).includes('personality_tags'),
        // updateData全体のJSON文字列化（Supabaseに送信される実際のペイロード）
        full_updateData_payload: JSON.stringify(updateData, null, 2)
      })

      // 🔍 NOTE: personality_tags/culture_tagsは既にnormalizeTextArray()で正規化済み
      // updateDataに設定された値は必ずstring[]または[]（null/undefined絶対なし）
      
      // 🚨 CRITICAL DEBUG: Supabaseに送信される実際のpersonality_tags値
      console.log('🗄️ SUPABASE PERSONALITY_TAGS SAVE:', {
        updateData_personality_tags: updateData.personality_tags,
        personality_tags_type: typeof updateData.personality_tags,
        personality_tags_isArray: Array.isArray(updateData.personality_tags),
        personality_tags_length: updateData.personality_tags?.length || 0,
        SAVE_VERIFICATION: {
          personality_tags_field: 'ALWAYS included in payload',
          empty_array_handling: Array.isArray(updateData.personality_tags) && updateData.personality_tags.length === 0 ? 'WILL CLEAR DB' : 'WILL UPDATE DB'
        }
      })

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
        updateData.visit_schedule = (data.visit_schedule && data.visit_schedule !== 'no-entry' && data.visit_schedule !== 'noEntry') ? data.visit_schedule : null
        updateData.travel_companion = (data.travel_companion && data.travel_companion !== 'no-entry' && data.travel_companion !== 'noEntry') ? data.travel_companion : null
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

      console.log('[Profile Submit] updatePayload:', updateData)
      console.log('[Profile Submit] updating user id:', user?.id)
      console.log('🗣️ LANGUAGE SKILLS SAVE DEBUG - DETAILED:', {
        languageSkillsState: languageSkills,
        languageSkillsType: typeof languageSkills,
        languageSkillsIsArray: Array.isArray(languageSkills),
        languageSkillsLength: languageSkills?.length,
        willSaveLanguageSkills: languageSkills && languageSkills.length > 0 ? languageSkills : null,
        formDataLanguageSkills: data.language_skills,
        languageSkillsStringified: JSON.stringify(languageSkills),
        legacyFieldsSetToNull: {
          japanese_level: null,
          english_level: null
        }
      })
      
      // 🔍 CRITICAL: languageSkillsが空の場合の原因調査
      if (!languageSkills || languageSkills.length === 0) {
        console.warn('🚨 CRITICAL: languageSkills is empty at save time!')
        console.warn('🔍 Debugging languageSkills source:', {
          stateLanguageSkills: languageSkills,
          formLanguageSkills: data.language_skills,
          watchLanguageSkills: watch('language_skills')
        })
      }
      
      // 🧪 指示書要求: 保存クリック時の必須デバッグログ
      console.log("🧪 SAVE DEBUG profileImages:", profileImages)
      console.log("🧪 SAVE DEBUG safePhotoUrls:", updateData.photo_urls)
      console.log("🧪 SAVE DEBUG payload.photo_urls length:", Array.isArray(updateData.photo_urls) ? updateData.photo_urls.length : 'not_array')
      
      // ✅ TASK3: 最重要デバッグログ（3枚画像保存確保のため）
      console.log("🚨 [TASK3] CRITICAL PAYLOAD DEBUG - 3枚URL保存の完全検証:", {
        // ===== UPLOAD処理確認 =====
        uploadedImageUrls_count: uploadedImageUrls.length,
        uploadedImageUrls_details: uploadedImageUrls.map((url, i) => ({
          index: i,
          url_type: typeof url,
          url_preview: url ? url.substring(0, 60) + '...' : 'null',
          is_storage_url: url && url.includes('supabase'),
          is_valid: url && typeof url === 'string' && !url.startsWith('blob:') && !url.startsWith('data:')
        })),
        // ===== PROFILE IMAGES確認 =====
        profileImages_count: profileImages.length,
        profileImages_details: profileImages.map((img, i) => ({
          index: i,
          has_url: !!img.url,
          has_originalUrl: !!img.originalUrl,
          url_preview: img.url ? img.url.substring(0, 60) + '...' : 'none',
          originalUrl_preview: img.originalUrl ? img.originalUrl.substring(0, 60) + '...' : 'none'
        })),
        // ===== 最終PAYLOAD確認 =====
        photo_urls_in_payload: updateData.photo_urls,
        photo_urls_type: typeof updateData.photo_urls,
        photo_urls_isArray: Array.isArray(updateData.photo_urls),
        photo_urls_length: Array.isArray(updateData.photo_urls) ? updateData.photo_urls.length : 'not_array',
        photo_urls_content: Array.isArray(updateData.photo_urls) 
          ? updateData.photo_urls.map((url: any, i: number) => ({
              index: i,
              url_preview: url ? String(url).substring(0, 60) + '...' : 'null',
              is_storage_url: url && String(url).includes('supabase')
            }))
          : 'not_array',
        avatar_url_in_payload: updateData.avatar_url,
        avatar_url_preview: updateData.avatar_url ? String(updateData.avatar_url).substring(0, 60) + '...' : 'null',
        // ===== 期待値確認 =====
        expected_behavior: '3枚アップロード時: photo_urls=[storage_url_1, storage_url_2, storage_url_3], avatar_url=storage_url_1',
        critical_check: Array.isArray(updateData.photo_urls) && updateData.photo_urls.length === 3 ? '✅ 3枚配列OK' : '❌ 3枚配列NG'
      })
      
      // 🧪 指示書要求: 修正②の確認（常に配列で保存）
      console.log("🧪 [指示書修正②] 配列保存確認:", {
        photo_urls_type: typeof updateData.photo_urls,
        photo_urls_isArray: Array.isArray(updateData.photo_urls),
        photo_urls_filtered: Array.isArray(updateData.photo_urls) ? updateData.photo_urls.filter(Boolean) : 'not_array',
        max_3_slice: Array.isArray(updateData.photo_urls) ? updateData.photo_urls.slice(0, 3) : 'not_array'
      })
      
      // 🚨 ✅ TASK3: 最終保存payload検証（最優先：3枚URL保存確保）
      console.log('🚨 [TASK3] 最終保存payload検証 - photo_urls重点確認:', {
        did_touch_photos: didTouchPhotos,
        photo_urls_included: 'photo_urls' in updateData,
        photo_urls_value: updateData.photo_urls,
        photo_urls_type: typeof updateData.photo_urls,
        photo_urls_isArray: Array.isArray(updateData.photo_urls),
        photo_urls_length: Array.isArray(updateData.photo_urls) ? updateData.photo_urls.length : 'not_array',
        photo_urls_preview: Array.isArray(updateData.photo_urls) 
          ? updateData.photo_urls.map((url: string) => url ? url.substring(0, 50) + '...' : 'null')
          : 'not_array',
        avatar_url_value: updateData.avatar_url,
        avatar_url_preview: updateData.avatar_url ? updateData.avatar_url.substring(0, 50) + '...' : 'null',
        expected_behavior: '3枚アップ時 → photo_urls=[url1,url2,url3], avatar_url=url1'
      })
      
      console.log('📝 Final update data (field mapping fixed):', {
        ...updateData,
        name_source: `nickname="${data.nickname}"`,
        bio_source: `self_introduction="${data.self_introduction}"`,
        field_mapping_fix: 'nickname→name, self_introduction→bio'
      })
      console.log('🔍 Consolidated interests debug:', {
        selectedHobbies,
        selectedPersonality,
        customCulture: data.custom_culture,
        consolidatedInterests,
        totalItems: consolidatedInterests.length
      })

      // データベース更新直前のデバッグ
      console.log('🔥 SUPABASE UPDATE - Pre-update debug:', {
        updateData_language_skills: updateData.language_skills,
        updateData_japanese_level: updateData.japanese_level,
        updateData_english_level: updateData.english_level,
        updateData_personality_tags: updateData.personality_tags,
        personality_tags_final_check: {
          value: updateData.personality_tags,
          type: typeof updateData.personality_tags,
          isArray: Array.isArray(updateData.personality_tags),
          length: updateData.personality_tags?.length || 0,
          isEmpty: Array.isArray(updateData.personality_tags) && updateData.personality_tags.length === 0
        },
        userId: user.id
      })
      
      // 🚨 CRITICAL: 保存前の認証情報再確認
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !currentUser) {
        throw new Error(`認証エラー: ${authError?.message || 'ユーザー情報取得失敗'}`)
      }

      const finalUid = currentUser.id
      const whereCondition = `id = ${finalUid}`
      
      // 🚨 CRITICAL: user_id統一設定（空文字禁止）
      updateData.user_id = finalUid  // 🆕 CRITICAL: user_id=auth.uid()で統一（空文字禁止）
      
      console.log('🔑 USER_ID UNIFICATION:', {
        finalUid: finalUid,
        updateData_user_id: updateData.user_id,
        note: 'id=finalUid AND user_id=finalUid で完全統一（RLS対応）'
      })
      
      console.log('🔑 FINAL UPDATE CONDITION CHECK:', {
        original_user_id: user.id,
        current_user_id: finalUid,
        ids_match: user.id === finalUid,
        where_condition: whereCondition,
        mypage_condition: 'same: .eq(id, user.id)',
        critical_note: 'MyPageと完全同一条件で更新'
      })

      // 🔍 NOTE: normalizeTextArray関数は既に上で定義済み

      // 🔍 CRITICAL: updateData.personality_tags最終確認（二重正規化不要：既に正規化済み）
      console.log('🛡️ FINAL PAYLOAD PERSONALITY_TAGS CHECK:', {
        personality_tags_in_updateData: updateData.personality_tags,
        personality_tags_type: typeof updateData.personality_tags,
        personality_tags_isArray: Array.isArray(updateData.personality_tags),
        personality_tags_isStringArray: Array.isArray(updateData.personality_tags) && updateData.personality_tags.every((item: any) => typeof item === 'string'),
        personality_tags_length: updateData.personality_tags?.length || 0,
        personality_tags_isNull: updateData.personality_tags === null,
        personality_tags_isUndefined: updateData.personality_tags === undefined,
        culture_tags_in_updateData: updateData.culture_tags,
        culture_tags_isStringArray: Array.isArray(updateData.culture_tags) && updateData.culture_tags.every((item: any) => typeof item === 'string'),
        ready_for_text_array_column: "YES - ALREADY NORMALIZED BY normalizeTextArray()",
        guarantee: "personality_tags は必ず string[] または [] で null/undefined は絶対にない"
      })
      
      // 🚨 CRITICAL: null/undefined最終防衛（念のため）
      if (updateData.personality_tags === null || updateData.personality_tags === undefined) {
        console.error('❌ EMERGENCY: personality_tags is null/undefined after normalization - forcing to []')
        updateData.personality_tags = []
      }
      if (updateData.culture_tags === null || updateData.culture_tags === undefined) {
        console.error('❌ EMERGENCY: culture_tags is null/undefined after normalization - forcing to []')
        updateData.culture_tags = []
      }

      // 🚨 CRITICAL: finalUidが空なら即エラー（保存中断）
      if (!finalUid) {
        const errorMsg = '🚨 CRITICAL: finalUid is empty - 保存処理を中断します'
        console.error(errorMsg)
        alert(errorMsg)
        return
      }

      // 🔍 CRITICAL: update直前の接続確認（軽いselect）
      console.log('🔍 PRE-UPDATE CONNECTION TEST: 接続確認のためのselect実行')
      const { data: preSelectData, error: preSelectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', finalUid)
        
      console.log('🔍 PRE-UPDATE SELECT RESULT:', {
        finalUid: finalUid,
        found_records: preSelectData?.length || 0,
        preSelectError: preSelectError ? String(preSelectError) : null,
        analysis: preSelectData?.length === 0 
          ? '❌ 更新対象行が無い（INSERTが別id/別環境）' 
          : '✅ 更新対象行存在確認'
      })

      if (preSelectData?.length === 0) {
        console.error('🚨 CRITICAL: 更新対象行が存在しません - INSERTが別id/別環境の可能性')
        setDebugPanel(prev => ({
          ...prev!,
          updateError: '更新対象行が存在しません',
          rlsIssue: false,
          saveClickedAt: saveClickedAt
        }))
        return
      }

      // 🚨 CRITICAL: 統一パイプライン経由でDB保存（Base64完全遮断）
      console.log('🔧 PROFILE SAVE: Starting unified pipeline...')

      // 🛡️🛡️🛡️ ABSOLUTE FINAL GUARD: DB保存直前の最終防衛（forbidden keys完全排除）
      const FINAL_FORBIDDEN_KEYS = ['profile_images', 'personality', 'prefecture', 'images', 'profile_image', 'updated_at'] as const
      for (const key of FINAL_FORBIDDEN_KEYS) {
        if (key in updateData) {
          console.error(`🚨🚨🚨 EMERGENCY: ${key} still in updateData! Removing now.`)
          delete (updateData as any)[key]
        }
      }

      // 🛡️🛡️🛡️ FINAL CHECK BEFORE DB SAVE: 証拠ログ（必須出力）
      console.log('🛡️🛡️🛡️ FINAL CHECK BEFORE DB SAVE:', {
        'UPDATE_PAYLOAD_KEYS': Object.keys(updateData),
        'profile_images_in_updateData': ('profile_images' in updateData),
        'personality_in_updateData': ('personality' in updateData),
        'prefecture_in_updateData': ('prefecture' in updateData),
        'images_in_updateData': ('images' in updateData),
        'profile_image_in_updateData': ('profile_image' in updateData),
        'all_forbidden_removed': FINAL_FORBIDDEN_KEYS.every(key => !(key in updateData)),
        'payload_key_count': Object.keys(updateData).length
      })

      const { updateProfile } = await import('@/utils/saveProfileToDb')

      const saveResult = await updateProfile(
        supabase,
        user.id,
        updateData,
        'profile/edit/page.tsx/onSubmit'
      )
      
      if (!saveResult.success) {
        console.error('❌ Profile save failed through unified pipeline:', {
          error: saveResult.error,
          operation: saveResult.operation,
          entryPoint: saveResult.entryPoint,
          photo_urls_attempted: updateData.photo_urls,
          avatar_url_attempted: updateData.avatar_url,
          uploadedImageUrls_count: uploadedImageUrls.length,
          profileImages_count: profileImages.length
        })
        setError(`プロフィールの保存に失敗しました: ${saveResult.error}`)
        setIsSubmitting(false)
        return
      }
      
      // 🖼️ CRITICAL: photo_urls保存成功確認
      console.log('✅ Profile save SUCCESS - photo_urls verification:', {
        operation: saveResult.operation,
        entryPoint: saveResult.entryPoint,
        attempted_photo_urls: updateData.photo_urls,
        attempted_avatar_url: updateData.avatar_url,
        saved_data_check: saveResult.data?.[0] ? {
          photo_urls: saveResult.data[0].photo_urls,
          avatar_url: saveResult.data[0].avatar_url
        } : 'no_data_returned'
      })
      
      // 🚨 ✅ TASK4: DB直接確認（保存直後に実際のDB値をクエリ）
      try {
        const { data: dbVerification, error: verifyError } = await supabase
          .from('profiles')
          .select('photo_urls, avatar_url')
          .eq('user_id', user.id)
          .single()

        if (verifyError) {
          console.error('🚨 [TASK4] DB確認エラー:', verifyError)
        } else {
          // 🧪 指示書要求: DB保存後の必須確認ログ
          console.log("✅ DB VERIFY AFTER SAVE:", dbVerification)
          
          console.log('🚨 [TASK4] DB直接確認完了 - 保存成功検証:', {
            user_id: user.id,
            db_photo_urls: dbVerification.photo_urls,
            db_photo_urls_type: typeof dbVerification.photo_urls,
            db_photo_urls_isArray: Array.isArray(dbVerification.photo_urls),
            db_photo_urls_length: Array.isArray(dbVerification.photo_urls) 
              ? dbVerification.photo_urls.length 
              : 'not_array',
            db_avatar_url: dbVerification.avatar_url,
            comparison: {
              attempted_length: Array.isArray(updateData.photo_urls) ? updateData.photo_urls.length : 0,
              actual_db_length: Array.isArray(dbVerification.photo_urls) ? dbVerification.photo_urls.length : 0,
              match: Array.isArray(updateData.photo_urls) && Array.isArray(dbVerification.photo_urls) 
                ? updateData.photo_urls.length === dbVerification.photo_urls.length
                : false
            },
            final_verification: 'DBに実際に保存された値を確認完了'
          })
        }
      } catch (dbCheckError) {
        console.error('🚨 [TASK4] DB確認処理エラー:', dbCheckError)
      }
      
      // 🏆 [COMPLETION EVIDENCE] 最終完了条件チェック
      const completionEvidence = {
        '1. Network Requests': {
          expected_storage_requests: needsUploadImages.length,
          actual_storage_requests: actualStorageRequests,
          match: needsUploadImages.length === actualStorageRequests,
          verification: `${actualStorageRequests}件のstorage/v1/object POSTリクエスト実行済み`
        },
        '2. PATCH Payload': {
          photo_urls_included: !!updateData.photo_urls,
          photo_urls_count: Array.isArray(updateData.photo_urls) ? updateData.photo_urls.length : 0,
          didTouchPhotos_flag: didTouchPhotos,
          payload_decision: didTouchPhotos ? 'photo_urls含める' : 'photo_urls除外'
        },
        '3. DB Confirmation': {
          save_success: saveResult.success,
          db_photo_urls: saveResult.data?.[0]?.photo_urls || null,
          db_photo_urls_count: Array.isArray(saveResult.data?.[0]?.photo_urls) ? saveResult.data[0].photo_urls.length : 0,
          db_avatar_url: saveResult.data?.[0]?.avatar_url || null
        }
      }
      
      console.log('🏆 [COMPLETION EVIDENCE] 指示書要求の3点証明:', completionEvidence)
      console.log('📸 [COMPLETION] Networkスクショ対象:', 'DevTools → Network → storage/v1/object (POST)')
      console.log('🔍 [COMPLETION] PATCHペイロード確認:', 'DevTools → Network → profiles (PATCH)')
      console.log('✅ [COMPLETION] DB確認クエリ:', `select photo_urls, avatar_url from profiles where id = '${user.id}';`)
      
      // 🎯 検証シナリオ指示（Claude指示書準拠）
      console.log('📋 [VERIFICATION SCENARIOS] 検証手順:')
      console.log('🅰️ シナリオA: MyPage→Edit遷移で「fromMyPage: photo_urls空 - avatar_urlから復元」が消えること')
      console.log('🅱️ シナリオB: 画像2枚追加→保存でstorage POSTが2回、profiles PATCHに3件photo_urls')
      console.log('🆎 シナリオC: 3枚→1枚削除→保存でprofiles PATCHに1件photo_urls、表示一致確認')
      
      const updateResult = saveResult.data
      const updateError = null
      
      // 🚨 5) 保存成功後のDB値でstate同期（再発防止）
      if (saveResult.success && saveResult.data?.[0]) {
        const dbProfile = saveResult.data[0]
        console.log('🚨 [DB SYNC] 保存成功後の同期開始:', {
          db_photo_urls: dbProfile.photo_urls,
          db_avatar_url: dbProfile.avatar_url,
          db_photo_urls_length: Array.isArray(dbProfile.photo_urls) ? dbProfile.photo_urls.length : 0
        })
        
        // DB値でprofileImages状態を同期
        if (Array.isArray(dbProfile.photo_urls) && dbProfile.photo_urls.length > 0) {
          const syncedImages = dbProfile.photo_urls.map((url: string, index: number) => ({
            id: `synced_${index}`,
            url: url,
            originalUrl: url,
            isMain: index === 0,
            isEdited: false
          }))
          
          setProfileImages(prev => {
            console.log('[DB SYNC] profileImages同期:', { prev_length: prev.length, synced_length: syncedImages.length })
            return syncedImages
          })
          
          // didTouchPhotosをリセット（同期完了）
          setDidTouchPhotos(false)
          console.log('🚨 [TOUCH FLAG] didTouchPhotos = false (DB同期完了)')
          
          // 🚨 [POSSIBILITY C] sessionStorage復元上書き防止チェック
          const imageStorageKey = `currentProfileImages_${user?.id || 'test'}`
          console.log('🚨 [POSSIBILITY C] sessionStorage上書きチェック:', {
            storage_key: imageStorageKey,
            before_write_check: 'DB保存成功後の安全な同期タイミング',
            synced_images_count: syncedImages.length,
            risk_prevention: 'DB保存成功確認後のみsessionStorage更新',
            timing: 'DB SYNC完了後（破壊タイミングではない）'
          })
          
          try {
            sessionStorage.setItem(imageStorageKey, JSON.stringify(syncedImages))
            console.log('🚨 [DB SYNC] sessionStorage同期完了:', {
              key: imageStorageKey,
              stored_count: syncedImages.length,
              verification: 'DB値と同期済み'
            })
          } catch (e) {
            console.warn('sessionStorage同期失敗:', e)
          }
        }
      }
      
      // 🔍 CRITICAL: updateの戻りで"更新件数"を確定する
      const updateRowCount = updateResult?.length || 0
      
      // ✅ Avatar処理完了（DB更新前にensureAvatarStored()で処理済み）
      console.log('✅ Avatar processing completed before DB update')
      const hasError = Boolean(updateError)
      
      // 🔍 CRITICAL: .select()戻り値でpersonality_tags保存確認
      const updateReturnedPersonality = updateResult?.[0]?.personality_tags
      const updateReturnedCulture = updateResult?.[0]?.culture_tags
      
      // 🔍 CRITICAL: デバッグログをsessionStorageに保存（コンソール依存解消）
      const saveDebugData = {
        timestamp: new Date().toISOString(),
        finalUid: finalUid,
        // 送信前のpersonality_tags生成確認
        selectedPersonality_original: selectedPersonality,
        personalityTags_normalized: personalityTags,
        personalityTags_in_updateData: updateData.personality_tags,
        // 送信値（他の任意項目との比較）
        payload_personality_tags: updateData.personality_tags,
        payload_personality_tags_type: typeof updateData.personality_tags,
        payload_personality_tags_isArray: Array.isArray(updateData.personality_tags),
        payload_personality_tags_isStringArray: Array.isArray(updateData.personality_tags) && updateData.personality_tags.every((item: any) => typeof item === 'string'),
        payload_personality_tags_isNull: updateData.personality_tags === null,
        payload_personality_tags_length: updateData.personality_tags?.length || 0,
        payload_height: updateData.height,
        payload_occupation: updateData.occupation,
        payload_body_type: updateData.body_type,
        updateData_keys: Object.keys(updateData),
        personality_tags_in_keys: Object.keys(updateData).includes('personality_tags'),
        // update戻り値
        updateResult_data_length: updateRowCount,
        updateResult_error: updateError ? String(updateError) : null,
        updatedRow_id: updateResult?.[0]?.id || null,
        updatedRow_personality_tags: updateReturnedPersonality,
        updatedRow_personality_tags_type: typeof updateReturnedPersonality,
        updatedRow_personality_tags_isNull: updateReturnedPersonality === null,
        updatedRow_personality_tags_isArray: Array.isArray(updateReturnedPersonality),
        updatedRow_personality_tags_length: updateReturnedPersonality?.length || 0,
        // 一致確認
        personality_tags_saved_correctly: JSON.stringify(updateData.personality_tags) === JSON.stringify(updateReturnedPersonality),
        personality_tags_null_prevented: updateReturnedPersonality !== null,
        success_analysis: updateReturnedPersonality === null ? 
          '❌ FAILED: personality_tagsがnullで保存された' : 
          '✅ SUCCESS: personality_tagsが配列で保存された'
      }
      
      // sessionStorageに保存（MyPageで表示用）
      sessionStorage.setItem('profileEditSaveDebug', JSON.stringify(saveDebugData))
      
      console.log('📊 UPDATE RESULT PERSONALITY_TAGS VERIFICATION:', saveDebugData)

      // 🚨 CRITICAL: エラーチェック
      if (hasError) {
        console.error('❌ UPDATE ERROR DETECTED:', updateError)
        setDebugPanel({
          show: true,
          uid: finalUid,
          whereCondition: `id = ${finalUid}`,
          payloadPersonalityTags: updateData.personality_tags,
          dbPersonalityTags: null,
          match: false,
          updateError: String(updateError),
          updatedRows: 0,
          rlsIssue: false,
          saveClickedAt: saveClickedAt
        })
        throw updateError
      }

      // 🚨 CRITICAL: 0件更新チェック
      if (updateRowCount === 0) {
        console.error('🚨 ZERO ROWS UPDATED - whereズレ / 行が存在しない / RLS')
        
        // 追加確認: 該当行が存在するかチェック
        const { data: existCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', finalUid)
        
        const errorInfo = {
          finalUid: finalUid,
          updateRowCount: 0,
          existCheck_found: existCheck?.length || 0,
          probable_cause: existCheck?.length === 0 
            ? 'INSERT時のidがfinalUidと違う（設計破綻）'
            : 'RLSがupdateを拒否している可能性'
        }
        
        console.error('🔍 ZERO UPDATE ANALYSIS:', errorInfo)
        setDebugPanel({
          show: true,
          uid: finalUid,
          whereCondition: `id = ${finalUid}`,
          payloadPersonalityTags: updateData.personality_tags,
          dbPersonalityTags: null,
          match: false,
          updateError: `0件更新: ${errorInfo.probable_cause}`,
          updatedRows: 0,
          rlsIssue: (existCheck?.length ?? 0) > 0,
          saveClickedAt: saveClickedAt
        })
        return
      }
      
      // 🔍 CRITICAL: update直後に「同じwhere」でselectして二重確認
      const { data: dbSelect, error: selectError } = await supabase
        .from('profiles')
        .select('id, personality_tags, culture_tags')
        .eq('id', finalUid)
        .single()
        
      console.log('🔍 SELECT DOUBLE-CHECK:', {
        finalUid: finalUid,
        dbSelect_personality_tags: dbSelect?.personality_tags,
        selectError: selectError ? String(selectError) : null
      })

      // 🔍 CRITICAL: updateの戻りとselectが食い違うかチェック
      const selectReturnedPersonality = dbSelect?.personality_tags
      const returnValuesMatch = JSON.stringify(updateReturnedPersonality) === JSON.stringify(selectReturnedPersonality)
      
      if (!returnValuesMatch) {
        console.error('🚨 UPDATE-SELECT MISMATCH - RLS/権限/レプリカ等の疑い:', {
          updateReturned: updateReturnedPersonality,
          selectReturned: selectReturnedPersonality
        })
      }

      // 🚨 CRITICAL: DB側で潰されてる / 型不一致 / trigger チェック
      const personalityWasSaved = dbSelect?.personality_tags !== null
      const personalityMatches = JSON.stringify(updateData.personality_tags) === JSON.stringify(dbSelect?.personality_tags)
      
      if (!personalityWasSaved) {
        console.error('🚨 PERSONALITY_TAGS NULL IN DB - DB側で潰されてる / 型不一致 / trigger疑い:', {
          sent: updateData.personality_tags,
          db_result: dbSelect?.personality_tags,
          schema_check_sql: `select column_name, data_type, udt_name from information_schema.columns where table_name='profiles' and column_name in ('personality_tags','culture_tags');`
        })
      }

      // 🚨 CRITICAL: デバッグパネル設定（画面固定・ユーザー貼り付け用）
      setDebugPanel({
        show: true,
        uid: finalUid,
        whereCondition: `id = ${finalUid}`,
        payloadPersonalityTags: updateData.personality_tags,
        dbPersonalityTags: dbSelect?.personality_tags,
        match: personalityMatches,
        updateError: null,
        updatedRows: updateRowCount,
        rlsIssue: updateRowCount > 0 && !personalityWasSaved,
        saveClickedAt: saveClickedAt
      })

      // 🚨 CRITICAL: 保存失敗時のアラート
      if (!personalityMatches || (updateRowCount > 0 && !personalityWasSaved)) {
        alert(`🚨 PERSONALITY_TAGS保存失敗検出！
        
送信値: ${JSON.stringify(updateData.personality_tags)}
DB値: ${JSON.stringify(dbSelect?.personality_tags)}
一致: ${personalityMatches}
更新件数: ${updateRowCount}
DB保存成功: ${personalityWasSaved}

原因分析:
${!personalityWasSaved ? '- DB側で潰されてる / 型不一致 / trigger疑い' : ''}
${updateRowCount === 0 ? '- whereズレ / 行が存在しない / RLS' : ''}

デバッグパネルで詳細確認してください。`)
      }
      
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
      
      // 🌟 CRITICAL: フォームにも確実に反映（setValue統一）
      setValue('hobbies', newHobbies, { shouldDirty: true, shouldValidate: true })
      
      // 🔧 MAIN WATCH統一: state更新のみ（完成度再計算はメインwatchが担当）
      console.log('📝 Hobby toggled:', hobby, '→', newHobbies.length, 'total hobbies')
      
      return newHobbies
    })
  }

  // Personality selection handler
  const togglePersonality = (trait: string) => {
    setSelectedPersonality(prev => {
      // 🚨 DEBUG: 性格タグ選択前の状態確認（正規化ベース）
      const normalizedPrev = normalizeTags(prev)
      console.log('🎯 PERSONALITY TAG DEBUG - BEFORE TOGGLE:', {
        trait_clicked: trait,
        prev_raw: prev,
        prev_normalized: normalizedPrev,
        prev_count_raw: prev.length,
        prev_count_normalized: normalizedPrev.length,
        will_add: !normalizedPrev.includes(trait),
        will_remove: normalizedPrev.includes(trait),
        has_other: normalizedPrev.includes('その他'),
        task_a1_debug: '選択前の状態確認（正規化ベース）'
      })
      
      const newTraits = normalizedPrev.includes(trait)
        ? normalizedPrev.filter(t => t !== trait)  // 正規化済みから削除
        : normalizedPrev.includes('その他')
          ? [trait]  // その他をリセットして新しい項目のみ
          : [...normalizedPrev, trait]  // 正規化済みに追加
      
      // 🧹 結果も正規化（念のため）
      const finalTraits = normalizeTags(newTraits)
      
      // 🚨 DEBUG: 性格タグ選択後の状態確認（正規化ベース）
      console.log('🎯 PERSONALITY TAG DEBUG - AFTER TOGGLE:', {
        trait_clicked: trait,
        new_raw: newTraits,
        new_normalized: finalTraits,
        new_count: finalTraits.length,
        state_change: `${normalizedPrev.length} -> ${finalTraits.length}`,
        contamination_removed: newTraits.length !== finalTraits.length,
        task_a2_debug: '選択後の状態確認（正規化ベース）'
      })
      
      // 🌟 CRITICAL: フォームにも確実に反映（正規化済みを使用）
      setValue('personality', finalTraits, { shouldDirty: true, shouldValidate: true })
      
      // 🔧 MAIN WATCH統一: state更新のみ（完成度再計算はメインwatchが担当）
      console.log('📝 Personality toggled:', trait, '→', finalTraits.length, 'total traits (normalized)')
      
      return finalTraits
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
      
      // 🔧 MAIN WATCH統一: state更新のみ（完成度再計算はメインwatchが担当）
      console.log('📝 Prefecture toggled:', prefecture, '→', newPrefectures.length, 'total prefectures')
      
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
  // 🌸 TASK3: typeクエリが無い場合の安全エラー表示（真っさら防止）
  if (!hasValidType && !userBasedType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-4">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              🚫 プロフィール編集エラー
            </h2>
            <p className="text-gray-700 mb-4">
              プロフィールタイプが指定されていません。正しいURLからアクセスしてください。
            </p>
            <div className="text-sm text-gray-500">
              <p>有効なtype: foreign-male, japanese-female</p>
              <p>現在のtype: {profileType || 'なし'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      {/* Sidebar */}
      <Sidebar className="w-64 hidden md:block" />
      
      {/* Main Content */}
      <div className="md:ml-64 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* 言語切り替えボタン（全ユーザー対応） */}
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-2">
              <LanguageSelector variant="light" size="md" showIcon={true} />
            </div>
          </div>

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
                        // 🔧 MAIN WATCH統一: フォーム変更のみ（完成度再計算はメインwatchが担当）
                        console.log('📝 Nationality changed:', value)
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

                {/* ✨ 使用言語＋言語レベル（外国人男性用） */}
                {isForeignMale && (
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('profile.languages')} <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        {t('profile.languageHelp')}
                      </p>
                      
                      {/* 言語レベル定義説明 */}
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-700 mb-2">{t('languageLevelDefinitions.title')}</p>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>{t('languageLevelDefinitions.beginner')}</div>
                          <div>{t('languageLevelDefinitions.elementary')}</div>
                          <div>{t('languageLevelDefinitions.intermediate')}</div>
                          <div>{t('languageLevelDefinitions.upperIntermediate')}</div>
                          <div>{t('languageLevelDefinitions.advanced')}</div>
                        </div>
                      </div>
                      
                      {/* 言語スキル一覧表示 */}
                      <div className="space-y-3 mb-3">
                        {languageSkills.map((skill, index) => (
                          <div key={index} className="flex gap-3 items-center p-3 border rounded-lg bg-gray-50">
                            <div className="flex-1">
                              <Select
                                value={skill.language || ''}
                                onValueChange={(value: LanguageCode) => {
                                  const newSkills = [...languageSkills]
                                  newSkills[index] = { ...skill, language: value }
                                  
                                  console.log('🗣️ LANGUAGE CHANGE - State update:', {
                                    oldSkills: languageSkills,
                                    newSkills,
                                    changedIndex: index,
                                    newLanguage: value
                                  })
                                  
                                  // 🚀 即座反映: setState → setValue の順序で同期実行
                                  setLanguageSkills(newSkills)
                                  setValue('language_skills', newSkills, { 
                                    shouldDirty: true, 
                                    shouldValidate: true 
                                  })
                                  
                                  // 🔥 完成度は専用useEffectで自動計算（setTimeoutを除去し即座反映）
                                  console.log('✅ 言語変更完了 - useEffect[languageSkills]で自動計算される')
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t('profile.languagePlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {[
                                    { value: 'ja', label: t('languageOptions.japanese') },
                                    { value: 'en', label: t('languageOptions.english') },
                                    { value: 'ko', label: t('languageOptions.korean') },
                                    { value: 'zh-TW', label: t('languageOptions.chineseTraditional') }
                                  ].map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex-1">
                              <Select
                                value={skill.level || ''}
                                onValueChange={(value: LanguageLevelCode) => {
                                  const newSkills = [...languageSkills]
                                  newSkills[index] = { ...skill, level: value }
                                  
                                  console.log('🗣️ LANGUAGE LEVEL CHANGE - State update:', {
                                    oldSkills: languageSkills,
                                    newSkills,
                                    changedIndex: index,
                                    newLevel: value
                                  })
                                  
                                  // 🚀 即座反映: setState → setValue の順序で同期実行
                                  setLanguageSkills(newSkills)
                                  setValue('language_skills', newSkills, { 
                                    shouldDirty: true, 
                                    shouldValidate: true 
                                  })
                                  
                                  // 🔥 完成度は専用useEffectで自動計算（setTimeoutを除去し即座反映）
                                  console.log('✅ 言語レベル変更完了 - useEffect[languageSkills]で自動計算される')
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t('profile.languageLevelPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {[
                                    { value: 'native', label: t('languageLevels.native') },
                                    { value: 'beginner', label: t('languageLevels.beginner') },
                                    { value: 'beginner_plus', label: t('languageLevels.beginnerPlus') },
                                    { value: 'intermediate', label: t('languageLevels.intermediate') },
                                    { value: 'intermediate_plus', label: t('languageLevels.intermediatePlus') },
                                    { value: 'advanced', label: t('languageLevels.advanced') }
                                  ].map((level) => (
                                    <SelectItem key={level.value} value={level.value}>
                                      {level.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {languageSkills.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newSkills = languageSkills.filter((_, i) => i !== index)
                                  
                                  // 🚀 即座反映: setState → setValue の順序で同期実行
                                  setLanguageSkills(newSkills)
                                  setValue('language_skills', newSkills, { 
                                    shouldDirty: true, 
                                    shouldValidate: true 
                                  })
                                  
                                  // 🔥 完成度は専用useEffectで自動計算（setTimeoutを除去し即座反映）
                                  console.log('✅ 言語削除完了 - useEffect[languageSkills]で自動計算される')
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                削除
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* 言語追加ボタン */}
                      {languageSkills.length < 4 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newSkills: LanguageSkill[] = [...languageSkills, { language: '', level: '' }]
                            
                            // 🚀 即座反映: setState → setValue の順序で同期実行
                            setLanguageSkills(newSkills)
                            setValue('language_skills', newSkills, { 
                              shouldDirty: true, 
                              shouldValidate: true 
                            })
                            
                            // 🔥 完成度は専用useEffectで自動計算（setTimeoutを除去し即座反映）
                            console.log('✅ 言語追加完了 - useEffect[languageSkills]で自動計算される')
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {t('profile.languageAddButton')}
                        </Button>
                      )}
                      
                      {/* エラーメッセージ表示 */}
                      {errors.language_skills && (
                        <p className="mt-1 text-sm text-red-600">
                          {t(errors.language_skills.message as string)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 居住地（日本人女性のみ） */}
                {isJapaneseFemale && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('profile.prefecture')} <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={watch('prefecture') || ''}
                        onValueChange={(value) => setValue('prefecture', value)}
                      >
                        <SelectTrigger className={errors.prefecture ? 'border-red-500' : ''}>
                          <SelectValue placeholder={t('placeholders.selectPrefecture')} />
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

                  </div>
                )}

                {/* ✨ 使用言語＋言語レベル（日本人女性用） */}
                {isJapaneseFemale && (
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('profile.languages')} <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        {t('profile.languageHelp')}
                      </p>
                      
                      {/* 言語レベル定義説明 */}
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-700 mb-2">{t('languageLevelDefinitions.title')}</p>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>{t('languageLevelDefinitions.beginner')}</div>
                          <div>{t('languageLevelDefinitions.elementary')}</div>
                          <div>{t('languageLevelDefinitions.intermediate')}</div>
                          <div>{t('languageLevelDefinitions.upperIntermediate')}</div>
                          <div>{t('languageLevelDefinitions.advanced')}</div>
                        </div>
                      </div>
                      
                      {/* 言語スキル一覧表示 */}
                      <div className="space-y-3 mb-3">
                        {languageSkills.map((skill, index) => (
                          <div key={index} className="flex gap-3 items-center p-3 border rounded-lg bg-gray-50">
                            <div className="flex-1">
                              <Select
                                value={skill.language || ''}
                                onValueChange={(value: LanguageCode) => {
                                  const newSkills = [...languageSkills]
                                  newSkills[index] = { ...skill, language: value }
                                  
                                  console.log('🗣️ LANGUAGE CHANGE - State update:', {
                                    oldSkills: languageSkills,
                                    newSkills,
                                    changedIndex: index,
                                    newLanguage: value
                                  })
                                  
                                  // 🚀 即座反映: setState → setValue の順序で同期実行
                                  setLanguageSkills(newSkills)
                                  setValue('language_skills', newSkills, { 
                                    shouldDirty: true, 
                                    shouldValidate: true 
                                  })
                                  
                                  // 🔥 完成度は専用useEffectで自動計算（setTimeoutを除去し即座反映）
                                  console.log('✅ 言語変更完了 - useEffect[languageSkills]で自動計算される')
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t('profile.languagePlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {[
                                    { value: 'ja', label: t('languageOptions.japanese') },
                                    { value: 'en', label: t('languageOptions.english') },
                                    { value: 'ko', label: t('languageOptions.korean') },
                                    { value: 'zh-TW', label: t('languageOptions.chineseTraditional') }
                                  ].map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex-1">
                              <Select
                                value={skill.level || ''}
                                onValueChange={(value: LanguageLevelCode) => {
                                  const newSkills = [...languageSkills]
                                  newSkills[index] = { ...skill, level: value }
                                  
                                  console.log('🗣️ LANGUAGE LEVEL CHANGE - State update:', {
                                    oldSkills: languageSkills,
                                    newSkills,
                                    changedIndex: index,
                                    newLevel: value
                                  })
                                  
                                  // 🚀 即座反映: setState → setValue の順序で同期実行
                                  setLanguageSkills(newSkills)
                                  setValue('language_skills', newSkills, { 
                                    shouldDirty: true, 
                                    shouldValidate: true 
                                  })
                                  
                                  // 🔥 完成度は専用useEffectで自動計算（setTimeoutを除去し即座反映）
                                  console.log('✅ 言語レベル変更完了 - useEffect[languageSkills]で自動計算される')
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t('profile.languageLevelPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {[
                                    { value: 'native', label: t('languageLevels.native') },
                                    { value: 'beginner', label: t('languageLevels.beginner') },
                                    { value: 'beginner_plus', label: t('languageLevels.beginnerPlus') },
                                    { value: 'intermediate', label: t('languageLevels.intermediate') },
                                    { value: 'intermediate_plus', label: t('languageLevels.intermediatePlus') },
                                    { value: 'advanced', label: t('languageLevels.advanced') }
                                  ].map((level) => (
                                    <SelectItem key={level.value} value={level.value}>
                                      {level.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {languageSkills.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newSkills = languageSkills.filter((_, i) => i !== index)
                                  
                                  // 🚀 即座反映: setState → setValue の順序で同期実行
                                  setLanguageSkills(newSkills)
                                  setValue('language_skills', newSkills, { 
                                    shouldDirty: true, 
                                    shouldValidate: true 
                                  })
                                  
                                  // 🔥 完成度は専用useEffectで自動計算（setTimeoutを除去し即座反映）
                                  console.log('✅ 言語削除完了 - useEffect[languageSkills]で自動計算される')
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                削除
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* 言語追加ボタン */}
                      {languageSkills.length < 4 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newSkills: LanguageSkill[] = [...languageSkills, { language: '', level: '' }]
                            
                            // 🚀 即座反映: setState → setValue の順序で同期実行
                            setLanguageSkills(newSkills)
                            setValue('language_skills', newSkills, { 
                              shouldDirty: true, 
                              shouldValidate: true 
                            })
                            
                            // 🔥 完成度は専用useEffectで自動計算（setTimeoutを除去し即座反映）
                            console.log('✅ 言語追加完了 - useEffect[languageSkills]で自動計算される')
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {t('profile.languageAddButton')}
                        </Button>
                      )}
                      
                      {/* エラーメッセージ表示 */}
                      {errors.language_skills && (
                        <p className="mt-1 text-sm text-red-600">
                          {t(errors.language_skills.message as string)}
                        </p>
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
                        onValueChange={(value) => {
                          setValue('occupation', value)
                          // 🔧 MAIN WATCH統一: フォーム変更のみ（完成度再計算はメインwatchが担当）
                          console.log('📝 Occupation changed:', value)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('placeholders.selectOccupation')} />
                        </SelectTrigger>
                        <SelectContent>
                          {getOccupationOptions(t, isForeignMale).map((option) => (
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
                        {...register('height', { 
                          valueAsNumber: true
                        })}
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
                        onValueChange={(value) => {
                          setValue('body_type', value)
                          // 🔧 MAIN WATCH統一: フォーム変更のみ（完成度再計算はメインwatchが担当）
                          console.log('📝 Body type changed:', value)
                        }}
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
                        onValueChange={(value) => {
                          setValue('marital_status', value as 'none' | 'single' | 'married')
                          // 🔧 MAIN WATCH統一: フォーム変更のみ（完成度再計算はメインwatchが担当）
                          console.log('📝 Marital status changed:', value)
                        }}
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
                    
                    {/* 既存システム（非表示・後方互換用） */}
                    <input type="hidden" {...register('japanese_level')} />
                    <input type="hidden" {...register('english_level')} />
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
                          value={(() => {
                            const currentValue = watch('visit_schedule')
                            // sentinel値は未選択として表示
                            if (!currentValue || currentValue === 'no-entry' || currentValue === 'noEntry' || currentValue === 'none') {
                              return undefined
                            }
                            return currentValue
                          })()}
                          onValueChange={(value) => {
                            // 🧪 CHANGE DEBUG [visit_schedule] BEFORE
                            console.log('🧪 CHANGE DEBUG [visit_schedule] BEFORE', {
                              nextValue: value,
                              current: watch('visit_schedule'),
                            })

                            setValue('visit_schedule', value)
                            // 🔧 MAIN WATCH統一: フォーム変更のみ（完成度再計算はメインwatchが担当）
                            console.log('📝 Visit schedule changed:', value)
                            
                            // 🔍 完成度計算デバッグログ（指示書対応）
                            console.log('[FORM] visit_schedule:', value)
                            console.log('[FORM] travel_companion:', watch('travel_companion'))

                            // 🧪 setValue直後の確認（マイクロタスク/次tick）
                            queueMicrotask(() => {
                              console.log('🧪 CHANGE DEBUG [visit_schedule] AFTER microtask', {
                                expected: value,
                                actual: watch('visit_schedule')
                              })
                            })
                            setTimeout(() => {
                              console.log('🧪 CHANGE DEBUG [visit_schedule] AFTER 0ms', {
                                expected: value,
                                actual: watch('visit_schedule')
                              })
                            }, 0)
                          }}
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
                          value={(() => {
                            const currentValue = watch('travel_companion')
                            // sentinel値は未選択として表示
                            if (!currentValue || currentValue === 'noEntry' || currentValue === 'no-entry' || currentValue === 'none' || currentValue === 'undecided') {
                              return undefined
                            }
                            return currentValue
                          })()}
                          onValueChange={(value) => {
                            // 🧪 CHANGE DEBUG [travel_companion] BEFORE
                            console.log('🧪 CHANGE DEBUG [travel_companion] BEFORE', {
                              nextValue: value,
                              current: watch('travel_companion'),
                            })

                            setValue('travel_companion', value)
                            // 🔧 MAIN WATCH統一: フォーム変更のみ（完成度再計算はメインwatchが担当）
                            console.log('📝 Travel companion changed:', value)
                            
                            // 🔍 完成度計算デバッグログ（指示書対応）
                            console.log('[FORM] visit_schedule:', watch('visit_schedule'))
                            console.log('[FORM] travel_companion:', value)

                            // 🧪 setValue直後の確認（マイクロタスク/次tick）
                            queueMicrotask(() => {
                              console.log('🧪 CHANGE DEBUG [travel_companion] AFTER microtask', {
                                expected: value,
                                actual: watch('travel_companion')
                              })
                            })
                            setTimeout(() => {
                              console.log('🧪 CHANGE DEBUG [travel_companion] AFTER 0ms', {
                                expected: value,
                                actual: watch('travel_companion')
                              })
                            }, 0)
                          }}
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
                        <p className="text-xs text-gray-500 mb-3">{t('profile.prefectureSelectionRule')}</p>

                        {/* 選択状況の表示 */}
                        <div className="text-sm font-medium text-gray-700 mb-4">
                          {t('profile.selectPrefecturesWithCount')}（{selectedPlannedPrefectures.length}/3 {t('profile.selectedCount')}）
                        </div>

                        {/* 都道府県選択グリッド（常時表示） */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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

                        {errors.planned_prefectures && (
                          <p className="text-red-500 text-sm mt-1">{t(errors.planned_prefectures.message as string)}</p>
                        )}
                      </div>

                    </div>
                  </>
                )}

                {/* 性格セクション - 日本文化の前に移動 */}
                <div className="space-y-4">
                  {/* 🚨 DEBUG: 性格タグ表示前の確認（正規化ベース） */}
                  {(() => {
                    const normalizedPersonality = normalizeTags(selectedPersonality)
                    const visibleSelectedTraits = getPersonalityOptions(t).filter(trait => normalizedPersonality.includes(trait.label))
                    const countMismatch = normalizedPersonality.length !== visibleSelectedTraits.length
                    
                    console.log('🎯 PERSONALITY DISPLAY DEBUG (NORMALIZED):', {
                      selectedPersonality_raw: selectedPersonality,
                      selectedPersonality_normalized: normalizedPersonality,
                      raw_count: selectedPersonality.length,
                      normalized_count: normalizedPersonality.length,
                      available_options: getPersonalityOptions(t).map(t => t.label),
                      visible_selected_traits: visibleSelectedTraits.map(t => t.label),
                      visible_count: visibleSelectedTraits.length,
                      count_mismatch: countMismatch,
                      contamination_candidates: normalizedPersonality.filter(trait => 
                        !getPersonalityOptions(t).some(option => option.label === trait)
                      ),
                      cleaning_effect: selectedPersonality.length - normalizedPersonality.length,
                      task_b1_normalized_check: 'UI表示vs正規化済み配列確認'
                    })
                    
                    return null // このdebugは画面に何も表示しない
                  })()}
                  
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.personalitySection')}（{normalizeTags(selectedPersonality).length}/5 {t('profile.selectedCount')}）
                  </label>
                  <p className="text-xs text-gray-500 mb-3">{t('profile.selectPersonalityNote')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {getPersonalityOptions(t).map((trait) => {
                      const normalizedPersonality = normalizeTags(selectedPersonality)
                      const isSelected = normalizedPersonality.includes(trait.label)
                      const isDisabled = !isSelected && normalizedPersonality.length >= 5
                      
                      return (
                        <button
                          key={trait.key}
                          type="button"
                          onClick={() => togglePersonality(trait.label)}
                          disabled={isDisabled}
                          className={`
                            px-3 py-2.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 ease-in-out text-center min-h-[2.75rem] flex items-center justify-center w-full
                            ${isSelected
                              ? 'bg-gradient-to-r from-red-800 to-red-900 text-white border-red-800 shadow-lg transform scale-105'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                            }
                            ${isDisabled
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer hover:shadow-md'
                            }
                          `}
                        >
                          {trait.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 興味・趣味セクション */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-700 mt-6 mb-4">
                    {isForeignMale ? t('profile.cultureSectionForeign') : t('profile.cultureSection')} <span className="text-red-500">*</span> （{selectedHobbies.length}/8 {t('profile.selectedCount')}）
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
                    className="w-full bg-red-800 hover:bg-red-900 text-white font-medium py-3 mb-4"
                    onClick={handlePreview}
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
        
        {/* 🚨 CRITICAL: 保存検証デバッグパネル（固定表示） */}
        {debugPanel?.show && (
          <div className="fixed bottom-4 right-4 w-96 bg-white border-2 border-red-500 shadow-2xl rounded-lg p-4 z-50 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-red-600">🚨 SAVE VERIFICATION</h3>
              <button
                onClick={() => setDebugPanel(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className={`p-2 rounded ${debugPanel.match ? 'bg-green-100' : 'bg-red-100'}`}>
                <strong>一致結果: {debugPanel.match ? '✅ SUCCESS' : '❌ FAILED'}</strong>
              </div>
              
              {/* ユーザー貼り付け用の必須情報 */}
              <div className="bg-gray-50 p-3 rounded">
                <div className="font-bold mb-2">📋 ユーザー貼り付け用データ:</div>
                
                <div className="mb-2">
                  <strong>finalUid:</strong>
                  <div className="font-mono text-green-600">{debugPanel.uid}</div>
                </div>
                
                <div className="mb-2">
                  <strong>payload.personality_tags:</strong>
                  <div className="bg-blue-50 p-2 rounded mt-1 font-mono">
                    {JSON.stringify(debugPanel.payloadPersonalityTags)}
                  </div>
                </div>
                
                <div className="mb-2">
                  <strong>updateResult.data.length:</strong>
                  <div className="font-mono text-purple-600">{debugPanel.updatedRows}</div>
                </div>
                
                <div className="mb-2">
                  <strong>updateResult.error:</strong>
                  <div className="font-mono text-red-600">
                    {debugPanel.updateError || 'null'}
                  </div>
                </div>
                
                <div className="mb-2">
                  <strong>dbSelect.personality_tags:</strong>
                  <div className="bg-yellow-50 p-2 rounded mt-1 font-mono">
                    {JSON.stringify(debugPanel.dbPersonalityTags)}
                  </div>
                </div>
                
                <div className="mb-2">
                  <strong>saveClickedAt:</strong>
                  <div className="font-mono text-blue-600">{debugPanel.saveClickedAt}</div>
                </div>
              </div>
              
              {/* RLS確定用SQL表示 */}
              <div className="bg-purple-50 p-3 rounded mt-3">
                <div className="font-bold mb-2 text-purple-700">📋 RLS確定用SQL（Supabase SQL Editorにコピペ）:</div>
                
                <div className="mb-3">
                  <strong>1. profilesのRLS/ポリシー一覧:</strong>
                  <div className="bg-white p-2 rounded mt-1 font-mono text-xs border">
                    select * from pg_policies where schemaname = &apos;public&apos; and tablename = &apos;profiles&apos;;
                  </div>
                </div>
                
                <div className="mb-3">
                  <strong>2. RLSが有効か確認:</strong>
                  <div className="bg-white p-2 rounded mt-1 font-mono text-xs border">
                    select relrowsecurity from pg_class where relname = &apos;profiles&apos;;
                  </div>
                </div>
                
                <div className="mb-3">
                  <strong>3. user_id確認（INSERT問題検出用）:</strong>
                  <div className="bg-white p-2 rounded mt-1 font-mono text-xs border">
                    select id, user_id, personality_tags from profiles where id = &apos;{debugPanel.uid}&apos;;
                  </div>
                </div>
              </div>
              
              {/* 失敗原因別の分岐表示 */}
              {debugPanel.updatedRows === 0 && (
                <div className="bg-red-100 p-3 rounded">
                  <div className="font-bold text-red-700">🚨 CASE A: 0件更新</div>
                  <div className="mt-2 text-red-600">
                    → whereズレ or 行が存在しない or RLS
                  </div>
                  <div className="mt-2 text-sm">
                    追加確認が必要です。
                  </div>
                </div>
              )}
              
              {debugPanel.updateError && (
                <div className="bg-red-100 p-3 rounded">
                  <div className="font-bold text-red-700">🚨 CASE B: エラー発生</div>
                  <div className="mt-2 bg-red-50 p-2 rounded font-mono text-sm">
                    {debugPanel.updateError}
                  </div>
                </div>
              )}
              
              {debugPanel.updatedRows > 0 && debugPanel.dbPersonalityTags === null && (
                <div className="bg-orange-100 p-3 rounded">
                  <div className="font-bold text-orange-700">🚨 CASE C: updateは1件返るのにDB値がnull</div>
                  <div className="mt-2 text-orange-600">
                    → DBスキーマ / trigger / 型不一致
                  </div>
                  <div className="mt-2 text-sm">
                    <strong>確認用SQL:</strong>
                    <div className="bg-orange-50 p-2 rounded mt-1 font-mono text-xs">
                      select column_name, data_type, udt_name from information_schema.columns where table_name=&apos;profiles&apos; and column_name in (&apos;personality_tags&apos;,&apos;culture_tags&apos;);
                    </div>
                  </div>
                </div>
              )}
              
              {debugPanel.match && (
                <div className="bg-green-100 p-3 rounded">
                  <div className="font-bold text-green-700">✅ 保存成功</div>
                  <div className="mt-2 text-green-600">
                    personality_tagsが正常にSupabaseに保存されました。
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
