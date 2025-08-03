import Link from 'next/link'
import { Heart, Mail, Shield, Users, Globe } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-sakura-400 to-sakura-600 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold sakura-text-gradient">Sakura Club</span>
            </div>
            <p className="text-gray-600 text-sm">
              訪日外国人と日本人女性が<br />
              文化体験を通じて出会う<br />
              安心・安全なプラットフォーム
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">サービス</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-gray-600 hover:text-sakura-600 transition-colors">
                  私たちについて
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-gray-600 hover:text-sakura-600 transition-colors">
                  仕組み
                </Link>
              </li>
              <li>
                <Link href="/experiences" className="text-gray-600 hover:text-sakura-600 transition-colors">
                  文化体験
                </Link>
              </li>
              <li>
                <Link href="/success-stories" className="text-gray-600 hover:text-sakura-600 transition-colors">
                  成功事例
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">サポート</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/safety" className="text-gray-600 hover:text-sakura-600 transition-colors flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  安全性
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-gray-600 hover:text-sakura-600 transition-colors">
                  ヘルプセンター
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-sakura-600 transition-colors flex items-center">
                  <Mail className="w-3 h-3 mr-1" />
                  お問い合わせ
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-gray-600 hover:text-sakura-600 transition-colors flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  コミュニティ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">法的情報</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-sakura-600 transition-colors">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-sakura-600 transition-colors">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/guidelines" className="text-gray-600 hover:text-sakura-600 transition-colors">
                  コミュニティガイドライン
                </Link>
              </li>
              <li>
                <button className="text-gray-600 hover:text-sakura-600 transition-colors flex items-center">
                  <Globe className="w-3 h-3 mr-1" />
                  English
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © 2024 Sakura Club. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs mt-2 md:mt-0">
            安心・安全な文化交流プラットフォーム
          </p>
        </div>
      </div>
    </footer>
  )
}