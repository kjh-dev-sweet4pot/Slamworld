'use client'

import type { MonthlyPoint } from '@/lib/monthly-performance'

export type { MonthlyPoint }

interface Props {
  data: MonthlyPoint[]
  variant?: 'monthly' | 'cumulative'
  highlightMonth?: string
  onSelectMonth?: (month: string) => void
}

const LINES = [
  { key: 'views' as const, label: '조회수', color: '#1868F0' },
  { key: 'likes' as const, label: '좋아요', color: '#F59E0B' },
  { key: 'saves' as const, label: '저장', color: '#16A34A' },
] as const

const PLOT_TOP = 10
const PLOT_BOTTOM = 90
const LINE_STROKE = 2.5
const LINE_HALO = 4

function fmtMetric(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function lineY(value: number, max: number) {
  if (max <= 0) return PLOT_BOTTOM
  return PLOT_BOTTOM - ((value / max) * (PLOT_BOTTOM - PLOT_TOP))
}

function linePoints(
  data: MonthlyPoint[],
  key: keyof Pick<MonthlyPoint, 'views' | 'likes' | 'saves'>,
  max: number,
) {
  const n = data.length
  if (n === 0) return ''
  return data
    .map((d, i) => {
      const x = ((i + 0.5) / n) * 100
      const y = lineY(d[key], max)
      return `${x},${y}`
    })
    .join(' ')
}

export default function MonthlyBarChart({
  data,
  variant = 'monthly',
  highlightMonth,
  onSelectMonth,
}: Props) {
  const cumulative = variant === 'cumulative'

  if (!data.length) {
    return (
      <div className="h-40 flex items-center justify-center text-[13px] text-slate">
        {cumulative ? '누적 데이터가 없습니다.' : '월별 데이터가 없습니다.'}
      </div>
    )
  }

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const maxByKey = {
    views: Math.max(...data.map(d => d.views), 1),
    likes: Math.max(...data.map(d => d.likes), 1),
    saves: Math.max(...data.map(d => d.saves), 1),
  }
  const latestMonth = highlightMonth ?? data[data.length - 1]?.month
  const active = data.find(d => d.month === latestMonth)
  const activeLabel = active ? `${Number(active.month.slice(5))}월` : ''

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2 mb-3 px-2.5 py-2 rounded-lg bg-[#f8fafc] border border-mist/90 text-[10.5px]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-body">
          <i className="w-3 h-3 rounded-[3px] bg-gradient-to-b from-[#6FBFFF] to-[#1868F0] shadow-sm" />
          {cumulative ? '누적 업로드' : '업로드'}
        </span>
        <span className="text-mist hidden sm:inline">|</span>
        {LINES.map(l => (
          <span key={l.key} className="inline-flex items-center gap-1.5 text-slate">
            <i className="w-5 h-[3px] rounded-full" style={{ background: l.color }} />
            {cumulative ? `누적 ${l.label}` : l.label}
          </span>
        ))}
        <span className="text-[9.5px] text-slate/75 sm:ml-auto">
          {cumulative ? '해당 월까지 합산' : '선 · 지표별 월 최대 대비'}
        </span>
      </div>

      <div className="relative h-48 rounded-lg bg-gradient-to-b from-[#f8fbff]/80 to-white px-1 pt-1">
        {[0.25, 0.5, 0.75, 1].map(ratio => (
          <div
            key={ratio}
            className="absolute left-1 right-1 border-t border-mist/70"
            style={{ bottom: `${ratio * 100}%` }}
          />
        ))}

        <div className="absolute inset-0 flex items-end gap-2 sm:gap-2.5 px-1 pb-0 z-[1]">
          {data.map(({ month, count }) => {
            const barPct = Math.max((count / maxCount) * 100, count > 0 ? 8 : 0)
            const isHighlight = month === latestMonth

            return (
              <button
                key={month}
                type="button"
                onClick={() => onSelectMonth?.(month)}
                aria-pressed={isHighlight}
                title={`${month}: ${count}건${cumulative ? ' (누적)' : ''}`}
                className="flex-1 h-full flex flex-col items-center min-w-0 group cursor-pointer
                  rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-azure/40 bg-transparent"
              >
                <span className={`num text-[11px] mb-1.5 shrink-0 transition-colors
                  ${isHighlight ? 'font-bold text-azure-deep' : 'font-semibold text-body'}`}>
                  {count >= 1000 ? fmtMetric(count) : count}
                </span>

                <div className="flex-1 w-full max-w-[52px] mx-auto flex items-end min-h-0">
                  <div
                    className={`w-full rounded-t-[5px] transition-all duration-300 ease-out
                      ${isHighlight
                        ? 'opacity-95 shadow-[0_4px_16px_rgba(24,104,240,.22)] bg-gradient-to-b from-[#6FBFFF] to-[#1868F0]'
                        : 'opacity-50 group-hover:opacity-70 bg-gradient-to-b from-[#E8F2FF] to-[#B8D4FF] group-hover:from-[#C5DFFF] group-hover:to-[#7EB3F5]'}`}
                    style={{ height: `${barPct}%` }}
                  />
                </div>

                <span
                  className={`num text-[10.5px] mt-2 shrink-0 whitespace-nowrap transition-colors
                    ${isHighlight ? 'font-bold text-azure-deep' : 'text-slate group-hover:text-azure-deep'}`}
                >
                  {Number(month.slice(5))}월
                </span>
              </button>
            )
          })}
        </div>

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-[2]"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {LINES.map(l => (
            <g key={l.key}>
              <polyline
                fill="none"
                stroke="#fff"
                strokeWidth={LINE_HALO}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                opacity={0.95}
                points={linePoints(data, l.key, maxByKey[l.key])}
              />
              <polyline
                fill="none"
                stroke={l.color}
                strokeWidth={LINE_STROKE}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                points={linePoints(data, l.key, maxByKey[l.key])}
              />
            </g>
          ))}
        </svg>

        {LINES.map(l =>
          data.map((d, i) => {
            const n = data.length
            const yPct = lineY(d[l.key], maxByKey[l.key])
            const isActive = d.month === latestMonth
            return (
              <div
                key={`${l.key}-${d.month}`}
                className={`absolute rounded-full border-2 border-white z-[3] pointer-events-none
                  shadow-[0_1px_3px_rgba(12,58,130,.2)] transition-all
                  ${isActive ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5 opacity-80'}`}
                style={{
                  left: `${((i + 0.5) / n) * 100}%`,
                  bottom: `${yPct}%`,
                  transform: 'translate(-50%, 50%)',
                  background: l.color,
                }}
              />
            )
          }),
        )}
      </div>

      {active && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 num text-[10px]">
          <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-azure/5 border border-mist">
            <span className="font-bold text-azure-deep text-[12px]">
              {cumulative ? `${activeLabel}까지` : activeLabel}
            </span>
            <span className="text-slate">{cumulative ? '누적' : '선택'}</span>
          </div>
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white border border-mist">
            <span className="text-slate">업로드</span>
            <b className="text-body">{active.count}건</b>
          </div>
          {LINES.map(l => (
            <div
              key={l.key}
              className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white border border-mist"
            >
              <span className="inline-flex items-center gap-1 text-slate">
                <i className="w-2 h-[3px] rounded-full shrink-0" style={{ background: l.color }} />
                {l.label}
              </span>
              <b className="text-body">{fmtMetric(active[l.key])}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
