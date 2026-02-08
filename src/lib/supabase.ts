/**
 * 🔄 Supabaseクライアント統一版
 *
 * 重要: クライアント生成は src/lib/supabase/client.ts に一本化
 * このファイルは後方互換性のためのリダイレクト + 型定義のみ
 *
 * 【Multiple GoTrueClient instances 対策】
 * - createBrowserClient (@supabase/ssr) を唯一のクライアント生成源とする
 * - cookie同期によりサーバー側と認証状態を共有
 */

import { createClient as createSSRClient } from '@/lib/supabase/client'
import { LanguageSkill } from '@/types/profile'
import { logger } from '@/utils/logger'

// 初回ログ用フラグ
let loggedOnce = false

/**
 * 🔒 統一クライアント取得（SSR対応版にリダイレクト）
 *
 * 以前のテストモード分岐は廃止し、常にSSRクライアントを返す
 * - cookie同期によりセッション管理が安定
 * - Multiple GoTrueClient警告を解消
 */
export const createClient = () => {
  // 初回のみログ出力
  if (!loggedOnce) {
    loggedOnce = true
    logger.debug('[SUPABASE] unified client (SSR)')
  }

  // SSR対応クライアントに一本化
  return createSSRClient()
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