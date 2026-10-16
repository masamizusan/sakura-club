/**
 * プロフィールフィールドのフォーマット共通関数
 * /mypage, /matches, /profile/[id], /profile/preview で共通利用
 *
 * NOTE:
 * このファイルはプロフィール編集画面と表示画面の
 * 翻訳表現を完全に一致させるための唯一の変換レイヤー。
 * 新しい項目を追加する場合は必ずここに formatter を追加すること。
 */

import { SupportedLanguage } from '@/utils/language'

// 4言語対応の翻訳辞書
const fieldTranslations: Record<string, Record<string, Record<string, string>>> = {
  // 職業
  occupation: {
    ja: {
      'noEntry': '記入しない',
      'no-entry': '記入しない',
      '経営者・役員': '経営者・役員',
      '会社員': '会社員',
      '公務員': '公務員',
      '自営業': '自営業',
      'フリーランス': 'フリーランス',
      'エンジニア': 'エンジニア',
      '学生': '学生',
      '主婦': '主婦',
      '主夫': '主夫',
      // プロフィール編集の選択肢（translations.ts の occupations と同じ訳）
      '医師': '医師',
      '看護師': '看護師',
      '教師・講師': '教師・講師',
      'デザイナー': 'デザイナー',
      '営業': '営業',
      'マーケティング': 'マーケティング',
      '研究者': '研究者',
      'コンサルタント': 'コンサルタント',
      '金融': '金融',
      '法律関係': '法律関係',
      'サービス業': 'サービス業',
      '小売業': '小売業',
      '製造業': '製造業',
      'その他': 'その他'
    },
    en: {
      'noEntry': 'Not specified',
      'no-entry': 'Not specified',
      '経営者・役員': 'Executive / Manager',
      '会社員': 'Company Employee',
      '公務員': 'Public Servant',
      '自営業': 'Self-employed',
      'フリーランス': 'Freelance',
      'エンジニア': 'Engineer',
      '学生': 'Student',
      '主婦': 'Homemaker',
      '主夫': 'Homemaker',
      // プロフィール編集の選択肢（translations.ts の occupations と同じ訳）
      '医師': 'Doctor',
      '看護師': 'Nurse',
      '教師・講師': 'Teacher/Instructor',
      'デザイナー': 'Designer',
      '営業': 'Sales',
      'マーケティング': 'Marketing',
      '研究者': 'Researcher',
      'コンサルタント': 'Consultant',
      '金融': 'Finance',
      '法律関係': 'Legal',
      'サービス業': 'Service Industry',
      '小売業': 'Retail',
      '製造業': 'Manufacturing',
      'その他': 'Other'
    },
    ko: {
      'noEntry': '미입력',
      'no-entry': '미입력',
      '経営者・役員': '경영자・임원',
      '会社員': '회사원',
      '公務員': '공무원',
      '自営業': '자영업',
      'フリーランス': '프리랜서',
      'エンジニア': '엔지니어',
      '学生': '학생',
      '主婦': '주부',
      '主夫': '주부',
      // プロフィール編集の選択肢（translations.ts の occupations と同じ訳）
      '医師': '의사',
      '看護師': '간호사',
      '教師・講師': '교사·강사',
      'デザイナー': '디자이너',
      '営業': '영업',
      'マーケティング': '마케팅',
      '研究者': '연구원',
      'コンサルタント': '컨설턴트',
      '金融': '금융',
      '法律関係': '법률 관련',
      'サービス業': '서비스업',
      '小売業': '소매업',
      '製造業': '제조업',
      'その他': '기타'
    },
    'zh-tw': {
      'noEntry': '未填寫',
      'no-entry': '未填寫',
      '経営者・役員': '經營者・管理層',
      '会社員': '上班族',
      '公務員': '公務員',
      '自営業': '自營業',
      'フリーランス': '自由工作者',
      'エンジニア': '工程師',
      '学生': '學生',
      '主婦': '家庭主婦',
      '主夫': '家庭主夫',
      // プロフィール編集の選択肢（translations.ts の occupations と同じ訳）
      '医師': '醫師',
      '看護師': '護理師',
      '教師・講師': '教師·講師',
      'デザイナー': '設計師',
      '営業': '業務',
      'マーケティング': '行銷',
      '研究者': '研究員',
      'コンサルタント': '顧問',
      '金融': '金融',
      '法律関係': '法律相關',
      'サービス業': '服務業',
      '小売業': '零售業',
      '製造業': '製造業',
      'その他': '其他'
    }
  },

  // 体型
  bodyType: {
    ja: {
      'slim': 'スリム',
      'average': '普通',
      'muscular': '筋肉質',
      'plump': 'ぽっちゃり'
    },
    en: {
      'slim': 'Slim',
      'average': 'Average',
      'muscular': 'Muscular',
      'plump': 'Plump'
    },
    ko: {
      'slim': '슬림',
      'average': '보통',
      'muscular': '근육질',
      'plump': '통통'
    },
    'zh-tw': {
      'slim': '苗條',
      'average': '普通',
      'muscular': '肌肉型',
      'plump': '微胖'
    }
  },

  // 婚姻状況
  maritalStatus: {
    ja: {
      'single': '未婚',
      'married': '既婚'
    },
    en: {
      'single': 'Single',
      'married': 'Married'
    },
    ko: {
      'single': '미혼',
      'married': '기혼'
    },
    'zh-tw': {
      'single': '未婚',
      'married': '已婚'
    }
  },

  // 言語レベル
  languageLevel: {
    ja: {
      'none': 'なし',
      'beginner': '初級',
      'beginner_plus': '初級+',
      'elementary': '初中級',
      'intermediate': '中級',
      'intermediate_plus': '中級+',
      'upperIntermediate': '中上級',
      'upper_intermediate': '中上級',
      'advanced': '上級',
      'advanced_plus': '上級+',
      'native': 'ネイティブ'
    },
    en: {
      'none': 'None',
      'beginner': 'Beginner',
      'beginner_plus': 'Beginner+',
      'elementary': 'Elementary',
      'intermediate': 'Intermediate',
      'intermediate_plus': 'Intermediate+',
      'upperIntermediate': 'Upper Intermediate',
      'upper_intermediate': 'Upper Intermediate',
      'advanced': 'Advanced',
      'advanced_plus': 'Advanced+',
      'native': 'Native'
    },
    ko: {
      'none': '없음',
      'beginner': '초급',
      'beginner_plus': '초급+',
      'elementary': '초중급',
      'intermediate': '중급',
      'intermediate_plus': '중급+',
      'upperIntermediate': '중상급',
      'upper_intermediate': '중상급',
      'advanced': '상급',
      'advanced_plus': '상급+',
      'native': '원어민'
    },
    'zh-tw': {
      'none': '無',
      'beginner': '初級',
      'beginner_plus': '初級+',
      'elementary': '初中級',
      'intermediate': '中級',
      'intermediate_plus': '中級+',
      'upperIntermediate': '中高級',
      'upper_intermediate': '中高級',
      'advanced': '高級',
      'advanced_plus': '高級+',
      'native': '母語'
    }
  },

  // 同行者
  travelCompanion: {
    ja: {
      'noEntry': '記入しない',
      'no-entry': '記入しない',
      'alone': '一人',
      'solo': '一人',
      'friend': '友人',
      'friends': '友人',
      'family': '家族',
      'partner': 'パートナー',
      'couple': 'パートナー'
    },
    en: {
      'noEntry': 'Not specified',
      'no-entry': 'Not specified',
      'alone': 'Alone',
      'solo': 'Alone',
      'friend': 'With friend',
      'friends': 'With friends',
      'family': 'With family',
      'partner': 'With partner',
      'couple': 'With partner'
    },
    ko: {
      'noEntry': '미입력',
      'no-entry': '미입력',
      'alone': '혼자',
      'solo': '혼자',
      'friend': '친구와',
      'friends': '친구들과',
      'family': '가족과',
      'partner': '파트너와',
      'couple': '파트너와'
    },
    'zh-tw': {
      'noEntry': '未填寫',
      'no-entry': '未填寫',
      'alone': '獨自',
      'solo': '獨自',
      'friend': '與朋友',
      'friends': '與朋友',
      'family': '與家人',
      'partner': '與伴侶',
      'couple': '與伴侶'
    }
  },

  // 訪問予定
  visitSchedule: {
    ja: {
      'undecided': '未定',
      'no-entry': '記入しない',
      'currently-in-japan': '現在日本にいる'
    },
    en: {
      'undecided': 'Undecided',
      'no-entry': 'Not specified',
      'currently-in-japan': 'Currently in Japan'
    },
    ko: {
      'undecided': '미정',
      'no-entry': '미입력',
      'currently-in-japan': '현재 일본에 있음'
    },
    'zh-tw': {
      'undecided': '未定',
      'no-entry': '未填寫',
      'currently-in-japan': '目前在日本'
    }
  },

  // 季節
  seasons: {
    ja: {
      'spring': '春',
      'summer': '夏',
      'autumn': '秋',
      'winter': '冬'
    },
    en: {
      'spring': 'Spring',
      'summer': 'Summer',
      'autumn': 'Autumn',
      'winter': 'Winter'
    },
    ko: {
      'spring': '봄',
      'summer': '여름',
      'autumn': '가을',
      'winter': '겨울'
    },
    'zh-tw': {
      'spring': '春',
      'summer': '夏',
      'autumn': '秋',
      'winter': '冬'
    }
  },

  // 共通ラベル
  labels: {
    ja: {
      'after': '以降'
    },
    en: {
      'after': 'or later'
    },
    ko: {
      'after': '이후'
    },
    'zh-tw': {
      'after': '之後'
    }
  }
}

/**
 * プロフィールフィールドをフォーマットする共通関数
 */
export function formatProfileField(
  fieldType: keyof typeof fieldTranslations,
  value: string | null | undefined,
  language: SupportedLanguage = 'ja'
): string {
  if (!value || value === '' || value === 'none') return ''

  const fieldDict = fieldTranslations[fieldType]
  if (!fieldDict) return value

  const langDict = fieldDict[language] || fieldDict['ja']
  return langDict[value] || value
}

/**
 * 職業のフォーマット
 */
export function formatOccupation(value: string | null | undefined, language: SupportedLanguage = 'ja'): string {
  return formatProfileField('occupation', value, language)
}

/**
 * 体型のフォーマット
 */
export function formatBodyType(value: string | null | undefined, language: SupportedLanguage = 'ja'): string {
  return formatProfileField('bodyType', value, language)
}

/**
 * 婚姻状況のフォーマット
 */
export function formatMaritalStatus(value: string | null | undefined, language: SupportedLanguage = 'ja'): string {
  return formatProfileField('maritalStatus', value, language)
}

/**
 * 言語レベルのフォーマット
 */
export function formatLanguageLevel(value: string | null | undefined, language: SupportedLanguage = 'ja'): string {
  return formatProfileField('languageLevel', value, language)
}

/**
 * 同行者のフォーマット
 */
export function formatTravelCompanion(value: string | null | undefined, language: SupportedLanguage = 'ja'): string {
  return formatProfileField('travelCompanion', value, language)
}

/**
 * 訪問予定のフォーマット（複雑なパターン対応）
 */
export function formatVisitSchedule(value: string | null | undefined, language: SupportedLanguage = 'ja'): string {
  if (!value || value === '' || value === 'none') return ''

  // 単純なキーの場合
  const simple = formatProfileField('visitSchedule', value, language)
  if (simple !== value) return simple

  // beyond-YYYY 形式の処理
  if (value.startsWith('beyond-')) {
    const year = value.split('-')[1]
    const afterLabel = fieldTranslations.labels[language]?.after || fieldTranslations.labels['ja'].after
    return `${year}${afterLabel}`
  }

  // YYYY-season 形式の処理
  const match = value.match(/^(\d{4})-(spring|summer|autumn|winter)$/)
  if (match) {
    const [, year, season] = match
    const seasonLabel = fieldTranslations.seasons[language]?.[season] || fieldTranslations.seasons['ja'][season]
    return `${year} ${seasonLabel}`
  }

  return value
}

/**
 * 都道府県のフォーマット（多言語対応）
 */
const prefectureTranslations: Record<string, Record<string, string>> = {
  ja: {}, // 日本語はそのまま
  en: {
    '北海道': 'Hokkaido', '青森県': 'Aomori', '岩手県': 'Iwate', '宮城県': 'Miyagi',
    '秋田県': 'Akita', '山形県': 'Yamagata', '福島県': 'Fukushima', '茨城県': 'Ibaraki',
    '栃木県': 'Tochigi', '群馬県': 'Gunma', '埼玉県': 'Saitama', '千葉県': 'Chiba',
    '東京都': 'Tokyo', '神奈川県': 'Kanagawa', '新潟県': 'Niigata', '富山県': 'Toyama',
    '石川県': 'Ishikawa', '福井県': 'Fukui', '山梨県': 'Yamanashi', '長野県': 'Nagano',
    '岐阜県': 'Gifu', '静岡県': 'Shizuoka', '愛知県': 'Aichi', '三重県': 'Mie',
    '滋賀県': 'Shiga', '京都府': 'Kyoto', '大阪府': 'Osaka', '兵庫県': 'Hyogo',
    '奈良県': 'Nara', '和歌山県': 'Wakayama', '鳥取県': 'Tottori', '島根県': 'Shimane',
    '岡山県': 'Okayama', '広島県': 'Hiroshima', '山口県': 'Yamaguchi', '徳島県': 'Tokushima',
    '香川県': 'Kagawa', '愛媛県': 'Ehime', '高知県': 'Kochi', '福岡県': 'Fukuoka',
    '佐賀県': 'Saga', '長崎県': 'Nagasaki', '熊本県': 'Kumamoto', '大分県': 'Oita',
    '宮崎県': 'Miyazaki', '鹿児島県': 'Kagoshima', '沖縄県': 'Okinawa'
  },
  // ko / zh-tw は 47 都道府県すべて（2026/10/17 多言語化 4。「현・부・도」「縣・府・都」付きの表記）
  ko: {
    '北海道': '홋카이도', '青森県': '아오모리현', '岩手県': '이와테현', '宮城県': '미야기현',
    '秋田県': '아키타현', '山形県': '야마가타현', '福島県': '후쿠시마현', '茨城県': '이바라키현',
    '栃木県': '도치기현', '群馬県': '군마현', '埼玉県': '사이타마현', '千葉県': '치바현',
    '東京都': '도쿄도', '神奈川県': '가나가와현', '新潟県': '니가타현', '富山県': '도야마현',
    '石川県': '이시카와현', '福井県': '후쿠이현', '山梨県': '야마나시현', '長野県': '나가노현',
    '岐阜県': '기후현', '静岡県': '시즈오카현', '愛知県': '아이치현', '三重県': '미에현',
    '滋賀県': '시가현', '京都府': '교토부', '大阪府': '오사카부', '兵庫県': '효고현',
    '奈良県': '나라현', '和歌山県': '와카야마현', '鳥取県': '돗토리현', '島根県': '시마네현',
    '岡山県': '오카야마현', '広島県': '히로시마현', '山口県': '야마구치현', '徳島県': '도쿠시마현',
    '香川県': '가가와현', '愛媛県': '에히메현', '高知県': '고치현', '福岡県': '후쿠오카현',
    '佐賀県': '사가현', '長崎県': '나가사키현', '熊本県': '구마모토현', '大分県': '오이타현',
    '宮崎県': '미야자키현', '鹿児島県': '가고시마현', '沖縄県': '오키나와현'
  },
  'zh-tw': {
    '北海道': '北海道', '青森県': '青森縣', '岩手県': '岩手縣', '宮城県': '宮城縣',
    '秋田県': '秋田縣', '山形県': '山形縣', '福島県': '福島縣', '茨城県': '茨城縣',
    '栃木県': '櫪木縣', '群馬県': '群馬縣', '埼玉県': '埼玉縣', '千葉県': '千葉縣',
    '東京都': '東京都', '神奈川県': '神奈川縣', '新潟県': '新潟縣', '富山県': '富山縣',
    '石川県': '石川縣', '福井県': '福井縣', '山梨県': '山梨縣', '長野県': '長野縣',
    '岐阜県': '岐阜縣', '静岡県': '靜岡縣', '愛知県': '愛知縣', '三重県': '三重縣',
    '滋賀県': '滋賀縣', '京都府': '京都府', '大阪府': '大阪府', '兵庫県': '兵庫縣',
    '奈良県': '奈良縣', '和歌山県': '和歌山縣', '鳥取県': '鳥取縣', '島根県': '島根縣',
    '岡山県': '岡山縣', '広島県': '廣島縣', '山口県': '山口縣', '徳島県': '德島縣',
    '香川県': '香川縣', '愛媛県': '愛媛縣', '高知県': '高知縣', '福岡県': '福岡縣',
    '佐賀県': '佐賀縣', '長崎県': '長崎縣', '熊本県': '熊本縣', '大分県': '大分縣',
    '宮崎県': '宮崎縣', '鹿児島県': '鹿兒島縣', '沖縄県': '沖繩縣'
  }
}

export function formatPrefecture(value: string | null | undefined, language: SupportedLanguage = 'ja'): string {
  if (!value) return ''
  if (language === 'ja') return value
  return prefectureTranslations[language]?.[value] || value
}

/**
 * 国籍のフォーマット
 */
const nationalityTranslations: Record<string, Record<string, string>> = {
  ja: {
    'アメリカ': 'アメリカ', 'カナダ': 'カナダ', 'イギリス': 'イギリス',
    '韓国': '韓国', '中国': '中国', 'オーストラリア': 'オーストラリア',
    'ドイツ': 'ドイツ', 'フランス': 'フランス', 'イタリア': 'イタリア',
    'スペイン': 'スペイン', 'ブラジル': 'ブラジル', 'メキシコ': 'メキシコ',
    'インド': 'インド', 'ロシア': 'ロシア', 'タイ': 'タイ',
    'ベトナム': 'ベトナム', 'フィリピン': 'フィリピン', 'インドネシア': 'インドネシア',
    'シンガポール': 'シンガポール', 'マレーシア': 'マレーシア', '台湾': '台湾',
    'ニュージーランド': 'ニュージーランド', 'オランダ': 'オランダ', 'スイス': 'スイス',
    // 2026/05/20 追加: signup の17選択肢に揃える(後方互換 24+4=28ヶ国カバレッジ)
    'スウェーデン': 'スウェーデン', 'ノルウェー': 'ノルウェー', 'デンマーク': 'デンマーク',
    'その他': 'その他'
  },
  en: {
    'アメリカ': 'USA', 'カナダ': 'Canada', 'イギリス': 'UK',
    '韓国': 'Korea', '中国': 'China', 'オーストラリア': 'Australia',
    'ドイツ': 'Germany', 'フランス': 'France', 'イタリア': 'Italy',
    'スペイン': 'Spain', 'ブラジル': 'Brazil', 'メキシコ': 'Mexico',
    'インド': 'India', 'ロシア': 'Russia', 'タイ': 'Thailand',
    'ベトナム': 'Vietnam', 'フィリピン': 'Philippines', 'インドネシア': 'Indonesia',
    'シンガポール': 'Singapore', 'マレーシア': 'Malaysia', '台湾': 'Taiwan',
    'ニュージーランド': 'New Zealand', 'オランダ': 'Netherlands', 'スイス': 'Switzerland',
    'スウェーデン': 'Sweden', 'ノルウェー': 'Norway', 'デンマーク': 'Denmark',
    'その他': 'Other'
  },
  ko: {
    'アメリカ': '미국', 'カナダ': '캐나다', 'イギリス': '영국',
    '韓国': '한국', '中国': '중국', 'オーストラリア': '호주',
    'ドイツ': '독일', 'フランス': '프랑스', 'イタリア': '이탈리아',
    'スペイン': '스페인', 'ブラジル': '브라질', 'メキシコ': '멕시코',
    'インド': '인도', 'ロシア': '러시아', 'タイ': '태국',
    'ベトナム': '베트남', 'フィリピン': '필리핀', 'インドネシア': '인도네시아',
    'シンガポール': '싱가포르', 'マレーシア': '말레이시아', '台湾': '대만',
    'ニュージーランド': '뉴질랜드', 'オランダ': '네덜란드', 'スイス': '스위스',
    'スウェーデン': '스웨덴', 'ノルウェー': '노르웨이', 'デンマーク': '덴마크',
    'その他': '기타'
  },
  'zh-tw': {
    'アメリカ': '美國', 'カナダ': '加拿大', 'イギリス': '英國',
    '韓国': '韓國', '中国': '中國', 'オーストラリア': '澳洲',
    'ドイツ': '德國', 'フランス': '法國', 'イタリア': '義大利',
    'スペイン': '西班牙', 'ブラジル': '巴西', 'メキシコ': '墨西哥',
    'インド': '印度', 'ロシア': '俄羅斯', 'タイ': '泰國',
    'ベトナム': '越南', 'フィリピン': '菲律賓', 'インドネシア': '印尼',
    'シンガポール': '新加坡', 'マレーシア': '馬來西亞', '台湾': '台灣',
    'ニュージーランド': '紐西蘭', 'オランダ': '荷蘭', 'スイス': '瑞士',
    'スウェーデン': '瑞典', 'ノルウェー': '挪威', 'デンマーク': '丹麥',
    'その他': '其他'
  }
}

export function formatNationality(value: string | null | undefined, language: SupportedLanguage = 'ja'): string {
  if (!value) return ''
  return nationalityTranslations[language]?.[value] || value
}

/**
 * 言語名のフォーマット（多言語対応）
 * 言語コード（ja, en, ko, zh-TW）をUI言語に応じて表示
 */
const languageNameTranslations: Record<string, Record<string, string>> = {
  ja: {
    'ja': '日本語',
    'en': '英語',
    'ko': '韓国語',
    'zh-TW': '中国語（繁体字）',
    'zh-tw': '中国語（繁体字）',
    'chinese': '中国語',
    'japanese': '日本語',
    'english': '英語',
    'korean': '韓国語'
  },
  en: {
    'ja': 'Japanese',
    'en': 'English',
    'ko': 'Korean',
    'zh-TW': 'Chinese (Traditional)',
    'zh-tw': 'Chinese (Traditional)',
    'chinese': 'Chinese',
    'japanese': 'Japanese',
    'english': 'English',
    'korean': 'Korean'
  },
  ko: {
    'ja': '일본어',
    'en': '영어',
    'ko': '한국어',
    'zh-TW': '중국어(번체)',
    'zh-tw': '중국어(번체)',
    'chinese': '중국어',
    'japanese': '일본어',
    'english': '영어',
    'korean': '한국어'
  },
  'zh-tw': {
    'ja': '日語',
    'en': '英語',
    'ko': '韓語',
    'zh-TW': '中文（繁體）',
    'zh-tw': '中文（繁體）',
    'chinese': '中文',
    'japanese': '日語',
    'english': '英語',
    'korean': '韓語'
  }
}

export function formatLanguageName(langCode: string | null | undefined, language: SupportedLanguage = 'ja'): string {
  if (!langCode || langCode === '' || langCode === 'none') return ''
  const langDict = languageNameTranslations[language] || languageNameTranslations['ja']
  return langDict[langCode] || langDict[langCode.toLowerCase()] || langCode
}
