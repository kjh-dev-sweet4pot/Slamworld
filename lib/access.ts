/** 리포트 접근 — 클라이언트 게이트. 실보안이 아님. */

export type AccessKind = 'full' | 'meeting' | 'partner'

export interface AccessSession {
  kind: AccessKind
  /** partner 전용 — 회원사 브랜드명 (데이터 키) */
  brand?: string
}

/**
 * 회원사 로그인 비밀번호 = `{영문슬러그}!`
 * 값 = 내부 브랜드명
 */
export const PARTNER_LOGIN_SLUGS: Record<string, string> = {
  teloact: 'TeloAct',
  optipharm: '옵티팜',
  drlienjang: '닥터 리앤장',
  cleardear: '클리어디어',
  rxme: 'Rxme',
  troubleless: 'Troubleless',
  uiq: 'UIQ',
  heveblue: '해브블루',
  dalba: '달바',
  re4day: 'Re4day',
  skinstandard: '스킨스탠다드',
}

export function partnerPassword(brand: string): string {
  const slug = Object.entries(PARTNER_LOGIN_SLUGS).find(([, b]) => b === brand)?.[0]
  return slug ? `${slug}!` : `${brand}!`
}

const ADMIN_PASSWORDS: Record<string, AccessKind> = {
  'slam2026!': 'full',
  'tjswo!': 'meeting',
}

export const ACCESS_STORAGE_KEY = 'owm-report-access'

function brandFromLoginSlug(slug: string): string | null {
  return PARTNER_LOGIN_SLUGS[slug.toLowerCase()] ?? null
}

export function accessFromPassword(password: string): AccessSession | null {
  const pw = password.trim()
  const admin = ADMIN_PASSWORDS[pw]
  if (admin) return { kind: admin }

  if (pw.endsWith('!')) {
    const brand = brandFromLoginSlug(pw.slice(0, -1))
    if (brand) return { kind: 'partner', brand }
  }
  return null
}

export function canSeeSales(session: AccessSession): boolean {
  return session.kind === 'full'
}

export function partnerBrandOf(session: AccessSession): string | null {
  return session.kind === 'partner' ? (session.brand ?? null) : null
}

export function loadStoredAccess(): AccessSession | null {
  if (typeof window === 'undefined') return null
  const v = sessionStorage.getItem(ACCESS_STORAGE_KEY)
  if (!v) return null
  if (v === 'full' || v === 'meeting') return { kind: v }
  try {
    const parsed = JSON.parse(v) as AccessSession
    if (parsed.kind === 'full' || parsed.kind === 'meeting') return { kind: parsed.kind }
    if (parsed.kind === 'partner' && typeof parsed.brand === 'string') {
      const known = Object.values(PARTNER_LOGIN_SLUGS)
      return known.includes(parsed.brand) ? { kind: 'partner', brand: parsed.brand } : null
    }
  } catch {
    /* ignore */
  }
  return null
}

export function storeAccess(session: AccessSession) {
  sessionStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredAccess() {
  sessionStorage.removeItem(ACCESS_STORAGE_KEY)
}

// ponytail: 비밀번호 목록 drift
if (process.env.ACCESS_SELF_CHECK === '1') {
  if (!accessFromPassword('slam2026!') || accessFromPassword('slam2026!')?.kind !== 'full') {
    throw new Error('full password')
  }
  if (accessFromPassword('tjswo!')?.kind !== 'meeting') throw new Error('meeting password')
  if (accessFromPassword('teloact!')?.brand !== 'TeloAct') throw new Error('teloact')
  if (accessFromPassword('optipharm!')?.brand !== '옵티팜') throw new Error('optipharm')
  if (accessFromPassword('drlienjang!')?.brand !== '닥터 리앤장') throw new Error('drlienjang')
  if (accessFromPassword('cleardear!')?.brand !== '클리어디어') throw new Error('cleardear')
  if (accessFromPassword('heveblue!')?.brand !== '해브블루') throw new Error('heveblue')
  if (accessFromPassword('dalba!')?.brand !== '달바') throw new Error('dalba')
  if (accessFromPassword('skinstandard!')?.brand !== '스킨스탠다드') throw new Error('skinstandard')
  if (accessFromPassword('옵티팜!')) throw new Error('korean password should reject')
  if (accessFromPassword('wrong!')) throw new Error('should reject')
}
