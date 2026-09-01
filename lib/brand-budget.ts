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
  { brand: 'TeloAct', amount: 4000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-07', marketingMonth: '2026-07', note: '7월 집행 완료' },
  { brand: '옵티팜', amount: 4000, payment: '미입금', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '계약서 전달 중' },
  { brand: '닥터 리앤장', amount: 3000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '8/30 입금 확인' },
  { brand: '클리어디어', amount: 1000, payment: '입금 예정', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '계약서 전달 중' },
  { brand: 'Rxme', amount: 1000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '8/31 입금 확인' },
  { brand: '해브블루', amount: 2000, rangeMax: 3000, payment: '검토 중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '온보딩 진행' },
  { brand: '달바', amount: 0, payment: '검토 중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '예산 미확인' },
  { brand: '스킨스탠다드', amount: 1100, payment: '검토 중', stage: '10월 예정', securedMonth: null, marketingMonth: '2026-10' },
]

/** 협업 회사 도넛 — 브랜드별 색 */
export const PARTNER_BRAND_COLOR: Record<string, string> = {
  'TeloAct': '#14B8A6',
  '옵티팜': '#1868F0',
  '닥터 리앤장': '#0B47B4',
  '클리어디어': '#22C55E',
  'Rxme': '#6FBFFF',
  '해브블루': '#F59E0B',
  '스킨스탠다드': '#6366F1',
}

export const PARTNER_UNKNOWN_COLOR = '#94A3B8'

/** 계약 단계 + 송금 상태 → UI 색 (확정은 송금, 미확정은 계약 단계) */
export function budgetItemColor(
  stage: BudgetStage | '미정',
  payment: BrandBudget['payment'],
): string {
  if (stage === '미정') return '#94A3B8'
  if (stage === '확정 및 진행') {
    if (payment === '입금 완료') return '#1868F0'
    if (payment === '입금 예정') return '#F59E0B'
    if (payment === '미입금') return '#EF4444'
  }
  if (stage === '계약 예정') return '#EA580C'
  if (stage === '10월 예정') return '#6366F1'
  return '#94A3B8'
}

export function budgetStageLabel(stage: BudgetStage | '미정'): string {
  if (stage === '미정') return '예산 미정'
  if (stage === '계약 예정') return '계약 예정·검토'
  if (stage === '10월 예정') return '차후 예산'
  return stage
}

export function budgetPaymentLabel(payment: BrandBudget['payment']): string {
  return payment === '검토 중' ? '송금 검토' : payment
}

const STAGE_COLOR_FALLBACK: Record<BudgetStage, string> = {
  '확정 및 진행': '#1868F0',
  '계약 예정': '#F59E0B',
  '10월 예정': '#6366F1',
}

export interface PartnerDonutSlice {
  key: string
  label: string
  weight: number
  color: string
  stage: BudgetStage | '미정'
  isUnknownGroup?: boolean
}

export interface PartnerTooltipRow {
  brand: string
  amount: number
  amountLabel: string
  stage: BudgetStage | '미정'
  payment: BrandBudget['payment']
  sortKey: number
}

/** 도넛 슬라이스 — 예산 확정은 만원, 미정은 건수 가중(ponytail: 0만원은 비중 0이라 시각 구분용) */
export function partnerCompanyDonut(): { slices: PartnerDonutSlice[]; totalWeight: number; count: number } {
  const known = BRAND_BUDGETS.filter(b => budgetMid(b) > 0)
  const unknown = BRAND_BUDGETS.filter(b => budgetMid(b) <= 0)

  const slices: PartnerDonutSlice[] = known.map(b => ({
    key: b.brand,
    label: b.brand,
    weight: budgetMid(b),
    color: budgetItemColor(b.stage, b.payment),
    stage: b.stage,
  }))

  if (unknown.length > 0) {
    slices.push({
      key: '__unknown__',
      label: unknown.length === 1 ? '예산 미정' : `예산 미정 (${unknown.length})`,
      weight: unknown.length,
      color: PARTNER_UNKNOWN_COLOR,
      stage: '미정',
      isUnknownGroup: true,
    })
  }

  const totalWeight = slices.reduce((s, x) => s + x.weight, 0)
  return { slices, totalWeight, count: BRAND_BUDGETS.length }
}

function toTooltipRows(list: BrandBudget[]): PartnerTooltipRow[] {
  const known = list.filter(b => budgetMid(b) > 0)
    .map(b => ({
      brand: b.brand,
      amount: budgetMid(b),
      amountLabel: fmtBudgetRange(b).replace('만원', '만'),
      stage: b.stage as BudgetStage,
      payment: b.payment,
      sortKey: budgetMid(b),
    }))
    .sort((a, b) => b.sortKey - a.sortKey)

  const unknown = list.filter(b => budgetMid(b) <= 0).map(b => ({
    brand: b.brand,
    amount: 0,
    amountLabel: '미확인',
    stage: '미정' as const,
    payment: b.payment,
    sortKey: -1,
  }))

  return [...known, ...unknown]
}

/** 호버 툴팁 — 예산순(미정은 맨 아래) */
export function partnerCompanyTooltipRows(): PartnerTooltipRow[] {
  return toTooltipRows(BRAND_BUDGETS)
}

export type BudgetKpiKey = 'secured' | 'pipeline' | 'planned' | 'oct'

/** 상단 KPI 호버 — 해당 집계에 포함된 회사 */
export function kpiCompanyRows(key: BudgetKpiKey): PartnerTooltipRow[] {
  const list =
    key === 'secured' ? BRAND_BUDGETS.filter(b => CONFIRMED_STAGES.includes(b.stage)) :
    key === 'pipeline' ? BRAND_BUDGETS :
    key === 'planned' ? BRAND_BUDGETS.filter(b => b.stage === '계약 예정') :
    BRAND_BUDGETS.filter(b => b.stage === '10월 예정')
  return toTooltipRows(list)
}

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

/** 확정 및 진행 브랜드 — 상단 진행률 표시 */
export const CONFIRMED_BRAND_PROGRESS = 85

/** 월별 확보 차트에 항상 표시할 월 (데이터 없으면 0) */
export const BUDGET_CHART_MONTHS = [
  '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
] as const

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

export function monthlySecuredForChart(summary: BudgetSummary) {
  const map = new Map(summary.monthlySecured.map(m => [m.month, m]))
  return BUDGET_CHART_MONTHS.map(month => ({
    month,
    total: map.get(month)?.total ?? 0,
    brands: map.get(month)?.brands ?? [],
  }))
}

export type BudgetChartKind = 'confirmed' | 'planned'

export interface MonthlyBudgetBreakdownItem {
  brand: string
  amount: number
  amountLabel: string
  stage: BudgetStage
  kind: BudgetChartKind
  payment: BrandBudget['payment']
}

export interface MonthlyBudgetChartRow {
  month: string
  items: MonthlyBudgetBreakdownItem[]
  paidTotal: number
  payPendingTotal: number
  unpaidTotal: number
  plannedReviewTotal: number
  plannedOctTotal: number
  total: number
  /** 해당 월까지 누적 총액 */
  cumulative: number
}

/** 월별 막대 — 확보(securedMonth) + 미확보 파이프라인(marketingMonth) */
export function monthlyBudgetForChart(): MonthlyBudgetChartRow[] {
  const rows: MonthlyBudgetChartRow[] = BUDGET_CHART_MONTHS.map(month => ({
    month,
    items: [],
    paidTotal: 0,
    payPendingTotal: 0,
    unpaidTotal: 0,
    plannedReviewTotal: 0,
    plannedOctTotal: 0,
    total: 0,
    cumulative: 0,
  }))
  const byMonth = new Map(rows.map(r => [r.month, r]))

  for (const b of BRAND_BUDGETS) {
    const amt = budgetMid(b)
    if (amt <= 0) continue
    const amountLabel = fmtBudgetRange(b).replace('만원', '만')

    if (b.securedMonth && byMonth.has(b.securedMonth)) {
      const row = byMonth.get(b.securedMonth)!
      row.items.push({ brand: b.brand, amount: amt, amountLabel, stage: b.stage, kind: 'confirmed', payment: b.payment })
      if (b.payment === '입금 완료') row.paidTotal += amt
      else if (b.payment === '입금 예정') row.payPendingTotal += amt
      else if (b.payment === '미입금') row.unpaidTotal += amt
      row.total += amt
      continue
    }

    if (!b.securedMonth && byMonth.has(b.marketingMonth)) {
      const row = byMonth.get(b.marketingMonth)!
      row.items.push({ brand: b.brand, amount: amt, amountLabel, stage: b.stage, kind: 'planned', payment: b.payment })
      if (b.stage === '계약 예정') row.plannedReviewTotal += amt
      else if (b.stage === '10월 예정') row.plannedOctTotal += amt
      row.total += amt
    }
  }

  let running = 0
  for (const row of rows) {
    running += row.total
    row.cumulative = running
  }

  return rows
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
  if (s.securedTotal !== 13000) throw new Error(`securedTotal expected 13000, got ${s.securedTotal}`)
  const brands = (k: BudgetKpiKey) => kpiCompanyRows(k).map(r => r.brand).sort().join(',')
  if (brands('secured') !== 'Rxme,TeloAct,닥터 리앤장,옵티팜,클리어디어') {
    throw new Error(`secured kpi brands: ${brands('secured')}`)
  }
  if (brands('planned') !== '달바,해브블루') throw new Error(`planned kpi brands: ${brands('planned')}`)
  if (brands('oct') !== '스킨스탠다드') throw new Error(`oct kpi brands: ${brands('oct')}`)
  const chart = monthlyBudgetForChart()
  if (chart[0]?.cumulative !== 4000) throw new Error(`jul cumulative expected 4000, got ${chart[0]?.cumulative}`)
  if (chart[1]?.cumulative !== 13000) throw new Error(`aug cumulative expected 13000, got ${chart[1]?.cumulative}`)
  if (chart[3]?.cumulative !== 16600) throw new Error(`oct cumulative expected 16600, got ${chart[3]?.cumulative}`)
}
