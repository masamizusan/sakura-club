'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, User } from 'lucide-react'
import { resolveAvatarSrc } from '@/utils/imageResolver'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'

// #55: プロフィールの写真を正方形の枠で横にめくって見る共通の部品
// （相手のプロフィール・プレビューで同じ見え方にする）
// スマホは指で横にめくる（CSS scroll-snap）、マウスで操作できる端末は左右の矢印ボタン、下に今何枚目かの点

type GalleryDict = {
  counter: (n: number, total: number) => string
  prev: string
  next: string
  alt: (name: string, n: number) => string
}

const T: Record<SupportedLanguage, GalleryDict> = {
  ja: {
    counter: (n, total) => `写真 ${n}/${total}`,
    prev: '前の写真',
    next: '次の写真',
    alt: (name, n) => (name ? `${name}さんの写真 ${n}` : `写真 ${n}`),
  },
  en: {
    counter: (n, total) => `Photo ${n} of ${total}`,
    prev: 'Previous photo',
    next: 'Next photo',
    alt: (name, n) => (name ? `Photo ${n} of ${name}` : `Photo ${n}`),
  },
  ko: {
    counter: (n, total) => `사진 ${n}/${total}`,
    prev: '이전 사진',
    next: '다음 사진',
    alt: (name, n) => (name ? `${name}님의 사진 ${n}` : `사진 ${n}`),
  },
  'zh-tw': {
    counter: (n, total) => `照片 ${n}/${total}`,
    prev: '上一張照片',
    next: '下一張照片',
    alt: (name, n) => (name ? `${name}的照片 ${n}` : `照片 ${n}`),
  },
}

// 写真 1 枚。読み込みに失敗したとき・写真が無いときは、Avatar 部品と同じアイコンを出す
function GalleryImage({ src, alt, className }: { src: string | null; alt: string; className: string }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-[#ede0d4] ${className}`}>
        <User className="w-1/2 h-1/2 text-[#d4a89a]" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}

type PhotoGalleryProps = {
  /** 写真の URL（または Storage のパス）。先頭がメインの写真 */
  photos: string[]
  /** alt に使う名前 */
  name: string
}

export default function PhotoGallery({ photos, name }: PhotoGalleryProps) {
  const { currentLanguage } = useLanguage()
  const t = T[currentLanguage] ?? T.ja

  // 写真の URL は今までと同じ resolveAvatarSrc で解決する
  const sources = useMemo(() => photos.map(photo => resolveAvatarSrc(photo)), [photos])
  const total = sources.length

  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  // 写真の枚数が変わったら（プレビューでの差し替えなど）先頭に戻す
  useEffect(() => {
    setIndex(0)
    trackRef.current?.scrollTo({ left: 0 })
  }, [total])

  // 横にめくった位置から、今何枚目かを決める
  const handleScroll = () => {
    const el = trackRef.current
    if (!el || el.clientWidth === 0) return
    const next = Math.round(el.scrollLeft / el.clientWidth)
    setIndex(Math.max(0, Math.min(total - 1, next)))
  }

  const scrollToIndex = (target: number) => {
    const el = trackRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(total - 1, target))
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
  }

  // 写真が 0・1 枚：矢印・点は出さない（今までの見た目のまま）
  if (total <= 1) {
    return (
      <div className="relative aspect-square bg-gray-100">
        <GalleryImage src={sources[0] ?? null} alt={t.alt(name, 1)} className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className="relative aspect-square bg-gray-100" aria-roledescription="carousel" aria-label={t.counter(index + 1, total)}>
      {/* 横に並べた写真（scroll-snap で 1 枚ずつ止まる。スクロールバーは隠す） */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="absolute inset-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sources.map((src, i) => (
          <div
            key={i}
            className="h-full w-full flex-shrink-0 snap-center [scroll-snap-stop:always]"
            aria-roledescription="slide"
            aria-label={t.counter(i + 1, total)}
          >
            <GalleryImage src={src} alt={t.alt(name, i + 1)} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* 左右の矢印（マウスで操作できる端末だけ。スマホは指でめくる） */}
      {index > 0 && (
        <button
          type="button"
          onClick={() => scrollToIndex(index - 1)}
          aria-label={t.prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 hidden [@media(hover:hover)]:flex items-center justify-center w-9 h-9 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {index < total - 1 && (
        <button
          type="button"
          onClick={() => scrollToIndex(index + 1)}
          aria-label={t.next}
          className="absolute right-2 top-1/2 -translate-y-1/2 hidden [@media(hover:hover)]:flex items-center justify-center w-9 h-9 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* 今何枚目かの点（押すとその写真へ） */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {sources.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToIndex(i)}
            aria-label={t.counter(i + 1, total)}
            aria-current={i === index ? 'true' : undefined}
            className={`w-2 h-2 rounded-full shadow transition-colors ${i === index ? 'bg-white' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  )
}
