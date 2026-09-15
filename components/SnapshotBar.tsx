'use client'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Summary } from '@/lib/types'
import {
  goalMonthLabel,
  planProgressPct,
  type MonthlyGoal,
  type PlannedUpload,
  type RecentUpload,
} from '@/lib/monthly-goal'

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toLocaleString()
}

const KPI = [
  { key: 'influencers', label: '누적 방문 인플루언서', emoji: '🧍', color: '#4f8cff', unit: '명',
    sub: () => '8개 지점' },
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

function photoSrc(id: number): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-photos/by-id/${id}`
}

function Face({ id, name }: { id: number; name: string }) {
  const [failed, setFailed] = useState(false)
  const initial = name.slice(0, 1)
  if (failed) {
    return (
      <span className="w-8 h-8 rounded-full flex-none grid place-items-center text-white text-[11px] font-bold bg-gradient-to-br from-[#6FBFFF] to-[#1868F0]">
        {initial}
      </span>
    )
  }
  return (
    <img
      src={photoSrc(id)}
      alt=""
      className="w-8 h-8 rounded-full object-cover flex-none bg-[#f1f4f8]"
      onError={() => setFailed(true)}
    />
  )
}

function SeptemberPlanBanner({
  goal,
  people,
  recent,
}: {
  goal: MonthlyGoal | null
  people: PlannedUpload[]
  recent: RecentUpload[]
}) {
  const month = goal?.month ?? people[0]?.visitDate.slice(0, 7) ?? ''
  const scheduled = people.filter(p => p.status === '예정')
  const inProgress = people.filter(p => p.status === '진행중')
  const linedUp = scheduled.length + inProgress.length
  const target = goal?.uploadTarget ?? 0
  const pct = target > 0 ? planProgressPct(linedUp, target) : 0

  return (
    <div className="mb-3 relative flex flex-row gap-3">
      <div className="min-w-0 flex-1 rounded-2xl border border-[#f5d7a1] bg-[#fff8ee] px-4 py-3.5">
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

      <div className="w-[320px] shrink-0" aria-hidden />
      <div className="absolute top-0 right-0 bottom-0 w-[320px] flex flex-col rounded-2xl border border-[#e8eaef] bg-white overflow-hidden shadow-[0_4px_16px_rgba(30,41,59,.06)]">
        <div className="px-3 py-2.5 border-b border-[#f1f4f8] flex items-baseline justify-between gap-2 shrink-0">
          <span className="text-[12px] font-extrabold tracking-tight">최근 업로드</span>
          <span className="num text-[10px] font-semibold text-owm-text3">위가 최신 · {recent.length}</span>
        </div>
        {recent.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12px] text-owm-text3">업로드 내역이 없습니다.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-0.5 p-1.5 content-start flex-1 min-h-0 overflow-y-auto">
            {recent.map(r => {
              const href = r.uploadUrl || r.profileUrl
              const body = (
                <>
                  <Face id={r.id} name={r.name} />
                  <span className="min-w-0">
                    <span className="block text-[12px] font-bold leading-tight truncate">{r.name}</span>
                    <span className="block text-[10px] text-owm-text3 mt-0.5 truncate">
                      {visitLabel(r.visitDate)} · {r.location.replace(/점$/, '')}
                    </span>
                  </span>
                </>
              )
              const cls = 'flex items-center gap-2 rounded-lg px-1.5 py-1.5 min-w-0 hover:bg-[#f4f7fb]'
              return (
                <li key={r.id}>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className={cls} title={r.channel}>{body}</a>
                  ) : (
                    <div className={cls} title={r.channel}>{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function SnapshotBar({
  summary,
  monthGoal = null,
  plannedUploads = [],
  recentUploads = [],
}: {
  summary: Summary | null
  monthGoal?: MonthlyGoal | null
  plannedUploads?: PlannedUpload[]
  recentUploads?: RecentUpload[]
}) {
  const showPlan = !!monthGoal || plannedUploads.length > 0 || recentUploads.length > 0
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
    {showPlan && (
      <SeptemberPlanBanner goal={monthGoal} people={plannedUploads} recent={recentUploads} />
    )}
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
