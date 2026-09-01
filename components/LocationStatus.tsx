'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Content, LocationSummary } from '@/lib/types'
import { LOC_COLOR, LOC_EMOJI } from '@/lib/feed-items'
import type { LocationMonthSeries } from '@/lib/monthly-performance'
import { aggregateByMonth } from '@/lib/monthly-performance'
import MonthlyBarChart from '@/components/MonthlyBarChart'
import LocationMonthlyLineChart from '@/components/LocationMonthlyLineChart'
import ContentCard from '@/components/ContentCard'

const LIST_PREVIEW = 9
const LIST_MORE = 9

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

export default function LocationStatus({
  locations,
  locationMonthly,
}: {
  locations: LocationSummary[]
  locationMonthly: { months: string[]; series: LocationMonthSeries[] }
}) {
  const rows = [...locations].sort((a, b) => b.total_likes - a.total_likes)
  const [selected, setSelected] = useState<string | null>(null)
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(LIST_PREVIEW)
  const [chartMonth, setChartMonth] = useState<string | null>(null)
  const [chartLocation, setChartLocation] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selected) {
      setContents([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setVisibleCount(LIST_PREVIEW)
    setChartMonth(null)
    fetch(`/api/contents?location=${encodeURIComponent(selected)}&sort=perf&limit=1000`)
      .then(r => r.json())
      .then((d: { data?: Content[]; error?: string }) => {
        if (!cancelled) setContents(d.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setContents([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [selected])

  useEffect(() => {
    if (!selected || !detailRef.current) return
    detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selected])

  const monthly = useMemo(() => aggregateByMonth(contents), [contents])
  const listContents = useMemo(() => {
    if (!chartMonth) return contents
    return contents.filter(c => c.visit_date?.startsWith(chartMonth))
  }, [contents, chartMonth])

  const selectedLoc = rows.find(r => r.location === selected)
  const selectedColor = selected ? (LOC_COLOR[selected] ?? '#94a3b8') : '#94a3b8'

  function toggleLocation(name: string) {
    setSelected(prev => (prev === name ? null : name))
    setChartLocation(prev => (prev === name ? null : name))
  }

  return (
    <section id="s2" className="mb-10 scroll-mt-28">
      <div className="owm-sec-title">
        <span className="owm-sec-no">06</span>
        지점 현황
        <span className="text-xs font-normal text-owm-text2">{rows.length}개 지점</span>
      </div>
      <p className="text-[11px] text-slate -mt-2 mb-3">
        카드를 누르면 해당 지점 그래프와 콘텐츠 목록이 펼쳐집니다.
      </p>

      <div className="owm-kpi-grid-br mb-3">
        {rows.map(loc => {
          const color = LOC_COLOR[loc.location] ?? '#94a3b8'
          const emoji = LOC_EMOJI[loc.location] ?? '📍'
          const rate = convRate(loc)
          const active = selected === loc.location
          return (
            <button
              key={loc.location}
              type="button"
              className={`owm-kpi-card text-left w-full font-inherit transition-shadow
                ${active
                  ? 'shadow-[0_8px_20px_rgba(30,41,59,.12)]'
                  : 'hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(30,41,59,.1)]'}`}
              style={{
                '--bc': color,
                ...(active ? { boxShadow: `0 0 0 2px ${color}, 0 8px 20px rgba(30,41,59,.12)` } : {}),
              } as CSSProperties}
              data-emoji={emoji}
              aria-pressed={active}
              onClick={() => toggleLocation(loc.location)}
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
            </button>
          )
        })}
      </div>

      <div className="owm-chart-section mb-3">
        <div className="owm-chart-header">
          <h3>
            지점별 월별 진행 현황
            <span className="owm-chart-hint">월별 실제 업로드 · 지점 탭 시 선 강조</span>
          </h3>
        </div>
        <LocationMonthlyLineChart
          months={locationMonthly.months}
          series={locationMonthly.series}
          highlightLocation={chartLocation}
          onHighlightLocation={loc => {
            setChartLocation(loc)
            if (loc) setSelected(loc)
            else setSelected(null)
          }}
        />
      </div>

      {selected && (
        <div ref={detailRef} className="owm-chart-section mt-3">
          <div className="owm-chart-header">
            <h3>
              <span className="owm-loc-dot" style={{ background: selectedColor }} />
              {selected} 상세
              <span className="owm-chart-hint">월별 성과 · 콘텐츠 목록</span>
            </h3>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-[11px] font-semibold text-slate hover:text-azure-deep transition-colors"
            >
              닫기
            </button>
          </div>

          {selectedLoc && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate mb-1">
              <span>방문 <b className="text-body">{selectedLoc.influencer_count}</b></span>
              <span>업로드 <b className="text-body">{selectedLoc.uploaded}</b></span>
              <span>좋아요 <b className="text-body">{selectedLoc.total_likes.toLocaleString()}</b></span>
              <span>전환율 <b style={{ color: rateColor(convRate(selectedLoc)) }}>{convRate(selectedLoc)}%</b></span>
            </div>
          )}

          {loading ? (
            <div className="h-48 mt-3 rounded-lg bg-mist/40 animate-pulse" />
          ) : (
            <MonthlyBarChart
              variant="monthly"
              data={monthly}
              highlightMonth={chartMonth ?? monthly[monthly.length - 1]?.month}
              onSelectMonth={m => {
                setChartMonth(prev => (prev === m ? null : m))
                setVisibleCount(LIST_PREVIEW)
              }}
            />
          )}

          <div className="mt-4 pt-4 border-t border-[var(--owm-border)]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-[12px] font-bold text-body">
                콘텐츠 목록
                {!loading && (
                  <span className="font-medium text-slate ml-1.5">
                    {chartMonth
                      ? `${Number(chartMonth.slice(5))}월 ${listContents.length}건`
                      : `${listContents.length}건`}
                  </span>
                )}
              </p>
              {chartMonth && (
                <button
                  type="button"
                  onClick={() => {
                    setChartMonth(null)
                    setVisibleCount(LIST_PREVIEW)
                  }}
                  className="text-[11px] font-semibold text-azure-deep hover:text-azure"
                >
                  전체 월 보기
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {[...Array(LIST_PREVIEW)].map((_, i) => (
                  <div key={i} className="glass-solid h-40 animate-pulse" />
                ))}
              </div>
            ) : listContents.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {listContents.slice(0, visibleCount).map(c => (
                    <ContentCard key={c.id} c={c} />
                  ))}
                </div>
                {(listContents.length > visibleCount || visibleCount > LIST_PREVIEW) && (
                  <div className="mt-3 flex items-center justify-between gap-3 px-1">
                    <p className="text-[12px] text-slate">
                      {Math.min(visibleCount, listContents.length)}건 표시 중
                      {listContents.length > visibleCount && (
                        <> · 남은 {listContents.length - visibleCount}건</>
                      )}
                    </p>
                    <div className="flex items-center gap-3">
                      {visibleCount > LIST_PREVIEW && (
                        <button
                          type="button"
                          onClick={() => setVisibleCount(LIST_PREVIEW)}
                          className="text-[12px] font-semibold text-slate hover:text-azure-deep transition-colors whitespace-nowrap"
                        >
                          접기
                        </button>
                      )}
                      {listContents.length > visibleCount && (
                        <button
                          type="button"
                          onClick={() => setVisibleCount(n => n + LIST_MORE)}
                          className="text-[12px] font-semibold text-azure-deep hover:text-azure transition-colors whitespace-nowrap"
                        >
                          {Math.min(LIST_MORE, listContents.length - visibleCount)}개 더 보기
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-8 text-center text-[13px] text-slate">
                이 지점에 표시할 콘텐츠가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="owm-chart-section mt-3">
        <div className="owm-chart-header">
          <h3>
            지점별 비교
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
                const active = selected === loc.location
                return (
                  <tr
                    key={loc.location}
                    className={active ? 'bg-[#f0f6ff]' : undefined}
                    onClick={() => toggleLocation(loc.location)}
                    style={{ cursor: 'pointer' }}
                  >
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
