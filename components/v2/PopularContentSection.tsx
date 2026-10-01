'use client'

import { useState, useMemo } from 'react'
import type { Content } from '@/lib/types'
import { contentViews, contentViewsDisplay } from '@/lib/content-views'
import { formatViews } from '@/lib/v2-analytics'

interface PopularContentSectionProps {
  contents?: Content[]
  selectedInfluencerName?: string | null
  onSelectInfluencer?: (name: string) => void
}

export default function PopularContentSection({
  contents = [],
  selectedInfluencerName,
  onSelectInfluencer,
}: PopularContentSectionProps) {
  const [locFilter, setLocFilter] = useState('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [metricMode, setMetricMode] = useState<'views' | 'likes'>('views')
  const [displayCount, setDisplayCount] = useState(8)
  const [activeInfluencer, setActiveInfluencer] = useState<string | null>(null)

  // 동적 지점 필터 옵션
  const locOptions = useMemo(() => {
    const locSet = new Set(contents.map(c => c.location).filter(Boolean))
    const list = ['명동', '남포', '신사', '이태원', '성수', '북촌', '강남', '종각'].filter(l =>
      [...locSet].some(s => s.includes(l))
    )
    return ['전체', ...list]
  }, [contents])

  // 필터링 & 정렬된 랭킹 리스트
  const filteredRows = useMemo(() => {
    let list = contents ? [...contents] : []

    if (locFilter !== '전체') {
      list = list.filter(c => c.location.includes(locFilter))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(c => c.influencer_name.toLowerCase().includes(q))
    }

    if (metricMode === 'views') {
      list.sort((a, b) => contentViews(b) - contentViews(a))
    } else {
      list.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
    }

    return list
  }, [contents, locFilter, searchQuery, metricMode])

  // 총합 (점유율 계산용)
  const totalMetric = useMemo(() => {
    return filteredRows.reduce((sum, c) => {
      return sum + (metricMode === 'views' ? contentViews(c) : (c.likes ?? 0))
    }, 0) || 1
  }, [filteredRows, metricMode])

  const effectiveInfluencerName = selectedInfluencerName || activeInfluencer

  // 현재 선택된 인플루언서 객체
  const selectedItem = useMemo(() => {
    if (filteredRows.length === 0) return null
    if (effectiveInfluencerName) {
      const found = filteredRows.find(c => c.influencer_name === effectiveInfluencerName)
      if (found) return found
    }
    return filteredRows[0] || null
  }, [filteredRows, effectiveInfluencerName])

  // 함께 방문한 인플루언서 (동일 지점 그룹)
  const coVisitors = useMemo(() => {
    if (!selectedItem) return []
    return contents
      .filter(c => c.location === selectedItem.location && c.influencer_name !== selectedItem.influencer_name)
      .slice(0, 5)
  }, [selectedItem, contents])

  // 선택된 인플루언서의 지점 내 채널별 편중 계산
  const channelBias = useMemo(() => {
    if (!selectedItem) return []
    const locRows = contents.filter(c => c.location === selectedItem.location)
    const totalViews = locRows.reduce((s, c) => s + contentViews(c), 0)

    const chs = [
      { name: '인스타', key: '인스타그램', color: '#8b5cf6' },
      { name: '샤오홍슈', key: '샤오홍슈', color: '#e03131' },
      { name: '틱톡', key: '틱톡', color: '#06b6d4' },
      { name: '웨이보', key: '웨이보', color: '#94a3b8' },
      { name: '도우인', key: '도우인', color: '#cbd5e1' },
    ]

    return chs.map(ch => {
      const chViews = locRows.filter(c => c.channel === ch.key).reduce((s, c) => s + contentViews(c), 0)
      const pct = totalViews > 0 ? Math.round((chViews / totalViews) * 100) : 0
      return {
        ...ch,
        pct,
      }
    })
  }, [selectedItem, contents])

  const handleSelect = (name: string) => {
    setActiveInfluencer(name)
    onSelectInfluencer?.(name)
  }

  return (
    <section className="mb-10">
      <div className="text-[18px] font-extrabold tracking-tight text-[#1a1d2e] pt-6 pb-2.5 px-1">
        인기 콘텐츠 분석{' '}
        <span className="text-[13px] font-semibold tracking-normal text-[#9a9486]">
          ( ※ 콘텐츠 클릭 시 상세 표시 )
        </span>
      </div>

      <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
        {/* 상단 1차 필터 바 */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[14.5px] font-extrabold text-[#1a1d2e]">
            인기 콘텐츠 랭킹
          </span>

          <div className="flex flex-wrap gap-1.5 ml-2">
            {locOptions.map(opt => {
              const active = locFilter === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLocFilter(opt)}
                  className={`text-[11.5px] rounded-[16px] px-3 py-1.5 transition-all ${
                    active ? 'font-bold text-white bg-[#4f7cff]' : 'font-semibold bg-[#f7f4ec] text-[#6b6558] hover:text-[#1a1d2e]'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 인플루언서 검색"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="text-[11.5px] text-[#1a1d2e] placeholder-[#a9a294] bg-[#fbf9f4] border border-[#f0e9da] rounded-[10px] px-3 py-1.5 focus:outline-none focus:border-[#4f7cff] transition-colors"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#f7f4ec] rounded-[9px] p-[3px]">
              <button
                type="button"
                onClick={() => setMetricMode('views')}
                className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                  metricMode === 'views'
                    ? 'font-bold text-[#1a1d2e] bg-white shadow-xs'
                    : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
                }`}
              >
                조회수
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('likes')}
                className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                  metricMode === 'likes'
                    ? 'font-bold text-[#1a1d2e] bg-white shadow-xs'
                    : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
                }`}
              >
                좋아요
              </button>
            </div>
          </div>
        </div>

        {/* 랭킹 목록 & 상세 2분할 */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-5 mt-4">
          {/* 좌측 랭킹 리스트 */}
          <div>
            <div className="grid grid-cols-[28px_minmax(0,1fr)_68px_72px] sm:grid-cols-[44px_minmax(110px,1fr)_78px_56px_94px_54px] gap-2 items-center px-2.5 pb-2.5 border-b border-[#eee6d6]">
              <span className="text-[11px] text-[#9a9486] font-semibold text-center">순위</span>
              <span className="text-[11px] text-[#9a9486] font-semibold">인플루언서</span>
              <span className="text-[11px] text-[#9a9486] font-semibold">채널</span>
              <span className="hidden sm:block text-[11px] text-[#9a9486] font-semibold">지점</span>
              <span className="text-[11px] text-[#9a9486] font-semibold text-right">
                {metricMode === 'views' ? '조회수' : '좋아요'}
              </span>
              <span className="hidden sm:block text-[11px] text-[#9a9486] font-semibold text-right">비중</span>
            </div>

            <div className="flex flex-col gap-1.5 mt-1.5">
              {filteredRows.slice(0, displayCount).map((item, idx) => {
                const isSelected = item.influencer_name === selectedItem?.influencer_name
                const itemVal = metricMode === 'views' ? contentViews(item) : (item.likes ?? 0)
                const pct = ((itemVal / totalMetric) * 100).toFixed(1)

                let rankBadgeBg = '#f5c142'
                if (idx === 1) rankBadgeBg = '#d7d3d3'
                if (idx === 2) rankBadgeBg = '#f0a878'

                let channelBadgeBg = '#f3e8ff'
                let channelBadgeColor = '#6b21a8'
                if (item.channel === '샤오홍슈') {
                  channelBadgeBg = '#fee2e2'
                  channelBadgeColor = '#b42318'
                } else if (item.channel === '틱톡') {
                  channelBadgeBg = '#cffafe'
                  channelBadgeColor = '#0e7490'
                } else if (item.channel === '도우인' || item.channel === '웨이보') {
                  channelBadgeBg = '#f1f5f9'
                  channelBadgeColor = '#475569'
                }

                const { value, estimated } = contentViewsDisplay(item)
                const displayVal = metricMode === 'views'
                  ? (value ? (estimated ? `~${value.toLocaleString()}` : value.toLocaleString()) : '0')
                  : (item.likes ?? 0).toLocaleString()

                return (
                  <div
                    key={item.influencer_name + idx}
                    onClick={() => {
                      // 모바일: 상세 카드 대신 바로 콘텐츠로
                      if (item.upload_url && window.matchMedia('(max-width: 639px)').matches) {
                        window.open(item.upload_url, '_blank', 'noopener')
                        return
                      }
                      handleSelect(item.influencer_name)
                    }}
                    className={`cursor-pointer grid grid-cols-[28px_minmax(0,1fr)_68px_72px] sm:grid-cols-[44px_minmax(110px,1fr)_78px_56px_94px_54px] gap-2 items-center px-2.5 py-2.5 rounded-xl transition-colors ${
                      isSelected
                        ? 'bg-[#f4f1ff] border border-[#e0dbf5]'
                        : 'hover:bg-[#faf7f0] border-b border-[#f7f2e8] last:border-b-0'
                    }`}
                  >
                    <span
                      className={`justify-self-center text-[11.5px] font-extrabold ${
                        idx < 3
                          ? 'w-6 h-6 rounded-lg text-white grid place-items-center'
                          : 'text-[#9a9486]'
                      }`}
                      style={idx < 3 ? { backgroundColor: rankBadgeBg } : {}}
                    >
                      {idx + 1}
                    </span>

                    <span className="text-[13px] font-bold text-[#1a1d2e] truncate flex items-center gap-1">
                      {item.influencer_name}
                      {item.upload_url && (
                        <a
                          href={item.upload_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[11px] text-[#2f5fd8] hover:underline"
                        >
                          🔗
                        </a>
                      )}
                    </span>

                    <span
                      className="text-[11.5px] font-semibold rounded-lg px-2 py-0.5 justify-self-start truncate"
                      style={{ backgroundColor: channelBadgeBg, color: channelBadgeColor }}
                    >
                      {item.channel}
                    </span>

                    <span className="hidden sm:block text-[11.5px] text-[#6b6558] truncate">
                      {item.location.replace('점', '')}
                    </span>

                    <span className="text-[13px] font-extrabold text-[#1a1d2e] text-right">
                      {displayVal}
                    </span>

                    <span className="hidden sm:block text-[11.5px] text-[#6b6558] text-right">
                      {pct}%
                    </span>
                  </div>
                )
              })}
            </div>

            {filteredRows.length > displayCount && (
              <div className="flex justify-center mt-3">
                <button
                  type="button"
                  onClick={() => setDisplayCount(prev => prev + 8)}
                  className="w-8 h-8 rounded-full bg-[#eef3ff] hover:bg-[#e0ebff] text-[#4f7cff] font-bold grid place-items-center text-[12px] transition-colors"
                  title="더보기"
                >
                  ⌄
                </button>
              </div>
            )}
          </div>

          {/* 우측 선택된 인플루언서 상세 프로필 카드 */}
          {selectedItem && (
            <div className="hidden sm:flex bg-[#fbfaf6] border border-[#f2ebdd] rounded-xl p-4 flex-col h-fit">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-white bg-[#6b6558] rounded-lg px-2.5 py-1">
                  {selectedItem.location}
                </span>
                <span className="text-[11px] font-semibold text-[#2f5fd8]">
                  {selectedItem.channel}
                </span>
                <span className="text-[11px] text-[#b5ab96]">›</span>
                <span className="text-[11px] font-semibold text-[#2f5fd8]">
                  {selectedItem.target_audience || '인플루언서'}
                </span>
              </div>

              <div className="text-[18px] font-extrabold text-[#1a1d2e] mt-3">
                {selectedItem.influencer_name}
              </div>

              <div className="flex flex-col gap-2.5 mt-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11.5px] text-[#9a9486]">조회수</span>
                  <span className="text-[15px] font-extrabold text-[#1a1d2e]">
                    {contentViews(selectedItem).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11.5px] text-[#9a9486]">좋아요</span>
                  <span className="text-[14px] font-bold text-[#1a1d2e]">
                    {(selectedItem.likes ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11.5px] text-[#9a9486]">댓글</span>
                  <span className="text-[14px] font-bold text-[#1a1d2e]">
                    {(selectedItem.comments ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11.5px] text-[#9a9486]">참여율</span>
                  <span className="text-[14px] font-bold text-[#16a34a]">
                    {contentViews(selectedItem) > 0
                      ? `${(((selectedItem.likes ?? 0) + (selectedItem.comments ?? 0) + (selectedItem.saves ?? 0)) / contentViews(selectedItem) * 100).toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11.5px] text-[#9a9486]">방문일</span>
                  <span className="text-[13px] font-semibold text-[#1a1d2e]">
                    {selectedItem.visit_date || '—'}
                  </span>
                </div>
              </div>

              <div className="h-px bg-[#f0e9da] my-3.5" />

              <div className="text-[11px] font-semibold text-[#9a9486]">
                채널별 조회 편중
              </div>
              <div className="flex flex-col gap-2.5 mt-2.5">
                {channelBias.map(ch => (
                  <div key={ch.key} className="flex items-center gap-2.5">
                    <span className="w-12 text-[11.5px] text-[#6b6558]">{ch.name}</span>
                    <span className="flex-1 h-2.5 rounded-full bg-[#eee6d6] overflow-hidden">
                      <span
                        className="block h-full rounded-full transition-all duration-300"
                        style={{ width: `${ch.pct}%`, backgroundColor: ch.color }}
                      />
                    </span>
                    <span className="w-9 text-right text-[11px] font-bold text-[#1a1d2e]">{ch.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 함께 방문한 인플루언서 */}
        {selectedItem && coVisitors.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#f4efe3]">
            <div className="text-[11px] font-semibold text-[#9a9486]">
              함께 방문한 인플루언서{' '}
              <span className="font-bold text-[#6b6558]">
                {selectedItem.location} · 총 {coVisitors.length}명
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mt-3">
              {coVisitors.map((cov, i) => (
                <div
                  key={cov.influencer_name + i}
                  onClick={() => handleSelect(cov.influencer_name)}
                  className="cursor-pointer border border-[#f2ebdd] rounded-xl p-3 bg-white hover:border-[#4f7cff] transition-all"
                >
                  <span
                    className={`inline-block text-[10px] font-bold rounded-[7px] px-2 py-0.5 ${
                      cov.upload_url ? 'text-white bg-[#6b6558]' : 'text-[#a9a294] bg-[#f4efe3]'
                    }`}
                  >
                    {cov.upload_url ? `${formatViews(contentViews(cov))} 뷰` : '미발행'}
                  </span>
                  <div className="text-[12.5px] font-bold text-[#1a1d2e] mt-2.5 truncate">
                    {cov.influencer_name}
                  </div>
                  <div className="text-[10.5px] text-[#9a9486] mt-1 truncate">
                    {cov.channel}
                  </div>
                  <div className="text-[13px] font-extrabold text-[#1a1d2e] mt-2.5">
                    {cov.upload_url ? `${(cov.likes ?? 0).toLocaleString()} ❤️` : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 수치 기준 안내 박스 */}
      <div className="bg-white/65 border border-[#f0e6d2] rounded-xl p-3.5 sm:p-4 mt-5">
        <p className="text-[11.5px] leading-relaxed text-[#6b6558] m-0">
          <b className="text-[#1a1d2e]">수치 기준 — </b>
          샤오홍슈·도우인 조회수는 플랫폼이 조회수를 제공하지 않아 좋아요·저장·댓글 합을 인터랙션율 2.3%로 역산한 값이며 <b>~</b> 로 표시했습니다. 누적 조회수에 반영되며 실제 노출과 차이가 있을 수 있습니다. 콘텐츠 형식(릴스·노트·숏폼·게시물)은 업로드 링크 패턴으로 자동 분류했습니다. 지표는 자동 수집이고 마지막 갱신은 2026.08.31입니다.
        </p>
      </div>
    </section>
  )
}
