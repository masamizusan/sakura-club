'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const faqs = [
  {
    category: '登録について',
    items: [
      {
        q: '日本人女性は本当に無料ですか？',
        a: 'はい、日本人女性は全機能を無料でご利用いただけます。登録から年齢確認、メッセージのやり取りまで、一切費用はかかりません。',
      },
      {
        q: '外国籍男性の有料プランに含まれる機能は？',
        a: 'マッチング後のメッセージ送受信、写真送信、リアルタイム翻訳機能がご利用いただけます。いいね送信やプロフィール閲覧は無料でもご利用いただけます。',
      },
      {
        q: '登録できる国籍・国は？',
        a: '日本人女性と、日本在住または訪問予定の外国籍男性がご利用いただけます。18歳以上の方が対象です。',
      },
    ],
  },
  {
    category: '年齢確認について',
    items: [
      {
        q: '年齢確認はなぜ必要ですか？',
        a: '安全なサービス提供のため、全てのユーザーに年齢確認をお願いしています。18歳未満の方はご利用いただけません。',
      },
      {
        q: '身分証の情報はどのように管理されますか？',
        a: '身分証は年齢確認のみに使用され、第三者に共有されることはありません。確認完了後は暗号化して保管されます。',
      },
      {
        q: '年齢確認に使える身分証は？',
        a: 'パスポート、運転免許証、マイナンバーカードなど、生年月日が記載された公的身分証をご利用いただけます。',
      },
      {
        q: '審査にどのくらい時間がかかりますか？',
        a: 'AIによる自動審査と人によるチェックを組み合わせています。通常24時間以内に完了しますが、混雑時は最大72時間かかる場合があります。',
      },
    ],
  },
  {
    category: 'メッセージ・翻訳について',
    items: [
      {
        q: '翻訳機能はどのように使いますか？',
        a: 'メッセージ入力後に「翻訳確認」ボタンをタップすると、相手の言語に翻訳されたプレビューが表示されます。確認後に送信ボタンで送信できます。',
      },
      {
        q: '相手のメッセージはどの言語で表示されますか？',
        a: '相手のメッセージは自動的にあなたの言語に翻訳されて表示されます。「原文を表示」ボタンで元の言語も確認できます。',
      },
      {
        q: '写真を送ることはできますか？',
        a: 'はい、チャット画面から写真を送信できます。送信した写真は相手のみ閲覧可能です。',
      },
    ],
  },
  {
    category: 'マッチングについて',
    items: [
      {
        q: 'いいねを送ると相手に通知されますか？',
        a: 'はい、いいねを送ると相手に通知が届きます。相手が返信していいねをしてくれるとマッチング成立となり、メッセージのやり取りが可能になります。',
      },
      {
        q: '1日に送れるいいねの数は？',
        a: '無料ユーザーは1日に一定数のいいねを送ることができます。制限数はプランにより異なります。',
      },
    ],
  },
  {
    category: '安全・セキュリティについて',
    items: [
      {
        q: 'ブロックした相手に自分の情報は見えますか？',
        a: 'ブロックした相手には通知されず、お互いのプロフィール・メッセージ・足跡が全ページで非表示になります。',
      },
      {
        q: '不審なユーザーを通報するには？',
        a: 'チャット画面またはプロフィール画面右上の「・・・」メニューから「通報する」を選択してください。理由を選択して送信できます。',
      },
      {
        q: 'プロフィールの情報は誰でも見られますか？',
        a: '登録・年齢確認済みのユーザーのみプロフィールを閲覧できます。メールアドレスや個人情報は他のユーザーには表示されません。',
      },
    ],
  },
]

export default function FaqPage() {
  const router = useRouter()
  const [openFaq, setOpenFaq] = useState<string | null>(null)

  const toggleFaq = (key: string) => {
    setOpenFaq(prev => prev === key ? null : key)
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem', background: '#f5ebe0', minHeight: '100vh' }}>
      {/* 戻るボタン */}
      <button
        onClick={() => router.push('/mypage')}
        style={{ background: 'none', border: 'none', color: '#6b4c3b', cursor: 'pointer', marginBottom: '1rem', fontSize: '14px' }}
      >
        ← マイページに戻る
      </button>

      <h1 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', fontSize: '22px', marginBottom: '0.5rem' }}>
        よくある質問
      </h1>
      <p style={{ fontSize: '13px', color: '#6b4c3b', marginBottom: '1.5rem' }}>
        解決しない場合は
        <button
          onClick={() => router.push('/mypage/contact')}
          style={{ background: 'none', border: 'none', color: '#8b1a2e', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px', padding: '0 2px' }}
        >
          お問い合わせ
        </button>
        からご連絡ください
      </p>

      {faqs.map(section => (
        <div key={section.category} style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontFamily: 'Shippori Mincho B1, serif',
            color: '#8b1a2e',
            fontSize: '15px',
            marginBottom: '0.75rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #d4a89a',
          }}>
            {section.category}
          </h2>
          {section.items.map((item, i) => {
            const key = `${section.category}-${i}`
            const isOpen = openFaq === key
            return (
              <div key={i} style={{ marginBottom: '0.5rem' }}>
                <button
                  onClick={() => toggleFaq(key)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: isOpen ? '#fff8f5' : '#fdf6ef',
                    border: `1px solid ${isOpen ? '#8b1a2e' : '#d4a89a'}`,
                    borderRadius: isOpen ? '0.5rem 0.5rem 0 0' : '0.5rem',
                    padding: '0.875rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: 'Shippori Mincho B1, serif',
                    color: '#2c1810',
                    fontSize: '14px',
                    gap: '8px',
                  }}
                >
                  <span>Q. {item.q}</span>
                  <span style={{ flexShrink: 0, color: '#8b1a2e', fontSize: '12px' }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </button>
                {isOpen && (
                  <div style={{
                    background: '#fff',
                    border: '1px solid #8b1a2e',
                    borderTop: 'none',
                    borderRadius: '0 0 0.5rem 0.5rem',
                    padding: '1rem',
                    fontSize: '13px',
                    color: '#6b4c3b',
                    lineHeight: 1.8,
                  }}>
                    A. {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {/* 解決しない場合 */}
      <div style={{
        background: '#fff',
        borderRadius: '1rem',
        padding: '1.5rem',
        border: '1px solid #d4a89a',
        textAlign: 'center',
        marginTop: '1rem',
      }}>
        <p style={{ fontSize: '13px', color: '#6b4c3b', marginBottom: '1rem' }}>
          解決しない場合はお問い合わせください
        </p>
        <button
          onClick={() => router.push('/mypage/contact')}
          style={{
            background: '#8b1a2e',
            color: '#fff',
            borderRadius: '9999px',
            padding: '12px 32px',
            border: 'none',
            fontFamily: 'Shippori Mincho B1, serif',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          お問い合わせ
        </button>
      </div>
    </div>
  )
}
