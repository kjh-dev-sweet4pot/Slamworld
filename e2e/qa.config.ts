// QA용: 이미 떠 있는 서버(E2E_BASE_URL) 사용, webServer 미기동
import base from '../playwright.config'
import { defineConfig } from '@playwright/test'

export default defineConfig({
  ...base,
  testDir: '.',
  use: { ...base.use, baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3609' },
  webServer: undefined,
})
