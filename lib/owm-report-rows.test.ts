import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toMobileRows, LONG_TEXT } from './owm-report-rows.ts'

const row = (o: Record<string, unknown> = {}) => ({
  visit_date: '2026-11-03',
  store: '강남점',
  handle: '@abc',
  url: 'https://x.com/1',
  posted_date: '2026-11-04',
  views: 1234,
  ...o,
})

test('빈 배열', () => {
  assert.deepEqual(toMobileRows([]), [])
})

test('정상 행', () => {
  const [r] = toMobileRows([row()])
  assert.equal(r.visitDate, '2026-11-03')
  assert.equal(r.store, '강남점')
  assert.equal(r.handle, '@abc')
  assert.equal(r.url, 'https://x.com/1')
  assert.equal(r.postedDate, '2026-11-04')
  assert.equal(r.views, '1,234')
  assert.equal(r.handleLong, false)
  assert.equal(r.storeLong, false)
})

test('null 필드는 -', () => {
  const [r] = toMobileRows([row({ url: null, posted_date: null, views: null, handle: '', store: null })])
  assert.equal(r.url, null)
  assert.equal(r.postedDate, '-')
  assert.equal(r.views, '-')
  assert.equal(r.handle, '-')
  assert.equal(r.store, '-')
})

test('0·음수 수치', () => {
  const [a, b] = toMobileRows([row({ views: 0 }), row({ views: -5 })])
  assert.equal(a.views, '0')
  assert.equal(b.views, '-5')
})

test('긴 핸들·이름 플래그', () => {
  const long = 'a'.repeat(LONG_TEXT + 1)
  const [r] = toMobileRows([row({ handle: long, store: long })])
  assert.equal(r.handle, long)
  assert.equal(r.handleLong, true)
  assert.equal(r.storeLong, true)
})
