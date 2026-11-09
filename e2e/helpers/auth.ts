import type { APIRequestContext, BrowserContext } from '@playwright/test'

export type Role = 'full' | 'member'

/** 비밀번호는 환경변수에서만 읽는다 (하드코딩 금지) */
function passwordFor(role: Role): string {
  const name = role === 'full' ? 'E2E_FULL_PW' : 'E2E_MEMBER_PW'
  const pw = role === 'full' ? process.env.E2E_FULL_PW : process.env.E2E_MEMBER_PW
  if (!pw) throw new Error('환경변수 ' + name + ' 가 없습니다.')
  return pw
}

/** POST /api/session 으로 로그인 → 응답 쿠키가 request 컨텍스트에 저장됨 */
export async function loginRequest(request: APIRequestContext, role: Role = 'full') {
  const res = await request.post('/api/session', { data: { password: passwordFor(role) } })
  if (!res.ok()) throw new Error('로그인 실패 (' + role + '): ' + res.status())
  return res.json()
}

/** 브라우저 컨텍스트에 로그인 쿠키 주입 (context.request 는 쿠키를 공유함) */
export async function login(context: BrowserContext, role: Role = 'full') {
  return loginRequest(context.request, role)
}
