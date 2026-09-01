/**
 * 인플루언서 프로필 사진을 Apify로 수집해 Supabase Storage에 저장
 *
 * Usage:
 *   npm run sync-profile-photos -- --dry-run --limit 5
 *   npm run sync-profile-photos -- --channel instagram
 *   npm run sync-profile-photos
 *
 * Required .env:
 *   APIFY_API_TOKEN
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { syncProfilePhotos } from '../lib/apify/profile-photos'
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
  let names: string[] | undefined

  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--dry-run') dryRun = true
    else if (a === '--limit' && args[i + 1]) limit = parseInt(args[++i], 10)
    else if (a === '--name' && args[i + 1]) {
      names = names ?? []
      names.push(args[++i])
    }
    else if (a === '--channel' && args[i + 1]) {
      const raw = args[++i].toLowerCase()
      const ch = CHANNEL_ALIAS[raw] ?? (raw as SyncChannel)
      if (SYNC_CHANNELS.includes(ch as SyncChannel)) {
        channels = [ch as SyncChannel]
      } else {
        console.error(`Unknown channel: ${raw}`)
        process.exit(1)
      }
    }
  }

  return { dryRun, limit, channels, names }
}

async function main() {
  loadEnv()
  const opts = parseArgs()
  console.log('Profile photo sync starting…', {
    dryRun: opts.dryRun,
    limit: opts.limit,
    channels: opts.channels ?? SYNC_CHANNELS,
    names: opts.names,
  })

  const summary = await syncProfilePhotos(opts)
  console.log('\n--- Summary ---')
  console.log(`Accounts  : ${summary.accounts}`)
  console.log(`Uploaded  : ${summary.uploaded}${summary.dryRun ? ' (dry-run)' : ''}`)
  console.log(`Skipped   : ${summary.skipped}`)
  console.log(`Errors    : ${summary.errors}`)
  if (summary.errors > 0) process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
