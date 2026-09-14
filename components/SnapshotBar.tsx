'use client'
import type { CSSProperties } from 'react'
import type { Summary } from '@/lib/types'
import {
  goalMonthLabel,
  planProgressPct,
  type MonthlyGoal,
  type PlannedUpload,
} from '@/lib/monthly-goal'

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toLocaleString()
}

const KPI = [
  { key: 'influencers', label: '누적 방문 인플루언서', emoji: '🧍', color: '#4f8cff', unit: '명',
    sub: (s: Summary) => '8개 지점 · 3월~8월' },
  { key: 'uploaded', label: '누적 업로드', emoji: '📮', color: '#8b5cf6', unit: '건',
    sub: (s: Summary) => `링크 없음 ${s.total_rows - s.uploaded}건` },
  { key: 'views', label: '누적 조회수', emoji: '👀', color: '#06b6d4', unit: '',
    sub: () => '전 채널 · 샤오홍슈 역산 포함' },
  { key: 'likes', label: '누적 좋아요', emoji: '❤️', color: '#ec4899', unit: '',
    sub: (s: Summary) => `저장 ${fmt(s.total_saves)} · 댓글 ${fmt(s.total_comments)}` },
] as const

function visitLabel(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

function SeptemberPlanBanner({
  goal,
  people,
}: {
  goal: MonthlyGoal | null
  people: PlannedUpload[]
}) {
  const month = goal?.month ?? people[0]?.visitDate.slice(0, 7) ?? ''
  const scheduled = people.filter(p => p.status === '예정')
  const inProgress = people.filter(p => p.status === '진행중')
  const linedUp = scheduled.length + inProgress.length
  const target = goal?.uploadTarget ?? 0
  const pct = target > 0 ? planProgressPct(linedUp, target) : 0

  return (
    <div className="mb-3 rounded-2xl border border-[#f5d7a1] bg-[#fff8ee] px-4 py-3.5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[22px] font-black tracking-tight text-[#92400e]">
            {month ? `${goalMonthLabel(month)} 성과 예정` : '성과 예정'}
          </div>
          <p className="text-[12px] text-[#92400e] mt-0.5">
            업로드 예정 {scheduled.length}명
            {inProgress.length > 0 && ` · 진행중 ${inProgress.length}명`}
            {target > 0 && ` · 목표 대비 ${pct}%`}
          </p>
        </div>
        {target > 0 && (
          <div className="text-right">
            <div className="num text-[28px] font-extrabold leading-none tracking-tight text-[#92400e]">
              {target}<span className="text-[13px] font-bold ml-0.5">건</span>
            </div>
            <div className="text-[10px] font-semibold text-[#b45309] mt-1">목표 업로드</div>
          </div>
        )}
      </div>
      {target > 0 && (
        <div className="mt-2.5 h-1.5 rounded-full bg-white overflow-hidden">
          <div className="h-full rounded-full bg-[#f59e0b]" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
      {people.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {people.map(p => {
            const chip = (
              <>
                <b className="font-bold">{p.name}</b>
                <span className="text-[#b45309]">
                  {visitLabel(p.visitDate)} · {p.location.replace(/점$/, '')}
                  {p.status === '진행중' ? ' · 진행중' : ''}
                </span>
              </>
            )
            const cls = 'inline-flex items-center gap-1.5 rounded-full bg-white border border-[#f5d7a1] px-2.5 py-1 text-[12px] text-[#1a1d2e]'
            return (
              <li key={p.id}>
                {p.profileUrl ? (
                  <a href={p.profileUrl} target="_blank" rel="noopener noreferrer" className={cls}>{chip}</a>
                ) : (
                  <span className={cls}>{chip}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function SnapshotBar({
  summary,
  monthGoal = null,
  plannedUploads = [],
}: {
  summary: Summary | null
  monthGoal?: MonthlyGoal | null
  plannedUploads?: PlannedUpload[]
}) {
  const showPlan = !!monthGoal || plannedUploads.length > 0
  if (!summary) {
    return (
      <div className="owm-kpi-grid mb-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="owm-kpi-card animate-pulse h-28 bg-white/60" />
        ))}
      </div>
    )
  }

  const values: Record<string, string> = {
    influencers: String(summary.total_influencers),
    uploaded: String(summary.uploaded),
    views: fmt(summary.total_views),
    likes: fmt(summary.total_likes),
  }

  return (
    <>
    {showPlan && <SeptemberPlanBanner goal={monthGoal} people={plannedUploads} />}
    <div className="owm-kpi-grid mb-3">
      {KPI.map(({ key, label, emoji, color, unit, sub }) => (
        <div
          key={key}
          className="owm-kpi-card"
          style={{ '--bc': color } as CSSProperties}
          data-emoji={emoji}
        >
          <div className="owm-kpi-header">
            <span className="owm-kpi-dot" />
            <span className="owm-kpi-label">{label}</span>
          </div>
          <div className="owm-kpi-amount">
            {values[key]}
            {unit && <small>{unit}</small>}
          </div>
          <div className="owm-kpi-divider" />
          <div className="owm-kpi-sub"><span>{sub(summary)}</span></div>
        </div>
      ))}
    </div>
    </>
  )
}
