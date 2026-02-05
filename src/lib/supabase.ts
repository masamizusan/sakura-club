import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { LanguageSkill } from '@/types/profile'
import { logger } from '@/utils/logger'

// シングルトンクライアント（モード別）
let supabaseInstance: SupabaseClient | null = null
let testModeInstance: SupabaseClient | null = null
// 🔒 修繕C: タブ別テストモードインスタンス管理
const testModeInstances = new Map<string, SupabaseClient>()
// 初回ログ用フラグ
let loggedOnce = false

// テストモード検出（統一）
const isTestModeActive = (): boolean => {
  if (typeof window === 'undefined') return false
  
  const urlParams = new URLSearchParams(window.location.search)
  const pathname = window.location.pathname
  
  return !!(
    urlParams.get('dev') === 'skip-verification' ||
    urlParams.get('devTest') === 'true' ||
    localStorage.getItem('devTestMode') === 'true' ||
    pathname.includes('/test') ||
    (pathname.includes('/profile/edit') && 
     (urlParams.get('type') || urlParams.get('gender') || urlParams.get('nickname')) &&
     urlParams.get('fromMyPage') !== 'true')
  )
}

export const createClient = () => {
  const isTestMode = isTestModeActive()

  // 🔒 修繕C: タブ別インスタンス取得（タブIDが未生成なら先に生成）
  let tabStorageKey: string | null = null
  if (isTestMode && typeof sessionStorage !== 'undefined') {
    let tabId = sessionStorage.getItem('sc_test_tab_id')
    if (!tabId) {
      tabId = crypto.randomUUID()
      sessionStorage.setItem('sc_test_tab_id', tabId)
    }
    tabStorageKey = `sakura-club-test-session-${tabId}`
    const cached = testModeInstances.get(tabStorageKey)
    if (cached) {
      return cached // 再利用時はログ不要
    }
  }

  // PROD mode: シングルトン再利用
  if (!isTestMode && supabaseInstance) {
    return supabaseInstance // 再利用時はログ不要
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !key) {
    const error = new Error('Supabase環境変数が設定されていません')
    logger.error('[SUPABASE] 環境変数エラー')
    throw error
  }

  if (!url.startsWith('https://')) {
    const error = new Error(`無効なSupabase URL: ${url}`)
    logger.error('[SUPABASE] URL形式エラー')
    throw error
  }

  try {
    const testStorageKey = tabStorageKey || 'sakura-club-test-session'
    const clientOptions = isTestMode ? {
      auth: {
        persistSession: true, // 🛡️ セッション永続化で user_id 固定
        autoRefreshToken: true, // 🛡️ トークン自動更新で継続性確保
        storage: window.localStorage, // 🛡️ localStorage でセッション保持
        storageKey: testStorageKey, // 🛡️ テスト専用キー（タブ別分離）
      }
    } : undefined
    
    const newInstance = createSupabaseClient(url, key, clientOptions)
    
    // モード別インスタンスに保存
    if (isTestMode) {
      testModeInstance = newInstance
      if (tabStorageKey) {
        testModeInstances.set(tabStorageKey, newInstance)
      }
    } else {
      supabaseInstance = newInstance
    }

    // 初回のみログ出力
    if (!loggedOnce) {
      loggedOnce = true
      logger.debug('[SUPABASE] client created:', isTestMode ? 'TEST' : 'PROD')
    }

    return newInstance
  } catch (error) {
    logger.error('[SUPABASE] client creation failed')
    throw error
  }
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          gender: 'male' | 'female'
          age: number
          nationality: string
          prefecture: string
          city: string
          hobbies: string[]
          self_introduction: string
          avatar_url?: string
          is_verified: boolean
          membership_type: 'free' | 'premium'
          // 2025年実装: 言語スキルJSONカラム（統一型定義使用）
          language_skills?: LanguageSkill[]
          // 2025年実装: 外国人男性専用フィールド
          visit_schedule?: string
          travel_companion?: string
          planned_prefectures?: string[]
          planned_stations?: string[]
          // 2025年実装: 専用カラム
          occupation?: string
          height?: number
          body_type?: string
          marital_status?: string
          // 2025年実装: 性格・言語レベル
          personality?: string[]
          japanese_level?: string
          english_level?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          gender: 'male' | 'female'
          age: number
          nationality: string
          prefecture: string
          city: string
          hobbies: string[]
          self_introduction: string
          avatar_url?: string
          is_verified?: boolean
          membership_type?: 'free' | 'premium'
          // 2025年実装: 言語スキルJSONカラム（統一型定義使用）
          language_skills?: LanguageSkill[]
          // 2025年実装: 外国人男性専用フィールド
          visit_schedule?: string
          travel_companion?: string
          planned_prefectures?: string[]
          planned_stations?: string[]
          // 2025年実装: 専用カラム
          occupation?: string
          height?: number
          body_type?: string
          marital_status?: string
          // 2025年実装: 性格・言語レベル
          personality?: string[]
          japanese_level?: string
          english_level?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          gender?: 'male' | 'female'
          age?: number
          nationality?: string
          prefecture?: string
          city?: string
          hobbies?: string[]
          self_introduction?: string
          avatar_url?: string
          is_verified?: boolean
          membership_type?: 'free' | 'premium'
          // 2025年実装: 言語スキルJSONカラム（統一型定義使用）
          language_skills?: LanguageSkill[]
          // 2025年実装: 外国人男性専用フィールド
          visit_schedule?: string
          travel_companion?: string
          planned_prefectures?: string[]
          planned_stations?: string[]
          // 2025年実装: 専用カラム
          occupation?: string
          height?: number
          body_type?: string
          marital_status?: string
          // 2025年実装: 性格・言語レベル
          personality?: string[]
          japanese_level?: string
          english_level?: string
          created_at?: string
          updated_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          user1_id: string
          user2_id: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user1_id: string
          user2_id: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user1_id?: string
          user2_id?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      experiences: {
        Row: {
          id: string
          title: string
          description: string
          category: string
          date: string
          time_start: string
          time_end: string
          location: string
          prefecture: string
          city: string
          max_participants: number
          current_participants: number
          price: number
          currency: string
          organizer_id: string
          status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          category: string
          date: string
          time_start: string
          time_end: string
          location: string
          prefecture: string
          city: string
          max_participants: number
          current_participants?: number
          price?: number
          currency?: string
          organizer_id: string
          status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          category?: string
          date?: string
          time_start?: string
          time_end?: string
          location?: string
          prefecture?: string
          city?: string
          max_participants?: number
          current_participants?: number
          price?: number
          currency?: string
          organizer_id?: string
          status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      experience_participants: {
        Row: {
          id: string
          experience_id: string
          user_id: string
          status: 'registered' | 'confirmed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          experience_id: string
          user_id: string
          status?: 'registered' | 'confirmed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          experience_id?: string
          user_id?: string
          status?: 'registered' | 'confirmed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          content: string
          read_at?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          content: string
          read_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          read_at?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}