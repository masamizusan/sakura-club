'use client'

import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, User, X } from 'lucide-react'
import { resolveAvatarSrc } from '@/utils/imageResolver'
import { useLanguage } from '@/contexts/LanguageContext'
import type { SupportedLanguage } from '@/utils/language'

// #55: プロフィールの写真を正方形の枠で横にめくって見る共通の部品
// （相手のプロフィール・プレビューで同じ見え方にする）
// スマホは指で横にめくる（CSS scroll-snap）、マウスで操作できる端末は左右の矢印ボタン、下に今何枚目かの点
// 写真を押すと全画面（黒の背景・写真は切らずに全体）。×・背景を押す・Esc で閉じる、←→ キーとスワイプでめくる

type GalleryDict = {
  counter: (n: number, total: number) => string
  prev: string
  next: string
  close: string
  enlarge: string
  alt: (name: string, n: number) => string
}

const T: Record<SupportedLanguage, GalleryDict> = {
  ja: {
    counter: (n, total) => `写真 ${n}/${total}`,
    prev: '前の写真',
    next: '次の写真',
    close: '閉じる',
    enlarge: '写真を拡大',
    alt: (name, n) => (name ? `${name}さんの写真 ${n}` : `写真 ${n}`),
  },
  en: {
    counter: (n, total) => `Photo ${n} of ${total}`,
    prev: 'Previous photo',
    next: 'Next photo',
    close: 'Close',
    enlarge: 'View full size',
    alt: (name, n) => (name ? `Photo ${n} of ${name}` : `Photo ${n}`),
  },
  ko: {
    counter: (n, total) => `사진 ${n}/${total}`,
    prev: '이전 사진',
    next: '다음 사진',
    close: '닫기',
    enlarge: '사진 크게 보기',
    alt: (name, n) => (name ? `${name}님의 사진 ${n}` : `사진 ${n}`),
  },
  'zh-tw': {
    counter: (n, total) => `照片 ${n}/${total}`,
    prev: '上一張照片',
    next: '下一張照片',
    close: '關閉',
    enlarge: '放大照片',
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

// 押したのか、横にめくったのかを見分ける（指・マウスが動いた距離がこれより大きければ「めくった」）
const TAP_MOVE_LIMIT_PX = 10

function useTapGuard() {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  return {
    onPointerDown: (e: PointerEvent) => {
      startRef.current = { x: e.clientX, y: e.clientY }
    },
    // click のときに呼ぶ。動いていなければ true（＝押した）
    isTap: (e: MouseEvent) => {
      const start = startRef.current
      startRef.current = null
      if (!start) return true
      return Math.abs(e.clientX - start.x) <= TAP_MOVE_LIMIT_PX && Math.abs(e.clientY - start.y) <= TAP_MOVE_LIMIT_PX
    },
  }
}

type ViewerProps = {
  sources: (string | null)[]
  name: string
  startIndex: number
  t: GalleryDict
  onClose: (lastIndex: number) => void
}

// 全画面で見る（document.body の直下に出す）
function PhotoViewer({ sources, name, startIndex, t, onClose }: ViewerProps) {
  const total = sources.length
  const trackRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [index, setIndex] = useState(startIndex)
  const indexRef = useRef(startIndex)
  indexRef.current = index
  const tapGuard = useTapGuard()

  const scrollToIndex = (target: number, smooth = true) => {
    const el = trackRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(total - 1, target))
    el.scrollTo({ left: clamped * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
  }

  // 開いたとき：押した写真の位置へ、× にフォーカス、後ろの画面をスクロールさせない
  useEffect(() => {
    scrollToIndex(startIndex, false)
    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
    // 開いたときに 1 回だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Esc で閉じる、←→ でめくる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose(indexRef.current)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        scrollToIndex(indexRef.current - 1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        scrollToIndex(indexRef.current + 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose])

  const handleScroll = () => {
    const el = trackRef.current
    if (!el || el.clientWidth === 0) return
    const next = Math.round(el.scrollLeft / el.clientWidth)
    setIndex(Math.max(0, Math.min(total - 1, next)))
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={t.counter(index + 1, total)}
    >
      {/* 写真（切らずに全体を表示）。写真の外（黒い部分）を押すと閉じる */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="absolute inset-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sources.map((src, i) => (
          <div
            key={i}
            className="h-full w-full flex-shrink-0 snap-center [scroll-snap-stop:always] flex items-center justify-center"
            onPointerDown={tapGuard.onPointerDown}
            onClick={(e) => {
              if (e.target === e.currentTarget && tapGuard.isTap(e)) onClose(indexRef.current)
            }}
          >
            <GalleryImage src={src} alt={t.alt(name, i + 1)} className="max-w-full max-h-full object-contain" />
          </div>
        ))}
      </div>

      {/* 何枚目か */}
      {total > 1 && (
        <div className="absolute top-4 left-4 text-white text-sm bg-black/40 rounded-full px-3 py-1" aria-hidden="true">
          {index + 1}/{total}
        </div>
      )}

      {/* × */}
      <button
        ref={closeButtonRef}
        type="button"
        onClick={() => onClose(indexRef.current)}
        aria-label={t.close}
        className="absolute top-3 right-3 flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* 左右の矢印（マウスで操作できる端末だけ） */}
      {total > 1 && index > 0 && (
        <button
          type="button"
          onClick={() => scrollToIndex(index - 1)}
          aria-label={t.prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 hidden [@media(hover:hover)]:flex items-center justify-center w-11 h-11 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {total > 1 && index < total - 1 && (
        <button
          type="button"
          onClick={() => scrollToIndex(index + 1)}
          aria-label={t.next}
          className="absolute right-3 top-1/2 -translate-y-1/2 hidden [@media(hover:hover)]:flex items-center justify-center w-11 h-11 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>,
    document.body
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
  // 全画面で開いている写真の番号（閉じているときは null）
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const tapGuard = useTapGuard()

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

  // 全画面を閉じたら、最後に見ていた写真の位置に合わせる
  const closeViewer = (lastIndex: number) => {
    setViewerIndex(null)
    const el = trackRef.current
    if (el) el.scrollTo({ left: lastIndex * el.clientWidth })
  }

  const viewer = viewerIndex !== null && (
    <PhotoViewer sources={sources} name={name} startIndex={viewerIndex} t={t} onClose={closeViewer} />
  )

  // 写真を押したら全画面（横にめくった操作では開かない）
  const slideButtonProps = (i: number) => ({
    type: 'button' as const,
    'aria-label': t.enlarge,
    onPointerDown: tapGuard.onPointerDown,
    onClick: (e: MouseEvent) => {
      if (tapGuard.isTap(e)) setViewerIndex(i)
    },
  })

  // 写真が 0 枚：今までどおりアイコン（押しても何もしない）
  if (total === 0) {
    return (
      <div className="relative aspect-square bg-gray-100">
        <GalleryImage src={null} alt={t.alt(name, 1)} className="w-full h-full object-cover" />
      </div>
    )
  }

  // 写真が 1 枚：矢印・点は出さない（今までの見た目のまま）
  if (total === 1) {
    return (
      <div className="relative aspect-square bg-gray-100">
        <button {...slideButtonProps(0)} className="block w-full h-full cursor-zoom-in">
          <GalleryImage src={sources[0]} alt={t.alt(name, 1)} className="w-full h-full object-cover" />
        </button>
        {viewer}
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
            <button {...slideButtonProps(i)} className="block w-full h-full cursor-zoom-in">
              <GalleryImage src={src} alt={t.alt(name, i + 1)} className="w-full h-full object-cover" />
            </button>
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

      {viewer}
    </div>
  )
}
