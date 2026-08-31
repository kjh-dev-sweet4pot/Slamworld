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
