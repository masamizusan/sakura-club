// #27: Promise.allSettled と同じ動き（tsconfig の lib が es6 のため型が無いので、ここで用意する）
// どれかが失敗しても全部の結果がそろうまで待ち、結果は渡した順に返す

export type SettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown }

export function allSettled<T extends readonly unknown[] | []>(
  promises: T,
): Promise<{ -readonly [K in keyof T]: SettledResult<Awaited<T[K]>> }> {
  return Promise.all(
    (promises as readonly unknown[]).map(p =>
      Promise.resolve(p).then(
        value => ({ status: 'fulfilled' as const, value }),
        reason => ({ status: 'rejected' as const, reason }),
      ),
    ),
  ) as Promise<any>
}

// 失敗していれば、その理由をそのまま投げる（同時にする前に、その場で例外が起きたのと同じ扱いにする）
export function unwrapSettled<T>(result: SettledResult<T>): T {
  if (result.status === 'rejected') throw result.reason
  return result.value
}
