import type { SupportedLanguage } from '@/utils/language'

// プロフィールの「日本文化」のまとまりの文（4 言語）
// - culture_wish（自由記入）：編集画面の見出し・見本の文・エラー、プレビュー・相手のプロフィールの短い見出し
// - 日本文化のタグの見出し（編集・プレビュー・相手のプロフィールで共通）
// translations.ts（保護対象）とは別に持つ

export const CULTURE_WISH_MAX_LENGTH = 200

// 文字数は前後の空白を除いて、Array.from で数える（絵文字も 1 文字。DB の char_length と同じ数え方）
export function countCultureWishChars(value: string | null | undefined): number {
  return Array.from((value ?? '').trim()).length
}

// フォームの決まり（zod）のエラーの印。画面では getCultureWishText(...).errors[印] で文にする
export type CultureWishErrorCode = 'cultureWishRequired' | 'cultureWishTooLong'

type ByGender = { male: string; female: string }

type CultureWishDict = {
  inputLabel: ByGender
  displayLabel: ByGender
  placeholder: ByGender
  tagHeading: ByGender
  // 日本文化のタグの説明（タグは任意・8 つまで）
  tagNote: ByGender
  errors: Record<CultureWishErrorCode, string>
}

const T: Record<SupportedLanguage, CultureWishDict> = {
  ja: {
    inputLabel: {
      male: '行きたい場所、体験したい日本文化を記入してください',
      female: '紹介したい日本文化や、おすすめの場所を記入してください',
    },
    displayLabel: {
      male: '行きたい場所・体験したい日本文化',
      female: '紹介したい日本文化・おすすめの場所',
    },
    placeholder: {
      male: '例：地元の人が通う居酒屋で飲んだり、昔ながらの町並みを歩いたりしてみたい',
      female: '例：地元の人しか知らない居酒屋や、のどかな田舎の風景を案内したい',
    },
    tagHeading: {
      male: '興味のある日本文化',
      female: '共有したい日本文化',
    },
    tagNote: {
      male: '当てはまるものがあれば選んでください（8つまで）',
      female: '紹介できるものがあれば選んでください（8つまで）',
    },
    errors: {
      cultureWishRequired: '入力してください',
      cultureWishTooLong: '200文字以内で入力してください',
    },
  },
  en: {
    inputLabel: {
      male: 'Tell us the places you want to visit and the Japanese culture you want to experience',
      female: "Tell us the Japanese culture you'd like to share and places you recommend",
    },
    displayLabel: {
      male: 'Places to visit & culture to experience',
      female: 'Japanese culture to share & recommended places',
    },
    placeholder: {
      male: "e.g. I'd love to have a drink at an izakaya where the locals go, and stroll through an old-fashioned neighborhood.",
      female: "e.g. I'd love to take you to a little izakaya only locals know about, or show you the peaceful countryside.",
    },
    tagHeading: {
      male: "Japanese culture I'm interested in",
      female: "Japanese culture I'd like to share",
    },
    tagNote: {
      male: 'Choose any that apply (up to 8).',
      female: 'Choose any you can introduce (up to 8).',
    },
    errors: {
      cultureWishRequired: 'Please fill this in.',
      cultureWishTooLong: 'Please keep it within 200 characters.',
    },
  },
  ko: {
    inputLabel: {
      male: '가고 싶은 곳과 체험하고 싶은 일본 문화를 적어 주세요',
      female: '소개하고 싶은 일본 문화나 추천하는 장소를 적어 주세요',
    },
    displayLabel: {
      male: '가고 싶은 곳・체험하고 싶은 일본 문화',
      female: '소개하고 싶은 일본 문화・추천 장소',
    },
    placeholder: {
      male: '예: 현지 사람들이 즐겨 찾는 이자카야에서 한잔해 보고 싶어요. 옛 정취가 남아 있는 거리를 걸어 보고 싶어요',
      female: '예: 현지 사람만 아는 이자카야나 한적한 시골 풍경을 안내하고 싶어요',
    },
    tagHeading: {
      male: '관심 있는 일본 문화',
      female: '공유하고 싶은 일본 문화',
    },
    tagNote: {
      male: '해당하는 것이 있으면 선택해 주세요 (최대 8개)',
      female: '소개할 수 있는 것이 있으면 선택해 주세요 (최대 8개)',
    },
    errors: {
      cultureWishRequired: '입력해 주세요',
      cultureWishTooLong: '200자 이내로 입력해 주세요',
    },
  },
  'zh-tw': {
    inputLabel: {
      male: '請填寫想去的地方和想體驗的日本文化',
      female: '請填寫想介紹的日本文化或推薦的地方',
    },
    displayLabel: {
      male: '想去的地方・想體驗的日本文化',
      female: '想介紹的日本文化・推薦的地方',
    },
    placeholder: {
      male: '例：想去在地人常去的居酒屋喝一杯，也想在充滿古早味的老街上散散步',
      female: '例：想帶你去只有在地人才知道的居酒屋，或看看悠閒的鄉村風景',
    },
    tagHeading: {
      male: '感興趣的日本文化',
      female: '想分享的日本文化',
    },
    tagNote: {
      male: '如有符合的項目請選擇（最多 8 個）',
      female: '如有能介紹的項目請選擇（最多 8 個）',
    },
    errors: {
      cultureWishRequired: '請填寫此欄',
      cultureWishTooLong: '請在 200 字以內填寫',
    },
  },
}

export function getCultureWishText(language: string | null | undefined): CultureWishDict {
  return T[(language ?? 'ja') as SupportedLanguage] ?? T.ja
}

// 男女で文を選ぶ（isForeignMale = 外国人男性の画面・プロフィールか）
export function pickByGender(text: ByGender, isForeignMale: boolean): string {
  return isForeignMale ? text.male : text.female
}
