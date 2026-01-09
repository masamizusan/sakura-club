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

  // フォールバック処理：指示書3-2に従い必ずjaにフォールバック
  const safeCurrentLanguage: SupportedLanguage = currentLanguage ?? 'ja'

  // 指示書3-3: LANGUAGE_LABELSの固定マップで安定表示を保証
  const displayLabel = LANGUAGE_LABELS[safeCurrentLanguage]

  // 🔍 指示書5: 値の確認（ログで確定）
  console.log('🔍 Language Selector Debug:', {
    currentLanguage,
    safeCurrentLanguage,
    displayLabel,
    isLoading
  })

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showIcon && <Globe className="w-4 h-4 text-gray-500" />}
      <Select 
        value={safeCurrentLanguage} 
        onValueChange={handleLanguageChange}
      >
        <SelectTrigger className={sizeClasses[size]}>
          {/* 🔍 テスト：固定文字列で表示確認 */}
          <span className="min-w-[3rem] inline-flex opacity-100 visible">日本語</span>
          {/* 元のSelectValue（一時的にコメントアウト） */}
          {/* <SelectValue>
            {displayLabel}
          </SelectValue> */}
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