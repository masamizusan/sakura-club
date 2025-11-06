'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  History, 
  User,
  MapPin,
  Clock,
  Eye
} from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import AuthGuard from '@/components/auth/AuthGuard'

// 足跡データの型定義
interface FootprintUser {
  id: string
  firstName: string
  lastName: string
  age: number
  nationality: string
  nationalityLabel: string
  prefecture: string
  city: string
  profileImage?: string
  visitedAt: string
  isOnline: boolean
}

// サンプル足跡データ
const SAMPLE_FOOTPRINTS: FootprintUser[] = [
  {
    id: 'user1',
    firstName: 'John',
    lastName: 'Smith',
    age: 30,
    nationality: 'US',
    nationalityLabel: 'アメリカ',
    prefecture: '東京都',
    city: '新宿区',
    visitedAt: '2025-07-30T14:30:00Z',
    isOnline: true
  },
  {
    id: 'user2',
    firstName: 'Emma',
    lastName: 'Wilson',
    age: 27,
    nationality: 'GB',
    nationalityLabel: 'イギリス',
    prefecture: '東京都',
    city: '渋谷区',
    visitedAt: '2025-07-30T10:15:00Z',
    isOnline: false
  }
]

function FootprintsContent() {
  const [footprints] = useState<FootprintUser[]>(SAMPLE_FOOTPRINTS)

  const formatVisitTime = (visitedAtString: string) => {
    const visitedAt = new Date(visitedAtString)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - visitedAt.getTime()) / (1000 * 60))
    
    if (diffMinutes < 60) {
      return `${diffMinutes}分前`
    } else if (diffMinutes < 24 * 60) {
      return `${Math.floor(diffMinutes / 60)}時間前`
    } else {
      return `${Math.floor(diffMinutes / (24 * 60))}日前`
    }
  }

  const content = (
    <div className="min-h-screen bg-gradient-to-br from-sakura-50 to-sakura-100">
      {/* Sidebar */}
      <Sidebar className="w-64 hidden md:block" />
      
      <div className="md:ml-64 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">足跡</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              あなたのプロフィールを見てくれた方々です
            </p>
          </div>

          {/* 足跡一覧 */}
          {footprints.length > 0 ? (
            <div className="space-y-4">
              {footprints.map((user) => (
                <div key={user.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* プロフィール画像 */}
                      <div className="w-16 h-16 bg-gradient-to-br from-sakura-200 to-sakura-300 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      
                      {/* ユーザー情報 */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {user.firstName} {user.lastName}, {user.age}
                        </h3>
                        <div className="flex items-center text-gray-600 mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{user.prefecture} {user.city}</span>
                          <span className="ml-3 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {user.nationalityLabel}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-500 mt-2">
                          <Clock className="w-4 h-4 mr-1" />
                          <span className="text-sm">{formatVisitTime(user.visitedAt)}に訪問</span>
                          {user.isOnline && (
                            <span className="ml-3 flex items-center text-green-600 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                              オンライン中
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* アクションボタン */}
                    <div className="flex space-x-3">
                      <Link href={`/profile/${user.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          プロフィール
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <History className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                まだ足跡がありません
              </h3>
              <p className="text-gray-600 mb-4">
                プロフィールを充実させて、より多くの方に見つけてもらいましょう
              </p>
              <Link href="/mypage">
                <Button variant="sakura">
                  プロフィールを編集
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return <AuthGuard>{content}</AuthGuard>
}

export default function FootprintsPage() {
  return <FootprintsContent />
}