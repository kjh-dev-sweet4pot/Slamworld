'use client'

import { useMemo } from 'react'
import type { Content } from '@/lib/types'
import { contentViews, contentViewsDisplay } from '@/lib/content-views'
import { formatViews, V2_CH_COLORS, V2_LOC_COLORS } from '@/lib/v2-analytics'

interface ReportPrintV2Props {
  partnerBrand?: string | null
  contents: Content[]
  periodMode?: 'all' | 'monthly'
  currentMonth?: string
  locationCount?: number
}

const CHANNELS = ['샤오홍슈', '인스타그램', '틱톡', '웨이보', '도우인'] as const

export default function ReportPrintV2({
  partnerBrand,
  contents,
  periodMode = 'all',
  currentMonth,
  locationCount,
}: ReportPrintV2Props) {
  // 1. 핵심 총괄 지표 계산
  const metrics = useMemo(() => {
    const totalViews = contents.reduce((s, c) => s + contentViews(c), 0)
    const uploaded = contents.filter(c => c.upload_url).length
    const totalRows = contents.length
    const publishRate = totalRows > 0 ? ((uploaded / totalRows) * 100).toFixed(1) : '0'
    const totalLikes = contents.reduce((s, c) => s + (c.likes ?? 0), 0)
    const totalComments = contents.reduce((s, c) => s + (c.comments ?? 0), 0)
    const totalSaves = contents.reduce((s, c) => s + (c.saves ?? 0), 0)
    const totalEngage = totalLikes + totalComments + totalSaves
    const avgEngageRate = totalViews > 0 ? ((totalEngage / totalViews) * 100).toFixed(2) : '0'
    const adValue = Math.round((totalViews * 12) / 10000) // 12원 기준 (만원)

    const locSet = new Set(contents.map(c => c.location).filter(Boolean))
    const calculatedLocCount = locationCount ?? locSet.size

    return {
      totalViews,
      uploaded,
      totalRows,
      publishRate,
      totalLikes,
      totalComments,
      totalSaves,
      totalEngage,
      avgEngageRate,
      adValue,
      locationCount: calculatedLocCount,
    }
  }, [contents, locationCount])

  // 2. 채널별 & 권역별 비중 계산
  const channelBreakdown = useMemo(() => {
    const totalViews = metrics.totalViews || 1
    const totalRows = metrics.totalRows || 1

    const list = CHANNELS.map(ch => {
      const chRows = contents.filter(c => c.channel === ch)
      const views = chRows.reduce((s, c) => s + contentViews(c), 0)
      const count = chRows.length
      const likes = chRows.reduce((s, c) => s + (c.likes ?? 0), 0)
      const saves = chRows.reduce((s, c) => s + (c.saves ?? 0), 0)
      return {
        channel: ch,
        color: V2_CH_COLORS[ch] || '#64748b',
        views,
        count,
        likes,
        saves,
        viewPct: ((views / totalViews) * 100).toFixed(1),
        countPct: ((count / totalRows) * 100).toFixed(1),
      }
    }).sort((a, b) => b.views - a.views)

    const chinaViews = list
      .filter(c => ['샤오홍슈', '도우인', '웨이보'].includes(c.channel))
      .reduce((s, c) => s + c.views, 0)
    const globalViews = list
      .filter(c => ['인스타그램', '틱톡'].includes(c.channel))
      .reduce((s, c) => s + c.views, 0)
    const chinaPct = Math.round((chinaViews / totalViews) * 100)
    const globalPct = 100 - chinaPct

    return { list, chinaViews, globalViews, chinaPct, globalPct }
  }, [contents, metrics])

  // 3. 지점별 성과 및 효율 랭킹
  const locationBreakdown = useMemo(() => {
    const locMap = new Map<string, Content[]>()
    for (const c of contents) {
      if (!c.location) continue
      const arr = locMap.get(c.location) ?? []
      arr.push(c)
      locMap.set(c.location, arr)
    }

    return [...locMap.entries()]
      .map(([loc, rows]) => {
        const views = rows.reduce((s, c) => s + contentViews(c), 0)
        const count = rows.length
        const avgViews = count > 0 ? Math.round(views / count) : 0
        const saves = rows.reduce((s, c) => s + (c.saves ?? 0), 0)
        return {
          location: loc,
          name: loc.replace('점', ''),
          color: V2_LOC_COLORS[loc] || '#64748b',
          count,
          views,
          avgViews,
          saves,
        }
      })
      .sort((a, b) => b.views - a.views)
  }, [contents])

  // 4. TOP 5 인기 킬러 콘텐츠
  const topContents = useMemo(() => {
    return [...contents]
      .sort((a, b) => contentViews(b) - contentViews(a))
      .slice(0, 5)
  }, [contents])

  // 기간 레이블
  const periodLabel = periodMode === 'monthly' && currentMonth
    ? `${currentMonth.replace('-', '년 ')}월 집행 성과`
    : '전체 누적 집행 성과 (2026.03 ~ 2026.08)'

  // 인쇄 출력 일시
  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }, [])

  return (
    <div className="report-print p-6 max-w-[850px] mx-auto bg-white text-[#1a1d2e] leading-normal font-sans">
      {/* ── 1. 보고서 헤더 ── */}
      <header className="border-b-2 border-[#1a1d2e] pb-4 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold tracking-wider px-2.5 py-1 rounded bg-[#1a1d2e] text-white uppercase">
              EXECUTIVE REPORT
            </span>
            <span className="text-[12px] font-bold text-[#4f7cff]">
              SLAM 인플루언서 글로벌 마케팅
            </span>
          </div>
          <span className="text-[11px] text-[#64748b]">
            발행일자: {todayStr} · 수집기준: 08.31
          </span>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <h1 className="text-[24px] font-extrabold tracking-tight text-[#1a1d2e]">
            {partnerBrand ? `${partnerBrand} 글로벌 성과 요약 보고서` : '인플루언서 통합 성과 요약 보고서'}
          </h1>
          <span className="text-[13px] font-semibold text-[#6b6558] bg-[#f7f4ec] px-3 py-1 rounded-lg border border-[#eee6d6]">
            {periodLabel}
          </span>
        </div>

        <div className="text-[11.5px] text-[#8c8577] mt-1.5 flex items-center gap-3">
          <span><b>분석 대상:</b> {metrics.locationCount}개 지점</span>
          <span>·</span>
          <span><b>총 콘텐츠:</b> {metrics.totalRows.toLocaleString()}건</span>
          <span>·</span>
          <span><b>발행 완료:</b> {metrics.uploaded.toLocaleString()}건 ({metrics.publishRate}%)</span>
        </div>
      </header>

      {/* ── 2. 핵심 KPI 요약 카드 4종 ── */}
      <section className="mb-6 break-inside-avoid">
        <div className="text-[12px] font-bold tracking-wider text-[#9a9486] mb-2 uppercase">
          01 · 핵심 성과 요약 (KEY METRICS)
        </div>
        <div className="grid grid-cols-4 gap-3">
          {/* 총 조회수 */}
          <div className="border border-[#e2e8f0] bg-[#fafafa] rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-[#64748b]">총 누적 조회수</div>
            <div className="text-[22px] font-extrabold text-[#1a1d2e] mt-1">
              {metrics.totalViews.toLocaleString()}
            </div>
            <div className="text-[10.5px] text-[#16a34a] font-bold mt-1">
              {formatViews(metrics.totalViews)} 뷰 달성
            </div>
          </div>

          {/* 광고비 환산 가치 */}
          <div className="border border-[#fed7aa] bg-[#fffaf5] rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-[#c2410c]">광고비 환산 가치</div>
            <div className="text-[22px] font-extrabold text-[#ea580c] mt-1">
              {metrics.adValue.toLocaleString()}<span className="text-[13px] font-bold ml-0.5">만원</span>
            </div>
            <div className="text-[10.5px] text-[#9a3412] mt-1">
              단가 12원/view 환산
            </div>
          </div>

          {/* 인게이지먼트 총합 */}
          <div className="border border-[#dbeafe] bg-[#f8fbff] rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-[#1e40af]">총 반응(인게이지먼트)</div>
            <div className="text-[22px] font-extrabold text-[#2563eb] mt-1">
              {metrics.totalEngage.toLocaleString()}<span className="text-[13px] font-bold ml-0.5">회</span>
            </div>
            <div className="text-[10.5px] text-[#3b82f6] font-semibold mt-1">
              평균 참여율 {metrics.avgEngageRate}%
            </div>
          </div>

          {/* 구매의향(저장) */}
          <div className="border border-[#e9d5ff] bg-[#faf5ff] rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-[#7e22ce]">구매의향 지표 (저장)</div>
            <div className="text-[22px] font-extrabold text-[#9333ea] mt-1">
              {metrics.totalSaves.toLocaleString()}<span className="text-[13px] font-bold ml-0.5">건</span>
            </div>
            <div className="text-[10.5px] text-[#6b21a8] mt-1">
              좋아요 {metrics.totalLikes.toLocaleString()} · 댓글 {metrics.totalComments.toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. 채널 배분 & 권역 비중 (2열 그리드) ── */}
      <section className="grid grid-cols-2 gap-4 mb-6 break-inside-avoid">
        {/* 채널별 배분 현황 */}
        <div className="border border-[#e2e8f0] rounded-xl p-4 bg-white">
          <div className="text-[12px] font-bold text-[#1a1d2e] mb-3 flex items-center justify-between">
            <span>02 · 채널별 집행 및 조회수</span>
            <span className="text-[10.5px] text-[#64748b] font-normal">비중순</span>
          </div>
          <div className="flex flex-col gap-2">
            {channelBreakdown.list.map(ch => (
              <div key={ch.channel} className="flex items-center gap-2 text-[11.5px]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ch.color }} />
                <span className="w-16 font-semibold text-[#334155]">{ch.channel}</span>
                <div className="flex-1 h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${ch.viewPct}%`, backgroundColor: ch.color }}
                  />
                </div>
                <span className="w-12 text-right font-bold text-[#1a1d2e]">{ch.viewPct}%</span>
                <span className="w-14 text-right text-[#64748b]">{formatViews(ch.views)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 권역별 비중 현황 */}
        <div className="border border-[#e2e8f0] rounded-xl p-4 bg-white flex flex-col justify-between">
          <div>
            <div className="text-[12px] font-bold text-[#1a1d2e] mb-3">
              03 · 권역별 타깃 비중 (중화권 vs 글로벌)
            </div>
            <div className="h-4 rounded-md bg-[#f1f5f9] flex overflow-hidden mb-3">
              <div
                className="bg-[#f97316] text-white text-[10px] font-bold flex items-center justify-center"
                style={{ width: `${channelBreakdown.chinaPct}%` }}
              >
                {channelBreakdown.chinaPct >= 15 ? `${channelBreakdown.chinaPct}%` : ''}
              </div>
              <div
                className="bg-[#64748b] text-white text-[10px] font-bold flex items-center justify-center"
                style={{ width: `${channelBreakdown.globalPct}%` }}
              >
                {channelBreakdown.globalPct >= 15 ? `${channelBreakdown.globalPct}%` : ''}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-lg p-2.5">
              <div className="text-[11px] font-bold text-[#c2410c]">중화권 타깃</div>
              <div className="text-[15px] font-extrabold text-[#1a1d2e] mt-0.5">
                {formatViews(channelBreakdown.chinaViews)}
              </div>
              <div className="text-[10px] text-[#9a3412] mt-0.5">전체의 {channelBreakdown.chinaPct}%</div>
            </div>
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-2.5">
              <div className="text-[11px] font-bold text-[#475569]">영미·글로벌 타깃</div>
              <div className="text-[15px] font-extrabold text-[#1a1d2e] mt-0.5">
                {formatViews(channelBreakdown.globalViews)}
              </div>
              <div className="text-[10px] text-[#64748b] mt-0.5">전체의 {channelBreakdown.globalPct}%</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. 지점별 집행 성과 및 효율 (테이블) ── */}
      <section className="mb-6 break-inside-avoid">
        <div className="text-[12px] font-bold tracking-wider text-[#9a9486] mb-2 uppercase">
          04 · 지점별 성과 및 효율성
        </div>
        <div className="border border-[#e2e8f0] rounded-xl overflow-hidden bg-white">
          <table className="w-full text-left text-[11.5px]">
            <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#64748b] font-semibold">
              <tr>
                <th className="py-2.5 px-3">지점명</th>
                <th className="py-2.5 px-3 text-right">집행 건수</th>
                <th className="py-2.5 px-3 text-right">누적 조회수</th>
                <th className="py-2.5 px-3 text-right">건당 평균 조회수 (효율)</th>
                <th className="py-2.5 px-3 text-right">누적 저장 수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {locationBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-[#94a3b8]">지점 집행 데이터가 없습니다.</td>
                </tr>
              ) : (
                locationBreakdown.map((loc, idx) => (
                  <tr key={loc.location}>
                    <td className="py-2 px-3 font-bold text-[#1a1d2e] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: loc.color }} />
                      {loc.location}
                      {idx === 0 && (
                        <span className="text-[9.5px] font-extrabold text-[#ea580c] bg-[#ffedd5] px-1.5 py-0.2 rounded">
                          최다 조회
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-[#475569]">{loc.count}건</td>
                    <td className="py-2 px-3 text-right font-extrabold text-[#1a1d2e]">
                      {loc.views.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-[#2563eb]">
                      {loc.avgViews.toLocaleString()}회/건
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-[#7c3aed]">
                      {loc.saves.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 5. 최고 성과 킬러 콘텐츠 TOP 5 ── */}
      <section className="mb-6 break-inside-avoid">
        <div className="text-[12px] font-bold tracking-wider text-[#9a9486] mb-2 uppercase">
          05 · 핵심 성과 TOP 5 콘텐츠
        </div>
        <div className="border border-[#e2e8f0] rounded-xl overflow-hidden bg-white">
          <table className="w-full text-left text-[11.5px]">
            <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#64748b] font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">순위</th>
                <th className="py-2.5 px-3">인플루언서</th>
                <th className="py-2.5 px-3">채널</th>
                <th className="py-2.5 px-3">지점</th>
                <th className="py-2.5 px-3 text-right">조회수</th>
                <th className="py-2.5 px-3 text-right">좋아요</th>
                <th className="py-2.5 px-3 text-right">참여율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {topContents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-[#94a3b8]">콘텐츠 데이터가 없습니다.</td>
                </tr>
              ) : (
                topContents.map((c, idx) => {
                  const views = contentViews(c)
                  const likes = c.likes ?? 0
                  const comments = c.comments ?? 0
                  const saves = c.saves ?? 0
                  const engageRate = views > 0 ? (((likes + comments + saves) / views) * 100).toFixed(2) : '—'
                  const { value, estimated } = contentViewsDisplay(c)
                  const displayVal = value ? (estimated ? `~${value.toLocaleString()}` : value.toLocaleString()) : '0'

                  return (
                    <tr key={c.id ?? idx}>
                      <td className="py-2 px-3 text-center font-extrabold text-[#64748b]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-bold text-[#1a1d2e]">
                        {c.influencer_name}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-[#f1f5f9] text-[#334155]">
                          {c.channel}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#475569]">
                        {c.location?.replace('점', '') ?? ''}
                      </td>
                      <td className="py-2 px-3 text-right font-extrabold text-[#1a1d2e]">
                        {displayVal}
                      </td>
                      <td className="py-2 px-3 text-right text-[#475569]">
                        {likes.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#16a34a]">
                        {engageRate === '—' ? '—' : `${engageRate}%`}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 6. 보고서 푸터 ── */}
      <footer className="pt-3 border-t border-[#e2e8f0] text-center text-[10.5px] text-[#94a3b8] flex items-center justify-between">
        <span>BRAND SLAM INC. ALL RIGHTS RESERVED.</span>
        <span>본 보고서는 SLAM 인플루언서 성과 분석 대시보드에서 자동 추출된 공식 요약 리포트입니다.</span>
      </footer>
    </div>
  )
}
