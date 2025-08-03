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
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
          }
        }
      })

      if (authError) {
        throw new AuthError(authError.message, authError.message)
      }

      if (!authData.user) {
        throw new AuthError('ユーザーの作成に失敗しました')
      }

      // 2. Wait for profile creation by trigger, then update with additional info
      // Small delay to ensure trigger completes
      await new Promise(resolve => setTimeout(resolve, 1000))

      const profileUpdateData = {
        name: data.firstName,
        last_name: data.lastName,
        gender: data.gender,
        age: data.age,
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

      return {
        user: authData.user,
        session: authData.session,
        needsEmailConfirmation: !authData.session
      }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError('登録処理中にエラーが発生しました')
    }
  },

  async signIn(data: LoginFormData) {
    const supabase = createClient()
    
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
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
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError('ログイン処理中にエラーが発生しました')
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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        return null
      }

      return {
        id: profile.id,
        email: profile.email,
        firstName: profile.name,
        lastName: profile.last_name || '',
        gender: profile.gender,
        age: profile.age,
        nationality: profile.nationality,
        prefecture: profile.residence,
        city: profile.city || '',
        hobbies: profile.interests || [],
        selfIntroduction: profile.bio,
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

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    const supabase = createClient()
    
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    })
  }
}