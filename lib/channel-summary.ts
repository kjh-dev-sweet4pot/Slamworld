import { contentViews } from '@/lib/content-views'
import type { Channel, ChannelSummary, Content } from '@/lib/types'

export function channelSummaryFromContents(rows: Content[]): ChannelSummary[] {
  const map = new Map<string, { count: number; likes: number; saves: number; views: number }>()

  for (const row of rows) {
    const ch = row.channel
    const bucket = map.get(ch) ?? { count: 0, likes: 0, saves: 0, views: 0 }
    if (row.upload_url) bucket.count += 1
    bucket.likes += row.likes ?? 0
    bucket.saves += row.saves ?? 0
    bucket.views += contentViews(row)
    map.set(ch, bucket)
  }

  return [...map.entries()]
    .map(([channel, v]) => ({
      channel: channel as Channel,
      ...v,
      interaction: v.likes + v.saves,
    }))
    .filter(c => c.interaction > 0 || c.count > 0)
    .sort((a, b) => b.interaction - a.interaction)
}
