import HeroSection from '@/components/sections/HeroSection'
import { Button } from '@/components/ui/button'
import { ArrowRight, Users, Calendar, MessageCircle, Award, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <CTASection />
    </div>
  )
}

function HowItWorksSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            簡単3ステップで始められます
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            面倒な手続きは一切なし。今すぐ文化体験を通じた素敵な出会いを始めましょう。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-sakura-100 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-sakura-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">1. 会員登録</h3>
            <p className="text-gray-600">
              本人確認を含む簡単な登録プロセスで、安全な環境を構築します。
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-sakura-100 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8 text-sakura-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">2. 体験を選択</h3>
            <p className="text-gray-600">
              茶道、書道、料理教室など、興味のある日本文化体験を選択します。
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-sakura-100 rounded-full flex items-center justify-center mx-auto">
              <MessageCircle className="w-8 h-8 text-sakura-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">3. 交流開始</h3>
            <p className="text-gray-600">
              文化体験を通じて自然なコミュニケーションと出会いを楽しみます。
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section className="py-20 sakura-gradient">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            なぜSakura Clubが選ばれるのか
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 text-center space-y-3">
            <Award className="w-8 h-8 text-sakura-600 mx-auto" />
            <h3 className="font-semibold text-gray-900">厳格な審査制</h3>
            <p className="text-gray-600 text-sm">
              すべての会員に本人確認と審査を実施
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 text-center space-y-3">
            <CheckCircle className="w-8 h-8 text-sakura-600 mx-auto" />
            <h3 className="font-semibold text-gray-900">金銭取引禁止</h3>
            <p className="text-gray-600 text-sm">
              健全な文化交流のみを目的とした環境
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 text-center space-y-3">
            <Users className="w-8 h-8 text-sakura-600 mx-auto" />
            <h3 className="font-semibold text-gray-900">24時間サポート</h3>
            <p className="text-gray-600 text-sm">
              専門スタッフによる安心のサポート体制
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 text-center space-y-3">
            <MessageCircle className="w-8 h-8 text-sakura-600 mx-auto" />
            <h3 className="font-semibold text-gray-900">多言語対応</h3>
            <p className="text-gray-600 text-sm">
              日本語・英語での完全サポート
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="py-20 bg-gray-900 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">
          今すぐ文化体験を通じた出会いを始めませんか？
        </h2>
        <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
          Sakura Clubで、安心・安全な環境で素敵な文化交流と出会いを体験してください。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button variant="sakura" size="lg" className="px-8 py-3 text-lg">
              無料で始める
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link href="/about">
            <Button variant="outline" size="lg" className="px-8 py-3 text-lg border-white text-white hover:bg-white hover:text-gray-900">
              詳しく見る
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}