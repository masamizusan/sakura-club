// 画像を長い辺 maxSide 以下に縮めて JPEG の data URL にする（縦横比はそのまま・拡大はしない）
// 新しく追加した写真の「元の写真」を、sessionStorage を圧迫しない大きさで持つために使う
export function resizeImageToDataUrl(
  src: string,
  maxSide = 800,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const width = img.naturalWidth
        const height = img.naturalHeight
        if (!width || !height) throw new Error('invalid image size')

        const scale = Math.min(1, maxSide / Math.max(width, height))
        const outWidth = Math.max(1, Math.round(width * scale))
        const outHeight = Math.max(1, Math.round(height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = outWidth
        canvas.height = outHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('canvas 2d context unavailable')

        // 透過 PNG が黒くならないよう白で塗ってから描く
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, outWidth, outHeight)
        ctx.drawImage(img, 0, 0, outWidth, outHeight)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (error) {
        reject(error)
      }
    }
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}
