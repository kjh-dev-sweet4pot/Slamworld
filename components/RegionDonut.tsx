'use client'
import type { ChannelSummary, DonutChartProps } from '@/lib/types'

const CN_CHANNELS = new Set(['도우인', '웨이보', '샤오홍슈'])

const REGION_COLOR: Record<string, string> = {
  '중화권': '#EF4444',
  '영미권': '#1868F0',
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'K'
  return n.toLocaleString()
}

function aggregateRegions(data: ChannelSummary[]) {
  let cn = 0
  let west = 0
  for (const d of data) {
    if (CN_CHANNELS.has(d.channel)) cn += d.interaction
    else west += d.interaction
  }
  return [
    { region: '중화권', interaction: cn },
    { region: '영미권', interaction: west },
  ].filter(r => r.interaction > 0)
}

function slices(data: ChannelSummary[]) {
  const regions = aggregateRegions(data)
  const total = regions.reduce((s, d) => s + d.interaction, 0)
  if (total <= 0) return { total: 0, arcs: [] as never[] }

  const sorted = [...regions].sort((a, b) => b.interaction - a.interaction)
  const r = 68
  const c = 2 * Math.PI * r
  let offset = 0

  const arcs = sorted.map(d => {
    const ratio = d.interaction / total
    const dash = ratio * c
    const gap = c - dash
    const item = {
      ...d,
      color: REGION_COLOR[d.region],
      pct: Math.round(ratio * 100),
      dasharray: `${dash} ${gap}`,
      dashoffset: -offset,
    }
    offset += dash
    return item
  })

  return { total, arcs }
}

export default function RegionDonut({ data, scopeLabel, animationKey, loading }: DonutChartProps) {
  const { total, arcs } = slices(data)
  const top = arcs[0]

  return (
    <div className={`glass p-5 h-fit transition-opacity duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
      <span className="num text-[10.5px] text-slate tracking-widest uppercase">국가별 비중</span>
      <p className="text-[11.5px] text-body mt-1 mb-4">중화권 / 영미권 · {scopeLabel}</p>

      {arcs.length === 0 ? (
        <div className="h-40 grid place-items-center text-[13px] text-slate">데이터가 없습니다.</div>
      ) : (
        <div key={animationKey} className="donut-enter">
          <div className="relative mx-auto w-[176px] h-[176px]">
            <svg viewBox="0 0 176 176" className="w-full h-full -rotate-90">
              <circle cx="88" cy="88" r="68" fill="none" stroke="#E8F2FF" strokeWidth="22" />
              {arcs.map((a, i) => (
                <circle
                  key={a.region}
                  cx="88"
                  cy="88"
                  r="68"
                  fill="none"
                  stroke={a.color}
                  strokeWidth="22"
                  strokeDasharray={a.dasharray}
                  strokeDashoffset={a.dashoffset}
                  strokeLinecap="butt"
                  className="donut-arc"
                  style={{ transitionDelay: `${i * 60}ms` }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
              <div className="donut-center-num">
                <div className="num text-[20px] font-semibold tracking-tight leading-none">
                  {fmt(total)}
                </div>
                <div className="text-[10.5px] text-slate mt-1">상호작용</div>
              </div>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {arcs.map((a, i) => (
              <li
                key={a.region}
                className="donut-legend-item flex items-center gap-2"
                style={{ animationDelay: `${120 + i * 50}ms` }}
              >
                <span
                  className="w-2 h-2 rounded-[2px] flex-none"
                  style={{ background: a.color }}
                />
                <span className="text-[12.5px] font-semibold truncate">{a.region}</span>
                <span className="num text-[11px] text-slate ml-auto whitespace-nowrap">
                  {a.pct}% · {fmt(a.interaction)}
                </span>
              </li>
            ))}
          </ul>

          {top && (
            <p className="text-[11.5px] text-body leading-relaxed pt-3 mt-3 border-t border-mist donut-legend-item"
              style={{ animationDelay: `${120 + arcs.length * 50}ms` }}>
              <b className="text-azure-deep">{top.region}</b>이 상호작용의 {top.pct}%를 차지합니다.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
