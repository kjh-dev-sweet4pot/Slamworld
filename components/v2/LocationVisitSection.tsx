'use client'

import { useState, useMemo, type ReactNode } from 'react'
import type { Content } from '@/lib/types'
import {
  V2_LOC_COLORS,
  V2_LOC_META,
  V2_ORDERED_LOCATIONS,
  formatViews,
  normalizeLocationName,
} from '@/lib/v2-analytics'
import { contentViews, contentViewsDisplay } from '@/lib/content-views'
import MarketingInsightRail from '@/components/v2/MarketingInsightRail'
import { isSeedingLocation } from '@/lib/posted-date'

interface LocationVisitSectionProps {
  contents?: Content[]
  onSelectInfluencer?: (name: string) => void
  onSelectLocation?: (location: string) => void
  partnerBrand?: string | null
  /** 중앙 영역 KPI 아래에 붙는 콘텐츠 (핵심 성과 요약) */
  children?: ReactNode
}

export default function LocationVisitSection({
  contents = [],
  onSelectInfluencer,
  onSelectLocation,
  partnerBrand,
  children,
}: LocationVisitSectionProps) {
  // 실제 데이터에 존재하는 지점 탭 목록
  const availableTabs = useMemo(() => {
    const locSet = new Set(contents.map(c => normalizeLocationName(c.location)).filter(Boolean))
    const locs = V2_ORDERED_LOCATIONS.filter(l => locSet.has(l)).map(l => l.replace('점', ''))
    return ['전체', ...locs]
  }, [contents])

  const [topTab, setTopTab] = useState<string>('전체')

  const effectiveTopTab = availableTabs.includes(topTab) ? topTab : '전체'

  // Top 3 Views
  const topViewsItems = useMemo(() => {
    if (!contents || contents.length === 0) return []
    const filtered = effectiveTopTab === '전체' ? contents : contents.filter(c => c.location.includes(effectiveTopTab))
    const sorted = [...filtered].sort((a, b) => contentViews(b) - contentViews(a))

    return sorted.slice(0, 3).map((c, idx) => {
      const { value, estimated } = contentViewsDisplay(c)
      const viewsStr = value ? (estimated ? `~${value.toLocaleString()}` : value.toLocaleString()) : '0'
      return {
        rank: idx + 1,
        name: c.influencer_name,
        channel: c.channel,
        location: c.location.replace('점', ''),
        views: viewsStr,
        color: idx === 0 ? '#f97316' : idx === 1 ? '#fbbf80' : '#4dd0e1',
        badgeColor: idx === 0 ? '#f97316' : idx === 1 ? '#fbbf80' : '#9fe3ec',
      }
    })
  }, [contents, effectiveTopTab])

  // Top 3 Likes
  const topLikesItems = useMemo(() => {
    if (!contents || contents.length === 0) return []
    const filtered = effectiveTopTab === '전체' ? contents : contents.filter(c => c.location.includes(effectiveTopTab))
    const sorted = [...filtered].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
    return sorted.slice(0, 3).map(c => ({
      name: c.influencer_name,
      sub: `${c.location.replace('점', '')} · ${c.channel}`,
      likes: (c.likes ?? 0).toLocaleString(),
      borderLeftColor: c.location.includes('남포') ? '#4dd0e1' : '#f97316',
    }))
  }, [contents, effectiveTopTab])

  // 8 Location Cards
  const locationCards = useMemo(() => {
    // 시딩(국내·해외·기자단)은 지점 옆에 별도 카드로 붙인다
    const seedingLocs = [...new Set(contents.map(c => normalizeLocationName(c.location)).filter(isSeedingLocation))].sort()
    return [...V2_ORDERED_LOCATIONS, ...seedingLocs].map(locName => {
      const seeding = isSeedingLocation(locName)
      const meta = V2_LOC_META[locName] || { tag: seeding ? '시딩' : '', highlight: '' }
      const color = V2_LOC_COLORS[locName] || (seeding ? '#f59e0b' : '#6b6558')

      const rows = contents.filter(c => normalizeLocationName(c.location) === locName)
      const influencers = new Set(rows.map(r => r.influencer_name)).size
      const uploaded = rows.filter(r => r.upload_url).length
      const views = rows.reduce((s, r) => s + contentViews(r), 0)
      const byChannel = new Map<string, number>()
      for (const r of rows) byChannel.set(r.channel, (byChannel.get(r.channel) ?? 0) + contentViews(r))
      const channels = [...byChannel].sort((a, b) => b[1] - a[1]).map(([name, v]) => ({ name, views: v }))

      return {
        name: locName,
        color,
        tag: meta.tag,
        views: views.toLocaleString(),
        viewsRaw: views,
        channels,
        influencers,
        uploaded: uploaded || rows.length,
        highlight: meta.highlight,
        highlightColor: meta.highlightColor || color,
      }
    })
  }, [contents])

  const activeCards = useMemo(
    () => locationCards.filter(c => c.influencers > 0 || c.uploaded > 0 || c.viewsRaw > 0),
    [locationCards]
  )

  // Cumulative 4 KPIs
  const kpiData = useMemo(() => {
    const influencers = new Set(contents.map(c => c.influencer_name)).size
    const uploaded = contents.filter(c => c.upload_url).length
    const totalViews = contents.reduce((s, c) => s + contentViews(c), 0)
    const totalLikes = contents.reduce((s, c) => s + (c.likes ?? 0), 0)
    const totalSaves = contents.reduce((s, c) => s + (c.saves ?? 0), 0)
    const totalComments = contents.reduce((s, c) => s + (c.comments ?? 0), 0)
    const totalRows = contents.length
    const unreleased = Math.max(0, totalRows - uploaded)
    const pubRate = totalRows > 0 ? ((uploaded / totalRows) * 100).toFixed(1) : '0'
    const locationsCount = new Set(contents.map(c => c.location).filter(Boolean)).size
    const campaignsCount = new Set(contents.map(c => c.campaign).filter(Boolean)).size

    return {
      influencers,
      uploaded,
      viewsFormatted: formatViews(totalViews),
      likes: totalLikes.toLocaleString(),
      saves: totalSaves.toLocaleString(),
      comments: totalComments.toLocaleString(),
      totalRows,
      unreleased,
      pubRate,
      locationsCount,
      campaignsCount,
    }
  }, [contents])

  return (
    <section id="sec-01" className="scroll-mt-32 mb-2">
      <div className="flex items-baseline gap-2.5 py-3.5 px-1">
        <span className="text-[12px] font-extrabold text-[#3557d6]">01</span>
        <h2 className="m-0 text-[26px] font-extrabold tracking-tight text-[#1a1d2e]">지점별 방문 현황</h2>
      </div>

      {/* 지점별 조회수 — 한 줄 카드 */}
      <div className="bg-white border border-[#f2ebdd] rounded-[6px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4 mb-3.5">
      <div className="text-[17px] font-extrabold text-[#1a1d2e] mb-2.5">
        지점별 조회수{' '}
        <span className="text-[11px] font-medium text-[#6b6558]">· 카드 누르면 업로드 목록이 그 지점으로 바뀌어요</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {activeCards.length > 1 && (
          <div
            className="min-w-0 overflow-hidden bg-[#1a1d2e] text-white border border-[#1a1d2e] rounded-[6px] p-2.5"
            style={{ borderTop: '3px solid #1a1d2e' }}
          >
            <div className="flex items-center gap-1 text-[12px] font-extrabold whitespace-nowrap">
              전체 합계
            </div>
            <div className="text-[16px] font-extrabold truncate mt-1.5 whitespace-nowrap">
              {activeCards.reduce((sum, c) => sum + c.viewsRaw, 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-white/60 whitespace-nowrap">
              {kpiData.influencers}명 · {activeCards.reduce((sum, c) => sum + c.uploaded, 0)}건
            </div>
          </div>
        )}
        {locationCards.map(card => {
          const empty = card.influencers === 0 && card.uploaded === 0 && card.viewsRaw === 0
          return (
            <div
              key={card.name}
              onClick={() => onSelectLocation?.(card.name)}
              className={`min-w-0 overflow-hidden cursor-pointer bg-[#faf8f3] border border-[#f0e9da] rounded-[6px] p-2.5 hover:bg-white hover:shadow-[0_4px_16px_rgba(30,41,59,0.08)] transition-all ${empty ? 'opacity-60' : ''}`}
              style={{ borderTop: `3px solid ${card.color}` }}
            >
              <div className="flex items-center gap-1 text-[12px] font-extrabold text-[#1a1d2e] whitespace-nowrap">
                {card.name}
                <span className="ml-auto text-[10px] font-normal text-[#6b6558] truncate">{card.tag}</span>
              </div>
              <div className={`text-[16px] font-extrabold truncate text-[#1a1d2e] mt-1.5 whitespace-nowrap`}>
                {empty ? '----' : card.views}
              </div>
              <div className="text-[11px] text-[#6b6558] whitespace-nowrap">
                {card.influencers}명 · {card.uploaded}건
              </div>
            </div>
          )
        })}
      </div>
      </div>

      <div className="flex flex-wrap gap-3.5 items-start">
        {/* 좌측 랭킹 레일 */}
        <aside className="hidden xl:flex flex-[0_0_300px] w-[300px] flex-col gap-3.5">
          {/* 조회수 TOP 3 */}
          <div className="bg-white border border-[#f2ebdd] rounded-[6px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[17px] font-extrabold text-[#1a1d2e]">🏆 조회수 TOP 3</span>
              <span className="ml-auto text-[10.5px] text-[#6b6558] bg-[#f6f0e3] px-[7px] py-[3px] rounded-full">전체 기간</span>
            </div>
            <div className="flex gap-[3px] mt-2.5 bg-[#f7f4ec] rounded-[6px] p-[3px] overflow-x-auto">
              {availableTabs.map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTopTab(tab)}
                  className={`flex-1 min-w-[40px] text-center text-[11px] text-[#1a1d2e] rounded-[6px] px-[7px] py-[5px] transition-all whitespace-nowrap ${
                    effectiveTopTab === tab
                      ? 'font-bold bg-white shadow-xs'
                      : 'font-medium hover:bg-white/60'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex flex-col mt-1.5">
              {topViewsItems.map(item => (
                <div
                  key={item.rank + item.name}
                  onClick={() => onSelectInfluencer?.(item.name)}
                  className="cursor-pointer flex items-center gap-2.5 py-[9px] border-b border-[#f4efe4] last:border-b-0 hover:bg-[#faf8f3] transition-colors"
                >
                  <span className="w-[18px] text-[14px] font-extrabold text-[#c08a1e] shrink-0">
                    {item.rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-[#1a1d2e] truncate">
                      {item.name}
                    </span>
                    <span className="block text-[11px] text-[#6b6558]">
                      {item.channel} · {item.location}
                    </span>
                  </span>
                  <span className="text-[13px] font-extrabold text-[#1a1d2e]">
                    {item.views}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 좋아요 TOP 3 */}
          <div className="bg-white border border-[#f2ebdd] rounded-[6px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[17px] font-extrabold text-[#1a1d2e]">💎 좋아요 TOP 3</span>
              <span className="ml-auto text-[10.5px] text-[#6b6558] bg-[#f6f0e3] px-[7px] py-[3px] rounded-full">전체 기간 · 실측</span>
            </div>
            <div className="flex flex-col mt-1.5">
              {topLikesItems.map((item, idx) => (
                <div
                  key={item.name + idx}
                  onClick={() => onSelectInfluencer?.(item.name)}
                  className="cursor-pointer flex items-center gap-2.5 py-[9px] border-b border-[#f4efe4] last:border-b-0 hover:bg-[#faf8f3] transition-colors"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-[#1a1d2e] truncate">
                      {item.name}
                    </span>
                    <span className="block text-[11px] text-[#6b6558]">
                      {item.sub}
                    </span>
                  </span>
                  <span className="text-[13px] font-extrabold text-[#1a1d2e]">
                    {item.likes}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* 중앙 지점 카드 그리드 & 누적 KPI */}
        <div className="flex-[4_1_430px] min-w-0 flex flex-col gap-3.5">
          {/* 누적 KPI 4종 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-[#f2ebdd] rounded-[6px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
              <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#4a4538]">
                🧍 등록 인플루언서 수
              </div>
              <div className="text-[22px] font-extrabold tracking-[-0.02em] text-[#1a1d2e] mt-2 whitespace-nowrap">
                {kpiData.influencers}
                <span className="text-[13px] font-bold text-[#6b6558] ml-0.5">명</span>
              </div>
              <div className="text-[11px] text-[#6b6558] mt-1">{kpiData.locationsCount}개 지점 · {kpiData.campaignsCount}개 캠페인</div>
            </div>

            <div className="bg-white border border-[#f2ebdd] rounded-[6px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
              <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#4a4538]">
                📮 발행량
              </div>
              <div className="text-[22px] font-extrabold tracking-[-0.02em] text-[#1a1d2e] mt-2 whitespace-nowrap">
                {kpiData.uploaded}
                <span className="text-[13px] font-bold text-[#6b6558] ml-0.5">건</span>
              </div>
              <div className="text-[11px] text-[#6b6558] mt-1">발행률 {kpiData.pubRate}% · 미발행 {kpiData.unreleased}건</div>
            </div>

            <div className="bg-white border border-[#f2ebdd] rounded-[6px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
              <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#4a4538]">
                👀 조회수
              </div>
              <div className="text-[22px] font-extrabold tracking-[-0.02em] text-[#1a1d2e] mt-2 whitespace-nowrap">
                {kpiData.viewsFormatted}
              </div>

            </div>

            <div className="bg-white border border-[#f2ebdd] rounded-[6px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
              <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#4a4538]">
                ❤️ 좋아요
              </div>
              <div className="text-[22px] font-extrabold tracking-[-0.02em] text-[#1a1d2e] mt-2 whitespace-nowrap">
                {kpiData.likes}
              </div>

            </div>
          </div>

          {children && <div className="flex flex-col gap-3.5">{children}</div>}
        </div>

        {/* 우측 최근 30일 마케팅 요약 + 질문 */}
        <MarketingInsightRail partnerBrand={partnerBrand} />

      </div>
    </section>
  )
}
