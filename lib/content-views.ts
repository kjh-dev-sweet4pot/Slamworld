import type { Channel } from '@/lib/types'
import {
  estimateXhsViews,
  type XhsInteractionInput,
  type XhsViewEstimate,
} from '@/lib/xhs-view-estimate'

/** 플랫폼 미제공·숨김 시 좋아요·저장·댓글로 역산하는 채널 */
export const ESTIMATED_VIEW_CHANNELS = ['샤오홍슈', '도우인'] as const satisfies readonly Channel[]

export type EstimatedViewChannel = (typeof ESTIMATED_VIEW_CHANNELS)[number]

export function usesEstimatedViews(channel: string): channel is EstimatedViewChannel {
  return (ESTIMATED_VIEW_CHANNELS as readonly string[]).includes(channel)
}

export function contentViews(c: {
  channel: string
  views?: number | null
  views_estimated?: number | null
}): number {
  if (usesEstimatedViews(c.channel)) return c.views_estimated ?? c.views ?? 0
  return c.views ?? c.views_estimated ?? 0
}

export function contentViewsDisplay(c: {
  channel: string
  views?: number | null
  views_estimated?: number | null
}): { value: number | null; estimated: boolean } {
  const value = usesEstimatedViews(c.channel)
    ? (c.views_estimated ?? c.views ?? null)
    : (c.views ?? c.views_estimated ?? null)
  const estimated = usesEstimatedViews(c.channel)
    ? !!c.views_estimated
    : !c.views && !!c.views_estimated
  return { value, estimated }
}

/** EMV(Earned Media Value) 단가 — 조회·좋아요·저장·댓글을 광고 환산가로 통합 */
export const EMV_RATES = {
  view: 12,
  like: 50,
  save: 150,
  comment: 100,
} as const

/** 발행 콘텐츠 1건당 촬영·편집 제작비 대체가치(원) — 브랜드가 직접 제작 대행을 맡겼을 때 드는 비용 기준 */
export const PRODUCTION_COST_PER_UPLOAD = 500_000

export interface EmvBreakdown {
  views: number
  likes: number
  saves: number
  comments: number
  uploads: number
  viewValue: number
  likeValue: number
  saveValue: number
  commentValue: number
  productionValue: number
  total: number
}

/** 콘텐츠 1건의 EMV(원) — 조회·좋아요·저장·댓글 반응 + 제작비 대체가치(발행 시) 합산 */
export function contentEmv(c: {
  channel: string
  views?: number | null
  views_estimated?: number | null
  likes?: number | null
  saves?: number | null
  comments?: number | null
  upload_url?: string | null
}): number {
  const views = contentViews(c)
  return (
    views * EMV_RATES.view +
    (c.likes ?? 0) * EMV_RATES.like +
    (c.saves ?? 0) * EMV_RATES.save +
    (c.comments ?? 0) * EMV_RATES.comment +
    (c.upload_url ? PRODUCTION_COST_PER_UPLOAD : 0)
  )
}

/** 콘텐츠 목록의 EMV 합계 및 항목별 내역(원) */
export function aggregateEmv(
  contents: {
    channel: string
    views?: number | null
    views_estimated?: number | null
    likes?: number | null
    saves?: number | null
    comments?: number | null
    upload_url?: string | null
  }[],
): EmvBreakdown {
  let views = 0
  let likes = 0
  let saves = 0
  let comments = 0
  let uploads = 0
  for (const c of contents) {
    views += contentViews(c)
    likes += c.likes ?? 0
    saves += c.saves ?? 0
    comments += c.comments ?? 0
    if (c.upload_url) uploads += 1
  }
  const viewValue = views * EMV_RATES.view
  const likeValue = likes * EMV_RATES.like
  const saveValue = saves * EMV_RATES.save
  const commentValue = comments * EMV_RATES.comment
  const productionValue = uploads * PRODUCTION_COST_PER_UPLOAD
  return {
    views,
    likes,
    saves,
    comments,
    uploads,
    viewValue,
    likeValue,
    saveValue,
    commentValue,
    productionValue,
    total: viewValue + likeValue + saveValue + commentValue + productionValue,
  }
}

/** ponytail: XHS 캘리브 모델 재사용 — 도우인 전용 캘리브 전까지 동일 파라미터 */
export function estimateChannelViews(
  channel: string,
  input: XhsInteractionInput,
): XhsViewEstimate | null {
  if (!usesEstimatedViews(channel)) return null
  return estimateXhsViews(input)
}
