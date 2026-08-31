'use client'
import { useState } from 'react'
import type { Content } from '@/lib/types'

const PERF_STYLE = {
  high:    { dot: 'bg-azure', label: '상위', text: 'text-azure-deep' },
  mid:     { dot: 'bg-sky',   label: '평균', text: 'text-sky' },
  low:     { dot: 'bg-slate', label: '하위', text: 'text-slate' },
  no_data: { dot: 'bg-amber', label: '데이터 없음', text: 'text-amber-ink' },
}

function fmt(n: number | null | undefined) {
  if (!n) return '—'
  if (n >= 1000) return (n/1000).toFixed(1)+'K'
  return n.toLocaleString()
}

function Avatar({ src, initial }: { src: string; initial: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="w-8 h-8 rounded flex-none grid place-items-center
        text-white text-xs font-bold"
        style={{background:'linear-gradient(140deg,#6FBFFF,#1868F0)'}}>
        {initial}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className="w-8 h-8 rounded object-cover flex-none bg-mist"
      onError={() => setFailed(true)}
    />
  )
}

export default function ContentCard({ c, tags }: { c: Content; tags?: string[] }) {
  const perf = PERF_STYLE[c.performance ?? 'no_data']
  const initial = c.influencer_name.slice(0, 2).toUpperCase()
  const photo = c.profile_image_url
    || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-photos/by-id/${c.id}`
  const displayViews = c.channel === '샤오홍슈'
    ? (c.views_estimated ?? c.views)
    : (c.views ?? c.views_estimated)
  const viewsEstimated = c.channel === '샤오홍슈'
    ? !!c.views_estimated
    : !c.views && !!c.views_estimated
  const viewsDisplay = displayViews
    ? (viewsEstimated ? `~${fmt(displayViews)}` : fmt(displayViews))
    : '—'

  return (
    <article className="glass-solid p-3.5 transition-all hover:-translate-y-0.5
      hover:border-sky hover:shadow-[0_8px_20px_rgba(12,58,130,.12)] cursor-default">

      {/* 브랜드 */}
      {c.brands && (
        <div className="text-[10.5px] font-bold text-azure mb-1.5 truncate">{c.brands}</div>
      )}

      {/* 인플루언서 */}
      <div className="flex items-center gap-2 mb-2.5">
        <Avatar src={photo} initial={initial} />
        <div className="min-w-0">
          <div className="text-[13px] font-bold leading-tight">{c.influencer_name}</div>
          <div className="num text-[10px] text-slate">
            {c.channel} · {c.location}
            {c.is_press && ' · 기자단'}
          </div>
        </div>
      </div>

      {tags && tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2.5">
          {tags.map(t => (
            <span key={t} className="text-[11px] font-bold text-azure-deep tracking-tight">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* 태그 */}
      <div className="flex gap-1 flex-wrap mb-2.5">
        <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-mist text-azure-deep">
          {c.channel}
        </span>
        {c.visit_date && (
          <span className="num text-[10.5px] px-1.5 py-0.5 rounded-[3px] bg-white/50 text-slate border border-mist">
            {c.visit_date}
          </span>
        )}
        {c.upload_url ? (
          <a href={c.upload_url} target="_blank" rel="noopener noreferrer"
            className="text-[10.5px] px-1.5 py-0.5 rounded-[3px] bg-azure/10 text-azure-deep
              hover:bg-azure hover:text-white transition-colors">
            ↗ 보기
          </a>
        ) : (
          <span className="text-[10.5px] px-1.5 py-0.5 rounded-[3px] bg-amber/10 text-amber-ink">
            링크 없음
          </span>
        )}
      </div>

      {/* 지표 */}
      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-mist">
        <div>
          <div className="text-[10px] text-slate">조회수</div>
          <div className="num text-[13.5px] font-semibold">
            {viewsDisplay}
            {viewsEstimated && (
              <span className="text-[9px] text-slate ml-0.5">추정</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate">좋아요</div>
          <div className="num text-[13.5px] font-semibold">{fmt(c.likes)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate">저장</div>
          <div className="num text-[13.5px] font-semibold">{fmt(c.saves)}</div>
        </div>
      </div>

      {/* 성과 등급 */}
      <div className={`flex items-center gap-1.5 mt-2.5 text-[11px] font-semibold ${perf.text}`}>
        <span className={`w-1.5 h-1.5 rounded-[1px] flex-none ${perf.dot}`}/>
        {perf.label}
        {c.performance === 'high' && c.total_interaction && (
          <span className="font-normal text-[10px] ml-0.5 text-slate">
            상호작용 {fmt(c.total_interaction)}
          </span>
        )}
      </div>
    </article>
  )
}
