// 生年月日（YYYY-MM-DD）から「今日」の年齢を出す（共通）
// - 今日の日付は日本時間（Asia/Tokyo）で決める：日本時間で誕生日になった時点で 1 つ増える
// - profiles_public ビューの age（date_part('year', age((now() AT TIME ZONE 'Asia/Tokyo')::date, birth_date))）と同じ結果になる
//   2/29 生まれは、うるう年でない年は 3/1 に 1 つ増える（Postgres の age() と同じ）
// - 形が違う・未来の日付なら null（呼び出し側で今までの値に戻す）

const TOKYO_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function todayInTokyo(now: Date = new Date()): { y: number; m: number; d: number } {
  // en-CA は YYYY-MM-DD の形で返す
  const [y, m, d] = TOKYO_DATE.format(now).split('-').map(Number)
  return { y, m, d }
}

export function ageFromBirthDate(birthDate: string | null | undefined, now: Date = new Date()): number | null {
  if (!birthDate) return null
  const match = String(birthDate).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const by = Number(match[1])
  const bm = Number(match[2])
  const bd = Number(match[3])
  if (!by || bm < 1 || bm > 12 || bd < 1 || bd > 31) return null

  const { y, m, d } = todayInTokyo(now)
  let age = y - by
  if (m < bm || (m === bm && d < bd)) age--
  return age >= 0 ? age : null
}
