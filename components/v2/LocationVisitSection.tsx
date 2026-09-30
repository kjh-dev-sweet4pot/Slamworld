'use client'

import { useState, useMemo, useEffect, type ReactNode } from 'react'
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

  const [showZeroLocations, setShowZeroLocations] = useState(false)

  // 기간 전환 시 더보기 상태 접힘으로 초기화
  useEffect(() => {
    setShowZeroLocations(false)
  }, [contents])

  const activeCards = useMemo(
    () => locationCards.filter(c => c.influencers > 0 || c.uploaded > 0 || c.viewsRaw > 0),
    [locationCards]
  )

  const zeroCards = useMemo(
    () => locationCards.filter(c => c.influencers === 0 && c.uploaded === 0 && c.viewsRaw === 0),
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
    <section className="mb-8">
      <div className="text-[18px] font-extrabold tracking-tight text-[#1a1d2e] py-3.5 px-1">
        지점별 방문 현황
      </div>

      <div className="flex flex-wrap gap-4 items-start">
        {/* 좌측 랭킹 레일 */}
        <aside className="flex-1 min-w-[280px] max-w-full lg:max-w-[340px] flex flex-col gap-3.5">
          {/* 조회수 TOP 3 */}
          <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
            <div className="flex items-center gap-1.5 text-[14px] font-extrabold text-[#1a1d2e]">
              🏆 조회수 TOP 3
            </div>
            <div className="text-[11px] text-[#9a9486] mt-1">
              전체 기간
            </div>
            <div className="flex gap-1 mt-2.5 bg-[#f7f4ec] rounded-[10px] p-[3px] overflow-x-auto">
              {availableTabs.map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTopTab(tab)}
                  className={`flex-1 min-w-[40px] text-center text-[11.5px] rounded-[8px] py-1.5 transition-all whitespace-nowrap ${
                    effectiveTopTab === tab
                      ? 'font-bold text-white bg-[#4f7cff] shadow-xs'
                      : 'font-semibold text-[#8b8578] hover:text-[#1a1d2e]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 mt-3">
              {topViewsItems.map(item => (
                <div
                  key={item.rank + item.name}
                  onClick={() => onSelectInfluencer?.(item.name)}
                  className="cursor-pointer flex items-center gap-2.5 bg-[#fbf9f4] hover:bg-[#f5f1e8] transition-colors rounded-xl p-2.5 border-l-4"
                  style={{ borderLeftColor: item.color }}
                >
                  <span
                    className="w-[22px] h-[22px] rounded-[7px] text-white text-[11px] font-extrabold grid place-items-center shrink-0"
                    style={{ backgroundColor: item.badgeColor }}
                  >
                    {item.rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-[#1a1d2e] truncate">
                      {item.name}
                    </span>
                    <span className="block text-[10.5px] text-[#9a9486] mt-0.5">
                      {item.channel} · {item.location}
                    </span>
                  </span>
                  <span className="text-[14px] font-extrabold tracking-tight text-[#1a1d2e]">
                    {item.views}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 좋아요 TOP 3 */}
          <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
            <div className="flex items-center gap-1.5 text-[14px] font-extrabold text-[#1a1d2e]">
              💎 좋아요 TOP 3
            </div>
            <div className="text-[11px] text-[#9a9486] mt-1">
              전체 기간 · 실측
            </div>
            <div className="flex flex-col gap-2 mt-3">
              {topLikesItems.map((item, idx) => (
                <div
                  key={item.name + idx}
                  onClick={() => onSelectInfluencer?.(item.name)}
                  className="cursor-pointer flex items-center gap-2.5 bg-[#fbf9f4] hover:bg-[#f5f1e8] transition-colors rounded-xl p-2.5 border-l-4"
                  style={{ borderLeftColor: item.borderLeftColor }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-[#1a1d2e] truncate">
                      {item.name}
                    </span>
                    <span className="block text-[10.5px] text-[#9a9486] mt-0.5">
                      {item.sub}
                    </span>
                  </span>
                  <span className="text-[14px] font-extrabold tracking-tight text-[#1a1d2e]">
                    {item.likes}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* 중앙 지점 카드 그리드 & 누적 KPI */}
        <div className="flex-[4_1_430px] min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-full flex flex-wrap gap-3 items-stretch">
          {/* 전체 지점 합계 */}
          {activeCards.length > 1 && (
            <div
              className="flex-1 min-w-[240px] bg-[#1a1d2e] text-white rounded-[14px] shadow-[0_4px_16px_rgba(30,41,59,0.12)] p-4"
              style={{ borderTop: '4px solid #1a1d2e' }}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-[9px] h-[9px] rounded-full bg-white" />
                <span className="text-[13.5px] font-extrabold">전체 지점 합계</span>
                <span className="ml-auto text-[10.5px] text-white/60">{activeCards.length}개 구분</span>
              </div>
              <div className="text-[24px] sm:text-[26px] font-extrabold tracking-tight mt-3">
                {activeCards.reduce((sum, c) => sum + c.viewsRaw, 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-white/60 mt-1">조회수</div>
              <div className="h-px bg-white/15 my-3" />
              <div className="flex items-center gap-3">
                <span className="text-[11.5px] text-white/70 whitespace-nowrap">
                  <b className="text-[13px] text-white">{kpiData.influencers}</b>명
                </span>
                <span className="text-[11.5px] text-white/70 whitespace-nowrap">
                  <b className="text-[13px] text-white">{activeCards.reduce((sum, c) => sum + c.uploaded, 0)}</b>건
                </span>
              </div>
            </div>
          )}
          {activeCards.map(card => (
            <div
              key={card.name}
              onClick={() => onSelectLocation?.(card.name)}
              className="flex-1 min-w-[240px] cursor-pointer bg-white border border-[#f2ebdd] rounded-[14px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4 hover:shadow-[0_6px_20px_rgba(30,41,59,0.1)] transition-all"
              style={{ borderTop: `4px solid ${card.color}` }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-[9px] h-[9px] rounded-full"
                  style={{ backgroundColor: card.color }}
                />
                <span className="text-[13.5px] font-extrabold text-[#1a1d2e]">
                  {card.name}
                </span>
                <span className="ml-auto text-[10.5px] text-[#a9a294]">
                  {card.tag}
                </span>
              </div>
              <div className="text-[24px] sm:text-[26px] font-extrabold tracking-tight text-[#1a1d2e] mt-3">
                {card.views}
              </div>
              <div className="text-[11px] text-[#9a9486] mt-1">
                조회수
              </div>
              <div className="h-px bg-[#f4efe3] my-3" />
              <div className="flex items-center gap-3">
                <span className="text-[11.5px] text-[#6b6558] whitespace-nowrap">
                  <b className="text-[13px] text-[#1a1d2e]">{card.influencers}</b>명
                </span>
                <span className="text-[11.5px] text-[#6b6558] whitespace-nowrap">
                  <b className="text-[13px] text-[#1a1d2e]">{card.uploaded}</b>건
                </span>
                <span
                  className="text-[11.5px] font-bold ml-auto truncate"
                  style={{ color: card.highlightColor }}
                >
                  {card.highlight}
                </span>
              </div>
              {activeCards.length <= 2 && card.channels.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 pt-3 border-t border-[#f4efe3]">
                  {card.channels.map(ch => (
                    <span key={ch.name} className="text-[11.5px] text-[#6b6558] whitespace-nowrap">
                      {ch.name} <b className="text-[12.5px] text-[#1a1d2e]">{formatViews(ch.views)}</b>
                      <span className="text-[#a9a294] ml-1">
                        {card.viewsRaw > 0 ? `${Math.round((ch.views / card.viewsRaw) * 100)}%` : ''}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {zeroCards.length > 0 && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setShowZeroLocations(prev => !prev)}
                className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold text-[#6b6558] hover:text-[#1a1d2e] bg-white/80 hover:bg-white border border-[#e8dfcf] shadow-xs hover:shadow-sm transition-all"
              >
                <span>
                  {showZeroLocations
                    ? '수치 0인 지점 접기 ▲'
                    : `0인 지점 ${zeroCards.length}개 ▼`}
                </span>
              </button>
            </div>
          )}
          </div>

          {showZeroLocations &&
            zeroCards.map(card => (
              <div
                key={card.name}
                onClick={() => onSelectLocation?.(card.name)}
                className="cursor-pointer bg-white/70 border border-[#f2ebdd] rounded-[14px] shadow-[0_2px_8px_rgba(30,41,59,0.04)] p-4 hover:shadow-[0_4px_16px_rgba(30,41,59,0.08)] transition-all opacity-85 hover:opacity-100"
                style={{ borderTop: `4px solid ${card.color}` }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-[9px] h-[9px] rounded-full"
                    style={{ backgroundColor: card.color }}
                  />
                  <span className="text-[13.5px] font-extrabold text-[#1a1d2e]">
                    {card.name}
                  </span>
                  <span className="ml-auto text-[10.5px] text-[#a9a294]">
                    {card.tag}
                  </span>
                </div>
                <div className="text-[24px] sm:text-[26px] font-extrabold tracking-tight text-[#8b8578] mt-3">
                  0
                </div>
                <div className="text-[11px] text-[#a9a294] mt-1">
                  조회수 (집행 없음)
                </div>
                <div className="h-px bg-[#f4efe3] my-3" />
                <div className="flex items-center gap-3">
                  <span className="text-[11.5px] text-[#8b8578] whitespace-nowrap">
                    <b className="text-[13px] text-[#8b8578]">0</b>명
                  </span>
                  <span className="text-[11.5px] text-[#8b8578] whitespace-nowrap">
                    <b className="text-[13px] text-[#8b8578]">0</b>건
                  </span>
                  <span
                    className="text-[11.5px] font-bold ml-auto truncate"
                    style={{ color: card.highlightColor }}
                  >
                    {card.highlight}
                  </span>
                </div>
              </div>
            ))}

          {/* 누적 KPI 4종 */}
          <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-1">
            <div className="bg-white border border-[#f2ebdd] border-l-4 border-l-[#4f8cff] rounded-[14px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#6b6558]">
                🧍 등록 인플루언서 수
              </div>
              <div className="text-[32px] font-extrabold tracking-tight text-[#1a1d2e] mt-2.5">
                {kpiData.influencers}
                <span className="text-[14px] font-bold text-[#9a9486] ml-1">명</span>
              </div>
              <div className="h-px bg-[#f4efe3] my-2.5" />
              <div className="text-[11px] text-[#9a9486]">{kpiData.locationsCount}개 지점 · {kpiData.campaignsCount}개 캠페인</div>
            </div>

            <div className="bg-white border border-[#f2ebdd] border-l-4 border-l-[#8b5cf6] rounded-[14px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#6b6558]">
                📮 발행량
              </div>
              <div className="text-[32px] font-extrabold tracking-tight text-[#1a1d2e] mt-2.5">
                {kpiData.uploaded}
                <span className="text-[14px] font-bold text-[#9a9486] ml-1">건</span>
              </div>
              <div className="h-px bg-[#f4efe3] my-2.5" />
              <div className="text-[11px] text-[#9a9486]">발행률 {kpiData.pubRate}% · 미발행 {kpiData.unreleased}건</div>
            </div>

            <div className="bg-white border border-[#f2ebdd] border-l-4 border-l-[#06b6d4] rounded-[14px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#6b6558]">
                👀 조회수
              </div>
              <div className="text-[32px] font-extrabold tracking-tight text-[#1a1d2e] mt-2.5">
                {kpiData.viewsFormatted}
              </div>

            </div>

            <div className="bg-white border border-[#f2ebdd] border-l-4 border-l-[#ec4899] rounded-[14px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#6b6558]">
                ❤️ 좋아요
              </div>
              <div className="text-[32px] font-extrabold tracking-tight text-[#1a1d2e] mt-2.5">
                {kpiData.likes}
              </div>

            </div>
          </div>

          {children && <div className="col-span-full">{children}</div>}
        </div>

        {/* 우측 최근 30일 마케팅 요약 + 질문 */}
        <MarketingInsightRail partnerBrand={partnerBrand} />

      </div>
    </section>
  )
}
