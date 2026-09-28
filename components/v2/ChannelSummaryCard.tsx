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

  return (
    <section className="mb-8">
      <div className="text-[12.5px] font-bold tracking-[0.14em] text-[#a89a80] pt-3 pb-2.5 px-1">
        채널별 성과
      </div>
      <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
        {rows.length === 0 ? (
          <div className="py-12 text-center text-[12px] text-[#9a9486]">이 기간의 업로드가 없습니다.</div>
        ) : (
          <>
            <div className="h-3 rounded-full bg-[#f4efe3] overflow-hidden flex">
              {rows.map(r => (
                <span
                  key={r.name}
                  className="block h-full"
                  style={{ width: `${totalViews ? (r.views / totalViews) * 100 : 0}%`, backgroundColor: CHANNEL_COLOR[r.name] ?? '#9a9486' }}
                />
              ))}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_56px_84px_60px_150px] gap-3 items-center px-2 pt-4 pb-2 border-b border-[#eee6d6] text-[11px] font-semibold text-[#9a9486]">
              <span>채널</span>
              <span className="text-right">업로드</span>
              <span className="text-right">조회수</span>
              <span className="text-right">비중</span>
              <span className="text-right">좋아요 · 저장 · 댓글</span>
            </div>
            {rows.map(r => (
              <div
                key={r.name}
                className="grid grid-cols-[minmax(0,1fr)_56px_84px_60px_150px] gap-3 items-center px-2 py-3 border-b border-[#f7f2e8] last:border-b-0"
              >
                <span className="flex items-center gap-2 text-[13px] font-bold text-[#1a1d2e] truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHANNEL_COLOR[r.name] ?? '#9a9486' }} />
                  {r.name}
                </span>
                <span className="text-right text-[12.5px] text-[#6b6558]">{r.posts}건</span>
                <span className="text-right text-[13.5px] font-extrabold text-[#1a1d2e]">{formatViews(r.views)}</span>
                <span className="text-right text-[12px] text-[#6b6558]">
                  {totalViews ? `${Math.round((r.views / totalViews) * 100)}%` : '–'}
                </span>
                <span className="text-right text-[11.5px] text-[#6b6558] whitespace-nowrap">
                  {r.likes.toLocaleString()} · {r.saves.toLocaleString()} · {r.comments.toLocaleString()}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  )
}
