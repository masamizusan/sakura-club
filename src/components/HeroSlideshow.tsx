'use client'

import { useEffect, useState } from 'react'

const images = [
  '/images/hero/hero-spring.jpg',
  '/images/hero/hero-moss.jpg',
  '/images/hero/hero-autumn.jpg',
  '/images/hero/hero-winter.jpg',
] as const

const SWITCH_INTERVAL_MS = 6000
const FADE_DURATION_MS = 2000

/**
 * トップページヒーロー用 4枚クロスフェードスライドショー。
 *
 * - 訪問のたびに開始画像をランダム化（4季のいずれか）
 * - 6秒ごとに自動切り替え（2秒クロスフェード）
 * - prefers-reduced-motion: reduce で自動切り替え停止（静止画）
 * - 画像はリポジトリ内 /public/images/hero/ に配置
 *
 * z-index は持たず、親要素内で兄弟要素より前に置くことで背面化する想定。
 */
export default function HeroSlideshow() {
  const [currentIndex, setCurrentIndex] = useState<number>(
    () => Math.floor(Math.random() * images.length)
  )
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, SWITCH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [reducedMotion])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${src})`,
            opacity: i === currentIndex ? 1 : 0,
            transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
          }}
          aria-hidden="true"
        />
      ))}
      {/* 既存テキストカラー(sumi/beni)を維持しつつ可読性を確保するための半透明白オーバーレイ */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(245, 235, 224, 0.55)' }}
      />
    </div>
  )
}
