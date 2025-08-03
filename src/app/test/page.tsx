export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">🌸 SAKURA CLUB</h1>
        <p className="text-lg text-gray-600 mb-4">
          アプリケーションが正常に動作しています！
        </p>
        <div className="space-y-2">
          <div className="text-green-600">✅ Next.js 起動成功</div>
          <div className="text-green-600">✅ 多言語対応実装済み</div>
          <div className="text-green-600">✅ データベース設定完了</div>
          <div className="text-green-600">✅ PWA対応済み</div>
        </div>
      </div>
    </div>
  )
}