'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import ImageEditor from './image-editor'
import { Upload, X, Edit, Camera, User } from 'lucide-react'

interface ProfileImage {
  id: string
  url: string
  isMain: boolean
}

interface MultiImageUploaderProps {
  images: ProfileImage[]
  onImagesChange: (images: ProfileImage[]) => void
  maxImages?: number
}

export default function MultiImageUploader({ 
  images, 
  onImagesChange, 
  maxImages = 3 
}: MultiImageUploaderProps) {
  const [editingImage, setEditingImage] = useState<string | null>(null)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('画像ファイルは5MB以下にしてください')
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      setEditingImage(imageUrl)
      setShowImageEditor(true)
    }
    reader.readAsDataURL(file)
  }

  const handleImageSave = (editedImageUrl: string) => {
    const newImage: ProfileImage = {
      id: Date.now().toString(),
      url: editedImageUrl,
      isMain: images.length === 0 // 最初の画像をメインに設定
    }

    onImagesChange([...images, newImage])
    setEditingImage(null)
    setShowImageEditor(false)
  }

  const handleImageEdit = (image: ProfileImage) => {
    setEditingImage(image.url)
    setShowImageEditor(true)
  }

  const handleImageDelete = (imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId)
    
    // メイン画像を削除した場合、次の画像をメインに設定
    if (images.find(img => img.id === imageId)?.isMain && updatedImages.length > 0) {
      updatedImages[0].isMain = true
    }
    
    onImagesChange(updatedImages)
  }

  const handleSetMainImage = (imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isMain: img.id === imageId
    }))
    onImagesChange(updatedImages)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 border-b border-sakura-200 pb-2">
        <Camera className="w-5 h-5 inline-block mr-2" />
        プロフィール写真（最大{maxImages}枚）
      </h3>

      {/* 画像グリッド */}
      <div className="grid grid-cols-3 gap-4">
        {/* 既存の画像 */}
        {images.map((image, index) => (
          <div key={image.id} className="relative">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-sakura-300 transition-colors">
              <img
                src={image.url}
                alt={`プロフィール写真 ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* メインバッジ */}
            {image.isMain && (
              <div className="absolute top-2 left-2 bg-sakura-600 text-white text-xs px-2 py-1 rounded-full">
                メイン
              </div>
            )}
            
            {/* アクションボタン */}
            <div className="absolute top-2 right-2 flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-black bg-opacity-50 hover:bg-opacity-70 text-white"
                onClick={() => handleImageEdit(image)}
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-black bg-opacity-50 hover:bg-opacity-70 text-white"
                onClick={() => handleImageDelete(image.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            {/* メイン設定ボタン */}
            {!image.isMain && (
              <Button
                variant="outline"
                size="sm"
                className="absolute bottom-2 left-2 right-2 text-xs h-6"
                onClick={() => handleSetMainImage(image.id)}
              >
                メインに設定
              </Button>
            )}
          </div>
        ))}

        {/* 新しい画像追加ボタン */}
        {images.length < maxImages && (
          <div
            onClick={triggerFileInput}
            className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-sakura-400 hover:bg-sakura-50 transition-colors"
          >
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500 text-center">
              写真を追加<br />
              ({images.length}/{maxImages})
            </span>
          </div>
        )}

        {/* 空のスロット表示 */}
        {Array.from({ length: Math.max(0, maxImages - images.length - 1) }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className="aspect-square bg-gray-100 border-2 border-gray-200 rounded-lg flex items-center justify-center"
          >
            <User className="w-8 h-8 text-gray-300" />
          </div>
        ))}
      </div>

      {/* ファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 注意事項 */}
      <div className="text-sm text-gray-600 space-y-1">
        <p>• 1枚目がメイン写真として表示されます</p>
        <p>• 各写真は5MB以下にしてください</p>
        <p>• トリミングやぼかし加工ができます</p>
      </div>

      {/* 画像エディター */}
      {showImageEditor && editingImage && (
        <ImageEditor
          imageUrl={editingImage}
          onSave={handleImageSave}
          onClose={() => {
            setShowImageEditor(false)
            setEditingImage(null)
          }}
          isOpen={showImageEditor}
        />
      )}
    </div>
  )
}