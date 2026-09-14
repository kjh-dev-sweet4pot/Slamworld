export type BrandTier = 'large' | 'mid' | 'small'
export type PipelineStage = 1 | 2 | 3 | 4

export interface ContractBrand {
  name: string
  budget: string
  meta: string
  days: number
  status: string
  /** 계약 완료일 (YYYY-MM-DD). 없으면 계약서 전달 중 */
  contractCompletedOn?: string
  segs: [number, number, number, number, number]
}

export interface TimelineMilestone {
  date: string
  title: string
  detail: string
}

export interface PrepItem {
  brand: string
  detail: string
  eta: string
  pct: number
  note: string
}

export interface BrandStatusItem {
  brand: string
  status: string
  pct: number
}

export interface MatchItem {
  brand: string
  detail: string
  done: number
  total: number
  note: string
  eta: string
}

export interface PipelineBrand {
  name: string
  desc: string
  budget: string
  tier: BrandTier
  stage: PipelineStage
  stageLabel: string
  eta: string
}

/** 입금 완료·예정 — 9월 마케팅 목표 (예산 큰 순) */
export const CONTRACT_BRANDS: ContractBrand[] = [
  {
    name: 'TeloAct 1차',
    budget: '4,000만원',
    meta: '기 소진 · 7월 집행 완료',
    days: 16,
    status: '1차 마케팅 완료',
    contractCompletedOn: '2026-07-10',
    segs: [4, 2, 4, 3, 2],
  },
  {
    name: 'TeloAct 2차',
    budget: '6,000만원',
    meta: '사용 예정 · 입금 지연',
    days: 16,
    status: '2차 준비',
    segs: [4, 2, 4, 3, 2],
  },
  {
    name: '옵티팜',
    budget: '4,000만원',
    meta: '입금 확인 · 가이드 대기',
    days: 16,
    status: '9월 마케팅 목표',
    segs: [5, 2, 5, 2, 2],
  },
  {
    name: '닥터 리앤장',
    budget: '3,000만원',
    meta: '8/30 입금 확인 · 가이드 제작 중',
    days: 15,
    status: '9월 마케팅 목표',
    contractCompletedOn: '2026-08-30',
    segs: [4, 2, 4, 3, 2],
  },
  {
    name: '클리어디어',
    budget: '1,000만원',
    meta: '입금 지연',
    days: 14,
    status: '9월 마케팅 목표',
    segs: [4, 2, 4, 2, 2],
  },
  {
    name: 'Rxme',
    budget: '1,000만원',
    meta: '8/31 입금 확인 · 가이드 제작 중',
    days: 14,
    status: '9월 마케팅 목표',
    contractCompletedOn: '2026-08-31',
    segs: [4, 2, 4, 2, 2],
  },
  {
    name: 'Troubleless',
    budget: '1,000만원',
    meta: '입금 지연',
    days: 14,
    status: '9월 마케팅 목표',
    segs: [4, 2, 4, 2, 2],
  },
  {
    name: 'UIQ',
    budget: '1,000만원',
    meta: '입금 지연',
    days: 14,
    status: '진행 대기',
    segs: [4, 2, 4, 2, 2],
  },
]

/** 8월 말 가이드 확정 → 9월 초 방문 시작 */
export const COMMON_TIMELINE: TimelineMilestone[] = [
  {
    date: '~ 8.31 (월)',
    title: '초기 가이드라인 전달',
    detail: '컨셉 4종 PPL + Rxme 원브랜디드 영상 가이드 제작·전달',
  },
  {
    date: '~ 9.4',
    title: '2차 리스트',
    detail: '영미권·중화권 인플루언서 2차 리스트 전달',
  },
  {
    date: '9.6',
    title: '방문 시작',
    detail: '가장 빠른 인플루언서 기준 방문 마케팅 시작',
  },
  {
    date: '당월 목표',
    title: '발행 54건',
    detail: '명동 80% · 북촌 20%',
  },
]

/** 9월 마케팅 타겟 — 브랜드별 상세 현황 */
export const SEPTEMBER_BRAND_STATUS: BrandStatusItem[] = [
  {
    brand: 'TeloAct 1차',
    status: '기 소진 · 명동·남포 캠페인 집행 완료',
    pct: 100,
  },
  {
    brand: 'TeloAct 2차',
    status: '사용 예정 · 6,000만 · 입금 지연',
    pct: 0,
  },
  {
    brand: '닥터 리앤장',
    status: '8/30 입금 확인 · PPL 컨셉안 전달 완료 · 가이드 제작 중',
    pct: 75,
  },
  {
    brand: '옵티팜',
    status: '입금 확인 · 가이드 대기',
    pct: 12,
  },
  {
    brand: '클리어디어',
    status: '입금 지연',
    pct: 12,
  },
  {
    brand: 'Rxme',
    status: '8/31 입금 확인 · 원브랜디드 영상 가이드 제작 중',
    pct: 55,
  },
  {
    brand: 'Troubleless',
    status: '입금 지연',
    pct: 12,
  },
  {
    brand: 'UIQ',
    status: '입금 지연',
    pct: 0,
  },
]

export const GUIDE_PREP: PrepItem[] = [
  {
    brand: 'TeloAct 1차',
    detail: '1차 캠페인 · 발행 완료',
    eta: '완료',
    pct: 100,
    note: '기 소진 4,000만원',
  },
  {
    brand: 'TeloAct 2차',
    detail: '2차 가이드 대기',
    eta: '사용 예정',
    pct: 0,
    note: '6,000만원 · 입금 지연',
  },
  {
    brand: '닥터 리앤장',
    detail: 'PPL + 원브랜디드 가이드',
    eta: '8.31 (월)',
    pct: 75,
    note: '8/30 입금 확인',
  },
  {
    brand: 'Rxme',
    detail: '원브랜디드 영상 가이드',
    eta: '제작 중',
    pct: 55,
    note: '8/31 입금 확인',
  },
  {
    brand: '옵티팜',
    detail: '가이드 착수',
    eta: '가이드 대기',
    pct: 10,
    note: '4,000만원 · 입금 확인',
  },
  {
    brand: '클리어디어',
    detail: '계획안 착수',
    eta: '입금 지연',
    pct: 10,
    note: '1,000만원 · 입금 지연',
  },
  {
    brand: 'Troubleless',
    detail: '가이드 착수',
    eta: '입금 지연',
    pct: 10,
    note: '1,000만원 · 입금 지연',
  },
  {
    brand: 'UIQ',
    detail: '진행 대기',
    eta: '대기',
    pct: 0,
    note: '1,000만원 · 입금 지연',
  },
]

export const MATCH_PREP: MatchItem[] = [
  {
    brand: '닥터 리앤장',
    detail: '약사 3 · 메가 6 · 미들 5',
    done: 0,
    total: 14,
    note: '가이드 확정 후 매칭',
    eta: '9월 목표',
  },
  {
    brand: '클리어디어',
    detail: '약사 4 · 메가 1 · 미들 1',
    done: 0,
    total: 6,
    note: '계약서 전달·확정 후 매칭',
    eta: '9월 목표',
  },
]

/** 온보딩·계약 검토 중 */
export const REVIEW_BRANDS: PipelineBrand[] = [
  {
    name: '해브블루',
    desc: '온보딩 진행',
    budget: '2,000–3,000만원 예상',
    tier: 'mid',
    stage: 1,
    stageLabel: '온보딩 예정',
    eta: '일정 조율 중',
  },
  {
    name: '달바',
    desc: '온보딩 예정',
    budget: '3,000만원 예상',
    tier: 'mid',
    stage: 1,
    stageLabel: '온보딩 예정',
    eta: '일정 조율 중',
  },
  {
    name: '리포데이',
    desc: '매월 1,000만원',
    budget: '1,000만원/월',
    tier: 'small',
    stage: 1,
    stageLabel: '협의중',
    eta: '협의중',
  },
  {
    name: '스킨스탠다드',
    desc: '10월 마케팅 논의',
    budget: '1,100만원',
    tier: 'small',
    stage: 1,
    stageLabel: '협의중',
    eta: '협의중',
  },
  {
    name: '토코보',
    desc: 'Tocobo',
    budget: '협의중',
    tier: 'small',
    stage: 1,
    stageLabel: '협의중',
    eta: '협의중',
  },
]

/** 입점 9월 중 · 마케팅 10월 순차 진행 */
export const OCTOBER_BRANDS: PipelineBrand[] = []

/** @deprecated REVIEW_BRANDS + OCTOBER_BRANDS 사용 */
export const PIPELINE_BRANDS: PipelineBrand[] = [...REVIEW_BRANDS, ...OCTOBER_BRANDS]

export const LEAD_RANGE = { min: 14, max: 20, typical: 16 }

export type PipelineCatStage = 'delivering' | 'prep'

export function pipelineCatStage(brand: ContractBrand): PipelineCatStage {
  return brand.contractCompletedOn ? 'prep' : 'delivering'
}

/** 계약 완료일 00:00 기준 경과 일수 (완료 당일 = 0) */
export function daysSinceContractComplete(completedOn: string, asOf = new Date()): number {
  const [y, m, d] = completedOn.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const end = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000))
}

/** 계약 완료 이후 가이드·매칭 구간 진행률 — 경과일 ÷ 예상 소요일 */
export function contractPrepProgress(
  completedOn: string,
  totalDays: number,
  asOf = new Date(),
): number {
  if (totalDays <= 0) return 0
  const elapsed = daysSinceContractComplete(completedOn, asOf)
  return Math.min(100, Math.round((elapsed / totalDays) * 100))
}

export function formatContractDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

/** "TeloAct 1차" → "TeloAct" — 콘텐츠 필터·회원사 매칭용 */
export function pipelineContentBrand(label: string): string {
  return label.replace(/\s+\d+차$/, '').trim()
}

export function matchesPartnerBrand(label: string, partnerBrand: string): boolean {
  return label === partnerBrand || pipelineContentBrand(label) === partnerBrand
}

export const BUDGET_DISCLAIMER =
  '위 예산은 내부 전략 및 논의 과정에 따라 조정될 수 있으며, 가이드라인 확정 및 인플루언서 매칭 단계에서 최종 예산이 집행됩니다.'

export const MARKETING_NOTE =
  '추가 예산 집행 시 발행량 및 PPL 채우기 작업이 원활해질 것으로 예상됩니다.'
