'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X, Heart } from 'lucide-react'

export default function SimpleHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-sakura-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-sakura-400 to-sakura-600 rounded-full flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold sakura-text-gradient">Sakura Club</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/about" className="text-gray-700 hover:text-sakura-600 transition-colors">
            サービスについて
          </Link>
          <Link href="/how-it-works" className="text-gray-700 hover:text-sakura-600 transition-colors">
            仕組み
          </Link>
          <Link href="/safety" className="text-gray-700 hover:text-sakura-600 transition-colors">
            安心・安全
          </Link>
          <Link href="/experiences" className="text-gray-700 hover:text-sakura-600 transition-colors">
            文化体験
          </Link>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <Link href="/login">
            <Button variant="outline" size="sm">
              ログイン
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="sakura" size="sm">
              新規登録
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-sakura-100">
          <nav className="container mx-auto px-4 py-4 space-y-4">
            <Link href="/about" className="block text-gray-700 hover:text-sakura-600">
              サービスについて
            </Link>
            <Link href="/how-it-works" className="block text-gray-700 hover:text-sakura-600">
              仕組み
            </Link>
            <Link href="/safety" className="block text-gray-700 hover:text-sakura-600">
              安心・安全
            </Link>
            <Link href="/experiences" className="block text-gray-700 hover:text-sakura-600">
              文化体験
            </Link>
            <div className="pt-4 border-t border-sakura-100">
              <div className="flex items-center space-x-4">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    ログイン
                  </Button>
                </Link>
                <Link href="/signup" className="flex-1">
                  <Button variant="sakura" size="sm" className="w-full">
                    新規登録
                  </Button>
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}