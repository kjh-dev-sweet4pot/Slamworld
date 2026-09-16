'use client'

import { useMemo } from 'react'
import type { Content } from '@/lib/types'
import { contentViews } from '@/lib/content-views'
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

    const v7 = Math.round((totalViews * 7) / 10000)
    const v12 = Math.round((totalViews * 12) / 10000)
    const v18 = Math.round((totalViews * 18) / 10000)

    // 단건 최고
    const topContent = [...contents].sort((a, b) => contentViews(b) - contentViews(a))[0]
    const topContentViews = topContent ? contentViews(topContent) : 0
    const topContentValue = Math.round((topContentViews * 12) / 10000)

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
      value7: `${v7.toLocaleString()}만`,
      value12: `${v12.toLocaleString()}만`,
      value18: `${v18.toLocaleString()}만`,
      value12Num: v12,
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
    <section className="mb-8">
      <div className="text-[12.5px] font-bold tracking-[0.14em] text-[#a89a80] pt-6 pb-2.5 px-1">
        실행 성과 요약
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. 환산 노출 가치 */}
        <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
          <div className="flex items-center gap-2">
            <span className="text-[14.5px] font-extrabold text-[#1a1d2e]">
              💰 환산 노출 가치
            </span>
            <span className="ml-auto text-[10.5px] font-bold text-[#9a3412] bg-[#ffedd5] rounded-[8px] px-2 py-1 whitespace-nowrap">
              CPV 12원 기준
            </span>
          </div>
          <div className="text-[11px] text-[#9a9486] mt-1.5">
            같은 노출을 유료 광고로 샀을 때의 금액
          </div>
          <div className="text-[34px] sm:text-[38px] font-extrabold tracking-tight mt-3.5 text-[#c2410c]">
            {metrics.value12Num.toLocaleString()}
            <span className="text-[17px] font-bold ml-0.5">만원</span>
          </div>
          <div className="text-[11.5px] text-[#6b6558] mt-1.5">
            누적 조회 {metrics.views.toLocaleString()} × 12원
          </div>

          <div className="h-px bg-[#f4efe3] my-3.5" />

          {/* 3대 벤치마크 바 */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-[76px] text-[11.5px] text-[#6b6558] whitespace-nowrap">
                보수 7원
              </span>
              <span className="flex-1 h-2.5 rounded-full bg-[#f4efe3] overflow-hidden">
                <span className="block h-full w-[38.9%] bg-[#fdba74] rounded-full" />
              </span>
              <span className="w-[66px] text-right text-[12px] font-bold whitespace-nowrap text-[#1a1d2e]">
                {metrics.value7}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="w-[76px] text-[11.5px] font-bold text-[#c2410c] whitespace-nowrap">
                기준 12원
              </span>
              <span className="flex-1 h-2.5 rounded-full bg-[#f4efe3] overflow-hidden">
                <span className="block h-full w-[66.7%] bg-[#f97316] rounded-full" />
              </span>
              <span className="w-[66px] text-right text-[12px] font-extrabold whitespace-nowrap text-[#c2410c]">
                {metrics.value12}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="w-[76px] text-[11.5px] text-[#6b6558] whitespace-nowrap">
                상단 18원
              </span>
              <span className="flex-1 h-2.5 rounded-full bg-[#f4efe3] overflow-hidden">
                <span className="block h-full w-full bg-[#ea580c] rounded-full" />
              </span>
              <span className="w-[66px] text-right text-[12px] font-bold whitespace-nowrap text-[#1a1d2e]">
                {metrics.value18}
              </span>
            </div>
          </div>

          <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-xl p-3 mt-3.5">
            <p className="text-[11px] leading-relaxed text-[#9a3412]">
              화장품·뷰티 카테고리 CPM 벤치마크를 조회당 단가로 환산한 값입니다. 국내 숏폼 평균 CPM 3,000~8,000원에 뷰티 배율 2.2배, 미국 뷰티 CPM $5~$20을 함께 반영해 <b>CPV 7~18원</b> 구간을 잡았습니다.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#f4efe3]">
            <span className="text-[11.5px] text-[#6b6558] truncate">
              단건 최고 <b>{metrics.topContentName}</b>
            </span>
            <span className="ml-auto text-[12.5px] font-extrabold text-[#1a1d2e] whitespace-nowrap">
              {metrics.topContentValue}
            </span>
          </div>
        </div>

        {/* 2. 실행 신뢰도 */}
        <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
          <div className="flex items-center gap-2">
            <span className="text-[14.5px] font-extrabold text-[#1a1d2e]">
              ✅ 실행 신뢰도
            </span>
            <span className="ml-auto text-[10.5px] font-bold text-[#166534] bg-[#dcfce7] rounded-[8px] px-2 py-1 whitespace-nowrap">
              누적 집행
            </span>
          </div>
          <div className="text-[11px] text-[#9a9486] mt-1.5">
            약속한 콘텐츠가 실제로 발행된 비율
          </div>

          <div className="flex items-end gap-3 mt-3.5">
            <div>
              <div className="text-[34px] sm:text-[38px] font-extrabold tracking-tight text-[#15803d]">
                {metrics.publishRate}
                <span className="text-[17px] font-bold ml-0.5">%</span>
              </div>
              <div className="text-[11.5px] text-[#6b6558] mt-1.5 whitespace-nowrap">
                {metrics.totalRows}건 중 {metrics.uploaded}건 발행
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-[11px] text-[#9a9486]">미발행</div>
              <div className="text-[20px] font-extrabold text-[#1a1d2e] mt-1">
                {metrics.unreleased}
                <span className="text-[12px] font-bold text-[#9a9486] ml-0.5">건</span>
              </div>
            </div>
          </div>

          <div className="h-3.5 rounded-full bg-[#f4efe3] overflow-hidden mt-3.5 flex">
            <span
              className="block h-full bg-[#22c55e] rounded-full transition-all"
              style={{ width: `${metrics.publishRate}%` }}
            />
          </div>

          <div className="h-px bg-[#f4efe3] my-3.5" />

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#fbf9f4] rounded-xl p-2.5">
              <div className="text-[11px] text-[#9a9486]">현장 진행일</div>
              <div className="text-[20px] sm:text-[22px] font-extrabold text-[#1a1d2e] mt-1.5">
                {metrics.activeDays}<span className="text-[12px] font-bold text-[#9a9486] ml-0.5">일</span>
              </div>
              <div className="text-[10px] text-[#9a9486] mt-1 truncate">실집행 기준</div>
            </div>
            <div className="bg-[#fbf9f4] rounded-xl p-2.5">
              <div className="text-[11px] text-[#9a9486]">방문 응대</div>
              <div className="text-[20px] sm:text-[22px] font-extrabold text-[#1a1d2e] mt-1.5">
                {metrics.uniqueInfluencers}<span className="text-[12px] font-bold text-[#9a9486] ml-0.5">명</span>
              </div>
              <div className="text-[10px] text-[#9a9486] mt-1 truncate">{metrics.locationsCount}지점 {metrics.campaignsCount}캠페인</div>
            </div>
            <div className="bg-[#fbf9f4] rounded-xl p-2.5">
              <div className="text-[11px] text-[#9a9486]">최다 집행일</div>
              <div className="text-[20px] sm:text-[22px] font-extrabold text-[#1a1d2e] mt-1.5">
                {metrics.maxDateCount}<span className="text-[12px] font-bold text-[#9a9486] ml-0.5">건</span>
              </div>
              <div className="text-[10px] text-[#9a9486] mt-1 truncate">{metrics.maxDateLabel}</div>
            </div>
          </div>

          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3 mt-3.5">
            <p className="text-[11px] leading-relaxed text-[#166534]">
              {metrics.activeDays > 0 ? (
                <>
                  {metrics.activeDays}일 현장 진행으로 <b>하루 평균 {metrics.avgDailyCount}건</b>을 집행했고, 최다 집행일에는 하루 {metrics.maxDateCount}건을 소화했습니다.
                </>
              ) : (
                '집행 대기 중입니다.'
              )}
            </p>
          </div>
        </div>

        {/* 3. 구매의향 지표 */}
        <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
          <div className="flex items-center gap-2">
            <span className="text-[14.5px] font-extrabold text-[#1a1d2e]">
              🔖 구매의향 지표
            </span>
            <span className="ml-auto text-[10.5px] font-bold text-[#1e40af] bg-[#dbeafe] rounded-[8px] px-2 py-1 whitespace-nowrap">
              저장 기준
            </span>
          </div>
          <div className="text-[11px] text-[#9a9486] mt-1.5">
            저장은 &quot;나중에 사러 오겠다&quot;는 신호입니다
          </div>

          <div className="flex items-end gap-3 mt-3.5">
            <div>
              <div className="text-[34px] sm:text-[38px] font-extrabold tracking-tight text-[#1d4ed8]">
                {metrics.saves.toLocaleString()}
              </div>
              <div className="text-[11.5px] text-[#6b6558] mt-1.5 whitespace-nowrap">
                누적 저장 수
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-[11px] text-[#9a9486]">저장 발생 콘텐츠</div>
              <div className="text-[20px] font-extrabold text-[#1a1d2e] mt-1">
                {metrics.contentsWithSaves}<span className="text-[12px] font-bold text-[#9a9486] ml-1">건 · {metrics.savesRate}%</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-[#f4efe3] my-3.5" />
          <div className="text-[11px] font-semibold text-[#9a9486]">지점별 저장 수</div>

          <div className="flex flex-col gap-2.5 mt-2.5">
            {metrics.locSaves.length === 0 ? (
              <div className="text-center py-4 text-[12px] text-[#9a9486]">저장 데이터가 없습니다.</div>
            ) : (
              metrics.locSaves.slice(0, 5).map(item => {
                const widthPct = metrics.maxLocSaves > 0 ? Math.max(3, Math.round((item.saves / metrics.maxLocSaves) * 100)) : 0
                return (
                  <div key={item.name} className="flex items-center gap-2.5">
                    <span className="w-12 text-[12px] font-bold text-[#1a1d2e]">{item.name}</span>
                    <span className="flex-1 h-3 rounded-full bg-[#f4efe3] overflow-hidden">
                      <span
                        className="block h-full rounded-full transition-all"
                        style={{ width: `${widthPct}%`, backgroundColor: item.color }}
                      />
                    </span>
                    <span className="w-14 text-right text-[12.5px] font-extrabold text-[#1a1d2e]">
                      {item.saves.toLocaleString()}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-3 mt-3.5">
            <p className="text-[11px] leading-relaxed text-[#1e40af]">
              {metrics.topLocSave && metrics.topLocSave.saves > 0 ? (
                <>
                  <b>{metrics.topLocSave.name}점</b>에서 총 저장 <b>{metrics.topLocSave.saves.toLocaleString()}건</b>을 기록하며 높은 구매 전환 의향을 나타냈습니다.
                </>
              ) : (
                '저장 반응 데이터를 수집 중입니다.'
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
