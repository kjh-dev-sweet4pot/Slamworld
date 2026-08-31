/** 샤오홍슈 조회수 역산 (플랫폼 미제공) */

export type XhsContentType = 'feed' | 'guide' | 'video'

export interface XhsInteractionInput {
  likes?: number | null
  saves?: number | null
  comments?: number | null
  shares?: number | null
  contentType?: XhsContentType
}

export interface XhsViewEstimate {
  views_estimated: number
  views_est_low: number
  views_est_high: number
  total_interactions: number
  total_engagement_model: number
  component_weighted_model: number
  r_eng_mid: number
  has_shares: boolean
}

const R_ENG: Record<XhsContentType, { low: number; mid: number; high: number }> = {
  feed:  { low: 0.035, mid: 0.040, high: 0.045 },
  guide: { low: 0.060, mid: 0.070, high: 0.080 },
  video: { low: 0.020, mid: 0.025, high: 0.030 },
}

const RATES = {
  like: 0.025,
  collect: 0.015,
  comment: 0.002,
  share: 0.001,
} as const

const WEIGHTS = {
  like: 0.45,
  collect: 0.35,
  comment: 0.15,
  share: 0.05,
} as const

const SHARE_MISSING_ADJ = 0.005

function n(v: number | null | undefined): number {
  return v != null && v > 0 ? v : 0
}

function round(v: number): number {
  return Math.max(0, Math.round(v))
}

function rEngBand(type: XhsContentType, hasShares: boolean) {
  const band = R_ENG[type]
  const adj = hasShares ? 0 : SHARE_MISSING_ADJ
  return {
    low: band.low - adj,
    mid: band.mid - adj,
    high: band.high - adj,
  }
}

/** Total Engagement Model: interactions / R_eng */
export function estimateTotalEngagement(
  interactions: number,
  type: XhsContentType,
  hasShares: boolean,
  r: 'low' | 'mid' | 'high' = 'mid',
): number {
  if (interactions <= 0) return 0
  const band = rEngBand(type, hasShares)
  return interactions / band[r]
}

/** Component-Weighted Model */
export function estimateComponentWeighted(input: XhsInteractionInput): number {
  const likes = n(input.likes)
  const saves = n(input.saves)
  const comments = n(input.comments)
  const shares = n(input.shares)
  const hasShares = shares > 0

  let w1 = WEIGHTS.like
  let w2 = WEIGHTS.collect
  let w3 = WEIGHTS.comment
  let w4 = WEIGHTS.share

  if (!hasShares) {
    const sum = w1 + w2 + w3
    w1 /= sum
    w2 /= sum
    w3 /= sum
    w4 = 0
  }

  const parts = [
    likes > 0 ? (likes / RATES.like) * w1 : 0,
    saves > 0 ? (saves / RATES.collect) * w2 : 0,
    comments > 0 ? (comments / RATES.comment) * w3 : 0,
    shares > 0 ? (shares / RATES.share) * w4 : 0,
  ]

  const active = [likes, saves, comments, shares].filter(v => v > 0).length
  if (active === 0) return 0
  return parts.reduce((a, b) => a + b, 0)
}

/** ponytail: 단일 lib — npm run estimate-xhs-views self-check가 깨지면 역산 회귀 */
export function estimateXhsViews(input: XhsInteractionInput): XhsViewEstimate | null {
  const likes = n(input.likes)
  const saves = n(input.saves)
  const comments = n(input.comments)
  const shares = n(input.shares)
  const total = likes + saves + comments + shares
  if (total <= 0) return null

  const type = input.contentType ?? 'guide'
  const hasShares = shares > 0
  const band = rEngBand(type, hasShares)

  const totalMid = estimateTotalEngagement(total, type, hasShares, 'mid')
  const totalLow = estimateTotalEngagement(total, type, hasShares, 'high') // 높은 R_eng → 낮은 조회수
  const totalHigh = estimateTotalEngagement(total, type, hasShares, 'low')
  const weighted = estimateComponentWeighted(input)

  const point = round(weighted)
  const low = round(Math.min(totalLow, weighted * 0.85))
  const high = round(Math.max(totalHigh, weighted * 1.15))

  return {
    views_estimated: point,
    views_est_low: Math.min(low, point),
    views_est_high: Math.max(high, point),
    total_interactions: total,
    total_engagement_model: round(totalMid),
    component_weighted_model: round(weighted),
    r_eng_mid: band.mid,
    has_shares: hasShares,
  }
}

/** 캘리브레이션용 — 실측 조회수가 있는 샘플로 MAPE·구간 적중률 산출 */
export interface XhsCalibrationSample {
  label: string
  actual_views: number
  likes?: number | null
  saves?: number | null
  comments?: number | null
  shares?: number | null
  contentType?: XhsContentType
}

export interface XhsAccuracyReport {
  n: number
  mape_total_model: number
  mape_weighted_model: number
  mape_blended: number
  interval_hit_rate: number
  samples: Array<{
    label: string
    actual: number
    estimated: number
    total_model: number
    weighted_model: number
    in_interval: boolean
    err_pct: number
  }>
}

export function evaluateXhsAccuracy(samples: XhsCalibrationSample[]): XhsAccuracyReport | null {
  const valid = samples.filter(s => s.actual_views > 0)
  if (!valid.length) return null

  const rows = valid.map(s => {
    const est = estimateXhsViews(s)!
    const blended = round((est.total_engagement_model + est.component_weighted_model) / 2)
    const err = Math.abs(blended - s.actual_views) / s.actual_views
    return {
      label: s.label,
      actual: s.actual_views,
      estimated: blended,
      total_model: est.total_engagement_model,
      weighted_model: est.component_weighted_model,
      in_interval: s.actual_views >= est.views_est_low && s.actual_views <= est.views_est_high,
      err_pct: err * 100,
    }
  })

  const mape = (pick: (r: typeof rows[0]) => number) =>
    rows.reduce((sum, r) => sum + Math.abs(pick(r) - r.actual) / r.actual, 0) / rows.length * 100

  return {
    n: rows.length,
    mape_total_model: mape(r => r.total_model),
    mape_weighted_model: mape(r => r.weighted_model),
    mape_blended: mape(r => r.estimated),
    interval_hit_rate: rows.filter(r => r.in_interval).length / rows.length * 100,
    samples: rows,
  }
}

// 기존 단순 배수(×41) 대비 검증용 — 인플루언서 자가 신고·캘리브 시트 n=4
export const XHS_CALIBRATION_SAMPLES: XhsCalibrationSample[] = [
  { label: 'luna_pro_beauty', actual_views: 59100, likes: 893, saves: 42, comments: 0 },
  { label: 'dk_a_life', actual_views: 14000, likes: 345, saves: 10, comments: 0 },
  { label: 'erica.scoro', actual_views: 3218, likes: 65, saves: 10, comments: 0 },
  { label: 'ariluxbloom', actual_views: 5632, likes: 133, saves: 17, comments: 0 },
]

if (process.env.XHS_ESTIMATE_SELF_CHECK === '1') {
  const est = estimateXhsViews({ likes: 100, saves: 50, comments: 5 })
  if (!est || est.views_estimated <= 0) throw new Error('xhs-view-estimate self-check failed')
  const acc = evaluateXhsAccuracy(XHS_CALIBRATION_SAMPLES)
  if (!acc) throw new Error('xhs accuracy self-check failed')
  console.log('xhs-view-estimate ok', { point: est.views_estimated, mape: acc.mape_blended.toFixed(1) })
}
