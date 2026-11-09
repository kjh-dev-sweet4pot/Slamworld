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
    // 같은 게시물 중복 행은 하나만 — 링크 또는 이름·채널·조회수가 같으면 중복
    const seen = new Set<string>()
    let list = (contents ?? []).filter(c => {
      const keys = [c.upload_url, `${c.influencer_name}|${c.channel}|${contentViews(c)}`].filter(Boolean) as string[]
      if (keys.some(k => seen.has(k))) return false
      keys.forEach(k => seen.add(k))
      return true
    })

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

  const CH_COLOR: Record<string, string> = { 샤오홍슈: '#e03131', 인스타그램: '#8b5cf6', 틱톡: '#06b6d4', 도우인: '#475569', 웨이보: '#f59e0b' }
  const rowCols = 'grid grid-cols-[28px_minmax(0,1fr)_68px_72px] sm:grid-cols-[40px_minmax(0,1.6fr)_80px_80px_90px_60px_24px] gap-1.5'
  const seg = (on: boolean) =>
    `text-[11px] rounded-[6px] px-[9px] py-[5px] transition-colors ${on ? 'font-bold text-[#1a1d2e] bg-white' : 'font-medium text-[#4a4538] hover:text-[#1a1d2e]'}`

  // 함께 방문한 인플루언서 알약 (상세 패널 · 모바일 공용)
  const coVisitorBlock = selectedItem && coVisitors.length > 0 && (
    <>
      <div className="text-[12px] font-extrabold text-[#1a1d2e] mt-3">
        함께 방문한 인플루언서{' '}
        <span className="font-medium text-[#6b6558]">{selectedItem.location} · 총 {coVisitors.length}명</span>
      </div>
      <div className="flex flex-wrap gap-[5px] mt-1.5">
        {coVisitors.map((cov, i) => (
          <button
            key={cov.influencer_name + i}
            type="button"
            onClick={() => handleSelect(cov.influencer_name)}
            title={`${cov.channel}${cov.upload_url ? ` · 좋아요 ${(cov.likes ?? 0).toLocaleString()}` : ''}`}
            className="border border-[#e3d9c4] bg-white text-[11px] font-medium text-[#1a1d2e] rounded-full px-2 py-1 hover:border-[#3557d6] transition-colors"
          >
            {cov.influencer_name}
            <span className="text-[#6b6558]"> · {cov.upload_url ? `${formatViews(contentViews(cov))} 뷰 · ${(cov.likes ?? 0).toLocaleString()} ❤️` : '미발행'}</span>
          </button>
        ))}
      </div>
    </>
  )

  return (
    <section className="mb-10 bg-white border border-[#f2ebdd] rounded-[6px] p-[18px] shadow-[0_4px_16px_rgba(30,41,59,0.06)]">
      {/* 헤더 · 검색 · 지표 토글 */}
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="m-0 text-[18px] font-extrabold text-[#1a1d2e]">
          인기 콘텐츠 분석{' '}
          <span className="text-[11.5px] font-medium text-[#6b6558]">( ※ 콘텐츠 클릭 시 상세 표시 )</span>
        </h3>
        <div className="flex-1" />
        <input
          type="text"
          aria-label="인플루언서 검색"
          placeholder="🔍 인플루언서 검색"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full sm:w-[200px] text-[12px] text-[#1a1d2e] placeholder-[#a9a294] bg-[#fbf9f4] border border-[#f0e9da] rounded-[6px] px-2.5 py-[7px] focus:outline-none focus:border-[#3557d6] transition-colors"
        />
        <div className="flex gap-[3px] bg-[#f7f4ec] rounded-[8px] p-[3px]">
          <button type="button" onClick={() => setMetricMode('views')} className={seg(metricMode === 'views')}>조회수</button>
          <button type="button" onClick={() => setMetricMode('likes')} className={seg(metricMode === 'likes')}>좋아요</button>
        </div>
      </div>

      {/* 지점 칩 */}
      <div className="flex flex-wrap gap-[5px] mt-2.5">
        {locOptions.map(opt => {
          const active = locFilter === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setLocFilter(opt)}
              className={`text-[11px] font-medium rounded-full px-2.5 py-1 border transition-colors ${
                active ? 'text-white bg-[#1a1d2e] border-[#1a1d2e]' : 'text-[#1a1d2e] bg-white border-[#e3d9c4] hover:bg-[#faf8f3]'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {/* 랭킹 목록 & 상세 2분할 */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-[18px] mt-3">
        <div className="min-w-0">
          <div className={`${rowCols} text-[11px] text-[#6b6558] pb-1.5 border-b border-[#efe5d0]`}>
            <span>순위</span>
            <span>인플루언서</span>
            <span>채널</span>
            <span className="hidden sm:block">지점</span>
            <span className="text-right">{metricMode === 'views' ? '조회수' : '좋아요'}</span>
            <span className="hidden sm:block text-right">비중</span>
            <span className="hidden sm:block" />
          </div>

          {filteredRows.slice(0, displayCount).map((item, idx) => {
            const isSelected = item.influencer_name === selectedItem?.influencer_name
            const itemVal = metricMode === 'views' ? contentViews(item) : (item.likes ?? 0)
            const pct = ((itemVal / totalMetric) * 100).toFixed(1)
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
                className={`${rowCols} cursor-pointer items-center py-2 border-b border-[#f4efe4] text-[12px] text-[#1a1d2e] transition-colors ${
                  isSelected ? 'bg-[#eef1fb]' : 'hover:bg-[#faf8f3]'
                }`}
              >
                <span className="font-extrabold">{idx + 1}</span>
                <span className="font-bold truncate">{item.influencer_name}</span>
                <span className="font-bold truncate" style={{ color: CH_COLOR[item.channel] ?? '#475569' }}>● {item.channel}</span>
                <span className="hidden sm:block truncate">{item.location.replace('점', '')}</span>
                <span className="text-right font-bold">{displayVal}</span>
                <span className="hidden sm:block text-right">{pct}%</span>
                <span className="hidden sm:block">
                  {item.upload_url && (
                    <a
                      href={item.upload_url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="업로드 열기"
                      onClick={e => e.stopPropagation()}
                      className="no-underline text-[#3557d6]"
                    >
                      ↗
                    </a>
                  )}
                </span>
              </div>
            )
          })}

          {filteredRows.length > displayCount && (
            <div className="text-center mt-2.5">
              <button
                type="button"
                onClick={() => setDisplayCount(prev => prev + 8)}
                className="border border-[#e3d9c4] bg-white text-[12px] font-medium text-[#1a1d2e] rounded-full px-3.5 py-1.5 hover:bg-[#faf8f3] transition-colors"
              >
                더보기
              </button>
            </div>
          )}
        </div>

        {/* 우측 선택된 인플루언서 상세 패널 */}
        {selectedItem && (
          <div className="hidden sm:block bg-[#faf8f3] rounded-[6px] p-4 h-fit min-w-0">
            <div className="flex gap-3 items-center">
              <span className="w-14 h-14 rounded-full bg-[#ece4d2] text-[#6b6558] grid place-items-center text-[18px] font-extrabold shrink-0">
                {selectedItem.influencer_name.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] text-[#6b6558]">{selectedItem.target_audience || '인플루언서'}</div>
                <div className="text-[16px] font-extrabold text-[#1a1d2e] truncate">{selectedItem.influencer_name}</div>
                <div className="text-[11.5px] text-[#4a4538]">{selectedItem.location} · {selectedItem.channel}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 xl:grid-cols-5 gap-1.5 mt-3">
              {[
                { l: '조회수', v: contentViews(selectedItem).toLocaleString() },
                { l: '좋아요', v: (selectedItem.likes ?? 0).toLocaleString() },
                { l: '댓글', v: (selectedItem.comments ?? 0).toLocaleString() },
                {
                  l: '참여율',
                  v: contentViews(selectedItem) > 0
                    ? `${(((selectedItem.likes ?? 0) + (selectedItem.comments ?? 0) + (selectedItem.saves ?? 0)) / contentViews(selectedItem) * 100).toFixed(2)}%`
                    : '—',
                },
                { l: '방문일', v: selectedItem.visit_date || '—' },
              ].map(s => (
                <div key={s.l} className="bg-white rounded-[8px] p-2 min-w-0">
                  <div className="text-[10px] text-[#6b6558]">{s.l}</div>
                  <div className="text-[13px] font-extrabold text-[#1a1d2e] truncate">{s.v}</div>
                </div>
              ))}
            </div>

            <div className="text-[12px] font-extrabold text-[#1a1d2e] mt-3">채널별 조회 편중</div>
            {channelBias.map(ch => (
              <div key={ch.key} className="flex items-center gap-1.5 text-[11px] mt-[5px]">
                <span className="w-14 text-[#1a1d2e]">{ch.name}</span>
                <span className="flex-1 h-1.5 rounded-[3px] bg-[#ece4d2]">
                  <span className="block h-1.5 rounded-[3px] transition-all duration-300" style={{ width: `${ch.pct}%`, backgroundColor: ch.color }} />
                </span>
                <span className="w-8 text-right">{ch.pct}%</span>
              </div>
            ))}

            {coVisitorBlock}
          </div>
        )}
      </div>

      {/* 모바일: 상세 패널이 숨겨지므로 함께 방문만 따로 */}
      <div className="sm:hidden">{coVisitorBlock}</div>

      {/* 수치 기준 안내 */}
      <div className="text-[11px] text-[#4a4538] bg-[#faf8f3] rounded-[6px] px-3 py-2.5 mt-3 leading-[1.7]">
        <b>수치 기준 —</b> 샤오홍슈·도우인 조회수는 플랫폼이 조회수를 제공하지 않아 좋아요·저장·댓글 합을 인터랙션율 2.3%로 역산한 값이며 <b>~</b> 로 표시했습니다. 누적 조회수에 반영되며 실제 노출과 차이가 있을 수 있습니다. 콘텐츠 형식(릴스·노트·숏폼·게시물)은 업로드 링크 패턴으로 자동 분류했습니다. 지표는 자동 수집이고 마지막 갱신은 2026.08.31입니다.
      </div>
    </section>
  )
}
