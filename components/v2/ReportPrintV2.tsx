'use client'

import { useMemo } from 'react'
import type { Content } from '@/lib/types'
import { contentViews, contentViewsDisplay } from '@/lib/content-views'
import { formatViews, V2_CH_COLORS, V2_LOC_COLORS, V2_MONTHS } from '@/lib/v2-analytics'

interface ReportPrintV2Props {
  partnerBrand?: string | null
  contents: Content[]
  periodMode?: 'all' | 'monthly' | 'weekly' | 'pre'
  /** 주간 모드 레이블 */
  weekLabel?: string
  currentMonth?: string
  locationCount?: number
}

const C = { line: '#f2ebdd', tile: '#faf8f3', muted: '#6b6558', accent: '#3557d6', green: '#1f7a4d', ink: '#1a1d2e' }

function SecHead({ no, title, sub }: { no: string; title: string; sub?: string }) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2.5">
      <span className="text-[13px] font-bold" style={{ color: C.accent }}>{no}</span>
      <h2 className="text-[20px] font-extrabold tracking-tight" style={{ color: C.ink }}>{title}</h2>
      {sub && <span className="text-[11px] ml-auto" style={{ color: C.muted }}>{sub}</span>}
    </div>
  )
}

const card = 'rp-card bg-white border border-[#f2ebdd] rounded-[6px]'
const tile = 'bg-[#faf8f3] rounded-[6px]'
const th = 'py-2 px-3 font-semibold text-[#6b6558]'

const CHANNELS = ['샤오홍슈', '인스타그램', '틱톡', '웨이보', '도우인'] as const

export default function ReportPrintV2({
  partnerBrand,
  contents,
  periodMode = 'all',
  weekLabel,
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
  const periodLabel = periodMode === 'pre'
    ? '2026.07 이전 집행 성과'
    : periodMode === 'weekly' && weekLabel
    ? `${weekLabel} 집행 성과`
    : periodMode === 'monthly' && currentMonth
    ? `${currentMonth.replace('-', '년 ')}월 집행 성과`
    : `전체 누적 집행 성과 (${V2_MONTHS[0].replace('-', '.')} ~ ${V2_MONTHS[V2_MONTHS.length - 1].replace('-', '.')})`

  // 인쇄 출력 일시
  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }, [])

  return (
    <div className="report-print p-6 max-w-[850px] mx-auto bg-[#fdfcf9] text-[#1a1d2e] leading-normal font-sans">
      {/* 헤더 */}
      <header className={`${card} p-5 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-extrabold tracking-wider px-2 py-0.5 rounded-[4px] text-white" style={{ background: C.accent }}>EXECUTIVE REPORT</span>
            <span className="text-[12px] font-bold" style={{ color: C.accent }}>SLAM 인플루언서 글로벌 마케팅</span>
          </div>
          <span className="text-[11px]" style={{ color: C.muted }}>발행일자: {todayStr} · 수집기준: 08.31</span>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <h1 className="text-[26px] font-extrabold tracking-tight">
            {partnerBrand ? `${partnerBrand} 글로벌 성과 요약 보고서` : '인플루언서 통합 성과 요약 보고서'}
          </h1>
          <span className={`${tile} text-[12.5px] font-semibold px-3 py-1 whitespace-nowrap`} style={{ color: C.muted }}>{periodLabel}</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 mt-4">
          {[
            ['분석 대상', `${metrics.locationCount}개 지점`],
            ['총 콘텐츠', `${metrics.totalRows.toLocaleString()}건`],
            ['발행 완료', `${metrics.uploaded.toLocaleString()}건 (${metrics.publishRate}%)`],
          ].map(([k, v]) => (
            <div key={k} className={`${tile} px-3 py-2`}>
              <div className="text-[10.5px] font-semibold" style={{ color: C.muted }}>{k}</div>
              <div className="text-[15px] font-extrabold mt-0.5">{v}</div>
            </div>
          ))}
        </div>
      </header>

      {/* 01 핵심 성과 */}
      <section className="mb-6">
        <SecHead no="01" title="핵심 성과 요약" sub="KEY METRICS" />
        <div className="grid grid-cols-3 gap-3">
          <div className={`${card} p-4`}>
            <div className="text-[11px] font-semibold" style={{ color: C.muted }}>총 누적 조회수</div>
            <div className="text-[24px] font-extrabold mt-1">{metrics.totalViews.toLocaleString()}</div>
            <div className="text-[10.5px] font-bold mt-1" style={{ color: C.green }}>{formatViews(metrics.totalViews)} 뷰 달성</div>
          </div>
          <div className={`${card} p-4`}>
            <div className="text-[11px] font-semibold" style={{ color: C.muted }}>총 반응(인게이지먼트)</div>
            <div className="text-[24px] font-extrabold mt-1" style={{ color: C.accent }}>
              {metrics.totalEngage.toLocaleString()}<span className="text-[13px] font-bold ml-0.5">회</span>
            </div>
            <div className="text-[10.5px] font-semibold mt-1" style={{ color: C.muted }}>평균 참여율 {metrics.avgEngageRate}%</div>
          </div>
          <div className={`${card} p-4`}>
            <div className="text-[11px] font-semibold" style={{ color: C.muted }}>구매의향 지표 (저장)</div>
            <div className="text-[24px] font-extrabold mt-1">
              {metrics.totalSaves.toLocaleString()}<span className="text-[13px] font-bold ml-0.5">건</span>
            </div>
            <div className="text-[10.5px] mt-1" style={{ color: C.muted }}>
              좋아요 {metrics.totalLikes.toLocaleString()} · 댓글 {metrics.totalComments.toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      {/* 02 채널 */}
      <section className="mb-6">
        <SecHead no="02" title="채널별 집행 및 조회수" sub="조회수 비중순" />
        <div className={`${card} p-4 flex flex-col gap-2.5`}>
          {channelBreakdown.list.map(ch => (
            <div key={ch.channel} className="flex items-center gap-2 text-[11.5px]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ch.color }} />
              <span className="w-16 font-semibold">{ch.channel}</span>
              <div className="flex-1 h-2 rounded-full bg-[#f2ebdd] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${ch.viewPct}%`, backgroundColor: ch.color }} />
              </div>
              <span className="w-12 text-right font-bold">{ch.viewPct}%</span>
              <span className="w-14 text-right" style={{ color: C.muted }}>{formatViews(ch.views)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 03 권역 */}
      <section className="mb-6">
        <SecHead no="03" title="권역별 타깃 비중" sub="중화권 vs 글로벌" />
        <div className={`${card} p-4`}>
          <div className="h-4 rounded-[4px] bg-[#f2ebdd] flex overflow-hidden mb-3">
            <div className="bg-[#f97316] text-white text-[10px] font-bold flex items-center justify-center" style={{ width: `${channelBreakdown.chinaPct}%` }}>
              {channelBreakdown.chinaPct >= 15 ? `${channelBreakdown.chinaPct}%` : ''}
            </div>
            <div className="bg-[#64748b] text-white text-[10px] font-bold flex items-center justify-center" style={{ width: `${channelBreakdown.globalPct}%` }}>
              {channelBreakdown.globalPct >= 15 ? `${channelBreakdown.globalPct}%` : ''}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`${tile} p-3`}>
              <div className="text-[11px] font-bold text-[#c2410c]">중화권 타깃</div>
              <div className="text-[16px] font-extrabold mt-0.5">{formatViews(channelBreakdown.chinaViews)}</div>
              <div className="text-[10px] mt-0.5" style={{ color: C.muted }}>전체의 {channelBreakdown.chinaPct}%</div>
            </div>
            <div className={`${tile} p-3`}>
              <div className="text-[11px] font-bold text-[#475569]">영미·글로벌 타깃</div>
              <div className="text-[16px] font-extrabold mt-0.5">{formatViews(channelBreakdown.globalViews)}</div>
              <div className="text-[10px] mt-0.5" style={{ color: C.muted }}>전체의 {channelBreakdown.globalPct}%</div>
            </div>
          </div>
        </div>
      </section>

      {/* 04 지점 */}
      <section className="mb-6">
        <SecHead no="04" title="지점별 성과 및 효율성" />
        <div className={`${card} overflow-hidden`}>
          <table className="w-full text-left text-[11.5px]">
            <thead className="bg-[#faf8f3] border-b border-[#f2ebdd]">
              <tr>
                <th className={th}>지점명</th>
                <th className={`${th} text-right`}>집행 건수</th>
                <th className={`${th} text-right`}>누적 조회수</th>
                <th className={`${th} text-right`}>건당 평균 조회수 (효율)</th>
                <th className={`${th} text-right`}>누적 저장 수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2ebdd]">
              {locationBreakdown.length === 0 ? (
                <tr><td colSpan={5} className="py-4 text-center" style={{ color: C.muted }}>지점 집행 데이터가 없습니다.</td></tr>
              ) : (
                locationBreakdown.map((loc, idx) => (
                  <tr key={loc.location}>
                    <td className="py-2 px-3 font-bold">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: loc.color }} />
                        {loc.location}
                        {idx === 0 && (
                          <span className="text-[9.5px] font-extrabold px-1.5 rounded-[4px] bg-[#e8f3ec]" style={{ color: C.green }}>최다 조회</span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right" style={{ color: C.muted }}>{loc.count}건</td>
                    <td className="py-2 px-3 text-right font-extrabold">{loc.views.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-semibold" style={{ color: C.accent }}>{loc.avgViews.toLocaleString()}회/건</td>
                    <td className="py-2 px-3 text-right font-bold">{loc.saves.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 05 TOP5 */}
      <section className="mb-6">
        <SecHead no="05" title="핵심 성과 TOP 5 콘텐츠" />
        <div className={`${card} overflow-hidden`}>
          <table className="w-full text-left text-[11.5px]">
            <thead className="bg-[#faf8f3] border-b border-[#f2ebdd]">
              <tr>
                <th className={`${th} w-10 text-center`}>순위</th>
                <th className={th}>인플루언서</th>
                <th className={th}>채널</th>
                <th className={th}>지점</th>
                <th className={`${th} text-right`}>조회수</th>
                <th className={`${th} text-right`}>좋아요</th>
                <th className={`${th} text-right`}>참여율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2ebdd]">
              {topContents.length === 0 ? (
                <tr><td colSpan={7} className="py-4 text-center" style={{ color: C.muted }}>콘텐츠 데이터가 없습니다.</td></tr>
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
                      <td className="py-2 px-3 text-center font-extrabold" style={{ color: idx === 0 ? C.accent : C.muted }}>{idx + 1}</td>
                      <td className="py-2 px-3 font-bold">{c.influencer_name}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded-[4px] text-[10.5px] font-semibold bg-[#faf8f3]" style={{ color: C.muted }}>{c.channel}</span>
                      </td>
                      <td className="py-2 px-3" style={{ color: C.muted }}>{c.location?.replace('점', '') ?? ''}</td>
                      <td className="py-2 px-3 text-right font-extrabold">{displayVal}</td>
                      <td className="py-2 px-3 text-right" style={{ color: C.muted }}>{likes.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-bold" style={{ color: C.green }}>{engageRate === '—' ? '—' : `${engageRate}%`}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="pt-3 border-t border-[#f2ebdd] text-[10.5px] flex items-center justify-between" style={{ color: C.muted }}>
        <span>BRAND SLAM INC. ALL RIGHTS RESERVED.</span>
        <span>본 보고서는 SLAM 인플루언서 성과 분석 대시보드에서 자동 추출된 공식 요약 리포트입니다.</span>
      </footer>
    </div>
  )
}
