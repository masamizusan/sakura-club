import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 段階2-A: 主催者は profiles の埋め込みではなく公開用ビュー（profiles_public）から別クエリで取得する
// （他人の last_name 等を読まない。ビューに載らない主催者は null ＝「未知」表示）
async function fetchOrganizer(
  supabase: ReturnType<typeof createClient>,
  organizerId: string | null | undefined
): Promise<{ id: string; name: string | null; created_at: string | null } | null> {
  if (!organizerId) return null
  const { data, error } = await supabase
    .from('profiles_public')
    .select('id, name, created_at')
    .eq('id', organizerId)
    .maybeSingle()
  if (error) {
    console.error('[experiences/[id]] organizer fetch error:', error.message)
    return null
  }
  return data ?? null
}

// GET: 個別体験の詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(request)
    const experienceId = params.id

    // 体験の詳細情報を取得
    const { data: experience, error } = await supabase
      .from('experiences')
      .select(`
        *,
        experience_participants(
          user_id,
          status
        )
      `)
      .eq('id', experienceId)
      .single()

    if (error) {
      console.error('Experience fetch error:', error)
      return NextResponse.json(
        { error: '体験が見つかりません' },
        { status: 404 }
      )
    }

    if (!experience) {
      return NextResponse.json(
        { error: '体験が見つかりません' },
        { status: 404 }
      )
    }

    const organizer = await fetchOrganizer(supabase, experience.organizer_id)

    // 参加者数を計算
    const currentParticipants = experience.experience_participants?.filter(
      (p: any) => p.status === 'confirmed'
    ).length || 0

    // レビューを取得（今後実装）
    // const { data: reviews } = await supabase
    //   .from('reviews')
    //   .select(`
    //     *,
    //     user:profiles!reviews_user_id_fkey(
    //       first_name,
    //       last_name
    //     )
    //   `)
    //   .eq('experience_id', experienceId)
    //   .order('created_at', { ascending: false })

    // フロントエンド用のデータ形式に変換
    const formattedExperience = {
      id: experience.id,
      title: experience.title,
      description: experience.description,
      fullDescription: experience.full_description,
      category: experience.category,
      date: experience.date,
      timeStart: experience.time_start,
      timeEnd: experience.time_end,
      location: experience.location,
      address: experience.address,
      prefecture: experience.prefecture,
      city: experience.city,
      maxParticipants: experience.max_participants,
      currentParticipants,
      price: experience.price,
      currency: 'JPY',
      organizerId: experience.organizer_id,
      organizerName: organizer?.name ?? '未知',
      status: experience.status,
      imageUrl: experience.image_url,
      rating: experience.rating,
      reviewCount: experience.review_count || 0,
      included: experience.included ? experience.included.split('\n').filter(Boolean) : [],
      toBring: experience.to_bring ? experience.to_bring.split('\n').filter(Boolean) : [],
      requirements: experience.requirements ? experience.requirements.split('\n').filter(Boolean) : [],
      organizerProfile: {
        bio: '文化体験の主催者として活動しています。', // 今後プロフィールテーブルに追加
        experienceCount: 1, // 今後計算
        joinedDate: organizer?.created_at,
        rating: 4.8, // 今後計算
      },
      reviews: [], // 今後実装
      createdAt: experience.created_at,
      updatedAt: experience.updated_at,
    }

    return NextResponse.json(formattedExperience)

  } catch (error) {
    console.error('Experience GET by ID error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PUT: 体験の更新（主催者のみ）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(request)
    const experienceId = params.id
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 体験の所有者確認
    const { data: experience, error: fetchError } = await supabase
      .from('experiences')
      .select('organizer_id')
      .eq('id', experienceId)
      .single()

    if (fetchError || !experience) {
      return NextResponse.json(
        { error: '体験が見つかりません' },
        { status: 404 }
      )
    }

    if (experience.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'この体験を編集する権限がありません' },
        { status: 403 }
      )
    }

    // リクエストボディの解析
    const body = await request.json()
    
    // 更新可能なフィールドのみ許可
    const allowedFields = [
      'title', 'description', 'full_description', 'category',
      'date', 'time_start', 'time_end', 'location', 'address',
      'prefecture', 'city', 'max_participants', 'price',
      'included', 'to_bring', 'requirements'
    ]

    const updateData: any = { updated_at: new Date().toISOString() }
    
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value
      }
    }

    // 体験の更新
    const { data: updatedExperience, error: updateError } = await supabase
      .from('experiences')
      .update(updateData)
      .eq('id', experienceId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Experience update error:', updateError)
      return NextResponse.json(
        { error: '体験の更新に失敗しました' },
        { status: 500 }
      )
    }

    const updatedOrganizer = updatedExperience
      ? await fetchOrganizer(supabase, updatedExperience.organizer_id)
      : null

    return NextResponse.json({
      message: '体験が正常に更新されました',
      experience: updatedExperience
        ? { ...updatedExperience, organizer: updatedOrganizer ? { id: updatedOrganizer.id, name: updatedOrganizer.name } : null }
        : updatedExperience
    })

  } catch (error) {
    console.error('Experience PUT error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETE: 体験の削除（主催者のみ）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(request)
    const experienceId = params.id
    
    // 認証ユーザーの取得
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // 体験の所有者確認
    const { data: experience, error: fetchError } = await supabase
      .from('experiences')
      .select('organizer_id, current_participants')
      .eq('id', experienceId)
      .single()

    if (fetchError || !experience) {
      return NextResponse.json(
        { error: '体験が見つかりません' },
        { status: 404 }
      )
    }

    if (experience.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'この体験を削除する権限がありません' },
        { status: 403 }
      )
    }

    // 参加者がいる場合は削除ではなくキャンセル
    if (experience.current_participants > 0) {
      const { error: cancelError } = await supabase
        .from('experiences')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', experienceId)

      if (cancelError) {
        console.error('Experience cancel error:', cancelError)
        return NextResponse.json(
          { error: '体験のキャンセルに失敗しました' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: '参加者がいるため体験をキャンセルしました'
      })
    }

    // 参加者がいない場合は物理削除
    const { error: deleteError } = await supabase
      .from('experiences')
      .delete()
      .eq('id', experienceId)

    if (deleteError) {
      console.error('Experience delete error:', deleteError)
      return NextResponse.json(
        { error: '体験の削除に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '体験が正常に削除されました'
    })

  } catch (error) {
    console.error('Experience DELETE error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}