import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export interface SeedingGift {
  card_id: string
  handle: string
  given_at: string
}

/** 무상 시딩 체크 기록 전체 */
export async function GET() {
  const { data, error } = await createServerSupabase()
    .from('seeding_gifts')
    .select('card_id,handle,given_at')
    .order('given_at', { ascending: false })
  if (error) {
    const missing = /seeding_gifts|schema cache|does not exist/i.test(error.message)
    return NextResponse.json({ data: [], missing, error: error.message }, { status: missing ? 200 : 500 })
  }
  return NextResponse.json({ data })
}

/** { card_id, handle, given } — given=true 면 체크(시각 저장), false 면 해제 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const card_id = String(body?.card_id ?? '').trim()
  const handle = String(body?.handle ?? '').trim().toLowerCase()
  if (!card_id || !/^[a-z0-9._-]+$/.test(handle)) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }
  const sb = createServerSupabase()
  if (body?.given) {
    const { data, error } = await sb
      .from('seeding_gifts')
      .insert({ card_id, handle })
      .select('card_id,handle,given_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }
  const { error } = await sb.from('seeding_gifts').delete().match({ card_id, handle })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
