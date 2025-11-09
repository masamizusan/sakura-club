import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET: マッチング候補の取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(request)
    const { searchParams } = new URL(request.url)
    
    // 開発テストモードの確認
    const devTestMode = searchParams.get('devTest') === 'true'
    
    if (devTestMode) {
      console.log('🧪 Dev test mode detected - using service role for database access')
      
      // 🔧 Environment variables check
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      console.log('🔧 Environment check:', {
        hasUrl: !!supabaseUrl,
        hasServiceRole: !!serviceRoleKey,
        hasAnonKey: !!anonKey,
        usingKey: serviceRoleKey ? 'SERVICE_ROLE' : 'ANON_KEY'
      })
      
      // テストモード用：service role を使用してRLSをバイパス
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      const supabase = createServiceClient(
        supabaseUrl!,
        serviceRoleKey || anonKey!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      
      console.log('🔧 SUPABASE CLIENT DEBUG:', {
        usingServiceRole: !!serviceRoleKey,
        keyLength: serviceRoleKey ? serviceRoleKey.length : 0,
        urlConfigured: !!supabaseUrl,
        clientCreated: !!supabase
      })
      
      try {
        // 🔍 Step 1: Test simple connection
        console.log('🔗 Testing Supabase connection...')
        const { data: connectionTest, error: connectionError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1)
        
        console.log('🔗 Connection test result:', {
          data: connectionTest,
          error: connectionError?.message || 'No error'
        })
        
        // 🔍 Step 2: Test basic profile fetch
        console.log('📋 Testing basic profile fetch...')
        const { data: basicProfiles, error: basicError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .limit(5)
        
        console.log('📋 Basic profiles:', {
          count: basicProfiles?.length || 0,
          profiles: basicProfiles || null,
          error: basicError?.message || 'No error'
        })
        
        // 🔍 Step 3: Test full profile fetch with filtering
        console.log('🔍 Testing filtered profiles...')
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .not('first_name', 'is', null)
          .limit(10)
        
        console.log('🔍 Filtered profiles:', {
          count: profiles?.length || 0,
          error: error?.message || 'No error',
          firstProfile: profiles?.[0] || null
        })
        
        // 🎯 CRITICAL DEBUG: 詳細なプロファイル情報をログ出力
        if (profiles && profiles.length > 0) {
          console.log('🎯 DETAILED PROFILE ANALYSIS:')
          profiles.forEach((profile, index) => {
            console.log(`Profile ${index + 1}:`, {
              id: profile.id,
              first_name: profile.first_name,
              last_name: profile.last_name,
              age: profile.age,
              nationality: profile.nationality,
              bio_length: profile.self_introduction?.length || 0,
              has_avatar: !!profile.avatar_url,
              created_at: profile.created_at
            })
          })
        }
        
        // 🎯 常に実データを優先的に処理
        if (!error && profiles && profiles.length > 0) {
          console.log('✅ SUCCESS: Retrieved real profiles from Supabase!', profiles.length)
          
          const formattedMatches = profiles.map((profile: any) => {
            console.log('🔧 Processing REAL profile:', profile.first_name, profile.last_name, profile.age)
            return {
              id: profile.id,
              firstName: profile.first_name || profile.nickname || 'Unknown',
              lastName: profile.last_name || '',
              age: profile.age || 0,
              nationality: profile.nationality || 'Unknown',
              nationalityLabel: getNationalityLabel(profile.nationality),
              prefecture: profile.prefecture || '',
              city: profile.city || '',
              hobbies: Array.isArray(profile.hobbies) ? profile.hobbies : [],
              selfIntroduction: profile.self_introduction || '',
              profileImage: profile.avatar_url || profile.profile_image || null,
              lastSeen: profile.updated_at,
              isOnline: Math.random() > 0.5,
              matchPercentage: Math.floor(Math.random() * 30) + 70,
              commonInterests: Array.isArray(profile.hobbies) ? profile.hobbies.slice(0, 2) : [],
              distanceKm: Math.floor(Math.random() * 20) + 1
            }
          })

          console.log('🎯 REAL DATA RESPONSE:', formattedMatches.length, 'profiles formatted')
          console.log('🎯 First real profile:', formattedMatches[0])
          
          return NextResponse.json({
            matches: formattedMatches,
            total: formattedMatches.length,
            hasMore: false,
            dataSource: 'REAL_SUPABASE_DATA'
          })
        }
        
        console.error('❌ NO REAL DATA - Error or empty result:', {
          hasError: !!error,
          errorMessage: error?.message,
          profileCount: profiles?.length || 0
        })
        
        if (error) {
          console.error('Database fetch error in dev test mode:', error)
          // RLSエラーの場合は、テスト用のサンプルデータを返す
          const testMatches = [
            {
              id: 'alex-johnson-test',
              firstName: 'Alex',
              lastName: 'Johnson',
              age: 28,
              nationality: 'アメリカ',
              nationalityLabel: 'アメリカ',
              prefecture: 'アメリカ',
              city: 'ニューヨーク',
              hobbies: ['旅行', '料理', '映画鑑賞'],
              selfIntroduction: 'こんにちは！アメリカから来ました。日本の文化にとても興味があります。一緒に文化交流を楽しみましょう！',
              profileImage: 'https://via.placeholder.com/400x400/4F46E5/ffffff?text=Alex',
              lastSeen: new Date().toISOString(),
              isOnline: true,
              matchPercentage: 85,
              commonInterests: ['旅行', '料理'],
              distanceKm: 15
            },
            {
              id: 'sakura-tanaka-test',
              firstName: '桜',
              lastName: '田中',
              age: 25,
              nationality: '日本',
              nationalityLabel: '日本',
              prefecture: '東京都',
              city: '渋谷区',
              hobbies: ['料理', '読書', '映画鑑賞', 'カフェ巡り'],
              selfIntroduction: 'はじめまして、桜です！東京で働いている25歳です。普段はオフィスワークをしていますが、休日は新しい文化に触れることが大好きです。',
              profileImage: 'https://via.placeholder.com/400x400/EC4899/ffffff?text=Sakura',
              lastSeen: new Date().toISOString(),
              isOnline: false,
              matchPercentage: 92,
              commonInterests: ['料理', '映画鑑賞'],
              distanceKm: 8
            }
          ]
          
          console.log('🎯 Using fallback test data due to database error')
          
          return NextResponse.json({
            matches: testMatches,
            total: testMatches.length,
            hasMore: false
          })
        }

        console.log('🔍 Found profiles in database:', profiles?.length || 0)
        console.log('🔍 Raw profile data:', profiles)
        console.log('🔍 Database query error:', error)
        
        // データベースから正しくデータが取得された場合
        if (!error && profiles && profiles.length > 0) {
          console.log('✅ Successfully retrieved profiles from database:', profiles.length)
          
          // データベースから取得したプロフィールをマッチング形式に変換
          const formattedMatches = profiles.map((profile: any) => {
            console.log('🔧 Processing profile:', profile.first_name, profile.last_name)
            return {
              id: profile.id,
              firstName: profile.first_name || profile.nickname || 'Unknown',
              lastName: profile.last_name || '',
              age: profile.age || 0,
              nationality: profile.nationality || 'Unknown',
              nationalityLabel: getNationalityLabel(profile.nationality),
              prefecture: profile.prefecture || '',
              city: profile.city || '',
              hobbies: Array.isArray(profile.hobbies) ? profile.hobbies : [],
              selfIntroduction: profile.self_introduction || '',
              profileImage: profile.avatar_url || profile.profile_image || null,
              lastSeen: profile.updated_at,
              isOnline: Math.random() > 0.5, // ランダムでオンライン状態をシミュレート
              matchPercentage: Math.floor(Math.random() * 30) + 70, // 70-100%のランダムマッチ度
              commonInterests: Array.isArray(profile.hobbies) ? profile.hobbies.slice(0, 2) : [],
              distanceKm: Math.floor(Math.random() * 20) + 1 // 1-20kmのランダム距離
            }
          })

          console.log('🎯 Formatted matches for dashboard:', formattedMatches.length)
          console.log('🎯 Sample formatted match:', formattedMatches[0])
          
          return NextResponse.json({
            matches: formattedMatches,
            total: formattedMatches.length,
            hasMore: false
          })
        }
        
        // データがない場合またはエラーがある場合
        if (error) {
          console.log('❌ Database error occurred, returning fallback data')
          console.log('❌ Error details:', error)
        } else {
          console.log('⚠️ No profiles found in database')
        }
        
        // 一時的にフォールバックデータを返す（デバッグ目的）
        const testMatches = [
          {
            id: 'alex-johnson-test',
            firstName: 'Alex',
            lastName: 'Johnson',
            age: 28,
            nationality: 'アメリカ',
            nationalityLabel: 'アメリカ',
            prefecture: 'アメリカ',
            city: 'ニューヨーク',
            hobbies: ['旅行', '料理', '映画鑑賞'],
            selfIntroduction: 'こんにちは！アメリカから来ました。日本の文化にとても興味があります。一緒に文化交流を楽しみましょう！',
            profileImage: 'https://via.placeholder.com/400x400/4F46E5/ffffff?text=Alex',
            lastSeen: new Date().toISOString(),
            isOnline: true,
            matchPercentage: 85,
            commonInterests: ['旅行', '料理'],
            distanceKm: 15
          },
          {
            id: 'sakura-tanaka-test',
            firstName: '桜',
            lastName: '田中',
            age: 25,
            nationality: '日本',
            nationalityLabel: '日本',
            prefecture: '東京都',
            city: '渋谷区',
            hobbies: ['料理', '読書', '映画鑑賞', 'カフェ巡り'],
            selfIntroduction: 'はじめまして、桜です！東京で働いている25歳です。普段はオフィスワークをしていますが、休日は新しい文化に触れることが大好きです。',
            profileImage: 'https://via.placeholder.com/400x400/EC4899/ffffff?text=Sakura',
            lastSeen: new Date().toISOString(),
            isOnline: false,
            matchPercentage: 92,
            commonInterests: ['料理', '映画鑑賞'],
            distanceKm: 8
          }
        ]
        
        return NextResponse.json({
          matches: testMatches,
          total: testMatches.length,
          hasMore: false,
          dataSource: 'FALLBACK_TEST_DATA'
        })
        
      } catch (dbError) {
        console.error('Database connection error:', dbError)
        return NextResponse.json({
          matches: [],
          total: 0,
          hasMore: false,
          error: 'Failed to connect to database'
        })
      }
    }
    
    // 通常モード：認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }
    
    return handleMatchingLogic(supabase, user, searchParams)
  } catch (error) {
    console.error('Matches GET error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// マッチングロジックを分離した関数
async function handleMatchingLogic(supabase: any, user: any, searchParams: URLSearchParams) {
  try {

  // クエリパラメータの取得
  const search = searchParams.get('search')
  const nationality = searchParams.get('nationality')
  const ageRange = searchParams.get('age')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  // 現在のユーザーのプロフィールを取得
  const { data: currentUserProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !currentUserProfile) {
    return NextResponse.json(
      { error: 'プロフィールが見つかりません' },
      { status: 404 }
    )
  }

  // 既にいいねした、またはマッチしたユーザーのIDを取得
  const { data: existingLikes } = await supabase
    .from('matches')
    .select('liked_user_id, matched_user_id')
    .or(`liker_user_id.eq.${user.id},matched_user_id.eq.${user.id}`)

  const excludeUserIds = new Set([user.id]) // 自分自身を除外
  existingLikes?.forEach((like: any) => {
    excludeUserIds.add(like.liked_user_id)
    excludeUserIds.add(like.matched_user_id)
  })

  // マッチング候補の取得クエリ
  let query = supabase
    .from('profiles')
    .select('*')
    .neq('id', user.id) // 自分以外
    .not('id', 'in', `(${Array.from(excludeUserIds).join(',')})`)

  // 検索フィルター
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,self_introduction.ilike.%${search}%`)
  }

  // 国籍フィルター
  if (nationality && nationality !== 'すべて') {
    query = query.eq('nationality', nationality)
  }

  // 年齢フィルター
  if (ageRange && ageRange !== 'すべて') {
    const [min, max] = ageRange.split('-').map(Number)
    if (max) {
      query = query.gte('age', min).lte('age', max)
    } else {
      query = query.gte('age', min)
    }
  }

  // ランダム化のために作成日でソート（後でマッチ度計算を追加予定）
  query = query.order('created_at', { ascending: false })
  query = query.range(offset, offset + limit - 1)

  const { data: candidates, error } = await query

  if (error) {
    console.error('Matches fetch error:', error)
    return NextResponse.json(
      { error: 'マッチング候補の取得に失敗しました' },
      { status: 500 }
    )
  }

  // マッチング候補をフロントエンド用の形式に変換
  const formattedCandidates = candidates?.map((candidate: any) => {
    // 共通の趣味を計算
    const currentHobbies = currentUserProfile.hobbies || []
    const candidateHobbies = candidate.hobbies || []
    const commonInterests = currentHobbies.filter((hobby: string) => 
      candidateHobbies.includes(hobby)
    )

    // マッチ度を計算（簡易版）
    let matchPercentage = 50 // ベース値
    
    // 共通趣味でボーナス
    matchPercentage += commonInterests.length * 10
    
    // 同じ都道府県でボーナス
    if (candidate.prefecture === currentUserProfile.prefecture) {
      matchPercentage += 15
    }
    
    // 年齢が近いとボーナス
    const ageDiff = Math.abs(candidate.age - currentUserProfile.age)
    if (ageDiff <= 3) matchPercentage += 10
    else if (ageDiff <= 5) matchPercentage += 5

    // 最大100%に制限
    matchPercentage = Math.min(matchPercentage, 100)

    return {
      id: candidate.id,
      firstName: candidate.first_name,
      lastName: candidate.last_name,
      age: candidate.age,
      nationality: candidate.nationality,
      nationalityLabel: getNationalityLabel(candidate.nationality),
      prefecture: candidate.prefecture,
      city: candidate.city,
      hobbies: candidate.hobbies || [],
      selfIntroduction: candidate.self_introduction,
      profileImage: candidate.profile_image,
      lastSeen: candidate.updated_at,
      isOnline: false, // TODO: オンライン状態の実装
      matchPercentage,
      commonInterests,
      distanceKm: undefined, // TODO: 距離計算の実装
    }
  }) || []

  return NextResponse.json({
    matches: formattedCandidates,
    total: formattedCandidates.length,
    hasMore: formattedCandidates.length === limit
  })

  } catch (error) {
    console.error('HandleMatchingLogic error:', error)
    return NextResponse.json(
      { error: 'マッチング処理でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 国籍ラベルの取得
function getNationalityLabel(nationality: string): string {
  const nationalityMap: Record<string, string> = {
    'JP': '日本',
    'US': 'アメリカ',
    'GB': 'イギリス',
    'CA': 'カナダ',
    'AU': 'オーストラリア',
    'DE': 'ドイツ',
    'FR': 'フランス',
    'IT': 'イタリア',
    'ES': 'スペイン',
    'KR': '韓国',
    'CN': '中国',
    'TW': '台湾',
    'TH': 'タイ',
    'VN': 'ベトナム',
    'IN': 'インド',
  }
  return nationalityMap[nationality] || nationality
}