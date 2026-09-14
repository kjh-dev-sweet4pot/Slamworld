/**
 * BoardingPass Supabase → Slamworld contents 단방향 갱신.
 * 두 프로젝트는 따로 둔다. 보딩패스가 원본.
 *
 *   node scripts/sync-from-boardingpass.mjs           # 미리보기
 *   node scripts/sync-from-boardingpass.mjs --apply   # 한 번 반영
 * 배포 후 Vercel Cron 이 매일 09:00 KST 에 /api/sync-boardingpass 를 호출한다.
 *
 * 읽기: ../BoardingPass-meeting/.env (또는 BP_SUPABASE_URL + BP_SUPABASE_SERVICE_ROLE_KEY)
 * 쓰기: 이 프로젝트 .env 의 SUPABASE_SERVICE_ROLE_KEY
 * 링크 없는 방문(예정만)은 매 실행 중복 삽입이 나서 넣지 않음.
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv(path) {
  if (!existsSync(path)) return {}
  const env = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i === -1) continue
    const key = trimmed.slice(0, i).trim()
    const value = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    if (key) env[key] = value
  }
  return env
}

export function urlKey(url) {
  if (!url) return ''
  let u = String(url).trim()
  if (!u) return ''
  try {
    const x = new URL(u)
    x.hash = ''
    x.search = ''
    u = x.toString().replace(/\/$/, '').toLowerCase()
  } catch {
    u = u.split('?')[0].replace(/\/$/, '').toLowerCase()
  }
  const ig = u.match(/instagram\.com\/(?:p|reel|tv)\/([^/]+)/)
  if (ig) return `ig:${ig[1]}`
  const tt = u.match(/tiktok\.com\/.*?video\/(\d+)/)
  if (tt) return `tt:${tt[1]}`
  const xhs = u.match(/(?:explore|item|discovery\/item)\/([0-9a-f]{16,})/i)
  if (xhs) return `xhs:${xhs[1].toLowerCase()}`
  const short = u.match(/xhslink\.com\/(?:a\/)?([^/?]+)/)
  if (short) return `xhss:${short[1]}`
  return u
}

export function channelOf(platform, url) {
  const fromUrl = /xiaohongshu|xhslink|rednote/i.test(url || '')
    ? '샤오홍슈'
    : /tiktok/i.test(url || '')
      ? '틱톡'
      : /instagram|instagr\.am/i.test(url || '')
        ? '인스타그램'
        : /youtube|youtu\.be/i.test(url || '')
          ? '유튜브'
          : ''
  if (fromUrl) return fromUrl
  if (platform === 'xiaohongshu') return '샤오홍슈'
  if (platform === 'tiktok') return '틱톡'
  if (platform === 'instagram') return '인스타그램'
  if (platform === 'youtube') return '유튜브'
  if (platform === 'naver_blog') return '네이버'
  return '기타'
}

export function publishStatusOf(link) {
  if (link.content_status === '반려' || link.status === 'rejected') return null
  if (link.content_status === '발행완료' || link.status === 'approved') return '발행완료'
  if (link.content_status === '제출' || link.content_status === '승인' || link.status === 'submitted') return '진행중'
  return '예정'
}

function posInt(n) {
  const x = Number(n)
  if (!Number.isFinite(x) || x <= 0) return null
  return Math.round(x)
}

function day(value) {
  if (!value) return null
  return String(value).slice(0, 10)
}

export function toContent(link) {
  const status = publishStatusOf(link)
  if (!status) return null
  const href = (link.publish_url || link.url || '').trim()
  const key = urlKey(href)
  if (!key) return null
  const alloc = link.allocations || {}
  const influencer = link.influencers || {}
  const name = (influencer.name || '').trim()
  if (!name) return null
  const views = posInt(link.views)
  return {
    key,
    row: {
      campaign: alloc.campaigns?.name || '미지정',
      location: alloc.stores?.name || '미지정',
      brands: alloc.companies?.name || null,
      influencer_name: name,
      sns_id: influencer.instagram_handle || null,
      profile_url: influencer.sns_url || null,
      channel: channelOf(link.platform, href),
      follower_count: posInt(influencer.followers),
      visit_date: day(alloc.visit_date) || day(link.published_at),
      product: alloc.products?.name || null,
      upload_url: href,
      publish_status: status,
      views,
      likes: posInt(link.likes),
      saves: posInt(link.saves),
      comments: posInt(link.comments),
      views_source: views ? 'measured' : 'none',
      metrics_updated_at: link.metrics_collected_at || null,
    },
  }
}

async function allRows(base, key, table, select) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${base}/rest/v1/${table}?select=${encodeURIComponent(select)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` },
    })
    if (!res.ok) throw new Error(`${table} ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const batch = await res.json()
    rows.push(...batch)
    if (batch.length < 1000) break
  }
  return rows
}

const LINK_SELECT = [
  'url', 'publish_url', 'platform', 'content_status', 'status',
  'published_at', 'views', 'likes', 'comments', 'saves', 'metrics_collected_at',
  'influencers(name,sns_url,instagram_handle,followers)',
  'allocations(visit_date,stores(name),companies(name),campaigns(name),products(name))',
].join(',')

function patchFrom(row, existingCampaign) {
  const patch = { ...row }
  if (patch.campaign === '미지정') patch.campaign = existingCampaign || '미지정'
  for (const k of ['views', 'likes', 'saves', 'comments', 'follower_count', 'metrics_updated_at', 'brands', 'product', 'sns_id', 'profile_url', 'visit_date']) {
    if (patch[k] == null) delete patch[k]
  }
  return patch
}

async function mapPool(items, limit, fn) {
  let i = 0
  async function worker() {
    while (i < items.length) {
      const cur = items[i]
      i += 1
      await fn(cur)
    }
  }
  const n = Math.min(limit, items.length)
  if (n === 0) return
  await Promise.all(Array.from({ length: n }, () => worker()))
}

export async function runBoardingpassSync({ apply = false } = {}) {
  const swEnv = { ...loadEnv(resolve(root, '.env')), ...process.env }
  const bpEnv = {
    ...loadEnv(process.env.BP_ENV || resolve(root, '../BoardingPass-meeting/.env')),
    ...process.env,
  }
  const bpUrl = process.env.BP_SUPABASE_URL || bpEnv.NEXT_PUBLIC_SUPABASE_URL
  const bpKey = process.env.BP_SUPABASE_SERVICE_ROLE_KEY || bpEnv.SUPABASE_SERVICE_ROLE_KEY
  const swUrl = swEnv.NEXT_PUBLIC_SUPABASE_URL
  const swKey = swEnv.SUPABASE_SERVICE_ROLE_KEY
  if (!bpUrl || !bpKey) throw new Error('BoardingPass URL/service role 이 없습니다.')
  if (!swUrl) throw new Error('Slamworld NEXT_PUBLIC_SUPABASE_URL 이 없습니다.')

  const links = await allRows(bpUrl, bpKey, 'creator_links', LINK_SELECT)
  const mapped = []
  const seen = new Set()
  let skipped = 0
  for (const link of links) {
    const item = toContent(link)
    if (!item || seen.has(item.key)) {
      skipped += 1
      continue
    }
    seen.add(item.key)
    mapped.push(item)
  }

  const swReadKey = swKey || swEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const existing = await allRows(swUrl, swReadKey, 'contents', 'id,upload_url,campaign')
  const byKey = new Map()
  for (const row of existing) {
    const key = urlKey(row.upload_url)
    if (!key) continue
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(row)
  }

  const updates = []
  const inserts = []
  for (const item of mapped) {
    const hits = byKey.get(item.key)
    if (hits?.length) updates.push({ ids: hits.map(h => h.id), row: item.row, campaign: hits[0].campaign })
    else inserts.push(item.row)
  }

  console.log(`boardingpass 링크 ${links.length} → 컨텐츠 ${mapped.length} (건너뜀 ${skipped})`)
  console.log(`slamworld 기존 ${existing.length} · 갱신 ${updates.length} · 추가 ${inserts.length}`)
  console.log('링크 없는 방문(예정)은 넣지 않습니다. 보딩패스에만 있는 기존 행도 지우지 않습니다.')

  const summary = {
    links: links.length,
    mapped: mapped.length,
    skipped,
    existing: existing.length,
    update: updates.length,
    insert: inserts.length,
    applied: false,
  }
  if (!apply) {
    console.log('미리보기입니다. 반영하려면 --apply')
    return summary
  }
  if (!swKey) {
    throw new Error('Slamworld SUPABASE_SERVICE_ROLE_KEY 가 .env 에 없습니다. Dashboard → Settings → API 에서 넣어 주세요.')
  }

  const jobs = updates.flatMap(item => {
    const patch = patchFrom(item.row, item.campaign)
    return item.ids.map(id => ({ id, patch }))
  })
  let updated = 0
  await mapPool(jobs, 8, async ({ id, patch }) => {
    const res = await fetch(`${swUrl}/rest/v1/contents?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: swKey,
        Authorization: `Bearer ${swKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error(`update ${id} ${res.status}: ${(await res.text()).slice(0, 200)}`)
    updated += 1
  })

  for (let i = 0; i < inserts.length; i += 100) {
    const chunk = inserts.slice(i, i + 100)
    const res = await fetch(`${swUrl}/rest/v1/contents`, {
      method: 'POST',
      headers: {
        apikey: swKey,
        Authorization: `Bearer ${swKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(chunk),
    })
    if (!res.ok) throw new Error(`insert ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  console.log(`반영 완료. 갱신 ${updated}행 · 추가 ${inserts.length}행`)
  return { ...summary, applied: true, updatedRows: updated }
}

if (process.env.SYNC_BP_SELF_CHECK === '1') {
  if (urlKey('https://www.instagram.com/p/DHLKFeSzGul/?igsh=1') !== 'ig:dhlkfeszgul') throw new Error('ig key')
  if (urlKey('https://www.xiaohongshu.com/explore/6a431f47000000001503e1af') !== 'xhs:6a431f47000000001503e1af') throw new Error('xhs key')
  if (publishStatusOf({ status: 'rejected', content_status: '반려' }) !== null) throw new Error('reject')
  if (publishStatusOf({ status: 'approved', content_status: null }) !== '발행완료') throw new Error('approved')
  if (channelOf('etc', 'https://xhslink.com/a/abc') !== '샤오홍슈') throw new Error('channel')
  console.log('sync-from-boardingpass self-check ok')
} else if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runBoardingpassSync({ apply: process.argv.includes('--apply') }).catch(err => {
    console.error(err.message || err)
    process.exit(1)
  })
}
