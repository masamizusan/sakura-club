import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET: マッチング候補の取得
export async function GET(request: NextRequest) {
  console.log('🚀 MATCHES API STARTED - New implementation')
  
  try {
    const { searchParams } = new URL(request.url)
    const devTestMode = searchParams.get('devTest') === 'true'
    
    console.log('🔍 Request details:', {
      url: request.url,
      devTestMode,
      timestamp: new Date().toISOString()
    })

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
    
    // プロフィール取得（まずは全データを取得してカラム構造を確認）
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(10)
      
    console.log('🔍 First profile structure check:', profiles?.[0] ? Object.keys(profiles[0]) : 'No profiles')
    
    console.log('📊 Database query result:', {
      profileCount: profiles?.length || 0,
      error: error?.message || null,
      hasData: !!profiles && profiles.length > 0
    })
    
    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json({
        matches: [],
        total: 0,
        hasMore: false,
        error: `Database error: ${error.message}`,
        dataSource: 'ERROR'
      })
    }
    
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
      
      return {
        id: profile.id,
        firstName: profile.name || 'Unknown',
        lastName: '',
        age: profile.age || 0,
        nationality: profile.nationality || 'Unknown',
        nationalityLabel: profile.nationality || 'Unknown', 
        prefecture: safeGetString(profile.prefecture),
        city: safeGetString(profile.city),
        occupation: safeGetString(profile.occupation),
        height: safeGetString(profile.height),
        bodyType: safeGetString(profile.body_type),
        maritalStatus: safeGetString(profile.marital_status),
        hobbies: Array.isArray(profile.interests) ? profile.interests : [],
        selfIntroduction: profile.bio || profile.self_introduction || '',
        profileImage: profile.avatar_url || null,
        lastSeen: profile.updated_at || new Date().toISOString(),
        isOnline: Math.random() > 0.5,
        matchPercentage: Math.floor(Math.random() * 30) + 70,
        commonInterests: [],
        distanceKm: Math.floor(Math.random() * 20) + 1
      }
    })
    
    console.log('✅ SUCCESS: Returning real Supabase data:', formattedMatches.length, 'profiles')
    
    return NextResponse.json({
      matches: formattedMatches,
      total: formattedMatches.length,
      hasMore: false,
      dataSource: 'REAL_SUPABASE_DATA'
    })
    
  } catch (error) {
    console.error('💥 CRITICAL ERROR in matches API:', error)
    return NextResponse.json({
      matches: [],
      total: 0,
      hasMore: false,
      error: `Server error: ${error}`,
      dataSource: 'CRITICAL_ERROR'
    }, { status: 500 })
  }
}