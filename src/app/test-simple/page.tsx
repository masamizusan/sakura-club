export default function SimpleTestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold text-pink-600 mb-4">🌸 SAKURA CLUB</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">動作確認テスト</h2>
        <div className="space-y-2 text-green-600">
          <p>✅ Next.js アプリケーション起動成功</p>
          <p>✅ Vercel デプロイ成功</p>
          <p>✅ 環境変数設定完了</p>
          <p>✅ 基本ページレンダリング成功</p>
        </div>
        <p className="text-gray-600 mt-4">
          現在時刻: {new Date().toLocaleString('ja-JP')}
        </p>
      </div>
    </div>
  )
}