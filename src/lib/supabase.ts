import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { LanguageSkill } from '@/types/profile'

// シングルトンクライアント（モード別）
let supabaseInstance: SupabaseClient | null = null
let testModeInstance: SupabaseClient | null = null

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
  const currentInstance = isTestMode ? testModeInstance : supabaseInstance
  
  // 既にインスタンスが存在する場合は再利用
  if (currentInstance) {
    console.log(`既存のSupabaseクライアントを再利用 (${isTestMode ? 'TEST' : 'PROD'} mode)`)
    return currentInstance
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  console.log('Supabase環境変数チェック:', { 
    hasUrl: !!url, 
    hasKey: !!key,
    url: url ? `${url.slice(0, 30)}...` : 'undefined',
    keyPrefix: key ? `${key.slice(0, 10)}...` : 'undefined',
    urlLength: url?.length,
    keyLength: key?.length,
    urlTrimmed: url?.trim() === url,
    keyTrimmed: key?.trim() === key
  })

  if (!url || !key) {
    const error = new Error('Supabase環境変数が設定されていません')
    console.error('Supabase環境変数エラー:', error)
    throw error
  }

  if (!url.startsWith('https://')) {
    const error = new Error(`無効なSupabase URL: ${url}`)
    console.error('Supabase URLエラー:', error)
    throw error
  }

  try {
    console.log(`新しいSupabaseクライアント作成中... (${isTestMode ? 'TEST' : 'PROD'} mode)`)
    console.log('使用するURL:', url)
    console.log('使用するキー:', key?.substring(0, 20) + '...')
    
    // テストモード時は専用設定でクライアント作成
    const clientOptions = isTestMode ? {
      auth: {
        persistSession: false, // テストモード時はセッション永続化無効
        autoRefreshToken: false, // テストモード時はトークン自動更新無効
      }
    } : undefined
    
    const newInstance = createSupabaseClient(url, key, clientOptions)
    
    // モード別インスタンスに保存
    if (isTestMode) {
      testModeInstance = newInstance
      console.log('🧪 テストモード専用Supabaseクライアント作成成功（セッション隔離）')
    } else {
      supabaseInstance = newInstance
      console.log('🔧 本番Supabaseクライアント作成成功')
    }
    
    return newInstance
  } catch (error) {
    console.error(`Supabaseクライアント作成エラー (${isTestMode ? 'TEST' : 'PROD'} mode):`, error)
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