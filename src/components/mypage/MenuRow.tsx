'use client'

import { ChevronRight, LucideIcon, Heart } from 'lucide-react'
import { ReactNode } from 'react'

interface MenuRowProps {
  /** 左側のアイコン（Lucide icon） */
  icon: LucideIcon
  /** メインラベル */
  label: string
  /** サブテキスト（オプション） */
  subText?: string
  /** 右側に表示する値やバッジ（オプション） */
  rightContent?: ReactNode
  /** クリック可能かどうか（falseの場合は矢印非表示） */
  clickable?: boolean
  /** クリック時のハンドラ */
  onClick?: () => void
  /** アイコンの色（デフォルト: #8b1a2e） */
  iconColor?: string
  /** ラベルの色（デフォルト: var(--color-text)） */
  labelColor?: string
  /** 区切り線を表示するか（デフォルト: true） */
  showDivider?: boolean
  /** アイコン右上に赤丸ドットを表示するか（未読バッジ用） */
  showBadge?: boolean
}

export function MenuRow({
  icon: Icon,
  label,
  subText,
  rightContent,
  clickable = true,
  onClick,
  iconColor,
  labelColor,
  showDivider = true,
  showBadge = false
}: MenuRowProps) {
  const Component = clickable && onClick ? 'button' : 'div'

  return (
    <Component
      onClick={clickable && onClick ? onClick : undefined}
      className={`
        w-full flex items-center px-4 py-4
        ${clickable && onClick ? 'cursor-pointer' : ''}
        transition-colors
      `}
      style={{
        borderBottom: showDivider ? '1px solid var(--color-border)' : undefined,
      }}
      onMouseEnter={clickable && onClick ? (e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#ede0d4' } : undefined}
      onMouseLeave={clickable && onClick ? (e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '' } : undefined}
    >
      {/* 左側アイコン */}
      <div className="relative mr-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${iconColor || ''}`}
          style={{ backgroundColor: '#ede0d4', color: iconColor ? undefined : '#8b1a2e' }}
        >
          <Icon className="w-5 h-5" />
        </div>
        {showBadge && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"
            aria-label="未読通知あり"
          />
        )}
      </div>

      {/* 中央テキスト */}
      <div className="flex-1 text-left">
        <div
          className={`font-medium ${labelColor || ''}`}
          style={{ color: labelColor ? undefined : 'var(--color-text)' }}
        >
          {label}
        </div>
        {subText && (
          <div className="text-sm mt-0.5" style={{ color: 'var(--color-text-sub)' }}>
            {subText}
          </div>
        )}
      </div>

      {/* 右側コンテンツ */}
      {rightContent && (
        <div className="mr-2">
          {rightContent}
        </div>
      )}

      {/* 右矢印 */}
      {clickable && onClick && (
        <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text-sub)' }} />
      )}
    </Component>
  )
}

/**
 * 残りいいね数表示用の特殊コンポーネント
 */
interface LikeRemainingRowProps {
  remaining: number
  limit: number
  /** ラベル（多言語対応用） */
  label?: string
}

export function LikeRemainingRow({ remaining, limit, label }: LikeRemainingRowProps) {
  return (
    <div className="w-full flex items-center px-4 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
      {/* 左側アイコン */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#ede0d4' }}>
        <Heart className="w-5 h-5" style={{ color: '#8b1a2e' }} />
      </div>

      {/* 中央テキスト */}
      <div className="flex-1 text-left">
        <div className="font-medium" style={{ color: 'var(--color-text)' }}>
          {label || '残りいいね数（今日）'}
        </div>
      </div>

      {/* 右側コンテンツ：残り数表示 */}
      <div className="flex items-center font-bold gap-1">
        <Heart className="w-4 h-4 fill-current" style={{ color: '#8b1a2e' }} />
        <span className="text-lg" style={{ color: '#8b1a2e' }}>{remaining}</span>
        <span className="font-normal" style={{ color: 'var(--color-text-sub)' }}>/ {limit}</span>
      </div>
    </div>
  )
}
