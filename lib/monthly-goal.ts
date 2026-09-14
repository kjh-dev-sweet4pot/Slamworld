/** month = YYYY-MM. 진행률 = contents.publish_status 진행중 ÷ 목표. 달 키는 visit_date */
export interface MonthlyGoal {
  month: string
  uploadTarget: number
  inProgress: number
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
}
