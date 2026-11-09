import { test } from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore node --test 는 확장자가 있어야 찾음
import { apiDecision } from './api-access.ts'
import type { AccessSession } from './access'

const s = (kind: AccessSession['kind']) => ({ kind } as AccessSession)
const OWM = ['/api/owm-report', '/api/owm-report/xlsx', '/api/owm-report/']

test('OWM 세션 없음 → 401', () => {
  for (const p of OWM) assert.equal(apiDecision(p, null, false), 401)
})
test('OWM partner·meeting → 403', () => {
  for (const p of OWM) {
    assert.equal(apiDecision(p, s('partner'), false), 403)
    assert.equal(apiDecision(p, s('meeting'), false), 403)
  }
})
test('OWM full → ok', () => {
  for (const p of OWM) assert.equal(apiDecision(p, s('full'), false), 'ok')
})
test('/api/session → public', () => {
  assert.equal(apiDecision('/api/session', null, false), 'public')
})
test('send + Bearer → cron', () => {
  assert.equal(apiDecision('/api/owm-report/send', null, true), 'cron')
})
test('partner 허용 경로 → ok', () => {
  assert.equal(apiDecision('/api/contents', s('partner'), false), 'ok')
  assert.equal(apiDecision('/api/requests', s('partner'), false), 403)
})
