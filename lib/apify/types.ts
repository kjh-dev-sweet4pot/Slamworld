import type { Channel } from '@/lib/types'

export type SyncChannel = Extract<Channel, '인스타그램' | '틱톡' | '샤오홍슈'>

export const SYNC_CHANNELS: SyncChannel[] = ['인스타그램', '틱톡', '샤오홍슈']

export interface ContentRow {
  id: number
  channel: Channel
  upload_url: string
  influencer_name: string
}

export interface ScrapedMetrics {
  views: number | null
  likes: number | null
  saves: number | null
  comments: number | null
  views_source: 'measured' | 'none'
}

export interface SyncResultItem {
  id: number
  channel: string
  influencer_name: string
  upload_url: string
  status: 'updated' | 'skipped' | 'error'
  metrics?: ScrapedMetrics
  error?: string
}

export interface SyncSummary {
  total: number
  updated: number
  skipped: number
  errors: number
  dryRun: boolean
  results: SyncResultItem[]
}
