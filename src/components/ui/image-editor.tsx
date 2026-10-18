'use client'

import { useState, useCallback, useEffect } from 'react'
import Cropper, { type Area, type Point, type Size } from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import { X, Crop, ZoomIn, ZoomOut, Droplets } from 'lucide-react'
import { blurImageData } from '@/lib/image/blurImageData'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'

interface ImageEditorProps {
  imageUrl: string
  onSave: (editedImageUrl: string) => void
  onClose: () => void
  isOpen: boolean
}

// 保存する画像の一辺（元の写真がこれより小さい場合は拡大しない）
const OUTPUT_MAX_SIZE = 800
const JPEG_QUALITY = 0.8
const MIN_ZOOM = 1
const MAX_ZOOM = 3

// ぼかしレベルの強さ（切り取る正方形の一辺を 400 としたときの値）
// プレビューも保存も、正方形の大きさに合わせて同じ割合でぼかす
const BLUR_BASE_SIZE = 400

// ぼかしレベルをピクセル値に変換する関数
const getBlurPixels = (level: number): number => {
  const blurMapping = {
    0: 0,    // なし
    1: 1,    // 軽い
    2: 2.5,  // 中程度
    3: 5,    // 旧レベル5相当
    4: 8,    // より濃い
    5: 12    // 最も濃い
  }
  return blurMapping[level as keyof typeof blurMapping] || 0
}

type Dict = {
  crop: string
  blurTitle: string
  zoom: string
  zoomOut: string
  zoomIn: string
  blurLevel: string
  blurLight: string
  blurStrong: string
  blurAdjust: string
  save: string
  noteLine1: string
  noteLine2: string
  saveFailed: string
  loadFailed: string
}

const T: Record<SupportedLanguage, Dict> = {
  ja: {
    crop: 'トリミング',
    blurTitle: 'ぼかしレベルを選択',
    zoom: '拡大縮小',
    zoomOut: '小',
    zoomIn: '大',
    blurLevel: 'ぼかしレベル',
    blurLight: '薄',
    blurStrong: '濃',
    blurAdjust: 'ぼかし調整',
    save: '保存する',
    noteLine1: '※ぼかし「0」は写真をそのまま掲載します。',
    noteLine2: '趣味写真・後ろ姿など個人を特定しづらい写真にご利用ください。',
    saveFailed: '写真を保存できませんでした。別の写真でお試しください。',
    loadFailed: 'この写真は読み込めませんでした。別の写真を選んでください。',
  },
  en: {
    crop: 'Crop',
    blurTitle: 'Choose blur level',
    zoom: 'Zoom',
    zoomOut: 'Out',
    zoomIn: 'In',
    blurLevel: 'Blur level',
    blurLight: 'Light',
    blurStrong: 'Strong',
    blurAdjust: 'Adjust blur',
    save: 'Save',
    noteLine1: '*Blur level 0 shows your photo as it is.',
    noteLine2: 'Use it for photos that don\'t easily identify you, such as hobby photos or photos taken from behind.',
    saveFailed: 'We couldn\'t save the photo. Please try a different photo.',
    loadFailed: "This photo couldn't be loaded. Please choose a different photo.",
  },
  ko: {
    crop: '자르기',
    blurTitle: '흐림 정도 선택',
    zoom: '확대·축소',
    zoomOut: '작게',
    zoomIn: '크게',
    blurLevel: '흐림 정도',
    blurLight: '약하게',
    blurStrong: '강하게',
    blurAdjust: '흐림 조절',
    save: '저장',
    noteLine1: '※흐림 「0」은 사진을 그대로 게시합니다.',
    noteLine2: '취미 사진이나 뒷모습 등 본인을 알아보기 어려운 사진에 사용해 주세요.',
    saveFailed: '사진을 저장하지 못했습니다. 다른 사진으로 시도해 주세요.',
    loadFailed: '이 사진을 불러오지 못했습니다. 다른 사진을 선택해 주세요.',
  },
  'zh-tw': {
    crop: '裁剪',
    blurTitle: '選擇模糊程度',
    zoom: '縮放',
    zoomOut: '小',
    zoomIn: '大',
    blurLevel: '模糊程度',
    blurLight: '淡',
    blurStrong: '濃',
    blurAdjust: '調整模糊',
    save: '儲存',
    noteLine1: '※模糊「0」會直接刊登原始照片。',
    noteLine2: '適合用於興趣照、背影等不易辨識個人的照片。',
    saveFailed: '無法儲存照片，請改用其他照片再試一次。',
    loadFailed: '無法載入這張照片，請選擇其他照片。',
  },
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

export default function ImageEditor({ imageUrl, onSave, onClose, isOpen }: ImageEditorProps) {
  const { currentLanguage } = useLanguage()
  const t = T[currentLanguage] ?? T.ja
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [blurLevel, setBlurLevel] = useState(0)
  const [cropMode, setCropMode] = useState(false)
  // 切り取る範囲（元の写真のピクセル単位）
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  // 画面上の正方形の枠の大きさ（プレビューのぼかしの強さに使う）
  const [cropSize, setCropSize] = useState<Size | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  // #28: 写真を読み込めなかったとき（HEIC を Chrome で開いた等）。保存ボタンは押せないままなので理由を出す
  const [loadFailed, setLoadFailed] = useState(false)
  useEffect(() => {
    setLoadFailed(false)
  }, [imageUrl])

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  // プレビュー：CSS の blur で表示（保存時は画素を直接ぼかすので Safari でも結果は同じ）
  const previewBlurPx = cropSize
    ? getBlurPixels(blurLevel) * (cropSize.width / BLUR_BASE_SIZE)
    : 0

  const handleSave = async () => {
    if (!croppedAreaPixels || isSaving) return
    setIsSaving(true)
    setSaveFailed(false)
    try {
      const img = await loadImage(imageUrl)
      const area = croppedAreaPixels
      const outSize = Math.max(1, Math.min(OUTPUT_MAX_SIZE, Math.round(area.width)))

      const canvas = document.createElement('canvas')
      canvas.width = outSize
      canvas.height = outSize
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas 2d context unavailable')

      // 透過 PNG が黒くならないよう白で塗ってから、元の写真の切り取り範囲を描く
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, outSize, outSize)
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outSize, outSize)

      // #50: ぼかしは ctx.filter（Safari で効かないことがある）ではなく、画素を直接ぼかす
      if (blurLevel > 0) {
        const imageData = ctx.getImageData(0, 0, outSize, outSize)
        blurImageData(imageData, getBlurPixels(blurLevel) * (outSize / BLUR_BASE_SIZE))
        ctx.putImageData(imageData, 0, 0)
      }

      const editedImageUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
      onSave(editedImageUrl)
      onClose()
    } catch (error) {
      // 画像の読み込み元の制限（CORS）などで書き出せない場合
      console.warn('[ImageEditor] save failed:', error instanceof Error ? error.message : 'unknown')
      setSaveFailed(true)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {cropMode ? t.crop : t.blurTitle}
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 正方形の枠は固定。写真を指・マウスで動かし、2 本指・ホイール・ボタンで拡大縮小する */}
        <div className="relative w-full h-[300px] sm:h-[400px] mb-4 bg-gray-900 rounded overflow-hidden">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            onCropSizeChange={setCropSize}
            mediaProps={{ onError: () => setLoadFailed(true) }}
            style={{
              mediaStyle: previewBlurPx > 0 ? { filter: `blur(${previewBlurPx}px)` } : {},
            }}
          />
        </div>

        {/* コントロールパネル */}
        <div className="space-y-4">
          {cropMode ? (
            /* ズームコントロール */
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{t.zoom}</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">{t.zoomOut}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(z => Math.max(MIN_ZOOM, Math.round((z - 0.1) * 10) / 10))}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-mono w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(z => Math.min(MAX_ZOOM, Math.round((z + 0.1) * 10) / 10))}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <span className="text-xs text-gray-500">{t.zoomIn}</span>
              </div>
            </div>
          ) : (
            /* ぼかしコントロール */
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{t.blurLevel}</span>
              <div className="flex items-center space-x-2 flex-1 ml-4">
                <span className="text-xs text-gray-500">{t.blurLight}</span>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={blurLevel}
                  onChange={(e) => setBlurLevel(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-500">{t.blurStrong}</span>
              </div>
              <span className="text-sm font-mono w-8 text-center ml-2">
                {blurLevel}
              </span>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCropMode(!cropMode)}
              className="flex items-center"
            >
              {cropMode ? (
                <>
                  <Droplets className="w-4 h-4 mr-2" />
                  {t.blurAdjust}
                </>
              ) : (
                <>
                  <Crop className="w-4 h-4 mr-2" />
                  {t.crop}
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={!croppedAreaPixels || isSaving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {t.save}
            </Button>
          </div>

          {/* 写真を読み込めなかったとき */}
          {loadFailed && (
            <p className="text-sm text-red-600 text-center" role="alert">
              {t.loadFailed}
            </p>
          )}

          {/* 保存に失敗したとき */}
          {saveFailed && (
            <p className="text-sm text-red-600 text-center" role="alert">
              {t.saveFailed}
            </p>
          )}

          {/* 注意書き */}
          <p className="text-xs text-orange-600 text-center">
            {t.noteLine1}<br />
            {t.noteLine2}
          </p>
        </div>
      </div>
    </div>
  )
}
