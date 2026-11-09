import type { AccessSession } from '@/lib/access'

/**
 * 서버 확인용 로그인 쿠키 (HttpOnly · HMAC-SHA256 서명).
 * Web Crypto 만 써서 middleware(Edge)와 API 라우트 양쪽에서 쓴다.
 */
export const SESSION_COOKIE = 'owm-session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7

const enc = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}

async function key(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('SESSION_SECRET 없음')
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function makeSessionToken(session: AccessSession): Promise<string> {
  const data = b64url(enc.encode(JSON.stringify({ ...session, exp: Date.now() + SESSION_MAX_AGE * 1000 })))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await key(), enc.encode(data)))
  return `${data}.${b64url(sig)}`
}

export async function readSessionToken(token: string | undefined | null): Promise<AccessSession | null> {
  if (!token) return null
  const [data, sig] = token.split('.')
  if (!data || !sig) return null
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(), fromB64url(sig), enc.encode(data))
    if (!ok) return null
    const { kind, brand, exp } = JSON.parse(new TextDecoder().decode(fromB64url(data)))
    if (typeof exp !== 'number' || exp <= Date.now()) return null
    if (kind === 'full' || kind === 'meeting') return { kind }
    if (kind === 'partner' && typeof brand === 'string') return { kind, brand }
    return null
  } catch {
    return null
  }
}

function cookieFrom(req: Request): string | undefined {
  const m = (req.headers.get('cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
  return m?.[1]
}

export function sessionFromRequest(req: Request): Promise<AccessSession | null> {
  return readSessionToken(cookieFrom(req))
}

/** 요청 쿠키가 관리자(full) 로그인인지 */
export async function isFullAccess(req: Request): Promise<boolean> {
  return (await sessionFromRequest(req))?.kind === 'full'
}
