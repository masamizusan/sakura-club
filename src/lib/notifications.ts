import { createClient } from '@/lib/supabase/server'

export type NotificationType = 'match' | 'message' | 'experience_invitation' | 'experience_reminder' | 'review_request' | 'system'

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
}

export class NotificationService {
  private supabase = createClient()

  async createNotification({
    userId,
    type,
    title,
    message,
    data = {}
  }: CreateNotificationParams) {
    try {
      const { data: notification, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          data,
          is_read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create notification:', error)
        return null
      }

      return notification
    } catch (error) {
      console.error('Notification creation error:', error)
      return null
    }
  }

  // マッチ通知を作成
  async createMatchNotification(userId: string, matchedUserName: string, matchedUserId: string) {
    return this.createNotification({
      userId,
      type: 'match',
      title: '新しいマッチ！',
      message: `${matchedUserName}さんとマッチしました！メッセージを送ってみましょう。`,
      data: {
        matched_user_id: matchedUserId,
        matched_user_name: matchedUserName
      }
    })
  }

  // メッセージ通知を作成
  async createMessageNotification(
    userId: string, 
    senderName: string, 
    senderId: string, 
    conversationId: string,
    messagePreview: string
  ) {
    return this.createNotification({
      userId,
      type: 'message',
      title: '新しいメッセージ',
      message: `${senderName}さんからメッセージが届きました: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
      data: {
        sender_id: senderId,
        sender_name: senderName,
        conversation_id: conversationId,
        message_preview: messagePreview
      }
    })
  }

  // 体験招待通知を作成
  async createExperienceInvitationNotification(
    userId: string, 
    experienceTitle: string, 
    experienceId: string,
    inviterName: string
  ) {
    return this.createNotification({
      userId,
      type: 'experience_invitation',
      title: '体験への招待',
      message: `${inviterName}さんから「${experienceTitle}」への参加招待が届きました。`,
      data: {
        experience_id: experienceId,
        experience_title: experienceTitle,
        inviter_name: inviterName
      }
    })
  }

  // 体験リマインダー通知を作成
  async createExperienceReminderNotification(
    userId: string, 
    experienceTitle: string, 
    experienceId: string,
    experienceDate: string
  ) {
    return this.createNotification({
      userId,
      type: 'experience_reminder',
      title: '体験のリマインダー',
      message: `明日開催予定の「${experienceTitle}」の準備はお済みですか？`,
      data: {
        experience_id: experienceId,
        experience_title: experienceTitle,
        experience_date: experienceDate
      }
    })
  }

  // レビュー依頼通知を作成
  async createReviewRequestNotification(
    userId: string, 
    experienceTitle: string, 
    experienceId: string
  ) {
    return this.createNotification({
      userId,
      type: 'review_request',
      title: 'レビューをお願いします',
      message: `「${experienceTitle}」はいかがでしたか？ぜひレビューを投稿してください。`,
      data: {
        experience_id: experienceId,
        experience_title: experienceTitle
      }
    })
  }

  // システム通知を作成
  async createSystemNotification(
    userId: string, 
    title: string, 
    message: string, 
    data: Record<string, any> = {}
  ) {
    return this.createNotification({
      userId,
      type: 'system',
      title,
      message,
      data
    })
  }

  // 複数ユーザーに同じ通知を送信
  async createBulkNotifications(
    userIds: string[],
    params: Omit<CreateNotificationParams, 'userId'>
  ) {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data || {},
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert(notifications)
        .select()

      if (error) {
        console.error('Failed to create bulk notifications:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Bulk notification creation error:', error)
      return null
    }
  }
}

export const notificationService = new NotificationService()