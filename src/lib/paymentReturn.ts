// #41: 決済（Stripe）から戻ったときの戻り先を覚えておく
// 決済画面に移る直前に save し、キャンセル・完了画面で read → 移動したら clear する
// router.back() だと履歴上の Stripe の決済画面に戻ってループするため、固定の戻り先に移動する

const STORAGE_KEY = 'sakura_payment_return'

// アプリ内の決まったパスだけを受け付ける（外部サイトへの移動を防ぐ）
export function isAllowedPaymentReturn(path: unknown): path is string {
  if (typeof path !== 'string') return false
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return false
  return /^\/mypage\/plans(?:[/?#]|$)/.test(path) || path.startsWith('/messages/')
}

export function savePaymentReturn(path: string): void {
  if (!isAllowedPaymentReturn(path)) return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, path)
  } catch {
    // sessionStorage が使えない環境では何もしない
  }
}

export function readPaymentReturn(): string | null {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY)
    return isAllowedPaymentReturn(value) ? value : null
  } catch {
    return null
  }
}

export function clearPaymentReturn(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // 何もしない
  }
}
