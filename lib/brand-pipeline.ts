export type BrandTier = 'large' | 'mid' | 'small'
/** 협의중 → 계약 완료 → 입금 완료 → 캠페인 진행중 → 캠페인 종료 */
export type PipelineStage = 1 | 2 | 3 | 4 | 5

export const CONTRACT_STAGES = [
  '협의중',
  '계약 완료',
  '입금 완료',
  '캠페인 진행중',
  '캠페인 종료',
] as const

export type ContractStageLabel = (typeof CONTRACT_STAGES)[number]

export interface ContractBrand {
  name: string
  budget: string
  meta: string
  days: number
  status: string
  /** 현재 contract stage (1–5) */
  stage: PipelineStage
  /** 계약 완료일 (YYYY-MM-DD). 있으면 계약 완료 칸에 표시 */
  contractCompletedOn?: string
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
    stage: 5,
    contractCompletedOn: '2026-07-10',
  },
  {
    name: 'TeloAct 2차',
    budget: '6,500만원',
    meta: '사용 예정 · 입금 지연',
    days: 16,
    status: '2차 준비',
    stage: 2,
  },
  {
    name: '옵티팜',
    budget: '4,000만원',
    meta: '8월 2,000 사용 · 9월 2,000 가용',
    days: 16,
    status: '9월 마케팅 목표',
    stage: 4,
  },
  {
    name: '닥터 리앤장',
    budget: '3,000만원',
    meta: '8월 1,000 사용 · 9월 2,000 가용',
    days: 15,
    status: '9월 마케팅 목표',
    stage: 4,
    contractCompletedOn: '2026-08-30',
  },
  {
    name: '클리어디어',
    budget: '1,000만원',
    meta: '사용 예정 · 입금 지연',
    days: 14,
    status: '마케팅 준비',
    stage: 2,
  },
  {
    name: 'Rxme',
    budget: '1,000만원',
    meta: '1,000만원 · 9월 가용',
    days: 14,
    status: '9월 마케팅 목표',
    stage: 4,
    contractCompletedOn: '2026-08-31',
  },
]

export const COMMON_TIMELINE: TimelineMilestone[] = [
  {
    date: '',
    title: '초기 가이드라인 전달',
    detail: '컨셉 4종 PPL + Rxme 원브랜디드 영상 가이드 제작·전달',
  },
  {
    date: '',
    title: '2차 리스트',
    detail: '영미권·중화권 인플루언서 2차 리스트 전달',
  },
  {
    date: '',
    title: '방문 시작',
    detail: '가장 빠른 인플루언서 기준 방문 마케팅 시작',
  },
  {
    date: '이번달 목표',
    title: '발행 150건',
    detail: '',
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
    status: '사용 예정 · 6,500만 · 입금 지연',
    pct: 0,
  },
  {
    brand: '닥터 리앤장',
    status: '8월 1,000 사용 · 9월 2,000 가용',
    pct: 75,
  },
  {
    brand: '옵티팜',
    status: '8월 2,000 사용 · 9월 2,000 가용',
    pct: 12,
  },
  {
    brand: '클리어디어',
    status: '사용 예정 · 1,000만 · 입금 지연',
    pct: 0,
  },
  {
    brand: 'Rxme',
    status: '1,000만원 · 9월 가용',
    pct: 55,
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
    note: '6,500만원 · 입금 지연',
  },
  {
    brand: '닥터 리앤장',
    detail: 'PPL + 원브랜디드 가이드',
    eta: '8.31 (월)',
    pct: 75,
    note: '8월 1,000 사용 · 9월 2,000 가용',
  },
  {
    brand: 'Rxme',
    detail: '원브랜디드 영상 가이드',
    eta: '제작 중',
    pct: 55,
    note: '1,000만원 · 9월 가용',
  },
  {
    brand: '옵티팜',
    detail: '가이드 착수',
    eta: '가이드 대기',
    pct: 10,
    note: '8월 2,000 사용 · 9월 2,000 가용',
  },
  {
    brand: '클리어디어',
    detail: '계획안 착수',
    eta: '사용 예정',
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
    note: '입금 지연 · 계약 확정 후 매칭',
    eta: '9월 목표',
  },
]

/** 온보딩·계약 검토 중 */
export const REVIEW_BRANDS: PipelineBrand[] = [
  {
    name: 'UIQ',
    desc: '유이크',
    budget: '예산 협의중',
    tier: 'small',
    stage: 1,
    stageLabel: '협의중',
    eta: '예산 협의중',
  },
  {
    name: 'Troubleless',
    desc: '트러블레스',
    budget: '예산 협의중',
    tier: 'small',
    stage: 1,
    stageLabel: '협의중',
    eta: '예산 협의중',
  },
  {
    name: '헤브블루',
    desc: '온보딩 진행',
    budget: '예산 협의중',
    tier: 'mid',
    stage: 1,
    stageLabel: '협의중',
    eta: '예산 협의중',
  },
  {
    name: '달바',
    desc: '온보딩 예정',
    budget: '3,000만원 예상',
    tier: 'mid',
    stage: 1,
    stageLabel: '협의중',
    eta: '일정 조율 중',
  },
  {
    name: '리포데이',
    desc: '협의중',
    budget: '예산 협의중',
    tier: 'small',
    stage: 1,
    stageLabel: '협의중',
    eta: '예산 협의중',
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
    budget: '예산 협의중',
    tier: 'small',
    stage: 1,
    stageLabel: '협의중',
    eta: '예산 협의중',
  },
]

/** 입점 9월 중 · 마케팅 10월 순차 진행 */
export const OCTOBER_BRANDS: PipelineBrand[] = []

/** @deprecated REVIEW_BRANDS + OCTOBER_BRANDS 사용 */
export const PIPELINE_BRANDS: PipelineBrand[] = [...REVIEW_BRANDS, ...OCTOBER_BRANDS]

export const LEAD_RANGE = { min: 14, max: 20, typical: 16 }

export function contractStageLabel(stage: PipelineStage): ContractStageLabel {
  return CONTRACT_STAGES[stage - 1]
}

/** 다음 단계 라벨. 종료(5)면 null. */
export function nextContractStageLabel(stage: PipelineStage): ContractStageLabel | null {
  if (stage === 5) return null
  return CONTRACT_STAGES[stage]
}

/**
 * 보딩패스 contract_stage / 입금 상태 → 화면 5단계.
 * 입금 지연은 계약 완료(입금 대기). 입금 완료·캠페인 진행중 → 4.
 */
export function pipelineStageFromContract(raw: string | null | undefined): PipelineStage {
  const s = String(raw || '').trim()
  if (s === '캠페인 종료' || s === '종료' || s === '캠페인 진행 완료') return 5
  if (s === '캠페인 진행중' || s === '입금 완료') return s === '입금 완료' ? 3 : 4
  if (s === '계약 완료' || s === '입금 지연') return 2
  return 1
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

if (process.env.NODE_ENV !== 'production') {
  if (pipelineStageFromContract('협의중') !== 1) throw new Error('stage 협의중')
  if (pipelineStageFromContract('입금 지연') !== 2) throw new Error('stage 입금 지연')
  if (pipelineStageFromContract('입금 완료') !== 3) throw new Error('stage 입금 완료')
  if (pipelineStageFromContract('캠페인 진행중') !== 4) throw new Error('stage 캠페인 진행중')
  if (pipelineStageFromContract('종료') !== 5) throw new Error('stage 종료')
  if (contractStageLabel(4) !== '캠페인 진행중') throw new Error('label')
  if (nextContractStageLabel(4) !== '캠페인 종료') throw new Error('next')
  if (nextContractStageLabel(5) !== null) throw new Error('next end')
}