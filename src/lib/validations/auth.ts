import { z } from 'zod'

export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'パスワードは大文字・小文字・数字を含む必要があります'),
  confirmPassword: z.string(),
  firstName: z
    .string()
    .min(1, '名前を入力してください')
    .max(50, '名前は50文字以内で入力してください'),
  lastName: z
    .string()
    .min(1, '苗字を入力してください')
    .max(50, '苗字は50文字以内で入力してください'),
  gender: z.enum(['female', 'male'], {
    required_error: '性別を選択してください'
  }),
  age: z
    .number({
      required_error: '年齢を入力してください',
      invalid_type_error: '有効な年齢を入力してください'
    })
    .min(18, '18歳以上である必要があります')
    .max(99, '有効な年齢を入力してください'),
  nationality: z
    .string()
    .min(1, '国籍を選択してください'),
  prefecture: z
    .string()
    .min(1, '都道府県を選択してください'),
  city: z
    .string()
    .min(1, '市区町村を入力してください')
    .max(100, '市区町村は100文字以内で入力してください'),
  hobbies: z
    .array(z.string())
    .min(1, '趣味を1つ以上選択してください')
    .max(5, '趣味は5つまで選択できます'),
  selfIntroduction: z
    .string()
    .min(50, '自己紹介は50文字以上で入力してください')
    .max(1000, '自己紹介は1000文字以内で入力してください'),
  agreeToTerms: z
    .boolean()
    .refine(value => value === true, '利用規約に同意してください'),
  agreeToPrivacy: z
    .boolean()
    .refine(value => value === true, 'プライバシーポリシーに同意してください'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
})

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(1, 'パスワードを入力してください'),
  rememberMe: z.boolean().optional(),
})

export type SignupFormData = z.infer<typeof signupSchema>
export type LoginFormData = z.infer<typeof loginSchema>

// Constants for form options
export const NATIONALITIES = [
  { value: 'JP', label: '日本' },
  { value: 'US', label: 'アメリカ' },
  { value: 'GB', label: 'イギリス' },
  { value: 'CA', label: 'カナダ' },
  { value: 'AU', label: 'オーストラリア' },
  { value: 'DE', label: 'ドイツ' },
  { value: 'FR', label: 'フランス' },
  { value: 'IT', label: 'イタリア' },
  { value: 'ES', label: 'スペイン' },
  { value: 'KR', label: '韓国' },
  { value: 'CN', label: '中国' },
  { value: 'TW', label: '台湾' },
  { value: 'TH', label: 'タイ' },
  { value: 'VN', label: 'ベトナム' },
  { value: 'IN', label: 'インド' },
  { value: 'OTHER', label: 'その他' },
]

export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
]

export const HOBBY_OPTIONS = [
  '読書', '映画鑑賞', '音楽鑑賞', '料理', '旅行', 'スポーツ',
  '写真撮影', '絵画・アート', '語学学習', 'ダンス', 'ヨガ',
  'ゲーム', 'アニメ・マンガ', 'ファッション', 'カフェ巡り',
  '温泉巡り', '登山・ハイキング', 'サイクリング', '釣り',
  'ガーデニング', 'ペット', 'ボランティア', '茶道', '華道',
  '書道', '陶芸', '手芸・裁縫', 'DIY', 'その他'
]