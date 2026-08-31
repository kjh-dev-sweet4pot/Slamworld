/**
 * 6월_중화권 샤오홍슈 — 시트 기준 좋아요·저장 수동 반영
 * Usage: npx tsx scripts/update-june-xhs-metrics.ts
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createAdminSupabase } from '../lib/supabase-admin'
import { estimateXhsViews } from '../lib/xhs-view-estimate'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    const v = t.slice(i + 1).trim()
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnv()

const CAMPAIGN = '6월_중화권'
const CHANNEL = '샤오홍슈'

/** location, name, likes, saves (null = 미기재) */
const METRICS: Array<[string, string, number, number | null]> = [
  ['북촌점', '자웬준', 10, 1],
  ['북촌점', '판위천', 8, 2],
  ['북촌점', '신신', 46, null],
  ['북촌점', '조가남', 63, 6],
  ['북촌점', '왕가', 33, 4],
  ['북촌점', 'yileen', 105, 5],
  ['북촌점', '하동동', 31, 5],
  ['북촌점', '조이', 23, 4],
  ['북촌점', '키티', 8, 6],
  ['북촌점', '임지윤', 47, 8],
  ['북촌점', 'Su Bing', 45, 10],
  ['북촌점', 'Shi Qing', 100, 5],
  ['성수점', 'jenny_L', 212, 15],
  ['성수점', '류이수', 40, 6],
  ['성수점', 'Huangxueting', 91, null],
  ['강남점', '이 艺', 33, 10],
  ['강남점', '주혜나', 34, 9],
  ['강남점', 'zhumeixi', 3, 1],
  ['종각점', '한아', 32, 25],
  ['종각점', '고주원', 73, 4],
  ['이태원점', '성성', 5, 1],
  ['이태원점', '류입', 10, null],
  ['이태원점', '하효동', 37, 2],
  ['이태원점', '강하', 54, 2],
  ['이태원점', '천이한', 55, 5],
  ['이태원점', '심우연', 17, 4],
  ['이태원점', 'Chen Xian', 4, null],
  ['이태원점', 'Jin Huihui', 61, 22],
  ['이태원점', 'Shi Yule', 67, null],
  ['이태원점', '펄리', 34, 4],
  ['이태원점', 'ZHOUHUI', 108, 37],
]

async function main() {
  const supabase = createAdminSupabase()
  let updated = 0
  let inserted = 0

  for (const [location, name, likes, saves] of METRICS) {
    const patch: Record<string, unknown> = {
      likes,
      saves,
      metrics_updated_at: new Date().toISOString(),
    }
    const est = estimateXhsViews({ likes, saves })
    if (est) {
      patch.views_estimated = est.views_estimated
      patch.views_est_low = est.views_est_low
      patch.views_est_high = est.views_est_high
      patch.views_source = 'estimated'
    }

    const { data: rows, error: findErr } = await supabase
      .from('contents')
      .select('id')
      .eq('campaign', CAMPAIGN)
      .eq('channel', CHANNEL)
      .eq('location', location)
      .eq('influencer_name', name)

    if (findErr) throw new Error(findErr.message)

    if (!rows?.length) {
      const { error: insErr } = await supabase.from('contents').insert({
        campaign: CAMPAIGN,
        location,
        brands: '브랜드슬램',
        influencer_name: name,
        channel: CHANNEL,
        is_press: false,
        visit_date: '2026-06-28',
        product: '브랜드슬램 패키지',
        likes,
        saves,
        ...patch,
      })
      if (insErr) throw new Error(insErr.message)
      inserted++
      continue
    }

    const { error: upErr } = await supabase
      .from('contents')
      .update(patch)
      .eq('id', rows[0].id)
    if (upErr) throw new Error(upErr.message)
    updated++
  }

  console.log(`완료: ${updated}건 갱신, ${inserted}건 신규 (종각 등)`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
