'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Camera, User } from 'lucide-react'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageUpload: (imageUrl: string) => void
  onImageRemove: () => void
  userId: string
  maxSizeInMB?: number
  allowedTypes?: string[]
  className?: string
}

export function ImageUpload({
  currentImageUrl,
  onImageUpload,
  onImageRemove,
  userId,
  maxSizeInMB = 5,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = ''
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadError(null)

    // ファイルサイズチェック
    if (file.size > maxSizeInMB * 1024 * 1024) {
      setUploadError(`ファイルサイズは${maxSizeInMB}MB以下にしてください`)
      return
    }

    // ファイルタイプチェック
    if (!allowedTypes.includes(file.type)) {
      setUploadError('JPEG、PNG、WebP形式の画像のみアップロード可能です')
      return
    }

    await uploadImage(file)
  }

  const uploadImage = async (file: File) => {
    try {
      setIsUploading(true)

      // ファイル名を生成（ユーザーIDとタイムスタンプ）
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      // 既存の画像があれば削除
      if (currentImageUrl) {
        const oldFileName = currentImageUrl.split('/').pop()
        if (oldFileName) {
          await supabase.storage
            .from('profile-images')
            .remove([`${userId}/${oldFileName}`])
        }
      }

      // 新しい画像をアップロード
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        throw error
      }

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName)

      // プロフィールテーブルを更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          profile_image: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      onImageUpload(publicUrl)
      
    } catch (error) {
      console.error('Image upload error:', error)
      setUploadError('画像のアップロードに失敗しました。もう一度お試しください。')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return

    try {
      setIsUploading(true)

      // ストレージから画像を削除
      const fileName = currentImageUrl.split('/').pop()
      if (fileName) {
        await supabase.storage
          .from('profile-images')
          .remove([`${userId}/${fileName}`])
      }

      // プロフィールテーブルを更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          profile_image: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      onImageRemove()
      
    } catch (error) {
      console.error('Image removal error:', error)
      setUploadError('画像の削除に失敗しました。もう一度お試しください。')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* 画像プレビュー */}
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
          {currentImageUrl ? (
            <Image
              src={currentImageUrl}
              alt="プロフィール画像"
              className="w-full h-full object-cover"
              width={128}
              height={128}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sakura-100 to-sakura-200">
              <User className="w-12 h-12 text-sakura-400" />
            </div>
          )}
        </div>

        {/* カメラアイコン */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute bottom-2 right-2 w-10 h-10 bg-sakura-600 hover:bg-sakura-700 disabled:bg-gray-400 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
        >
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
        </button>

        {/* 削除ボタン */}
        {currentImageUrl && !isUploading && (
          <button
            onClick={handleRemoveImage}
            className="absolute top-0 right-0 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ファイル入力（非表示） */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* アップロードボタン */}
      <div className="flex flex-col items-center space-y-2">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>
            {isUploading ? 'アップロード中...' : '画像を選択'}
          </span>
        </Button>

        <p className="text-xs text-gray-500 text-center">
          JPEG、PNG、WebP形式<br />
          最大{maxSizeInMB}MBまで
        </p>
      </div>

      {/* エラーメッセージ */}
      {uploadError && (
        <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-md">
          {uploadError}
        </div>
      )}
    </div>
  )
}