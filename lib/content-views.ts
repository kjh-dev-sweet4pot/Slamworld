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

/** ponytail: XHS 캘리브 모델 재사용 — 도우인 전용 캘리브 전까지 동일 파라미터 */
export function estimateChannelViews(
  channel: string,
  input: XhsInteractionInput,
): XhsViewEstimate | null {
  if (!usesEstimatedViews(channel)) return null
  return estimateXhsViews(input)
}
