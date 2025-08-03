import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// 体験作成のスキーマ
const createExperienceSchema = z.object({
  title: z.string().min(1, 'タイトルを入力してください').max(100, 'タイトルは100文字以内で入力してください'),
  description: z.string().min(20, '説明は20文字以上で入力してください').max(200, '説明は200文字以内で入力してください'),
  fullDescription: z.string().min(100, '詳細説明は100文字以上で入力してください').max(2000, '詳細説明は2000文字以内で入力してください'),
  category: z.string().min(1, 'カテゴリを選択してください'),
  date: z.string().min(1, '開催日を選択してください'),
  timeStart: z.string().min(1, '開始時間を選択してください'),
  timeEnd: z.string().min(1, '終了時間を選択してください'),
  location: z.string().min(1, '開催場所名を入力してください').max(100, '開催場所名は100文字以内で入力してください'),
  address: z.string().min(1, '住所を入力してください').max(200, '住所は200文字以内で入力してください'),
  prefecture: z.string().min(1, '都道府県を選択してください'),
  city: z.string().min(1, '市区町村を入力してください').max(50, '市区町村は50文字以内で入力してください'),
  maxParticipants: z.number().min(1, '最大参加者数は1名以上で入力してください').max(50, '最大参加者数は50名以下で入力してください'),
  price: z.number().min(0, '料金は0円以上で入力してください').max(100000, '料金は100,000円以下で入力してください'),
  included: z.string().min(1, '体験に含まれるものを入力してください'),
  toBring: z.string().optional(),
  requirements: z.string().optional(),
})

// GET: 体験一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    
    // クエリパラメータの取得
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const prefecture = searchParams.get('prefecture')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // ベースクエリ
    let query = supabase
      .from('experiences')
      .select(`
        *,
        organizer:profiles!experiences_organizer_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('status', 'upcoming')
      .order('date', { ascending: true })

    // 検索フィルター
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`)
    }

    // カテゴリフィルター
    if (category && category !== 'すべて') {
      query = query.eq('category', category)
    }

    // 都道府県フィルター
    if (prefecture && prefecture !== 'すべて') {
      query = query.eq('prefecture', prefecture)
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1)

    const { data: experiences, error } = await query

    if (error) {
      console.error('Experiences fetch error:', error)
      return NextResponse.json(
        { error: '体験の取得に失敗しました' },
        { status: 500 }
      )
    }

    // フロントエンド用のデータ形式に変換
    const formattedExperiences = experiences?.map(exp => ({
      id: exp.id,
      title: exp.title,
      description: exp.description,
      fullDescription: exp.full_description,
      category: exp.category,
      date: exp.date,
      timeStart: exp.time_start,
      timeEnd: exp.time_end,
      location: exp.location,
      address: exp.address,
      prefecture: exp.prefecture,
      city: exp.city,
      maxParticipants: exp.max_participants,
      currentParticipants: exp.current_participants || 0,
      price: exp.price,
      currency: 'JPY',
      organizerId: exp.organizer_id,
      organizerName: exp.organizer ? `${exp.organizer.first_name} ${exp.organizer.last_name}` : '未知',
      status: exp.status,
      imageUrl: exp.image_url,
      rating: exp.rating,
      reviewCount: exp.review_count || 0,
      included: exp.included ? exp.included.split('\n') : [],
      toBring: exp.to_bring ? exp.to_bring.split('\n') : [],
      requirements: exp.requirements ? exp.requirements.split('\n') : [],
      createdAt: exp.created_at,
      updatedAt: exp.updated_at,
    })) || []

    return NextResponse.json({
      experiences: formattedExperiences,
      total: formattedExperiences.length,
      hasMore: formattedExperiences.length === limit
    })

  } catch (error) {
    console.error('Experiences GET error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST: 新しい体験作成
export async function POST(request: NextRequest) {
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
    const validationResult = createExperienceSchema.safeParse(body)
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
      title,
      description,
      fullDescription,
      category,
      date,
      timeStart,
      timeEnd,
      location,
      address,
      prefecture,
      city,
      maxParticipants,
      price,
      included,
      toBring,
      requirements
    } = validationResult.data

    // 時間の妥当性チェック
    if (timeStart >= timeEnd) {
      return NextResponse.json(
        { error: '終了時間は開始時間より後に設定してください' },
        { status: 400 }
      )
    }

    // 開催日の妥当性チェック
    const selectedDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate < today) {
      return NextResponse.json(
        { error: '開催日は今日以降の日付を選択してください' },
        { status: 400 }
      )
    }

    // データベース用のデータ準備
    const experienceData = {
      title,
      description,
      full_description: fullDescription,
      category,
      date,
      time_start: timeStart,
      time_end: timeEnd,
      location,
      address,
      prefecture,
      city,
      max_participants: maxParticipants,
      current_participants: 0,
      price,
      organizer_id: user.id,
      status: 'upcoming',
      included,
      to_bring: toBring || null,
      requirements: requirements || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 体験の作成
    const { data: newExperience, error: createError } = await supabase
      .from('experiences')
      .insert(experienceData)
      .select(`
        *,
        organizer:profiles!experiences_organizer_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .single()

    if (createError) {
      console.error('Experience creation error:', createError)
      return NextResponse.json(
        { error: '体験の作成に失敗しました' },
        { status: 500 }
      )
    }

    // フロントエンド用の形式で返す
    const formattedExperience = {
      id: newExperience.id,
      title: newExperience.title,
      description: newExperience.description,
      fullDescription: newExperience.full_description,
      category: newExperience.category,
      date: newExperience.date,
      timeStart: newExperience.time_start,
      timeEnd: newExperience.time_end,
      location: newExperience.location,
      address: newExperience.address,
      prefecture: newExperience.prefecture,
      city: newExperience.city,
      maxParticipants: newExperience.max_participants,
      currentParticipants: newExperience.current_participants,
      price: newExperience.price,
      currency: 'JPY',
      organizerId: newExperience.organizer_id,
      organizerName: newExperience.organizer ? `${newExperience.organizer.first_name} ${newExperience.organizer.last_name}` : '未知',
      status: newExperience.status,
      included: newExperience.included ? newExperience.included.split('\n') : [],
      toBring: newExperience.to_bring ? newExperience.to_bring.split('\n') : [],
      requirements: newExperience.requirements ? newExperience.requirements.split('\n') : [],
      createdAt: newExperience.created_at,
      updatedAt: newExperience.updated_at,
    }

    return NextResponse.json({
      message: '体験が正常に作成されました',
      experience: formattedExperience
    }, { status: 201 })

  } catch (error) {
    console.error('Experience POST error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}