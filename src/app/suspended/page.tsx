'use client'

import Link from 'next/link'

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f5ebe0]">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-8 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          アカウントが停止されています
        </h1>
        <p className="text-gray-600 mb-6 leading-relaxed">
          利用規約違反のため、アカウントが停止されました。<br />
          ご不明な点がある場合は、サポートまでお問い合わせください。
        </p>
        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full py-3 rounded-full border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ログイン画面へ戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
