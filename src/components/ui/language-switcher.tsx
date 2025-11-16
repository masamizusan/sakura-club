'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { locales, localeNames, localeFlags, type Locale } from '@/i18n'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const switchLanguage = (newLocale: Locale) => {
    // パス名から現在のロケールを取り除く
    const pathWithoutLocale = pathname?.replace(`/${locale}`, '') || '/'
    
    // 新しいロケールでのパスを構築
    const newPath = newLocale === 'ja' 
      ? pathWithoutLocale === '/' ? '/' : pathWithoutLocale
      : `/${newLocale}${pathWithoutLocale}`
    
    router.push(newPath)
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 min-w-[120px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="text-sm">
              {localeFlags[locale]} {localeNames[locale]}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {locales.map((availableLocale) => (
          <DropdownMenuItem
            key={availableLocale}
            onClick={() => switchLanguage(availableLocale)}
            className={`flex items-center gap-2 cursor-pointer ${
              locale === availableLocale ? 'bg-accent' : ''
            }`}
          >
            <span className="text-base">{localeFlags[availableLocale]}</span>
            <span className="text-sm">{localeNames[availableLocale]}</span>
            {locale === availableLocale && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// シンプルなインライン言語切り替えコンポーネント（ヘッダーなどの狭いスペース用）
export function LanguageSwitcherCompact() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  const switchLanguage = (newLocale: Locale) => {
    const pathWithoutLocale = pathname?.replace(`/${locale}`, '') || '/'
    const newPath = newLocale === 'ja' 
      ? pathWithoutLocale === '/' ? '/' : pathWithoutLocale
      : `/${newLocale}${pathWithoutLocale}`
    
    router.push(newPath)
  }

  return (
    <div className="flex items-center gap-1">
      {locales.map((availableLocale, index) => (
        <div key={availableLocale} className="flex items-center">
          <button
            onClick={() => switchLanguage(availableLocale)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              locale === availableLocale
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {localeFlags[availableLocale]} {availableLocale.toUpperCase()}
          </button>
          {index < locales.length - 1 && (
            <span className="text-muted-foreground text-xs mx-1">|</span>
          )}
        </div>
      ))}
    </div>
  )
}