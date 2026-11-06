import type { AccessSession } from './access'

/** 로그인 없이 열리는 API */
const PUBLIC = ['/api/session']
/** 자체 Bearer 인증을 하는 크론 라우트 */
const CRON = ['/api/sync-boardingpass', '/api/sync-metrics', '/api/owm-report/send']
/** 회원사 로그인이 쓸 수 있는 API — 각 라우트가 자기 브랜드로 걸러서 준다 */
const PARTNER_OK = ['/api/contents', '/api/pipeline', '/api/pending-publish', '/api/upcoming-visits', '/api/insight', '/api/product-images']
/** full 로그인만 */
const FULL_ONLY = ['/api/owm-report', '/api/owm-report/xlsx']

export type ApiDecision = 'public' | 'cron' | 'ok' | 401 | 403

export function apiDecision(rawPath: string, session: AccessSession | null, hasBearer: boolean): ApiDecision {
  const path = rawPath.replace(/\/$/, '')
  if (PUBLIC.includes(path)) return 'public'
  if (CRON.includes(path) && hasBearer) return 'cron'
  if (!session) return 401
  if (FULL_ONLY.includes(path)) return session.kind === 'full' ? 'ok' : 403
  if (session.kind === 'partner' && !PARTNER_OK.includes(path)) return 403
  return 'ok'
}
