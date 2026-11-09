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
      {/* 실행 신뢰도 2fr + 구매의향 1fr */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3.5">
        {/* 실행 신뢰도 */}
        <div className="bg-white border border-[#f2ebdd] rounded-[6px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-[18px]">
          <div className="flex items-baseline gap-2">
            <h3 className="m-0 text-[18px] font-extrabold text-[#1a1d2e]">✅ 실행 신뢰도</h3>
            <span className="text-[12px] text-[#6b6558]">약속 대비 발행</span>
            <span className="ml-auto text-[18px] font-extrabold text-[#1f7a4d]">{metrics.publishRate}%</span>
          </div>
          <div className="text-[24px] font-extrabold text-[#1a1d2e] mt-2.5">{metrics.totalRows}건 중 {metrics.uploaded}건 발행</div>
          <div className="h-2.5 rounded-[5px] bg-[#f2ede2] overflow-hidden mt-2">
            <span className="block h-full bg-[#1f7a4d] rounded-[5px] transition-all" style={{ width: `${metrics.publishRate}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
            {[
              ['미발행', `${metrics.unreleased}건`],
              ['현장', `${metrics.activeDays}일`],
              ['응대', `${metrics.uniqueInfluencers}명`],
              [`최다 (${metrics.maxDateLabel})`, `${metrics.maxDateCount}건`],
            ].map(([l, v]) => (
              <div key={l} className="bg-[#faf8f3] rounded-[6px] p-2.5">
                <div className="text-[11px] text-[#6b6558] truncate">{l}</div>
                <div className="text-[16px] font-extrabold text-[#1a1d2e]">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 구매의향 지표 */}
        <div className="bg-white border border-[#f2ebdd] rounded-[6px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-[18px]">
          <div className="flex items-baseline gap-2">
            <h3 className="m-0 text-[18px] font-extrabold text-[#1a1d2e]">🔖 구매의향</h3>
            <span className="text-[12px] text-[#6b6558]">저장 수</span>
          </div>
          <div className="text-[30px] font-extrabold text-[#1a1d2e] mt-2.5 leading-tight">{metrics.saves.toLocaleString()}</div>
          <div className="text-[12px] text-[#4a4538] mt-1">
            저장 발생 콘텐츠 {metrics.contentsWithSaves}건 · {metrics.savesRate}%
          </div>
          <div className="flex flex-col gap-1.5 mt-3">
            {metrics.locSaves.length === 0 ? (
              <div className="text-[11.5px] text-[#9a9486]">저장 데이터가 없습니다.</div>
            ) : (
              metrics.locSaves.slice(0, 3).map(item => (
                <div key={item.name} className="flex items-center gap-2 text-[11px]">
                  <span className="w-10 font-bold text-[#1a1d2e]">{item.name}</span>
                  <span className="flex-1 h-1.5 rounded-[3px] bg-[#f2ede2] overflow-hidden">
                    <span
                      className="block h-full rounded-[3px] transition-all"
                      style={{
                        width: `${metrics.maxLocSaves > 0 ? Math.max(3, Math.round((item.saves / metrics.maxLocSaves) * 100)) : 0}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </span>
                  <span className="w-12 text-right font-bold text-[#1a1d2e]">{item.saves.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
