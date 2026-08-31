/**
 * 샤오홍슈 조회수 역산 → views_estimated / views_est_low / views_est_high 일괄 반영
 *
 * Usage:
 *   npx tsx scripts/estimate-xhs-views.ts           # DB 업데이트
 *   npx tsx scripts/estimate-xhs-views.ts --dry-run # 미리보기만
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createAdminSupabase } from '../lib/supabase-admin'
import {
  estimateXhsViews,
  evaluateXhsAccuracy,
  XHS_CALIBRATION_SAMPLES,
} from '../lib/xhs-view-estimate'

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
const accuracyOnly = process.argv.includes('--accuracy-only')

async function main() {
  const acc = evaluateXhsAccuracy(XHS_CALIBRATION_SAMPLES)
  if (acc) {
    console.log(`── 캘리브레이션 정확도 (n=${acc.n}) ──`)
    console.log(`  Total Engagement MAPE:     ${acc.mape_total_model.toFixed(1)}%`)
    console.log(`  Component-Weighted MAPE:   ${acc.mape_weighted_model.toFixed(1)}%`)
    console.log(`  Blended MAPE:              ${acc.mape_blended.toFixed(1)}%`)
    console.log(`  구간 적중률 [low–high]:    ${acc.interval_hit_rate.toFixed(0)}%`)
    for (const s of acc.samples) {
      console.log(
        `  · ${s.label}  실측 ${s.actual.toLocaleString()} → 추정 ${s.estimated.toLocaleString()} (T:${s.total_model.toLocaleString()} W:${s.weighted_model.toLocaleString()}) err ${s.err_pct.toFixed(1)}%`,
      )
    }
    const legacyMape =
      acc.samples.reduce((sum, s) => {
        const row = XHS_CALIBRATION_SAMPLES.find(c => c.label === s.label)!
        const inter = (row.likes ?? 0) + (row.saves ?? 0) + (row.comments ?? 0)
        const legacy = inter * 41
        return sum + Math.abs(legacy - s.actual) / s.actual
      }, 0) / acc.samples.length * 100
    console.log(`  (참고) 구 방식 interaction×41 MAPE: ${legacyMape.toFixed(1)}%`)
    console.log('')
  }

  if (accuracyOnly) return

  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('contents')
    .select('id, influencer_name, likes, saves, comments, views, views_source')
    .eq('channel', '샤오홍슈')
    .is('views', null)

  if (error) throw new Error(error.message)

  let updated = 0
  let skipped = 0

  for (const row of data ?? []) {
    const est = estimateXhsViews({
      likes: row.likes,
      saves: row.saves,
      comments: row.comments,
    })
    if (!est) {
      skipped++
      continue
    }

    if (!dryRun) {
      const { error: upErr } = await supabase
        .from('contents')
        .update({
          views_estimated: est.views_estimated,
          views_est_low: est.views_est_low,
          views_est_high: est.views_est_high,
          views_source: 'estimated',
        })
        .eq('id', row.id)
      if (upErr) throw new Error(upErr.message)
    }

    updated++
    if (dryRun && updated <= 5) {
      console.log(
        '[dry-run] %s  ~%s (%s–%s)',
        row.influencer_name,
        est.views_estimated.toLocaleString(),
        est.views_est_low.toLocaleString(),
        est.views_est_high.toLocaleString(),
      )
    }
  }

  console.log(
    '%s %d건 역산 반영, %d건 스킵 (상호작용 없음)',
    dryRun ? '[dry-run]' : '완료:',
    updated,
    skipped,
  )
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
