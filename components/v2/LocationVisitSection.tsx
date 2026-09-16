'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Content } from '@/lib/types'
import {
  V2_LOC_COLORS,
  V2_LOC_META,
  V2_ORDERED_LOCATIONS,
  formatViews,
} from '@/lib/v2-analytics'
import { contentViews, contentViewsDisplay } from '@/lib/content-views'

interface LocationVisitSectionProps {
  contents?: Content[]
  onSelectInfluencer?: (name: string) => void
  onSelectLocation?: (location: string) => void
}

export default function LocationVisitSection({
  contents = [],
  onSelectInfluencer,
  onSelectLocation,
}: LocationVisitSectionProps) {
  // 실제 데이터에 존재하는 지점 탭 목록
  const availableTabs = useMemo(() => {
    const locSet = new Set(contents.map(c => c.location).filter(Boolean))
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
    return V2_ORDERED_LOCATIONS.map(locName => {
      const meta = V2_LOC_META[locName] || { tag: '', highlight: '' }
      const color = V2_LOC_COLORS[locName] || '#6b6558'

      const rows = contents.filter(c => c.location === locName)
      const influencers = new Set(rows.map(r => r.influencer_name)).size
      const uploaded = rows.filter(r => r.upload_url).length
      const views = rows.reduce((s, r) => s + contentViews(r), 0)

      return {
        name: locName,
        color,
        tag: meta.tag,
        views: views.toLocaleString(),
        viewsRaw: views,
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

  // Live 피드 데이터 (실제 콘텐츠 기반 생성)
  const liveFeedItems = useMemo(() => {
    if (!contents || contents.length === 0) return []
    const sorted = [...contents]
      .filter(c => c.upload_url)
      .sort((a, b) => contentViews(b) - contentViews(a))
      .slice(0, 8)

    return sorted.map((c, i) => {
      const dateStr = c.visit_date ? c.visit_date.replace(/^2026-0?/, '').replace('-', '/') : '최근'
      const viewsFormatted = formatViews(contentViews(c))
      const isTop = i === 0
      return {
        date: dateStr,
        badge: isTop ? '최고' : c.channel === '샤오홍슈' ? '인기' : '성과',
        badgeBg: isTop ? '#fee2e2' : '#eef3ff',
        badgeColor: isTop ? '#b42318' : '#2f5fd8',
        borderColor: isTop ? '#e03131' : '#4f7cff',
        textHtml: `<b>${c.influencer_name}</b> ${c.location.replace('점', '')} · ${c.channel} <b>${viewsFormatted}</b> 조회 ${c.likes ? `· ❤️ ${c.likes}` : ''}`,
      }
    })
  }, [contents])

  return (
    <section className="mb-8">
      <div className="text-[12.5px] font-bold tracking-[0.14em] text-[#a89a80] py-3.5 px-1">
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
              전체 기간 · 역산 포함
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
          {activeCards.map(card => (
            <div
              key={card.name}
              onClick={() => onSelectLocation?.(card.name)}
              className="cursor-pointer bg-white border border-[#f2ebdd] rounded-[14px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4 hover:shadow-[0_6px_20px_rgba(30,41,59,0.1)] transition-all"
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
            </div>
          ))}

          {zeroCards.length > 0 && (
            <div className="col-span-full flex items-center justify-center pt-2 pb-1">
              <button
                type="button"
                onClick={() => setShowZeroLocations(prev => !prev)}
                className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold text-[#6b6558] hover:text-[#1a1d2e] bg-white/80 hover:bg-white border border-[#e8dfcf] shadow-xs hover:shadow-sm transition-all"
              >
                <span>
                  {showZeroLocations
                    ? '수치 0인 지점 접기 ▲'
                    : `수치 0인 지점 더보기 (${zeroCards.length}개) ▼`}
                </span>
              </button>
            </div>
          )}

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
                🧍 누적 방문 인플루언서
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
                📮 누적 업로드
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
                👀 누적 조회수
              </div>
              <div className="text-[32px] font-extrabold tracking-tight text-[#1a1d2e] mt-2.5">
                {kpiData.viewsFormatted}
              </div>
              <div className="h-px bg-[#f4efe3] my-2.5" />
              <div className="text-[11px] text-[#9a9486]">전 채널 · 샤오홍슈 역산 포함</div>
            </div>

            <div className="bg-white border border-[#f2ebdd] border-l-4 border-l-[#ec4899] rounded-[14px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#6b6558]">
                ❤️ 누적 좋아요
              </div>
              <div className="text-[32px] font-extrabold tracking-tight text-[#1a1d2e] mt-2.5">
                {kpiData.likes}
              </div>
              <div className="h-px bg-[#f4efe3] my-2.5" />
              <div className="text-[11px] text-[#9a9486]">
                저장 {kpiData.saves} · 댓글 {kpiData.comments}
              </div>
            </div>
          </div>
        </div>

        {/* 우측 Live 피드 */}
        <aside className="flex-1 min-w-[280px] max-w-full lg:max-w-[340px] bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            <span className="text-[14px] font-extrabold text-[#1a1d2e]">Live 피드</span>
            <span className="ml-auto text-[10.5px] text-[#9a9486]">
              최신 성과 · {liveFeedItems.length}건
            </span>
          </div>

          <div className="flex flex-col gap-3.5 mt-3.5 max-h-[560px] overflow-y-auto pr-1">
            {liveFeedItems.length === 0 ? (
              <div className="py-12 text-center text-[12px] text-[#9a9486]">피드 데이터가 없습니다.</div>
            ) : (
              liveFeedItems.map((feed, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <span
                    className="w-[7px] h-[7px] rounded-full border-2 mt-1.5 shrink-0"
                    style={{ borderColor: feed.borderColor }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[10.5px] text-[#9a9486]">
                      {feed.date}
                      <span
                        className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-[6px]"
                        style={{ color: feed.badgeColor, backgroundColor: feed.badgeBg }}
                      >
                        {feed.badge}
                      </span>
                    </span>
                    <span
                      className="block text-[12.5px] leading-relaxed text-[#2a2d3e] mt-1"
                      dangerouslySetInnerHTML={{ __html: feed.textHtml }}
                    />
                  </span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
