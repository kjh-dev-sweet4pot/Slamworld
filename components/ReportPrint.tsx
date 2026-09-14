'use client'
import type { Content, Summary, ChannelSummary } from '@/lib/types'
import type { MonthlyPoint } from '@/lib/monthly-performance'
import { contentViewsDisplay } from '@/lib/content-views'
import { LOC_COLOR } from '@/lib/feed-items'
import { goalMonthLabel, planProgressPct, type MonthlyGoal } from '@/lib/monthly-goal'

const CHANNEL_COLOR: Record<string, string> = {
  '샤오홍슈': '#1868F0',
  '인스타그램': '#0B47B4',
  '틱톡': '#6FBFFF',
  '도우인': '#4A6B93',
  '웨이보': '#F5A524',
}
const CN = new Set(['도우인', '웨이보', '샤오홍슈'])
const TOP_N = 10

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`
  return n.toLocaleString()
}

function fmtViews(c: Content): string {
  const { value, estimated } = contentViewsDisplay(c)
  if (!value) return '—'
  return estimated ? `~${fmt(value)}` : fmt(value)
}

function topByLikes(rows: Content[], n: number): Content[] {
  return [...rows].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).slice(0, n)
}

function locBars(rows: Content[]): { name: string; count: number; likes: number }[] {
  const map = new Map<string, { count: number; likes: number }>()
  for (const r of rows) {
    const b = map.get(r.location) ?? { count: 0, likes: 0 }
    b.count += 1
    b.likes += r.likes ?? 0
    map.set(r.location, b)
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-[5px] rounded-full bg-[#eef0f4] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(pct, 2))}%`, background: color }} />
    </div>
  )
}

export default function ReportPrint({
  partnerBrand,
  scope,
  summary,
  monthly,
  channels,
  rows,
  monthGoal = null,
}: {
  partnerBrand: string | null
  scope: string
  summary: Summary | null
  monthly: MonthlyPoint[]
  channels: ChannelSummary[]
  rows: Content[]
  monthGoal?: MonthlyGoal | null
}) {
  const chMax = Math.max(1, ...channels.map(c => c.interaction))
  const locs = locBars(rows)
  const locMax = Math.max(1, ...locs.map(l => l.count))
  const monthMax = Math.max(1, ...monthly.map(m => m.count))
  const top = topByLikes(rows, TOP_N)
  const cn = channels.filter(c => CN.has(c.channel)).reduce((s, c) => s + c.interaction, 0)
  const west = channels.filter(c => !CN.has(c.channel)).reduce((s, c) => s + c.interaction, 0)
  const regionTotal = cn + west || 1

  const kpis = summary ? [
    ...(monthGoal ? [[
      `${goalMonthLabel(monthGoal.month)} 예정 업로드`,
      `${monthGoal.uploadTarget}건`,
      `${planProgressPct(monthGoal.inProgress, monthGoal.uploadTarget)}% 진행중`,
    ] as const] : []),
    ['인플루언서', `${summary.total_influencers.toLocaleString()}명`, ''],
    ['업로드', `${summary.uploaded.toLocaleString()}건`, ''],
    ['조회수', fmt(summary.total_views), ''],
    ['좋아요', fmt(summary.total_likes), `저장 ${fmt(summary.total_saves)} · 댓글 ${fmt(summary.total_comments)}`],
  ] : []

  return (
    <div className="report-print">
      <header className="flex items-end justify-between gap-3 border-b border-[#e8eaef] pb-2 mb-3">
        <div>
          <h1 className="text-[16px] font-semibold tracking-tight leading-tight">
            <b className="text-[#2f1c13]">OWM</b>
            <span className="text-[#9aa0b3] font-normal mx-1">×</span>
            {partnerBrand ? `${partnerBrand} 리포트` : '브랜드슬램 인플루언서 리포트'}
          </h1>
          <p className="text-[10.5px] text-[#6b728a] mt-0.5">09.03 기준 · {scope}</p>
        </div>
        <p className="text-[10px] text-[#9aa0b3] shrink-0">한눈에 보기</p>
      </header>

      {summary && (
        <div className={`grid gap-2 mb-3 ${monthGoal ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {kpis.map(([label, value, note]) => (
            <div key={label} className="rounded-lg border border-[#e8eaef] px-2.5 py-2">
              <div className="text-[10px] text-[#6b728a] font-semibold">{label}</div>
              <div className="num text-[18px] font-extrabold tracking-tight mt-0.5">{value}</div>
              {note && <div className="text-[9.5px] text-[#9aa0b3] mt-0.5">{note}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <section>
          <h2 className="text-[11px] font-extrabold tracking-tight mb-1.5">채널 · 상호작용</h2>
          <div className="space-y-1.5">
            {channels.map(c => (
              <div key={c.channel}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="font-semibold">{c.channel}</span>
                  <span className="num text-[#6b728a]">{fmt(c.interaction)} · {c.count}건</span>
                </div>
                <Bar pct={(c.interaction / chMax) * 100} color={CHANNEL_COLOR[c.channel] ?? '#4f8cff'} />
              </div>
            ))}
          </div>
          {regionTotal > 1 && (
            <p className="text-[10px] text-[#6b728a] mt-2">
              중화권 {Math.round((cn / regionTotal) * 100)}% · 영미권 {Math.round((west / regionTotal) * 100)}%
            </p>
          )}
        </section>
        <section>
          <h2 className="text-[11px] font-extrabold tracking-tight mb-1.5">지점 · 콘텐츠</h2>
          <div className="space-y-1.5">
            {locs.map(l => (
              <div key={l.name}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="font-semibold">{l.name}</span>
                  <span className="num text-[#6b728a]">{l.count}건 · 좋아요 {fmt(l.likes)}</span>
                </div>
                <Bar pct={(l.count / locMax) * 100} color={LOC_COLOR[l.name] ?? '#4f8cff'} />
              </div>
            ))}
          </div>
        </section>
      </div>

      {monthly.length > 0 && (
        <section className="mb-3">
          <h2 className="text-[11px] font-extrabold tracking-tight mb-1.5">월별 업로드</h2>
          <div className="flex items-end gap-1.5 h-[52px]">
            {monthly.map(m => (
              <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                <span className="num text-[9px] text-[#6b728a] mb-0.5">{m.count}</span>
                <div
                  className="w-full max-w-[28px] rounded-t-[3px] bg-[#4f8cff]"
                  style={{ height: `${Math.max(6, (m.count / monthMax) * 36)}px` }}
                />
                <span className="num text-[9px] text-[#9aa0b3] mt-0.5">{Number(m.month.slice(5))}월</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-[11px] font-extrabold tracking-tight mb-1.5">
          좋아요 TOP {top.length}
          <span className="ml-1.5 font-semibold text-[#9aa0b3]">{rows.length}건 중</span>
        </h2>
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="text-left text-[#6b728a] border-b border-[#e8eaef]">
              <th className="py-1 pr-1 font-semibold w-5">#</th>
              <th className="py-1 pr-2 font-semibold">인플루언서</th>
              <th className="py-1 pr-2 font-semibold">채널</th>
              <th className="py-1 pr-2 font-semibold">지점</th>
              <th className="py-1 pr-2 font-semibold">조회수</th>
              <th className="py-1 pr-2 font-semibold">좋아요</th>
              <th className="py-1 font-semibold">저장</th>
            </tr>
          </thead>
          <tbody>
            {top.map((c, i) => (
              <tr key={c.id} className="border-b border-[#eef0f4]">
                <td className="py-1 pr-1 num text-[#9aa0b3]">{i + 1}</td>
                <td className="py-1 pr-2 font-semibold">{c.influencer_name}</td>
                <td className="py-1 pr-2">{c.channel}</td>
                <td className="py-1 pr-2">{c.location}</td>
                <td className="py-1 pr-2 num">{fmtViews(c)}</td>
                <td className="py-1 pr-2 num">{c.likes?.toLocaleString() ?? '—'}</td>
                <td className="py-1 num">{c.saves?.toLocaleString() ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-[9.5px] text-[#9aa0b3] mt-3 leading-relaxed">
        샤오홍슈·도우인 조회수는 좋아요·저장·댓글 역산. 전체 {rows.length}건 리스트는 엑셀 저장.
      </p>
    </div>
  )
}

// ponytail: smoke
if (process.env.NODE_ENV !== 'production') {
  const sample = [
    { likes: 1, id: 1 },
    { likes: 9, id: 2 },
    { likes: 3, id: 3 },
  ] as Content[]
  const t = topByLikes(sample, 2)
  if (t[0]?.id !== 2 || t[1]?.id !== 3) throw new Error('report-print topByLikes self-check failed')
}
