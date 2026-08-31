/** 브랜드 마케팅 예산 — 단일 소스 */

export type BudgetPayment = '입금 완료' | '입금 예정' | '미입금'
export type BudgetStage = '확정 및 진행' | '계약 예정' | '10월 예정'

export interface BrandBudget {
  brand: string
  /** 만원 단위. rangeMax 있으면 구간 */
  amount: number
  rangeMax?: number
  payment: BudgetPayment | '검토 중'
  stage: BudgetStage
  /** 계약·확정 월 (YYYY-MM). null = 아직 미확보 */
  securedMonth: string | null
  marketingMonth: string
  note?: string
}

export const BRAND_BUDGETS: BrandBudget[] = [
  { brand: '옵티팜', amount: 4000, payment: '미입금', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '가이드 작성 중' },
  { brand: '닥터 리앤장', amount: 3000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09' },
  { brand: '클리어디어', amount: 1000, payment: '입금 예정', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '계획안·견적' },
  { brand: 'Rxme', amount: 1000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09' },
  { brand: '해브블루', amount: 2000, rangeMax: 3000, payment: '검토 중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '온보딩 진행' },
  { brand: '달바', amount: 0, payment: '검토 중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '예산 미확인' },
  { brand: '스킨스탠다드', amount: 1100, payment: '검토 중', stage: '10월 예정', securedMonth: null, marketingMonth: '2026-10' },
  { brand: '부스티온', amount: 0, payment: '검토 중', stage: '10월 예정', securedMonth: null, marketingMonth: '2026-10', note: '예산 미확인' },
  { brand: '나인위시스', amount: 0, payment: '검토 중', stage: '10월 예정', securedMonth: null, marketingMonth: '2026-10', note: '예산 미확인' },
]

export function budgetMid(b: BrandBudget): number {
  if (b.amount <= 0) return 0
  return b.rangeMax ? (b.amount + b.rangeMax) / 2 : b.amount
}

export function budgetMax(b: BrandBudget): number {
  if (b.amount <= 0) return 0
  return b.rangeMax ?? b.amount
}

export function fmtBudgetManwon(n: number, opts?: { compact?: boolean }): string {
  if (n <= 0) return '—'
  if (opts?.compact && n >= 10000) return `${(n / 10000).toFixed(1)}억`
  return n.toLocaleString()
}

export function fmtBudgetRange(b: BrandBudget): string {
  if (b.amount <= 0) return '미확인'
  if (b.rangeMax) return `${b.amount.toLocaleString()}–${b.rangeMax.toLocaleString()}만원`
  return `${b.amount.toLocaleString()}만원`
}

const CONFIRMED_STAGES: BudgetStage[] = ['확정 및 진행']

export interface BudgetSummary {
  securedTotal: number
  securedPaid: number
  securedPending: number
  pipelineTotal: number
  pipelineKnown: number
  pipelineUnknown: number
  byStage: Record<BudgetStage, { count: number; total: number }>
  byPayment: Record<string, number>
  monthlySecured: { month: string; total: number; brands: string[] }[]
}

/** 월별 확보 차트에 항상 표시할 월 (데이터 없으면 0) */
export const BUDGET_CHART_MONTHS = [
  '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
] as const

export function monthlySecuredForChart(summary: BudgetSummary) {
  const map = new Map(summary.monthlySecured.map(m => [m.month, m]))
  return BUDGET_CHART_MONTHS.map(month => ({
    month,
    total: map.get(month)?.total ?? 0,
    brands: map.get(month)?.brands ?? [],
  }))
}

export function computeBudgetSummary(): BudgetSummary {
  const confirmed = BRAND_BUDGETS.filter(b => CONFIRMED_STAGES.includes(b.stage))
  const securedTotal = confirmed.reduce((s, b) => s + budgetMid(b), 0)
  const securedPaid = confirmed
    .filter(b => b.payment === '입금 완료')
    .reduce((s, b) => s + budgetMid(b), 0)
  const securedPending = securedTotal - securedPaid

  const pipelineKnown = BRAND_BUDGETS.reduce((s, b) => s + budgetMid(b), 0)
  const pipelineMax = BRAND_BUDGETS.reduce((s, b) => s + budgetMax(b), 0)
  const pipelineUnknown = pipelineMax - pipelineKnown

  const byStage = {} as BudgetSummary['byStage']
  for (const stage of ['확정 및 진행', '계약 예정', '10월 예정'] as BudgetStage[]) {
    const rows = BRAND_BUDGETS.filter(b => b.stage === stage)
    byStage[stage] = {
      count: rows.length,
      total: rows.reduce((s, b) => s + budgetMid(b), 0),
    }
  }

  const byPayment: Record<string, number> = {}
  for (const b of BRAND_BUDGETS) {
    if (budgetMid(b) <= 0) continue
    byPayment[b.payment] = (byPayment[b.payment] ?? 0) + budgetMid(b)
  }

  const monthMap = new Map<string, { total: number; brands: string[] }>()
  for (const b of BRAND_BUDGETS) {
    if (!b.securedMonth || budgetMid(b) <= 0) continue
    const bucket = monthMap.get(b.securedMonth) ?? { total: 0, brands: [] }
    bucket.total += budgetMid(b)
    bucket.brands.push(b.brand)
    monthMap.set(b.securedMonth, bucket)
  }
  const monthlySecured = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }))

  return {
    securedTotal,
    securedPaid,
    securedPending,
    pipelineTotal: pipelineKnown,
    pipelineKnown,
    pipelineUnknown,
    byStage,
    byPayment,
    monthlySecured,
  }
}

// ponytail: totals drift → 상단 KPI 깨짐
if (process.env.BRAND_BUDGET_SELF_CHECK === '1') {
  const s = computeBudgetSummary()
  if (s.securedTotal !== 9000) throw new Error(`securedTotal expected 9000, got ${s.securedTotal}`)
}
