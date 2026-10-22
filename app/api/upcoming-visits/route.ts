import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isTestCompany } from '@/lib/test-companies.mjs'
import { isSeedingLocation } from '@/lib/posted-date'

export interface UpcomingVisit {
  date: string
  store: string
  influencer_id: string
  influencer_name: string
  /** 유형 (중화권·일본 등) */
  region: string | null
  tier: string | null
  format: string | null
  ppl: boolean
  companies: string[]
  status: string
  /** 방문 완료 (picked_up) */
  done: boolean
}

interface Row {
  influencer_id: string
  status: string | null
  visit_date: string | null
  sheet_region: string | null
  sheet_tier: string | null
  sheet_format: string | null
  quote_service: boolean | null
  influencers: { name: string | null; region: string | null; tier: string | null } | null
  companies: { name: string | null; login_id: string | null } | null
  stores: { name: string | null } | null
}

/** 보딩패스 allocations 의 placeholder 방문일 (실제 날짜 미정) */
const PLACEHOLDER_VISIT = '2026-01-01'

/** 방문 완료·예정 인플루언서 — 보딩패스 allocations, 테스트 회원사·취소 제외 */
export async function GET() {
  const url = process.env.BP_SUPABASE_URL
  const key = process.env.BP_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'BoardingPass 환경변수 없음' }, { status: 500 })

  const bp = createClient(url, key, { auth: { persistSession: false } })
  const data: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await bp
      .from('allocations')
      .select(
        'influencer_id,status,visit_date,sheet_region,sheet_tier,sheet_format,quote_service,influencers(name,region,tier),companies(name,login_id),stores(name)',
      )
      .not('visit_date', 'is', null)
      .neq('status', 'cancelled')
      .order('visit_date')
      .range(from, from + 999)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    data.push(...((page ?? []) as unknown as Row[]))
    if (!page || page.length < 1000) break
  }

  // 같은 날·지점·인플루언서는 한 줄로 묶고 회원사만 모은다
  const byKey = new Map<string, UpcomingVisit>()
  for (const r of data) {
    if (!r.influencer_id || !r.visit_date || isTestCompany(r.companies)) continue
    const store = r.stores?.name?.trim() || '미정'
    if (isSeedingLocation(store)) continue
    const date = r.visit_date.slice(0, 10)
    if (date === PLACEHOLDER_VISIT) continue
    const k = `${date}|${store}|${r.influencer_id}`
    const format = r.sheet_format?.trim() || null
    let v = byKey.get(k)
    if (!v) {
      v = {
        date,
        store,
        influencer_id: r.influencer_id,
        influencer_name: r.influencers?.name?.trim() || '',
        region: r.sheet_region?.trim() || r.influencers?.region?.trim() || null,
        tier: r.sheet_tier?.trim() || r.influencers?.tier?.trim() || null,
        format,
        ppl: false,
        companies: [],
        status: r.status ?? '',
        done: false,
      }
      byKey.set(k, v)
    }
    if (r.status === 'picked_up') v.done = true
    if (r.quote_service || format?.toUpperCase().includes('PPL')) v.ppl = true
    const company = r.companies?.name?.trim()
    if (company && !v.companies.includes(company)) v.companies.push(company)
  }

  return NextResponse.json(
    { data: [...byKey.values()] },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=1800' } },
  )
}
