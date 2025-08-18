'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, Mail, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

function RegisterCompleteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email')

  if (!email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">エラーが発生しました</h2>
            <p className="text-gray-600 mb-6">
              登録情報が見つかりません。<br />
              再度登録を行ってください。
            </p>
            <Link href="/signup">
              <Button className="w-full bg-sakura-600 hover:bg-sakura-700 text-white">
                登録画面に戻る
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">仮登録完了</h1>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">仮登録完了</h2>
              <p className="text-gray-600 mb-6">
                このたびはご登録いただき、誠にありがとうございます。
              </p>
            </div>

            {/* Email Verification Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">メール認証のお願い</h3>
                  <p className="text-blue-800 text-sm mb-2">
                    ご本人確認のため、メールアドレスに本登録URL を送らせていただいております。
                  </p>
                  <p className="font-medium text-blue-900 text-sm">
                    送信先: {email}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-sm text-gray-600">
              <p>
                メール本文に記載のあるURLにアクセスして本登録を完了させてください。
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">メールが確認できない場合</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• 迷惑メールフォルダ等をご確認ください。</li>
                      <li>• 再度ご登録のメールアドレスをご確認ください。</li>
                      <li>• ドメイン指定や迷惑メール設定をしている場合は解除後、お問い合わせフォームよりご連絡ください。</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 space-y-3">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  ログイン画面へ
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  トップページへ
                </Button>
              </Link>
            </div>

            {/* Help */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                ※ メール認証は24時間以内に完了してください
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterCompletePage() {
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
      <RegisterCompleteContent />
    </Suspense>
  )
}