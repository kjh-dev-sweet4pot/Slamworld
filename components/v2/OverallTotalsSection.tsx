'use client'

import { useState, useMemo } from 'react'
import type { Content } from '@/lib/types'
import { V2_LOC_COLORS, V2_CH_COLORS, V2_MONTHS, formatViews, normalizeLocationName, v2TimeBuckets } from '@/lib/v2-analytics'
import { contentViews } from '@/lib/content-views'
import { useChartTooltip } from '@/components/v2/ChartTooltip'
import type { SectionPeriod } from '@/components/v2/SectionPeriodScope'

interface OverallTotalsSectionProps {
  contents?: Content[]
  /** 회원사 전용 뷰 — 데이터 규모가 작아 그래프가 바닥에 붙는 것을 막는 별도 최소 스케일 적용 */
  isPartner?: boolean
  /** 섹션 기간 (전체: 6개월 / 월별: 주차). 없으면 전체 6개월 */
  period?: SectionPeriod
}

const PARTNER_MIN_VIEWS = 10_000

const CHANNELS = ['샤오홍슈', '인스타그램', '틱톡', '도우인', '웨이보'] as const
const DEFAULT_BUCKETS = v2TimeBuckets('all', V2_MONTHS[V2_MONTHS.length - 1])
const DEFAULT_RANGE_LABEL = `${V2_MONTHS[0].replace('-', '.')} ~ ${V2_MONTHS[V2_MONTHS.length - 1].replace('-', '.')}`

/** SVG 라인 차트 x 좌표 (50 ~ 590 균등 분할) */
function xCoords(n: number): number[] {
  if (n <= 1) return [320]
  return Array.from({ length: n }, (_, i) => Math.round(50 + (i * 540) / (n - 1)))
}

/** 실제 최대값 바로 위의 보기 좋은 눈금 최대값 (1/2/5 × 10^n) */
function niceMax(value: number): number {
  if (value <= 1) return 1
  const exp = Math.floor(Math.log10(value))
  const base = Math.pow(10, exp)
  for (const step of [1, 2, 5, 10]) {
    if (value <= step * base) return step * base
  }
  return 10 * base
}

export default function OverallTotalsSection({
  contents = [],
  isPartner = false,
  period,
}: OverallTotalsSectionProps) {
  const [metricMode, setMetricMode] = useState<'views' | 'count'>('views')
  const tooltip = useChartTooltip()

  const buckets = period?.buckets ?? DEFAULT_BUCKETS
  const highlightIdx = period ? period.highlightIdx : buckets.length - 1
  const rangeLabel = period?.label ?? DEFAULT_RANGE_LABEL
  const isMonthly = period?.mode === 'monthly'
  const monthName = period ? `${Number(period.month.slice(5))}월` : ''
  const X_COORDS = useMemo(() => xCoords(buckets.length), [buckets.length])

  // 지점 목록 (데이터에 실제 존재하는 지점만 추출)
  const activeLocations = useMemo(() => {
    const locs = new Set(contents.map(c => normalizeLocationName(c.location)).filter(Boolean))
    return Object.keys(V2_LOC_COLORS).filter(l => locs.has(l))
  }, [contents])

  // 월별 스택 데이터
  const monthlyData = useMemo(() => {
    return buckets.map(bucket => {
      const monthRows = contents.filter(c => bucket.match(c.visit_date))
      const totalViews = monthRows.reduce((s, c) => s + contentViews(c), 0)
      const totalCount = monthRows.length

      // 지점별 분류
      const byLocation = activeLocations.map(loc => {
        const locRows = monthRows.filter(c => normalizeLocationName(c.location) === loc)
        const v = locRows.reduce((s, c) => s + contentViews(c), 0)
        const cnt = locRows.length
        return {
          location: loc,
          name: loc.replace('점', ''),
          color: V2_LOC_COLORS[loc] || '#6b6558',
          views: v,
          count: cnt,
        }
      }).filter(item => item.count > 0 || item.views > 0)

      return {
        month: bucket.key,
        label: bucket.label,
        detail: bucket.detail,
        views: totalViews,
        count: totalCount,
        byLocation,
      }
    })
  }, [contents, activeLocations, buckets])

  // 월별 최대값 (바 높이 180px 기준, 회원사 뷰는 최소 스케일 적용 — 주차 뷰는 규모가 작아 제외)
  const maxMonthViews = useMemo(() => {
    const floor = isPartner && !isMonthly ? PARTNER_MIN_VIEWS : 1
    return niceMax(Math.max(...monthlyData.map(m => m.views), floor))
  }, [monthlyData, isPartner, isMonthly])

  const maxMonthCount = useMemo(() => {
    return Math.max(...monthlyData.map(m => m.count), 1)
  }, [monthlyData])

  // 채널별 6개월 업로드 추이
  const channelTrends = useMemo(() => {
    const dataByCh = CHANNELS.map(ch => {
      const counts = buckets.map(b => {
        return contents.filter(c => c.channel === ch && b.match(c.visit_date) && c.upload_url).length
      })
      const total = counts.reduce((a, b) => a + b, 0)
      return {
        channel: ch,
        counts,
        total,
        color: V2_CH_COLORS[ch] || '#9ca3af',
      }
    })

    const allCounts = dataByCh.flatMap(d => d.counts)
    const maxVal = niceMax(Math.max(...allCounts, 1))

    const chLines = dataByCh
      .filter(d => d.total > 0)
      .map(d => {
        const points = d.counts.map((cnt, i) => {
          const x = X_COORDS[i]
          const y = 170 - Math.round((cnt / maxVal) * 150)
          return { x, y, count: cnt }
        })
        const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ')
        return {
          ...d,
          points,
          polylinePoints,
        }
      })

    // 강조 구간(당월) 최다 채널 — 월별 모드는 해당 월 전체 합계 기준
    let topAugCh = ''
    let topAugCount = 0
    for (const d of dataByCh) {
      const v = highlightIdx >= 0 ? d.counts[highlightIdx] : d.total
      if (v > topAugCount) {
        topAugCount = v
        topAugCh = d.channel
      }
    }

    return {
      dataByCh,
      chLines,
      maxVal,
      topAugCh,
      topAugCount,
    }
  }, [contents, buckets, highlightIdx, X_COORDS])


  return (
    <section className="mb-8">
      <div className="text-[12.5px] font-bold tracking-[0.14em] text-[#a89a80] pt-6 pb-2.5 px-1">
        전체 합계
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 월별 전체 조회수/건수 합계 */}
        <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[14.5px] font-extrabold text-[#1a1d2e]">
              {isMonthly ? `${monthName} 주차별` : '월별'} 전체 {metricMode === 'views' ? '조회수' : '건수'} 합계
            </span>
            <div className="ml-auto flex items-center gap-1 bg-[#f7f4ec] rounded-[9px] p-[3px]">
              <button
                type="button"
                onClick={() => setMetricMode('views')}
                className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                  metricMode === 'views'
                    ? 'font-bold text-[#1a1d2e] bg-white shadow-xs'
                    : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
                }`}
              >
                조회수
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('count')}
                className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                  metricMode === 'count'
                    ? 'font-bold text-[#1a1d2e] bg-white shadow-xs'
                    : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
                }`}
              >
                건수
              </button>
            </div>
            <span className="text-[11px] text-[#9a9486]">{rangeLabel}</span>
          </div>

          {/* 지점 범례 */}
          <div className="flex flex-wrap gap-2.5 mt-3 min-h-[20px]">
            {activeLocations.length === 0 ? (
              <span className="text-[11px] text-[#9a9486]">해당 지점 없음</span>
            ) : (
              activeLocations.map(loc => (
                <span key={loc} className="flex items-center gap-1.5 text-[11px] text-[#6b6558]">
                  <span className="w-[9px] h-[9px] rounded-[3px]" style={{ backgroundColor: V2_LOC_COLORS[loc] }} />
                  {loc.replace('점', '')}
                </span>
              ))
            )}
          </div>

          {/* 스택 바 차트 */}
          <div
            className="grid gap-3.5 items-end h-[232px] mt-4.5 pt-1 border-b border-[#eee6d6]"
            style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
          >
            {monthlyData.map((m, idx) => {
              const isLast = idx === highlightIdx
              const fmt = (views: number, count: number) =>
                metricMode === 'views' ? formatViews(views) : `${count}건`
              const labelText = metricMode === 'views'
                ? (m.views > 0 ? formatViews(m.views) : '0')
                : `${m.count}건`
              const tipRows = m.byLocation.map(seg => ({
                label: seg.name,
                color: seg.color,
                value: `${fmt(seg.views, seg.count)}${metricMode === 'views' ? ` · ${seg.count}건` : ''}`,
              }))

              return (
                <div
                  key={m.month}
                  className="flex flex-col items-center gap-1.5 h-full justify-end rounded-md hover:bg-[#faf7f0]/70 transition-colors cursor-default"
                  {...tooltip.bind(
                    `${m.label} · ${m.detail}`,
                    tipRows.length > 0 ? tipRows : [{ label: '집행 없음', value: '–' }],
                    `합계 ${m.views.toLocaleString()}회 · ${m.count}건`,
                  )}
                >
                  <span className={`text-[11.5px] ${
                    isLast && m.count > 0
                      ? 'font-extrabold text-[#e03131]'
                      : 'font-bold text-[#6b6558]'
                  }`}>
                    {labelText}
                  </span>

                  <div className="w-full max-w-[62px] flex flex-col justify-end rounded-t-md overflow-hidden bg-[#faf7f0] min-h-[4px]">
                    {m.byLocation.map(seg => {
                      const segVal = metricMode === 'views' ? seg.views : seg.count
                      const maxTotal = metricMode === 'views' ? maxMonthViews : maxMonthCount
                      const heightPx = Math.max(2, Math.round((segVal / maxTotal) * 180))

                      return (
                        <span
                          key={seg.location}
                          className="block transition-all"
                          style={{
                            height: `${heightPx}px`,
                            backgroundColor: seg.color,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="grid gap-3.5 mt-2"
            style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
          >
            {buckets.map((b, idx) => (
              <span
                key={b.key}
                className={`text-center text-[11.5px] ${
                  idx === highlightIdx ? 'font-bold text-[#e03131]' : 'text-[#9a9486]'
                }`}
              >
                {b.label}{idx === highlightIdx ? ' ⚡' : ''}
              </span>
            ))}
          </div>
        </div>

        {/* 채널별 업로드 추이 */}
        <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
          <div className="flex items-center gap-2.5">
            <span className="text-[14.5px] font-extrabold text-[#1a1d2e]">
              {isMonthly ? `${monthName} 주차별 ` : ''}채널별 업로드 추이
            </span>
            <span className="ml-auto text-[11px] text-[#9a9486]">
              {isMonthly ? '주차별' : '월별'} 건수 · {channelTrends.chLines.length}개 활성 채널
            </span>
          </div>

          <div className="flex flex-wrap gap-3 mt-3">
            <span className="flex items-center gap-1.5 text-[11px] text-[#6b6558]">
              <span className="w-3.5 h-[3px] rounded-[2px] bg-[#e03131]" />
              샤오홍슈
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#6b6558]">
              <span className="w-3.5 h-[3px] rounded-[2px] bg-[#8b5cf6]" />
              인스타그램
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#6b6558]">
              <span className="w-3.5 h-[3px] rounded-[2px] bg-[#06b6d4]" />
              틱톡
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#6b6558]">
              <span className="w-3.5 h-[3px] rounded-[2px] bg-[#9ca3af]" />
              도우인 · 웨이보
            </span>
          </div>

          <svg
            viewBox="0 0 640 220"
            className="w-full h-auto block mt-2.5"
            role="img"
            aria-label="채널별 월 업로드 건수 추이"
          >
            <g stroke="#f1ece0" strokeWidth="1">
              <line x1="36" y1="20" x2="620" y2="20" />
              <line x1="36" y1="70" x2="620" y2="70" />
              <line x1="36" y1="120" x2="620" y2="120" />
              <line x1="36" y1="170" x2="620" y2="170" />
            </g>
            <g fontSize="10" fill="#b5ad9c" textAnchor="end" fontWeight="600">
              <text x="30" y="23">{channelTrends.maxVal}</text>
              <text x="30" y="73">{Math.round((channelTrends.maxVal * 2) / 3)}</text>
              <text x="30" y="123">{Math.round(channelTrends.maxVal / 3)}</text>
              <text x="30" y="173">0</text>
            </g>

            {/* 동적 채널 라인 & 원형 포인트 */}
            {channelTrends.chLines.map(ch => (
              <g key={ch.channel}>
                <polyline
                  points={ch.polylinePoints}
                  fill="none"
                  stroke={ch.color}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {ch.points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={p.count > 0 ? (i === highlightIdx ? 5 : 4) : 2}
                    fill={ch.color}
                  />
                ))}
              </g>
            ))}

            {/* 당월 최고 채널 강조 라벨 */}
            {highlightIdx >= 0 && channelTrends.topAugCount > 0 && (
              <text x={X_COORDS[highlightIdx]} y="12" fontSize="11" fontWeight="800" fill="#e03131" textAnchor="middle">
                {channelTrends.topAugCount}건
              </text>
            )}

            <g fontSize="11" fill="#9a9486" textAnchor="middle" fontWeight="600">
              {buckets.map((b, idx) => (
                <text key={b.key} x={X_COORDS[idx]} y="196">{b.label}</text>
              ))}
            </g>

            {/* 호버 영역 (구간별 세로 밴드) */}
            {buckets.map((b, idx) => {
              const bandW = buckets.length > 1 ? 540 / (buckets.length - 1) : 540
              const rows = channelTrends.dataByCh
                .filter(d => d.total > 0)
                .map(d => ({ label: d.channel, color: d.color, value: `${d.counts[idx]}건` }))
              const sum = channelTrends.dataByCh.reduce((acc, d) => acc + d.counts[idx], 0)
              return (
                <g key={b.key} className="group">
                  <line
                    x1={X_COORDS[idx]} y1="20" x2={X_COORDS[idx]} y2="170"
                    stroke="#d8cfbd" strokeWidth="1" strokeDasharray="3 3"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <rect
                    x={X_COORDS[idx] - bandW / 2}
                    y="0"
                    width={bandW}
                    height="205"
                    fill="transparent"
                    {...tooltip.bind(
                      `${b.label} · ${b.detail}`,
                      rows.length > 0 ? rows : [{ label: '업로드 없음', value: '–' }],
                      `합계 ${sum}건`,
                    )}
                  />
                </g>
              )
            })}
          </svg>

          <div className="bg-[#fbf9f4] rounded-xl p-3 sm:p-3.5 mt-1.5 text-[12px] leading-relaxed text-[#4b4a44]">
            {channelTrends.topAugCount > 0 ? (
              <>
                <b>{highlightIdx >= 0 ? buckets[highlightIdx].label : monthName} {channelTrends.topAugCh} {channelTrends.topAugCount}건 집행.</b> 집중 채널을 중심으로 안정적인 노출량을 확보했습니다.
              </>
            ) : (
              '월별 채널 업로드 데이터를 집계 중입니다.'
            )}
          </div>
        </div>
      </div>
      {tooltip.node}
    </section>
  )
}
