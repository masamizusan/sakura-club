import { createClient as createLegacyClient } from './supabase'
import { createClient as createSSRClient } from './supabase/client'
import { SignupFormData, LoginFormData } from './validations/auth'
import { logger } from '@/utils/logger'

/**
 * 認証用クライアントを取得
 * SSRクライアント（cookie同期）を優先使用
 */
function getAuthClient() {
  // ブラウザ環境ではSSRクライアントを使用（cookie同期のため）
  if (typeof window !== 'undefined') {
    return createSSRClient()
  }
  // サーバー環境ではレガシークライアントを使用
  return createLegacyClient()
}

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
    const supabase = getAuthClient()
    
    try {
      // 0. 既存ユーザーのクリーンアップ（「新しい紙」方式）
      // signup start
      
      // 🚫 REMOVED: Client-side admin API calls (causes 403 errors)
      // Admin operations should be done server-side only
      // クライアントサイドでのadmin API呼び出しを削除（403エラーの原因）
      // admin cleanup skipped
      
      // 1. Create auth user (完全に新しいユーザー)
      // creating new user
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

        // updating profile

        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdateData)
          .eq('user_id', authData.user.id)

        if (profileError) {
          logger.error('[AUTH] profile update error')
          throw new AuthError(`プロフィールの更新に失敗しました: ${profileError.message}`)
        }
      } else {
        // メール認証が必要な場合は、認証後に完了するため追加データを一時保存
        // email confirmation required
      }

      // 🔒 実ユーザーログインフラグ設定（signUpでもセッションがあれば設定）
      if (typeof window !== 'undefined' && authData.user && authData.session) {
        localStorage.setItem('sc_real_login_user', authData.user.id)
        localStorage.removeItem('sc_test_anon_done')
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
      const supabase = getAuthClient()

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      logger.debug('[AUTH] signIn:', !error ? 'success' : error?.message)

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new AuthError('メールアドレスまたはパスワードが正しくありません')
        }
        throw new AuthError(error.message)
      }

      // 🔒 CRITICAL: 実ユーザーログイン成功フラグを設定
      // ensureTestAnonSessionが実ユーザーのセッションを匿名で上書きするのを防止
      if (typeof window !== 'undefined' && authData.user) {
        localStorage.setItem('sc_real_login_user', authData.user.id)
        // 匿名セッション完了フラグをクリア（実ユーザーが優先）
        localStorage.removeItem('sc_test_anon_done')
      }

      return {
        user: authData.user,
        session: authData.session,
      }
    } catch (error) {
      logger.error('[AUTH] signIn error')
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError(`ログイン処理中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  async signOut() {
    const supabase = getAuthClient()

    try {
      // 🔒 ログアウト時に実ユーザーフラグをクリア
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sc_real_login_user')
        localStorage.removeItem('sc_test_anon_done')
      }
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

  // 🆕 テストモード検出機能
  isTestModeActive(): boolean {
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
  },

  // 🆕 匿名ログイン機能（テストモード用）- user_id固定対応
  async ensureTestAnonSession() {
    const supabase = getAuthClient()

    try {
      // GUARD 1: 実ユーザーがログイン済みなら匿名セッションを作らない
      if (typeof window !== 'undefined') {
        const realLoginUser = localStorage.getItem('sc_real_login_user')
        if (realLoginUser) {
          return { user: null, session: null }
        }

        // GUARD 2: edit/preview/mypageでは匿名化を禁止
        const pathname = window.location.pathname
        if (pathname.includes('/profile/edit') ||
            pathname.includes('/profile/preview') ||
            pathname.includes('/mypage')) {
          return { user: null, session: null }
        }
      }

      // 既存セッションチェック
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (session?.user) {
        return { user: session.user, session }
      }

      // localStorage保険フラグ
      if (typeof window !== 'undefined') {
        const anonDone = localStorage.getItem('sc_test_anon_done')
        if (anonDone === '1') {
          return { user: null, session: null }
        }
      }

      const { data, error } = await supabase.auth.signInAnonymously()

      if (error) {
        logger.error('[AUTH] anonymous sign-in failed:', error.message)
        throw new AuthError(`匿名ログインに失敗しました: ${error.message}`)
      }

      // 成功時の保険フラグ設定
      if (typeof window !== 'undefined') {
        localStorage.setItem('sc_test_anon_done', '1')
      }

      return { user: data.user, session: data.session }
    } catch (error) {
      if (error instanceof AuthError) {
        throw error
      }
      throw new AuthError('匿名ログイン処理中にエラーが発生しました')
    }
  },

  // 🆕 匿名ログイン機能（テストモード用）- 後方互換性
  async signInAnonymously() {
    return this.ensureTestAnonSession()
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = getAuthClient()
    
    try {
      // STEP 1: getSession()優先
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        logger.error('[AUTH] session error:', sessionError.message)
      }

      let user = session?.user || null

      // STEP 1.5: テストモード時は匿名ログイン実行（3重ガード）
      const realLoginUser = typeof window !== 'undefined' ? localStorage.getItem('sc_real_login_user') : null
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
      const isAnonBlockedRoute = currentPath.includes('/profile/edit') ||
                                  currentPath.includes('/profile/preview') ||
                                  currentPath.includes('/mypage')

      if (!user && !realLoginUser && this.isTestModeActive() && !isAnonBlockedRoute) {
        try {
          const { user: anonUser } = await this.ensureTestAnonSession()
          user = anonUser
        } catch {
          // Anonymous session ensure failed
        }
      }

      // STEP 2-3: getUser() fallback
      if (!user) {
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser()
          if (userError) {
            return null
          }
          user = userData.user
        } catch {
          return null
        }
      }

      if (!user) {
        return null
      }

      // STEP 4: プロフィール取得
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profileError || !profile) {
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

      // Return complete profile data
      logger.debug('[AUTH] profile loaded:', profile.id?.slice(0, 8))
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
      logger.error('[AUTH] getCurrentUser error')
      return null
    }
  },

  async resetPassword(email: string) {
    const supabase = getAuthClient()
    
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
    const supabase = getAuthClient()
    
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
    const supabase = getAuthClient()
    
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
    const supabase = getAuthClient()
    let lastUserId: string | null = null
    
    // 🆕 テストモード時も認証状態監視は継続（匿名ユーザーの状態変更を監視）
    const isTestMode = this.isTestModeActive()
    if (isTestMode) {
      // test mode monitoring
    }
    
    // 認証状態の変更を監視
    return supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      const currentUserId = session?.user?.id || null

      logger.debug('[AUTH] state:', event, currentUserId ? currentUserId.slice(0, 8) : 'none')
      
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