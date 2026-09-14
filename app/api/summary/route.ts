import { NextResponse } from 'next/server'
import { contentViews } from '@/lib/content-views'
import { buildLocationMonthlySeries } from '@/lib/monthly-performance'
import type { MonthlyGoal } from '@/lib/monthly-goal'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerSupabase()

  const [summaryRes, locationRes, monthlyRes, goalRes, planRes] = await Promise.all([
    supabase.from('summary').select('*').single(),
    supabase.from('location_summary').select('*'),
    supabase.from('contents').select(
      'location, visit_date, likes, saves, views, views_estimated, channel',
    ).not('visit_date', 'is', null),
    supabase.from('monthly_goals').select('month, upload_target').order('month'),
    supabase.from('contents').select('visit_date').eq('publish_status', '진행중').not('visit_date', 'is', null),
  ])

  const channelRes = await supabase.from('contents').select(
    'channel, likes, saves, comments, views, views_estimated, upload_url',
  )

  const error = summaryRes.error ?? locationRes.error ?? monthlyRes.error ?? channelRes.error
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const monthMap: Record<string, { count: number; views: number; likes: number; saves: number }> = {}
  for (const row of monthlyRes.data ?? []) {
    const m = (row.visit_date as string).slice(0, 7)
    if (!monthMap[m]) monthMap[m] = { count: 0, views: 0, likes: 0, saves: 0 }
    monthMap[m].count += 1
    monthMap[m].likes += row.likes ?? 0
    monthMap[m].saves += row.saves ?? 0
    monthMap[m].views += contentViews(row)
  }
  const monthlyData = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }))

  const locationMonthly = buildLocationMonthlySeries(
    (monthlyRes.data ?? []).map(row => ({
      location: row.location as string,
      visit_date: row.visit_date as string,
    })),
  )

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
    bucket.views += contentViews(row)
  }
  const channels = Object.entries(channelMap)
    .map(([channel, v]) => ({
      channel,
      ...v,
      interaction: v.likes + v.saves,
    }))
    .filter(c => c.interaction > 0 || c.count > 0)
    .sort((a, b) => b.interaction - a.interaction)

  const summary = summaryRes.data
    ? {
        ...summaryRes.data,
        total_views: (channelRes.data ?? []).reduce((sum, row) => sum + contentViews(row), 0),
      }
    : null

  const inProgressByMonth = new Map<string, number>()
  if (!planRes.error) {
    for (const row of planRes.data ?? []) {
      if (!row.visit_date) continue
      const month = String(row.visit_date).slice(0, 7)
      inProgressByMonth.set(month, (inProgressByMonth.get(month) ?? 0) + 1)
    }
  }
  const monthlyGoals: MonthlyGoal[] = goalRes.error
    ? []
    : (goalRes.data ?? []).map(row => {
        const month = String(row.month).slice(0, 7)
        return {
          month,
          uploadTarget: row.upload_target,
          inProgress: inProgressByMonth.get(month) ?? 0,
        }
      })

  return NextResponse.json({
    summary,
    locations: locationRes.data,
    monthly: monthlyData,
    locationMonthly,
    channels,
    monthlyGoals,
  })
}
