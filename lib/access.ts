/** 리포트 접근 — 클라이언트 게이트 (미팅용). 실보안이 아님. */

export type AccessLevel = 'full' | 'meeting'

const PASSWORDS: Record<string, AccessLevel> = {
  'slam2026!': 'full',
  'tjswo!': 'meeting',
}

export const ACCESS_STORAGE_KEY = 'owm-report-access'

export function accessFromPassword(password: string): AccessLevel | null {
  return PASSWORDS[password] ?? null
}

export function canSeeSales(level: AccessLevel): boolean {
  return level === 'full'
}

export function loadStoredAccess(): AccessLevel | null {
  if (typeof window === 'undefined') return null
  const v = sessionStorage.getItem(ACCESS_STORAGE_KEY)
  return v === 'full' || v === 'meeting' ? v : null
}

export function storeAccess(level: AccessLevel) {
  sessionStorage.setItem(ACCESS_STORAGE_KEY, level)
}

export function clearStoredAccess() {
  sessionStorage.removeItem(ACCESS_STORAGE_KEY)
}
