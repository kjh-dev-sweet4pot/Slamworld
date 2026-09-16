'use client'

import { useState, useMemo } from 'react'
import type { Content, ContentFormat } from '@/lib/types'
import { classifyContentFormat, CONTENT_FORMAT_LABEL } from '@/lib/content-format'
import { contentViews } from '@/lib/content-views'
import { formatViews } from '@/lib/v2-analytics'

interface FormatAnalysisSectionProps {
  contents?: Content[]
}

const FORMAT_ORDER: ContentFormat[] = ['릴스', '노트', '숏폼', '게시물']
const CHANNELS = ['샤오홍슈', '인스타그램', '틱톡', '도우인', '웨이보'] as const

export default function FormatAnalysisSection({
  contents = [],
}: FormatAnalysisSectionProps) {
  const [viewMode, setViewMode] = useState<'perPost' | 'total'>('perPost')

  // 형식별 통계 집계
  const formatStats = useMemo(() => {
    const map = new Map<ContentFormat, { count: number; views: number; likes: number }>()
    for (const f of FORMAT_ORDER) {
      map.set(f, { count: 0, views: 0, likes: 0 })
    }

    for (const c of contents) {
      const f = classifyContentFormat(c)
      if (!f) continue
      const cur = map.get(f) ?? { count: 0, views: 0, likes: 0 }
      if (c.upload_url) cur.count += 1
      cur.views += contentViews(c)
      cur.likes += c.likes ?? 0
      map.set(f, cur)
    }

    const list = FORMAT_ORDER.map(f => {
      const data = map.get(f) || { count: 0, views: 0, likes: 0 }
      const meta = CONTENT_FORMAT_LABEL[f]
      const avgViews = data.count > 0 ? Math.round(data.views / data.count) : 0
      const avgLikes = data.count > 0 ? Math.round(data.likes / data.count) : 0

      return {
        format: f,
        ...meta,
        ...data,
        avgViews,
        avgLikes,
        viewsFormatted: formatViews(data.views),
      }
    })

    const topByAvgViews = [...list].sort((a, b) => b.avgViews - a.avgViews)[0]
    const topByTotalViews = [...list].sort((a, b) => b.views - a.views)[0]
    const maxAvgViews = Math.max(...list.map(d => d.avgViews), 1)

    return {
      list,
      topByAvgViews,
      topByTotalViews,
      maxAvgViews,
    }
  }, [contents])

  // 채널별 형식 구성
  const channelFormatComposition = useMemo(() => {
    const activeChannels = CHANNELS.filter(ch => contents.some(c => c.channel === ch))

    return activeChannels.map(ch => {
      const chRows = contents.filter(c => c.channel === ch)
      const total = chRows.length
      const counts: Record<string, number> = {
        '릴스': 0,
        '노트': 0,
        '숏폼': 0,
        '게시물': 0,
        '미발행': 0,
      }

      for (const r of chRows) {
        if (!r.upload_url) {
          counts['미발행'] += 1
        } else {
          const f = classifyContentFormat(r)
          if (f) counts[f] = (counts[f] || 0) + 1
          else counts['게시물'] += 1
        }
      }

      const pcts = Object.fromEntries(
        Object.entries(counts).map(([k, v]) => [k, total > 0 ? (v / total) * 100 : 0])
      )

      return {
        channel: ch,
        total,
        counts,
        pcts,
      }
    })
  }, [contents])

  return (
    <section className="mb-8">
      <div className="text-[12.5px] font-bold tracking-[0.14em] text-[#a89a80] pt-6 pb-2.5 px-1">
        콘텐츠 형식 분석
      </div>

      <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[14.5px] font-extrabold text-[#1a1d2e]">
            형식별 성과 가중치
          </span>
          <span className="text-[11px] text-[#9a9486]">
            업로드 링크 기준 자동 분류
          </span>
          <div className="ml-auto flex items-center gap-1 bg-[#f7f4ec] rounded-[9px] p-[3px]">
            <button
              type="button"
              onClick={() => setViewMode('perPost')}
              className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                viewMode === 'perPost'
                  ? 'font-bold text-[#1a1d2e] bg-white shadow-xs'
                  : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
              }`}
            >
              건당 조회
            </button>
            <button
              type="button"
              onClick={() => setViewMode('total')}
              className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                viewMode === 'total'
                  ? 'font-bold text-[#1a1d2e] bg-white shadow-xs'
                  : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
              }`}
            >
              총 조회
            </button>
          </div>
        </div>

        {/* 4개 형식 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {formatStats.list.map(f => {
            const isRank1 = formatStats.topByAvgViews?.format === f.format && f.avgViews > 0
            const displayVal = viewMode === 'perPost'
              ? (f.count > 0 ? f.avgViews.toLocaleString() : '0')
              : f.viewsFormatted

            return (
              <div
                key={f.format}
                className="bg-[#fbf9f4] border border-[#f0e9da] rounded-[13px] p-4"
                style={{ borderTop: `3px solid ${f.color}` }}
              >
                <div className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#1a1d2e]">
                  {f.emoji} {f.format === '게시물' ? '게시물(캐러셀)' : f.format === '노트' ? '노트(이미지)' : f.format === '숏폼' ? '숏폼 영상' : '릴스 / 숏폼'}
                </div>
                <div className="text-[11px] text-[#9a9486] mt-1">{f.sub}</div>
                <div className="text-[26px] font-extrabold tracking-tight mt-3" style={{ color: f.color }}>
                  {displayVal}
                </div>
                <div className="text-[11px] text-[#9a9486] mt-1">
                  {viewMode === 'perPost'
                    ? (isRank1 ? '건당 평균 조회 · 형식 1위' : '건당 평균 조회')
                    : '총 조회수'}
                </div>
                <div className="h-px bg-[#f0e9da] my-2.5" />
                <div className="flex gap-2.5 text-[11.5px] text-[#6b6558] whitespace-nowrap">
                  <span><b className="text-[13px] text-[#1a1d2e]">{f.count}</b>건</span>
                  <span><b className="text-[13px] text-[#1a1d2e]">{f.viewsFormatted}</b> 뷰</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 하단 2분할: 채널별 형식 구성 vs 형식별 반응 효율 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5 pt-4.5 border-t border-[#f4efe3]">
          {/* 채널별 형식 구성 */}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[13px] font-extrabold text-[#1a1d2e]">
                채널별 형식 구성
              </span>
              <div className="ml-auto flex flex-wrap gap-2 text-[10.5px] text-[#6b6558]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-[2px] bg-[#8b5cf6]" />
                  릴스
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-[2px] bg-[#e03131]" />
                  노트
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-[2px] bg-[#06b6d4]" />
                  숏폼
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-[2px] bg-[#64748b]" />
                  게시물
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-[2px] bg-[#e2dbcb]" />
                  미발행
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              {channelFormatComposition.length === 0 ? (
                <div className="text-center py-8 text-[12px] text-[#9a9486]">채널 형식 데이터가 없습니다.</div>
              ) : (
                channelFormatComposition.map(chItem => (
                  <div key={chItem.channel} className="flex items-center gap-2.5">
                    <span className="w-16 text-[12px] font-bold text-[#1a1d2e]">{chItem.channel}</span>
                    <span className="flex-1 h-[22px] rounded-[5px] bg-[#f4efe3] flex overflow-hidden">
                      {chItem.pcts['릴스'] > 0 && (
                        <span
                          className="flex items-center justify-center h-full bg-[#8b5cf6] text-white text-[10.5px] font-bold"
                          style={{ width: `${chItem.pcts['릴스']}%` }}
                        >
                          {chItem.pcts['릴스'] >= 25 ? `릴스 ${chItem.counts['릴스']}건` : ''}
                        </span>
                      )}
                      {chItem.pcts['노트'] > 0 && (
                        <span
                          className="flex items-center justify-center h-full bg-[#e03131] text-white text-[10.5px] font-bold"
                          style={{ width: `${chItem.pcts['노트']}%` }}
                        >
                          {chItem.pcts['노트'] >= 25 ? `노트 ${chItem.counts['노트']}건` : ''}
                        </span>
                      )}
                      {chItem.pcts['숏폼'] > 0 && (
                        <span
                          className="flex items-center justify-center h-full bg-[#06b6d4] text-white text-[10.5px] font-bold"
                          style={{ width: `${chItem.pcts['숏폼']}%` }}
                        >
                          {chItem.pcts['숏폼'] >= 25 ? `숏폼 ${chItem.counts['숏폼']}건` : ''}
                        </span>
                      )}
                      {chItem.pcts['게시물'] > 0 && (
                        <span
                          className="flex items-center justify-center h-full bg-[#64748b] text-white text-[10.5px] font-bold"
                          style={{ width: `${chItem.pcts['게시물']}%` }}
                        >
                          {chItem.pcts['게시물'] >= 25 ? `게시물 ${chItem.counts['게시물']}건` : ''}
                        </span>
                      )}
                      {chItem.pcts['미발행'] > 0 && (
                        <span
                          className="block h-full bg-[#e2dbcb]"
                          style={{ width: `${chItem.pcts['미발행']}%` }}
                        />
                      )}
                    </span>
                    <span className="w-11 text-right text-[12px] font-bold text-[#1a1d2e]">{chItem.total}건</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 형식별 반응 효율 */}
          <div>
            <div className="text-[13px] font-extrabold text-[#1a1d2e]">
              형식별 반응 효율
            </div>

            <div className="grid grid-cols-[96px_minmax(0,1fr)_62px_74px] gap-2.5 items-center mt-4 pb-2 border-b border-[#eee6d6]">
              <span className="text-[11px] text-[#9a9486] font-semibold">형식</span>
              <span className="text-[11px] text-[#9a9486] font-semibold">건당 조회</span>
              <span className="text-[11px] text-[#9a9486] font-semibold text-right">건수</span>
              <span className="text-[11px] text-[#9a9486] font-semibold text-right">건당 ❤️</span>
            </div>

            {formatStats.list.map(f => {
              const widthPct = formatStats.maxAvgViews > 0 && f.avgViews > 0
                ? Math.max(3, Math.round((f.avgViews / formatStats.maxAvgViews) * 100))
                : 0

              return (
                <div key={f.format} className="grid grid-cols-[96px_minmax(0,1fr)_62px_74px] gap-2.5 items-center py-2.5 border-b border-[#f7f2e8] last:border-b-0">
                  <span className="text-[12.5px] font-bold truncate" style={{ color: f.color }}>
                    {f.format}
                  </span>
                  <span className="h-3 rounded-full bg-[#f4efe3] overflow-hidden">
                    <span
                      className="block h-full rounded-full transition-all"
                      style={{ width: `${widthPct}%`, backgroundColor: f.color }}
                    />
                  </span>
                  <span className="text-right text-[12.5px] font-bold text-[#1a1d2e]">{f.count}</span>
                  <span className="text-right text-[12.5px] font-extrabold text-[#1a1d2e]">{f.avgLikes.toLocaleString()}</span>
                </div>
              )
            })}

            <div className="bg-[#fbf9f4] rounded-xl p-3 sm:p-3.5 mt-3.5 text-[12px] leading-relaxed text-[#4b4a44]">
              {formatStats.topByAvgViews && formatStats.topByAvgViews.count > 0 ? (
                <>
                  <b>{formatStats.topByAvgViews.format}가 건당 조회 {formatStats.topByAvgViews.avgViews.toLocaleString()}회로 형식 1위</b>를 기록했습니다. 물량은 <b>{formatStats.topByTotalViews?.format} ({formatStats.topByTotalViews?.count}건)</b>이 총 조회를 견인하고 있습니다.
                </>
              ) : (
                '콘텐츠 형식별 효율을 분석 중입니다.'
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
