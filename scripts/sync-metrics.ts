/**
 * Apify로 TikTok / Instagram / 小红书 / Douyin 지표 동기화
 *
 * Usage:
 *   npm run sync-metrics -- --dry-run --limit 5
 *   npm run sync-metrics -- --channel tiktok
 *   npm run sync-metrics -- --channel instagram --limit 20
 *
 * Required .env:
 *   APIFY_API_TOKEN
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { syncContentMetrics } from '../lib/apify/sync-metrics'
import type { SyncChannel } from '../lib/apify/types'
import { SYNC_CHANNELS } from '../lib/apify/types'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i === -1) continue
    const k = trimmed.slice(0, i).trim()
    const v = trimmed.slice(i + 1).trim()
    if (!process.env[k]) process.env[k] = v
  }
}

const CHANNEL_ALIAS: Record<string, SyncChannel> = {
  instagram: '인스타그램',
  insta: '인스타그램',
  tiktok: '틱톡',
  xhs: '샤오홍슈',
  xiaohongshu: '샤오홍슈',
  rednote: '샤오홍슈',
  douyin: '도우인',
  dy: '도우인',
}

function parseArgs() {
  const args = process.argv.slice(2)
  let dryRun = false
  let limit: number | undefined
  let channels: SyncChannel[] | undefined
  let ids: number[] | undefined

  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--dry-run') dryRun = true
    else if (a === '--limit' && args[i + 1]) limit = parseInt(args[++i], 10)
    else if (a === '--ids' && args[i + 1]) {
      ids = args[++i].split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n))
    }
    else if (a === '--channel' && args[i + 1]) {
      const raw = args[++i].toLowerCase()
      const ch = CHANNEL_ALIAS[raw] ?? (raw as SyncChannel)
      if (SYNC_CHANNELS.includes(ch as SyncChannel)) {
        channels = [ch as SyncChannel]
      } else {
        console.error(`Unknown channel: ${raw}. Use: ${SYNC_CHANNELS.join(', ')}`)
        process.exit(1)
      }
    }
  }

  return { dryRun, limit, channels, ids }
}

async function main() {
  loadEnv()
  const opts = parseArgs()

  console.log('Apify metrics sync starting…', {
    dryRun: opts.dryRun,
    limit: opts.limit,
    ids: opts.ids,
    channels: opts.channels ?? SYNC_CHANNELS,
  })

  const summary = await syncContentMetrics({
    dryRun: opts.dryRun,
    limit: opts.limit,
    ids: opts.ids,
    channels: opts.channels,
  })

  console.log('\n--- Summary ---')
  console.log(`Total rows : ${summary.total}`)
  console.log(`Updated    : ${summary.updated}${summary.dryRun ? ' (dry-run)' : ''}`)
  console.log(`Skipped    : ${summary.skipped}`)
  console.log(`Errors     : ${summary.errors}`)

  const failed = summary.results.filter(r => r.status === 'error')
  if (failed.length) {
    console.log('\n--- Errors (first 10) ---')
    for (const r of failed.slice(0, 10)) {
      console.log(`#${r.id} ${r.influencer_name} (${r.channel}): ${r.error}`)
    }
  }

  const sample = summary.results.filter(r => r.status === 'updated').slice(0, 5)
  if (sample.length) {
    console.log('\n--- Sample updates ---')
    for (const r of sample) {
      console.log(`#${r.id} ${r.influencer_name}:`, r.metrics)
    }
  }

  if (summary.errors > 0) process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
