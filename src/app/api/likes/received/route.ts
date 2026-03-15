export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  console.log('Step 1: start')
  try {
    console.log('Step 2: in try')
    return Response.json({ data: [], count: 0 })
  } catch (error) {
    console.error('Step 3: error', error)
    return Response.json({ error: 'test' }, { status: 500 })
  }
}
