// 달력 칸·주간 합계 — 날짜는 'YYYY-MM-DD' 문자열로만 다룬다 (시간대 영향 없음, lib/week.ts 참고)

const pad = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM' 달의 달력 칸 (월요일 시작, 앞뒤 다른 달은 null, 7의 배수) */
export function monthCells(ym: string): (string | null)[] {
  const [y, m] = ym.split('-').map(Number)
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${ym}-${pad(i + 1)}`)]
  while (cells.length % 7) cells.push(null)
  return cells
}

export type DayStat = { date: string | null; visits: number; done: number; views: number }
export type WeekTotal = { start: string | null; end: string | null; visits: number; done: number; views: number }

/** 7칸씩 끊어 주별 합계 — date 가 null(다른 달) 인 칸은 빼고 더한다 */
export function weekTotals(days: DayStat[]): WeekTotal[] {
  const out: WeekTotal[] = []
  for (let i = 0; i < days.length; i += 7) {
    const wk = days.slice(i, i + 7).filter(d => d.date)
    out.push({
      start: wk[0]?.date ?? null,
      end: wk[wk.length - 1]?.date ?? null,
      visits: wk.reduce((a, d) => a + d.visits, 0),
      done: wk.reduce((a, d) => a + d.done, 0),
      views: wk.reduce((a, d) => a + d.views, 0),
    })
  }
  return out
}
