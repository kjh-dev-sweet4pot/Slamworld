import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { runActor } from './client'
import { APIFY_ACTORS, BATCH_SIZE, PROFILE_BUCKET } from './config'
import { buildUrlIndex, findOriginalUrl, urlMatchKeys } from './url-keys'
import type { SyncChannel } from './types'
import { SYNC_CHANNELS } from './types'

const DUMMY_PROFILE = /^(https?:\/\/)?(www\.)?(weibo\.com|v\.douyin\.com)\/?$/i

export interface ProfileRow {
  id: number
  channel: string
  influencer_name: string
  profile_url: string | null
  sns_id: string | null
  upload_url: string | null
  profile_image_url?: string | null
}

export interface ProfileAccount {
  key: string
  channel: SyncChannel
  ids: number[]
  name: string
  profileUrl: string | null
  uploadUrls: string[]
}

export interface ProfileSyncOptions {
  channels?: SyncChannel[]
  limit?: number
  dryRun?: boolean
}

export interface ProfileSyncResult {
  accounts: number
  uploaded: number
  skipped: number
  errors: number
  dryRun: boolean
}

function stripQuery(url: string): string {
  try {
    const u = new URL(url)
    u.search = ''
    u.hash = ''
    return u.toString()
  } catch {
    return url
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function isHttp(s: string | null | undefined): s is string {
  return !!s && /^https?:\/\//i.test(s.trim()) && !DUMMY_PROFILE.test(s.trim())
}

export function resolveProfileUrl(row: ProfileRow): string | null {
  for (const c of [row.profile_url, row.sns_id]) {
    if (isHttp(c)) return c.trim()
  }
  return null
}

export function accountKey(channel: string, profileUrl: string | null, name: string): string {
  if (profileUrl) {
    const keys = urlMatchKeys(profileUrl)
    const stable = keys.find(k => k.startsWith('ig-user:') || k.startsWith('tiktok-user:') || k.startsWith('xhs-user:'))
    return `${channel}|${stable ?? keys[0] ?? profileUrl}`
  }
  return `${channel}|name:${name.trim().toLowerCase()}`
}

function avatarFor(avatars: Map<string, string>, profileUrl: string): string | undefined {
  const direct = avatars.get(profileUrl) ?? avatars.get(stripQuery(profileUrl))
  if (direct) return direct
  for (const k of urlMatchKeys(profileUrl)) {
    const hit = avatars.get(k)
    if (hit) return hit
  }
  const keys = new Set(urlMatchKeys(profileUrl))
  for (const [url, avatar] of avatars) {
    for (const k of urlMatchKeys(url)) {
      if (keys.has(k)) return avatar
    }
  }
}

function pickAvatar(item: Record<string, unknown>): string | null {
  const user = (item.user ?? item.authorMeta ?? item.owner ?? {}) as Record<string, unknown>
  const candidates = [
    item.profilePicUrlHD,
    item.profilePicUrlHd,
    item.profilePicUrl,
    item.profile_pic_url,
    item.avatarUrl,
    item.avatar,
    item.covers?.[0],
    user.avatar,
    user.profilePicUrl,
    user.profile_pic_url,
    (item.authorMeta as Record<string, unknown> | undefined)?.avatar,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && /^https?:\/\//.test(c)) return c
  }
  return null
}

function pickMatchCandidates(item: Record<string, unknown>, channel: SyncChannel): string[] {
  const user = (item.user ?? item.authorMeta ?? {}) as Record<string, unknown>
  const username = (item.username ?? user.uniqueId ?? user.nickname ?? item.uniqueId) as string | undefined
  const profileId = (item.profileId ?? item.user_id ?? user.user_id ?? item.note_id) as string | undefined
  const list = [
    item.inputUrl as string,
    item.url as string,
    item.matchedInput as string,
    item.webVideoUrl as string,
    item.submittedVideoUrl as string,
    item.profileUrl as string,
    user.profileUrl as string,
    username && channel === '인스타그램' ? `https://www.instagram.com/${username}/` : '',
    username && channel === '틱톡' ? `https://www.tiktok.com/@${username}` : '',
    profileId ? `https://www.xiaohongshu.com/user/profile/${profileId}` : '',
  ]
  return list.filter(Boolean)
}

async function scrapeInstagramProfiles(urls: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(urls.map(stripQuery))]
  if (!unique.length) return new Map()
  const index = buildUrlIndex(urls)
  const out = new Map<string, string>()

  for (const batch of chunk(unique, BATCH_SIZE)) {
    const items = await runActor(APIFY_ACTORS.instagram, {
      directUrls: batch,
      resultsType: 'details',
      resultsLimit: 1,
    })
    for (const item of items) {
      const avatar = pickAvatar(item)
      if (!avatar) continue
      const username = typeof item.username === 'string' ? item.username : ''
      const candidates = [
        ...pickMatchCandidates(item, '인스타그램'),
        username ? `https://www.instagram.com/${username}/` : '',
        username ? `https://www.instagram.com/${username}` : '',
      ].filter(Boolean)
      const original = findOriginalUrl(index, candidates)
      if (original) out.set(original, avatar)
      else if (username) out.set(`https://www.instagram.com/${username}/`, avatar)
    }
  }
  return out
}

async function scrapeTikTokProfiles(urls: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(urls.map(stripQuery))]
  if (!unique.length) return new Map()
  const index = buildUrlIndex(urls)
  const out = new Map<string, string>()

  for (const batch of chunk(unique, BATCH_SIZE)) {
    const items = await runActor(APIFY_ACTORS.tiktok, {
      profileURLs: batch,
      resultsPerPage: 1,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    })
    for (const item of items) {
      const avatar = pickAvatar(item)
      if (!avatar) continue
      const original = findOriginalUrl(index, pickMatchCandidates(item, '틱톡'))
      if (original) out.set(original, avatar)
    }
  }
  return out
}

async function scrapeXhsProfiles(urls: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(urls)]
  if (!unique.length) return new Map()
  const index = buildUrlIndex(unique)
  const out = new Map<string, string>()

  for (const batch of chunk(unique, BATCH_SIZE)) {
    const items = await runActor(APIFY_ACTORS.xiaohongshuProfile, {
      profileTargets: batch,
    })
    for (const item of items) {
      const avatar = pickAvatar(item)
      if (!avatar) continue
      const original = findOriginalUrl(index, pickMatchCandidates(item, '샤오홍슈'))
        ?? findOriginalUrl(index, [item.matchedInput as string, item.url as string])
      if (original) out.set(original, avatar)
    }
  }
  return out
}

async function scrapeXhsAvatarsFromPosts(urls: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(urls.filter(u => /xiaohongshu\.com/i.test(u)))]
  if (!unique.length) return new Map()
  const index = buildUrlIndex(unique)
  const out = new Map<string, string>()

  for (const batch of chunk(unique, BATCH_SIZE)) {
    const items = await runActor(APIFY_ACTORS.xiaohongshu, {
      mode: 'post',
      noteUrls: batch,
      maxResultsPerInput: 1,
    })
    for (const item of items) {
      const avatar = pickAvatar(item)
      if (!avatar) continue
      const noteId = (item.note_id ?? item.noteId ?? item.id) as string | undefined
      const original = findOriginalUrl(index, [
        item.url as string,
        item.note_url as string,
        noteId ? `https://www.xiaohongshu.com/discovery/item/${noteId}` : '',
      ])
      if (original) out.set(original, avatar)
    }
  }
  return out
}

async function scrapeAvatars(
  channel: SyncChannel,
  accounts: ProfileAccount[],
): Promise<Map<string, string>> {
  const byUrl = new Map<string, string>()
  const byKey = new Map<string, string>()
  const profileUrls = accounts.map(a => a.profileUrl).filter((u): u is string => !!u)

  if (channel === '인스타그램' && profileUrls.length) {
    for (const [url, avatar] of await scrapeInstagramProfiles(profileUrls)) byUrl.set(url, avatar)
  } else if (channel === '틱톡' && profileUrls.length) {
    for (const [url, avatar] of await scrapeTikTokProfiles(profileUrls)) byUrl.set(url, avatar)
  } else if (channel === '샤오홍슈' && profileUrls.length) {
    for (const [url, avatar] of await scrapeXhsProfiles(profileUrls)) byUrl.set(url, avatar)
  }

  for (const acc of accounts) {
    if (acc.profileUrl) {
      const avatar = avatarFor(byUrl, acc.profileUrl)
      if (avatar) byKey.set(acc.key, avatar)
    }
  }

  const missing = accounts.filter(a => !byKey.has(a.key) && a.uploadUrls.length)
  const postUrls = [...new Set(missing.flatMap(a => a.uploadUrls))]
  if (!postUrls.length) return byKey

  let fromPosts = new Map<string, string>()
  if (channel === '샤오홍슈') fromPosts = await scrapeXhsAvatarsFromPosts(postUrls)
  else if (channel === '틱톡') {
    const index = buildUrlIndex(postUrls)
    for (const batch of chunk(postUrls, BATCH_SIZE)) {
      const items = await runActor(APIFY_ACTORS.tiktok, {
        postURLs: batch,
        resultsPerPage: 1,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      })
      for (const item of items) {
        const avatar = pickAvatar(item)
        if (!avatar) continue
        const original = findOriginalUrl(index, pickMatchCandidates(item, '틱톡'))
        if (original) fromPosts.set(original, avatar)
      }
    }
  }

  for (const acc of missing) {
    for (const u of acc.uploadUrls) {
      const avatar = fromPosts.get(u) ?? avatarFor(fromPosts, u)
      if (avatar) {
        byKey.set(acc.key, avatar)
        break
      }
    }
  }

  return byKey
}

function extFromContentType(ct: string | null, url: string): string {
  if (ct?.includes('png')) return 'png'
  if (ct?.includes('webp')) return 'webp'
  if (ct?.includes('gif')) return 'gif'
  if (/\.png(\?|$)/i.test(url)) return 'png'
  if (/\.webp(\?|$)/i.test(url)) return 'webp'
  return 'jpg'
}

async function downloadImage(url: string): Promise<{ buf: Buffer; contentType: string; ext: string } | null> {
  const tryOnce = async (target: string): Promise<{ buf: Buffer; contentType: string; ext: string } | null> => {
    try {
      const res = await fetch(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          Referer: 'https://www.instagram.com/',
        },
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) return null
      const contentType = res.headers.get('content-type') ?? 'image/jpeg'
      if (!contentType.startsWith('image/') && !contentType.includes('octet-stream')) return null
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 200) return null
      return {
        buf,
        contentType: contentType.startsWith('image/') ? contentType : 'image/jpeg',
        ext: extFromContentType(contentType, target),
      }
    } catch {
      return null
    }
  }

  const direct = await tryOnce(url)
  if (direct) return direct
  return tryOnce(`https://wsrv.nl/?url=${encodeURIComponent(url)}&w=320&output=jpg`)
}

export async function ensureProfileBucket(supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.storage.getBucket(PROFILE_BUCKET)
  if (data) return
  const { error } = await supabase.storage.createBucket(PROFILE_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
  })
  if (error && !/already exists/i.test(error.message)) throw error
}

export async function ensureProfileImageColumn(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase.from('contents').select('profile_image_url').limit(1)
  if (!error) return true

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return false

  const sql = 'ALTER TABLE contents ADD COLUMN IF NOT EXISTS profile_image_url TEXT'
  for (const endpoint of [`${url}/pg/query`, `${url}/pg-meta/query`]) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      })
      if (res.ok) {
        const { error: again } = await supabase.from('contents').select('profile_image_url').limit(1)
        if (!again) return true
      }
    } catch {
      // try next
    }
  }
  return false
}

function fileStem(account: ProfileAccount): string {
  const hash = createHash('sha1').update(account.key).digest('hex').slice(0, 16)
  const slug = account.channel === '인스타그램' ? 'ig' : account.channel === '틱톡' ? 'tt' : 'xhs'
  return `${slug}/${hash}`
}

export function groupAccounts(rows: ProfileRow[], channels: SyncChannel[]): ProfileAccount[] {
  const map = new Map<string, ProfileAccount>()
  for (const row of rows) {
    if (!SYNC_CHANNELS.includes(row.channel as SyncChannel)) continue
    if (!channels.includes(row.channel as SyncChannel)) continue
    const profileUrl = resolveProfileUrl(row)
    const key = accountKey(row.channel, profileUrl, row.influencer_name)
    let acc = map.get(key)
    if (!acc) {
      acc = {
        key,
        channel: row.channel as SyncChannel,
        ids: [],
        name: row.influencer_name,
        profileUrl,
        uploadUrls: [],
      }
      map.set(key, acc)
    }
    acc.ids.push(row.id)
    if (row.upload_url && isHttp(row.upload_url)) acc.uploadUrls.push(row.upload_url)
  }
  return [...map.values()].sort((a, b) => Number(!!b.profileUrl) - Number(!!a.profileUrl))
}

export async function syncProfilePhotos(opts: ProfileSyncOptions = {}): Promise<ProfileSyncResult> {
  const channels = opts.channels ?? SYNC_CHANNELS
  const dryRun = opts.dryRun ?? false
  const supabase = createAdminSupabase()

  const hasColumn = await ensureProfileImageColumn(supabase)
  if (!hasColumn) {
    console.warn('profile_image_url 컬럼 없음 — Storage에만 저장합니다. supabase/add-profile-image.sql 을 실행하면 DB에도 연결됩니다.')
  }

  if (!dryRun) await ensureProfileBucket(supabase)

  let query = supabase
    .from('contents')
    .select(hasColumn
      ? 'id, channel, influencer_name, profile_url, sns_id, upload_url, profile_image_url'
      : 'id, channel, influencer_name, profile_url, sns_id, upload_url')
    .in('channel', channels)
    .order('id')

  const { data, error } = await query
  if (error) throw new Error(`Supabase fetch failed: ${error.message}`)

  let accounts = groupAccounts((data ?? []) as ProfileRow[], channels)
  if (opts.limit) accounts = accounts.slice(0, opts.limit)

  let uploaded = 0
  let skipped = 0
  let errors = 0

  for (const channel of channels) {
    const channelAccounts = accounts.filter(a => a.channel === channel)
    if (!channelAccounts.length) continue

    let avatars: Map<string, string>
    try {
      avatars = await scrapeAvatars(channel, channelAccounts)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`Apify (${channel}): ${msg}`)
      errors += channelAccounts.length
      continue
    }

    for (const acc of channelAccounts) {
      const avatarUrl = avatars.get(acc.key)
      if (!avatarUrl) {
        skipped++
        console.log(`· skip (no avatar) ${acc.name}`)
        continue
      }

      if (dryRun) {
        uploaded++
        continue
      }

      const img = await downloadImage(avatarUrl)
      if (!img) {
        skipped++
        console.log(`· skip (download fail) ${acc.name}`)
        continue
      }

      const path = `${fileStem(acc)}.${img.ext}`
      const { error: upErr } = await supabase.storage
        .from(PROFILE_BUCKET)
        .upload(path, img.buf, { contentType: img.contentType, upsert: true })

      if (upErr) {
        console.error(`Storage upload failed ${acc.name}: ${upErr.message}`)
        errors++
        continue
      }

      for (const id of acc.ids) {
        const { error: idErr } = await supabase.storage
          .from(PROFILE_BUCKET)
          .upload(`by-id/${id}`, img.buf, { contentType: img.contentType, upsert: true })
        if (idErr) console.error(`Storage by-id/${id}: ${idErr.message}`)
      }

      const { data: pub } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path)
      if (hasColumn) {
        const { error: dbErr } = await supabase
          .from('contents')
          .update({ profile_image_url: pub.publicUrl })
          .in('id', acc.ids)

        if (dbErr) {
          console.error(`DB update failed ${acc.name}: ${dbErr.message}`)
          errors++
          continue
        }
      }
      uploaded++
      console.log(`✓ ${acc.name} (${channel}) → ${acc.ids.length}건`)
    }
  }

  return { accounts: accounts.length, uploaded, skipped, errors, dryRun }
}
