import { countCultureWishChars, getCardHeadings } from '@/lib/i18n/cultureWish'
import { isForeignMaleUser } from '@/utils/userHelpers'

// 一覧のカード（さがす・お相手から・足跡）の文の部分：
//   1 行目：［自己紹介の見出し］自己紹介
//   2 行目：［culture_wish の見出し］culture_wish
// - どちらも 1 行で切る（truncate）。2 行分の高さは以前の line-clamp-2 と同じ
// - 書いていない欄は行ごと出さない。両方空なら何も出さない
// - 本文は翻訳しない（原文のまま）。見出しは読む人の画面の言語、男女はカードの持ち主で分ける

type Props = {
  cultureWish?: string | null
  bio?: string | null
  gender?: string | null
  nationality?: string | null
  language: string
  className?: string
}

const cleanCultureWish = (v: string | null | undefined): string =>
  countCultureWishChars(v) > 0 ? (v ?? '').trim() : ''

const cleanBio = (v: string | null | undefined): string => (v ?? '').trim()

// 文の部分を出すかどうか（どちらか 1 つでも書いてあれば出す）
export function hasCardText(cultureWish: string | null | undefined, bio: string | null | undefined): boolean {
  return cleanCultureWish(cultureWish) !== '' || cleanBio(bio) !== ''
}

export default function CardTextLines({ cultureWish, bio, gender, nationality, language, className = '' }: Props) {
  const wish = cleanCultureWish(cultureWish)
  const intro = cleanBio(bio)
  if (!wish && !intro) return null

  const headings = getCardHeadings(language, isForeignMaleUser({ gender, nationality }))
  const line = (heading: string, text: string) => (
    <p className="truncate text-sm leading-relaxed text-gray-600">
      <span className="mr-1.5 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
        {heading}
      </span>
      {text}
    </p>
  )

  return (
    <div className={className}>
      {intro && line(headings.bio, intro)}
      {wish && line(headings.cultureWish, wish)}
    </div>
  )
}
