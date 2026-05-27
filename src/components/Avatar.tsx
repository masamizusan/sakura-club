'use client'

import { useEffect, useMemo, useState } from 'react'
import { User } from 'lucide-react'
import { resolveAvatarSrc } from '@/utils/imageResolver'

type AvatarProps = {
  src: string | null | undefined
  alt: string
  className?: string
}

export default function Avatar({ src, alt, className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  const resolvedSrc = useMemo(() => resolveAvatarSrc(src), [src])

  useEffect(() => {
    setImgError(false)
  }, [resolvedSrc])

  if (!resolvedSrc || imgError) {
    return (
      <div className={`flex items-center justify-center bg-[#ede0d4] ${className}`}>
        <User className="w-1/2 h-1/2 text-[#d4a89a]" />
      </div>
    )
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
    />
  )
}
