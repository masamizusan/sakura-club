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
      <Select value={currentLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className={sizeClasses[size]}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ja">日本語</SelectItem>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="ko">한국어</SelectItem>
          <SelectItem value="zh-tw">繁體中文</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}