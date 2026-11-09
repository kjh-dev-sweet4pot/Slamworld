/** 리포트 접근 타입 · 권한 헬퍼. 비밀번호 확인은 서버(lib/access-server.ts, /api/session)에서만 */

export type AccessKind = 'full' | 'meeting' | 'partner'

export interface AccessSession {
  kind: AccessKind
  /** partner 전용 — 회원사 브랜드명 (데이터 키) */
  brand?: string
}

export function canSeeSales(session: AccessSession): boolean {
  return session.kind === 'full'
}

export function partnerBrandOf(session: AccessSession): string | null {
  return session.kind === 'partner' ? (session.brand ?? null) : null
}
