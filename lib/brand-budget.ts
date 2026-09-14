/** 브랜드 마케팅 예산 — 단일 소스 */

export type BudgetPayment = '입금 완료' | '입금 예정' | '송금 대기' | '미입금' | '입금 지연' | '협의중'
export type BudgetStage = '확정 및 진행' | '계약 예정' | '10월 예정'
/** 캠페인 집행 상태 (동일 브랜드 복수 캠페인용) */
export type BudgetUseStatus = '기 소진' | '사용 예정'

export interface BrandBudget {
  brand: string
  /** 동일 브랜드 복수 캠페인 구분 (1차, 2차 …) */
  campaign?: string
  /** 기 소진 / 사용 예정 */
  useStatus?: BudgetUseStatus
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
  { brand: 'TeloAct', campaign: '1차', useStatus: '기 소진', amount: 4000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-07', marketingMonth: '2026-07', note: '1차 캠페인 · 기 소진' },
  { brand: 'TeloAct', campaign: '2차', useStatus: '사용 예정', amount: 6000, payment: '입금 지연', stage: '확정 및 진행', securedMonth: '2026-09', marketingMonth: '2026-09', note: '2차 캠페인 · 입금 지연' },
  { brand: '옵티팜', campaign: '8월', useStatus: '기 소진', amount: 2000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-08', note: '8월 활용' },
  { brand: '옵티팜', campaign: '9월', amount: 2000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '9월 가용' },
  { brand: '닥터 리앤장', campaign: '8월', useStatus: '기 소진', amount: 1000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-08', note: '8월 사용' },
  { brand: '닥터 리앤장', campaign: '9월', amount: 2000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '9월 가용' },
  { brand: '클리어디어', amount: 1000, payment: '입금 지연', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '입금 지연' },
  { brand: 'Rxme', amount: 1000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '입금 확인 · 9월 가용' },
  { brand: 'Troubleless', amount: 1000, payment: '입금 지연', stage: '확정 및 진행', securedMonth: '2026-09', marketingMonth: '2026-09', note: '입금 지연' },
  { brand: 'UIQ', amount: 1000, payment: '입금 지연', stage: '확정 및 진행', securedMonth: '2026-09', marketingMonth: '2026-09', note: '입금 지연' },
  { brand: '해브블루', amount: 2000, rangeMax: 3000, payment: '검토 중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '2,000–3,000만원 예상' },
  { brand: '달바', amount: 3000, payment: '검토 중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '3,000만원 예상 중' },
  { brand: '리포데이', amount: 1000, payment: '협의중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '매월 1,000만원 · 협의중' },
  { brand: '스킨스탠다드', amount: 1100, payment: '협의중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-10', note: '1,100만원 · 협의중' },
  { brand: '토코보', amount: 0, payment: '협의중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '협의중' },
]

export function budgetRowKey(b: BrandBudget): string {
  return b.campaign ? `${b.brand}::${b.campaign}` : b.brand
}

export function budgetRowLabel(b: BrandBudget): string {
  return b.campaign ? `${b.brand} · ${b.campaign}` : b.brand
}

export function budgetsForBrand(brand: string): BrandBudget[] {
  return BRAND_BUDGETS.filter(b => b.brand === brand)
}

/** 협업 회사 도넛 — 브랜드별 색 */
export const PARTNER_BRAND_COLOR: Record<string, string> = {
  'TeloAct': '#14B8A6',
  '옵티팜': '#1868F0',
  '닥터 리앤장': '#0B47B4',
  '클리어디어': '#22C55E',
  'Rxme': '#6FBFFF',
  '해브블루': '#F59E0B',
  '달바': '#E11D48',
  '리포데이': '#14B8A6',
  '스킨스탠다드': '#6366F1',
  '토코보': '#7C3AED',
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
    if (payment === '입금 예정' || payment === '송금 대기') return '#F59E0B'
    if (payment === '미입금' || payment === '입금 지연') return '#EF4444'
  }
  if (stage === '계약 예정') return '#EA580C'
  if (stage === '10월 예정') return '#6366F1'
  return '#94A3B8'
}

export function budgetStageLabel(stage: BudgetStage | '미정'): string {
  if (stage === '미정' || stage === '계약 예정') return '계약 예정·검토'
  if (stage === '10월 예정') return '계약 논의중'
  return stage
}

export function budgetPaymentLabel(payment: BrandBudget['payment']): string {
  return payment === '검토 중' ? '송금 검토' : payment
}

export const LATE_UPLOAD_NOTE = '입금 지연 → 캠페인 진행 불가'

export function isLatePayment(payment?: string): boolean {
  return payment === '입금 지연'
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
  payment?: BrandBudget['payment']
  spent?: boolean
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
    key: budgetRowKey(b),
    label: budgetRowLabel(b),
    weight: budgetMid(b),
    color: budgetItemColor(b.stage, b.payment),
    stage: b.stage,
    payment: b.payment,
    spent: isSpentBudget(b),
  }))

  if (unknown.length > 0) {
    slices.push({
      key: '__unknown__',
      label: unknown.length === 1 ? '계약 예정·검토' : `계약 예정·검토 (${unknown.length})`,
      weight: unknown.length,
      color: PARTNER_UNKNOWN_COLOR,
      stage: '미정',
      isUnknownGroup: true,
    })
  }

  const totalWeight = slices.reduce((s, x) => s + x.weight, 0)
  const companyCount = new Set(BRAND_BUDGETS.map(b => b.brand)).size
  return { slices, totalWeight, count: companyCount }
}

function toTooltipRows(list: BrandBudget[]): PartnerTooltipRow[] {
  const known = list.filter(b => budgetMid(b) > 0)
    .map(b => ({
      brand: budgetRowLabel(b),
      amount: budgetMid(b),
      amountLabel: [
        b.useStatus,
        fmtBudgetRange(b).replace('만원', '만'),
      ].filter(Boolean).join(' · '),
      stage: b.stage as BudgetStage,
      payment: b.payment,
      sortKey: budgetMid(b),
    }))
    .sort((a, b) => b.sortKey - a.sortKey)

  const unknown = list.filter(b => budgetMid(b) <= 0).map(b => ({
    brand: budgetRowLabel(b),
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

/** 도넛 '계약 예정·검토' 호버 — 금액 미확정 회사 (실제 계약 단계 유지) */
export function unknownBudgetRows(): PartnerTooltipRow[] {
  return BRAND_BUDGETS.filter(b => budgetMid(b) <= 0).map(b => ({
    brand: b.brand,
    amount: 0,
    amountLabel: '미확인',
    stage: b.stage,
    payment: b.payment,
    sortKey: -1,
  }))
}

export type BudgetKpiKey = 'secured' | 'pipeline' | 'planned' | 'oct'

/** 상단 KPI 호버 — 해당 집계에 포함된 회사 */
export function usedBudgetRows(): PartnerTooltipRow[] {
  return toTooltipRows(BRAND_BUDGETS.filter(b => b.payment === '입금 완료' && isSpentBudget(b)))
}

export function availableBudgetRows(): PartnerTooltipRow[] {
  return toTooltipRows(BRAND_BUDGETS.filter(b => b.payment === '입금 완료' && !isSpentBudget(b)))
}

export function sepAvailableRows(): PartnerTooltipRow[] {
  return toTooltipRows(BRAND_BUDGETS.filter(b =>
    b.payment === '입금 완료' && !isSpentBudget(b) && b.marketingMonth === '2026-09',
  ))
}

/** 확정인데 아직 입금 전 — 계약 예정·협의중은 제외 */
export function unreceivedBudgetRows(): PartnerTooltipRow[] {
  return toTooltipRows(BRAND_BUDGETS.filter(b =>
    CONFIRMED_STAGES.includes(b.stage) && b.payment !== '입금 완료',
  ))
}

export function kpiCompanyRows(key: BudgetKpiKey): PartnerTooltipRow[] {
  const list =
    key === 'secured' ? BRAND_BUDGETS.filter(b => CONFIRMED_STAGES.includes(b.stage)) :
    key === 'pipeline' ? BRAND_BUDGETS :
    key === 'planned' ? BRAND_BUDGETS.filter(b => b.stage === '계약 예정') :
    BRAND_BUDGETS.filter(b => b.stage === '10월 예정')
  return toTooltipRows(list)
}

export function isSpentBudget(b: Pick<BrandBudget, 'useStatus'>): boolean {
  return b.useStatus === '기 소진'
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

/** 월별 확보 차트에 항상 표시할 월 (데이터 없으면 0) */
export const BUDGET_CHART_MONTHS = [
  '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
] as const

export interface BudgetSummary {
  securedTotal: number
  securedPaid: number
  /** 입금 완료 중 기 소진 */
  usedTotal: number
  /** 입금 완료 − 사용완료 */
  availableTotal: number
  /** 해당 월 마케팅 · 아직 안 쓴 입금 */
  sepAvailable: number
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

export interface BudgetMonthItem {
  brand: string
  amount: number
  amountLabel: string
  stage: BudgetStage
  payment: BrandBudget['payment']
}

export interface DepositMonthRow {
  month: string
  available: number
  used: number
  total: number
  items: BudgetMonthItem[]
}

export interface UnpaidMonthRow {
  month: string
  total: number
  items: BudgetMonthItem[]
}

function chartAmountLabel(b: BrandBudget): string {
  const tag = [b.useStatus, b.note].filter(Boolean).join(' · ')
  const amt = fmtBudgetRange(b).replace('만원', '만')
  return tag ? `${tag} · ${amt}` : amt
}

function chartItem(b: BrandBudget, amount: number): BudgetMonthItem {
  return {
    brand: budgetRowLabel(b),
    amount,
    amountLabel: chartAmountLabel(b),
    stage: b.stage,
    payment: b.payment,
  }
}

/** 월별 입금 — securedMonth 기준. 가용(미사용) / 사용(기 소진). 미수령·계약 예정은 제외 */
export function monthlyDepositChart(): DepositMonthRow[] {
  const rows: DepositMonthRow[] = BUDGET_CHART_MONTHS.map(month => ({
    month,
    available: 0,
    used: 0,
    total: 0,
    items: [],
  }))
  const byMonth = new Map(rows.map(r => [r.month, r]))

  for (const b of BRAND_BUDGETS) {
    if (b.payment !== '입금 완료' || !b.securedMonth) continue
    const amt = budgetMid(b)
    const row = byMonth.get(b.securedMonth)
    if (amt <= 0 || !row) continue
    if (isSpentBudget(b)) row.used += amt
    else row.available += amt
    row.total += amt
    row.items.push(chartItem(b, amt))
  }
  return rows
}

/** 월별 미입금 — 확정인데 입금 전. 계약 예정·협의중은 제외 */
export function monthlyUnpaidChart(): UnpaidMonthRow[] {
  const rows: UnpaidMonthRow[] = BUDGET_CHART_MONTHS.map(month => ({
    month,
    total: 0,
    items: [],
  }))
  const byMonth = new Map(rows.map(r => [r.month, r]))

  for (const b of BRAND_BUDGETS) {
    if (!CONFIRMED_STAGES.includes(b.stage) || b.payment === '입금 완료') continue
    const amt = budgetMid(b)
    if (amt <= 0) continue
    const month = b.securedMonth && byMonth.has(b.securedMonth) ? b.securedMonth : b.marketingMonth
    const row = byMonth.get(month)
    if (!row) continue
    row.total += amt
    row.items.push(chartItem(b, amt))
  }
  return rows
}

export function computeBudgetSummary(): BudgetSummary {
  const confirmed = BRAND_BUDGETS.filter(b => CONFIRMED_STAGES.includes(b.stage))
  const securedTotal = confirmed.reduce((s, b) => s + budgetMid(b), 0)
  const paid = confirmed.filter(b => b.payment === '입금 완료')
  const securedPaid = paid.reduce((s, b) => s + budgetMid(b), 0)
  const usedTotal = paid.filter(isSpentBudget).reduce((s, b) => s + budgetMid(b), 0)
  const availableTotal = securedPaid - usedTotal
  const sepAvailable = paid
    .filter(b => !isSpentBudget(b) && b.marketingMonth === '2026-09')
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
    usedTotal,
    availableTotal,
    sepAvailable,
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
  if (s.securedTotal !== 21000) throw new Error(`securedTotal expected 21000, got ${s.securedTotal}`)
  if (s.securedPaid !== 12000) throw new Error(`securedPaid expected 12000, got ${s.securedPaid}`)
  if (s.usedTotal !== 7000) throw new Error(`usedTotal expected 7000, got ${s.usedTotal}`)
  if (s.availableTotal !== 5000) throw new Error(`availableTotal expected 5000, got ${s.availableTotal}`)
  if (s.sepAvailable !== 5000) throw new Error(`sepAvailable expected 5000, got ${s.sepAvailable}`)
  const brands = (k: BudgetKpiKey) => kpiCompanyRows(k).map(r => r.brand).sort().join(',')
  if (brands('secured') !== 'Rxme,TeloAct · 1차,TeloAct · 2차,Troubleless,UIQ,닥터 리앤장 · 8월,닥터 리앤장 · 9월,옵티팜 · 8월,옵티팜 · 9월,클리어디어') {
    throw new Error(`secured kpi brands: ${brands('secured')}`)
  }
  if (brands('planned') !== '달바,리포데이,스킨스탠다드,토코보,해브블루') throw new Error(`planned kpi brands: ${brands('planned')}`)
  if (brands('oct') !== '') throw new Error(`oct kpi brands: ${brands('oct')}`)
  const unknown = unknownBudgetRows().map(r => r.brand).sort().join(',')
  if (unknown !== '토코보') throw new Error(`unknown budget brands: ${unknown}`)
  if (s.byStage['계약 예정'].total !== 7600) throw new Error(`planned total expected 7600, got ${s.byStage['계약 예정'].total}`)
  const deposit = monthlyDepositChart()
  if (deposit[0]?.used !== 4000 || deposit[0]?.available !== 0) throw new Error(`jul deposit ${deposit[0]?.used}/${deposit[0]?.available}`)
  if (deposit[1]?.used !== 3000 || deposit[1]?.available !== 5000) throw new Error(`aug deposit ${deposit[1]?.used}/${deposit[1]?.available}`)
  if (deposit[2]?.total !== 0) throw new Error(`sep deposit should be 0, got ${deposit[2]?.total}`)
  const unpaid = monthlyUnpaidChart()
  if (unpaid[1]?.total !== 1000) throw new Error(`aug unpaid expected 1000, got ${unpaid[1]?.total}`)
  if (unpaid[2]?.total !== 8000) throw new Error(`sep unpaid expected 8000, got ${unpaid[2]?.total}`)
  const plannedInChart = [...deposit, ...unpaid].some(r => r.items.some(i => i.stage === '계약 예정'))
  if (plannedInChart) throw new Error('contract-planned must stay out of monthly charts')
  if (unreceivedBudgetRows().reduce((n, r) => n + r.amount, 0) !== 9000) throw new Error('unreceived list total')
}
