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
          .eq('user_id', authData.user.id)

        if (profileError) {
          console.error('Profile update error:', profileError)
          throw new AuthError(`プロフィールの更新に失敗しました: ${profileError.message}`)
        }
      } else {
        // メール認証が必要な場合は、認証後に完了するため追加データを一時保存
        console.log('Email confirmation required, profile will be updated after verification')
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
    const supabase = createClient()

    try {
      // 🚨 CRITICAL GUARD 1: 実ユーザーがログイン済みなら匿名セッションを絶対に作らない
      if (typeof window !== 'undefined') {
        const realLoginUser = localStorage.getItem('sc_real_login_user')
        if (realLoginUser) {
          console.log('🔒 ensureTestAnonSession: 実ユーザーログイン済み - anonymous sign-in 完全スキップ', {
            realUserId: realLoginUser.slice(0, 8),
            skipReason: 'REAL_USER_LOGGED_IN'
          })
          return { user: null, session: null }
        }

        // 🚨 CRITICAL GUARD 2: edit/preview/mypageでは匿名化を絶対に禁止
        const pathname = window.location.pathname
        if (pathname.includes('/profile/edit') ||
            pathname.includes('/profile/preview') ||
            pathname.includes('/mypage')) {
          console.log('🔒 ensureTestAnonSession: 匿名禁止ルート - 完全スキップ', {
            route: pathname,
            skipReason: 'BLOCKED_ROUTE'
          })
          return { user: null, session: null }
        }
      }

      // 🛡️ CRITICAL FIX: 既存セッションチェック - 重複実行防止
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (session?.user) {
        console.log('🔒 ensureTestAnonSession: 既存セッション発見 - anonymous sign-in スキップ', {
          userId: session.user.id,
          skipReason: 'SESSION_EXISTS'
        })
        return { user: session.user, session }
      }

      // 🛡️ CRITICAL FIX: localStorage保険フラグで絶対スキップ（増殖防止）
      if (typeof window !== 'undefined') {
        const anonDone = localStorage.getItem('sc_test_anon_done')
        if (anonDone === '1') {
          console.log('🔒 ensureTestAnonSession: localStorage保険フラグ発見 - 絶対スキップ（増殖防止）')
          return { user: null, session: null }
        }
      }

      console.log('🧪 ensureTestAnonSession: 新規anonymous sign-in実行...')
      const { data, error } = await supabase.auth.signInAnonymously()

      if (error) {
        console.error('❌ Anonymous sign-in failed:', error)
        throw new AuthError(`匿名ログインに失敗しました: ${error.message}`)
      }

      // 🔒 成功時の保険フラグ設定
      if (typeof window !== 'undefined') {
        localStorage.setItem('sc_test_anon_done', '1')
      }

      console.log('✅ ensureTestAnonSession: 新規anonymous sign-in成功', {
        userId: data.user?.id,
        sessionExists: !!data.session
      })
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
    const supabase = createClient()
    
    try {
      // 🔧 STEP 1: getSession()優先 - 軽量で403エラーなし
      console.log('🔄 Getting session first (no 403 risk)')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('🚨 Session error details:', {
          message: sessionError.message,
          status: sessionError.status || 'unknown',
          name: sessionError.name || 'unknown',
          stack: sessionError.stack || 'no stack'
        })
        
        // 🚨 CRITICAL: refresh_token 400エラーの特別処理
        if (sessionError.message?.includes('refresh_token') || sessionError.status === 400) {
          console.error('🛑 REFRESH_TOKEN 400 ERROR DETECTED:', sessionError)
        }
      }
      
      let user = session?.user || null
      
      // 🆕 STEP 1.5: テストモード時はセッション無しで匿名ログイン実行（user_id固定版）
      // 🚨 CRITICAL: 3重ガードで匿名化事故を根絶
      //   ガード1: sc_real_login_user === true → 完全スキップ
      //   ガード2: isTestModeActive() !== true → スキップ
      //   ガード3: 匿名禁止ルート（edit/preview/mypage）→ スキップ
      const realLoginUser = typeof window !== 'undefined' ? localStorage.getItem('sc_real_login_user') : null
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
      const isAnonBlockedRoute = currentPath.includes('/profile/edit') ||
                                  currentPath.includes('/profile/preview') ||
                                  currentPath.includes('/mypage')

      if (!user && !realLoginUser && this.isTestModeActive() && !isAnonBlockedRoute) {
        console.log('🧪 Test mode detected with no session - ensuring anonymous session', {
          route: currentPath,
          isBlockedRoute: false
        })
        try {
          const { user: anonUser } = await this.ensureTestAnonSession()
          user = anonUser
        } catch (error) {
          console.error('❌ Anonymous session ensure failed, proceeding with null user:', error)
        }
      } else if (!user && (realLoginUser || isAnonBlockedRoute)) {
        console.log('🔒 getCurrentUser: 匿名セッション生成を禁止', {
          realLoginUser: realLoginUser?.slice(0, 8),
          isAnonBlockedRoute,
          route: currentPath,
          reason: realLoginUser ? 'REAL_USER_LOGGED_IN' : 'BLOCKED_ROUTE'
        })
      }
      
      // 🔧 STEP 2: セッションでユーザー取得できた場合
      if (user) {
        console.log('✅ User from session:', { id: user.id, email: user.email, hasSession: true })
      } else {
        console.log('❌ No user in session, trying getUser() fallback')
        
        // 🔧 STEP 3: fallbackとしてgetUser()（403は握りつぶす）
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser()
          
          if (userError) {
            if (userError.status === 403 || String(userError.status) === '403') {
              console.log('🛡️ getUser() returned 403 - handled gracefully, returning null')
              return null
            }
            console.log('getUser() other error:', userError.message)
            return null
          }
          
          user = userData.user
          console.log('✅ User from getUser() fallback:', { id: user?.id, email: user?.email })
        } catch (error: any) {
          if (error.status === 403 || String(error.status) === '403') {
            console.log('🛡️ getUser() threw 403 - handled gracefully, returning null')
            return null
          }
          console.log('getUser() threw error:', error.message)
          return null
        }
      }
      
      if (!user) {
        console.log('❌ No user found via session or getUser()')
        return null
      }

      // 🔧 STEP 4: プロフィール取得
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // If profile doesn't exist, return basic user info
      if (profileError || !profile) {
        console.log('⚠️ No profile found for user, returning basic auth info:', user.id)
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
      console.log('✅ Complete user profile loaded:', { id: profile.id, name: profile.name })
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
      console.error('❌ Error in getCurrentUser:', error)
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
    
    // 🆕 テストモード時も認証状態監視は継続（匿名ユーザーの状態変更を監視）
    const isTestMode = this.isTestModeActive()
    if (isTestMode) {
      console.log('🧪 Test mode detected - monitoring anonymous auth state')
    }
    
    // 認証状態の変更を監視（重複コールバックを防ぐ）
    return supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUserId = session?.user?.id || null
      
      console.log('🔍 Auth state change:', { 
        event, 
        hasSession: !!session, 
        hasUser: !!session?.user,
        currentUserId,
        lastUserId,
        shouldUpdate: currentUserId !== lastUserId
      })
      
      // 🚨 CRITICAL: refresh_token エラーの詳細ログ
      if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed successfully')
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 Signed out event')
      }
      
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