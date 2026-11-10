import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { expectNoHorizontalOverflow } from './helpers/overflow'

/** 고치기 전 모바일 현황 기록 (대시보드 · 리포트) */
const ROUTES = [
  { path: '/', name: 'dashboard' },
  { path: '/owm-report', name: 'owm-report' },
]

type Wide = { selector: string; className: string; right: number }

test.describe('mobile audit', () => {
  test.beforeEach(async ({ context }, info) => {
    test.skip(info.project.name === 'desktop', '모바일 프로젝트만')
    await login(context)
  })

  for (const r of ROUTES) {
    test(`${r.name} 넘침 진단`, async ({ page }, info) => {
      await page.goto(r.path)
      await page.waitForLoadState('networkidle')
      const shot = `test-results/audit/${r.name}-${info.project.name}`

      // ② 첫 화면 + 전체 페이지
      await page.screenshot({ path: `${shot}.png` })
      await page.screenshot({ path: `${shot}-full.png`, fullPage: true })

      // ③ 화면 폭 넘는 요소 목록
      const wide: Wide[] = await page.evaluate(() => {
        const W = window.innerWidth
        const sel = (el: Element) => {
          const parts: string[] = []
          let e: Element | null = el
          while (e && e !== document.body && parts.length < 4) {
            parts.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : ''))
            e = e.parentElement
          }
          return parts.join(' > ')
        }
        return Array.from(document.querySelectorAll('body *'))
          .map(el => ({ el, right: el.getBoundingClientRect().right }))
          .filter(x => x.right > W + 1)
          .map(x => ({
            selector: sel(x.el),
            className: typeof x.el.className === 'string' ? x.el.className : '',
            right: Math.round(x.right),
          }))
      })
      console.log(`[audit] ${r.name} ${info.project.name}: ${wide.length}개 넘침`)
      for (const w of wide.slice(0, 50)) console.log(`  ${w.right}px ${w.selector} .${w.className}`)
      await info.attach(`wide-${r.name}.json`, {
        body: JSON.stringify(wide, null, 2),
        contentType: 'application/json',
      })

      // ① 가로 넘침 (현황 기록용: 실패해도 나머지는 남김)
      await expect.soft(page.locator('body')).toBeVisible()
      await expectNoHorizontalOverflow(page)
    })
  }
})
