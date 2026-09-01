import { contentViews } from '@/lib/content-views'
import type { Content } from '@/lib/types'

export interface MonthlyPoint {
  month: string
  count: number
  views: number
  likes: number
  saves: number
}

export function aggregateByMonth(contents: Content[]): MonthlyPoint[] {
  const map = new Map<string, MonthlyPoint>()
  for (const c of contents) {
    if (!c.visit_date) continue
    const month = c.visit_date.slice(0, 7)
    const row = map.get(month) ?? { month, count: 0, views: 0, likes: 0, saves: 0 }
    row.count += 1
    row.views += contentViews(c)
    row.likes += c.likes ?? 0
    row.saves += c.saves ?? 0
    map.set(month, row)
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month))
}

export function toCumulative(points: MonthlyPoint[]): MonthlyPoint[] {
  let count = 0
  let views = 0
  let likes = 0
  let saves = 0
  return points.map(p => {
    count += p.count
    views += p.views
    likes += p.likes
    saves += p.saves
    return { month: p.month, count, views, likes, saves }
  })
}

export interface LocationMonthPoint {
  month: string
  count: number
  cumulative: number
}

export interface LocationMonthSeries {
  location: string
  points: LocationMonthPoint[]
}

/** 지점별 월 업로드 → 누적 시계열 (업로드 많은 지점 순) */
export function buildLocationMonthlySeries(
  rows: { location: string; visit_date: string }[],
): { months: string[]; series: LocationMonthSeries[] } {
  const monthSet = new Set<string>()
  const locMap = new Map<string, Map<string, number>>()

  for (const row of rows) {
    const month = row.visit_date.slice(0, 7)
    monthSet.add(month)
    const byMonth = locMap.get(row.location) ?? new Map<string, number>()
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1)
    locMap.set(row.location, byMonth)
  }

  const months = [...monthSet].sort()
  const series = [...locMap.entries()]
    .map(([location, byMonth]) => {
      let cumulative = 0
      const points = months.map(month => {
        const count = byMonth.get(month) ?? 0
        cumulative += count
        return { month, count, cumulative }
      })
      return { location, points }
    })
    .sort((a, b) => {
      const aTotal = a.points[a.points.length - 1]?.cumulative ?? 0
      const bTotal = b.points[b.points.length - 1]?.cumulative ?? 0
      return bTotal - aTotal
    })

  return { months, series }
}

// ponytail: location-month drift → 지점 선형 그래프 깨짐
if (process.env.LOCATION_MONTHLY_SELF_CHECK === '1') {
  const sample = buildLocationMonthlySeries([
    { location: '명동점', visit_date: '2026-08-11' },
    { location: '명동점', visit_date: '2026-08-20' },
    { location: '남포점', visit_date: '2026-09-05' },
  ])
  if (sample.months.join(',') !== '2026-08,2026-09') {
    throw new Error(`months expected 2026-08,2026-09 got ${sample.months.join(',')}`)
  }
  const myeong = sample.series.find(s => s.location === '명동점')
  if (myeong?.points[1]?.cumulative !== 2) {
    throw new Error(`명동점 aug cumulative expected 2, got ${myeong?.points[1]?.cumulative}`)
  }
}
