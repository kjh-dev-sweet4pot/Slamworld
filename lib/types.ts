export type Channel = '샤오홍슈' | '인스타그램' | '틱톡' | '도우인' | '웨이보'
export type Performance = 'high' | 'mid' | 'low' | 'no_data'
export type ViewsSource = 'measured' | 'estimated' | 'none'

export interface Content {
  id: number
  campaign: string
  location: string
  brands: string | null
  influencer_name: string
  sns_id: string | null
  profile_url: string | null
  profile_image_url?: string | null
  channel: Channel
  follower_count: number | null
  target_audience: string | null
  is_press: boolean
  visit_date: string | null
  product: string | null
  upload_url: string | null
  views: number | null
  likes: number | null
  saves: number | null
  comments: number | null
  views_estimated: number | null
  views_est_low: number | null
  views_est_high: number | null
  views_source: ViewsSource
  metrics_updated_at?: string | null
  // from view
  total_interaction?: number
  views_best?: number | null
  performance?: Performance
}

export interface Summary {
  total_rows: number
  total_influencers: number
  uploaded: number
  total_views: number
  total_likes: number
  total_saves: number
  total_comments: number
}

export interface LocationSummary {
  location: string
  influencer_count: number
  uploaded: number
  total_likes: number
  total_saves: number
  max_views: number | null
}

export interface ChannelSummary {
  channel: Channel
  count: number
  likes: number
  saves: number
  views: number
  interaction: number
}

export interface DonutChartProps {
  data: ChannelSummary[]
  scopeLabel: string
  animationKey: string
  loading?: boolean
}

export interface FilterState {
  campaign: string
  location: string
  channel: string
  performance: string
  tab: 'perf' | 'month' | 'all'
}
