/**
 * 요청사항 카드 (브랜드사·OWM 요청 → 실행 현황).
 * ⚠ 대표 정리본 받기 전 샘플. 확정되면 SAMPLE=false 로 바꾸고 내용 교체.
 * handles = 프로필 URL 뒤쪽 영문·숫자 핸들 (한자 X)
 */
export const REQUEST_CARDS_SAMPLE = true

export type RequestStatus = '접수' | '진행중' | '완료'

export interface RequestCard {
  id: string
  title: string
  requester: string
  status: RequestStatus
  note?: string
  /** 방문 예정 인플루언서 핸들 — 있으면 무상 시딩 체크 리스트 표시 */
  handles?: string[]
}

export const REQUEST_CARDS: RequestCard[] = [
  {
    id: 'itaewon-fashion-seeding',
    title: '이태원 지점 무상 시딩 · 패션 인플루언서 모집',
    requester: 'OWM',
    status: '진행중',
    handles: ['sample_fashion01', 'sample_style_kr', 'sample_ootd22'],
  },
  {
    id: 'bukchon-seeding',
    title: '북촌 지점 무상 시딩',
    requester: 'OWM',
    status: '접수',
    handles: ['sample_hanok_trip', 'sample_seoulwalk'],
  },
]
