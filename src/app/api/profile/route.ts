import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// プロフィール更新のスキーマ
const updateProfileSchema = z.object({
  firstName: z.string().min(1, '名を入力してください').max(50, '名は50文字以内で入力してください'),
  lastName: z.string().min(1, '姓を入力してください').max(50, '姓は50文字以内で入力してください'),
  gender: z.enum(['male', 'female'], { required_error: '性別を選択してください' }),
  age: z.number().min(18, '18歳以上である必要があります').max(99, '99歳以下で入力してください'),
  nationality: z.string().min(1, '国籍を選択してください'),
  prefecture: z.string().min(1, '都道府県を選択してください'),
  city: z.string().min(1, '市区町村を入力してください').max(100, '市区町村は100文字以内で入力してください'),
  hobbies: z.array(z.string()).min(1, '最低1つの趣味を選択してください').max(5, '趣味は最大5つまで選択できます'),
  selfIntroduction: z.string().min(50, '自己紹介は50文字以上で入力してください').max(1000, '自己紹介は1000文字以内で入力してください'),
})

// GET: プロフィール取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // プロフィール情報の取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'プロフィールの取得に失敗しました' },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'プロフィールが見つかりません' },
        { status: 404 }
      )
    }

    // フロントエンド用のデータ形式に変換
    const formattedProfile = {
      id: profile.id,
      email: user.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      gender: profile.gender,
      age: profile.age,
      nationality: profile.nationality,
      prefecture: profile.prefecture,
      city: profile.city,
      hobbies: profile.hobbies || [],
      selfIntroduction: profile.self_introduction,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    }

    return NextResponse.json(formattedProfile)

  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PUT: プロフィール更新
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // リクエストボディの解析
    const body = await request.json()
    
    // バリデーション
    const validationResult = updateProfileSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'バリデーションエラー',
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const {
      firstName,
      lastName,
      gender,
      age,
      nationality,
      prefecture,
      city,
      hobbies,
      selfIntroduction
    } = validationResult.data

    // データベース用のフィールド名に変換
    const updateData = {
      first_name: firstName,
      last_name: lastName,
      gender,
      age,
      nationality,
      prefecture,
      city,
      hobbies,
      self_introduction: selfIntroduction,
      updated_at: new Date().toISOString(),
    }

    // プロフィールの更新
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'プロフィールの更新に失敗しました' },
        { status: 500 }
      )
    }

    // 更新されたプロフィールをフロントエンド用の形式で返す
    const formattedProfile = {
      id: updatedProfile.id,
      email: user.email,
      firstName: updatedProfile.first_name,
      lastName: updatedProfile.last_name,
      gender: updatedProfile.gender,
      age: updatedProfile.age,
      nationality: updatedProfile.nationality,
      prefecture: updatedProfile.prefecture,
      city: updatedProfile.city,
      hobbies: updatedProfile.hobbies || [],
      selfIntroduction: updatedProfile.self_introduction,
      createdAt: updatedProfile.created_at,
      updatedAt: updatedProfile.updated_at,
    }

    return NextResponse.json({
      message: 'プロフィールが正常に更新されました',
      profile: formattedProfile
    })

  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}