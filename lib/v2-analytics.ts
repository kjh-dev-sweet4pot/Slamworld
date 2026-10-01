import { inPerformanceMonth } from './posted-date'
import type { Content, Channel, ContentFormat } from '@/lib/types'
import { contentViews } from '@/lib/content-views'
import { classifyContentFormat } from '@/lib/content-format'
import aggJson from '@/data/agg.json'

export const V2_LOC_COLORS: Record<string, string> = {
  '명동점': '#e03131',
  '이태원점': '#1f2f8f',
  '남포점': '#4dd0e1',
  '신사점': '#f97316',
  '성수점': '#8b2fd6',
  '북촌점': '#1a73e8',
  '강남점': '#6b4423',
  '종각점': '#f5c142',
}

/** 데이터 입력 시 '점' 접미사가 누락된 지점명 보정 (예: '명동' → '명동점') */
export function normalizeLocationName(loc: string | null | undefined): string {
  if (!loc) return ''
  if (V2_LOC_COLORS[loc]) return loc
  const withSuffix = `${loc}점`
  return V2_LOC_COLORS[withSuffix] ? withSuffix : loc
}

export const V2_CH_COLORS: Record<string, string> = {
  '샤오홍슈': '#e03131',
  '인스타그램': '#8b5cf6',
  '틱톡': '#06b6d4',
  '도우인': '#9ca3af',
  '웨이보': '#c7cbd1',
}

export const V2_LOC_META: Record<string, { tag: string; highlight: string; highlightColor?: string }> = {
  '명동점': { tag: '8/11 오픈', highlight: '기자단 100', highlightColor: '#e03131' },
  '이태원점': { tag: '3–6월', highlight: '4개월 연속', highlightColor: '#2f5fd8' },
  '남포점': { tag: '8월 오픈', highlight: '기자단 40', highlightColor: '#e03131' },
  '신사점': { tag: '6월 메가', highlight: '건당 10.2만', highlightColor: '#f97316' },
  '성수점': { tag: '4–6월', highlight: '3개월 연속', highlightColor: '#2f5fd8' },
  '북촌점': { tag: '6–7월', highlight: '업로드 100%', highlightColor: '#6b6558' },
  '강남점': { tag: '6월', highlight: '업로드 100%', highlightColor: '#6b6558' },
  '종각점': { tag: '6월', highlight: '4건 완료', highlightColor: '#f5c142' },
}

export interface V2FeedItem {
  date: string
  badge: string
  badgeBg: string
  badgeColor: string
  borderColor: string
  textHtml: string
}

export const V2_DEFAULT_LIVE_FEED: V2FeedItem[] = [
  {
    date: '8/11 오픈',
    badge: '폭증',
    badgeBg: '#fee2e2',
    badgeColor: '#b42318',
    borderColor: '#e03131',
    textHtml: '<b>명동점</b> 하루 125건 동시 집행 · 기자단 100명 포함 ⚡',
  },
  {
    date: '8/11 오픈',
    badge: '폭증',
    badgeBg: '#fee2e2',
    badgeColor: '#b42318',
    borderColor: '#e03131',
    textHtml: '<b>남포점</b> 47건 · 저장 2,382건으로 전 지점 1위 📈',
  },
  {
    date: '6/25',
    badge: '급부상',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    borderColor: '#f59e0b',
    textHtml: '<b>pada_heli</b> 20만 조회 · 단일 콘텐츠 최고 기록 🔺',
  },
  {
    date: '6/25',
    badge: '급부상',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    borderColor: '#f59e0b',
    textHtml: '<b>신사점</b> 메가 4명으로 월 조회 50.9만 · 건당 10.2만',
  },
  {
    date: '8월 마감',
    badge: '월페이스',
    badgeBg: '#dcfce7',
    badgeColor: '#166534',
    borderColor: '#22c55e',
    textHtml: '8월 업로드 <b>172건</b> · 6개월 누적의 52% 집중 📈',
  },
  {
    date: '8월 마감',
    badge: '월페이스',
    badgeBg: '#dcfce7',
    badgeColor: '#166534',
    borderColor: '#22c55e',
    textHtml: '샤오홍슈 <b>166건</b> · 전월 29건 대비 5.7배',
  },
  {
    date: '누적',
    badge: '기록',
    badgeBg: '#dbeafe',
    badgeColor: '#1e40af',
    borderColor: '#4f7cff',
    textHtml: '발행률 <b>98.5%</b> · 331건 중 326건 업로드 완료',
  },
  {
    date: '누적',
    badge: '기록',
    badgeBg: '#dbeafe',
    badgeColor: '#1e40af',
    borderColor: '#4f7cff',
    textHtml: '방문 인플루언서 <b>241명</b> · 8개 지점 6개월',
  },
  {
    date: '7월',
    badge: '준비',
    badgeBg: '#f3f4f6',
    badgeColor: '#4b5563',
    borderColor: '#9ca3af',
    textHtml: '오픈 준비 기간 4건 · 명동·남포 사전 세팅',
  },
]

export function getAggBaseline() {
  return aggJson
}

export function getFallbackContents(): Content[] {
  return (aggJson.topViews || []).map((item, idx) => ({
    id: idx + 1,
    influencer_name: item.name,
    sns_id: item.sns,
    channel: item.ch as Channel,
    location: item.loc,
    campaign: item.camp,
    views: item.views,
    views_estimated: item.measured ? null : item.views,
    views_est_low: null,
    views_est_high: null,
    views_source: item.measured ? 'measured' : 'estimated',
    likes: item.likes,
    saves: item.saves,
    comments: item.comments,
    upload_url: item.url,
    visit_date: item.visit,
    brands: item.brands,
    product: item.product,
    follower_count: null,
    target_audience: item.product,
    is_press: false,
    profile_url: null,
  }))
}

/** 8개 지점 순서 고정 */
export const V2_ORDERED_LOCATIONS = [
  '명동점',
  '이태원점',
  '남포점',
  '신사점',
  '성수점',
  '북촌점',
  '강남점',
  '종각점',
]

/** 6개 분석 월 (당월 포함 최근 6개월) */
export const V2_MONTHS = (() => {
  const now = new Date()
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
})()

export function formatViews(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`
  return n.toLocaleString()
}

export function isGreaterChina(channel: string): boolean {
  return channel === '샤오홍슈' || channel === '도우인' || channel === '웨이보'
}

/** 차트 x축 구간 — 전체 모드는 6개월, 월별 모드는 해당 월의 주차(1–7일, 8–14일 …) */
export interface V2TimeBucket {
  key: string
  label: string
  /** 툴팁용 상세 라벨 (예: '8/1–8/7') */
  detail: string
  match: (visitDate: string | null | undefined) => boolean
}

export function v2TimeBuckets(mode: 'all' | 'monthly', month: string): V2TimeBucket[] {
  if (mode === 'all') {
    return V2_MONTHS.map(m => ({
      key: m,
      label: `${Number(m.slice(5))}월`,
      detail: m.replace('-', '.'),
      match: d => inPerformanceMonth(d, m),
    }))
  }

  const [y, mo] = month.split('-').map(Number)
  const daysInMonth = new Date(y, mo, 0).getDate()
  const buckets: V2TimeBucket[] = []
  // 전월 20일~말일 누적분
  const pd = new Date(y, mo - 2, 1)
  const prev = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}`
  const prevDays = new Date(y, mo - 1, 0).getDate()
  buckets.push({
    key: `${month}-prev`,
    label: `${pd.getMonth() + 1}월 말`,
    detail: `${pd.getMonth() + 1}/20–${pd.getMonth() + 1}/${prevDays}`,
    match: d => !!d?.startsWith(prev) && d.slice(8, 10) >= '20',
  })
  for (let start = 1; start <= daysInMonth; start += 7) {
    const end = Math.min(start + 6, daysInMonth)
    const week = buckets.length
    buckets.push({
      key: `${month}-w${week}`,
      label: `${week}주`,
      detail: `${mo}/${start}–${mo}/${end}`,
      match: d => {
        if (!d?.startsWith(month)) return false
        const day = Number(d.slice(8, 10))
        return day >= start && day <= end
      },
    })
  }
  return buckets
}
