'use client'

import { useMemo } from 'react'
import type { Content } from '@/lib/types'
import { contentViews } from '@/lib/content-views'
import { formatViews } from '@/lib/v2-analytics'

const CHANNEL_COLOR: Record<string, string> = {
  샤오홍슈: '#e03131',
  인스타그램: '#8b5cf6',
  틱톡: '#06b6d4',
  도우인: '#475569',
  웨이보: '#f59e0b',
}

/** 업로드 목록 옆 채널별 성과 요약 — 기간 필터를 그대로 따른다 */
export default function ChannelSummaryCard({ contents }: { contents: Content[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, { posts: number; views: number; likes: number; saves: number; comments: number }>()
    for (const c of contents) {
      if (!c.upload_url || !c.channel) continue
      const r = map.get(c.channel) ?? { posts: 0, views: 0, likes: 0, saves: 0, comments: 0 }
      r.posts += 1
      r.views += contentViews(c)
      r.likes += c.likes ?? 0
      r.saves += c.saves ?? 0
      r.comments += c.comments ?? 0
      map.set(c.channel, r)
    }
    return [...map].map(([name, r]) => ({ name, ...r })).sort((a, b) => b.views - a.views)
  }, [contents])

  const totalViews = rows.reduce((s, r) => s + r.views, 0)

  const cols = 'grid grid-cols-[90px_repeat(6,minmax(0,1fr))] gap-1.5 min-w-[460px]'

  return (
    <section className="mb-8 bg-white border border-[#f2ebdd] rounded-[6px] p-[18px] shadow-[0_4px_16px_rgba(30,41,59,0.06)]">
      <h3 className="m-0 text-[18px] font-extrabold text-[#1a1d2e]">채널별 성과</h3>
      {rows.length === 0 ? (
        <div className="py-12 text-center text-[12px] text-[#6b6558]">이 기간의 업로드가 없습니다.</div>
      ) : (
        <>
          <div className="h-3.5 rounded-[7px] bg-[#f4efe3] overflow-hidden flex mt-3">
            {rows.map(r => (
              <span
                key={r.name}
                className="block h-full"
                style={{ width: `${totalViews ? (r.views / totalViews) * 100 : 0}%`, backgroundColor: CHANNEL_COLOR[r.name] ?? '#9a9486' }}
              />
            ))}
          </div>
          {/* 좁은 화면은 카드 안에서만 가로 스크롤 */}
          <div className="overflow-x-auto">
            <div className={`${cols} text-[11px] text-[#6b6558] pt-3 pb-1.5 border-b border-[#efe5d0]`}>
              <span>채널</span>
              <span className="text-right">업로드</span>
              <span className="text-right">조회수</span>
              <span className="text-right">비중</span>
              <span className="text-right">좋아요</span>
              <span className="text-right">저장</span>
              <span className="text-right">댓글</span>
            </div>
            {rows.map(r => (
              <div key={r.name} className={`${cols} py-[7px] border-b border-[#f4efe4] text-[12px] text-[#1a1d2e]`}>
                <span className="flex items-center gap-1.5 font-bold truncate">
                  <span className="w-2 h-2 rounded-[2px] shrink-0" style={{ backgroundColor: CHANNEL_COLOR[r.name] ?? '#9a9486' }} />
                  {r.name}
                </span>
                <span className="text-right">{r.posts}건</span>
                <span className="text-right font-bold">{formatViews(r.views)}</span>
                <span className="text-right">{totalViews ? `${Math.round((r.views / totalViews) * 100)}%` : '–'}</span>
                <span className="text-right">{r.likes.toLocaleString()}</span>
                <span className="text-right">{r.saves.toLocaleString()}</span>
                <span className="text-right">{r.comments.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
