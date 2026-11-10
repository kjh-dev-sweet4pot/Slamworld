/** 모바일용 짧은 기간 라벨. 잘못된 입력이면 빈 문자열 */

export type PeriodMode = 'all' | 'month' | 'week'

type Ymd = { y: number; m: number; d: number; key: string }

function parse(s: string): Ymd | null {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '')
  if (!r) return null
  const [y, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])]
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return { y, m, d, key: s }
}

const yy = (y: number) => String(y % 100).padStart(2, '0')

export function shortPeriodLabel(range: [string, string], mode: PeriodMode): string {
  const a = parse(range?.[0])
  const b = parse(range?.[1])
  if (!a || !b || a.key > b.key) return ''
  if (mode === 'month') return `${yy(a.y)}.${a.m}월`
  if (mode === 'all') return `${yy(a.y)}.${a.m}~${yy(b.y)}.${b.m}`
  if (a.y !== b.y) return `${yy(a.y)}.${a.m}/${a.d}~${yy(b.y)}.${b.m}/${b.d}`
  if (a.m !== b.m) return `${a.m}/${a.d}~${b.m}/${b.d}`
  return `${a.m}/${a.d}~${b.d}`
}
