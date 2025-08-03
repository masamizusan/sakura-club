'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star, User, Edit, Trash2, Save, X } from 'lucide-react'

interface Review {
  id: string
  experienceId: string
  experienceTitle?: string
  experienceDate?: string
  reviewerId: string
  reviewerName: string
  reviewerImage?: string
  rating: number
  reviewText?: string
  isAnonymous: boolean
  createdAt: string
  updatedAt: string
}

interface ReviewCardProps {
  review: Review
  isOwnReview?: boolean
  onUpdate?: (reviewId: string, updatedReview: Partial<Review>) => void
  onDelete?: (reviewId: string) => void
  className?: string
}

export function ReviewCard({ 
  review, 
  isOwnReview = false, 
  onUpdate, 
  onDelete,
  className = '' 
}: ReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editRating, setEditRating] = useState(review.rating)
  const [editText, setEditText] = useState(review.reviewText || '')
  const [editAnonymous, setEditAnonymous] = useState(review.isAnonymous)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 星評価のレンダリング
  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRatingChange?.(star)}
            className={`${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
            }`}
          >
            <Star
              className={`w-4 h-4 ${
                star <= rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  // レビュー更新
  const handleUpdate = async () => {
    if (!onUpdate) return

    try {
      setIsUpdating(true)
      
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: editRating,
          review_text: editText.trim() || undefined,
          is_anonymous: editAnonymous
        })
      })

      const result = await response.json()

      if (response.ok) {
        onUpdate(review.id, result.review)
        setIsEditing(false)
      } else {
        alert(result.error || 'レビューの更新に失敗しました')
      }
    } catch (error) {
      console.error('Failed to update review:', error)
      alert('エラーが発生しました')
    } finally {
      setIsUpdating(false)
    }
  }

  // レビュー削除
  const handleDelete = async () => {
    if (!onDelete || !confirm('このレビューを削除してもよろしいですか？')) return

    try {
      setIsDeleting(true)
      
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onDelete(review.id)
      } else {
        const result = await response.json()
        alert(result.error || 'レビューの削除に失敗しました')
      }
    } catch (error) {
      console.error('Failed to delete review:', error)
      alert('エラーが発生しました')
    } finally {
      setIsDeleting(false)
    }
  }

  // 編集をキャンセル
  const handleCancelEdit = () => {
    setEditRating(review.rating)
    setEditText(review.reviewText || '')
    setEditAnonymous(review.isAnonymous)
    setIsEditing(false)
  }

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        {/* ユーザー情報 */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-sakura-100 rounded-full flex items-center justify-center">
            {review.reviewerImage ? (
              <img
                src={review.reviewerImage}
                alt={review.reviewerName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-sakura-600" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{review.reviewerName}</p>
            <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
          </div>
        </div>

        {/* アクションボタン */}
        {isOwnReview && !isEditing && (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* 体験タイトル（存在する場合） */}
      {review.experienceTitle && (
        <div className="mb-3">
          <p className="text-sm text-gray-600">
            体験: <span className="font-medium">{review.experienceTitle}</span>
            {review.experienceDate && (
              <span className="ml-2">({formatDate(review.experienceDate)})</span>
            )}
          </p>
        </div>
      )}

      {isEditing ? (
        /* 編集モード */
        <div className="space-y-4">
          {/* 評価編集 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              評価
            </label>
            {renderStars(editRating, true, setEditRating)}
          </div>

          {/* レビューテキスト編集 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              レビュー（任意）
            </label>
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="体験の感想をお聞かせください..."
              rows={4}
            />
          </div>

          {/* 匿名設定 */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={editAnonymous}
              onChange={(e) => setEditAnonymous(e.target.checked)}
              className="rounded border-gray-300 text-sakura-600 focus:ring-sakura-500"
            />
            <label htmlFor="anonymous" className="text-sm text-gray-700">
              匿名で投稿
            </label>
          </div>

          {/* 編集アクションボタン */}
          <div className="flex items-center space-x-2 pt-2">
            <Button
              variant="sakura"
              size="sm"
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  更新中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  更新
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              disabled={isUpdating}
            >
              <X className="w-4 h-4 mr-2" />
              キャンセル
            </Button>
          </div>
        </div>
      ) : (
        /* 表示モード */
        <div className="space-y-3">
          {/* 評価表示 */}
          <div className="flex items-center space-x-2">
            {renderStars(review.rating)}
            <span className="text-sm text-gray-600">({review.rating}/5)</span>
          </div>

          {/* レビューテキスト */}
          {review.reviewText && (
            <p className="text-gray-700 leading-relaxed">{review.reviewText}</p>
          )}

          {/* 匿名表示 */}
          {review.isAnonymous && (
            <p className="text-xs text-gray-500">
              このレビューは匿名で投稿されました
            </p>
          )}

          {/* 更新日時 */}
          {review.updatedAt !== review.createdAt && (
            <p className="text-xs text-gray-500">
              更新: {formatDate(review.updatedAt)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}