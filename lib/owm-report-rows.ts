import type { ReportRow } from './owm-report'

/** 이 글자 수를 넘으면 말줄임 표시 */
export const LONG_TEXT = 20

export interface MobileRow {
  visitDate: string
  store: string
  handle: string
  url: string | null
  postedDate: string
  views: string
  handleLong: boolean
  storeLong: boolean
}

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v : '-')

/** 리포트 행 → 모바일 카드 표시용 */
export function toMobileRows(rows: readonly Partial<ReportRow>[] | null | undefined): MobileRow[] {
  return (rows ?? []).map(r => {
    const store = text(r.store)
    const handle = text(r.handle)
    return {
      visitDate: text(r.visit_date),
      store,
      handle,
      url: r.url || null,
      postedDate: text(r.posted_date),
      views: typeof r.views === 'number' && Number.isFinite(r.views) ? r.views.toLocaleString('ko-KR') : '-',
      handleLong: handle.length > LONG_TEXT,
      storeLong: store.length > LONG_TEXT,
    }
  })
}
