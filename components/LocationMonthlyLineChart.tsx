'use client'

import { useMemo, useState } from 'react'
import type { LocationMonthSeries } from '@/lib/monthly-performance'
import { LOC_COLOR } from '@/lib/feed-items'

const PLOT_TOP = 10
const PLOT_BOTTOM = 86

interface Props {
  months: string[]
  series: LocationMonthSeries[]
  highlightLocation?: string | null
  onHighlightLocation?: (location: string | null) => void
}

function lineY(value: number, max: number) {
  if (max <= 0) return PLOT_BOTTOM
  return PLOT_BOTTOM - ((value / max) * (PLOT_BOTTOM - PLOT_TOP))
}

function linePoints(values: number[], max: number, n: number) {
  if (!n) return ''
  return values
    .map((value, i) => {
      const x = ((i + 0.5) / n) * 100
      const y = lineY(value, max)
      return `${x},${y}`
    })
    .join(' ')
}

function fmtDelta(n: number) {
  if (n > 0) return `+${n}`
  return String(n)
}

export default function LocationMonthlyLineChart({
  months,
  series,
  highlightLocation: highlightLocationProp,
  onHighlightLocation,
}: Props) {
  const [highlightMonth, setHighlightMonth] = useState<string | null>(null)
  const [highlightLocationInner, setHighlightLocationInner] = useState<string | null>(null)

  const highlightLocation = highlightLocationProp ?? highlightLocationInner
  const setHighlightLocation = (loc: string | null) => {
    onHighlightLocation?.(loc)
    if (highlightLocationProp === undefined) setHighlightLocationInner(loc)
  }

  const totalMonthly = useMemo(() => months.map(month => ({
    month,
    count: series.reduce((sum, s) => sum + (s.points.find(p => p.month === month)?.count ?? 0), 0),
  })), [months, series])

  const locationLines = useMemo(() => series.map(s => {
    const counts = months.map(month => s.points.find(p => p.month === month)?.count ?? 0)
    const total = counts.reduce((a, b) => a + b, 0)
    return { location: s.location, counts, total }
  }).sort((a, b) => b.total - a.total), [months, series])

  const maxCount = Math.max(...locationLines.flatMap(s => s.counts), 1)
  const maxTotalMonth = Math.max(...totalMonthly.map(p => p.count), 1)

  const activeMonth = highlightMonth ?? months[months.length - 1] ?? null
  const activeIdx = activeMonth ? months.indexOf(activeMonth) : -1
  const activeTotal = activeIdx >= 0 ? totalMonthly[activeIdx] : null
  const prevTotal = activeIdx > 0 ? totalMonthly[activeIdx - 1]?.count ?? 0 : 0

  function toggleLocation(location: string) {
    setHighlightLocation(highlightLocation === location ? null : location)
  }

  if (!months.length || !series.length) {
    return (
      <div className="h-40 flex items-center justify-center text-[13px] text-slate">
        월별 진행 데이터가 없습니다.
      </div>
    )
  }

  const hasFocus = Boolean(highlightLocation)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-3 px-2.5 py-2 rounded-lg bg-[#f8fafc] border border-mist/90 text-[10px]">
        {locationLines.map(s => {
          const color = LOC_COLOR[s.location] ?? '#94a3b8'
          const active = highlightLocation === s.location
          return (
            <button
              key={s.location}
              type="button"
              aria-pressed={active}
              onClick={() => toggleLocation(s.location)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border transition-all
                ${active
                  ? 'font-bold text-body bg-white shadow-sm'
                  : hasFocus
                    ? 'text-slate/55 border-transparent hover:text-slate'
                    : 'text-slate border-transparent hover:bg-white/80 hover:text-body'}`}
              style={active ? { borderColor: color, boxShadow: `0 0 0 1px ${color}33` } : undefined}
            >
              <i className="w-4 h-[2.5px] rounded-full shrink-0" style={{ background: color }} />
              {s.location.replace('점', '')}
            </button>
          )
        })}
        <span className="text-[9.5px] text-slate/75 w-full sm:w-auto sm:ml-auto pt-0.5">
          지점 탭 · 월별 실제 업로드 건수
        </span>
      </div>

      <div className="relative h-52 rounded-lg bg-gradient-to-b from-[#f8fbff]/80 to-white px-1 pt-1">
        {[0.25, 0.5, 0.75, 1].map(ratio => (
          <div
            key={ratio}
            className="absolute left-1 right-1 border-t border-mist/70"
            style={{ bottom: `${ratio * 100}%` }}
          />
        ))}

        <div className="absolute inset-x-0 top-0 bottom-5 flex items-end gap-2 sm:gap-2.5 px-1 z-[1] pointer-events-none">
          {totalMonthly.map(({ month, count }) => {
            const barH = count > 0 ? Math.max((count / maxTotalMonth) * 100, 6) : 0
            const isActive = month === activeMonth
            return (
              <div key={month} className="flex-1 h-full flex items-end min-w-0">
                {count > 0 && (
                  <div
                    className={`w-full max-w-[48px] mx-auto rounded-t-[4px] transition-opacity
                      bg-gradient-to-t from-[#0B47B4] to-[#6FBFFF]
                      ${isActive ? 'opacity-20' : 'opacity-10'}`}
                    style={{ height: `${barH}%` }}
                  />
                )}
              </div>
            )
          })}
        </div>

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-[2]"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {locationLines.map(s => {
            const color = LOC_COLOR[s.location] ?? '#94a3b8'
            const active = highlightLocation === s.location
            const dimmed = hasFocus && !active
            const points = linePoints(s.counts, maxCount, months.length)
            return (
              <g key={s.location}>
                {active && (
                  <polyline
                    fill="none"
                    stroke="#fff"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={0.95}
                    points={points}
                  />
                )}
                <polyline
                  fill="none"
                  stroke={color}
                  strokeWidth={active ? 3 : hasFocus ? 1.5 : 2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  opacity={dimmed ? 0.15 : active ? 1 : 0.82}
                  points={points}
                />
              </g>
            )
          })}
        </svg>

        {locationLines.map(s => {
          const color = LOC_COLOR[s.location] ?? '#94a3b8'
          const activeLoc = highlightLocation === s.location
          const dimmed = hasFocus && !activeLoc
          if (dimmed) return null
          return months.map((month, i) => {
            const count = s.counts[i]
            if (count <= 0) return null
            const showDot = activeLoc || month === activeMonth
            if (!showDot) return null
            const yPct = lineY(count, maxCount)
            return (
              <div
                key={`${s.location}-${month}`}
                className="absolute z-[3] pointer-events-none"
                style={{
                  left: `${((i + 0.5) / months.length) * 100}%`,
                  bottom: `${yPct}%`,
                  transform: 'translate(-50%, 50%)',
                }}
              >
                {(activeLoc || month === activeMonth) && (
                  <span
                    className={`num absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+3px)] whitespace-nowrap
                      px-1 rounded font-bold ${activeLoc ? 'text-[9px]' : 'text-[8px] opacity-90'}`}
                    style={{ color, background: 'rgba(255,255,255,0.9)' }}
                  >
                    {count}
                  </span>
                )}
                <span
                  className={`block rounded-full border-2 border-white shadow-sm
                    ${activeLoc ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'}`}
                  style={{ background: color }}
                />
              </div>
            )
          })
        })}

        <div className="absolute inset-x-0 top-0 bottom-5 flex z-[4]">
          {months.map(month => {
            const isActive = month === activeMonth
            return (
              <button
                key={month}
                type="button"
                aria-pressed={isActive}
                onClick={() => setHighlightMonth(prev => (prev === month ? null : month))}
                className="flex-1 h-full cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-azure/40 bg-transparent"
              >
                <span className="sr-only">{month}</span>
              </button>
            )
          })}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex px-1 pointer-events-none z-[5]">
          {months.map(month => {
            const isActive = month === activeMonth
            return (
              <div key={month} className="flex-1 text-center min-w-0">
                <span className={`num block text-[10px] ${isActive ? 'font-bold text-azure-deep' : 'text-slate'}`}>
                  {Number(month.slice(5))}월
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {activeTotal && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 num text-[10px]">
            <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-azure/5 border border-mist">
              <span className="font-bold text-azure-deep text-[12px]">
                {Number(activeTotal.month.slice(5))}월
              </span>
              <span className="text-slate">선택</span>
            </div>
            <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white border border-mist">
              <span className="text-slate">전체</span>
              <b className="text-body">{activeTotal.count}건</b>
            </div>
            <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white border border-mist">
              <span className="text-slate">전월 대비</span>
              <b className={activeTotal.count - prevTotal >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                {fmtDelta(activeTotal.count - prevTotal)}
              </b>
            </div>
            <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white border border-mist">
              <span className="text-slate">최대 월</span>
              <b className="text-body">{maxCount}건</b>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 num text-[10px]">
            {locationLines.map(s => {
              const count = activeIdx >= 0 ? s.counts[activeIdx] : 0
              const prev = activeIdx > 0 ? s.counts[activeIdx - 1] : 0
              const delta = count - prev
              const active = highlightLocation === s.location
              const color = LOC_COLOR[s.location] ?? '#94a3b8'
              return (
                <button
                  key={s.location}
                  type="button"
                  onClick={() => toggleLocation(s.location)}
                  className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border text-left transition-all
                    ${active
                      ? 'bg-white shadow-sm font-semibold'
                      : hasFocus
                        ? 'bg-white/50 border-mist/50 opacity-60'
                        : 'bg-white border-mist/80 hover:border-mist'}`}
                  style={active ? { borderColor: color, boxShadow: `0 0 0 1px ${color}33` } : undefined}
                >
                  <span className="inline-flex items-center gap-1 text-slate min-w-0">
                    <i className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="truncate">{s.location.replace('점', '')}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <b className="text-body">{count}</b>
                    {activeIdx > 0 && (
                      <span className={`ml-1 text-[9px] ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmtDelta(delta)}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
