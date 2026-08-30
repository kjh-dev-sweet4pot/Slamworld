import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerSupabase()

  const [summaryRes, locationRes, monthlyRes, channelRes] = await Promise.all([
    supabase.from('summary').select('*').single(),
    supabase.from('location_summary').select('*'),
    supabase.from('contents').select('visit_date, id').not('visit_date', 'is', null),
    supabase.from('contents').select('channel, likes, saves, views, upload_url'),
  ])

  const error = summaryRes.error ?? locationRes.error ?? monthlyRes.error ?? channelRes.error
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const monthMap: Record<string, number> = {}
  for (const row of monthlyRes.data ?? []) {
    const m = (row.visit_date as string).slice(0, 7)
    monthMap[m] = (monthMap[m] ?? 0) + 1
  }
  const monthlyData = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }))

  const channelMap: Record<string, {
    count: number; likes: number; saves: number; views: number
  }> = {}
  for (const row of channelRes.data ?? []) {
    const ch = row.channel as string
    if (!channelMap[ch]) channelMap[ch] = { count: 0, likes: 0, saves: 0, views: 0 }
    const bucket = channelMap[ch]
    if (row.upload_url) bucket.count += 1
    bucket.likes += row.likes ?? 0
    bucket.saves += row.saves ?? 0
    bucket.views += row.views ?? 0
  }
  const channels = Object.entries(channelMap)
    .map(([channel, v]) => ({
      channel,
      ...v,
      interaction: v.likes + v.saves,
    }))
    .filter(c => c.interaction > 0 || c.count > 0)
    .sort((a, b) => b.interaction - a.interaction)

  return NextResponse.json({
    summary: summaryRes.data,
    locations: locationRes.data,
    monthly: monthlyData,
    channels,
  })
}
