'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
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
  Star,
  X,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

function ProfileDetailContent() {
  const params = useParams()
  const router = useRouter()
  const profileId = params.id as string
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // APIからプロフィールデータを取得
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/matches?devTest=true')
        const data = await response.json()
        
        if (data.matches) {
          // プロフィールIDに一致するデータを検索
          const foundProfile = data.matches.find((match: any) => match.id === profileId)
          
          if (foundProfile) {
            // APIデータをプロフィール詳細用の形式に変換
            const profileData = {
              id: foundProfile.id,
              name: `${foundProfile.firstName} ${foundProfile.lastName}`.trim(),
              age: foundProfile.age,
              location: foundProfile.prefecture + (foundProfile.city ? ` ${foundProfile.city}` : ''),
              occupation: 'ソフトウェアエンジニア', // TODO: APIに追加予定
              height: '180cm', // TODO: APIに追加予定
              bodyType: '普通', // TODO: APIに追加予定
              images: foundProfile.profileImage ? [foundProfile.profileImage] : [],
              bio: foundProfile.selfIntroduction,
              interests: foundProfile.hobbies || [],
              languages: foundProfile.nationality === 'アメリカ' ? ['英語（ネイティブ）', '日本語（初級）'] : ['日本語（ネイティブ）', '英語（初級）'],
              maritalStatus: '未婚',
              visitPurpose: foundProfile.nationality === 'アメリカ' ? '文化体験・言語交流' : '文化交流・国際理解',
              stayDuration: foundProfile.nationality === 'アメリカ' ? '3ヶ月' : '東京在住',
              previousExperiences: [
                { title: '文化交流イベント', date: '2024年11月', rating: 5, comment: '素晴らしい体験でした！' }
              ]
            }
            setProfile(profileData)
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [profileId])

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [specialMessage, setSpecialMessage] = useState('')
  const [isSpecialApproachOpen, setIsSpecialApproachOpen] = useState(false)

  const handleSpecialApproach = () => {
    // スペシャルアプローチ送信処理
    console.log('スペシャルアプローチ送信:', specialMessage)
    setIsSpecialApproachOpen(false)
    setSpecialMessage('')
    // 成功メッセージ表示など
  }

  const SpecialApproachModal = () => (
    <Dialog open={isSpecialApproachOpen} onOpenChange={setIsSpecialApproachOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center text-center">
            <Sparkles className="w-5 h-5 mr-2 text-sakura-600" />
            スペシャルアプローチ
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-sakura-100 to-sakura-200 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-sakura-600" />
            </div>
            <h3 className="font-semibold text-gray-900">気になるお相手に、</h3>
            <p className="text-sm text-gray-600">
              「いいね」と合わせて、<br />
              お誘いのメッセージを添えて<br />
              アピールしましょう！
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">簡単</span>
              <span className="text-sm text-gray-500">一緒にやりたいことを伝える</span>
            </div>
            <Button 
              variant="outline" 
              className="w-full bg-blue-100 border-blue-200 text-blue-700 hover:bg-blue-200"
              onClick={() => setSpecialMessage('一緒に文化体験を楽しみませんか？お互いの文化を学び合いながら、素敵な時間を過ごしましょう！')}
            >
              アクティビティへのお誘い
            </Button>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">簡単</span>
              <span className="text-sm text-gray-500">一緒に話したい内容を伝える</span>
            </div>
            <Button 
              variant="outline" 
              className="w-full bg-green-100 border-green-200 text-green-700 hover:bg-green-200"
              onClick={() => setSpecialMessage('あなたのプロフィールを拝見して、とても興味深く感じました。ぜひお話しさせていただけませんか？')}
            >
              相談・雑談へのお誘い
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">ゼロからメッセージを考える</label>
            <Textarea
              placeholder="メッセージを入力してください（最大200文字）"
              value={specialMessage}
              onChange={(e) => setSpecialMessage(e.target.value)}
              maxLength={200}
              rows={4}
              className="resize-none"
            />
            <div className="text-xs text-gray-500 text-right">
              {specialMessage.length}/200文字
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <Button 
              onClick={handleSpecialApproach}
              disabled={!specialMessage.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              メッセージ付きいいね
            </Button>
          </div>

          <div className="flex items-center justify-center text-xs text-gray-500">
            <span className="flex items-center">
              ⚠️ スペシャルアプローチ送信時にSCポイントを4pt消費します。
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-sakura-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">プロフィールを読み込み中...</p>
        </div>
      </div>
    )
  }

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
                {profile.images && profile.images[currentImageIndex] ? (
                  <img 
                    src={profile.images[currentImageIndex]} 
                    alt={`${profile.name}のプロフィール写真`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="w-24 h-24 text-sakura-400" />
                )}
              </div>

              {/* Image Thumbnails */}
              {profile.images.length > 1 && (
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-2">
                    {profile.images.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`aspect-square rounded-lg bg-gradient-to-br from-sakura-100 to-sakura-200 flex items-center justify-center overflow-hidden ${
                          currentImageIndex === index ? 'ring-2 ring-sakura-500' : ''
                        }`}
                      >
                        {image ? (
                          <img 
                            src={image} 
                            alt={`${profile.name}の写真 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Camera className="w-6 h-6 text-sakura-400" />
                        )}
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
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  onClick={() => setIsSpecialApproachOpen(true)}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  スペシャルアプローチ
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
                <div className="text-gray-600 space-y-1">
                  <p className="text-lg">{profile.age}歳, {profile.location}</p>
                  <p className="text-base">{profile.occupation}, {profile.height}, {profile.bodyType}</p>
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
                    {profile.interests.map((interest: string, index: number) => (
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
                  {profile.languages.map((language: string, index: number) => (
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
                {profile.previousExperiences.map((exp: any, index: number) => (
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

      {/* スペシャルアプローチモーダル */}
      <SpecialApproachModal />
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