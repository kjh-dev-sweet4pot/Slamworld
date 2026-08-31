'use client'
import type { CSSProperties } from 'react'
import type { LocationSummary } from '@/lib/types'
import { LOC_COLOR, LOC_EMOJI } from '@/lib/feed-items'

function fmtMaxViews(n: number | null): string {
  if (!n || n <= 0) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

function convRate(loc: LocationSummary): number {
  if (!loc.influencer_count) return 0
  return Math.round((loc.uploaded / loc.influencer_count) * 100)
}

function rateColor(rate: number): string {
  if (rate >= 100) return '#22c55e'
  if (rate >= 80) return '#1a1d2e'
  return '#ef4444'
}

function likesPerPost(loc: LocationSummary): number {
  if (!loc.uploaded) return 0
  return Math.round(loc.total_likes / loc.uploaded)
}

export default function LocationStatus({ locations }: { locations: LocationSummary[] }) {
  const rows = [...locations].sort((a, b) => b.total_likes - a.total_likes)

  return (
    <section id="s2" className="mb-10 scroll-mt-28">
      <div className="owm-sec-title">
        <span className="owm-sec-no">06</span>
        지점 현황
        <span className="text-xs font-normal text-owm-text2">{rows.length}개 지점</span>
      </div>

      <div className="owm-kpi-grid-br">
        {rows.map(loc => {
          const color = LOC_COLOR[loc.location] ?? '#94a3b8'
          const emoji = LOC_EMOJI[loc.location] ?? '📍'
          const rate = convRate(loc)
          return (
            <div
              key={loc.location}
              className="owm-kpi-card"
              style={{ '--bc': color } as CSSProperties}
              data-emoji={emoji}
            >
              <div className="owm-kpi-header">
                <span className="owm-kpi-dot" />
                <span className="owm-kpi-label">{loc.location}</span>
                <span className="owm-kpi-last">최대 {fmtMaxViews(loc.max_views)}</span>
              </div>
              <div className="owm-kpi-amount">
                {loc.total_likes.toLocaleString()}
                <small>좋아요</small>
              </div>
              <div className="owm-kpi-divider" />
              <div className="owm-kpi-sub">
                <span>방문 <b>{loc.influencer_count}</b></span>
                <span>업로드 <b>{loc.uploaded}</b></span>
                <span>{rate}%</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="owm-chart-section">
        <div className="owm-chart-header">
          <h3>
            지점별 상세
            <span className="owm-chart-hint">방문 대비 업로드 전환율 포함</span>
          </h3>
        </div>
        <div className="owm-table-wrap">
          <table className="owm-table">
            <thead>
              <tr>
                <th>지점</th>
                <th className="num">방문</th>
                <th className="num">업로드</th>
                <th className="num">발행 전환율</th>
                <th className="num">좋아요 합</th>
                <th className="num">건당 좋아요</th>
                <th className="num">최대 조회</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(loc => {
                const color = LOC_COLOR[loc.location] ?? '#94a3b8'
                const rate = convRate(loc)
                return (
                  <tr key={loc.location}>
                    <td>
                      <span className="owm-loc-dot" style={{ background: color }} />
                      {loc.location}
                    </td>
                    <td className="num">{loc.influencer_count}</td>
                    <td className="num">{loc.uploaded}</td>
                    <td className="num font-semibold" style={{ color: rateColor(rate) }}>
                      {rate}%
                    </td>
                    <td className="num">{loc.total_likes.toLocaleString()}</td>
                    <td className="num">{likesPerPost(loc).toLocaleString()}</td>
                    <td className="num">{fmtMaxViews(loc.max_views)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="owm-note">
          발행 전환율과 건당 좋아요는 기존 방문·업로드·좋아요 합에서 파생한 값입니다.
          이태원점은 업로드가 방문보다 많아 1인 다건 발행으로 보입니다.
        </p>
      </div>
    </section>
  )
}
