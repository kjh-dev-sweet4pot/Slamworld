export type BrandTier = 'large' | 'mid' | 'small'
export type PipelineStage = 1 | 2 | 3 | 4

export interface ContractBrand {
  name: string
  budget: string
  meta: string
  days: number
  status: string
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
    name: '옵티팜',
    budget: '4,000만원',
    meta: '미입금 · 진행 예정 · 가이드 작성 중',
    days: 16,
    status: '9월 마케팅 목표',
    segs: [5, 2, 5, 2, 2],
  },
  {
    name: '닥터 리앤장',
    budget: '3,000만원',
    meta: '입금 완료 · 8/31 가이드 전달 예정',
    days: 15,
    status: '9월 마케팅 목표',
    segs: [4, 2, 4, 3, 2],
  },
  {
    name: '클리어디어',
    budget: '1,000만원',
    meta: '입금 완료 · 계획안·견적 진행',
    days: 14,
    status: '9월 마케팅 목표',
    segs: [4, 2, 4, 2, 2],
  },
  {
    name: 'Rxme',
    budget: '미확인',
    meta: '미입금 · 8/31 원브랜디드 가이드 예정',
    days: 14,
    status: '9월 마케팅 목표',
    segs: [4, 2, 4, 2, 2],
  },
]

/** 8월 말 가이드 확정 → 9월 초 방문 시작 */
export const COMMON_TIMELINE: TimelineMilestone[] = [
  {
    date: '~ 8.31 (월)',
    title: '가이드라인 전달',
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
    date: '목표',
    title: '발행 54건',
    detail: '명동 80% · 북촌 20%',
  },
]

/** 9월 마케팅 타겟 — 브랜드별 상세 현황 */
export const SEPTEMBER_BRAND_STATUS: BrandStatusItem[] = [
  {
    brand: '닥터리앤장',
    status: 'PPL 컨셉안 전달 완료 · 8/31(월) PPL 가이드라인 전달 예정',
    pct: 75,
  },
  {
    brand: '리앤장',
    status: 'PPL 컨셉안 전달 완료 · 8/31(월) PPL + 원브랜디드 가이드 전달 예정',
    pct: 70,
  },
  {
    brand: '옵티팜',
    status: '마케팅팀과 가이드라인 작성 중',
    pct: 40,
  },
  {
    brand: '클리어디어',
    status: '마케팅 계획안 작성 중 · 견적서 전달',
    pct: 35,
  },
  {
    brand: 'Rxme',
    status: '8/31까지 원브랜디드 영상 가이드 제작·전달 예정',
    pct: 55,
  },
]

export const GUIDE_PREP: PrepItem[] = [
  {
    brand: '해브블루',
    detail: 'PPL 컨셉 4종 + Rxme 원브랜디드',
    eta: '8.31 전달',
    pct: 80,
    note: '공통 타임라인 · 방문 리스트 동시 전달',
  },
  {
    brand: '닥터리앤장',
    detail: 'PPL 가이드라인',
    eta: '8.31 (월)',
    pct: 75,
    note: '컨셉안 전달 완료',
  },
  {
    brand: '리앤장',
    detail: 'PPL + 원브랜디드 가이드',
    eta: '8.31 (월)',
    pct: 70,
    note: '컨셉안 전달 완료',
  },
  {
    brand: 'Rxme',
    detail: '원브랜디드 영상 가이드',
    eta: '8.31',
    pct: 55,
    note: '미입금 · 진행 예정',
  },
  {
    brand: '옵티팜',
    detail: '마케팅팀과 가이드라인 작성',
    eta: '작성 중',
    pct: 40,
    note: '4,000만원',
  },
  {
    brand: '클리어디어',
    detail: '마케팅 계획안 · 견적서',
    eta: '견적 전달',
    pct: 35,
    note: '1,000만원 · 입금 완료',
  },
]

export const MATCH_PREP: MatchItem[] = [
  {
    brand: '해브블루',
    detail: '명동 80% · 북촌 20%',
    done: 0,
    total: 54,
    note: '9/4 영미·중화 2차 리스트 · 9/6 방문 시작',
    eta: '09.06 첫 방문',
  },
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
    note: '계획안·견적 확정 후 매칭',
    eta: '9월 목표',
  },
]

/** 온보딩·계약 검토 중 */
export const REVIEW_BRANDS: PipelineBrand[] = [
  {
    name: '해브블루',
    desc: '온보딩 진행 · 공통 타임라인(9/6 방문) 연계',
    budget: '2,000–3,000만원',
    tier: 'large',
    stage: 2,
    stageLabel: '가이드·매칭 준비',
    eta: '9/6 방문 목표',
  },
  {
    name: '달바',
    desc: '온보딩 예정',
    budget: '미확인',
    tier: 'small',
    stage: 1,
    stageLabel: '온보딩 예정',
    eta: '일정 조율 중',
  },
]

/** 입점 9월 중 · 마케팅 10월 순차 진행 */
export const OCTOBER_BRANDS: PipelineBrand[] = [
  {
    name: '스킨스탠다드',
    desc: '입점 절차 우선 · 마케팅 10월 조정',
    budget: '1,100만원',
    tier: 'mid',
    stage: 2,
    stageLabel: '10월 진행 예정',
    eta: '10월 마케팅',
  },
  {
    name: '부스티온',
    desc: '입점 절차 우선 · 마케팅 10월 조정',
    budget: '미확인',
    tier: 'small',
    stage: 2,
    stageLabel: '10월 진행 예정',
    eta: '10월 마케팅',
  },
  {
    name: '나인위시스',
    desc: '입점 절차 우선 · 마케팅 10월 조정',
    budget: '미확인',
    tier: 'small',
    stage: 2,
    stageLabel: '10월 진행 예정',
    eta: '10월 마케팅',
  },
]

/** @deprecated REVIEW_BRANDS + OCTOBER_BRANDS 사용 */
export const PIPELINE_BRANDS: PipelineBrand[] = [...REVIEW_BRANDS, ...OCTOBER_BRANDS]

export const LEAD_RANGE = { min: 14, max: 20, typical: 16 }

export const BUDGET_DISCLAIMER =
  '위 예산은 내부 전략 및 논의 과정에 따라 조정될 수 있으며, 가이드라인 확정 및 인플루언서 매칭 단계에서 최종 예산이 집행됩니다.'

export const MARKETING_NOTE =
  '추가 예산 집행 시 발행량 및 PPL 채우기 작업이 원활해질 것으로 예상됩니다.'
