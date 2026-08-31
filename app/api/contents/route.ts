import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = createServerSupabase()

  const { searchParams } = req.nextUrl
  const campaign  = searchParams.get('campaign')
  const location  = searchParams.get('location')
  const channel   = searchParams.get('channel')
  const month     = searchParams.get('month') // YYYY-MM
  const is_press  = searchParams.get('is_press')
  const sort      = searchParams.get('sort') ?? 'perf'   // 'perf' | 'date' | 'location'
  const limit     = parseInt(searchParams.get('limit') ?? '200')

  let query = supabase
    .from('contents_with_performance')
    .select('*')

  if (campaign)  query = query.eq('campaign', campaign)
  if (location)  query = query.eq('location', location)
  if (channel)   query = query.eq('channel', channel)
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number)
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    query = query.gte('visit_date', `${month}-01`).lt('visit_date', next)
  }
  if (is_press !== null && is_press !== '') {
    query = query.eq('is_press', is_press === 'true')
  }

  // 정렬
  if (sort === 'perf') {
    query = query
      .order('likes', { ascending: false, nullsFirst: false })
  } else if (sort === 'date') {
    query = query.order('visit_date', { ascending: false, nullsFirst: false })
  } else {
    query = query.order('location').order('likes', { ascending: false, nullsFirst: false })
  }

  query = query.limit(limit)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
