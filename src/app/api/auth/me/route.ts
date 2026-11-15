import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(request)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // S12: Cookie・Authorization の中身やメールアドレスは出さない（あり／なしと id の先頭 8 文字だけ）
    console.log('Auth me debug:', {
      userId: user?.id?.slice(0, 8) ?? null,
      authError: authError?.message,
      hasCookie: !!request.headers.get('cookie'),
      hasAuthorization: !!request.headers.get('authorization')
    })
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          authenticated: false,
          error: authError?.message || 'No user found',
          debug: {
            hasAuthError: !!authError,
            hasUser: !!user,
            hasCookies: !!request.headers.get('cookie')
          }
        },
        { status: 401 }
      )
    }

    // Get profile information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        profile: profile || null
      }
    })

  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json(
      { 
        authenticated: false,
        error: 'Server error',
        debug: { serverError: error instanceof Error ? error.message : 'Unknown error' }
      },
      { status: 500 }
    )
  }
}