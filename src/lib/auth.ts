import { createClient } from './supabase'
import { SignupFormData, LoginFormData } from './validations/auth'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  gender: 'male' | 'female'
  age: number
  nationality: string
  prefecture: string
  city: string
  hobbies: string[]
  selfIntroduction: string
  avatarUrl?: string
  isVerified: boolean
  membershipType: 'free' | 'premium'
}

export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export const authService = {
  async signUp(data: SignupFormData) {
    const supabase = createClient()
    
    try {
      // 0. 既存ユーザーのクリーンアップ（「新しい紙」方式）
      console.log('🧹 新規登録開始 - 既存データクリーンアップ中...')
      
      // 🚫 REMOVED: Client-side admin API calls (causes 403 errors)
      // Admin operations should be done server-side only
      // クライアントサイドでのadmin API呼び出しを削除（403エラーの原因）
      console.log('⚠️ Admin cleanup skipped (client-side limitation)')
      
      // 1. Create auth user (完全に新しいユーザー)
      console.log('👤 新しいユーザー作成中...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            gender: data.gender,
          },
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      })

      if (authError) {
        throw new AuthError(authError.message, authError.message)
      }

      if (!authData.user) {
        throw new AuthError('ユーザーの作成に失敗しました')
      }

      // メール認証が不要な場合（既にセッションがある）のみプロフィール更新を実行
      if (authData.session) {
        // 2. Wait for profile creation by trigger, then update with additional info
        // Small delay to ensure trigger completes
        await new Promise(resolve => setTimeout(resolve, 1000))

        const profileUpdateData = {
          name: data.firstName,
          last_name: data.lastName,
          gender: data.gender,
          age: data.age,
          birth_date: data.birth_date, // birth_dateを追加
          nationality: data.nationality,
          residence: data.prefecture,
          city: data.city,
          interests: data.hobbies,
          bio: data.selfIntroduction,
        }

        console.log('Updating profile with data:', profileUpdateData)

        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdateData)
          .eq('id', authData.user.id)

        if (profileError) {
          console.error('Profile update error:', profileError)
          throw new AuthError(`プロフィールの更新に失敗しました: ${profileError.message}`)
        }
      } else {
        // メール認証が必要な場合は、認証後に完了するため追加データを一時保存
        console.log('Email confirmation required, profile will be updated after verification')
      }

      // Supabaseの設定に従ってメール認証の要否を判定
      const forceEmailConfirmation = !authData.session
      
      return {
        user: authData.user,
        session: authData.session,
        needsEmailConfirmation: forceEmailConfirmation,
        pendingProfileData: forceEmailConfirmation ? {
          firstName: data.firstName,
          lastName: data.lastName,
          gender: data.gender,
          age: data.age,
          birth_date: data.birth_date, // birth_dateを追加
          nationality: data.nationality,
          prefecture: data.prefecture,
          city: data.city,
          hobbies: data.hobbies,
          selfIntroduction: data.selfIntroduction,
        } : null
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError('登録処理中にエラーが発生しました')
    }
  },

  async signIn(data: LoginFormData) {
    try {
      console.log('サインイン開始:', { email: data.email })
      const supabase = createClient()
      console.log('Supabaseクライアント取得完了')
      
      // 基本的な接続テスト
      try {
        console.log('Supabase接続テスト中...')
        const { data: testData, error: testError } = await supabase.from('profiles').select('count').limit(1)
        console.log('接続テスト結果:', { testData, testError })
      } catch (testErr) {
        console.error('接続テストエラー:', testErr)
      }
      
      console.log('認証リクエスト送信中...')
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      console.log('サインイン結果:', { 
        success: !error, 
        hasUser: !!authData?.user,
        hasSession: !!authData?.session,
        error: error?.message 
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new AuthError('メールアドレスまたはパスワードが正しくありません')
        }
        throw new AuthError(error.message)
      }

      return {
        user: authData.user,
        session: authData.session,
      }
    } catch (error) {
      console.error('サインインエラー:', error)
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError(`ログイン処理中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  async signOut() {
    const supabase = createClient()
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw new AuthError(error.message)
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError('ログアウト処理中にエラーが発生しました')
    }
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = createClient()
    
    try {
      // 🔧 FIX: テストモード検出 - 403エラー回避
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const isTestMode = urlParams.get('devTest') === 'true' || 
                          localStorage.getItem('devTestMode') === 'true' ||
                          (window.location.pathname.includes('/profile/edit') && 
                           (urlParams.get('type') || urlParams.get('gender')))
        
        if (isTestMode) {
          console.log('🧪 Test mode detected - skipping auth/v1/user call to prevent 403')
          return null
        }
      }

      // 🔧 FIX: まずgetSession()でセッション確認（軽量、403エラーなし）
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.log('Session error:', sessionError)
        return null
      }
      
      if (!session?.user) {
        console.log('No active session found')
        return null
      }

      // 🔧 セッションからユーザー情報取得（getUser() 回避）
      const user = session.user
      console.log('User from session:', { id: user.id, email: user.email })

      // Try to get profile, but don't fail if it doesn't exist
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // If profile doesn't exist, return basic user info from session
      if (profileError || !profile) {
        console.log('No profile found for user, returning basic session info:', user.id)
        return {
          id: user.id,
          email: user.email || '',
          firstName: 'ユーザー',
          lastName: '',
          gender: 'female' as const,
          age: 0,
          nationality: '',
          prefecture: '',
          city: '',
          hobbies: [],
          selfIntroduction: '',
          avatarUrl: undefined,
          isVerified: false,
          membershipType: 'free' as const,
        }
      }

      // Return profile data if it exists
      return {
        id: profile.id,
        email: profile.email,
        firstName: profile.name || profile.first_name || 'ユーザー',
        lastName: profile.last_name || '',
        gender: profile.gender || 'female',
        age: profile.age || 0,
        nationality: profile.nationality || '',
        prefecture: profile.residence || profile.prefecture || '',
        city: profile.city || '',
        hobbies: profile.interests || profile.hobbies || [],
        selfIntroduction: profile.bio || profile.self_introduction || '',
        avatarUrl: profile.avatar_url,
        isVerified: profile.is_verified || false,
        membershipType: profile.membership_type || 'free',
      }
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  },

  async resetPassword(email: string) {
    const supabase = createClient()
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        throw new AuthError(error.message)
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError('パスワードリセット処理中にエラーが発生しました')
    }
  },

  async updatePassword(newPassword: string) {
    const supabase = createClient()
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw new AuthError(error.message)
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError('パスワード更新処理中にエラーが発生しました')
    }
  },

  async verifyOtp(params: { email: string; token: string; type: 'signup' | 'recovery' }) {
    const supabase = createClient()
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: params.email,
        token: params.token,
        type: params.type
      })

      if (error) {
        throw new AuthError(error.message)
      }

      return { data, error: null }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError('OTP確認処理中にエラーが発生しました')
    }
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    const supabase = createClient()
    let lastUserId: string | null = null
    
    // 認証状態の変更を監視（重複コールバックを防ぐ）
    return supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUserId = session?.user?.id || null
      
      console.log('Auth state change:', { 
        event, 
        hasSession: !!session, 
        hasUser: !!session?.user,
        currentUserId,
        lastUserId,
        shouldUpdate: currentUserId !== lastUserId
      })
      
      // ユーザーIDが変わった場合のみコールバックを実行
      if (currentUserId !== lastUserId) {
        lastUserId = currentUserId
        
        if (session?.user) {
          // 🔧 FIX: 403エラー回避 - getCurrentUser()呼び出しを制限
          const isTestMode = typeof window !== 'undefined' && (
            new URLSearchParams(window.location.search).get('devTest') === 'true' || 
            localStorage.getItem('devTestMode') === 'true'
          )
          
          if (isTestMode) {
            console.log('🧪 Test mode - skipping getCurrentUser in auth state change')
            callback(null)
          } else {
            const user = await this.getCurrentUser()
            callback(user)
          }
        } else {
          callback(null)
        }
      }
    })
  }
}