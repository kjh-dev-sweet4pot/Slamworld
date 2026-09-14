'use client'
import type { CSSProperties } from 'react'
import type { Summary } from '@/lib/types'
import {
  goalMonthLabel,
  planProgressPct,
  type MonthlyGoal,
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

function SeptemberPlanCard({ goal }: { goal: MonthlyGoal }) {
  const pct = planProgressPct(goal.inProgress, goal.uploadTarget)
  return (
    <div
      className="owm-kpi-card"
      style={{ '--bc': '#f59e0b' } as CSSProperties}
      data-emoji="📅"
    >
      <div className="owm-kpi-header">
        <span className="owm-kpi-dot" />
        <span className="owm-kpi-label">{goalMonthLabel(goal.month)} 예정 업로드</span>
      </div>
      <div className="owm-kpi-amount">
        {goal.uploadTarget}
        <small>건</small>
      </div>
      <div className="owm-kpi-divider" />
      <div className="owm-kpi-sub">
        <span>{pct}% 진행중 · {goal.inProgress}명</span>
        <span className="mt-1.5 block h-[4px] rounded-full bg-[#f0f2f7] overflow-hidden">
          <span
            className="block h-full rounded-full bg-[#f59e0b]"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </span>
      </div>
    </div>
  )
}

export default function SnapshotBar({
  summary,
  monthGoal = null,
}: {
  summary: Summary | null
  monthGoal?: MonthlyGoal | null
}) {
  if (!summary) {
    return (
      <div className={`owm-kpi-grid mb-3 ${monthGoal ? 'owm-kpi-grid-5' : ''}`}>
        {[...Array(monthGoal ? 5 : 4)].map((_, i) => (
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
    <div className={`owm-kpi-grid mb-3 ${monthGoal ? 'owm-kpi-grid-5' : ''}`}>
      {monthGoal && <SeptemberPlanCard goal={monthGoal} />}
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
  )
}
