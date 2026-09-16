'use client'

import { useState, useMemo } from 'react'
import type { Content } from '@/lib/types'
import { V2_LOC_COLORS, V2_ORDERED_LOCATIONS, V2_MONTHS } from '@/lib/v2-analytics'
import { contentViews } from '@/lib/content-views'

interface TrendAnalysisSectionProps {
  contents?: Content[]
}

export default function TrendAnalysisSection({
  contents = [],
}: TrendAnalysisSectionProps) {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')
  const [showAverage, setShowAverage] = useState(false)

  // 실제 데이터가 있는 지점들 순서 정렬
  const matrixData = useMemo(() => {
    const locSet = new Set(contents.map(c => c.location).filter(Boolean))
    const locations = V2_ORDERED_LOCATIONS.filter(l => locSet.has(l))

    return locations.map(locName => {
      const locRows = contents.filter(c => c.location === locName)
      const counts = V2_MONTHS.map(m => {
        return locRows.filter(c => c.visit_date?.startsWith(m)).length
      })

      const total = counts.reduce((a, b) => a + b, 0)
      const activeMonthsCount = counts.filter(c => c > 0).length
      const avg = activeMonthsCount > 0 ? (total / activeMonthsCount).toFixed(1) : '0'

      const maxCount = Math.max(...counts)
      const maxMonthIdx = counts.indexOf(maxCount)

      return {
        name: locName.replace('점', ''),
        color: V2_LOC_COLORS[locName] || '#6b6558',
        counts,
        maxMonthIdx: maxCount > 0 ? maxMonthIdx : -1,
        total,
        avg,
      }
    })
  }, [contents])

  // 지점별 콘텐츠 효율
  const efficiencyData = useMemo(() => {
    const locSet = new Set(contents.map(c => c.location).filter(Boolean))
    const locations = V2_ORDERED_LOCATIONS.filter(l => locSet.has(l))

    const list = locations.map(locName => {
      const locRows = contents.filter(c => c.location === locName)
      const views = locRows.reduce((s, c) => s + contentViews(c), 0)
      const count = locRows.length
      const avgViews = count > 0 ? Math.round(views / count) : 0

      return {
        name: locName.replace('점', ''),
        color: V2_LOC_COLORS[locName] || '#6b6558',
        avgViews,
        count,
        views,
      }
    }).sort((a, b) => b.avgViews - a.avgViews)

    const maxAvg = Math.max(...list.map(d => d.avgViews), 1)
    const totalViews = contents.reduce((s, c) => s + contentViews(c), 0)
    const overallAvg = contents.length > 0 ? Math.round(totalViews / contents.length) : 0

    return {
      list: list.map(d => ({
        ...d,
        val: d.avgViews.toLocaleString(),
        pct: Math.max(2, Math.round((d.avgViews / maxAvg) * 100)),
      })),
      overallAvg: overallAvg.toLocaleString(),
      topEff: list[0],
      topVol: [...list].sort((a, b) => b.views - a.views)[0],
    }
  }, [contents])

  const maxTotalForChart = useMemo(() => {
    return Math.max(...matrixData.map(d => d.total), 1)
  }, [matrixData])

  return (
    <section className="mb-8">
      <div className="text-[12.5px] font-bold tracking-[0.14em] text-[#a89a80] pt-6 pb-2.5 px-1">
        추이 분석
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. 지점별 월간 업로드 비교 */}
        <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
          <div className="flex items-center gap-2.5">
            <span className="text-[14.5px] font-extrabold text-[#1a1d2e]">
              지점별 월간 업로드 비교
            </span>
            <div className="ml-auto flex items-center gap-1 bg-[#f7f4ec] rounded-[9px] p-[3px]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                  viewMode === 'table'
                    ? 'font-bold text-[#1a1d2e] bg-white shadow-xs'
                    : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
                }`}
              >
                표
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                  viewMode === 'chart'
                    ? 'font-bold text-[#1a1d2e] bg-white shadow-xs'
                    : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
                }`}
              >
                차트
              </button>
            </div>
          </div>

          {matrixData.length === 0 ? (
            <div className="text-center py-12 text-[12px] text-[#9a9486]">집행된 지점 데이터가 없습니다.</div>
          ) : viewMode === 'table' ? (
            <div className="mt-4">
              <div className="grid grid-cols-[84px_repeat(6,minmax(0,1fr))_78px] gap-1.5 items-center pb-2.5 border-b border-[#eee6d6]">
                <span className="text-[11px] text-[#9a9486] font-semibold">지점</span>
                <span className="text-[11px] text-[#9a9486] font-semibold text-center">3월</span>
                <span className="text-[11px] text-[#9a9486] font-semibold text-center">4월</span>
                <span className="text-[11px] text-[#9a9486] font-semibold text-center">5월</span>
                <span className="text-[11px] text-[#9a9486] font-semibold text-center">6월 ☀️</span>
                <span className="text-[11px] text-[#9a9486] font-semibold text-center">7월</span>
                <span className="text-[11px] text-[#e03131] font-bold text-center">8월 ⚡</span>
                <span className="text-[11px] text-[#9a9486] font-semibold text-right">
                  {showAverage ? '월평균' : '누적'}
                </span>
              </div>

              {matrixData.map(row => (
                <div
                  key={row.name}
                  className="grid grid-cols-[84px_repeat(6,minmax(0,1fr))_78px] gap-1.5 items-center py-2.5 border-b border-[#f7f2e8] last:border-b-0"
                >
                  <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#1a1d2e]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                    {row.name}
                  </span>
                  {row.counts.map((cnt, i) => {
                    const isHighlight = i === row.maxMonthIdx && cnt > 0
                    const isAug = i === 5
                    return (
                      <span
                        key={i}
                        className={`text-center text-[12px] ${
                          cnt === 0
                            ? 'text-[#c9c2b2]'
                            : isHighlight
                            ? isAug
                              ? 'text-[13px] font-extrabold text-[#b42318] bg-[#fee2e2] rounded-[7px] py-1'
                              : 'text-[13px] font-extrabold text-[#1e40af] bg-[#dbeafe] rounded-[7px] py-1'
                            : 'font-semibold text-[#1a1d2e]'
                        }`}
                      >
                        {cnt > 0 ? cnt : '–'}
                      </span>
                    )
                  })}
                  <span className="text-right text-[13px] font-extrabold text-[#1a1d2e]">
                    {showAverage ? row.avg : `${row.total}건`}
                  </span>
                </div>
              ))}

              <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-[#eee6d6]">
                <span className="text-[11px] text-[#9a9486]">※ 실제 업로드 완료 건수 기준 집계</span>
                <button
                  type="button"
                  onClick={() => setShowAverage(!showAverage)}
                  className="ml-auto text-[11.5px] font-bold text-[#2f5fd8] bg-[#eef3ff] hover:bg-[#e0ebff] transition-colors rounded-[9px] px-3 py-1.5 whitespace-nowrap"
                >
                  {showAverage ? '📊 누적 합계 보기' : '📊 월 평균 보기'}
                </button>
              </div>
            </div>
          ) : (
            /* 차트 뷰 */
            <div className="mt-4 flex flex-col gap-3 py-2">
              {matrixData.map(row => {
                const widthPct = Math.min(100, Math.round((row.total / maxTotalForChart) * 100))
                return (
                  <div key={row.name} className="flex items-center gap-3">
                    <span className="w-14 text-[12px] font-bold text-[#1a1d2e]">{row.name}</span>
                    <span className="flex-1 h-3.5 rounded-full bg-[#f4efe3] overflow-hidden">
                      <span
                        className="block h-full rounded-full transition-all"
                        style={{ width: `${widthPct}%`, backgroundColor: row.color }}
                      />
                    </span>
                    <span className="w-12 text-right text-[12px] font-extrabold text-[#1a1d2e]">
                      {row.total}건
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 2. 지점별 콘텐츠 효율 */}
        <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
          <div className="flex items-center gap-2.5">
            <span className="text-[14.5px] font-extrabold text-[#1a1d2e]">
              지점별 콘텐츠 효율
            </span>
            <span className="ml-auto text-[11px] text-[#9a9486]">
              건당 평균 조회수
            </span>
          </div>

          <div className="flex items-center gap-2 mt-3.5 px-3 py-2 bg-[#fbf9f4] rounded-[10px]">
            <span className="text-[11.5px] text-[#9a9486]">전체 평균</span>
            <span className="text-[13px] font-extrabold text-[#e03131]">{efficiencyData.overallAvg}</span>
            <span className="text-[11.5px] text-[#9a9486]">조회 / 건</span>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {efficiencyData.list.length === 0 ? (
              <div className="text-center py-8 text-[12px] text-[#9a9486]">효율 데이터가 없습니다.</div>
            ) : (
              efficiencyData.list.map(item => (
                <div key={item.name}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[12.5px] font-bold text-[#1a1d2e]">{item.name}</span>
                    <span className="ml-auto text-[13px] font-extrabold text-[#1a1d2e]">
                      {item.val}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-[#f4efe3] overflow-hidden">
                    <span
                      className="block h-full rounded-full transition-all"
                      style={{
                        width: `${item.pct}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-[#fbf9f4] rounded-xl p-3 sm:p-3.5 mt-4 text-[12px] leading-relaxed text-[#4b4a44]">
            {efficiencyData.topEff ? (
              <>
                <b>{efficiencyData.topEff.name}점</b>이 건당 평균 {efficiencyData.topEff.avgViews.toLocaleString()}회로 효율 1위를 기록했습니다.
              </>
            ) : (
              '지점별 콘텐츠 성과를 분석 중입니다.'
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
