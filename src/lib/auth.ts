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
      console.log('🧹 新規登録開始 - 管理者権限チェックをスキップ')
      
      // 注意: 管理者権限が必要な既存ユーザー削除は本番環境では無効
      // 開発環境のみで有効にする場合は、SERVICE_ROLE_KEYが必要
      console.log('📋 既存ユーザークリーンアップをスキップして新規登録を続行')
      
      // 1. Create auth user (完全に新しいユーザー)
      console.log('👤 新しいユーザー作成中...')
      const redirectUrl = `${window.location.origin}/verify-email`
      console.log('📧 メール認証リダイレクトURL:', redirectUrl)
      console.log('📧 Supabase接続情報:', {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      })
      
      const signUpOptions = {
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            gender: data.gender,
          },
          emailRedirectTo: redirectUrl
        }
      }
      
      console.log('📧 新規登録パラメーター:', {
        email: signUpOptions.email,
        hasPassword: !!signUpOptions.password,
        redirectUrl: signUpOptions.options.emailRedirectTo,
        metaData: signUpOptions.options.data
      })
      
      const { data: authData, error: authError } = await supabase.auth.signUp(signUpOptions)

      console.log('📧 Supabase認証結果:', {
        hasUser: !!authData?.user,
        hasSession: !!authData?.session,
        needsConfirmation: !authData?.session,
        error: authError?.message,
        userEmail: authData?.user?.email,
        userConfirmedAt: authData?.user?.email_confirmed_at
      })

      if (authError) {
        console.error('❌ Supabase認証エラー詳細:', {
          message: authError.message,
          code: authError.status,
          details: authError
        })
        
        // メール送信エラーの場合の特別処理
        if (authError.message.includes('Error sending confirmation email') || 
            authError.message.includes('email') ||
            authError.status === 500) {
          throw new AuthError('メール認証の設定に問題があります。テストモードをご利用ください。', 'email_config_error')
        }
        
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
        console.error('認証エラー詳細:', error)
        
        // メール認証未完了の場合
        if (error.message.includes('Email not confirmed')) {
          throw new AuthError('メール認証が完了していません。登録時に送信されたメールを確認し、認証リンクをクリックしてください。', 'email_not_confirmed')
        }
        
        // 無効な認証情報の場合
        if (error.message.includes('Invalid login credentials')) {
          // ユーザーが存在するかチェック
          try {
            const { data: adminAuth } = await supabase.auth.admin.listUsers()
            const userExists = adminAuth.users.some(user => user.email === data.email)
            
            if (userExists) {
              const user = adminAuth.users.find(user => user.email === data.email)
              if (!user?.email_confirmed_at) {
                throw new AuthError('メール認証が完了していません。登録時に送信されたメールを確認し、認証リンクをクリックしてください。', 'email_not_confirmed')
              }
            }
          } catch (adminError) {
            console.log('管理者チェック失敗（通常の動作）:', adminError)
          }
          
          throw new AuthError('メールアドレスまたはパスワードが正しくありません', 'invalid_credentials')
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        return null
      }

      // Try to get profile, but don't fail if it doesn't exist
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // If profile doesn't exist, return basic user info from auth
      if (profileError || !profile) {
        console.log('No profile found for user, returning basic auth info:', user.id)
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

  async resendEmailConfirmation(email: string) {
    const supabase = createClient()
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      })

      if (error) {
        throw new AuthError(error.message)
      }

      return { success: true }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError('メール再送処理中にエラーが発生しました')
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
          const user = await this.getCurrentUser()
          callback(user)
        } else {
          callback(null)
        }
      }
    })
  }
}