'use client'
import { LIVE_FEED } from '@/lib/feed-items'
import { useShowSales } from '@/lib/access-context'

const SALES_BADGES = new Set(['예산', '입금', '검토'])

export default function SideLiveFeed() {
  const showSales = useShowSales()
  const items = showSales
    ? LIVE_FEED
    : LIVE_FEED.filter(item => !SALES_BADGES.has(item.badge))

  return (
    <div className="owm-b3-card h-fit">
      <div className="owm-b3-head">
        <div className="owm-b3-title">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            Live 뉴스
          </span>
          <span className="sub">{showSales ? '브랜드 · 예산 · 일정' : '브랜드 · 일정'}</span>
        </div>
      </div>
      <div className="owm-live-body">
        {items.map((item, i) => (
          <div key={i} className="owm-live-item">
            <div className="owm-live-meta">
              <span className="owm-live-time">{item.time}</span>
              <span className={`owm-live-badge ${item.badgeClass}`}>{item.badge}</span>
            </div>
            <div className="owm-live-headline">{item.headline}</div>
            <div className="owm-live-detail">{item.detail}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
