import { Button } from '@/components/ui/button'
import { ArrowRight, Heart, Shield, Globe } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <FeaturesSection />
    </div>
  )
}

function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sakura-400 to-sakura-600 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-red-500">Sakura Club</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-600 hover:text-gray-900">サービスについて</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">仕組み</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">安心・安全</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">文化体験</a>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="outline">ログイン</Button>
            </Link>
            <Link href="/signup">
              <Button variant="sakura">新規登録</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-pink-50 via-white to-sakura-50 py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                文化体験を通じた
                <br />
                <span className="text-red-500">真の出会い</span>
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                訪日外国人男性と日本人女性が、茶道・書道・料理教室
                <br />
                などの文化体験を通じて自然な出会いを楽しめる、安
                <br />
                心・安全なプラットフォームです。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-red-500 hover:bg-red-600 text-white px-8 py-3">
                  無料で始める（女性無料）
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="px-8 py-3">
                  ログインはこちら
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="aspect-[4/5] bg-gradient-to-br from-green-100 to-green-200 rounded-2xl overflow-hidden">
              {/* Main photo */}
              <img 
                src="/hero-image.png" 
                alt="文化体験を楽しむ日本人女性の笑顔"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Heart icon overlay */}
            <div className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {/* 安心・安全 */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">安心・安全</h3>
            <p className="text-gray-600">
              本人確認と審査制で
              <br />
              安全な出会いを保証
            </p>
          </div>

          {/* 文化交流 */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8 text-pink-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">文化交流</h3>
            <p className="text-gray-600">
              茶道・書道・料理など
              <br />
              本物の日本文化を体験
            </p>
          </div>

          {/* 国際交流 */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Globe className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">国際交流</h3>
            <p className="text-gray-600">
              言語を学び合い
              <br />
              国境を越えたつながり
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}