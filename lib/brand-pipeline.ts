export type BrandTier = 'large' | 'mid' | 'small'
export type PipelineStage = 1 | 2 | 3 | 4

export interface ContractBrand {
  name: string
  budget: string
  meta: string
  days: number
  status: string
  /** 14~20일 구간 안 단계 비중 (합 14~20) */
  segs: [number, number, number, number, number]
}

export interface PrepItem {
  brand: string
  detail: string
  eta: string
  pct: number
  note: string
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

/** 계약·온보딩 확정 (예산 큰 순) */
export const CONTRACT_BRANDS: ContractBrand[] = [
  {
    name: '옵티팜',
    budget: '4,000만원',
    meta: '견적 확정 · 가이드라인 작성 중',
    days: 16,
    status: '마케팅팀과 가이드라인 작성 중',
    segs: [5, 2, 5, 2, 2],
  },
  {
    name: '닥터 리앤장',
    budget: '3,000만원',
    meta: 'PPL 컨셉안 전달 완료 · 월요일 PPL + 원브랜디드 가이드 예정',
    days: 15,
    status: '약사 3 · 메가 6 · 미들 5',
    segs: [4, 2, 4, 3, 2],
  },
  {
    name: '해브블루',
    budget: '2,000–3,000만원',
    meta: '진행 확정 · 온보딩 준비 · 내일 공유',
    days: 18,
    status: '9/6 방문 시작 · 발행 목표 54건',
    segs: [5, 2, 4, 4, 3],
  },
  {
    name: '스킨스탠다드',
    budget: '1,100만원',
    meta: '500만원 → 1,100만원으로 진행',
    days: 14,
    status: '브랜드사 예산 편성 완료',
    segs: [4, 2, 4, 2, 2],
  },
]

export const GUIDE_PREP: PrepItem[] = [
  {
    brand: '해브블루',
    detail: 'PPL 컨셉 4종 + rxme 원브랜디드',
    eta: '08.31 전달',
    pct: 80,
    note: '가이드라인 제작 · 방문 리스트 동시 전달',
  },
  {
    brand: '닥터 리앤장',
    detail: 'PPL + 원브랜디드 가이드라인',
    eta: '월요일 전달',
    pct: 70,
    note: '컨셉안 전달 완료 · 3,000만원',
  },
  {
    brand: '옵티팜',
    detail: '마케팅팀과 가이드라인 작성',
    eta: '작성 중',
    pct: 40,
    note: '4,000만원 견적 확정',
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
    detail: '중국 3 · 미국 3 · 미들 5',
    done: 0,
    total: 14,
    note: '약사 3 + 메가 6 + 미들 5 (플랜)',
    eta: '가이드 확정 후 매칭',
  },
  {
    brand: '클리어디어',
    detail: '약사 4 · 메가 1 · 미들 1',
    done: 0,
    total: 6,
    note: '견적·계획안 확정 후 매칭',
    eta: '견적 전달 예정',
  },
]

/** 매출(예산) 큰 순. 해브블루는 확정이라 계약 섹션에 두고, 여기엔 미계약만 */
export const PIPELINE_BRANDS: PipelineBrand[] = [
  {
    name: '클리어디어',
    desc: '마케팅 계획안 작성 중 · 견적서 전달 예정',
    budget: '1,000만원',
    tier: 'mid',
    stage: 3,
    stageLabel: '견적 전달 예정',
    eta: '약사 4 · 미국 메가 1 · 미들 1',
  },
]

export const LEAD_RANGE = { min: 14, max: 20, typical: 16 }
