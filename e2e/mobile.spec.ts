import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers/auth'
import { expectNoHorizontalOverflow } from './helpers/overflow'

/** 모바일 회귀 스펙 (예외 지점 포함). API 모킹은 page.route 만 사용 */

const isMobile = (name: string) => name !== 'desktop'
const REPORT_API = '**/api/owm-report?*'
const REPORT_API_BARE = '**/api/owm-report'

async function routeReport(page: Page, handler: Parameters<Page['route']>[1]) {
  await page.route(REPORT_API, handler)
  await page.route(REPORT_API_BARE, handler)
}

/** 흰 화면이 아님: 본문 글자가 있고 Next 오류 오버레이가 없음 */
async function expectNotBlank(page: Page) {
  await expect(page.locator('body')).toBeVisible()
  const text = (await page.locator('body').innerText()).trim()
  expect(text.length, '본문이 비어 있음').toBeGreaterThan(0)
  await expect(page.getByText(/Application error|Unhandled Runtime Error/i)).toHaveCount(0)
}

test.describe('mobile regression', () => {
  // ① 가로 넘침 없음
  for (const path of ['/', '/owm-report']) {
    test(`① 가로 넘침 없음 ${path}`, async ({ page, context }) => {
      await login(context)
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)
    })
  }

  // ② 모바일 목록 / 데스크톱 표
  test('② 리포트 목록·표 전환', async ({ page, context }, info) => {
    await login(context)
    await page.goto('/owm-report')
    const list = page.getByTestId('owm-mobile-list').first()
    const table = page.locator('table').first()
    if (isMobile(info.project.name)) {
      await expect(list).toBeVisible()
      await expect(table).toBeHidden()
    } else {
      await expect(table).toBeVisible()
      await expect(list).toBeHidden()
    }
  })

  // ③ 빈 데이터
  test('③ 빈 데이터 → owm-empty', async ({ page, context }) => {
    await login(context)
    await routeReport(page, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tables: [] }) }),
    )
    await page.goto('/owm-report')
    await expect(page.getByTestId('owm-empty').first()).toBeVisible()
    await expectNotBlank(page)
  })

  // ④ API 실패(500, BoardingPass 장애) · 지연(5초)
  test('④-a API 500 → 오류 문구', async ({ page, context }) => {
    await login(context)
    await routeReport(page, route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'BoardingPass 장애' }) }),
    )
    await page.goto('/owm-report')
    await expect(page.getByText('BoardingPass 장애')).toBeVisible()
    await expectNotBlank(page)
    await expectNoHorizontalOverflow(page)
  })

  test('④-b API 5초 지연 → 로딩 문구', async ({ page, context }) => {
    await login(context)
    await routeReport(page, async route => {
      await new Promise(r => setTimeout(r, 5_000))
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: '지연 후 실패' }) })
    })
    await page.goto('/owm-report')
    await expect(page.getByText('불러오는 중…').first()).toBeVisible()
    await expectNotBlank(page)
    await expect(page.getByText('지연 후 실패')).toBeVisible({ timeout: 10_000 })
  })

  // ⑤ 잘못된 쿼리
  for (const q of ['?week=2026-02-31', '?month=2026-13']) {
    test(`⑤ 잘못된 쿼리 ${q} → 흰 화면 아님`, async ({ page, context }) => {
      await login(context)
      await page.goto('/owm-report' + q)
      await page.waitForLoadState('networkidle')
      await expectNotBlank(page)
    })
  }

  // ⑥ 세션 만료
  test('⑥ 쿠키 삭제 후 / → LoginGate', async ({ page, context }) => {
    await login(context)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await context.clearCookies()
    await page.goto('/')
    await expect(page.getByPlaceholder('비밀번호 입력')).toBeVisible()
  })

  // ⑦ 회원사: /auto 403 이어도 화면 정상
  test('⑦ 회원사 /auto 403 → 화면 오류 없음', async ({ page, context }, info) => {
    test.skip(!isMobile(info.project.name), '모바일만')
    await login(context, 'member')
    await page.route('**/api/sync-boardingpass/auto', route =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'forbidden' }) }),
    )
    const pageErrors: Error[] = []
    page.on('pageerror', e => pageErrors.push(e))
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expectNotBlank(page)
    expect(pageErrors.map(e => e.message)).toEqual([])
    await expectNoHorizontalOverflow(page)
  })

  // ⑧ 전각 '！' 비밀번호 정규화
  test('⑧ 전각 비밀번호 입력 → 로그인', async ({ page }, info) => {
    test.skip(!isMobile(info.project.name), '모바일만')
    const pw = process.env.E2E_MEMBER_PW
    test.skip(!pw, 'E2E_MEMBER_PW 없음')
    // '!'는 전각 '！'로. '!'가 없으면 ASCII 전체를 전각으로 (NFKC로 되돌아감)
    const full = pw!.includes('!')
      ? pw!.replace(/!/g, '！')
      : pw!.replace(/[!-~]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xfee0))
    expect(full).not.toBe(pw)
    await page.goto('/')
    const input = page.getByPlaceholder('비밀번호 입력')
    await input.fill(full)
    await input.press('Enter')
    await expect(input).toBeHidden()
    await expect(page.getByText('비밀번호가 올바르지 않습니다.')).toHaveCount(0)
  })
})
