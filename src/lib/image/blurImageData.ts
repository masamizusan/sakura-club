// #50: canvas の画素を直接ぼかす（ガウスぼかしの近似）
// ctx.filter = 'blur()' は Safari で効かないことがあるため、どのブラウザでも同じ結果になるよう画素を計算する。
// 方式：ボックスぼかしを 3 回重ねてガウスぼかしに近づける（CSS の blur(Npx) の N を標準偏差として扱う）
// 外部ライブラリは使わない（自作）

// 標準偏差 sigma のガウスぼかしに近い 3 つのボックスの幅（奇数）を求める
function boxSizesForGauss(sigma: number, n = 3): number[] {
  const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1)
  let wl = Math.floor(wIdeal)
  if (wl % 2 === 0) wl--
  const wu = wl + 2
  const mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4)
  const m = Math.round(mIdeal)
  const sizes: number[] = []
  for (let i = 0; i < n; i++) sizes.push(i < m ? wl : wu)
  return sizes
}

// 横方向のボックスぼかし（RGBA の 4 チャンネル。端は端の画素を延長して扱う）
function boxBlurH(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number) {
  const iarr = 1 / (r + r + 1)
  for (let y = 0; y < h; y++) {
    const row = y * w * 4
    for (let c = 0; c < 4; c++) {
      const first = src[row + c]
      const last = src[row + (w - 1) * 4 + c]
      let val = r * first
      for (let j = 0; j < r; j++) val += src[row + Math.min(j, w - 1) * 4 + c]
      for (let x = 0; x < w; x++) {
        const addIdx = x + r < w ? src[row + (x + r) * 4 + c] : last
        val += addIdx
        dst[row + x * 4 + c] = val * iarr
        const subIdx = x - r >= 0 ? src[row + (x - r) * 4 + c] : first
        val -= subIdx
      }
    }
  }
}

// 縦方向のボックスぼかし
function boxBlurV(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number) {
  const iarr = 1 / (r + r + 1)
  for (let x = 0; x < w; x++) {
    const col = x * 4
    for (let c = 0; c < 4; c++) {
      const first = src[col + c]
      const last = src[(h - 1) * w * 4 + col + c]
      let val = r * first
      for (let j = 0; j < r; j++) val += src[Math.min(j, h - 1) * w * 4 + col + c]
      for (let y = 0; y < h; y++) {
        const addVal = y + r < h ? src[(y + r) * w * 4 + col + c] : last
        val += addVal
        dst[y * w * 4 + col + c] = val * iarr
        const subVal = y - r >= 0 ? src[(y - r) * w * 4 + col + c] : first
        val -= subVal
      }
    }
  }
}

// ImageData をその場でぼかす（sigma <= 0 なら何もしない）
export function blurImageData(imageData: ImageData, sigma: number): void {
  if (!(sigma > 0)) return
  const { width: w, height: h, data } = imageData
  const tmp = new Uint8ClampedArray(data.length)
  for (const size of boxSizesForGauss(sigma)) {
    const r = Math.max(0, Math.floor((size - 1) / 2))
    if (r === 0) continue
    boxBlurH(data, tmp, w, h, r)
    boxBlurV(tmp, data, w, h, r)
  }
}
