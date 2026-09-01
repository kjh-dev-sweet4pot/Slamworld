/** 성과순 상단 — 명동 오픈 본시트 + 인스타 핵심 */
export const PERF_PINNED = [
  '娜美Nami',
  '不吃酥饼',
  '予乐',
  'luna_pro_beauty',
  'dk_a_life',
  'erica.scoro',
  'lolahouques',
  'ariluxbloom',
] as const

/** 8월 월별 상단 — 명동 + 남포 오픈 핵심 */
export const AUGUST_2026_PINNED = [
  ...PERF_PINNED,
  '珊珊来了',
  'Nancy菜团子',
] as const

type NamedRow = { influencer_name: string; sns_id?: string | null }

function pinnedRank(row: NamedRow, pinned: readonly string[]): number | undefined {
  const byName = pinned.indexOf(row.influencer_name as (typeof pinned)[number])
  if (byName >= 0) return byName
  if (row.sns_id) {
    const bySns = pinned.indexOf(row.sns_id as (typeof pinned)[number])
    if (bySns >= 0) return bySns
  }
  return undefined
}

/** Pinned names first (in list order); others keep incoming order. */
export function sortWithPinned<T extends NamedRow>(rows: T[], pinned: readonly string[]): T[] {
  return [...rows].sort((a, b) => {
    const pa = pinnedRank(a, pinned)
    const pb = pinnedRank(b, pinned)
    if (pa !== undefined && pb !== undefined) return pa - pb
    if (pa !== undefined) return -1
    if (pb !== undefined) return 1
    return 0
  })
}

/** API limit으로 빠진 고정 인원을 전체 목록에서 보충 */
export function mergePinnedRows<T extends NamedRow>(
  rows: T[],
  catalog: T[],
  pinned: readonly string[],
): T[] {
  const seen = new Set(rows.map(r => r.influencer_name))
  const extras = catalog.filter(
    c => !seen.has(c.influencer_name) && pinnedRank(c, pinned) !== undefined,
  )
  return extras.length ? sortWithPinned([...rows, ...extras], pinned) : sortWithPinned(rows, pinned)
}

// ponytail: smoke — fails if pin order breaks
if (process.env.NODE_ENV !== 'production') {
  const sample = [
    { influencer_name: '珊珊来了', sns_id: '珊珊来了' },
    { influencer_name: 'pada_heli', sns_id: 'pada_heli' },
    { influencer_name: '不吃酥饼', sns_id: '9476704632' },
    { influencer_name: '娜美Nami', sns_id: '95497272171' },
  ]
  const perfSorted = sortWithPinned(sample, PERF_PINNED).map(r => r.influencer_name)
  if (perfSorted.join(',') !== '娜美Nami,不吃酥饼,珊珊来了,pada_heli') {
    throw new Error(`content-priority perf self-check failed: ${perfSorted.join(',')}`)
  }
  const augSorted = sortWithPinned(sample, AUGUST_2026_PINNED).map(r => r.influencer_name)
  if (augSorted.join(',') !== '娜美Nami,不吃酥饼,珊珊来了,pada_heli') {
    throw new Error(`content-priority aug self-check failed: ${augSorted.join(',')}`)
  }
  const merged = mergePinnedRows(
    sample.filter(r => r.influencer_name !== '娜美Nami'),
    sample,
    PERF_PINNED,
  ).map(r => r.influencer_name)
  if (merged.join(',') !== '娜美Nami,不吃酥饼,珊珊来了,pada_heli') {
    throw new Error(`content-priority merge self-check failed: ${merged.join(',')}`)
  }
}
