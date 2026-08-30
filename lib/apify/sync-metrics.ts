import { createAdminSupabase } from '@/lib/supabase-admin'
import { BATCH_SIZE } from './config'
import {
  scrapeInstagramBatch,
  scrapeTikTokBatch,
  scrapeXiaohongshuBatch,
  isInstagramPostUrl,
} from './scrapers'
import type {
  ContentRow,
  ScrapedMetrics,
  SyncChannel,
  SyncResultItem,
  SyncSummary,
} from './types'
import { SYNC_CHANNELS } from './types'

export interface SyncOptions {
  channels?: SyncChannel[]
  limit?: number
  ids?: number[]
  dryRun?: boolean
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function detectScrapeChannel(url: string, dbChannel: string): SyncChannel | null {
  const u = url.toLowerCase()
  if (u.includes('instagram.com')) return '인스타그램'
  if (u.includes('tiktok.com')) return '틱톡'
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.')) return '샤오홍슈'
  if ((SYNC_CHANNELS as string[]).includes(dbChannel)) return dbChannel as SyncChannel
  return null
}

async function scrapeChannel(
  channel: SyncChannel,
  urls: string[],
): Promise<Map<string, ScrapedMetrics>> {
  const merged = new Map<string, ScrapedMetrics>()
  for (const batch of chunk(urls, BATCH_SIZE)) {
    let batchResult: Map<string, ScrapedMetrics>
    switch (channel) {
      case '인스타그램':
        batchResult = await scrapeInstagramBatch(batch)
        break
      case '틱톡':
        batchResult = await scrapeTikTokBatch(batch)
        break
      case '샤오홍슈':
        batchResult = await scrapeXiaohongshuBatch(batch)
        break
    }
    for (const [url, m] of batchResult) merged.set(url, m)
  }
  return merged
}

async function hasMetricsUpdatedAtColumn(
  supabase: ReturnType<typeof createAdminSupabase>,
): Promise<boolean> {
  const { error } = await supabase.from('contents').select('metrics_updated_at').limit(1)
  return !error?.message?.includes('metrics_updated_at')
}

export async function syncContentMetrics(opts: SyncOptions = {}): Promise<SyncSummary> {
  const channels = opts.channels ?? SYNC_CHANNELS
  const dryRun = opts.dryRun ?? false
  const supabase = createAdminSupabase()
  const trackMetricsUpdatedAt = await hasMetricsUpdatedAtColumn(supabase)

  let query = supabase
    .from('contents')
    .select('id, channel, upload_url, influencer_name')
    .not('upload_url', 'is', null)
    .neq('upload_url', '')

  if (opts.ids?.length) {
    query = query.in('id', opts.ids)
  } else {
    query = query.in('channel', channels)
  }

  query = query.order('id')
  if (opts.limit) query = query.limit(opts.limit)

  const { data, error } = await query
  if (error) throw new Error(`Supabase fetch failed: ${error.message}`)

  const rows = (data ?? []) as ContentRow[]
  const results: SyncResultItem[] = []
  let updated = 0
  let skipped = 0
  let errors = 0

  for (const row of rows) {
    if (!row.upload_url) continue
    if (detectScrapeChannel(row.upload_url, row.channel)) continue
    skipped++
    results.push({
      id: row.id,
      channel: row.channel,
      influencer_name: row.influencer_name,
      upload_url: row.upload_url,
      status: 'skipped',
      error: '인스타그램·틱톡·샤오홍슈 외 채널은 수집하지 않음',
    })
  }

  // URL 호스트 기준으로 스크래퍼 선택 (DB 채널과 게시 플랫폼이 다른 경우 대비)
  for (const channel of channels) {
    const channelRows = rows.filter(r => {
      if (!r.upload_url) return false
      return detectScrapeChannel(r.upload_url, r.channel) === channel
    })
    if (!channelRows.length) continue

    const urls = channelRows.map(r => r.upload_url!)
    let metricsByUrl: Map<string, ScrapedMetrics>

    try {
      metricsByUrl = await scrapeChannel(channel, urls)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      for (const row of channelRows) {
        errors++
        results.push({
          id: row.id,
          channel: row.channel,
          influencer_name: row.influencer_name,
          upload_url: row.upload_url!,
          status: 'error',
          error: `Apify (${channel}): ${msg}`,
        })
      }
      continue
    }

    for (const row of channelRows) {
      if (channel === '인스타그램' && row.upload_url && !isInstagramPostUrl(row.upload_url)) {
        skipped++
        results.push({
          id: row.id,
          channel: row.channel,
          influencer_name: row.influencer_name,
          upload_url: row.upload_url!,
          status: 'skipped',
          error: '게시물 URL이 아님 (프로필/잘못된 링크)',
        })
        continue
      }

      const metrics = metricsByUrl.get(row.upload_url!)
      if (!metrics) {
        skipped++
        results.push({
          id: row.id,
          channel: row.channel,
          influencer_name: row.influencer_name,
          upload_url: row.upload_url!,
          status: 'skipped',
          error: 'Apify 결과에서 URL 매칭 실패',
        })
        continue
      }

      if (!dryRun) {
        const patch: Record<string, unknown> = {
          views: metrics.views,
          likes: metrics.likes,
          saves: metrics.saves,
          comments: metrics.comments,
          views_source: metrics.views_source,
        }
        if (trackMetricsUpdatedAt) {
          patch.metrics_updated_at = new Date().toISOString()
        }

        const { error: upErr } = await supabase.from('contents').update(patch).eq('id', row.id)

        if (upErr) {
          errors++
          results.push({
            id: row.id,
            channel: row.channel,
            influencer_name: row.influencer_name,
            upload_url: row.upload_url!,
            status: 'error',
            error: upErr.message,
          })
          continue
        }
      }

      updated++
      results.push({
        id: row.id,
        channel: row.channel,
        influencer_name: row.influencer_name,
        upload_url: row.upload_url!,
        status: 'updated',
        metrics,
      })
    }
  }

  return {
    total: rows.length,
    updated,
    skipped,
    errors,
    dryRun,
    results,
  }
}
