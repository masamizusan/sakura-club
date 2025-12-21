'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import ImageEditor from './image-editor'
import { Upload, X, Edit, Camera, User } from 'lucide-react'
import { useTranslation } from '@/utils/translations'
import { type SupportedLanguage } from '@/utils/language'

interface ProfileImage {
  id: string
  url: string // 現在表示されている画像URL（編集後）
  originalUrl: string // オリジナル画像URL（編集前）
  isMain: boolean
  isEdited: boolean // 編集されているかどうか
}

interface MultiImageUploaderProps {
  images: ProfileImage[]
  onImagesChange: (images: ProfileImage[]) => void
  maxImages?: number
  currentLanguage: SupportedLanguage
}

export default function MultiImageUploader({ 
  images, 
  onImagesChange, 
  maxImages = 3,
  currentLanguage
}: MultiImageUploaderProps) {
  const { t } = useTranslation(currentLanguage)
  const [editingImage, setEditingImage] = useState<string | null>(null)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert(t('photos.fileSizeError'))
      return
    }

    // より寛容な画像形式チェック
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    const isValidImage = file.type.startsWith('image/') || 
                        validImageTypes.includes(file.type.toLowerCase()) ||
                        /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
    
    if (!isValidImage) {
      alert(t('photos.fileTypeError'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      setEditingImage(imageUrl)
      setShowImageEditor(true)
    }
    reader.onerror = (e) => {
      console.error('ファイル読み込みエラー:', e)
      alert('画像ファイルの読み込みに失敗しました。別の画像を選択するか、デスクトップにコピーしてから試してください。')
    }
    reader.readAsDataURL(file)
  }

  const [editingImageId, setEditingImageId] = useState<string | null>(null)

  const handleImageSave = (editedImageUrl: string) => {
    if (editingImageId) {
      // 既存の画像を編集する場合（上書き）
      const updatedImages = images.map(img => 
        img.id === editingImageId 
          ? { ...img, url: editedImageUrl, isEdited: true }
          : img
      )
      console.log('🚨 MultiImageUploader: Calling onImagesChange with:', updatedImages.length, 'images')
      onImagesChange(updatedImages)
    } else {
      // 新しい画像を追加する場合
      const newImage: ProfileImage = {
        id: Date.now().toString(),
        url: editedImageUrl,
        originalUrl: editedImageUrl,
        isMain: images.length === 0, // 最初の画像をメインに設定
        isEdited: false
      }
      console.log('🚨 MultiImageUploader: Adding new image, calling onImagesChange with:', images.length + 1, 'images')
      onImagesChange([...images, newImage])
    }
    
    setEditingImage(null)
    setEditingImageId(null)
    setShowImageEditor(false)
  }

  const handleImageEdit = (image: ProfileImage) => {
    setEditingImage(image.originalUrl) // オリジナル画像を編集対象とする
    setEditingImageId(image.id)
    setShowImageEditor(true)
  }

  const handleResetToOriginal = (imageId: string) => {
    const updatedImages = images.map(img => 
      img.id === imageId 
        ? { ...img, url: img.originalUrl, isEdited: false }
        : img
    )
    onImagesChange(updatedImages)
  }

  const handleImageDelete = (imageId: string) => {
    try {
      console.log('🚨 IMAGE_DELETE_START', {
        imageId,
        beforeDelete: images.length,
        targetImage: images.find(img => img.id === imageId)?.url || 'not found',
        timestamp: new Date().toISOString()
      })
      
      // ① まずUI/state を更新（ここで画面上は必ず消える）
      const updatedImages = images.filter(img => img.id !== imageId)
      
      // メイン画像を削除した場合、次の画像をメインに設定
      if (images.find(img => img.id === imageId)?.isMain && updatedImages.length > 0) {
        updatedImages[0].isMain = true
      }
      
      console.log('🗑️ MultiImageUploader: UI更新完了', {
        afterDelete: updatedImages.length,
        calling_onImagesChange: true
      })
      
      // ② 必ず成功する処理のみ（例外発生の余地なし）
      onImagesChange(updatedImages)
      
    } catch (error) {
      console.error('🚨 IMAGE_DELETE_CRASH in MultiImageUploader:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : 'no stack',
        imageId,
        imagesLength: images.length,
        timestamp: new Date().toISOString()
      })
      // ❗ 絶対にthrowしない
    }
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
        {t('photos.profilePhotos')} ({t('photos.maxPhotos')} {maxImages}{currentLanguage === 'ja' ? '枚' : ''})
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
                {t('photos.main')}
              </div>
            )}
            
            {/* 編集済みバッジ */}
            {image.isEdited && (
              <div className="absolute top-2 left-12 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                編集済み
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
            
            {/* 下部ボタン */}
            <div className="absolute bottom-2 left-2 right-2 space-y-1">
              {!image.isMain && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-6"
                  onClick={() => handleSetMainImage(image.id)}
                >
                  メインに設定
                </Button>
              )}
              {image.isEdited && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-6 bg-orange-50 hover:bg-orange-100"
                  onClick={() => handleResetToOriginal(image.id)}
                >
                  前の画像に戻す
                </Button>
              )}
            </div>
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
              {t('photos.addPhoto')}<br />
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
        <p>• {t('photos.mainPhotoNote')}</p>
        <p>• {t('photos.fileSizeNote')}</p>
        <p>• {t('photos.editingNote')}</p>
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