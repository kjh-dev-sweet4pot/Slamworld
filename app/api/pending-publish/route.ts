import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sessionFromRequest } from '@/lib/session-cookie'
import { contentMatchesBrand } from '@/lib/brand-content'
import { isTestCompany } from '@/lib/test-companies.mjs'
import { isSeedingLocation } from '@/lib/posted-date'

export interface PendingPublish {
  /** 같은 날·지점·인플루언서 1건, 참여 회원사 이름 */
  items: { date: string; done: boolean; store: string; name: string; photo: string | null; tier: string | null; region: string | null; companies: string[] }[]
  /** 최근 30일 방문 완료 인원 (링크 유무 무관) */
  visited30: number
}

interface Row {
  id: string
  influencer_id: string | null
  status: string | null
  visit_date: string | null
  sheet_region: string | null
  sheet_tier: string | null
  influencers: { name: string | null; profile_image_path: string | null; region: string | null; tier: string | null } | null
  companies: { name: string | null; login_id: string | null } | null
  stores: { name: string | null } | null
}

const KST = 9 * 3600_000
const ymd = (t: number) => new Date(t + KST).toISOString().slice(0, 10)

/**
 * 발행 예정 — 보딩패스 방문 배정 중
 * 방문일이 오늘 이후(예정) 이거나 최근 30일 안에 방문 완료(picked_up)인데
 * 콘텐츠 링크(creator_links url/publish_url)가 아직 없는 건.
 * 테스트 회원사·취소·시딩 제외.
 */
export async function GET(req: Request) {
  const url = process.env.BP_SUPABASE_URL
  const key = process.env.BP_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'BoardingPass 환경변수 없음' }, { status: 500 })
  const bp = createClient(url, key, { auth: { persistSession: false } })

  const today = ymd(Date.now())
  const since = ymd(Date.now() - 30 * 86400_000)

  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await bp
      .from('allocations')
      .select('id,influencer_id,status,visit_date,sheet_region,sheet_tier,influencers(name,profile_image_path,region,tier),companies(name,login_id),stores(name)')
      .gte('visit_date', since)
      .neq('status', 'cancelled')
      .order('visit_date')
      .range(from, from + 999)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    rows.push(...((data ?? []) as unknown as Row[]))
    if (!data || data.length < 1000) break
  }

  const ids = rows.map(r => r.id)
  const linked = new Set<string>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await bp
      .from('creator_links')
      .select('allocation_id,url,publish_url')
      .in('allocation_id', ids.slice(i, i + 200))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const l of data ?? []) if (l.url || l.publish_url) linked.add(l.allocation_id)
  }

  type G = PendingPublish['items'][number] & { linked: boolean }
  const byKey = new Map<string, G>()
  for (const r of rows) {
    if (!r.influencer_id || !r.visit_date || isTestCompany(r.companies)) continue
    const store = r.stores?.name?.trim() || '미정'
    if (isSeedingLocation(store)) continue
    const date = r.visit_date.slice(0, 10)
    const done = r.status === 'picked_up'
    if (!(date >= today || done)) continue
    const k = `${date}|${store}|${r.influencer_id}`
    const v: G = byKey.get(k) ?? {
      date,
      done: false,
      linked: false,
      store,
      name: r.influencers?.name?.trim() || '',
      photo: r.influencers?.profile_image_path || null,
      tier: r.sheet_tier?.trim() || r.influencers?.tier?.trim() || null,
      region: r.sheet_region?.trim() || r.influencers?.region?.trim() || null,
      companies: [],
    }
    v.done ||= done
    v.linked ||= linked.has(r.id)
    const company = r.companies?.name?.trim()
    if (company && !v.companies.includes(company)) v.companies.push(company)
    byKey.set(k, v)
  }

  const session = await sessionFromRequest(req)
  const brand = session?.kind === 'partner' ? session.brand ?? '' : null
  const all = [...byKey.values()].filter(v => brand === null || v.companies.some(c => contentMatchesBrand(c, brand)))
  const visited30 = all.filter(v => v.done && v.date < today).length
  const items = all.filter(v => !v.linked).map(({ linked: _l, ...rest }) => rest)

  // 프로필 사진 — 비공개 버킷이라 하루짜리 서명 URL 로 바꾼다
  const paths = [...new Set(items.map(i => i.photo).filter((p): p is string => !!p))]
  if (paths.length) {
    const { data: signed } = await bp.storage.from('influencer-avatars').createSignedUrls(paths, 86400)
    const url = new Map((signed ?? []).map(x => [x.path, x.signedUrl]))
    for (const i of items) i.photo = (i.photo && url.get(i.photo)) || null
  }
  return NextResponse.json(
    { items, visited30 } satisfies PendingPublish,
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  )
}
