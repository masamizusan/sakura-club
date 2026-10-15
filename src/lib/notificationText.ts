import type { SupportedLanguage } from '@/utils/language'

// 通知の表示文を、表示言語に合わせて組み立てる（#13）
// DB に保存されている title / message は変更しない（保存処理もそのまま）。
// type と data から組み立てられる通知だけを 4 言語で表示し、
// 組み立てられないものは保存された title / message をそのまま返す（安全側）。

export type NotificationForDisplay = {
  type: string
  title: string
  message: string
  data?: Record<string, unknown> | null
}

type NotificationDict = {
  matchTitle: string
  matchMessageWithName: (name: string) => string
  matchMessage: string
  sakuraLikeTitle: string
  sakuraLikeMessageWithName: (name: string) => string
  sakuraLikeMessage: string
  warningTitle: string
  suspendedTitle: string
  suspendedMessage: string
}

const DICT: Record<SupportedLanguage, NotificationDict> = {
  ja: {
    matchTitle: '新しいマッチ！',
    matchMessageWithName: (name) => `${name}さんとマッチしました！メッセージを送ってみましょう。`,
    matchMessage: 'マッチしました！メッセージを送ってみましょう。',
    sakuraLikeTitle: 'さくらいいねが届きました',
    sakuraLikeMessageWithName: (name) => `${name}さんからさくらいいねが届きました。プロフィールを見てみましょう。`,
    sakuraLikeMessage: 'さくらいいねが届きました。お相手のプロフィールを見てみましょう。',
    warningTitle: '⚠️ 警告',
    suspendedTitle: '🚫 アカウント停止',
    suspendedMessage: '規約違反のため、アカウントが停止されました。',
  },
  en: {
    matchTitle: "It's a match!",
    matchMessageWithName: (name) => `You matched with ${name}! Why not send a message?`,
    matchMessage: "It's a match! Why not send a message?",
    sakuraLikeTitle: 'You received a Sakura Like',
    sakuraLikeMessageWithName: (name) => `${name} sent you a Sakura Like. Take a look at their profile.`,
    sakuraLikeMessage: 'You received a Sakura Like. Take a look at their profile.',
    warningTitle: '⚠️ Warning',
    suspendedTitle: '🚫 Account suspended',
    suspendedMessage: 'Your account has been suspended for violating the Terms of Service.',
  },
  ko: {
    matchTitle: '새로운 매칭!',
    matchMessageWithName: (name) => `${name}님과 매칭되었습니다! 메시지를 보내 보세요.`,
    matchMessage: '매칭되었습니다! 메시지를 보내 보세요.',
    sakuraLikeTitle: '사쿠라 좋아요가 도착했습니다',
    sakuraLikeMessageWithName: (name) => `${name}님이 사쿠라 좋아요를 보냈습니다. 프로필을 확인해 보세요.`,
    sakuraLikeMessage: '사쿠라 좋아요가 도착했습니다. 상대방의 프로필을 확인해 보세요.',
    warningTitle: '⚠️ 경고',
    suspendedTitle: '🚫 계정 정지',
    suspendedMessage: '이용약관 위반으로 계정이 정지되었습니다.',
  },
  'zh-tw': {
    matchTitle: '新的配對！',
    matchMessageWithName: (name) => `您已與${name}配對成功！傳送訊息吧。`,
    matchMessage: '配對成功！傳送訊息吧。',
    sakuraLikeTitle: '您收到了櫻花讚',
    sakuraLikeMessageWithName: (name) => `${name}送給您櫻花讚。去看看對方的個人資料吧。`,
    sakuraLikeMessage: '您收到了櫻花讚。去看看對方的個人資料吧。',
    warningTitle: '⚠️ 警告',
    suspendedTitle: '🚫 帳號停權',
    suspendedMessage: '由於違反使用條款，您的帳號已被停權。',
  },
}

// 保存時に名前が無いと 'ユーザー' が入るため、名前なしとして扱う
const NAME_PLACEHOLDERS = new Set(['', 'ユーザー'])

export function formatNotification(
  notif: NotificationForDisplay,
  lang: SupportedLanguage
): { title: string; message: string } {
  const t = DICT[lang] ?? DICT.ja
  const data = notif.data ?? {}

  switch (notif.type) {
    case 'match': {
      // data.matched_user_name（保存時の名前）を使って組み立てる
      const rawName = typeof data.matched_user_name === 'string' ? data.matched_user_name.trim() : ''
      const message = NAME_PLACEHOLDERS.has(rawName) ? t.matchMessage : t.matchMessageWithName(rawName)
      return { title: t.matchTitle, message }
    }
    case 'like': {
      if (data.kind === 'sakura_like') {
        // data.from_user_name（送り主の名前）があれば名前入りの文にする
        const rawName = typeof data.from_user_name === 'string' ? data.from_user_name.trim() : ''
        if (!NAME_PLACEHOLDERS.has(rawName)) {
          return { title: t.sakuraLikeTitle, message: t.sakuraLikeMessageWithName(rawName) }
        }
        // 名前が無い（data に名前を残す前に届いた古い通知）：
        // 日本語なら保存された文（名前入り）をそのまま、それ以外は名前なしの定型文
        if (lang === 'ja') {
          return { title: notif.title, message: notif.message }
        }
        return { title: t.sakuraLikeTitle, message: t.sakuraLikeMessage }
      }
      break
    }
    case 'warning': {
      // 本文には違反したメッセージの抜粋や通報の理由（自由な文）と日時が入っており、
      // data が無いため組み立て直せない。本文は保存されたまま、見出しだけ 4 言語にする
      return { title: t.warningTitle, message: notif.message }
    }
    case 'suspended': {
      // 定型文のみ（admin/flags・admin/reports とも同じ固定文）
      return { title: t.suspendedTitle, message: t.suspendedMessage }
    }
    default:
      break
  }

  // system（問い合わせ受付・管理者向けの AI フラグ等）ほか：保存されたまま
  return { title: notif.title, message: notif.message }
}
