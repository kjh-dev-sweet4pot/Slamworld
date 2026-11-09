/** 주간 보기 — 월요일 시작 ISO 주. 주의 목요일이 속한 달·연도로 「~월 ~주」와 「~년 ~주차」를 정한다 */

export interface WeekInfo {
  /** 월요일 YYYY-MM-DD */
  start: string
  /** 일요일 YYYY-MM-DD */
  end: string
  /** 목요일 기준 월 YYYY-MM */
  month: string
  /** 그 달의 몇째 주 */
  weekOfMonth: number
  /** ISO 연도 */
  isoYear: number
  /** ISO 주차 */
  isoWeek: number
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7))
  return m
}

function infoOf(monday: Date): WeekInfo {
  const thu = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3)
  const sun = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  const isoYear = thu.getFullYear()
  const jan4 = new Date(isoYear, 0, 4)
  const isoWeek = Math.round((monday.getTime() - mondayOf(jan4).getTime()) / (7 * 864e5)) + 1
  return {
    start: ymd(monday),
    end: ymd(sun),
    month: ymd(thu).slice(0, 7),
    weekOfMonth: Math.ceil(thu.getDate() / 7),
    isoYear,
    isoWeek,
  }
}

/** fromMonth(YYYY-MM) 이 속한 주부터 오늘이 속한 주까지 */
export function weeksSince(fromMonth: string): WeekInfo[] {
  const [y, m] = fromMonth.split('-').map(Number)
  const end = mondayOf(new Date())
  const out: WeekInfo[] = []
  for (let d = mondayOf(new Date(y, m - 1, 1)); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) {
    out.push(infoOf(d))
  }
  return out
}

/** 10월 2주 (26년 41주차) */
export function weekLabel(w: WeekInfo): string {
  return `${Number(w.month.slice(5))}월 ${w.weekOfMonth}주 (${String(w.isoYear).slice(2)}년 ${w.isoWeek}주차)`
}

export function inWeek(date: string | null | undefined, w: WeekInfo): boolean {
  return !!date && date >= w.start && date <= w.end
}
