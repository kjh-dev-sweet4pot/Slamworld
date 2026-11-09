import { NextResponse } from 'next/server'
import { accessFromPassword } from '@/lib/access-server'
import { SESSION_COOKIE, SESSION_MAX_AGE, makeSessionToken, sessionFromRequest } from '@/lib/session-cookie'

export const dynamic = 'force-dynamic'

/** 현재 로그인 상태 — 쿠키가 없거나 위조면 { session: null } */
export async function GET(req: Request) {
  return NextResponse.json({ session: await sessionFromRequest(req) })
}

/** { password } → 서명 쿠키 발급 + 세션 반환 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null)
  const session = accessFromPassword(String(b?.password ?? ''))
  if (!session) return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 })
  const res = NextResponse.json({ session })
  res.cookies.set(SESSION_COOKIE, await makeSessionToken(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}

/** 로그아웃 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  return res
}
