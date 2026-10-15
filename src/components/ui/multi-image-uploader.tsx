'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import ImageEditor from './image-editor'
import { Upload, X, Edit, Camera, User } from 'lucide-react'
import { useTranslation } from '@/utils/translations'
import { type SupportedLanguage } from '@/utils/language'
import { logger } from '@/utils/logger'
import { useLanguage } from '@/contexts/LanguageContext'

type Dict = {
  readError: string
  photoCount: (n: number) => string
  photoAlt: (n: number) => string
  edited: string
}

const T: Record<SupportedLanguage, Dict> = {
  ja: {
    readError: '画像ファイルの読み込みに失敗しました。別の画像を選択するか、デスクトップにコピーしてから試してください。',
    photoCount: (n) => `${n}枚`,
    photoAlt: (n) => `プロフィール写真 ${n}`,
    edited: '編集済み',
  },
  en: {
    readError: 'We couldn\'t read the image file. Please choose another image, or copy it to your desktop and try again.',
    photoCount: (n) => `${n} ${n === 1 ? 'photo' : 'photos'}`,
    photoAlt: (n) => `Profile photo ${n}`,
    edited: 'Edited',
  },
  ko: {
    readError: '이미지 파일을 읽지 못했습니다. 다른 이미지를 선택하거나 데스크톱에 복사한 후 다시 시도해 주세요.',
    photoCount: (n) => `${n}장`,
    photoAlt: (n) => `프로필 사진 ${n}`,
    edited: '편집됨',
  },
  'zh-tw': {
    readError: '無法讀取圖片檔案。請選擇其他圖片，或先複製到桌面後再試一次。',
    photoCount: (n) => `${n} 張`,
    photoAlt: (n) => `個人照片 ${n}`,
    edited: '已編輯',
  },
}

interface ProfileImage {
  id: string
  url: string // 現在表示されている画像URL（編集後）
  originalUrl: string // オリジナル画像URL（編集前）
  isMain: boolean
  isEdited: boolean // 編集されているかどうか
}

interface MultiImageUploaderProps {
  images: ProfileImage[]
  onImagesChange: (images: ProfileImage[], deleteInfo?: { isDeletion: boolean; prevLength: number; deletedImageId: string }) => void
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
  const { currentLanguage: uiLanguage } = useLanguage()
  const d = T[uiLanguage] ?? T.ja
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
      alert(d.readError)
    }
    reader.readAsDataURL(file)
  }

  const [editingImageId, setEditingImageId] = useState<string | null>(null)

  const handleImageSave = (editedImageUrl: string) => {
    // 編集画面は onSave の直後に閉じる（onClose で state を戻す）ため、必要な値は先に取っておく
    const targetImageId = editingImageId

    if (targetImageId) {
      // 既存の画像を編集する場合（上書き）
      const updatedImages = images.map(img => 
        img.id === targetImageId
          ? { ...img, url: editedImageUrl, isEdited: true }
          : img
      )
      onImagesChange(updatedImages)
    } else {
      // 新しい画像を追加する場合
      // 元の写真は持たない（sessionStorage の容量を増やさないため）。originalUrl も編集後の写真
      // isEdited: true → 保存・プレビューでは編集後（url）が使われる（profile/edit の calculateFinalPhotoUrls）
      const newImage: ProfileImage = {
        id: Date.now().toString(),
        url: editedImageUrl,
        originalUrl: editedImageUrl,
        isMain: images.length === 0,
        isEdited: true
      }
      const updatedImages = [...images, newImage]
      logger.debug('[IMAGE] add:', images.length, '→', updatedImages.length)
      onImagesChange(updatedImages)
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

  const handleImageDelete = (imageId: string) => {
    try {
      const prevLength = images.length
      const nextImages = images.filter(img => img.id !== imageId)

      // メイン画像を削除した場合、次の画像をメインに設定
      if (images.find(img => img.id === imageId)?.isMain && nextImages.length > 0) {
        nextImages[0].isMain = true
      }

      logger.debug('[IMAGE] delete:', prevLength, '→', nextImages.length)
      onImagesChange(nextImages, {
        isDeletion: true,
        prevLength: prevLength,
        deletedImageId: imageId
      })
    } catch (error) {
      logger.error('[IMAGE] delete failed:', error instanceof Error ? error.message : error)
    }
  }

  const handleSetMainImage = (imageId: string) => {
    // 🛡️ メイン画像変更: 選択した画像を配列の先頭に移動 + isMainフラグ更新
    // DB保存時は photo_urls[0] = avatar_url のため、先頭に移動が必須
    const mainImage = images.find(img => img.id === imageId)
    if (!mainImage) return

    const otherImages = images.filter(img => img.id !== imageId)
    const reorderedImages = [
      { ...mainImage, isMain: true },
      ...otherImages.map(img => ({ ...img, isMain: false }))
    ]

    logger.debug('[IMAGE] main change:', imageId)
    onImagesChange(reorderedImages)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 border-b border-[#d4a89a] pb-2">
        <Camera className="w-5 h-5 inline-block mr-2" />
        {t('photos.profilePhotos')} ({t('photos.maxPhotos')} {d.photoCount(maxImages)})
      </h3>

      {/* 画像グリッド */}
      <div className="grid grid-cols-3 gap-4">
        {/* 既存の画像 */}
        {images.map((image, index) => (
          <div key={image.id} className="relative">
            {/* 画像コンテナ - メイン画像は特別なスタイリング */}
            <div className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-colors ${
              image.isMain 
                ? 'border-[#8b1a2e] shadow-lg ring-2 ring-[#d4a89a]' 
                : 'border-gray-200 hover:border-[#d4a89a]'
            }`}>
              <img
                src={image.url}
                alt={d.photoAlt(index + 1)}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* メインバッジ - より目立つデザイン */}
            {image.isMain && (
              <div className="absolute top-2 left-2 bg-gradient-to-r from-[#8b1a2e] to-[#6e1525] text-white text-xs px-3 py-1 rounded-full shadow-md border border-white">
                <span className="font-semibold">{t('photos.main')}</span>
              </div>
            )}
            
            {/* 編集済みバッジ */}
            {image.isEdited && (
              <div className="absolute top-2 left-12 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                {d.edited}
              </div>
            )}
            
            {/* アクションボタン */}
            <div className="absolute top-2 right-2 flex space-x-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-black bg-opacity-50 hover:bg-opacity-70 text-white"
                onClick={() => handleImageEdit(image)}
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-black bg-opacity-50 hover:bg-opacity-70 text-white"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleImageDelete(image.id)
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            {/* 下部ボタン - メイン重複表示改善 */}
            <div className="absolute bottom-2 left-2 right-2 space-y-1">
              {!image.isMain && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-6 bg-white bg-opacity-90 hover:bg-opacity-100"
                  onClick={() => handleSetMainImage(image.id)}
                >
                  {t('photos.setAsMain')}
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* 新しい画像追加ボタン */}
        {images.length < maxImages && (
          <div
            onClick={triggerFileInput}
            className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#d4a89a] hover:bg-[#fdf6ef] transition-colors"
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
            // × で閉じた後に新しい写真を追加したとき、既存の写真を上書きしないように戻す
            setEditingImageId(null)
          }}
          isOpen={showImageEditor}
        />
      )}
    </div>
  )
}