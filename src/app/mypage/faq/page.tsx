'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'

const SECTION_IDS = ['registration', 'age', 'translation', 'matching', 'security'] as const
type SectionId = typeof SECTION_IDS[number]
type FaqItem = { q: string; a: string }

type Dict = {
  // ナビゲーション
  backToMyPage: string
  pageTitle: string
  // 上部 CTA(3断片構造)
  ctaPrefix: string
  ctaLinkText: string
  ctaSuffix: string
  // 下部 CTA カード
  bottomCtaText: string
  bottomCtaButton: string
  // Q&A プレフィックス
  qPrefix: string
  aPrefix: string
  // セクションタイトル
  sectionTitles: Record<SectionId, string>
  // Q&A コンテンツ
  faqs: Record<SectionId, FaqItem[]>
}

const T: Record<SupportedLanguage, Dict> = {
  ja: {
    backToMyPage: '← マイページに戻る',
    pageTitle: 'よくある質問',
    ctaPrefix: '解決しない場合は',
    ctaLinkText: 'お問い合わせ',
    ctaSuffix: 'からご連絡ください',
    bottomCtaText: '解決しない場合はお問い合わせください',
    bottomCtaButton: 'お問い合わせ',
    qPrefix: 'Q. ',
    aPrefix: 'A. ',
    sectionTitles: {
      registration: '登録について',
      age: '年齢確認について',
      translation: 'メッセージ・翻訳について',
      matching: 'マッチングについて',
      security: '安全・セキュリティについて',
    },
    faqs: {
      registration: [
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
      age: [
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
      translation: [
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
      matching: [
        {
          q: 'いいねを送ると相手に通知されますか？',
          a: 'はい、いいねを送ると相手に通知が届きます。相手が返信していいねをしてくれるとマッチング成立となり、メッセージのやり取りが可能になります。',
        },
        {
          q: '1日に送れるいいねの数は？',
          a: '無料ユーザーは1日に一定数のいいねを送ることができます。制限数はプランにより異なります。',
        },
      ],
      security: [
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
  },
  en: {
    backToMyPage: '← Back to My Page',
    pageTitle: 'Frequently Asked Questions',
    ctaPrefix: "If your question isn't answered here, please ",
    ctaLinkText: 'contact us',
    ctaSuffix: '.',
    bottomCtaText: 'Still need help? Contact us directly.',
    bottomCtaButton: 'Contact Us',
    qPrefix: 'Q. ',
    aPrefix: 'A. ',
    sectionTitles: {
      registration: 'Registration',
      age: 'Age Verification',
      translation: 'Messages & Translation',
      matching: 'Matching',
      security: 'Safety & Security',
    },
    faqs: {
      registration: [
        {
          q: 'Is it really free for Japanese women?',
          a: 'Yes. Japanese women can use all features free of charge — registration, age verification, and messaging. There are no costs at all.',
        },
        {
          q: 'What features are included in the paid plan for foreign men?',
          a: 'After matching, you can send and receive messages, share photos, and use real-time translation. Sending likes and viewing profiles are available for free.',
        },
        {
          q: 'Which nationalities and countries can register?',
          a: 'Japanese women, and foreign men who live in or plan to visit Japan, are welcome. You must be 18 years or older.',
        },
      ],
      age: [
        {
          q: 'Why is age verification required?',
          a: 'To keep the service safe, we ask all users to verify their age. People under 18 cannot use the service.',
        },
        {
          q: 'How is my ID information handled?',
          a: 'Your ID is used only for age verification and is never shared with third parties. After verification, it is stored in encrypted form.',
        },
        {
          q: 'What kinds of ID are accepted?',
          a: "Official IDs that show your date of birth — such as a passport, driver's license, or My Number Card — are accepted.",
        },
        {
          q: 'How long does the review take?',
          a: 'We combine automatic AI review with a human check. It usually completes within 24 hours, but during busy periods it may take up to 72 hours.',
        },
      ],
      translation: [
        {
          q: 'How does the translation feature work?',
          a: 'After typing your message, tap the "Confirm Translation" button to see a preview translated into the other person\'s language. You can then tap send to deliver it.',
        },
        {
          q: 'In which language are received messages shown?',
          a: 'Messages from the other person are automatically translated into your language. You can also tap "Show Original" to see the original text.',
        },
        {
          q: 'Can I send photos?',
          a: 'Yes, you can send photos from the chat screen. Photos you send are visible only to the recipient.',
        },
      ],
      matching: [
        {
          q: 'Does the other person get notified when I send a like?',
          a: 'Yes. When you send a like, the other person receives a notification. If they like you back, you have a match and can start exchanging messages.',
        },
        {
          q: 'How many likes can I send per day?',
          a: 'Free users can send a set number of likes per day. The limit depends on your plan.',
        },
      ],
      security: [
        {
          q: 'Can someone I have blocked still see my information?',
          a: 'Blocked users are not notified, and your profile, messages, and footprints become hidden from each other across all pages.',
        },
        {
          q: 'How do I report a suspicious user?',
          a: 'Tap the "..." menu in the top-right of the chat screen or profile screen and choose "Report." Select a reason and submit.',
        },
        {
          q: 'Can anyone view my profile?',
          a: 'Only registered and age-verified users can view profiles. Your email address and personal details are never shown to other users.',
        },
      ],
    },
  },
  ko: {
    backToMyPage: '← 마이페이지로 돌아가기',
    pageTitle: '자주 묻는 질문',
    ctaPrefix: '해결되지 않으시면 ',
    ctaLinkText: '문의하기',
    ctaSuffix: '에서 연락 주세요',
    bottomCtaText: '해결되지 않으시면 문의해 주세요',
    bottomCtaButton: '문의하기',
    qPrefix: 'Q. ',
    aPrefix: 'A. ',
    sectionTitles: {
      registration: '가입에 대하여',
      age: '연령 확인에 대하여',
      translation: '메시지 · 번역에 대하여',
      matching: '매칭에 대하여',
      security: '안전 · 보안에 대하여',
    },
    faqs: {
      registration: [
        {
          q: '일본인 여성은 정말 무료인가요?',
          a: '네, 일본인 여성은 모든 기능을 무료로 이용하실 수 있습니다. 가입, 연령 확인, 메시지 주고받기까지 일체의 비용이 들지 않습니다.',
        },
        {
          q: '외국 국적 남성의 유료 플랜에 포함되는 기능은?',
          a: '매칭 후 메시지 송수신, 사진 전송, 실시간 번역 기능을 이용하실 수 있습니다. 좋아요 보내기와 프로필 열람은 무료로도 이용 가능합니다.',
        },
        {
          q: '가입 가능한 국적 · 국가는?',
          a: '일본인 여성과 일본 거주 또는 방문 예정인 외국 국적 남성이 이용하실 수 있습니다. 18세 이상이 대상입니다.',
        },
      ],
      age: [
        {
          q: '연령 확인은 왜 필요한가요?',
          a: '안전한 서비스 제공을 위해 모든 사용자에게 연령 확인을 요청하고 있습니다. 18세 미만은 이용하실 수 없습니다.',
        },
        {
          q: '신분증 정보는 어떻게 관리되나요?',
          a: '신분증은 연령 확인에만 사용되며 제삼자에게 공유되지 않습니다. 확인 완료 후에는 암호화되어 보관됩니다.',
        },
        {
          q: '연령 확인에 사용할 수 있는 신분증은?',
          a: '여권, 운전면허증, 마이넘버카드 등 생년월일이 기재된 공적 신분증을 이용하실 수 있습니다.',
        },
        {
          q: '심사에 얼마나 시간이 걸리나요?',
          a: 'AI 자동 심사와 사람의 체크를 결합하고 있습니다. 보통 24시간 이내에 완료되지만 혼잡 시 최대 72시간이 걸리는 경우가 있습니다.',
        },
      ],
      translation: [
        {
          q: '번역 기능은 어떻게 사용하나요?',
          a: '메시지 입력 후 "번역 확인" 버튼을 누르면 상대방의 언어로 번역된 미리보기가 표시됩니다. 확인 후 전송 버튼으로 보낼 수 있습니다.',
        },
        {
          q: '상대방의 메시지는 어느 언어로 표시되나요?',
          a: '상대방의 메시지는 자동으로 당신의 언어로 번역되어 표시됩니다. "원문 보기" 버튼으로 원래 언어도 확인할 수 있습니다.',
        },
        {
          q: '사진을 보낼 수 있나요?',
          a: '네, 채팅 화면에서 사진을 보낼 수 있습니다. 보낸 사진은 상대방만 볼 수 있습니다.',
        },
      ],
      matching: [
        {
          q: '좋아요를 보내면 상대방에게 알림이 가나요?',
          a: '네, 좋아요를 보내면 상대방에게 알림이 갑니다. 상대방도 좋아요를 답해 주면 매칭이 성립되어 메시지를 주고받을 수 있게 됩니다.',
        },
        {
          q: '하루에 보낼 수 있는 좋아요 수는?',
          a: '무료 사용자는 하루에 일정 수의 좋아요를 보낼 수 있습니다. 제한 수는 플랜에 따라 다릅니다.',
        },
      ],
      security: [
        {
          q: '차단한 상대방에게 내 정보가 보이나요?',
          a: '차단한 상대방에게는 알림이 가지 않으며, 서로의 프로필 · 메시지 · 발자취가 모든 페이지에서 비표시됩니다.',
        },
        {
          q: '의심스러운 사용자를 신고하려면?',
          a: '채팅 화면 또는 프로필 화면 우측 상단의 "..." 메뉴에서 "신고하기"를 선택해 주세요. 사유를 선택하여 보낼 수 있습니다.',
        },
        {
          q: '프로필 정보는 누구나 볼 수 있나요?',
          a: '가입 · 연령 확인을 마친 사용자만 프로필을 열람할 수 있습니다. 이메일 주소나 개인 정보는 다른 사용자에게 표시되지 않습니다.',
        },
      ],
    },
  },
  'zh-tw': {
    backToMyPage: '← 返回個人頁面',
    pageTitle: '常見問題',
    ctaPrefix: '若未解決請從',
    ctaLinkText: '聯絡我們',
    ctaSuffix: '與我們聯繫',
    bottomCtaText: '若未解決請與我們聯絡',
    bottomCtaButton: '聯絡我們',
    qPrefix: 'Q. ',
    aPrefix: 'A. ',
    sectionTitles: {
      registration: '關於註冊',
      age: '關於年齡驗證',
      translation: '關於訊息與翻譯',
      matching: '關於配對',
      security: '關於安全與保安',
    },
    faqs: {
      registration: [
        {
          q: '日本女性真的免費嗎?',
          a: '是的,日本女性可以免費使用所有功能。從註冊、年齡驗證到訊息往來,完全不收取任何費用。',
        },
        {
          q: '外國籍男性的付費方案包含哪些功能?',
          a: '配對後可使用訊息收發、照片傳送、即時翻譯功能。發送喜歡和瀏覽個人資料則可免費使用。',
        },
        {
          q: '可以註冊的國籍・國家有哪些?',
          a: '日本女性,以及居住在日本或計劃造訪日本的外國籍男性皆可使用。對象為18歲以上者。',
        },
      ],
      age: [
        {
          q: '為什麼需要年齡驗證?',
          a: '為了提供安全的服務,我們請所有使用者進行年齡驗證。未滿18歲者無法使用。',
        },
        {
          q: '身分證資料如何管理?',
          a: '身分證僅用於年齡驗證,不會與第三方共享。驗證完成後會以加密形式保存。',
        },
        {
          q: '可以用於年齡驗證的身分證有哪些?',
          a: '護照、駕照、My Number Card 等記載出生年月日的公家身分證皆可使用。',
        },
        {
          q: '審查需要多少時間?',
          a: '我們結合 AI 自動審查與人工檢查。通常在24小時內完成,但繁忙時最長可能需要72小時。',
        },
      ],
      translation: [
        {
          q: '翻譯功能如何使用?',
          a: '輸入訊息後按下「確認翻譯」按鈕,會顯示翻譯成對方語言的預覽。確認後可按送出按鈕傳送。',
        },
        {
          q: '對方的訊息會以哪種語言顯示?',
          a: '對方的訊息會自動翻譯成您的語言顯示。可透過「顯示原文」按鈕查看原始語言。',
        },
        {
          q: '可以傳送照片嗎?',
          a: '是的,可以從聊天畫面傳送照片。傳送的照片僅有對方可以瀏覽。',
        },
      ],
      matching: [
        {
          q: '送出喜歡後對方會收到通知嗎?',
          a: '是的,送出喜歡後對方會收到通知。對方也回送喜歡時即配對成立,可以開始互傳訊息。',
        },
        {
          q: '一天可以送出的喜歡數量是?',
          a: '免費使用者一天可以送出一定數量的喜歡。上限因方案而異。',
        },
      ],
      security: [
        {
          q: '已封鎖的對象能看到我的資訊嗎?',
          a: '已封鎖的對象不會收到通知,雙方的個人資料、訊息、足跡都會在所有頁面中隱藏。',
        },
        {
          q: '如何檢舉可疑使用者?',
          a: '請從聊天畫面或個人資料畫面右上方的「・・・」選單中選擇「檢舉」。可選擇原因後送出。',
        },
        {
          q: '個人資料任何人都看得到嗎?',
          a: '僅完成註冊與年齡驗證的使用者可瀏覽個人資料。電子郵件等個人資訊不會顯示給其他使用者。',
        },
      ],
    },
  },
}

export default function FaqPage() {
  const router = useRouter()
  const { currentLanguage } = useLanguage()
  const t = T[currentLanguage] ?? T.ja
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
        {t.backToMyPage}
      </button>

      <h1 style={{ fontFamily: 'Shippori Mincho B1, serif', color: '#2c1810', fontSize: '22px', marginBottom: '0.5rem' }}>
        {t.pageTitle}
      </h1>
      <p style={{ fontSize: '13px', color: '#6b4c3b', marginBottom: '1.5rem' }}>
        {t.ctaPrefix}
        <button
          onClick={() => router.push('/mypage/contact')}
          style={{ background: 'none', border: 'none', color: '#8b1a2e', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px', padding: '0 2px' }}
        >
          {t.ctaLinkText}
        </button>
        {t.ctaSuffix}
      </p>

      {SECTION_IDS.map((sid) => (
        <div key={sid} style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontFamily: 'Shippori Mincho B1, serif',
            color: '#8b1a2e',
            fontSize: '15px',
            marginBottom: '0.75rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #d4a89a',
          }}>
            {t.sectionTitles[sid]}
          </h2>
          {t.faqs[sid].map((item, i) => {
            const key = `${sid}-${i}`
            const isOpen = openFaq === key
            return (
              <div key={key} style={{ marginBottom: '0.5rem' }}>
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
                  <span>{t.qPrefix}{item.q}</span>
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
                    {t.aPrefix}{item.a}
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
          {t.bottomCtaText}
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
          {t.bottomCtaButton}
        </button>
      </div>
    </div>
  )
}
