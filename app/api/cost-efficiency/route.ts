import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/** 8만원 일괄 등록분은 실제 단가가 아니라 제외 */
const BULK_COST = 80_000

export interface CostEfficiencyRow {
  name: string
  platform: string
  tier: string | null
  followers: number | null
  cost: number
  views: number
  /** 조회수 1회당 단가 (원) */
  costPerView: number
}

/** 보딩패스 배정 원가 ÷ 콘텐츠 조회수 — 관리자 전용 */
export async function GET() {
  const url = process.env.BP_SUPABASE_URL
  const key = process.env.BP_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'BoardingPass 환경변수 없음' }, { status: 500 })
  const bp = createClient(url, key, { auth: { persistSession: false } })

  async function all<T>(table: string, select: string): Promise<T[]> {
    const out: T[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await bp.from(table).select(select).range(from, from + 999)
      if (error) throw new Error(error.message)
      out.push(...((data ?? []) as T[]))
      if (!data || data.length < 1000) return out
    }
  }

  try {
    const [pricing, influencers, links] = await Promise.all([
      all<{ allocation_id: string; cost_amount: number | null }>('allocation_pricing', 'allocation_id,cost_amount'),
      all<{ id: string; name: string | null; tier: string | null; scale_band: string | null; followers: number | null }>('influencers', 'id,name,tier,scale_band,followers'),
      all<{ allocation_id: string; influencer_id: string; platform: string | null; views: number | null; viewcounts: number | null }>('creator_links', 'allocation_id,influencer_id,platform,views,viewcounts'),
    ])
    const cost = new Map(pricing.filter(p => (p.cost_amount ?? 0) > 0).map(p => [p.allocation_id, Number(p.cost_amount)]))
    const inf = new Map(influencers.map(i => [i.id, i]))

    const by = new Map<string, Omit<CostEfficiencyRow, 'costPerView'>>()
    const counted = new Set<string>()
    for (const l of links) {
      const c = cost.get(l.allocation_id)
      if (!c) continue
      const i = inf.get(l.influencer_id)
      const g = by.get(l.influencer_id) ?? {
        name: i?.name ?? '-',
        platform: l.platform ?? '-',
        tier: i?.tier || i?.scale_band || null,
        followers: i?.followers ?? null,
        cost: 0,
        views: 0,
      }
      // 한 배정에 링크가 여러 개여도 원가는 한 번만
      if (!counted.has(l.allocation_id)) { g.cost += c; counted.add(l.allocation_id) }
      g.views += Number(l.views ?? l.viewcounts ?? 0)
      by.set(l.influencer_id, g)
    }

    const rows: CostEfficiencyRow[] = [...by.values()]
      .filter(r => r.cost !== BULK_COST && r.views > 0)
      .map(r => ({ ...r, costPerView: r.cost / r.views }))
      .sort((a, b) => a.costPerView - b.costPerView)
    return NextResponse.json({ rows })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '불러오지 못했습니다' }, { status: 500 })
  }
}
