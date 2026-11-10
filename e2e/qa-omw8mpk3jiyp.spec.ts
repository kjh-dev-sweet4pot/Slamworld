import { test, expect, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow } from './helpers/overflow'

/** QA omw8mpk3jiyp: 모바일 최적화 검수. 읽기 전용, API는 page.route 로 모킹 */

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3609'
test.use({ baseURL: BASE })
const mobile = (n: string) => n !== 'desktop'
const LONG = 'very_long_handle_'.repeat(8)

/** 실제 응답을 받아 모든 표의 행만 바꿔 돌려줌 (응답 구조는 유지) */
async function mockRows(page: Page, rows: Record<string, unknown>[]) {
  const h = async (r: Parameters<Parameters<Page['route']>[1]>[0]) => {
    const res = await r.fetch()
    const json = await res.json()
    for (const t of json.tables ?? []) t.rows = rows
    await r.fulfill({ response: res, json })
  }
  await page.route('**/api/owm-report?*', h)
  await page.route('**/api/owm-report', h)
}

async function mockReport(page: Page, body: unknown, status = 200) {
  const h = (r: Parameters<Parameters<Page['route']>[1]>[0]) =>
    r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route('**/api/owm-report?*', h)
  await page.route('**/api/owm-report', h)
}

async function noCrash(page: Page) {
  const t = (await page.locator('body').innerText()).trim()
  expect(t.length).toBeGreaterThan(0)
  await expect(page.getByText(/Application error|Unhandled Runtime Error/i)).toHaveCount(0)
}

test('Q1 로그인 화면 모바일 표시·넘침 없음', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByPlaceholder('비밀번호 입력')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('Q2 틀린 비밀번호 → 오류 문구, 화면 유지', async ({ page }) => {
  await page.goto('/')
  const input = page.getByPlaceholder('비밀번호 입력')
  await input.fill('qa-wrong-pw-xyz')
  await input.press('Enter')
  await expect(page.getByText('비밀번호가 올바르지 않습니다.')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('Q3 리포트 페이지 기본 렌더·넘침 없음', async ({ page }) => {
  await page.goto('/owm-report')
  await page.waitForLoadState('networkidle')
  await noCrash(page)
  await expectNoHorizontalOverflow(page)
})

test('Q4 아주 긴 핸들·매장명 → 넘침 없음', async ({ page }, info) => {
  await mockRows(page, [
    { handle: LONG, store: '매장'.repeat(40), visit_date: '2026-11-03', posted_date: '2026-11-04', views: 1234567, url: 'https://example.com' },
  ])
  await page.goto('/owm-report')
  await page.waitForLoadState('networkidle')
  await noCrash(page)
  await expectNoHorizontalOverflow(page)
  if (mobile(info.project.name)) await expect(page.locator('table').first()).toBeHidden()
})

test('Q5 null·0 값 행 → 오류 없음', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', e => errs.push(e.message))
  await mockRows(page, [{ handle: '', store: '', visit_date: '2026-11-03', posted_date: null, views: null, url: null }, { handle: 'z', store: 'z', visit_date: '2026-11-03', posted_date: null, views: 0, url: null }])
  await page.goto('/owm-report')
  await page.waitForLoadState('networkidle')
  await noCrash(page)
  expect(errs).toEqual([])
})

test('Q6 0건 행 → 흰 화면 아님', async ({ page }) => {
  await mockRows(page, [])
  await page.goto('/owm-report')
  await page.waitForLoadState('networkidle')
  await noCrash(page)
})

test('Q7 API 500 → 오류 문구·넘침 없음', async ({ page }) => {
  await mockReport(page, { error: 'QA 장애' }, 500)
  await page.goto('/owm-report')
  await expect(page.getByText('QA 장애')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

for (const q of ['?week=2026-02-31', '?month=2026-13', '?week=abc']) {
  test(`Q8 잘못된 쿼리 ${q} → 흰 화면 아님`, async ({ page }) => {
    await page.goto('/owm-report' + q)
    await page.waitForLoadState('networkidle')
    await noCrash(page)
  })
}

test('Q9 기간 이동 버튼 빠른 연타 → 오류 없음', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', e => errs.push(e.message))
  await page.goto('/owm-report')
  await page.waitForLoadState('networkidle')
  const prev = page.getByRole('button', { name: /이전|‹|←|◀/ }).first()
  test.skip((await prev.count()) === 0, '이전 버튼 없음')
  for (let i = 0; i < 5; i++) await prev.click({ force: true })
  await page.waitForLoadState('networkidle')
  await noCrash(page)
  expect(errs).toEqual([])
  await expectNoHorizontalOverflow(page)
})

test('Q10 터치 영역 — 보이는 버튼 높이 ≥ 24px', async ({ page }, info) => {
  test.skip(!mobile(info.project.name), '모바일만')
  await page.goto('/owm-report')
  await page.waitForLoadState('networkidle')
  const small = await page.locator('button:visible, a:visible').evaluateAll(els =>
    els.map(e => ({ t: (e.textContent || '').trim().slice(0, 20), h: e.getBoundingClientRect().height }))
      .filter(x => x.h > 0 && x.h < 24))
  expect(small, JSON.stringify(small)).toEqual([])
})
