'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { SupportedLanguage } from '@/utils/language'
import {
  determineLanguageWithCookie,
  saveLanguageToCookie,
  getLanguageFromCookie
} from '@/utils/languageCookie'
import { logger } from '@/utils/logger'

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
  const loggedOnce = useRef(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlLanguage = urlParams.get('lang') as SupportedLanguage

    let detectedLanguage: SupportedLanguage

    if (urlLanguage && ['ja', 'en', 'ko', 'zh-tw'].includes(urlLanguage)) {
      detectedLanguage = urlLanguage
      saveLanguageToCookie(urlLanguage)
    } else {
      detectedLanguage = determineLanguageWithCookie()
    }

    setCurrentLanguage(detectedLanguage)
    setIsLoading(false)

    if (!loggedOnce.current) {
      loggedOnce.current = true
      logger.debug('[LANG] init:', detectedLanguage)
    }
  }, [])

  const setLanguage = (language: SupportedLanguage) => {
    logger.debug('[LANG] change:', currentLanguage, '→', language)
    setCurrentLanguage(language)
    
    // Cookie優先永続化（1年間）
    saveLanguageToCookie(language)
    
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