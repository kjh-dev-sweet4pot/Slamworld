'use client'

import { useState, useMemo } from 'react'
import type { Content } from '@/lib/types'
import { V2_LOC_COLORS, V2_CH_COLORS, V2_MONTHS, formatViews } from '@/lib/v2-analytics'
import { contentViews } from '@/lib/content-views'

interface OverallTotalsSectionProps {
  contents?: Content[]
}

const MONTH_LABELS = ['3월', '4월', '5월', '6월', '7월', '8월']
const X_COORDS = [50, 158, 266, 374, 482, 590]
const CHANNELS = ['샤오홍슈', '인스타그램', '틱톡', '도우인', '웨이보'] as const

export default function OverallTotalsSection({
  contents = [],
}: OverallTotalsSectionProps) {
  const [metricMode, setMetricMode] = useState<'views' | 'count'>('views')

  // 지점 목록 (데이터에 실제 존재하는 지점만 추출)
  const activeLocations = useMemo(() => {
    const locs = new Set(contents.map(c => c.location).filter(Boolean))
    return Object.keys(V2_LOC_COLORS).filter(l => locs.has(l))
  }, [contents])

  // 월별 스택 데이터
  const monthlyData = useMemo(() => {
    return V2_MONTHS.map((monthStr, idx) => {
      const monthRows = contents.filter(c => c.visit_date?.startsWith(monthStr))
      const totalViews = monthRows.reduce((s, c) => s + contentViews(c), 0)
      const totalCount = monthRows.length

      // 지점별 분류
      const byLocation = activeLocations.map(loc => {
        const locRows = monthRows.filter(c => c.location === loc)
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
        month: monthStr,
        label: MONTH_LABELS[idx],
        views: totalViews,
        count: totalCount,
        byLocation,
      }
    })
  }, [contents, activeLocations])

  // 월별 최대값 (바 높이 180px 기준)
  const maxMonthViews = useMemo(() => {
    return Math.max(...monthlyData.map(m => m.views), 1)
  }, [monthlyData])

  const maxMonthCount = useMemo(() => {
    return Math.max(...monthlyData.map(m => m.count), 1)
  }, [monthlyData])

  // 채널별 6개월 업로드 추이
  const channelTrends = useMemo(() => {
    const dataByCh = CHANNELS.map(ch => {
      const counts = V2_MONTHS.map(m => {
        return contents.filter(c => c.channel === ch && c.visit_date?.startsWith(m) && c.upload_url).length
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
    const maxVal = Math.max(...allCounts, 5)

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

    // 8월(마지막 월) 최다 채널
    const augIndex = 5
    let topAugCh = ''
    let topAugCount = 0
    for (const d of dataByCh) {
      if (d.counts[augIndex] > topAugCount) {
        topAugCount = d.counts[augIndex]
        topAugCh = d.channel
      }
    }

    return {
      chLines,
      maxVal,
      topAugCh,
      topAugCount,
    }
  }, [contents])

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
              월별 전체 {metricMode === 'views' ? '조회수' : '건수'} 합계
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
            <span className="text-[11px] text-[#9a9486]">2026.03 ~ 2026.08</span>
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
          <div className="grid grid-cols-6 gap-3.5 items-end h-[232px] mt-4.5 pt-1 border-b border-[#eee6d6]">
            {monthlyData.map((m, idx) => {
              const isAug = idx === 5
              const isJune = idx === 3
              const labelText = metricMode === 'views'
                ? (m.views > 0 ? formatViews(m.views) : '0')
                : `${m.count}건`

              return (
                <div key={m.month} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className={`text-[11.5px] ${
                    isAug && m.count > 0
                      ? 'font-extrabold text-[#e03131]'
                      : isJune && m.count > 0
                      ? 'font-extrabold text-[#1a1d2e]'
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
                          title={`${seg.name}: ${metricMode === 'views' ? formatViews(seg.views) : `${seg.count}건`}`}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-6 gap-3.5 mt-2">
            <span className="text-center text-[11.5px] text-[#9a9486]">3월</span>
            <span className="text-center text-[11.5px] text-[#9a9486]">4월</span>
            <span className="text-center text-[11.5px] text-[#9a9486]">5월</span>
            <span className="text-center text-[11.5px] font-bold text-[#6b6558]">6월 ☀️</span>
            <span className="text-center text-[11.5px] text-[#9a9486]">7월</span>
            <span className="text-center text-[11.5px] font-bold text-[#e03131]">8월 ⚡</span>
          </div>
        </div>

        {/* 채널별 업로드 추이 */}
        <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
          <div className="flex items-center gap-2.5">
            <span className="text-[14.5px] font-extrabold text-[#1a1d2e]">
              채널별 업로드 추이
            </span>
            <span className="ml-auto text-[11px] text-[#9a9486]">
              월별 건수 · {channelTrends.chLines.length}개 활성 채널
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
                    r={p.count > 0 ? (i === 5 ? 5 : 4) : 2}
                    fill={ch.color}
                  />
                ))}
              </g>
            ))}

            {/* 8월 최고 채널 강조 라벨 */}
            {channelTrends.topAugCount > 0 && (
              <text x="590" y="12" fontSize="11" fontWeight="800" fill="#e03131" textAnchor="middle">
                {channelTrends.topAugCount}건
              </text>
            )}

            <g fontSize="11" fill="#9a9486" textAnchor="middle" fontWeight="600">
              <text x="50" y="196">3월</text>
              <text x="158" y="196">4월</text>
              <text x="266" y="196">5월</text>
              <text x="374" y="196">6월</text>
              <text x="482" y="196">7월</text>
              <text x="590" y="196">8월</text>
            </g>
          </svg>

          <div className="bg-[#fbf9f4] rounded-xl p-3 sm:p-3.5 mt-1.5 text-[12px] leading-relaxed text-[#4b4a44]">
            {channelTrends.topAugCount > 0 ? (
              <>
                <b>8월 {channelTrends.topAugCh} {channelTrends.topAugCount}건 집행.</b> 집중 채널을 중심으로 안정적인 노출량을 확보했습니다.
              </>
            ) : (
              '월별 채널 업로드 데이터를 집계 중입니다.'
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
