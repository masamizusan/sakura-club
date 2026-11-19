import { logger } from '@/utils/logger'

/**
 * アップロードの前に画像を縮める（S9：年齢確認の身分証。ブラウザだけで動く）
 *
 * - 長い辺を maxSide（既定 2000px）に収め、JPEG（画質 0.85）にする
 * - もともと長い辺が maxSide 以下で、大きさが skipBelowBytes（既定 1.5MB）以下なら、縮めずにそのまま返す
 * - 縮めるのに失敗したら、元の File をそのまま返す（resized: false）。失敗は logger にだけ残す
 *
 * 写真の向き（EXIF）：<img> で読み込んで canvas に描く。今の Safari・Chrome は <img> の表示・naturalWidth/Height と
 * drawImage に EXIF の向きを反映する（CSS の image-orientation: from-image が既定）。createImageBitmap は
 * Safari で imageOrientation が効かない版があるため使わない。
 * 描き直すので、EXIF（撮影場所の GPS など）は出力に残らない。
 *
 * 大きい写真（iPhone の 48MP など）でも、描く先の canvas は縮めた後の大きさ（長い辺 maxSide）だけにする。
 */

export const RESIZE_MAX_SIDE = 2000
export const RESIZE_JPEG_QUALITY = 0.85
export const RESIZE_SKIP_BELOW_BYTES = 1.5 * 1024 * 1024

export type ResizeImageResult = { file: File; resized: boolean }

type ResizeOptions = {
  maxSide?: number
  quality?: number
  skipBelowBytes?: number
}

function loadImage(file: File): Promise<{ img: HTMLImageElement; release: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve({ img, release: () => URL.revokeObjectURL(url) })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image decode failed'))
    }
    img.src = url
  })
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
}

function jpegFileName(originalName: string): string {
  const base = originalName.replace(/\.[^./\\]+$/, '') || 'image'
  return `${base}.jpg`
}

export async function resizeImageForUpload(file: File, options: ResizeOptions = {}): Promise<ResizeImageResult> {
  const maxSide = options.maxSide ?? RESIZE_MAX_SIDE
  const quality = options.quality ?? RESIZE_JPEG_QUALITY
  const skipBelowBytes = options.skipBelowBytes ?? RESIZE_SKIP_BELOW_BYTES

  let release: (() => void) | null = null
  let canvas: HTMLCanvasElement | null = null
  try {
    const loaded = await loadImage(file)
    release = loaded.release
    const width = loaded.img.naturalWidth
    const height = loaded.img.naturalHeight
    if (!width || !height) throw new Error('image has no size')

    const longSide = Math.max(width, height)
    // 小さい画像はそのまま（画質を落とさない）
    if (longSide <= maxSide && file.size <= skipBelowBytes) {
      return { file, resized: false }
    }

    const scale = Math.min(1, maxSide / longSide)
    const outWidth = Math.max(1, Math.round(width * scale))
    const outHeight = Math.max(1, Math.round(height * scale))

    canvas = document.createElement('canvas')
    canvas.width = outWidth
    canvas.height = outHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d context unavailable')
    // PNG・WebP の透明な部分が JPEG で黒くならないよう、白で塗ってから描く
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, outWidth, outHeight)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(loaded.img, 0, 0, outWidth, outHeight)

    const blob = await canvasToJpeg(canvas, quality)
    if (!blob || blob.size === 0) throw new Error('jpeg encode failed')

    // 縮めていない（大きさは同じ）のに元より大きくなった場合は、元のまま送る
    if (scale === 1 && blob.size >= file.size) {
      return { file, resized: false }
    }

    const resizedFile = new File([blob], jpegFileName(file.name), { type: 'image/jpeg', lastModified: Date.now() })
    return { file: resizedFile, resized: true }
  } catch (e) {
    // 年齢確認を止めないよう、元の画像のまま送る。失敗はログにだけ残す（画像の中身は出さない）
    logger.warn('[resizeImage] resize failed, sending original:', {
      reason: e instanceof Error ? e.message : 'unknown',
      type: file.type,
      size: file.size,
    })
    return { file, resized: false }
  } finally {
    if (canvas) {
      // iOS Safari の canvas のメモリを早めに返す
      canvas.width = 0
      canvas.height = 0
    }
    release?.()
  }
}
