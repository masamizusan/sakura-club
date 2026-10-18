import type { SupportedLanguage } from '@/utils/language'

// ログイン・登録・パスワード再設定のエラーを「種類」で扱い、画面では表示言語の文を出す
// （Supabase の英語のエラー文や lib/auth.ts の日本語の文を、そのまま画面に出さないため）
// translations.ts（保護対象）とは別に持つ

export type AuthErrorKind =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_already_exists'
  | 'weak_password'
  | 'same_password'
  | 'session_expired'
  | 'rate_limited'
  | 'network_error'
  | 'unknown'

const AUTH_ERROR_KINDS: ReadonlySet<string> = new Set<AuthErrorKind>([
  'invalid_credentials',
  'email_not_confirmed',
  'user_already_exists',
  'weak_password',
  'same_password',
  'session_expired',
  'rate_limited',
  'network_error',
  'unknown',
])

export function isAuthErrorKind(value: unknown): value is AuthErrorKind {
  return typeof value === 'string' && AUTH_ERROR_KINDS.has(value)
}

// Supabase のエラーコード（error.code）→ 種類
const SUPABASE_CODE_TO_KIND: Record<string, AuthErrorKind> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  user_already_exists: 'user_already_exists',
  email_exists: 'user_already_exists',
  weak_password: 'weak_password',
  same_password: 'same_password',
  session_not_found: 'session_expired',
  session_expired: 'session_expired',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
  over_sms_send_rate_limit: 'rate_limited',
}

type ErrorLike = {
  name?: unknown
  code?: unknown
  status?: unknown
  message?: unknown
}

/**
 * どんなエラーでも種類に振り分ける。
 * 1. lib/auth.ts の AuthError（code に種類が入っている）
 * 2. Supabase の error.code
 * 3. エラーの名前・status
 * 4. 英語のメッセージ（古い Supabase や code が無い場合の予備）
 */
export function classifyAuthError(error: unknown): AuthErrorKind {
  if (!error || typeof error !== 'object') return 'unknown'
  const e = error as ErrorLike
  const name = typeof e.name === 'string' ? e.name : ''
  const code = typeof e.code === 'string' ? e.code : ''
  const status = typeof e.status === 'number' ? e.status : undefined
  const message = typeof e.message === 'string' ? e.message : ''

  if (name === 'AuthError' && isAuthErrorKind(code)) return code
  if (code && SUPABASE_CODE_TO_KIND[code]) return SUPABASE_CODE_TO_KIND[code]

  if (name === 'AuthSessionMissingError') return 'session_expired'
  if (name === 'AuthRetryableFetchError') return 'network_error'
  if (status === 429) return 'rate_limited'

  if (/invalid login credentials/i.test(message)) return 'invalid_credentials'
  if (/email not confirmed/i.test(message)) return 'email_not_confirmed'
  if (/already registered|already been registered|already exists/i.test(message)) return 'user_already_exists'
  if (/different from the old password/i.test(message)) return 'same_password'
  if (/password should be|weak password|password is too weak/i.test(message)) return 'weak_password'
  if (/auth session missing|session.*expired/i.test(message)) return 'session_expired'
  if (/rate limit|too many requests/i.test(message)) return 'rate_limited'
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) return 'network_error'

  return 'unknown'
}

const AUTH_ERROR_TEXT: Record<SupportedLanguage, Record<AuthErrorKind, string>> = {
  ja: {
    invalid_credentials: 'メールアドレスまたはパスワードが正しくありません。',
    email_not_confirmed: 'メールアドレスの確認が済んでいません。届いた確認メールのリンクを開いてから、ログインしてください。',
    user_already_exists: 'このメールアドレスは既に登録されています。ログインしてください。',
    weak_password: 'パスワードが弱すぎます。8 文字以上で、推測されにくいパスワードにしてください。',
    same_password: '新しいパスワードが今のパスワードと同じです。別のパスワードにしてください。',
    session_expired: 'パスワード再設定のリンクの有効期限が切れたか、無効です。もう一度、再設定のメールを送ってください。',
    rate_limited: '短い時間に操作が多すぎます。しばらく待ってから、もう一度お試しください。',
    network_error: '通信できませんでした。インターネットの接続を確認して、もう一度お試しください。',
    unknown: 'うまくいきませんでした。時間をおいてもう一度お試しください。',
  },
  en: {
    invalid_credentials: 'The email address or password is incorrect.',
    email_not_confirmed: "Your email address hasn't been confirmed yet. Please open the link in the confirmation email, then sign in.",
    user_already_exists: 'This email address is already registered. Please sign in.',
    weak_password: 'This password is too weak. Please use at least 8 characters that are hard to guess.',
    same_password: 'The new password is the same as your current one. Please choose a different password.',
    session_expired: 'This password reset link has expired or is invalid. Please request a new reset email.',
    rate_limited: 'Too many attempts in a short time. Please wait a while and try again.',
    network_error: "We couldn't connect. Please check your internet connection and try again.",
    unknown: 'Something went wrong. Please try again later.',
  },
  ko: {
    invalid_credentials: '이메일 주소 또는 비밀번호가 올바르지 않습니다.',
    email_not_confirmed: '이메일 주소 확인이 완료되지 않았습니다. 받은 확인 메일의 링크를 연 후 로그인해 주세요.',
    user_already_exists: '이미 등록된 이메일 주소입니다. 로그인해 주세요.',
    weak_password: '비밀번호가 너무 약합니다. 추측하기 어려운 8자 이상의 비밀번호로 설정해 주세요.',
    same_password: '새 비밀번호가 현재 비밀번호와 같습니다. 다른 비밀번호를 사용해 주세요.',
    session_expired: '비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다. 재설정 메일을 다시 요청해 주세요.',
    rate_limited: '짧은 시간에 너무 많이 시도했습니다. 잠시 후 다시 시도해 주세요.',
    network_error: '연결할 수 없습니다. 인터넷 연결을 확인한 후 다시 시도해 주세요.',
    unknown: '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  },
  'zh-tw': {
    invalid_credentials: '電子郵件地址或密碼不正確。',
    email_not_confirmed: '尚未完成電子郵件地址確認。請先開啟確認信中的連結後再登入。',
    user_already_exists: '此電子郵件地址已註冊，請直接登入。',
    weak_password: '密碼強度不足。請設定 8 個字元以上、不易被猜到的密碼。',
    same_password: '新密碼與目前的密碼相同，請設定其他密碼。',
    session_expired: '密碼重設連結已過期或無效。請重新寄送重設密碼的郵件。',
    rate_limited: '短時間內嘗試次數過多，請稍候再試。',
    network_error: '無法連線。請確認網路連線後再試一次。',
    unknown: '操作未成功，請稍後再試一次。',
  },
}

export function getAuthErrorMessage(kind: AuthErrorKind, lang: SupportedLanguage): string {
  const dict = AUTH_ERROR_TEXT[lang] ?? AUTH_ERROR_TEXT.ja
  return dict[kind] ?? dict.unknown
}
