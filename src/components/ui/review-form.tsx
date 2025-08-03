'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star, Send } from 'lucide-react'

interface ReviewFormProps {
  experienceId: string
  experienceTitle?: string
  onSubmit?: (review: any) => void
  onCancel?: () => void
  className?: string
}

export function ReviewForm({ 
  experienceId, 
  experienceTitle,
  onSubmit, 
  onCancel,
  className = '' 
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hoveredRating, setHoveredRating] = useState(0)

  // 星評価のレンダリング
  const renderStars = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="cursor-pointer hover:scale-110 transition-transform"
          >
            <Star
              className={`w-6 h-6 ${
                star <= (hoveredRating || rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rating === 0) {
      alert('評価を選択してください')
      return
    }

    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience_id: experienceId,
          rating,
          review_text: reviewText.trim() || undefined,
          is_anonymous: isAnonymous
        })
      })

      const result = await response.json()

      if (response.ok) {
        onSubmit?.(result.review)
        
        // フォームをリセット
        setRating(0)
        setReviewText('')
        setIsAnonymous(false)
      } else {
        alert(result.error || 'レビューの投稿に失敗しました')
      }
    } catch (error) {
      console.error('Failed to submit review:', error)
      alert('エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        レビューを投稿
      </h3>
      
      {experienceTitle && (
        <p className="text-gray-600 mb-4">
          体験: <span className="font-medium">{experienceTitle}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 評価選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            評価 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-4">
            {renderStars()}
            {rating > 0 && (
              <span className="text-sm text-gray-600">
                {rating}/5 - {
                  rating === 1 ? '期待外れ' :
                  rating === 2 ? 'いまいち' :
                  rating === 3 ? '普通' :
                  rating === 4 ? '良い' :
                  '素晴らしい'
                }
              </span>
            )}
          </div>
        </div>

        {/* レビューテキスト */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            レビュー（任意）
          </label>
          <Textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="体験の感想をお聞かせください。他の参加者の参考になります。"
            rows={4}
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">
            {reviewText.length}/1000文字
          </p>
        </div>

        {/* 匿名投稿設定 */}
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="anonymous"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="mt-1 rounded border-gray-300 text-sakura-600 focus:ring-sakura-500"
          />
          <div>
            <label htmlFor="anonymous" className="text-sm font-medium text-gray-700">
              匿名で投稿
            </label>
            <p className="text-xs text-gray-500 mt-1">
              チェックすると、あなたの名前や写真が表示されません
            </p>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex items-center space-x-3 pt-4">
          <Button
            type="submit"
            variant="sakura"
            disabled={rating === 0 || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                投稿中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                レビューを投稿
              </>
            )}
          </Button>
          
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}