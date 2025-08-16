import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Supabase環境変数が設定されていません:', { 
      hasUrl: !!url, 
      hasKey: !!key,
      url: url ? `${url.slice(0, 20)}...` : 'undefined'
    })
    throw new Error('Supabase環境変数が設定されていません')
  }

  if (!url.startsWith('https://')) {
    console.error('無効なSupabase URL:', url)
    throw new Error('無効なSupabase URL')
  }

  return createBrowserClient(url, key)
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