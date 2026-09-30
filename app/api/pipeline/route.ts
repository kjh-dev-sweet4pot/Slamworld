import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isTestCompany } from '@/lib/test-companies.mjs'
import { isSeedingLocation } from '@/lib/posted-date'

/** 보딩패스 allocations 의 placeholder 방문일 (실제 날짜 미정) */
const PLACEHOLDER_VISIT = '2026-01-01'

export interface PipelineRegistration {
  influencer_id: string
  influencer_name: string
  /** 방문일. 미정(placeholder)이면 null — 기간 필터에서는 '전체'에만 잡힌다 */
  date: string | null
  status: string
  kind: '방문' | '시딩'
  company: string | null
  store: string | null
}

interface AllocationRow {
  influencer_id: string
  status: string | null
  visit_date: string | null
  influencers: { name: string | null } | null
  companies: { name: string | null; login_id: string | null } | null
  stores: { name: string | null } | null
}

/** 진행예정 등록(보딩패스 방문·시딩 배정) 목록 — 발행 수는 contents 로 클라이언트에서 계산 */
export async function GET() {
  const url = process.env.BP_SUPABASE_URL
  const key = process.env.BP_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'BoardingPass 환경변수 없음' }, { status: 500 })

  const bp = createClient(url, key, { auth: { persistSession: false } })
  const rows: AllocationRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await bp
      .from('allocations')
      .select('influencer_id,status,visit_date,influencers(name),companies(name,login_id),stores(name)')
      .range(from, from + 999)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    rows.push(...((data ?? []) as unknown as AllocationRow[]))
    if (!data || data.length < 1000) break
  }

  const registrations: PipelineRegistration[] = []
  for (const r of rows) {
    if (isTestCompany(r.companies)) continue
    const visit = r.visit_date?.slice(0, 10)
    // 미정 방문의 created_at 은 일괄 입력 시각이라 기간 기준으로 쓰지 않는다
    const date = visit && visit !== PLACEHOLDER_VISIT ? visit : null
    if (!r.influencer_id) continue
    registrations.push({
      influencer_id: r.influencer_id,
      influencer_name: r.influencers?.name?.trim() || '',
      date,
      status: r.status ?? '',
      kind: isSeedingLocation(r.stores?.name) ? '시딩' : '방문',
      company: r.companies?.name ?? null,
      store: r.stores?.name ?? null,
    })
  }

  return NextResponse.json(
    { data: registrations },
    { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=3600' } },
  )
}
