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
 * 회원사·예산은 companies / company_budget_rounds. 테이블이 없으면 supabase/add-companies.sql 먼저.
 * 프로필 사진은 influencer-avatars 에서 profile-photos/by-id 로 복사.
 * URL 컬럼이 없으면 카드의 by-id 폴백으로 보이고, 이미 올린 파일은 다시 안 덮어씀.
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isTestCompany } from '../lib/test-companies.mjs'

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

const PLACEHOLDER_VISIT = '2026-01-01'
const IG_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

function ymdFromUnixSec(sec) {
  if (!Number.isFinite(sec) || sec < 1_500_000_000 || sec > 2_000_000_000) return ''
  return new Date(sec * 1000).toISOString().slice(0, 10)
}

/** 게시 URL에 박힌 발행일. 샤오홍슈 노트 id · 인스타 숏코드 · 틱톡 snowflake. Apify 없음. */
export function postedDayFromUrl(url) {
  const raw = String(url || '')
  const xhs = raw.match(/([0-9a-f]{24})/i)
  if (xhs) {
    const dayFromId = ymdFromUnixSec(parseInt(xhs[1].slice(0, 8), 16))
    if (dayFromId) return dayFromId
  }
  const ig = raw.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#]+)/i)
  if (ig) {
    let id = 0n
    for (const c of ig[1]) {
      const i = IG_ALPHABET.indexOf(c)
      if (i < 0) return ''
      id = id * 64n + BigInt(i)
    }
    const ms = Number(id >> 23n) + 1314220021721
    if (!Number.isFinite(ms)) return ''
    const d = new Date(ms)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  }
  const tt = raw.match(/tiktok\.com\/.*?video\/(\d+)/i)
  if (tt) return ymdFromUnixSec(Number(BigInt(tt[1]) >> 32n))
  return ''
}

export function chooseVisitDate(visit, published, url) {
  const v = day(visit)
  const posted = day(published) || postedDayFromUrl(url) || null
  if (v && v !== PLACEHOLDER_VISIT) return v
  return posted || v
}

async function fillPlaceholderPostedDates(rows) {
  const pending = rows.filter(row => row.visit_date === PLACEHOLDER_VISIT && /xhslink\.(com|cn)/i.test(row.upload_url || ''))
  await mapPool(pending, 4, async row => {
    const posted = await resolveXhsShort(row.upload_url)
    if (posted) row.visit_date = posted
  })
}

export async function backfillPlaceholderVisitDates({ apply = false } = {}) {
  const swEnv = { ...loadEnv(resolve(root, '.env')), ...process.env }
  const swUrl = swEnv.NEXT_PUBLIC_SUPABASE_URL
  const swKey = swEnv.SUPABASE_SERVICE_ROLE_KEY
  if (!swUrl || !swKey) throw new Error('Slamworld URL/service role 이 없습니다.')
  const rows = await allRows(swUrl, swKey, 'contents', 'id,upload_url,visit_date')
  const jobs = []
  for (const row of rows) {
    if (row.visit_date !== PLACEHOLDER_VISIT) continue
    const posted = postedDayFromUrl(row.upload_url) || await resolveXhsShort(row.upload_url)
    if (!posted || posted === PLACEHOLDER_VISIT) continue
    jobs.push({ id: row.id, visit_date: posted })
  }
  console.log(`placeholder ${PLACEHOLDER_VISIT} → 발행일 ${jobs.length}건`)
  if (!apply) {
    console.log('미리보기입니다. 반영하려면 --fix-dates --apply')
    return { fix: jobs.length, applied: false }
  }
  await mapPool(jobs, 8, async job => {
    const res = await fetch(`${swUrl}/rest/v1/contents?id=eq.${job.id}`, {
      method: 'PATCH',
      headers: {
        apikey: swKey,
        Authorization: `Bearer ${swKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ visit_date: job.visit_date }),
    })
    if (!res.ok) throw new Error(`date ${job.id} ${res.status}: ${(await res.text()).slice(0, 160)}`)
  })
  console.log(`발행일 반영 ${jobs.length}건`)
  return { fix: jobs.length, applied: true }
}

async function resolveXhsShort(url) {
  if (!/xhslink\.(com|cn)/i.test(url || '')) return ''
  try {
    const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0' } })
    const loc = res.headers.get('location') || ''
    if (!/xiaohongshu\.com/i.test(loc)) return ''
    return postedDayFromUrl(loc)
  } catch {
    return ''
  }
}

const BP_AVATAR_BUCKET = 'influencer-avatars'
const SW_PHOTO_BUCKET = 'profile-photos'

export function avatarObjectPath(raw) {
  if (!raw) return ''
  const s = String(raw).trim()
  if (!s || /^https?:\/\//i.test(s)) return ''
  return s.replace(/^influencer-avatars\//, '').replace(/^\/+/, '')
}

function encodeStoragePath(path) {
  return path.split('/').filter(Boolean).map(encodeURIComponent).join('/')
}

/** photoPath → content ids that still have no profile_image_url. Inserts aren't in existing yet. */
export function photoTargets(mapped, existingRows) {
  const byKey = new Map()
  for (const row of existingRows) {
    const key = urlKey(row.upload_url)
    if (!key) continue
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(row)
  }
  const jobs = new Map()
  let pendingInserts = 0
  for (const item of mapped) {
    if (!item.photoPath) continue
    const hits = byKey.get(item.key)
    if (!hits?.length) {
      pendingInserts += 1
      continue
    }
    for (const hit of hits) {
      if (hit.profile_image_url) continue
      let ids = jobs.get(item.photoPath)
      if (!ids) {
        ids = []
        jobs.set(item.photoPath, ids)
      }
      if (!ids.includes(hit.id)) ids.push(hit.id)
    }
  }
  const rows = [...jobs.values()].reduce((n, ids) => n + ids.length, 0)
  return { jobs, pendingInserts, rows }
}

/** 숫자만 = 보딩패스 stores.name 에 SKU가 들어간 오수입. BP store-name.ts 와 동일. */
export function branchLocation(name) {
  const t = String(name || '').trim()
  if (!t || /^\d+$/.test(t)) return '미지정'
  return t
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
    photoPath: avatarObjectPath(influencer.profile_image_path),
    row: {
      campaign: alloc.campaigns?.name || '미지정',
      location: branchLocation(alloc.stores?.name),
      brands: alloc.companies?.name || null,
      influencer_name: name,
      sns_id: influencer.instagram_handle || null,
      profile_url: influencer.sns_url || null,
      channel: channelOf(link.platform, href),
      follower_count: posInt(influencer.followers),
      visit_date: chooseVisitDate(alloc.visit_date, link.published_at, href),
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
  'influencers(name,sns_url,instagram_handle,followers,profile_image_path)',
  'allocations(visit_date,stores(name),companies(name,login_id),campaigns(name),products(name))',
].join(',')

const COMPANY_SELECT = 'id,name,login_id,aliases,is_active,contract_stage,budget_amount,spent_amount,first_meet_on,planned_start_on,planned_end_on'
const ROUND_SELECT = 'id,company_id,company_name,label,period_month,amount_krw,deposit_status,usage_status,kind'

async function rest(base, key, path, init = {}) {
  const res = await fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(init.headers || {}),
    },
  })
  return res
}

async function pullCompanies(bpUrl, bpKey) {
  const all = await allRows(bpUrl, bpKey, 'companies', COMPANY_SELECT)
  const skipped = all.filter(isTestCompany)
  const companies = all.filter(c => !isTestCompany(c))
  const skipIds = new Set(skipped.map(c => c.id))
  const rounds = (await allRows(bpUrl, bpKey, 'company_budget_rounds', ROUND_SELECT))
    .filter(r => !skipIds.has(r.company_id) && !isTestCompany({ name: r.company_name }))
  return { companies, rounds, skipped }
}

async function writeCompanies(swUrl, swKey, companies, rounds, skipped = []) {
  const now = new Date().toISOString()
  const companyRows = companies.map(c => ({
    id: c.id,
    name: c.name,
    login_id: c.login_id,
    aliases: c.aliases || [],
    is_active: c.is_active !== false,
    contract_stage: c.contract_stage,
    budget_amount: c.budget_amount,
    spent_amount: c.spent_amount,
    first_meet_on: c.first_meet_on,
    planned_start_on: c.planned_start_on,
    planned_end_on: c.planned_end_on,
    synced_at: now,
  }))
  // Slamworld 기존 CHECK: deposit ∈ 입금 완료|입금 지연|검토 중|협의중
  // usage ∈ 기 소진|가용|사용 예정|예상|예산 협의중
  // 입점 논의중 → 검토 중 (CHECK 통과 · UI에서 입점 논의중으로 복원)
  const slamDeposit = (raw) => {
    const v = String(raw || '').trim()
    if (v === '입점 논의중') return '검토 중'
    if (v === '검토중') return '검토 중'
    if (v === '입금 완료' || v === '입금 지연' || v === '검토 중' || v === '협의중') return v
    return '협의중'
  }
  const slamUsage = (raw) => {
    const v = String(raw || '').trim()
    if (v === '기소진' || v === '기 소진') return '기 소진'
    if (v === '협의중' || v === '예산 협의중') return '예산 협의중'
    if (v === '가용' || v === '사용 예정' || v === '예상') return v
    return '예산 협의중'
  }
  const roundRows = rounds.map(r => ({
    id: r.id,
    company_id: r.company_id,
    company_name: r.company_name,
    label: r.label,
    period_month: r.period_month,
    amount_krw: r.amount_krw,
    deposit_status: slamDeposit(r.deposit_status),
    usage_status: slamUsage(r.usage_status),
    kind: r.kind || '입금',
    synced_at: now,
  }))

  const upCompanies = await rest(swUrl, swKey, 'companies?on_conflict=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(companyRows),
  })
  if (!upCompanies.ok) {
    const text = await upCompanies.text()
    if (/companies|schema cache|does not exist/i.test(text)) {
      throw new Error('companies 테이블이 없습니다. supabase/add-companies.sql 을 Slamworld SQL editor에서 실행하세요.')
    }
    throw new Error(`companies ${upCompanies.status}: ${text.slice(0, 200)}`)
  }

  const upRounds = await rest(swUrl, swKey, 'company_budget_rounds?on_conflict=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(roundRows),
  })
  if (!upRounds.ok) throw new Error(`budget rounds ${upRounds.status}: ${(await upRounds.text()).slice(0, 200)}`)

  if (roundRows.length) {
    const keep = roundRows.map(r => r.id).join(',')
    const drop = await rest(swUrl, swKey, `company_budget_rounds?id=not.in.(${keep})`, { method: 'DELETE' })
    if (!drop.ok) throw new Error(`budget round prune ${drop.status}: ${(await drop.text()).slice(0, 200)}`)
  }
  const skipIds = skipped.map(c => c.id).filter(Boolean)
  if (skipIds.length) {
    const dropCo = await rest(swUrl, swKey, `companies?id=in.(${skipIds.join(',')})`, { method: 'DELETE' })
    if (!dropCo.ok && dropCo.status !== 404) {
      throw new Error(`test company prune ${dropCo.status}: ${(await dropCo.text()).slice(0, 200)}`)
    }
  }
}

async function loadContentPhotos(base, key) {
  try {
    return await allRows(base, key, 'contents', 'id,upload_url,profile_image_url')
  } catch (e) {
    if (/profile_image_url/i.test(String(e.message || e))) return null
    throw e
  }
}

async function listStoredPhotoIds(base, key) {
  const ids = new Set()
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${base}/storage/v1/object/list/${SW_PHOTO_BUCKET}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefix: 'by-id/', limit: 1000, offset }),
    })
    if (!res.ok) return ids
    const rows = await res.json()
    for (const row of rows) {
      const id = Number(String(row.name || '').split('/').pop())
      if (Number.isInteger(id)) ids.add(id)
    }
    if (!Array.isArray(rows) || rows.length < 1000) break
  }
  return ids
}

async function ensurePhotoBucket(base, key) {
  const res = await fetch(`${base}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: SW_PHOTO_BUCKET, name: SW_PHOTO_BUCKET, public: true }),
  })
  if (res.ok || res.status === 409) return
  const text = await res.text()
  if (/already exists/i.test(text)) return
  throw new Error(`bucket ${res.status}: ${text.slice(0, 120)}`)
}

async function downloadBpAvatar(bpUrl, bpKey, path) {
  const res = await fetch(`${bpUrl}/storage/v1/object/${BP_AVATAR_BUCKET}/${encodeStoragePath(path)}`, {
    headers: { apikey: bpKey, Authorization: `Bearer ${bpKey}` },
  })
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 100) return null
  const type = res.headers.get('content-type') || 'image/jpeg'
  return { buf, contentType: type.startsWith('image/') ? type : 'image/jpeg' }
}

async function copyBoardingpassPhotos(bpUrl, bpKey, swUrl, swKey, jobs, { writeUrl = false } = {}) {
  // ponytail: 이미 URL이 있거나 by-id 파일이 있으면 다시 안 덮어씀. 사진이 바뀌면 해당 파일/URL을 지우고 재실행.
  let copied = 0
  let errors = 0
  await mapPool([...jobs.entries()], 6, async ([path, ids]) => {
    try {
      const img = await downloadBpAvatar(bpUrl, bpKey, path)
      if (!img) {
        errors += 1
        console.log(`· photo skip ${path}`)
        return
      }
      for (const id of ids) {
        const up = await fetch(`${swUrl}/storage/v1/object/${SW_PHOTO_BUCKET}/by-id/${id}`, {
          method: 'POST',
          headers: {
            apikey: swKey,
            Authorization: `Bearer ${swKey}`,
            'Content-Type': img.contentType,
            'x-upsert': 'true',
          },
          body: img.buf,
        })
        if (!up.ok) throw new Error(`upload ${id} ${up.status}: ${(await up.text()).slice(0, 120)}`)
        if (!writeUrl) continue
        const publicUrl = `${swUrl}/storage/v1/object/public/${SW_PHOTO_BUCKET}/by-id/${id}`
        const patched = await rest(swUrl, swKey, `contents?id=eq.${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ profile_image_url: publicUrl }),
        })
        if (!patched.ok) throw new Error(`patch ${id} ${patched.status}: ${(await patched.text()).slice(0, 120)}`)
      }
      copied += 1
    } catch (e) {
      errors += 1
      console.log(`· photo fail ${path}: ${e.message || e}`)
    }
  })
  return { copied, errors }
}

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
  const mappedByKey = new Map()
  let skipped = 0
  let skippedTest = 0
  for (const link of links) {
    if (isTestCompany(link.allocations?.companies)) {
      skipped += 1
      skippedTest += 1
      continue
    }
    const item = toContent(link)
    if (!item) {
      skipped += 1
      continue
    }
    const prev = mappedByKey.get(item.key)
    if (prev) {
      if (item.photoPath && !prev.photoPath) prev.photoPath = item.photoPath
      skipped += 1
      continue
    }
    mappedByKey.set(item.key, item)
    mapped.push(item)
  }
  await fillPlaceholderPostedDates(mapped.map(item => item.row))

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

  const companyPull = await pullCompanies(bpUrl, bpKey)
  const photoRows = await loadContentPhotos(swUrl, swReadKey)
  const photoPlan = photoTargets(mapped, photoRows || existing.map(row => ({ ...row, profile_image_url: null })))
  console.log(`boardingpass 링크 ${links.length} → 컨텐츠 ${mapped.length} (건너뜀 ${skipped})`)
  console.log(`slamworld 기존 ${existing.length} · 갱신 ${updates.length} · 추가 ${inserts.length}`)
  console.log(`회원사 ${companyPull.companies.length} · 예산 라운드 ${companyPull.rounds.length} (원 단위) · 테스트 제외 ${companyPull.skipped.length}`)
  if (companyPull.skipped.length) {
    console.log(`테스트 회원사: ${companyPull.skipped.map(c => c.name).join(', ')}`)
  }
  if (skippedTest) console.log(`테스트 회원사 콘텐츠 ${skippedTest}건 제외`)
  if (!photoRows) console.log('profile_image_url 컬럼 없음 — Storage by-id 로만 복사합니다. supabase/add-profile-image.sql 을 실행하면 행에도 URL이 붙습니다.')
  console.log(`프로필 사진 ${photoPlan.jobs.size}명 · 빈 행 ${photoPlan.rows} · 신규 ${photoPlan.pendingInserts}`)
  console.log('링크 없는 방문(예정)은 넣지 않습니다. 보딩패스에만 있는 기존 행도 지우지 않습니다.')

  const summary = {
    links: links.length,
    mapped: mapped.length,
    skipped,
    existing: existing.length,
    update: updates.length,
    insert: inserts.length,
    companies: companyPull.companies.length,
    budgetRounds: companyPull.rounds.length,
    skippedTestCompanies: companyPull.skipped.length,
    photos: photoPlan.jobs.size,
    photoRows: photoPlan.rows + photoPlan.pendingInserts,
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
  await writeCompanies(swUrl, swKey, companyPull.companies, companyPull.rounds, companyPull.skipped)

  let photosCopied = 0
  let photoErrors = 0
  try {
    const after = photoRows ? await loadContentPhotos(swUrl, swKey) : null
    const plan = photoTargets(mapped, after || (await allRows(swUrl, swKey, 'contents', 'id,upload_url')).map(row => ({
      ...row,
      profile_image_url: null,
    })))
    if (!photoRows) {
      const stored = await listStoredPhotoIds(swUrl, swKey)
      for (const [path, ids] of plan.jobs) {
        const left = ids.filter(id => !stored.has(id))
        if (left.length) plan.jobs.set(path, left)
        else plan.jobs.delete(path)
      }
    }
    if (plan.jobs.size) {
      await ensurePhotoBucket(swUrl, swKey)
      const copied = await copyBoardingpassPhotos(bpUrl, bpKey, swUrl, swKey, plan.jobs, { writeUrl: !!photoRows })
      photosCopied = copied.copied
      photoErrors = copied.errors
    }
  } catch (e) {
    photoErrors += 1
    console.error(`프로필 사진 복사 실패: ${e.message || e}`)
  }
  console.log(`반영 완료. 갱신 ${updated}행 · 추가 ${inserts.length}행 · 회원사 ${companyPull.companies.length} · 예산 ${companyPull.rounds.length} · 프로필 사진 ${photosCopied}명${photoErrors ? ` (실패 ${photoErrors})` : ''}`)
  return { ...summary, applied: true, updatedRows: updated, photosCopied, photoErrors }
}

if (process.env.SYNC_BP_SELF_CHECK === '1') {
  if (urlKey('https://www.instagram.com/p/DHLKFeSzGul/?igsh=1') !== 'ig:dhlkfeszgul') throw new Error('ig key')
  if (urlKey('https://www.xiaohongshu.com/explore/6a431f47000000001503e1af') !== 'xhs:6a431f47000000001503e1af') throw new Error('xhs key')
  if (publishStatusOf({ status: 'rejected', content_status: '반려' }) !== null) throw new Error('reject')
  if (publishStatusOf({ status: 'approved', content_status: null }) !== '발행완료') throw new Error('approved')
  if (channelOf('etc', 'https://xhslink.com/a/abc') !== '샤오홍슈') throw new Error('channel')
  if (!isTestCompany({ name: '23yearsold', login_id: 'company' })) throw new Error('test 23yearsold')
  if (!isTestCompany({ name: 'Technical', login_id: 'aaa' })) throw new Error('test technical')
  if (isTestCompany({ name: '옵티팜', login_id: 'optipharm' })) throw new Error('test spare real')
  if (postedDayFromUrl('https://www.xiaohongshu.com/discovery/item/6a70b997000000003302f4f7') !== '2026-08-03') throw new Error('xhs posted')
  if (postedDayFromUrl('https://www.instagram.com/p/DHLKFeSzGul/') !== '2025-03-14') throw new Error('ig posted')
  if (chooseVisitDate('2026-01-01', null, 'https://www.xiaohongshu.com/discovery/item/6a70b997000000003302f4f7') !== '2026-08-03') throw new Error('placeholder visit')
  if (chooseVisitDate('2026-08-11', null, 'https://www.xiaohongshu.com/discovery/item/6a70b997000000003302f4f7') !== '2026-08-11') throw new Error('keep real visit')
  if (avatarObjectPath('influencer-avatars/u.jpg') !== 'u.jpg') throw new Error('avatar path')
  if (avatarObjectPath('https://cdn.example/a.jpg') !== '') throw new Error('avatar url')
  const photo = toContent({
    url: 'https://www.instagram.com/p/abc/',
    platform: 'instagram',
    status: 'approved',
    influencers: { name: 'A', profile_image_path: 'influencer-avatars/u.jpg' },
    allocations: {},
  })
  if (!photo || photo.photoPath !== 'u.jpg') throw new Error('content photo')
  if (branchLocation('신사점') !== '신사점') throw new Error('branch keep')
  if (branchLocation('53500') !== '미지정') throw new Error('branch numeric')
  if (branchLocation('') !== '미지정') throw new Error('branch empty')
  if (branchLocation(null) !== '미지정') throw new Error('branch null')
  const targets = photoTargets(
    [
      { key: 'ig:aaa', photoPath: 'u.jpg' },
      { key: 'ig:bbb', photoPath: 'u.jpg' },
      { key: 'ig:ccc', photoPath: 'v.jpg' },
    ],
    [
      { id: 1, upload_url: 'https://www.instagram.com/p/aaa/', profile_image_url: null },
      { id: 2, upload_url: 'https://www.instagram.com/p/bbb/', profile_image_url: 'https://already' },
    ],
  )
  if (targets.jobs.get('u.jpg')?.join() !== '1' || targets.pendingInserts !== 1) throw new Error('photo targets')
  console.log('sync-from-boardingpass self-check ok')
} else if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const run = process.argv.includes('--fix-dates')
    ? backfillPlaceholderVisitDates({ apply: process.argv.includes('--apply') })
    : runBoardingpassSync({ apply: process.argv.includes('--apply') })
  run.catch(err => {
    console.error(err.message || err)
    process.exit(1)
  })
}
