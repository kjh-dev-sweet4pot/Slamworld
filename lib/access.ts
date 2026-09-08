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
  /** 흔한 오타 */
  haveblue: '해브블루',
  dalba: '달바',
  re4day: 'Re4day',
  skinstandard: '스킨스탠다드',
}

/** 한글·표시명으로도 입장 가능 (복붙·구비밀번호 대응) */
const PARTNER_LOGIN_ALIASES: Record<string, string> = {
  ...PARTNER_LOGIN_SLUGS,
  '옵티팜': '옵티팜',
  '닥터 리앤장': '닥터 리앤장',
  '닥터리앤장': '닥터 리앤장',
  '클리어디어': '클리어디어',
  '해브블루': '해브블루',
  '달바': '달바',
  '스킨스탠다드': '스킨스탠다드',
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

/** 모바일 키보드 전각 ! · 제로폭 문자 · 대소문자 정규화 */
export function normalizePassword(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/！/g, '!')
    .trim()
}

function brandFromLoginId(id: string): string | null {
  const key = id.toLowerCase()
  return PARTNER_LOGIN_ALIASES[key] ?? PARTNER_LOGIN_ALIASES[id] ?? null
}

export function accessFromPassword(password: string): AccessSession | null {
  const pw = normalizePassword(password)
  if (!pw) return null

  const admin = ADMIN_PASSWORDS[pw] ?? ADMIN_PASSWORDS[pw.toLowerCase()]
  if (admin) return { kind: admin }

  // `optipharm!` 또는 `optipharm` 둘 다 허용
  const id = pw.endsWith('!') ? pw.slice(0, -1).trim() : pw
  const brand = brandFromLoginId(id)
  if (brand) return { kind: 'partner', brand }

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
  try {
    const v = sessionStorage.getItem(ACCESS_STORAGE_KEY)
    if (!v) return null
    if (v === 'full' || v === 'meeting') return { kind: v }
    const parsed = JSON.parse(v) as AccessSession
    if (parsed.kind === 'full' || parsed.kind === 'meeting') return { kind: parsed.kind }
    if (parsed.kind === 'partner' && typeof parsed.brand === 'string') {
      const known = new Set(Object.values(PARTNER_LOGIN_SLUGS))
      return known.has(parsed.brand) ? { kind: 'partner', brand: parsed.brand } : null
    }
  } catch {
    /* private mode / corrupt */
  }
  return null
}

export function storeAccess(session: AccessSession) {
  try {
    sessionStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(session))
  } catch {
    /* private mode — 세션은 메모리에만 유지 */
  }
}

export function clearStoredAccess() {
  try {
    sessionStorage.removeItem(ACCESS_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

// ponytail: 비밀번호 목록 drift
if (process.env.ACCESS_SELF_CHECK === '1') {
  if (!accessFromPassword('slam2026!') || accessFromPassword('slam2026!')?.kind !== 'full') {
    throw new Error('full password')
  }
  if (accessFromPassword('tjswo!')?.kind !== 'meeting') throw new Error('meeting password')
  if (accessFromPassword('teloact!')?.brand !== 'TeloAct') throw new Error('teloact')
  if (accessFromPassword('TeloAct!')?.brand !== 'TeloAct') throw new Error('TeloAct case')
  if (accessFromPassword('optipharm!')?.brand !== '옵티팜') throw new Error('optipharm')
  if (accessFromPassword('optipharm')?.brand !== '옵티팜') throw new Error('optipharm no bang')
  if (accessFromPassword('optipharm！')?.brand !== '옵티팜') throw new Error('fullwidth bang')
  if (accessFromPassword('옵티팜!')?.brand !== '옵티팜') throw new Error('korean alias')
  if (accessFromPassword('drlienjang!')?.brand !== '닥터 리앤장') throw new Error('drlienjang')
  if (accessFromPassword('wrong!')) throw new Error('should reject')
}
