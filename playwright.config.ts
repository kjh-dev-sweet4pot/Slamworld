import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://localhost:3000'
const chrome = devices['Desktop Chrome']

export default defineConfig({
  testDir: 'e2e',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile-se', use: { ...chrome, viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-390', use: { ...chrome, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'android-360', use: { ...chrome, viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { ...chrome, viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
