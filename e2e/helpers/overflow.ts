import { expect, type Page } from '@playwright/test'

/** 가로 넘침(가로 스크롤)이 없는지 검사 */
export async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth, 'scrollWidth ' + scrollWidth + ' > innerWidth ' + innerWidth).toBeLessThanOrEqual(innerWidth + 1)
}
