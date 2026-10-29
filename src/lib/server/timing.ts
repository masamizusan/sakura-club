// 処理時間の計測（#11）：段階ごとの ms を Server-Timing ヘッダーで返す（個人情報は入れない）
// ブラウザの開発者ツール → Network → このリクエスト → Timing で見られる
// #27: メッセージ一覧 API（api/messages/route.ts）から共通のファイルに移した（動きは同じ）
export function createTimer() {
  const startedAt = Date.now()
  const entries: Array<[string, number]> = []
  return {
    async measure<T>(name: string, fn: () => PromiseLike<T>): Promise<T> {
      const t0 = Date.now()
      try {
        return await fn()
      } finally {
        entries.push([name, Date.now() - t0])
      }
    },
    header(): string {
      return [...entries, ['total', Date.now() - startedAt] as [string, number]]
        .map(([name, ms]) => `${name};dur=${ms}`)
        .join(', ')
    },
  }
}

export type Timer = ReturnType<typeof createTimer>
