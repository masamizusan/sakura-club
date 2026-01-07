'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { SupportedLanguage } from '@/utils/language'
import { 
  determineLanguageWithCookie,
  saveLanguageToCookie,
  getLanguageFromCookie 
} from '@/utils/languageCookie'

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
    // URL parameters에서 lang 확인 (navigation 시 전달된 언어)
    const urlParams = new URLSearchParams(window.location.search)
    const urlLanguage = urlParams.get('lang') as SupportedLanguage
    
    let detectedLanguage: SupportedLanguage
    
    if (urlLanguage && ['ja', 'en', 'ko', 'zh-tw'].includes(urlLanguage)) {
      // URL에서 전달된 언어가 있으면 우선 사용하고 cookie에 저장
      detectedLanguage = urlLanguage
      saveLanguageToCookie(urlLanguage)
    } else {
      // Cookie優先システムで言語를 결정
      detectedLanguage = determineLanguageWithCookie()
    }
    
    setCurrentLanguage(detectedLanguage)
    setIsLoading(false)
    
    console.log('🌍 Language Provider initialized with cookie system:', {
      detectedLanguage,
      urlLanguage,
      cookieExists: !!getLanguageFromCookie()
    })
  }, [])

  const setLanguage = (language: SupportedLanguage) => {
    console.log('🌍 Language changed from', currentLanguage, 'to', language)
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