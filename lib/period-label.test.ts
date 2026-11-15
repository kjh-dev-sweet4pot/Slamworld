import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shortPeriodLabel } from './period-label.ts'

test('주 — 같은 달', () => {
  assert.equal(shortPeriodLabel(['2026-11-09', '2026-11-15'], 'week'), '11/9~15')
})

test('주 — 달 경계', () => {
  assert.equal(shortPeriodLabel(['2026-10-26', '2026-11-01'], 'week'), '10/26~11/1')
})

test('주 — 연말·연초 경계', () => {
  assert.equal(shortPeriodLabel(['2026-12-28', '2027-01-03'], 'week'), '26.12/28~27.1/3')
})

test('월', () => {
  assert.equal(shortPeriodLabel(['2026-11-01', '2026-11-30'], 'month'), '26.11월')
  assert.equal(shortPeriodLabel(['2027-01-01', '2027-01-31'], 'month'), '27.1월')
})

test('전체', () => {
  assert.equal(shortPeriodLabel(['2026-10-01', '2026-12-31'], 'all'), '26.10~26.12')
})

test('잘못된 입력이면 빈 문자열', () => {
  assert.equal(shortPeriodLabel(['2026-02-31', '2026-03-01'], 'week'), '')
  assert.equal(shortPeriodLabel(['2026-13-01', '2026-13-31'], 'month'), '')
  assert.equal(shortPeriodLabel(['2026-13', '2026-13'], 'month'), '')
  assert.equal(shortPeriodLabel(['', ''], 'week'), '')
  assert.equal(shortPeriodLabel(['2026-11-15', '2026-11-09'], 'week'), '')
})
