'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { COMMON_T, type CommonTextKey } from '@/lib/i18n/common'

// 共通の短い文言を、表示言語に合わせて出す（Suspense の fallback など、ページの辞書が届かない場所用）
export default function CommonText({ k }: { k: CommonTextKey }) {
  const { currentLanguage } = useLanguage()
  const dict = COMMON_T[currentLanguage] ?? COMMON_T.ja
  return <>{dict[k]}</>
}
