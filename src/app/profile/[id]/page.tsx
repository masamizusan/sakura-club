'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import AuthGuard from '@/components/auth/AuthGuard'
import { 
  Heart, 
  Users, 
  MessageCircle, 
  ArrowLeft,
  MapPin,
  Calendar,
  Camera,
  Gift,
  Star
} from 'lucide-react'
import Link from 'next/link'

function ProfileDetailContent() {
  const params = useParams()
  const router = useRouter()
  const profileId = params.id as string

  // モックデータ（実際はAPIから取得）
  const mockProfiles = {
    '1': {
      id: '1',
      name: 'Michael',
      age: 29,
      location: 'アメリカ',
      occupation: 'IT',
      height: '178cm',
      bodyType: 'ややぽっちゃり',
      images: [
        '/api/placeholder/400/500',
        '/api/placeholder/400/500', 
        '/api/placeholder/400/500'
      ],
      bio: 'こんにちは！アメリカから来たMichaelです🇺🇸 日本の文化が大好きで、特に茶道と書道に興味があります。日本語を勉強中で、お互いの言語を教え合いながら素敵な時間を過ごせたらと思います😊\n\n仕事はソフトウェアエンジニアをしていて、リモートワークで世界中を旅しながら働いています。日本の四季の美しさと、おもてなしの心に感動しています。\n\n週末は新しい場所を探索したり、現地の人々と交流するのが好きです。一緒に日本の文化を体験しながら、お互いの国の文化も共有できたら嬉しいです！',
      interests: ['茶道', '書道', '日本語学習', 'プログラミング', '旅行', '写真'],
      languages: ['英語（ネイティブ）', '日本語（初級）', 'スペイン語（中級）'],
      maritalStatus: '未婚',
      visitPurpose: '文化体験・言語交換',
      stayDuration: '3ヶ月',
      previousExperiences: [
        { title: '書道体験', date: '2024年1月', rating: 5, comment: '素晴らしい体験でした！' },
        { title: '茶道入門', date: '2024年2月', rating: 5, comment: '日本の心を学べました' }
      ]
    },
    '2': {
      id: '2',
      name: 'David',
      age: 32,
      location: 'イギリス',
      occupation: '自営業',
      height: '182cm',
      bodyType: '普通',
      images: [
        '/api/placeholder/400/500',
        '/api/placeholder/400/500'
      ],
      bio: 'Hello! イギリス出身のDavidです🇬🇧 日本の料理と文化に魅了されています。和食作りを学びたいと思っています。一緒に日本の素晴らしい文化を体験しませんか？\n\n建築家として働いており、日本の伝統建築と現代建築の融合に興味があります。京都の古い寺院から東京の最新建築まで、すべてが学びになります。\n\n料理が趣味で、特に和食の奥深さに感動しています。一緒に料理を作りながら、文化交流ができれば最高ですね！',
      interests: ['和食料理', '日本酒', '旅行', '建築', 'デザイン', '歴史'],
      languages: ['英語（ネイティブ）', '日本語（中級）', 'フランス語（初級）'],
      maritalStatus: '未婚',
      visitPurpose: '文化研究・料理学習',
      stayDuration: '6ヶ月',
      previousExperiences: [
        { title: '和食料理教室', date: '2024年1月', rating: 5, comment: '本格的な技術を学べました' }
      ]
    },
    '3': {
      id: '3',
      name: 'Marco',
      age: 26,
      location: 'イタリア',
      occupation: '芸能・エンタメ',
      height: '175cm',
      bodyType: 'スリム',
      images: [
        '/api/placeholder/400/500',
        '/api/placeholder/400/500',
        '/api/placeholder/400/500',
        '/api/placeholder/400/500'
      ],
      bio: 'Ciao! イタリアから来ましたMarcoです🇮🇹 日本のアートと伝統工芸に深い関心があります。華道や陶芸を学びながら、日本の心を理解したいです。文化交流を通じて素敵な出会いがあれば嬉しいです✨\n\nアーティストとして活動しており、日本の美意識を自分の作品に取り入れたいと考えています。特に「わび・さび」の概念に魅力を感じています。\n\n音楽も大好きで、ギターを弾きます。日本の伝統音楽と西洋音楽の融合にも興味があります。一緒に芸術について語り合いましょう！',
      interests: ['華道', '陶芸', '美術', '音楽', 'ギター', '哲学'],
      languages: ['イタリア語（ネイティブ）', '英語（上級）', '日本語（初級）'],
      maritalStatus: '未婚',
      visitPurpose: '芸術研究・文化体験',
      stayDuration: '4ヶ月',
      previousExperiences: [
        { title: '華道体験', date: '2024年2月', rating: 5, comment: '美の真髄を学びました' },
        { title: '陶芸教室', date: '2024年2月', rating: 4, comment: '難しいですが楽しい！' }
      ]
    }
  }

  const profile = mockProfiles[profileId as keyof typeof mockProfiles]
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">プロフィールが見つかりません</h2>
          <Link href="/dashboard">
            <Button variant="sakura">ダッシュボードに戻る</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">{profile.name}さんのプロフィール</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Images */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden sticky top-6">
              {/* Main Image */}
              <div className="relative h-96 bg-gradient-to-br from-sakura-100 to-sakura-200 flex items-center justify-center">
                <Users className="w-24 h-24 text-sakura-400" />
              </div>

              {/* Image Thumbnails */}
              {profile.images.length > 1 && (
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-2">
                    {profile.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`aspect-square rounded-lg bg-gradient-to-br from-sakura-100 to-sakura-200 flex items-center justify-center ${
                          currentImageIndex === index ? 'ring-2 ring-sakura-500' : ''
                        }`}
                      >
                        <Camera className="w-6 h-6 text-sakura-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-4 space-y-3">
                <Button variant="sakura" className="w-full" size="lg">
                  <Heart className="w-4 h-4 mr-2" />
                  いいね
                </Button>
                <Button variant="outline" className="w-full" size="lg">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  メッセージ
                </Button>
                <Button variant="outline" className="w-full" size="lg">
                  <Gift className="w-4 h-4 mr-2" />
                  ギフトを送る
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{profile.name}</h2>
                <div className="grid grid-cols-2 gap-4 text-gray-600">
                  <div>
                    <span className="text-xl">{profile.age}歳</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{profile.location}</span>
                  </div>
                  <div>
                    <span>{profile.occupation}</span>
                  </div>
                  <div>
                    <span>{profile.height}</span>
                  </div>
                  <div className="col-span-2">
                    <span>{profile.bodyType}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">自己紹介</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {profile.bio}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">興味・関心</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
                      <span key={index} className="px-3 py-1 bg-sakura-100 text-sakura-700 text-sm rounded-full">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Info */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">詳細情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">結婚状況</h4>
                  <p className="text-gray-700">{profile.maritalStatus}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">訪日目的</h4>
                  <p className="text-gray-700">{profile.visitPurpose}</p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="font-semibold text-gray-900 mb-1">滞在予定</h4>
                  <p className="text-gray-700">{profile.stayDuration}</p>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-semibold text-gray-900 mb-2">話せる言語</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((language, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Experience History */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">文化体験履歴</h3>
              <div className="space-y-4">
                {profile.previousExperiences.map((exp, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{exp.title}</h4>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < exp.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Calendar className="w-4 h-4 mr-1" />
                      {exp.date}
                    </div>
                    <p className="text-gray-700 text-sm">{exp.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfileDetailPage() {
  return (
    <AuthGuard>
      <ProfileDetailContent />
    </AuthGuard>
  )
}