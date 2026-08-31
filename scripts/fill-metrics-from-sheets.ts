/**
 * 엑셀 시트 → DB contents 메트릭 보강 (likes/saves/comments/views)
 *
 * Usage:
 *   npx tsx scripts/fill-metrics-from-sheets.ts --dry-run
 *   npx tsx scripts/fill-metrics-from-sheets.ts
 */
import { execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { estimateChannelViews, usesEstimatedViews } from '../lib/content-views'
import { createAdminSupabase } from '../lib/supabase-admin'
import { urlMatchKeys } from '../lib/apify/url-keys'

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

loadEnv()

const dryRun = process.argv.includes('--dry-run')
const PY = '/tmp/xlsx-venv/bin/python3'
const PARSER = resolve(process.cwd(), 'scripts/parse-owm-sheets.py')

type SheetRecord = {
  source: string
  urls: string[]
  names: string[]
  sns_ids: string[]
  channel: string | null
  views: number | null
  likes: number | null
  saves: number | null
  comments: number | null
}

type DbRow = {
  id: number
  influencer_name: string
  sns_id: string | null
  channel: string
  upload_url: string | null
  profile_url: string | null
  likes: number | null
  saves: number | null
  comments: number | null
  views: number | null
  views_estimated: number | null
  views_est_low: number | null
  views_est_high: number | null
  views_source: string | null
}

function normName(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function isPostUrl(u: string | null | undefined): boolean {
  if (!u) return false
  try {
    const path = new URL(u).pathname
    return /\/(p|reels?|tv|video)\//i.test(path) || /(vt|vm)\.tiktok\.com/i.test(u)
      || /xhslink\.|xiaohongshu\.com\/(?:discovery|explore)/i.test(u)
      || /douyin\.com\/video/i.test(u) || /v\.douyin\.com/i.test(u)
      || /weibo\.com\/\d+\//i.test(u)
  } catch {
    return false
  }
}

function scoreRecord(r: SheetRecord): number {
  return [r.views, r.likes, r.saves, r.comments].filter(v => v != null).length
}

function mergeRecords(records: SheetRecord[]): SheetRecord[] {
  const byKey = new Map<string, SheetRecord>()
  for (const r of records) {
    const keys = [
      ...r.urls.flatMap(u => urlMatchKeys(u)),
      ...r.names.map(n => `name:${n}`),
      ...r.sns_ids.map(s => `sns:${s.toLowerCase()}`),
    ]
    for (const key of keys) {
      const prev = byKey.get(key)
      if (!prev || scoreRecord(r) > scoreRecord(prev)) {
        byKey.set(key, r)
      }
    }
  }
  return [...new Set(byKey.values())]
}

function findSheetRecord(
  row: DbRow,
  index: Map<string, SheetRecord>,
  all: SheetRecord[],
): SheetRecord | undefined {
  const n = normName(row.influencer_name)
  const urls = [row.upload_url, row.profile_url].filter(Boolean) as string[]

  if (!isPostUrl(row.upload_url)) {
    const byNameChannel = all
      .filter(r => r.names.includes(n) && (!r.channel || r.channel === row.channel))
      .sort((a, b) => scoreRecord(b) - scoreRecord(a))
    if (byNameChannel[0]) return byNameChannel[0]
  }

  for (const u of urls) {
    for (const key of urlMatchKeys(u)) {
      const hit = index.get(key)
      if (hit) return hit
    }
  }

  const byName = index.get(`name:${n}`)
  if (byName && (!byName.channel || byName.channel === row.channel)) return byName

  if (row.sns_id) {
    const bySns = index.get(`sns:${row.sns_id.toLowerCase()}`)
    if (bySns) return bySns
  }

  return all.find(
    r =>
      r.names.includes(n) &&
      (!r.channel || r.channel === row.channel) &&
      (r.urls.length === 0 || urls.some(u => r.urls.some(ru => urlMatchKeys(u).some(k => urlMatchKeys(ru).includes(k))))),
  )
}

function buildPatch(row: DbRow, sheet: SheetRecord): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {}
  const postUrl = sheet.urls.find(isPostUrl)
  if (postUrl && !isPostUrl(row.upload_url)) patch.upload_url = postUrl

  if (sheet.likes != null && row.likes == null) patch.likes = sheet.likes
  if (sheet.saves != null && row.saves == null) patch.saves = sheet.saves
  if (sheet.comments != null && row.comments == null) patch.comments = sheet.comments

  if (sheet.views != null && row.views == null && !usesEstimatedViews(row.channel)) {
    patch.views = sheet.views
    patch.views_source = 'measured'
  }

  if (usesEstimatedViews(row.channel)) {
    const likes = (patch.likes as number | undefined) ?? row.likes
    const saves = (patch.saves as number | undefined) ?? row.saves
    const comments = (patch.comments as number | undefined) ?? row.comments
    const est = estimateChannelViews(row.channel, { likes, saves, comments })
    if (est && (row.views_estimated == null || Object.keys(patch).some(k => ['likes', 'saves', 'comments'].includes(k)))) {
      patch.views_estimated = est.views_estimated
      patch.views_est_low = est.views_est_low
      patch.views_est_high = est.views_est_high
      patch.views_source = 'estimated'
    }
  }

  return Object.keys(patch).length ? patch : null
}

async function main() {
  if (!existsSync(PY)) {
    throw new Error('Python venv not found at /tmp/xlsx-venv — run parse-owm-sheets.py setup first')
  }
  const raw = execFileSync(PY, [PARSER], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
  const records = JSON.parse(raw) as SheetRecord[]
  const merged = mergeRecords(records)

  const index = new Map<string, SheetRecord>()
  for (const r of merged) {
    for (const u of r.urls) {
      for (const key of urlMatchKeys(u)) index.set(key, r)
    }
    for (const n of r.names) index.set(`name:${n}`, r)
    for (const s of r.sns_ids) index.set(`sns:${s.toLowerCase()}`, r)
  }

  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('contents')
    .select(
      'id, influencer_name, sns_id, channel, upload_url, profile_url, likes, saves, comments, views, views_estimated, views_est_low, views_est_high, views_source',
    )
    .order('id')
  if (error) throw new Error(error.message)

  let updated = 0
  let unmatched = 0
  let noop = 0

  for (const row of (data ?? []) as DbRow[]) {
    const sheet = findSheetRecord(row, index, merged)
    if (!sheet) {
      if (row.likes == null || row.saves == null || row.comments == null) unmatched++
      continue
    }
    const patch = buildPatch(row, sheet)
    if (!patch) {
      noop++
      continue
    }

    updated++
    if (dryRun && updated <= 15) {
      console.log(
        '[dry-run] #%d %s (%s) ← %s',
        row.id,
        row.influencer_name,
        row.channel,
        sheet.source,
        patch,
      )
    }

    if (!dryRun) {
      const { error: upErr } = await supabase.from('contents').update(patch).eq('id', row.id)
      if (upErr) throw new Error(`#${row.id}: ${upErr.message}`)
    }
  }

  console.log(
    '%s 파싱 %d건 → %d행 업데이트, %d행 변경없음, %d행 시트미매칭(빈칸)',
    dryRun ? '[dry-run]' : '완료:',
    records.length,
    updated,
    noop,
    unmatched,
  )
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
