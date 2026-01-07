'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { SupportedLanguage, determineLanguage, saveLanguagePreference } from '@/utils/language'

interface LanguageContextType {
  currentLanguage: SupportedLanguage
  setLanguage: (language: SupportedLanguage) => void
  isLoading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
  initialLanguage?: SupportedLanguage
}

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(initialLanguage || 'ja')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // サーバーサイドレンダリング対応：クライアントサイドでのみ言語を決定
    const detectedLanguage = determineLanguage()
    setCurrentLanguage(detectedLanguage)
    setIsLoading(false)
    
    console.log('🌍 Language Provider initialized with:', detectedLanguage)
  }, [])

  const setLanguage = (language: SupportedLanguage) => {
    console.log('🌍 Language changed from', currentLanguage, 'to', language)
    setCurrentLanguage(language)
    saveLanguagePreference(language)
    
    // HTML lang属性を更新（SEOとアクセシビリティのため）
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
    }
  }

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    isLoading
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}