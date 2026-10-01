import type { Content } from '@/lib/types'

const IG_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

function ymdFromUnixSec(sec: number): string {
  if (!Number.isFinite(sec) || sec < 1_500_000_000 || sec > 2_000_000_000) return ''
  return new Date(sec * 1000).toISOString().slice(0, 10)
}

/** 게시 URL에 박힌 발행일 (샤오홍슈 노트 id · 인스타 숏코드 · 틱톡 video id). scripts/sync-from-boardingpass.mjs 와 동일 */
export function postedDayFromUrl(url: string | null | undefined): string {
  const raw = String(url || '')
  const xhs = raw.match(/([0-9a-f]{24})/i)
  if (xhs) {
    const d = ymdFromUnixSec(parseInt(xhs[1].slice(0, 8), 16))
    if (d) return d
  }
  const ig = raw.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#]+)/i)
  if (ig) {
    let id = BigInt(0)
    for (const c of ig[1]) {
      const i = IG_ALPHABET.indexOf(c)
      if (i < 0) return ''
      id = id * BigInt(64) + BigInt(i)
    }
    const d = new Date(Number(id >> BigInt(23)) + 1314220021721)
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
  }
  const tt = raw.match(/tiktok\.com\/.*?video\/(\d+)/i)
  if (tt) return ymdFromUnixSec(Number(BigInt(tt[1]) >> BigInt(32)))
  return ''
}

/** 게시일 (DB 값 → URL 역산). 모르면 null */
export function contentPostedDate(c: Pick<Content, 'upload_url'> & { posted_date?: string | null }): string | null {
  return c.posted_date || postedDayFromUrl(c.upload_url) || null
}

/**
 * 월 필터 기준일. 업로드한 콘텐츠는 게시일, 게시일을 모르거나 미업로드면 방문일.
 */
export function contentPeriodDate(c: Pick<Content, 'upload_url' | 'visit_date'> & { posted_date?: string | null }): string | null {
  if (c.upload_url) return contentPostedDate(c) || c.visit_date
  return c.visit_date
}

/** 시딩(배송·기자단) 여부 — 보딩패스 지점명이 '기자단(시딩)', '국내시딩(배송)' 등 */
export function isSeedingLocation(location: string | null | undefined): boolean {
  return /시딩/.test(location || '')
}

/**
 * 월 성과 포함 여부 (내부 기준). 해당 월 전체 + 전월 20일~말일 누적.
 * 예) 2026-09 → 08-20 ~ 09-30
 */
export function inPerformanceMonth(date: string | null | undefined, month: string): boolean {
  if (!date || !month) return false
  if (date.startsWith(month)) return true
  const [y, m] = month.split('-').map(Number)
  const p = new Date(y, m - 2, 1)
  const prev = `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}`
  return date.startsWith(prev) && date.slice(8, 10) >= '20'
}

/** 날짜가 포함되는 성과 월 목록. 20일 이후면 다음 달에도 누적 */
export function performanceMonthsOf(date: string | null | undefined): string[] {
  if (!date) return []
  const month = date.slice(0, 7)
  if (date.slice(8, 10) < '20') return [month]
  const [y, m] = month.split('-').map(Number)
  const n = new Date(y, m, 1)
  return [month, `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`]
}
