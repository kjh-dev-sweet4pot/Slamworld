'use client'
import { LIVE_FEED } from '@/lib/feed-items'

export default function SideLiveFeed() {
  return (
    <div className="owm-b3-card h-fit">
      <div className="owm-b3-head">
        <div className="owm-b3-title">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            Live 뉴스
          </span>
          <span className="sub">브랜드 · 예산 · 일정</span>
        </div>
      </div>
      <div className="owm-live-body">
        {LIVE_FEED.map((item, i) => (
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
