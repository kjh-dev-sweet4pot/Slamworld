import { runActor } from './client'
import { APIFY_ACTORS } from './config'
import { buildUrlIndex, findOriginalUrl } from './url-keys'
import type { ScrapedMetrics } from './types'

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n)
}

function parseInstagramItem(item: Record<string, unknown>): ScrapedMetrics | null {
  if (item.error || item.errorCode) return null
  const likes = num(item.likesCount ?? item.likeCount)
  const comments = num(item.commentsCount ?? item.commentCount)
  const views = num(item.videoPlayCount ?? item.videoViewCount ?? item.playCount)
  if (likes == null && comments == null && views == null) return null
  return {
    views,
    likes,
    saves: null,
    comments,
    views_source: views != null ? 'measured' : 'none',
  }
}

const IG_POST_URL =
  /^(https:\/\/)?(www\.)?instagram\.com\/(p|reels?|tv)\/[A-Za-z0-9_-]+(\/.*)?$/i

export function isInstagramPostUrl(url: string): boolean {
  return IG_POST_URL.test(url.trim())
}

/** Apify actor는 /reel/ 단수 경로를 더 안정적으로 처리 */
function normalizeInstagramPostUrl(url: string): string {
  return url.replace(/instagram\.com\/reels\//i, 'instagram.com/reel/')
}

/** Instagram 게시물 URL 배치 → 원본 URL별 metrics */
export async function scrapeInstagramBatch(
  urls: string[],
): Promise<Map<string, ScrapedMetrics>> {
  const validUrls = [...new Set(urls.filter(isInstagramPostUrl))]
  if (!validUrls.length) return new Map()

  const index = buildUrlIndex(urls)
  const out = new Map<string, ScrapedMetrics>()

  const items = await runActor(APIFY_ACTORS.instagram, {
    directUrls: validUrls.map(normalizeInstagramPostUrl),
    resultsType: 'posts',
    resultsLimit: 1,
    addParentData: false,
  })

  for (const item of items) {
    const candidates = [
      item.url as string,
      item.inputUrl as string,
      item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : '',
    ].filter(Boolean)
    const original = findOriginalUrl(index, candidates)
    if (!original) continue
    const metrics = parseInstagramItem(item)
    if (metrics) out.set(original, metrics)
  }

  return out
}

function parseTikTokItem(item: Record<string, unknown>): ScrapedMetrics | null {
  if (item.error || item.errorCode) return null
  const likes = num(item.diggCount)
  const views = num(item.playCount)
  const saves = num(item.collectCount)
  const comments = num(item.commentCount)
  if (likes == null && views == null && saves == null && comments == null) return null
  return {
    views,
    likes,
    saves,
    comments,
    views_source: views != null ? 'measured' : 'none',
  }
}

export async function scrapeTikTokBatch(
  urls: string[],
): Promise<Map<string, ScrapedMetrics>> {
  if (!urls.length) return new Map()

  const index = buildUrlIndex(urls)
  const out = new Map<string, ScrapedMetrics>()

  const items = await runActor(APIFY_ACTORS.tiktok, {
    postURLs: urls,
    resultsPerPage: 1,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  })

  for (const item of items) {
    const candidates = [
      item.webVideoUrl as string,
      item.submittedVideoUrl as string,
      item.videoUrl as string,
    ].filter(Boolean)
    const original = findOriginalUrl(index, candidates)
    if (!original) continue
    const metrics = parseTikTokItem(item)
    if (metrics) out.set(original, metrics)
  }

  return out
}

function parseXhsItem(item: Record<string, unknown>): ScrapedMetrics | null {
  if (item.error || item.errorCode) return null
  const ix = (item.interactions ?? {}) as Record<string, unknown>
  const likes = num(ix.liked_count ?? item.liked_count ?? item.likeCount ?? item.likes)
  const saves = num(ix.collected_count ?? item.collected_count ?? item.collectCount ?? item.saves)
  const comments = num(ix.comment_count ?? item.comment_count ?? item.commentCount ?? item.comments)
  if (likes == null && saves == null && comments == null) return null
  // 샤오홍슈는 조회수 미제공 → views null
  return {
    views: null,
    likes,
    saves,
    comments,
    views_source: 'none',
  }
}

export async function scrapeXiaohongshuBatch(
  urls: string[],
): Promise<Map<string, ScrapedMetrics>> {
  if (!urls.length) return new Map()

  const index = buildUrlIndex(urls)
  const out = new Map<string, ScrapedMetrics>()

  const items = await runActor(APIFY_ACTORS.xiaohongshu, {
    mode: 'post',
    noteUrls: urls,
    maxResultsPerInput: 1,
  })

  for (const item of items) {
    const noteId = (item.note_id ?? item.noteId ?? item.id) as string | undefined
    const candidates = [
      item.note_url as string,
      item.url as string,
      item.share_url as string,
      item.noteUrl as string,
      item.inputUrl as string,
      item.sourceUrl as string,
      noteId ? `https://www.xiaohongshu.com/discovery/item/${noteId}` : '',
    ].filter(Boolean)
    const original = findOriginalUrl(index, candidates)
    if (!original) continue
    const metrics = parseXhsItem(item)
    if (metrics) out.set(original, metrics)
  }

  return out
}
