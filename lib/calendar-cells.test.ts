import { test } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore node --test 는 확장자가 있어야 찾음
import { monthCells, weekTotals } from './calendar-cells.ts'

const z = { visits: 0, done: 0, views: 0 }

test('monthCells: 월요일 시작, 앞뒤 다른 달은 null', () => {
  // 2025-10-01 은 수요일 → 앞 2칸 null
  const c = monthCells('2025-10')
  assert.equal(c.length % 7, 0)
  assert.deepEqual(c.slice(0, 3), [null, null, '2025-10-01'])
  assert.equal(c.filter(Boolean).length, 31)
  assert.equal(c[c.length - 1], null) // 10/31 금 → 뒤 2칸 null
})

test('weekTotals: 빈 달은 주마다 0건', () => {
  const w = weekTotals(monthCells('2025-10').map(d => ({ date: d, ...z })))
  assert.equal(w.length, 5)
  for (const x of w) assert.deepEqual({ visits: x.visits, done: x.done, views: x.views }, z)
})

test('weekTotals: 빈 배열 → 빈 결과', () => {
  assert.deepEqual(weekTotals([]), [])
})

test('weekTotals: 월 경계 — 첫 주·마지막 주는 이 달 날짜만 합산', () => {
  const cells = monthCells('2025-10')
  const w = weekTotals(
    cells.map(d => ({ date: d, visits: d ? 1 : 99, done: d === '2025-10-01' ? 1 : 0, views: d ? 10 : 999 })),
  )
  assert.equal(w[0].visits, 5) // 10/1~10/5
  assert.equal(w[0].done, 1)
  assert.equal(w[0].views, 50)
  assert.equal(w[0].start, '2025-10-01')
  assert.equal(w[0].end, '2025-10-05')
  const last = w[w.length - 1]
  assert.equal(last.visits, 5) // 10/27~10/31
  assert.equal(last.end, '2025-10-31')
})

test('weekTotals: 7칸 미만 꼬리도 한 주로 처리', () => {
  const w = weekTotals([{ date: '2026-02-01', visits: 2, done: 1, views: 5 }])
  assert.equal(w.length, 1)
  assert.equal(w[0].visits, 2)
})

test('monthCells: 2월 윤년·시간대 무관', () => {
  assert.equal(monthCells('2024-02').filter(Boolean).length, 29)
  assert.equal(monthCells('2026-02').filter(Boolean).length, 28)
  assert.equal(monthCells('2026-02')[6], '2026-02-01') // 일요일
})
