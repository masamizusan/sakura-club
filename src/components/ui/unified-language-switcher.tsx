'use client'

import { Globe } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/contexts/LanguageContext'
import { SupportedLanguage } from '@/utils/language'

interface UnifiedLanguageSwitcherProps {
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

// 固定言語ラベルマップ（翻訳辞書に依存しない安定表示）
const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ja: '日本語',
  en: 'English', 
  ko: '한국어',
  'zh-tw': '繁體中文'
}

/**
 * 統一言語切り替えコンポーネント
 * カスタム翻訳システムベースで、全画面で統一された言語管理を提供
 */
export function UnifiedLanguageSwitcher({ 
  className = '', 
  showIcon = true, 
  size = 'md' 
}: UnifiedLanguageSwitcherProps) {
  const { currentLanguage, setLanguage, isLoading } = useLanguage()

  const sizeClasses = {
    sm: 'w-20 h-8 text-xs',
    md: 'w-24 h-9 text-sm',
    lg: 'w-28 h-10 text-base'
  }

  const handleLanguageChange = (value: SupportedLanguage) => {
    setLanguage(value)
  }

  // フォールバック処理：currentLanguageが不正な場合はjaを使用
  const safeCurrentLanguage = currentLanguage && Object.keys(LANGUAGE_LABELS).includes(currentLanguage) 
    ? currentLanguage 
    : 'ja'

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showIcon && <Globe className="w-4 h-4 text-gray-400" />}
        <div className={`${sizeClasses[size]} bg-gray-100 rounded animate-pulse`}></div>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showIcon && <Globe className="w-4 h-4 text-gray-500" />}
      <Select value={safeCurrentLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className={sizeClasses[size]}>
          <SelectValue 
            placeholder="言語を選択"
          >
            {LANGUAGE_LABELS[safeCurrentLanguage]}
          </SelectValue>
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