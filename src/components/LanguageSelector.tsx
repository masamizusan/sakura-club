'use client'

import { Globe } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { SupportedLanguage } from '@/utils/language'

interface LanguageSelectorProps {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

// 固定言語ラベルマップ（翻訳辞書に依存しない安定表示）
const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ja: '日本語',
  en: 'English', 
  ko: '한국어',
  'zh-tw': '繁體中文'
}

/**
 * 全ページ共通言語セレクタ - 空欄問題根絶版
 * variant="light": 白背景・淡色背景用 (トップ/編集/マイページ)
 * variant="dark": 濃色ヘッダー用 (プレビューのオレンジ帯など)
 */
export function LanguageSelector({ 
  variant = 'light',
  size = 'md',
  showIcon = true,
  className = ''
}: LanguageSelectorProps) {
  const { currentLanguage, setLanguage } = useLanguage()

  const sizeClasses = {
    sm: 'min-w-[88px] h-8 text-xs',
    md: 'min-w-[96px] h-9 text-sm',
    lg: 'min-w-[104px] h-10 text-base'
  }

  // 指示書3-2: 二重フォールバック（空欄ゼロ保証）
  const safeCurrentLanguage: SupportedLanguage = currentLanguage ?? 'ja'
  const label = LANGUAGE_LABELS[safeCurrentLanguage] ?? LANGUAGE_LABELS['ja']

  const handleLanguageChange = (value: SupportedLanguage) => {
    setLanguage(value)
  }

  // 指示書3-3: variant別スタイル定義
  const variantStyles = {
    light: {
      trigger: 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50 focus:ring-gray-300',
      text: 'text-gray-900'
    },
    dark: {
      trigger: 'bg-transparent border-white/50 text-white hover:bg-white/10 focus:ring-white/30',
      text: 'text-white'
    }
  }

  const currentStyles = variantStyles[variant]

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showIcon && (
        <Globe className={`w-4 h-4 ${variant === 'dark' ? 'text-white/80' : 'text-gray-500'}`} />
      )}
      <Select 
        value={safeCurrentLanguage} 
        onValueChange={handleLanguageChange}
      >
        <SelectTrigger className={`${sizeClasses[size]} inline-flex items-center gap-2 ${currentStyles.trigger}`}>
          {/* 指示書3-2: Radix依存をやめて明示描画 */}
          <span 
            className={`inline-flex items-center ${currentStyles.text} opacity-100 visible`}
            style={{ 
              opacity: 1, 
              visibility: 'visible',
              display: 'inline-flex' 
            }}
          >
            {label}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ja">{LANGUAGE_LABELS.ja}</SelectItem>
          <SelectItem value="en">{LANGUAGE_LABELS.en}</SelectItem>
          <SelectItem value="ko">{LANGUAGE_LABELS.ko}</SelectItem>
          <SelectItem value="zh-tw">{LANGUAGE_LABELS['zh-tw']}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}