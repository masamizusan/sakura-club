'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, RotateCcw, Crop, ZoomIn, ZoomOut, Move, Eye, Droplets } from 'lucide-react'

interface ImageEditorProps {
  imageUrl: string
  onSave: (editedImageUrl: string) => void
  onClose: () => void
  isOpen: boolean
}

export default function ImageEditor({ imageUrl, onSave, onClose, isOpen }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(1)
  const [blurLevel, setBlurLevel] = useState(0)
  const [cropMode, setCropMode] = useState(false)
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 200, height: 200 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  
  const loadImage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageUrl) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = 400
      canvas.height = 400
      
      // 画像を中央に配置
      const imgAspectRatio = img.width / img.height
      let drawWidth, drawHeight
      
      if (imgAspectRatio > 1) {
        drawWidth = canvas.width * scale
        drawHeight = (canvas.width / imgAspectRatio) * scale
      } else {
        drawWidth = (canvas.height * imgAspectRatio) * scale
        drawHeight = canvas.height * scale
      }
      
      const x = (canvas.width - drawWidth) / 2 + imagePosition.x
      const y = (canvas.height - drawHeight) / 2 + imagePosition.y
      
      // キャンバスをクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // ぼかしフィルターを適用
      if (blurLevel > 0) {
        ctx.filter = `blur(${blurLevel}px)`
      } else {
        ctx.filter = 'none'
      }
      
      // 画像を描画
      ctx.drawImage(img, x, y, drawWidth, drawHeight)
      
      // クロップエリアを描画
      if (cropMode) {
        ctx.filter = 'none'
        ctx.strokeStyle = '#ff6b6b'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height)
        
        // オーバーレイ
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height)
        
        // 再度画像を描画（クロップエリア内）
        ctx.save()
        ctx.beginPath()
        ctx.rect(cropArea.x, cropArea.y, cropArea.width, cropArea.height)
        ctx.clip()
        
        if (blurLevel > 0) {
          ctx.filter = `blur(${blurLevel}px)`
        }
        ctx.drawImage(img, x, y, drawWidth, drawHeight)
        ctx.restore()
      }
    }
    img.src = imageUrl
  }, [imageUrl, scale, blurLevel, cropMode, cropArea, imagePosition])

  useEffect(() => {
    if (isOpen) {
      loadImage()
    }
  }, [loadImage, isOpen])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cropMode) return
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // クロップエリア内かチェック
    if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
        y >= cropArea.y && y <= cropArea.y + cropArea.height) {
      setIsDragging(true)
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !cropMode) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const newX = Math.max(0, Math.min(canvas.width - cropArea.width, x - dragStart.x))
    const newY = Math.max(0, Math.min(canvas.height - cropArea.height, y - dragStart.y))
    
    setCropArea(prev => ({ ...prev, x: newX, y: newY }))
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    let finalCanvas = canvas
    
    // クロップが有効な場合、クロップした部分のみを新しいキャンバスに描画
    if (cropMode) {
      const croppedCanvas = document.createElement('canvas')
      croppedCanvas.width = cropArea.width
      croppedCanvas.height = cropArea.height
      const croppedCtx = croppedCanvas.getContext('2d')
      
      if (croppedCtx) {
        croppedCtx.drawImage(
          canvas,
          cropArea.x, cropArea.y, cropArea.width, cropArea.height,
          0, 0, cropArea.width, cropArea.height
        )
        finalCanvas = croppedCanvas
      }
    }
    
    const editedImageUrl = finalCanvas.toDataURL('image/jpeg', 0.8)
    onSave(editedImageUrl)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {cropMode ? 'トリミング' : 'ぼかしレベルを選択'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            className="border border-gray-300 rounded cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>

        {/* コントロールパネル */}
        <div className="space-y-4">
          {!cropMode && (
            <>
              {/* ズームコントロール */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">拡大縮小</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">小</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setScale(Math.max(0.1, scale - 0.1))}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-mono w-12 text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setScale(Math.min(3, scale + 0.1))}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-gray-500">大</span>
                </div>
              </div>

              {/* ぼかしコントロール */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">ぼかしレベル</span>
                <div className="flex items-center space-x-2 flex-1 ml-4">
                  <span className="text-xs text-gray-500">薄</span>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={blurLevel}
                    onChange={(e) => setBlurLevel(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-gray-500">濃</span>
                </div>
                <span className="text-sm font-mono w-8 text-center ml-2">
                  {blurLevel}
                </span>
              </div>
            </>
          )}


          {/* アクションボタン */}
          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => setCropMode(!cropMode)}
              className="flex items-center"
            >
              {cropMode ? (
                <>
                  <Droplets className="w-4 h-4 mr-2" />
                  ぼかし調整
                </>
              ) : (
                <>
                  <Crop className="w-4 h-4 mr-2" />
                  トリミング
                </>
              )}
            </Button>
            
            <Button
              onClick={handleSave}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              保存する
            </Button>
          </div>

          {/* 注意書き */}
          <p className="text-xs text-orange-600 text-center">
            ※ぼかし「0」は写真をそのまま掲載します。<br />
            趣味写真・後ろ姿など個人を特定しづらい写真にご利用ください。
          </p>
        </div>
      </div>
    </div>
  )
}