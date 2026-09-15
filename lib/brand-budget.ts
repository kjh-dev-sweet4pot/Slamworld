/** 브랜드 마케팅 예산 — 단일 소스 */

import { canonicalBrand } from '@/lib/brand-content'

export type BudgetPayment = '입금 완료' | '입금 예정' | '송금 대기' | '미입금' | '입금 지연' | '협의중' | '입점 논의중'
export type BudgetStage = '확정 및 진행' | '계약 예정' | '10월 예정'
/** 캠페인 집행 상태 (동일 브랜드 복수 캠페인용) */
export type BudgetUseStatus = '기 소진' | '사용 예정' | '가용'

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
  { brand: 'TeloAct', campaign: '2차', useStatus: '사용 예정', amount: 6500, payment: '입금 지연', stage: '확정 및 진행', securedMonth: '2026-09', marketingMonth: '2026-09', note: '2차 캠페인 · 입금 지연' },
  { brand: '옵티팜', campaign: '8월', useStatus: '기 소진', amount: 2000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-08', note: '8월 활용' },
  { brand: '옵티팜', campaign: '9월', amount: 2000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '9월 가용' },
  { brand: '닥터 리앤장', campaign: '8월', useStatus: '기 소진', amount: 1000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-08', note: '8월 사용' },
  { brand: '닥터 리앤장', campaign: '9월', amount: 2000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '9월 가용' },
  { brand: '클리어디어', useStatus: '사용 예정', amount: 1000, payment: '입금 지연', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '입금 지연 · 9월 가용' },
  { brand: 'Rxme', amount: 1000, payment: '입금 완료', stage: '확정 및 진행', securedMonth: '2026-08', marketingMonth: '2026-09', note: '입금 확인 · 9월 가용' },
  { brand: 'Troubleless', amount: 0, payment: '협의중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '예산 협의중' },
  { brand: 'UIQ', amount: 0, payment: '협의중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '예산 협의중' },
  { brand: '헤브블루', amount: 0, payment: '협의중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '예산 협의중' },
  { brand: '달바', amount: 3000, payment: '검토 중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '3,000만원 예상 중' },
  { brand: '리포데이', amount: 0, payment: '협의중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '예산 협의중' },
  { brand: '스킨스탠다드', amount: 1100, payment: '협의중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-10', note: '1,100만원 · 협의중' },
  { brand: '토코보', amount: 0, payment: '협의중', stage: '계약 예정', securedMonth: null, marketingMonth: '2026-09', note: '예산 협의중' },
]

export function budgetRowKey(b: BrandBudget): string {
  return b.campaign ? `${b.brand}::${b.campaign}` : b.brand
}

export function budgetRowLabel(b: BrandBudget): string {
  return b.campaign ? `${b.brand} · ${b.campaign}` : b.brand
}

export function budgetsForBrand(brand: string, list: BrandBudget[] = BRAND_BUDGETS): BrandBudget[] {
  return list.filter(b => b.brand === brand)
}

export function currentBudgetMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

type BudgetRoundRow = {
  company_name: string
  label?: string | null
  period_month: string
  amount_krw: number | null
  deposit_status: string
  usage_status: string
  kind?: string | null
}

function manwon(krw: number | null | undefined): number {
  if (krw == null || !Number.isFinite(Number(krw))) return 0
  return Number(krw) / 10000
}

function paymentOf(raw: string): BrandBudget['payment'] {
  // 검토 중 = Slamworld CHECK용 입점 논의중 저장값 (보딩패스는 협의중으로 정규화)
  if (raw === '입점 논의중' || raw === '검토 중') return '입점 논의중'
  if (raw === '입금 완료' || raw === '입금 지연' || raw === '협의중') return raw
  if (raw === '입금 예정' || raw === '송금 대기' || raw === '미입금') return raw
  return '협의중'
}

function stageOf(payment: BrandBudget['payment']): BudgetStage {
  return payment === '입금 완료' || payment === '입금 지연' ? '확정 및 진행' : '계약 예정'
}

function useStatusOf(raw: string): BudgetUseStatus | undefined {
  const v = String(raw || '').trim()
  if (v === '기소진' || v === '기 소진') return '기 소진'
  if (v === '사용 예정') return '사용 예정'
  if (v === '가용') return '가용'
  return undefined
}

/** 예산(사용) 행이 이미 잡힌 돈인지. 입금 행과 섞지 않음. */
function usageLooksBooked(usageStatus: string): boolean {
  const v = String(usageStatus || '').trim()
  return v === '가용' || v === '기 소진' || v === '기소진' || v === '사용 예정'
}

function rowToBudget(
  row: BudgetRoundRow,
  payment: BrandBudget['payment'],
  useStatus?: BudgetUseStatus,
): BrandBudget {
  const month = row.period_month.slice(0, 7)
  const status = useStatus ?? useStatusOf(row.usage_status)
  return {
    brand: canonicalBrand(row.company_name),
    campaign: row.label || undefined,
    useStatus: status,
    amount: manwon(row.amount_krw),
    payment,
    stage: stageOf(payment),
    securedMonth: month,
    marketingMonth: month,
    note: row.usage_status === '예산 협의중' ? '예산 협의중' : row.usage_status,
  }
}

/**
 * 보딩패스 라운드 → 화면 예산.
 * - 가용/기소진/사용예정: kind=사용(예산) 행만. 금액·상태도 그 행.
 * - 입금 지연: kind=입금 행만. 금액·월도 그 행.
 * 둘을 회사·라벨로 섞지 않음 (2차 가용 3000 + 2차 지연 3500 동시 표시).
 */
export function budgetsFromRounds(rounds: BudgetRoundRow[]): BrandBudget[] {
  const deposits = rounds.filter(r => (r.kind || '입금') === '입금')
  const usage = rounds.filter(r => r.kind === '사용')

  const fromUsage = usage.map(row => {
    const payment: BrandBudget['payment'] = usageLooksBooked(row.usage_status)
      ? '입금 완료'
      : paymentOf(row.deposit_status)
    return rowToBudget(row, payment)
  })

  const fromLate = deposits
    .filter(d => d.deposit_status === '입금 지연')
    .map(d => rowToBudget(d, '입금 지연'))

  return [...fromUsage, ...fromLate]
}

export const DISCUSSING_STAGE = '계약 조건 논의중'
export const ENTRY_DISCUSSING_STAGE = '입점 논의중'

function brandAmountRows(
  budgets: BrandBudget[],
): { brand: string; amount: number }[] {
  const map = new Map<string, number>()
  for (const b of budgets) {
    map.set(b.brand, (map.get(b.brand) ?? 0) + budgetMid(b))
  }
  return [...map.entries()]
    .map(([brand, amount]) => ({ brand, amount }))
    .sort((a, b) => b.amount - a.amount || a.brand.localeCompare(b.brand, 'ko'))
}

/** 입금 예산 단계 기준. 협의중 → 계약 조건 논의중. contract_stage 와 무관. */
export function discussingCompanyRows(
  rounds: BudgetRoundRow[],
): { brand: string; amount: number }[] {
  return brandAmountRows(
    budgetsFromRounds(rounds).filter(b => b.payment === '협의중'),
  )
}

/** 입금 예산 단계 기준. 입점 논의중 (검토 중 저장값 포함). */
export function entryDiscussingCompanyRows(
  rounds: BudgetRoundRow[],
): { brand: string; amount: number }[] {
  return brandAmountRows(
    budgetsFromRounds(rounds).filter(b => b.payment === '입점 논의중'),
  )
}

/** 협업 회사 도넛 — 브랜드별 색 */
export const PARTNER_BRAND_COLOR: Record<string, string> = {
  'TeloAct': '#14B8A6',
  '옵티팜': '#1868F0',
  '닥터 리앤장': '#0B47B4',
  '클리어디어': '#22C55E',
  'Rxme': '#6FBFFF',
  '헤브블루': '#F59E0B',
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
export function partnerCompanyDonut(list: BrandBudget[] = BRAND_BUDGETS): { slices: PartnerDonutSlice[]; totalWeight: number; count: number } {
  const known = list.filter(b => budgetMid(b) > 0)
  const unknown = list.filter(b => budgetMid(b) <= 0)

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
  const companyCount = new Set(list.map(b => b.brand)).size
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
    amountLabel: isLatePayment(b.payment) ? LATE_UPLOAD_NOTE : '예산 협의중',
    stage: isLatePayment(b.payment) ? (b.stage as BudgetStage) : '미정' as const,
    payment: b.payment,
    sortKey: -1,
  }))

  return [...known, ...unknown]
}

/** 호버 툴팁 — 예산순(미정은 맨 아래) */
export function partnerCompanyTooltipRows(list: BrandBudget[] = BRAND_BUDGETS): PartnerTooltipRow[] {
  return toTooltipRows(list)
}

/** 도넛 '계약 예정·검토' 호버 — 금액 미확정 회사 (실제 계약 단계 유지) */
export function unknownBudgetRows(list: BrandBudget[] = BRAND_BUDGETS): PartnerTooltipRow[] {
  return list.filter(b => budgetMid(b) <= 0).map(b => ({
    brand: b.brand,
    amount: 0,
    amountLabel: '예산 협의중',
    stage: b.stage,
    payment: b.payment,
    sortKey: -1,
  }))
}

export type BudgetKpiKey = 'secured' | 'pipeline' | 'planned' | 'oct'

/** 상단 KPI 호버 — 해당 집계에 포함된 회사 */
export function usedBudgetRows(list: BrandBudget[] = BRAND_BUDGETS): PartnerTooltipRow[] {
  return toTooltipRows(list.filter(b => b.payment === '입금 완료' && isSpentBudget(b)))
}

export function availableBudgetRows(list: BrandBudget[] = BRAND_BUDGETS): PartnerTooltipRow[] {
  return toTooltipRows(list.filter(isAvailableBudget))
}

export function sepAvailableRows(list: BrandBudget[] = BRAND_BUDGETS, month = '2026-09'): PartnerTooltipRow[] {
  return toTooltipRows(list.filter(b =>
    isAvailableBudget(b) && b.marketingMonth === month,
  ))
}

/** 입금 지연 → 미수령. 입금 행만. 금액 0이어도 포함. */
export function unreceivedBudgetRows(list: BrandBudget[] = BRAND_BUDGETS): PartnerTooltipRow[] {
  return toTooltipRows(list.filter(b => b.payment === '입금 지연'))
}

export function kpiCompanyRows(key: BudgetKpiKey, list: BrandBudget[] = BRAND_BUDGETS): PartnerTooltipRow[] {
  const rows =
    key === 'secured' ? list.filter(b => CONFIRMED_STAGES.includes(b.stage)) :
    key === 'pipeline' ? list :
    key === 'planned' ? list.filter(b => b.stage === '계약 예정') :
    list.filter(b => b.stage === '10월 예정')
  return toTooltipRows(rows)
}

export function isSpentBudget(b: Pick<BrandBudget, 'useStatus'>): boolean {
  return b.useStatus === '기 소진'
}

/** 가용예산 = 예산(사용) 행. 입금 지연과 섞지 않음. */
export function isAvailableBudget(b: Pick<BrandBudget, 'payment' | 'useStatus'>): boolean {
  if (b.payment === '입금 지연') return false
  if (b.useStatus === '가용') return true
  if (b.useStatus === '기 소진') return false
  return b.payment === '입금 완료'
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
  if (b.amount <= 0) return '예산 협의중'
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
export function monthlyDepositChart(list: BrandBudget[] = BRAND_BUDGETS): DepositMonthRow[] {
  const rows: DepositMonthRow[] = BUDGET_CHART_MONTHS.map(month => ({
    month,
    available: 0,
    used: 0,
    total: 0,
    items: [],
  }))
  const byMonth = new Map(rows.map(r => [r.month, r]))

  for (const b of list) {
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
export function monthlyUnpaidChart(list: BrandBudget[] = BRAND_BUDGETS): UnpaidMonthRow[] {
  const rows: UnpaidMonthRow[] = BUDGET_CHART_MONTHS.map(month => ({
    month,
    total: 0,
    items: [],
  }))
  const byMonth = new Map(rows.map(r => [r.month, r]))

  for (const b of list) {
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

export function computeBudgetSummary(list: BrandBudget[] = BRAND_BUDGETS, month = '2026-09'): BudgetSummary {
  const confirmed = list.filter(b => CONFIRMED_STAGES.includes(b.stage))
  const securedTotal = confirmed.reduce((s, b) => s + budgetMid(b), 0)
  const paid = confirmed.filter(b => b.payment === '입금 완료')
  const securedPaid = paid.reduce((s, b) => s + budgetMid(b), 0)
  const usedTotal = paid.filter(isSpentBudget).reduce((s, b) => s + budgetMid(b), 0)
  const availableTotal = list.filter(isAvailableBudget).reduce((s, b) => s + budgetMid(b), 0)
  const sepAvailable = list
    .filter(b => isAvailableBudget(b) && b.marketingMonth === month)
    .reduce((s, b) => s + budgetMid(b), 0)
  const securedPending = confirmed
    .filter(b => b.payment === '입금 지연')
    .reduce((s, b) => s + budgetMid(b), 0)

  const pipelineKnown = list.reduce((s, b) => s + budgetMid(b), 0)
  const pipelineMax = list.reduce((s, b) => s + budgetMax(b), 0)
  const pipelineUnknown = pipelineMax - pipelineKnown

  const byStage = {} as BudgetSummary['byStage']
  for (const stage of ['확정 및 진행', '계약 예정', '10월 예정'] as BudgetStage[]) {
    const rows = list.filter(b => b.stage === stage)
    byStage[stage] = {
      count: rows.length,
      total: rows.reduce((s, b) => s + budgetMid(b), 0),
    }
  }

  const byPayment: Record<string, number> = {}
  for (const b of list) {
    if (budgetMid(b) <= 0) continue
    byPayment[b.payment] = (byPayment[b.payment] ?? 0) + budgetMid(b)
  }

  const monthMap = new Map<string, { total: number; brands: string[] }>()
  for (const b of list) {
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
  if (s.securedTotal !== 19500) throw new Error(`securedTotal expected 19500, got ${s.securedTotal}`)
  if (s.securedPaid !== 12000) throw new Error(`securedPaid expected 12000, got ${s.securedPaid}`)
  if (s.usedTotal !== 7000) throw new Error(`usedTotal expected 7000, got ${s.usedTotal}`)
  if (s.availableTotal !== 5000) throw new Error(`availableTotal expected 5000, got ${s.availableTotal}`)
  if (s.sepAvailable !== 5000) throw new Error(`sepAvailable expected 5000, got ${s.sepAvailable}`)
  const brands = (k: BudgetKpiKey) => kpiCompanyRows(k).map(r => r.brand).sort().join(',')
  if (brands('secured') !== 'Rxme,TeloAct · 1차,TeloAct · 2차,닥터 리앤장 · 8월,닥터 리앤장 · 9월,옵티팜 · 8월,옵티팜 · 9월,클리어디어') {
    throw new Error(`secured kpi brands: ${brands('secured')}`)
  }
  if (brands('planned') !== 'Troubleless,UIQ,달바,리포데이,스킨스탠다드,토코보,헤브블루') throw new Error(`planned kpi brands: ${brands('planned')}`)
  if (brands('oct') !== '') throw new Error(`oct kpi brands: ${brands('oct')}`)
  const unknown = unknownBudgetRows().map(r => r.brand).sort().join(',')
  if (unknown !== 'Troubleless,UIQ,리포데이,토코보,헤브블루') throw new Error(`unknown budget brands: ${unknown}`)
  if (s.byStage['계약 예정'].total !== 4100) throw new Error(`planned total expected 4100, got ${s.byStage['계약 예정'].total}`)
  const deposit = monthlyDepositChart()
  if (deposit[0]?.used !== 4000 || deposit[0]?.available !== 0) throw new Error(`jul deposit ${deposit[0]?.used}/${deposit[0]?.available}`)
  if (deposit[1]?.used !== 3000 || deposit[1]?.available !== 5000) throw new Error(`aug deposit ${deposit[1]?.used}/${deposit[1]?.available}`)
  if (deposit[2]?.total !== 0) throw new Error(`sep deposit should be 0, got ${deposit[2]?.total}`)
  const unpaid = monthlyUnpaidChart()
  if (unpaid[1]?.total !== 1000) throw new Error(`aug unpaid expected 1000, got ${unpaid[1]?.total}`)
  if (unpaid[2]?.total !== 6500) throw new Error(`sep unpaid expected 6500, got ${unpaid[2]?.total}`)
  const plannedInChart = [...deposit, ...unpaid].some(r => r.items.some(i => i.stage === '계약 예정'))
  if (plannedInChart) throw new Error('contract-planned must stay out of monthly charts')
  if (unreceivedBudgetRows().reduce((n, r) => n + r.amount, 0) !== 7500) throw new Error('unreceived list total')
  const mapped = budgetsFromRounds([
    { company_name: '텔로엑트', label: '2차', period_month: '2026-09-01', amount_krw: 30000000, deposit_status: '협의중', usage_status: '가용', kind: '사용' },
    { company_name: '텔로엑트', label: '2차', period_month: '2026-09-01', amount_krw: 30000000, deposit_status: '입금 완료', usage_status: '협의중', kind: '입금' },
    { company_name: '텔로엑트', label: '2차', period_month: '2026-10-01', amount_krw: 35000000, deposit_status: '입금 지연', usage_status: '협의중', kind: '입금' },
    { company_name: '닥터리앤장', period_month: '2026-08-01', amount_krw: 10000000, deposit_status: '협의중', usage_status: '기 소진', kind: '사용' },
    { company_name: '닥터리앤장', period_month: '2026-08-01', amount_krw: 30000000, deposit_status: '입금 완료', usage_status: '사용 예정', kind: '입금' },
  ])
  const teloAvail = mapped.find(b => b.campaign === '2차' && isAvailableBudget(b))
  const teloLate = mapped.find(b => b.campaign === '2차' && b.payment === '입금 지연')
  const lj = mapped.find(b => b.useStatus === '기 소진')
  if (!teloAvail || teloAvail.amount !== 3000 || teloAvail.payment !== '입금 완료') {
    throw new Error(`telo available 3000 expected, got ${JSON.stringify(teloAvail)}`)
  }
  if (!teloLate || teloLate.amount !== 3500 || teloLate.marketingMonth !== '2026-10') {
    throw new Error(`telo late 3500 Oct expected, got ${JSON.stringify(teloLate)}`)
  }
  if (lj?.payment !== '입금 완료' || lj.useStatus !== '기 소진' || lj.brand !== '닥터 리앤장') throw new Error('round map lienjang')
  const lateOnly = budgetsFromRounds([
    { company_name: '옵티팜', label: '9월', period_month: '2026-09-01', amount_krw: 20000000, deposit_status: '입금 완료', usage_status: '가용', kind: '사용' },
    { company_name: '달바', period_month: '2026-09-01', amount_krw: 30000000, deposit_status: '입금 지연', usage_status: '사용 예정', kind: '입금' },
    { company_name: '달바', period_month: '2026-09-01', amount_krw: null, deposit_status: '협의중', usage_status: '예산 협의중', kind: '사용' },
    { company_name: 'UIQ', period_month: '2026-09-01', amount_krw: null, deposit_status: '입금 지연', usage_status: '사용 예정', kind: '입금' },
  ])
  const dalbaLate = lateOnly.filter(b => b.brand === '달바' && b.payment === '입금 지연')
  const dalbaUsage = lateOnly.filter(b => b.brand === '달바' && b.payment !== '입금 지연')
  const uiq = lateOnly.find(b => b.brand === 'UIQ' && b.payment === '입금 지연')
  if (dalbaLate.length !== 1 || dalbaLate[0]?.amount !== 3000) {
    throw new Error(`dalba late 3000 from deposit expected, got ${JSON.stringify(dalbaLate)}`)
  }
  if (dalbaUsage.some(b => b.payment === '입금 지연')) throw new Error('usage must not inherit late')
  if (uiq?.payment !== '입금 지연' || uiq.amount !== 0) throw new Error(`uiq late zero expected, got ${JSON.stringify(uiq)}`)
  if (!unreceivedBudgetRows(lateOnly).some(r => r.brand === 'UIQ' && isLatePayment(r.payment))) {
    throw new Error('unreceived must include zero-amount late')
  }
  if (availableBudgetRows(lateOnly).some(r => r.brand === '달바')) {
    throw new Error('dalba late must not appear in available')
  }
  if (!availableBudgetRows(lateOnly).some(r => r.brand === '옵티팜' && r.amount === 2000)) {
    throw new Error('optipharm available from usage')
  }
  const discussing = discussingCompanyRows([
    { company_name: '트러블레스', period_month: '2026-09-01', amount_krw: 11000000, deposit_status: '협의중', usage_status: '예산 협의중', kind: '입금' },
    { company_name: '옵티팜', period_month: '2026-09-01', amount_krw: 20000000, deposit_status: '입금 완료', usage_status: '가용', kind: '입금' },
    { company_name: '달바', period_month: '2026-09-01', amount_krw: 30000000, deposit_status: '입금 완료', usage_status: '사용 예정', kind: '입금' },
  ])
  if (discussing.length !== 1 || discussing[0]?.brand !== 'Troubleless' || discussing[0]?.amount !== 1100) {
    throw new Error(`discussing rows ${JSON.stringify(discussing)}`)
  }
  if (discussingCompanyRows([
    { company_name: '달바', period_month: '2026-09-01', amount_krw: 30000000, deposit_status: '입금 완료', usage_status: '예산 협의중', kind: '입금' },
    { company_name: '달바', period_month: '2026-09-01', amount_krw: 30000000, deposit_status: '협의중', usage_status: '가용', kind: '사용' },
  ]).length !== 0) {
    throw new Error('입금 완료 회사는 논의중 제외')
  }
  const entry = entryDiscussingCompanyRows([
    { company_name: '신규브랜드', period_month: '2026-09-01', amount_krw: null, deposit_status: '입점 논의중', usage_status: '예산 협의중', kind: '입금' },
    { company_name: '검토중브랜드', period_month: '2026-09-01', amount_krw: 0, deposit_status: '검토 중', usage_status: '예산 협의중', kind: '입금' },
    { company_name: '트러블레스', period_month: '2026-09-01', amount_krw: 11000000, deposit_status: '협의중', usage_status: '예산 협의중', kind: '입금' },
  ])
  if (entry.length !== 2 || !entry.some(r => r.brand === '신규브랜드') || !entry.some(r => r.brand === '검토중브랜드')) {
    throw new Error(`entry discussing ${JSON.stringify(entry)}`)
  }
}
