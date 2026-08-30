'use client'
import type { Summary } from '@/lib/types'

function fmt(n: number) {
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+'M'
  if (n >= 1_000) return (n/1_000).toFixed(0)+'K'
  return n.toLocaleString()
}

export default function SnapshotBar({ summary }: { summary: Summary | null }) {
  if (!summary) return (
    <div className="grid grid-cols-4 gap-px bg-mist border border-mist rounded overflow-hidden mb-3">
      {[...Array(4)].map((_,i)=>(
        <div key={i} className="bg-white/70 p-4 animate-pulse h-24"/>
      ))}
    </div>
  )

  const items = [
    { k:'누적 방문 인플루언서', v: fmt(summary.total_influencers), unit:'명', d:'8개 지점 · 3월~8월' },
    { k:'누적 업로드',           v: fmt(summary.uploaded),          unit:'건', d:`링크 없음 ${summary.total_rows - summary.uploaded}건` },
    { k:'누적 조회수',           v: fmt(summary.total_views),       unit:'',   d:'인스타·틱톡·도우인·웨이보' },
    { k:'누적 좋아요',           v: fmt(summary.total_likes),       unit:'',   d:`저장 ${fmt(summary.total_saves)} · 댓글 ${fmt(summary.total_comments)}` },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-mist border border-mist rounded overflow-hidden mb-3">
      {items.map(({ k, v, unit, d }) => (
        <div key={k} className="bg-white/68 backdrop-blur p-4">
          <div className="text-xs font-semibold text-slate">{k}</div>
          <div className="num text-[28px] font-semibold tracking-tight leading-none my-2">
            {v}<span className="text-sm text-slate ml-1">{unit}</span>
          </div>
          <div className="text-[11px] text-body">{d}</div>
        </div>
      ))}
    </div>
  )
}
