'use client'

import { useMemo } from 'react'
import type { Content } from '@/lib/types'
import { contentViews, aggregateEmv, contentEmv } from '@/lib/content-views'
import aggJson from '@/data/agg.json'

interface ExecutionSummarySectionProps {
  contents?: Content[]
}

export default function ExecutionSummarySection({
  contents = [],
}: ExecutionSummarySectionProps) {
  const metrics = useMemo(() => {
    const totalViews = contents.reduce((s, c) => s + contentViews(c), 0)
    const uploaded = contents.filter(c => c.upload_url).length
    const totalRows = contents.length
    const publishRate = totalRows > 0 ? ((uploaded / totalRows) * 100).toFixed(1) : '0'
    const unreleased = Math.max(0, totalRows - uploaded)
    const saves = contents.reduce((s, c) => s + (c.saves ?? 0), 0)

    // EMV(Earned Media Value) — 조회·좋아요·저장·댓글 통합 환산
    const emv = aggregateEmv(contents)
    const emvTotal = Math.round(emv.total / 10000)
    const emvViewShare = Math.round(emv.viewValue / 10000)
    const emvEngageShare = Math.round((emv.likeValue + emv.commentValue) / 10000)
    const emvSaveShare = Math.round(emv.saveValue / 10000)
    const emvProductionShare = Math.round(emv.productionValue / 10000)
    const emvMax = Math.max(emvViewShare, emvEngageShare, emvSaveShare, emvProductionShare, 1)

    // 단건 최고 (EMV 기준)
    const topContent = [...contents].sort((a, b) => contentEmv(b) - contentEmv(a))[0]
    const topContentValue = topContent ? Math.round(contentEmv(topContent) / 10000) : 0

    // 현장 진행 통계
    const visitDates = new Set(contents.map(c => c.visit_date).filter(Boolean))
    const uniqueInfluencers = new Set(contents.map(c => c.influencer_name)).size
    const campaignsCount = new Set(contents.map(c => c.campaign)).size
    const locationsCount = new Set(contents.map(c => c.location)).size

    const dateCounts = new Map<string, number>()
    for (const c of contents) {
      if (c.visit_date) {
        dateCounts.set(c.visit_date, (dateCounts.get(c.visit_date) ?? 0) + 1)
      }
    }
    let maxDate = ''
    let maxDateCount = 0
    for (const [d, cnt] of dateCounts.entries()) {
      if (cnt > maxDateCount) {
        maxDateCount = cnt
        maxDate = d
      }
    }
    const maxDateLabel = maxDate ? maxDate.replace(/^2026-0?/, '').replace('-', '/') : '집행일'

    // 저장 통계
    const contentsWithSaves = contents.filter(c => (c.saves ?? 0) > 0).length
    const savesRate = totalRows > 0 ? ((contentsWithSaves / totalRows) * 100).toFixed(0) : '0'

    const locSavesMap = new Map<string, number>()
    for (const c of contents) {
      locSavesMap.set(c.location, (locSavesMap.get(c.location) ?? 0) + (c.saves ?? 0))
    }
    const locSaves = [...locSavesMap.entries()]
      .map(([loc, s]) => ({
        name: loc.replace('점', ''),
        saves: s,
        color: loc.includes('남포') ? '#4dd0e1' : loc.includes('명동') ? '#e03131' : loc.includes('이태원') ? '#1f2f8f' : loc.includes('성수') ? '#8b2fd6' : '#f97316',
      }))
      .sort((a, b) => b.saves - a.saves)
    const topLocSave = locSaves[0]
    const maxLocSaves = topLocSave?.saves || 1

    return {
      views: totalViews,
      emvTotal,
      emvViewShare,
      emvEngageShare,
      emvSaveShare,
      emvProductionShare,
      emvMax,
      emvLikes: emv.likes,
      emvComments: emv.comments,
      emvSaves: emv.saves,
      emvUploads: emv.uploads,
      uploaded,
      totalRows,
      publishRate,
      unreleased,
      saves,
      topContentName: topContent?.influencer_name ?? '—',
      topContentValue: topContentValue > 0 ? `${topContentValue.toLocaleString()}만원 상당` : '0원',
      activeDays: visitDates.size,
      uniqueInfluencers,
      locationsCount,
      campaignsCount,
      maxDateCount,
      maxDateLabel,
      avgDailyCount: visitDates.size > 0 ? (totalRows / visitDates.size).toFixed(1) : '0',
      contentsWithSaves,
      savesRate,
      locSaves,
      topLocSave,
      maxLocSaves,
    }
  }, [contents])

  return (
    <section className="mb-6">
      <div className="text-[18px] font-extrabold tracking-tight text-[#1a1d2e] pt-4 pb-2.5 px-1">
        실행 성과 요약
      </div>

      {/* 실행 신뢰도 + 구매의향을 한 박스에 압축 */}
      <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-0 md:divide-x md:divide-[#f4efe3]">
        {/* 실행 신뢰도 */}
        <div className="md:pr-5">
          <div className="flex items-baseline gap-2">
            <span className="text-[13.5px] font-extrabold text-[#1a1d2e]">✅ 실행 신뢰도</span>
            <span className="text-[11px] text-[#9a9486]">약속 대비 발행</span>
            <span className="ml-auto text-[26px] font-extrabold tracking-tight text-[#15803d] leading-none">
              {metrics.publishRate}<span className="text-[14px] font-bold ml-0.5">%</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[#f4efe3] overflow-hidden mt-2.5">
            <span className="block h-full bg-[#22c55e] rounded-full transition-all" style={{ width: `${metrics.publishRate}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-[11.5px] text-[#6b6558]">
            <span>{metrics.totalRows}건 중 <b className="text-[#1a1d2e]">{metrics.uploaded}건</b> 발행</span>
            <span>미발행 <b className="text-[#1a1d2e]">{metrics.unreleased}건</b></span>
            <span>현장 <b className="text-[#1a1d2e]">{metrics.activeDays}일</b></span>
            <span>응대 <b className="text-[#1a1d2e]">{metrics.uniqueInfluencers}명</b></span>
            <span>최다 <b className="text-[#1a1d2e]">{metrics.maxDateCount}건</b> ({metrics.maxDateLabel})</span>
          </div>
        </div>

        {/* 구매의향 지표 */}
        <div className="md:pl-5">
          <div className="flex items-baseline gap-2">
            <span className="text-[13.5px] font-extrabold text-[#1a1d2e]">🔖 구매의향</span>
            <span className="text-[11px] text-[#9a9486]">저장 수</span>
            <span className="ml-auto text-[26px] font-extrabold tracking-tight text-[#1d4ed8] leading-none">
              {metrics.saves.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-2.5">
            {metrics.locSaves.length === 0 ? (
              <div className="text-[11.5px] text-[#9a9486]">저장 데이터가 없습니다.</div>
            ) : (
              metrics.locSaves.slice(0, 3).map(item => (
                <div key={item.name} className="flex items-center gap-2.5">
                  <span className="w-10 text-[11.5px] font-bold text-[#1a1d2e]">{item.name}</span>
                  <span className="flex-1 h-2.5 rounded-full bg-[#f4efe3] overflow-hidden">
                    <span
                      className="block h-full rounded-full transition-all"
                      style={{
                        width: `${metrics.maxLocSaves > 0 ? Math.max(3, Math.round((item.saves / metrics.maxLocSaves) * 100)) : 0}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </span>
                  <span className="w-12 text-right text-[12px] font-extrabold text-[#1a1d2e]">{item.saves.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
          <div className="text-[11.5px] text-[#6b6558] mt-2.5">
            저장 발생 콘텐츠 <b className="text-[#1a1d2e]">{metrics.contentsWithSaves}건</b> · {metrics.savesRate}%
          </div>
        </div>
      </div>
    </section>
  )
}
