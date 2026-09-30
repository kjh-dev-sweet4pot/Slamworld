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
