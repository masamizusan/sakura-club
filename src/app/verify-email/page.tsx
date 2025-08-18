'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { authService } from '@/lib/auth'
import Link from 'next/link'

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired'

function VerifyEmailContent() {
  const [status, setStatus] = useState<VerificationStatus>('loading')
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token || !email) {
        setStatus('error')
        setError('認証URLが無効です')
        return
      }

      try {
        const result = await authService.verifyOtp({
          email: email,
          token: token,
          type: 'signup'
        })
        
        setStatus('success')
        
        // ユーザー情報を取得して性別に応じて遷移先を決定
        setTimeout(async () => {
          try {
            const user = await authService.getCurrentUser()
            if (user?.gender === 'male') {
              router.push('/profile/edit?type=foreign-male')
            } else {
              router.push('/profile/edit?type=japanese-female')
            }
          } catch (error) {
            // エラーの場合はデフォルトのプロフィール編集画面に遷移
            router.push('/profile/edit')
          }
        }, 3000)
      } catch (error: any) {
        console.error('Email verification error:', error)
        if (error.message?.includes('expired')) {
          setStatus('expired')
        } else {
          setStatus('error')
          setError('認証に失敗しました。URLが無効または期限切れの可能性があります。')
        }
      }
    }

    verifyEmail()
  }, [token, email, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">メール認証中</h2>
            <p className="text-gray-600">
              認証処理を行っています...<br />
              しばらくお待ちください。
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">本登録完了</h2>
            <p className="text-gray-600 mb-6">
              メールアドレスの認証が完了しました！<br />
              Sakura Clubへようこそ🌸
            </p>
            <div className="bg-sakura-50 border border-sakura-200 rounded-lg p-4 mb-6">
              <p className="text-sakura-800 text-sm">
                プロフィール編集画面に自動で移動します...<br />
                <span className="text-xs text-sakura-600">3秒後に自動転送</span>
              </p>
            </div>
            <Button 
              onClick={async () => {
                try {
                  const user = await authService.getCurrentUser()
                  if (user?.gender === 'male') {
                    router.push('/profile/edit?type=foreign-male')
                  } else {
                    router.push('/profile/edit?type=japanese-female')
                  }
                } catch (error) {
                  router.push('/profile/edit')
                }
              }}
              className="w-full bg-sakura-600 hover:bg-sakura-700 text-white"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              プロフィール編集へ進む
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {status === 'expired' ? '認証期限切れ' : '認証エラー'}
          </h2>
          <p className="text-gray-600 mb-6">
            {status === 'expired' 
              ? '認証URLの有効期限が切れています。再度登録を行ってください。'
              : error || '認証に失敗しました。もう一度お試しください。'
            }
          </p>
          <div className="space-y-3">
            <Link href="/signup">
              <Button className="w-full bg-sakura-600 hover:bg-sakura-700 text-white">
                再登録する
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                ログイン画面へ
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">読み込み中</h2>
            <p className="text-gray-600">
              しばらくお待ちください...
            </p>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}