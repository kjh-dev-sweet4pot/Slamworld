/** Live 뉴스 피드 — 브랜드·예산 요약 */
export interface FeedItem {
  time: string
  badge: string
  badgeClass: string
  headline: string
  detail: string
  accent?: 'up' | 'down' | 'neutral'
}

export const LIVE_FEED: FeedItem[] = [
  {
    time: '9/3 11:00',
    badge: '입금',
    badgeClass: 'bg-[#ecfdf5] text-[#16a34a]',
    headline: '옵티팜 입금 확인',
    detail: '4,000만원 · 계약서 전달 중',
    accent: 'up',
  },
  {
    time: '9/3 10:00',
    badge: '예산',
    badgeClass: 'bg-[#eef3ff] text-[#4f8cff]',
    headline: 'Troubleless 9월 확정',
    detail: '1,000만원 · 송금 대기',
    accent: 'up',
  },
  {
    time: '8/31 14:00',
    badge: '예산',
    badgeClass: 'bg-[#eef3ff] text-[#4f8cff]',
    headline: '확보 예산 9,000만원',
    detail: '옵티팜·닥터 리앤장·클리어디어·Rxme 계약 확정',
    accent: 'up',
  },
  {
    time: '8/31 11:00',
    badge: '입금',
    badgeClass: 'bg-[#ecfdf5] text-[#16a34a]',
    headline: 'Rxme 입금 확인',
    detail: '1,000만원 · 원브랜디드 가이드 제작 중',
    accent: 'neutral',
  },
  {
    time: '8/30 18:00',
    badge: '입금',
    badgeClass: 'bg-[#ecfdf5] text-[#16a34a]',
    headline: '닥터 리앤장 입금 확인',
    detail: '3,000만원 · PPL 컨셉안 전달 완료 · 가이드 제작 중',
    accent: 'neutral',
  },
  {
    time: '8/30 15:00',
    badge: '일정',
    badgeClass: 'bg-[#f3e8ff] text-[#7c3aed]',
    headline: '9/6 방문 마케팅 시작',
    detail: '목표 발행 54건 · 명동 80% · 북촌 20%',
    accent: 'up',
  },
  {
    time: '8/28 10:00',
    badge: '검토',
    badgeClass: 'bg-[#f0f2f7] text-[#6b728a]',
    headline: '해브블루·Re4day 계약 예정·검토',
    detail: '온보딩 진행 · 예산 미확인',
    accent: 'neutral',
  },
  {
    time: '8/28 09:00',
    badge: '성과',
    badgeClass: 'bg-[#fce7f3] text-[#db2777]',
    headline: '명동 오픈 캠페인 반영',
    detail: '8월 업로드 122건 · 샤오홍슈 역산 조회수 반영',
    accent: 'up',
  },
]

export const LOC_COLOR: Record<string, string> = {
  '명동점': '#D42111',
  '북촌점': '#0B63FF',
  '남포점': '#62D6F7',
  '신사점': '#FF8B00',
  '이태원점': '#082E99',
  '성수점': '#8000D3',
  '종각점': '#F3BA02',
  '강남점': '#7A4723',
}

export const LOC_EMOJI: Record<string, string> = {
  '명동점': '🌆',
  '북촌점': '🏘️',
  '남포점': '🌊',
  '신사점': '🛍️',
  '이태원점': '🌍',
  '성수점': '☕',
  '종각점': '🏛️',
  '강남점': '🏙️',
}

export const RANK_ACCENTS = ['#f59e0b', '#4f8cff', '#b45309']
