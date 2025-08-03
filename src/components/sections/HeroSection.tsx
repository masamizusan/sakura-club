'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Shield, Heart, Globe, Star } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="hero-section min-h-[90vh] flex items-center relative">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="space-y-4 animate-fade-in">
                <h1 className="hero-title font-bold text-gray-900">
                  文化体験を通じた
                  <span className="sakura-text-gradient block">真の出会い</span>
                </h1>
                <p className="hero-subtitle text-gray-700 max-w-2xl lg:max-w-none">
                  訪日外国人男性と日本人女性が、茶道・書道・料理教室などの文化体験を通じて自然な出会いを楽しめる、安心・安全なプラットフォームです。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center animate-fade-in">
                <Button variant="sakura" size="lg" className="px-8 py-3 text-lg">
                  今すぐ始める
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                  仕組みを見る
                </Button>
              </div>
            </div>

            {/* Right Column - Hero Image */}
            <div className="flex justify-center lg:justify-end animate-fade-in">
              <div className="relative w-full max-w-lg lg:max-w-xl">
                <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="/hero-image.png"
                    alt="文化体験で出会う笑顔の日本人女性 - Sakura Club"
                    fill
                    className="object-cover object-center"
                    priority
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                  />
                  {/* Subtle overlay for better contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                </div>
                
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-sakura-600" />
                </div>
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-sakura-100 rounded-full shadow-lg flex items-center justify-center">
                  <Globe className="w-8 h-8 text-sakura-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-4xl mx-auto mt-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-sakura-100 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-sakura-600" />
              </div>
              <h3 className="font-semibold text-gray-900">安心・安全</h3>
              <p className="text-gray-600 text-sm">
                本人確認と審査制で<br />
                安全な出会いを保証
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-sakura-100 rounded-full flex items-center justify-center mx-auto">
                <Heart className="w-6 h-6 text-sakura-600" />
              </div>
              <h3 className="font-semibold text-gray-900">文化交流</h3>
              <p className="text-gray-600 text-sm">
                茶道・書道・料理など<br />
                本物の日本文化を体験
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-sakura-100 rounded-full flex items-center justify-center mx-auto">
                <Globe className="w-6 h-6 text-sakura-600" />
              </div>
              <h3 className="font-semibold text-gray-900">国際交流</h3>
              <p className="text-gray-600 text-sm">
                言語を学び合い<br />
                国境を越えたつながり
              </p>
            </div>
          </div>
        </div>

        {/* User Testimonial */}
        <div className="max-w-2xl mx-auto mt-16">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center justify-center space-x-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-sm text-gray-700 mb-2">
              &ldquo;文化体験を通じて自然な出会いができて、言語交換も楽しめました。安心してコミュニケーションが取れる環境が素晴らしいです。&rdquo;
            </p>
            <p className="text-xs text-gray-500">- 東京都 Yuki さん（女性・27歳）</p>
          </div>
        </div>

      <div className="absolute top-20 left-10 w-4 h-4 bg-sakura-300 rounded-full opacity-60 animate-pulse" />
      <div className="absolute top-40 right-20 w-3 h-3 bg-sakura-400 rounded-full opacity-40 animate-pulse delay-1000" />
      <div className="absolute bottom-32 left-20 w-2 h-2 bg-sakura-500 rounded-full opacity-50 animate-pulse delay-2000" />
      </div>
    </section>
  )
}