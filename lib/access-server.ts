/** 로그인 비밀번호 — 서버 전용. 클라이언트 컴포넌트에서 import 하지 말 것 (번들에 비밀번호가 실린다) */
import type { AccessKind, AccessSession } from '@/lib/access'

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
  heveblue: '헤브블루',
  /** 흔한 오타 · 옛 표기 */
  haveblue: '헤브블루',
  dalba: '달바',
  re4day: '리포데이',
  skinstandard: '스킨스탠다드',
  tocobo: '토코보',
}

/** 한글·표시명으로도 입장 가능 (복붙·구비밀번호 대응) */
const PARTNER_LOGIN_ALIASES: Record<string, string> = {
  ...PARTNER_LOGIN_SLUGS,
  '옵티팜': '옵티팜',
  '닥터 리앤장': '닥터 리앤장',
  '닥터리앤장': '닥터 리앤장',
  '클리어디어': '클리어디어',
  '헤브블루': '헤브블루',
  '해브블루': '헤브블루',
  '달바': '달바',
  '스킨스탠다드': '스킨스탠다드',
  '리포데이': '리포데이',
  'Re4day': '리포데이',
  '토코보': '토코보',
  'Tocobo': '토코보',
}

export function partnerPassword(brand: string): string {
  const slug = Object.entries(PARTNER_LOGIN_SLUGS).find(([, b]) => b === brand)?.[0]
  return slug ? `${slug}!` : `${brand}!`
}

const ADMIN_PASSWORDS: Record<string, AccessKind> = {
  'slam2026!': 'full',
  'tjswo!': 'meeting',
}

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

/**
 * 운영 비밀번호 — 환경변수 ACCESS_PASSWORDS (JSON).
 *   {"<비밀번호>": "full" | "meeting" | "partner:<브랜드명>"}
 * 설정돼 있으면 이것만 쓴다. 없으면 아래 옛 규칙(추측 쉬움)으로 동작 — 전환 기간용.
 */
function envPasswords(): Record<string, AccessSession> | null {
  const raw = process.env.ACCESS_PASSWORDS
  if (!raw) return null
  try {
    const out: Record<string, AccessSession> = {}
    for (const [pw, v] of Object.entries(JSON.parse(raw) as Record<string, string>)) {
      const key = normalizePassword(pw)
      if (v === 'full' || v === 'meeting') out[key] = { kind: v }
      else if (typeof v === 'string' && v.startsWith('partner:')) out[key] = { kind: 'partner', brand: v.slice(8) }
    }
    return out
  } catch {
    console.error('ACCESS_PASSWORDS JSON 오류')
    return {}
  }
}

export function accessFromPassword(password: string): AccessSession | null {
  const pw = normalizePassword(password)
  if (!pw) return null

  const fromEnv = envPasswords()
  if (fromEnv) return fromEnv[pw] ?? null

  const admin = ADMIN_PASSWORDS[pw] ?? ADMIN_PASSWORDS[pw.toLowerCase()]
  if (admin) return { kind: admin }

  // `optipharm!` 또는 `optipharm` 둘 다 허용
  const id = pw.endsWith('!') ? pw.slice(0, -1).trim() : pw
  const brand = brandFromLoginId(id)
  if (brand) return { kind: 'partner', brand }

  return null
}

// ponytail: 비밀번호 목록 drift
if (process.env.ACCESS_SELF_CHECK === '1' && !process.env.ACCESS_PASSWORDS) {
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
