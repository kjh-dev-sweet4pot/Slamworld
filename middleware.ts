import { NextResponse, type NextRequest } from 'next/server'
import { sessionFromRequest } from '@/lib/session-cookie'
import { apiDecision } from '@/lib/api-access'

/**
 * /api/* 로그인 확인. 판정은 lib/api-access.ts.
 * 예외: 로그인 자체, 자체 Bearer 인증을 하는 크론 라우트.
 */
export async function middleware(req: NextRequest) {
  const session = await sessionFromRequest(req)
  const bearer = !!req.headers.get('authorization')?.startsWith('Bearer ')
  const d = apiDecision(req.nextUrl.pathname, session, bearer)
  if (d === 401) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  if (d === 403) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  return NextResponse.next()
}

export const config = { matcher: '/api/:path*' }
