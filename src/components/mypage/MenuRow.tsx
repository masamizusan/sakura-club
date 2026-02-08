'use client'

import { ChevronRight, LucideIcon } from 'lucide-react'
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
  /** アイコンの色（デフォルト: text-gray-500） */
  iconColor?: string
  /** ラベルの色（デフォルト: text-gray-800） */
  labelColor?: string
  /** 区切り線を表示するか（デフォルト: true） */
  showDivider?: boolean
}

export function MenuRow({
  icon: Icon,
  label,
  subText,
  rightContent,
  clickable = true,
  onClick,
  iconColor = 'text-gray-500',
  labelColor = 'text-gray-800',
  showDivider = true
}: MenuRowProps) {
  const Component = clickable && onClick ? 'button' : 'div'

  return (
    <Component
      onClick={clickable && onClick ? onClick : undefined}
      className={`
        w-full flex items-center px-4 py-4
        ${clickable && onClick ? 'hover:bg-gray-50 active:bg-gray-100 cursor-pointer' : ''}
        ${showDivider ? 'border-b border-gray-100' : ''}
        transition-colors
      `}
    >
      {/* 左側アイコン */}
      <div className={`w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* 中央テキスト */}
      <div className="flex-1 text-left">
        <div className={`font-medium ${labelColor}`}>
          {label}
        </div>
        {subText && (
          <div className="text-sm text-gray-500 mt-0.5">
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
        <ChevronRight className="w-5 h-5 text-gray-400" />
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
}

export function LikeRemainingRow({ remaining, limit }: LikeRemainingRowProps) {
  return (
    <div className="w-full flex items-center px-4 py-4 border-b border-gray-100">
      {/* 左側アイコン */}
      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mr-3">
        <span className="text-lg">👍</span>
      </div>

      {/* 中央テキスト */}
      <div className="flex-1 text-left">
        <div className="font-medium text-gray-800">
          残りいいね数（今日）
        </div>
      </div>

      {/* 右側コンテンツ：残り数表示 */}
      <div className="flex items-center text-orange-600 font-bold">
        <span className="text-lg mr-1">👍</span>
        <span className="text-lg">{remaining}</span>
        <span className="text-gray-400 font-normal ml-1">/ {limit}</span>
      </div>
    </div>
  )
}
