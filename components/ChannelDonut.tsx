'use client'
import type { ChannelSummary } from '@/lib/types'

const CHANNEL_COLOR: Record<string, string> = {
  '샤오홍슈': '#1868F0',
  '인스타그램': '#0B47B4',
  '틱톡': '#6FBFFF',
  '도우인': '#4A6B93',
  '웨이보': '#F5A524',
}

const FALLBACK = ['#1868F0', '#0B47B4', '#6FBFFF', '#4A6B93', '#F5A524']

function colorFor(channel: string, i: number) {
  return CHANNEL_COLOR[channel] ?? FALLBACK[i % FALLBACK.length]
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'K'
  return n.toLocaleString()
}

function slices(data: ChannelSummary[]) {
  const total = data.reduce((s, d) => s + d.interaction, 0)
  if (total <= 0) return { total: 0, arcs: [] as never[] }

  const r = 68
  const c = 2 * Math.PI * r
  let offset = 0

  const arcs = data.map((d, i) => {
    const ratio = d.interaction / total
    const dash = ratio * c
    const gap = c - dash
    const item = {
      ...d,
      color: colorFor(d.channel, i),
      pct: Math.round(ratio * 100),
      dasharray: `${dash} ${gap}`,
      dashoffset: -offset,
    }
    offset += dash
    return item
  })

  return { total, arcs }
}

export default function ChannelDonut({ data }: { data: ChannelSummary[] }) {
  const { total, arcs } = slices(data)
  const top = arcs[0]

  return (
    <aside className="glass p-5 h-fit lg:sticky lg:top-16">
      <span className="num text-[10.5px] text-slate tracking-widest uppercase">채널별 성과</span>
      <p className="text-[11.5px] text-body mt-1 mb-4">좋아요 + 저장 합산 비중</p>

      {arcs.length === 0 ? (
        <div className="h-40 grid place-items-center text-[13px] text-slate">데이터가 없습니다.</div>
      ) : (
        <>
          <div className="relative mx-auto w-[176px] h-[176px]">
            <svg viewBox="0 0 176 176" className="w-full h-full -rotate-90">
              <circle cx="88" cy="88" r="68" fill="none" stroke="#E8F2FF" strokeWidth="22" />
              {arcs.map(a => (
                <circle
                  key={a.channel}
                  cx="88"
                  cy="88"
                  r="68"
                  fill="none"
                  stroke={a.color}
                  strokeWidth="22"
                  strokeDasharray={a.dasharray}
                  strokeDashoffset={a.dashoffset}
                  strokeLinecap="butt"
                />
              ))}
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
              <div>
                <div className="num text-[20px] font-semibold tracking-tight leading-none">
                  {fmt(total)}
                </div>
                <div className="text-[10.5px] text-slate mt-1">상호작용</div>
              </div>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {arcs.map(a => (
              <li key={a.channel} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-[2px] flex-none"
                  style={{ background: a.color }}
                />
                <span className="text-[12.5px] font-semibold truncate">{a.channel}</span>
                <span className="num text-[11px] text-slate ml-auto whitespace-nowrap">
                  {a.pct}% · {fmt(a.interaction)}
                </span>
              </li>
            ))}
          </ul>

          {top && (
            <p className="text-[11.5px] text-body leading-relaxed pt-3 mt-3 border-t border-mist">
              <b className="text-azure-deep">{top.channel}</b>이 상호작용의 {top.pct}%를 차지합니다.
            </p>
          )}
        </>
      )}
    </aside>
  )
}
