import { runActor } from './client'
import { APIFY_ACTORS } from './config'
import { buildUrlIndex, findOriginalUrl, urlMatchKeys } from './url-keys'
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

const DY_POST_URL =
  /^(https:\/\/)?(www\.)?((douyin|iesdouyin)\.com\/(video|share\/video)\/\d+|v\.douyin\.com\/[^/?#]+)/i

export function isDouyinPostUrl(url: string): boolean {
  const u = url.trim()
  if (/^\d{15,22}$/.test(u)) return true
  return DY_POST_URL.test(u)
}

function douyinVideoId(url: string): string | null {
  const m = url.match(/\/(?:share\/)?video\/(\d+)/)
  return m?.[1] ?? null
}

/** v.douyin.com 단축 URL → canonical video URL */
export async function resolveDouyinPostUrl(url: string): Promise<string> {
  const u = url.trim()
  const bareId = /^\d{15,22}$/.test(u)
  if (bareId) return `https://www.douyin.com/video/${u}`
  const knownId = douyinVideoId(u)
  if (knownId && !/v\.douyin\.com/i.test(u)) {
    return `https://www.douyin.com/video/${knownId}`
  }
  if (!/v\.douyin\.com/i.test(u)) return u
  try {
    const res = await fetch(u, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(20000),
    })
    const id = douyinVideoId(res.url)
    if (id) return `https://www.douyin.com/video/${id}`
    return res.url || u
  } catch {
    return u
  }
}

function parseDouyinItem(item: Record<string, unknown>): ScrapedMetrics | null {
  if (item.error || item.errorCode) return null
  const stats = (item.stats ?? {}) as Record<string, unknown>
  const likes = num(stats.diggCount ?? item.diggCount ?? item.likeCount)
  const rawViews = num(stats.playCount ?? item.playCount)
  // ponytail: Douyin often returns playCount=0 when hidden — treat as unavailable
  const views = rawViews === 0 ? null : rawViews
  const saves = num(stats.collectCount ?? item.collectCount)
  const comments = num(stats.commentCount ?? item.commentCount)
  if (likes == null && views == null && saves == null && comments == null) return null
  return {
    views,
    likes,
    saves,
    comments,
    views_source: views != null ? 'measured' : 'none',
  }
}

/** Douyin 게시물 URL 배치 → 원본 URL별 metrics */
export async function scrapeDouyinBatch(
  urls: string[],
): Promise<Map<string, ScrapedMetrics>> {
  const validUrls = [...new Set(urls.filter(isDouyinPostUrl))]
  if (!validUrls.length) return new Map()

  const resolvedPairs = await Promise.all(
    validUrls.map(async original => ({ original, resolved: await resolveDouyinPostUrl(original) })),
  )
  const index = new Map<string, string>()
  for (const { original, resolved } of resolvedPairs) {
    for (const key of [...urlMatchKeys(original), ...urlMatchKeys(resolved)]) {
      index.set(key, original)
    }
  }
  for (const url of urls) {
    for (const key of urlMatchKeys(url)) index.set(key, url)
  }
  const scrapeUrls = [...new Set(resolvedPairs.map(p => p.resolved))]
  const out = new Map<string, ScrapedMetrics>()

  const items = await runActor(APIFY_ACTORS.douyin, {
    searchType: 'video-detail',
    videoUrls: scrapeUrls,
  })

  for (const item of items) {
    const awemeId = (item.awemeId ?? item.aweme_id ?? item.videoId) as string | undefined
    const candidates = [
      item.url as string,
      item.shareUrl as string,
      item.inputUrl as string,
      item.videoPageUrl as string,
      awemeId ? `https://www.douyin.com/video/${awemeId}` : '',
    ].filter(Boolean)
    const original = findOriginalUrl(index, candidates)
    if (!original) continue
    const metrics = parseDouyinItem(item)
    if (metrics) out.set(original, metrics)
  }

  return out
}
