import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

// キャッシュ防止ヘッダー
const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

// GET: マッチング候補の取得
export async function GET(request: NextRequest) {
  console.log('🚀 MATCHES API STARTED - New implementation with matching logic')
  
  try {
    const { searchParams } = new URL(request.url)
    const devTestMode = searchParams.get('devTest') === 'true'
    
    console.log('🔍 Request details:', {
      url: request.url,
      devTestMode,
      timestamp: new Date().toISOString()
    })

    // 現在のユーザーIDを取得
    const currentUserId = searchParams.get('currentUserId')
    console.log('📋 Current user ID:', currentUserId)

    // Supabase接続（service roleを使用、フォールバック対応）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    console.log('🔧 Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceRole: !!serviceRoleKey,
      hasAnonKey: !!anonKey,
      urlLength: supabaseUrl?.length,
      serviceKeyLength: serviceRoleKey?.length || 0,
      anonKeyLength: anonKey?.length || 0,
      usingKey: serviceRoleKey ? 'SERVICE_ROLE' : 'ANON_KEY'
    })
    
    // Service Roleキーがない場合はAnon Keyを使用
    const keyToUse = serviceRoleKey || anonKey
    
    if (!keyToUse) {
      console.error('❌ No Supabase keys available')
      return NextResponse.json({
        matches: [],
        total: 0,
        hasMore: false,
        error: 'No Supabase keys configured',
        dataSource: 'CONFIG_ERROR'
      })
    }
    
    const supabase = createClient(supabaseUrl, keyToUse, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('🔗 Supabase client created with service role')
    
    let currentUserProfile: any = null

    // 現在のユーザー情報を取得（マッチングロジック用）
    if (currentUserId) {
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .single()

      if (!userError && userProfile) {
        currentUserProfile = userProfile
        console.log('👤 Current user profile:', {
          id: userProfile.id,
          name: userProfile.name,
          nationality: userProfile.nationality,
          gender: userProfile.gender
        })
      }
    }
    
    // デバッグ: 全ユーザーのリストを確認
    const { data: allUsers, error: allUsersError } = await supabase
      .from('profiles')
      .select('id, name, nationality, gender')

    console.log('🔍 All users in database:', allUsers?.map(u => ({
      name: u.name,
      nationality: u.nationality,
      gender: u.gender
    })))

    // マッチング候補取得（フィルタリングあり）
    // 🚀 STEP 1: まず全プロフィールを取得（自分以外、profile_initialized=true のみ）
    // 機微情報（email, birth_date）は除外してselect
    // prefecture は存在しないので residence を使用
    let profileQuery = supabase
      .from('profiles')
      .select(`
        id, name, age, gender, nationality, residence, city,
        occupation, height, body_type, marital_status,
        interests, bio, avatar_url, updated_at,
        profile_initialized
      `)
      .eq('profile_initialized', true)

    // 自分を除外
    if (currentUserId) {
      profileQuery = profileQuery.neq('id', currentUserId)
    }

    const { data: allProfiles, error: fetchError } = await profileQuery.limit(50)

    if (fetchError) {
      console.error('❌ Supabase fetch error:', fetchError)
      return NextResponse.json({
        matches: [],
        total: 0,
        hasMore: false,
        error: `Database error: ${fetchError.message}`,
        dataSource: 'ERROR'
      })
    }

    console.log('📊 All profiles fetched (excluding self):', allProfiles?.length || 0)

    // 🚀 STEP 2: JavaScriptでフィルタリング（より柔軟な判定）
    let filteredProfiles = allProfiles || []

    if (currentUserProfile) {
      // 日本人判定のヘルパー関数
      const isJapanese = (nationality: string | null | undefined): boolean => {
        if (!nationality) return true // NULL/undefined/空文字は日本人とみなす
        const n = nationality.toLowerCase().trim()
        return n === '' || n === 'jp' || n === 'japan' || n === '日本' || n === 'japanese'
      }

      const currentNationality = currentUserProfile.nationality
      const currentGender = currentUserProfile.gender

      // 現在のユーザーが外国人男性かどうか
      const isCurrentUserForeignMale = !isJapanese(currentNationality) && currentGender === 'male'
      // 現在のユーザーが日本人女性かどうか
      const isCurrentUserJapaneseFemale = isJapanese(currentNationality) && currentGender === 'female'

      console.log('🎯 Matching logic:', {
        isCurrentUserForeignMale,
        isCurrentUserJapaneseFemale,
        currentUserNationality: currentNationality,
        currentUserGender: currentGender,
        isCurrentUserJapanese: isJapanese(currentNationality)
      })

      if (isCurrentUserForeignMale) {
        // 外国人男性 → 日本人女性のみ表示
        filteredProfiles = filteredProfiles.filter(p => {
          const targetIsJapanese = isJapanese(p.nationality)
          const targetIsFemale = p.gender === 'female'
          console.log(`  Filter check: ${p.name} - isJapanese: ${targetIsJapanese}, isFemale: ${targetIsFemale}, nationality: "${p.nationality}"`)
          return targetIsJapanese && targetIsFemale
        })
        console.log('🔍 Foreign male → showing Japanese females:', filteredProfiles.length)
      } else if (isCurrentUserJapaneseFemale) {
        // 日本人女性 → 外国人男性のみ表示
        filteredProfiles = filteredProfiles.filter(p => {
          const targetIsForeign = !isJapanese(p.nationality)
          const targetIsMale = p.gender === 'male'
          console.log(`  Filter check: ${p.name} - isForeign: ${targetIsForeign}, isMale: ${targetIsMale}, nationality: "${p.nationality}"`)
          return targetIsForeign && targetIsMale
        })
        console.log('🔍 Japanese female → showing foreign males:', filteredProfiles.length)
      } else {
        // その他の場合は全員表示（自分以外）
        console.log('🔍 Other user type → showing all:', filteredProfiles.length)
      }
    }

    const profiles = filteredProfiles.slice(0, 10) // 最大10件
      
    console.log('🔍 First profile structure check:', profiles?.[0] ? Object.keys(profiles[0]) : 'No profiles')

    console.log('📊 Final filtered result:', {
      profileCount: profiles?.length || 0,
      hasData: !!profiles && profiles.length > 0,
      currentUserNationality: currentUserProfile?.nationality,
      filterApplied: !!currentUserProfile,
      matchedProfiles: profiles?.map(p => ({
        name: p.name,
        nationality: p.nationality,
        gender: p.gender
      }))
    })

    if (!profiles || profiles.length === 0) {
      console.log('⚠️ No profiles found in database')
      return NextResponse.json({
        matches: [],
        total: 0,
        hasMore: false,
        message: 'No profiles found',
        dataSource: 'EMPTY_DATABASE'
      })
    }
    
    // データ変換（実際のカラム名に対応）
    const formattedMatches = profiles.map((profile: any) => {
      console.log('🔧 Processing profile:', {
        id: profile.id,
        name: profile.name,
        age: profile.age,
        nationality: profile.nationality,
        city: profile.city,
        occupation: profile.occupation,
        height: profile.height,
        body_type: profile.body_type,
        marital_status: profile.marital_status
      })

      // JSONオブジェクトが文字列化されている場合の処理
      const safeGetString = (value: any): string => {
        if (typeof value === 'string') return value
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') {
          // オブジェクトの場合、主要なプロパティを確認
          if (value.value) return String(value.value)
          if (value.label) return String(value.label) 
          return JSON.stringify(value)
        }
        return String(value)
      }

      // JSON文字列をパースする処理
      const parseJSONField = (value: any, fieldName: string): string => {
        if (typeof value === 'string' && value.startsWith('{')) {
          try {
            const parsed = JSON.parse(value)
            if (parsed[fieldName] !== undefined && parsed[fieldName] !== null) {
              return String(parsed[fieldName])
            }
          } catch (e) {
            console.log(`Failed to parse JSON field ${fieldName}:`, value)
          }
        }
        return value ? String(value) : ''
      }
      
      // cityフィールドがJSONかどうか確認し、適切に処理
      let cityValue = ''
      let occupationValue = ''
      let heightValue = ''
      let bodyTypeValue = ''
      let maritalStatusValue = ''

      // cityフィールドがJSON形式かチェック
      if (profile.city && typeof profile.city === 'string' && profile.city.startsWith('{')) {
        try {
          const cityData = JSON.parse(profile.city)
          cityValue = cityData.city || ''
          occupationValue = cityData.occupation || ''
          heightValue = cityData.height ? String(cityData.height) : ''
          bodyTypeValue = cityData.body_type || ''
          maritalStatusValue = cityData.marital_status || ''
        } catch (e) {
          console.log('Failed to parse city JSON:', profile.city)
          cityValue = profile.city
        }
      } else {
        cityValue = safeGetString(profile.city)
        occupationValue = safeGetString(profile.occupation)
        heightValue = safeGetString(profile.height)
        bodyTypeValue = safeGetString(profile.body_type)
        maritalStatusValue = safeGetString(profile.marital_status)
      }

      return {
        id: profile.id,
        firstName: profile.name || 'Unknown',
        lastName: '',
        age: profile.age || 0,
        gender: profile.gender || '',
        nationality: profile.nationality || 'Unknown',
        nationalityLabel: profile.nationality || 'Unknown',
        residence: safeGetString(profile.residence),
        prefecture: safeGetString(profile.residence), // 実際のカラム名は residence
        city: cityValue,
        occupation: occupationValue,
        height: heightValue,
        bodyType: bodyTypeValue,
        maritalStatus: maritalStatusValue,
        hobbies: Array.isArray(profile.interests) ? profile.interests : [],
        selfIntroduction: profile.bio || '',
        profileImage: profile.avatar_url || null,
        lastSeen: profile.updated_at || new Date().toISOString(),
        isOnline: Math.random() > 0.5,
        matchPercentage: Math.floor(Math.random() * 30) + 70,
        commonInterests: [],
        distanceKm: Math.floor(Math.random() * 20) + 1
      }
    })
    
    const fetchedAt = new Date().toISOString()

    console.log('✅ SUCCESS: Returning filtered Supabase data:', {
      totalMatches: formattedMatches.length,
      fetchedAt,
      currentUserType: currentUserProfile ?
        (currentUserProfile.nationality !== 'JP' && currentUserProfile.nationality !== '日本' ? 'foreign_male' : 'japanese_female') :
        'unknown',
      profiles: formattedMatches.map(p => ({ name: p.firstName, nationality: p.nationality, updated_at: p.lastSeen }))
    })

    return NextResponse.json({
      matches: formattedMatches,
      total: formattedMatches.length,
      hasMore: false,
      fetchedAt,
      dataSource: 'REAL_SUPABASE_DATA'
    }, { headers: noCacheHeaders })

  } catch (error) {
    console.error('💥 CRITICAL ERROR in matches API:', error)
    return NextResponse.json({
      matches: [],
      total: 0,
      hasMore: false,
      fetchedAt: new Date().toISOString(),
      error: `Server error: ${error}`,
      dataSource: 'CRITICAL_ERROR'
    }, { status: 500, headers: noCacheHeaders })
  }
}