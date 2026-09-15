/** month = YYYY-MM. 진행률 = contents.publish_status 진행중 ÷ 목표. 달 키는 visit_date */
export interface MonthlyGoal {
  month: string
  uploadTarget: number
  inProgress: number
}

export interface PlannedUpload {
  id: number
  name: string
  location: string
  visitDate: string
  brands: string | null
  channel: string
  profileUrl: string | null
  status: '예정' | '진행중'
}

export interface RecentUpload {
  id: number
  name: string
  location: string
  visitDate: string
  brands: string | null
  channel: string
  uploadUrl: string | null
  profileUrl: string | null
}

/** 최근 n개. 위가 최신. */
export function recentUploadsDisplay(rows: RecentUpload[], n = 10): RecentUpload[] {
  return [...rows]
    .filter(r => r.visitDate)
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate) || b.id - a.id)
    .slice(0, n)
}

export function planProgressPct(inProgress: number, target: number): number {
  if (target <= 0) return 0
  return Math.round((inProgress / target) * 100)
}

export function goalMonthKey(asOf = new Date()): string {
  return `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, '0')}`
}

/** 이번 달 목표. 없으면 가장 최근 달 */
export function goalForNow(goals: MonthlyGoal[], asOf = new Date()): MonthlyGoal | null {
  if (!goals.length) return null
  const key = goalMonthKey(asOf)
  return goals.find(g => g.month === key) ?? goals[goals.length - 1]
}

export function goalMonthLabel(month: string): string {
  return `${Number(month.slice(5))}월`
}

if (process.env.NODE_ENV !== 'production') {
  if (planProgressPct(45, 150) !== 30) throw new Error('planProgressPct')
  if (planProgressPct(0, 0) !== 0) throw new Error('planProgressPct zero')
  const goals = [
    { month: '2026-08', uploadTarget: 100, inProgress: 1 },
    { month: '2026-09', uploadTarget: 150, inProgress: 8 },
  ]
  if (goalForNow(goals, new Date(2026, 8, 14))?.inProgress !== 8) throw new Error('goalForNow current')
  if (goalForNow(goals.slice(0, 1), new Date(2026, 8, 14))?.month !== '2026-08') {
    throw new Error('goalForNow fallback')
  }
  const recent = recentUploadsDisplay([
    { id: 1, name: 'a', location: '', visitDate: '2026-09-01', brands: null, channel: '', uploadUrl: null, profileUrl: null },
    { id: 2, name: 'b', location: '', visitDate: '2026-09-10', brands: null, channel: '', uploadUrl: null, profileUrl: null },
    { id: 3, name: 'c', location: '', visitDate: '2026-09-03', brands: null, channel: '', uploadUrl: null, profileUrl: null },
  ], 2)
  if (recent.map(r => r.id).join() !== '2,3') throw new Error('recentUploadsDisplay')
}
