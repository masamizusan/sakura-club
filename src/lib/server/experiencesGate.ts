import { NextResponse } from 'next/server'
import { EXPERIENCES_COMING_SOON } from '@/lib/featureFlags'

// #20・#45: 体験機能（体験・レビューの API）は公開まで「存在しない」扱いにする
// EXPERIENCES_COMING_SOON が true の間は 404 を返す。各 API は認証より前に呼ぶ
//   const notFound = experiencesNotFound()
//   if (notFound) return notFound
// false にすると null を返し、各 API は今のコードのまま動く
export function experiencesNotFound(): NextResponse | null {
  if (!EXPERIENCES_COMING_SOON) return null
  return NextResponse.json({ error: 'not_found' }, { status: 404 })
}
