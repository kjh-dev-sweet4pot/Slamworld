'use client'
import { LIVE_FEED } from '@/lib/feed-items'
import { BRAND_CONTENT_ALIASES } from '@/lib/brand-content'
import { usePartnerBrand, useShowSales } from '@/lib/access-context'

const SALES_BADGES = new Set(['예산', '입금', '검토'])

function mentionsBrand(text: string, brand: string): boolean {
  const aliases = BRAND_CONTENT_ALIASES[brand] ?? [brand]
  return aliases.some(a => text.includes(a))
}

export default function SideLiveFeed() {
  const showSales = useShowSales()
  const partnerBrand = usePartnerBrand()

  let items = LIVE_FEED
  if (partnerBrand) {
    items = LIVE_FEED.filter(item =>
      mentionsBrand(item.headline, partnerBrand) || mentionsBrand(item.detail, partnerBrand),
    )
  } else if (!showSales) {
    items = LIVE_FEED.filter(item => !SALES_BADGES.has(item.badge))
  }

  return (
    <div className="owm-b3-card h-fit">
      <div className="owm-b3-head">
        <div className="owm-b3-title">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            Live 뉴스
          </span>
          <span className="sub">
            {partnerBrand
              ? `${partnerBrand} · 관련`
              : showSales ? '브랜드 · 예산 · 일정' : '브랜드 · 일정'}
          </span>
        </div>
      </div>
      <div className="owm-live-body">
        {items.length === 0 ? (
          <div className="px-3 py-6 text-[12px] text-owm-text2 text-center">관련 뉴스가 없습니다.</div>
        ) : (
          items.map((item, i) => (
            <div key={i} className="owm-live-item">
              <div className="owm-live-meta">
                <span className="owm-live-time">{item.time}</span>
                <span className={`owm-live-badge ${item.badgeClass}`}>{item.badge}</span>
              </div>
              <div className="owm-live-headline">{item.headline}</div>
              <div className="owm-live-detail">{item.detail}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
