export default function HomePage() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#B91C1C', fontSize: '48px', marginBottom: '20px' }}>
        🌸 Sakura Club 🌸
      </h1>
      <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#374151' }}>
        文化体験を通じた真の出会い
      </h2>
      <p style={{ fontSize: '18px', color: '#6B7280', maxWidth: '600px', margin: '0 auto 40px auto' }}>
        訪日外国人男性と日本人女性が茶道・書道・料理教室などの文化体験を通じて
        自然な出会いを楽しめる、健全で信頼性の高いWebプラットフォームです。
      </p>
      <div style={{ marginTop: '40px' }}>
        <p style={{ fontSize: '20px', color: '#059669', fontWeight: 'bold' }}>
          ✅ サイトが正常に動作しています！
        </p>
        <p style={{ fontSize: '16px', color: '#6B7280', marginTop: '10px' }}>
          デプロイメント成功 - {new Date().toLocaleString('ja-JP')}
        </p>
      </div>
    </div>
  )
}