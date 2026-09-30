'use client'

import { useState, useMemo } from 'react'
import type { Content } from '@/lib/types'
import { V2_CH_COLORS, V2_ORDERED_LOCATIONS, isGreaterChina, formatViews, normalizeLocationName } from '@/lib/v2-analytics'
import { contentViews } from '@/lib/content-views'
import { useChartTooltip } from '@/components/v2/ChartTooltip'

interface CompositionSectionProps {
  contents?: Content[]
}

const CHANNELS = ['샤오홍슈', '인스타그램', '틱톡', '도우인', '웨이보'] as const
const CIRCUMFERENCE = 452.39 // 2 * Math.PI * 72

export default function CompositionSection({
  contents = [],
}: CompositionSectionProps) {
  const [chMetric, setChMetric] = useState<'count' | 'views'>('count')
  const [selectedLoc, setSelectedLoc] = useState('전체')
  const [regionMetric, setRegionMetric] = useState<'views' | 'count'>('views')
  const tooltip = useChartTooltip()

  // 실제 데이터에 존재하는 지점 옵션
  const locOptions = useMemo(() => {
    const locSet = new Set(contents.map(c => c.location).filter(Boolean))
    const active = V2_ORDERED_LOCATIONS.filter(l => locSet.has(l)).map(l => l.replace('점', ''))
    return ['전체', ...active]
  }, [contents])

  // 선택된 지점 필터 적용
  const scopedContents = useMemo(() => {
    if (selectedLoc === '전체') return contents
    return contents.filter(c => c.location.includes(selectedLoc))
  }, [contents, selectedLoc])

  // 채널별 데이터 및 도넛 세그먼트 계산
  const channelData = useMemo(() => {
    const totalCount = scopedContents.filter(c => c.upload_url).length
    const totalViews = scopedContents.reduce((s, c) => s + contentViews(c), 0)
    const targetTotal = chMetric === 'count' ? totalCount : totalViews

    let accumulatedPct = 0
    const list = CHANNELS.map(ch => {
      const rows = scopedContents.filter(c => c.channel === ch)
      const count = rows.filter(c => c.upload_url).length
      const views = rows.reduce((s, c) => s + contentViews(c), 0)
      const val = chMetric === 'count' ? count : views
      const pct = targetTotal > 0 ? (val / targetTotal) * 100 : 0

      // SVG 원호 길이 & 오프셋
      const dash = (pct / 100) * CIRCUMFERENCE
      const offset = -(accumulatedPct / 100) * CIRCUMFERENCE
      accumulatedPct += pct

      return {
        channel: ch,
        color: V2_CH_COLORS[ch] || '#9ca3af',
        count,
        views,
        pct: pct.toFixed(1),
        dash,
        offset,
      }
    })

    return {
      list,
      totalCount,
      totalViews,
    }
  }, [scopedContents, chMetric])

  // 권역별 분석 데이터
  const regionalData = useMemo(() => {
    const locSet = new Set(contents.map(c => normalizeLocationName(c.location)).filter(Boolean))
    const locations = V2_ORDERED_LOCATIONS.filter(l => locSet.has(l))

    const locList = locations.map(locName => {
      const rows = contents.filter(c => normalizeLocationName(c.location) === locName)
      const chinaViews = rows.filter(c => isGreaterChina(c.channel)).reduce((s, c) => s + contentViews(c), 0)
      const globalViews = rows.filter(c => !isGreaterChina(c.channel)).reduce((s, c) => s + contentViews(c), 0)
      const chinaCount = rows.filter(c => isGreaterChina(c.channel) && c.upload_url).length
      const globalCount = rows.filter(c => !isGreaterChina(c.channel) && c.upload_url).length

      const totalViews = chinaViews + globalViews
      const totalCount = chinaCount + globalCount

      const chinaVal = regionMetric === 'views' ? chinaViews : chinaCount
      const globalVal = regionMetric === 'views' ? globalViews : globalCount
      const totalVal = regionMetric === 'views' ? totalViews : totalCount

      const chinaPct = totalVal > 0 ? ((chinaVal / totalVal) * 100).toFixed(1) : '0'
      const globalPct = totalVal > 0 ? (100 - parseFloat(chinaPct)).toFixed(1) : '0'

      return {
        name: locName.replace('점', ''),
        chinaVal,
        globalVal,
        totalVal,
        chinaPct: parseFloat(chinaPct),
        globalPct: parseFloat(globalPct),
        totalCount,
      }
    })

    // 전체 요약
    const allChinaViews = contents.filter(c => isGreaterChina(c.channel)).reduce((s, c) => s + contentViews(c), 0)
    const allGlobalViews = contents.filter(c => !isGreaterChina(c.channel)).reduce((s, c) => s + contentViews(c), 0)
    const allChinaCount = contents.filter(c => isGreaterChina(c.channel) && c.upload_url).length
    const allGlobalCount = contents.filter(c => !isGreaterChina(c.channel) && c.upload_url).length

    const sumViews = allChinaViews + allGlobalViews
    const sumCount = allChinaCount + allGlobalCount

    const totalMetricVal = regionMetric === 'views' ? sumViews : sumCount
    const chinaMetricVal = regionMetric === 'views' ? allChinaViews : allChinaCount
    const globalMetricVal = regionMetric === 'views' ? allGlobalViews : allGlobalCount

    const chinaRatio = totalMetricVal > 0 ? ((chinaMetricVal / totalMetricVal) * 100).toFixed(1) : '0'
    const globalRatio = totalMetricVal > 0 ? ((globalMetricVal / totalMetricVal) * 100).toFixed(1) : '0'

    return {
      locList,
      allChinaViews,
      allGlobalViews,
      allChinaCount,
      allGlobalCount,
      chinaMetricVal,
      globalMetricVal,
      chinaRatio,
      globalRatio,
    }
  }, [contents, regionMetric])

  return (
    <section className="mb-8">
      <div className="text-[18px] font-extrabold tracking-tight text-[#1a1d2e] pt-6 pb-2.5 px-1">
        구성비 분석
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. 채널별 분석 */}
        <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
          <div className="flex items-center gap-2">
            <span className="text-[14.5px] font-extrabold text-[#1a1d2e]">
              채널별 분석
            </span>
            <span className="text-[11px] text-[#9a9486]" title="채널별 점유율 및 성과">ⓘ</span>
            <div className="ml-auto flex items-center gap-1 bg-[#f7f4ec] rounded-[9px] p-[3px]">
              <button
                type="button"
                onClick={() => setChMetric('count')}
                className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                  chMetric === 'count'
                    ? 'font-bold text-[#1a1d2e] bg-white shadow-xs'
                    : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
                }`}
              >
                건수
              </button>
              <button
                type="button"
                onClick={() => setChMetric('views')}
                className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                  chMetric === 'views'
                    ? 'font-bold text-[#1a1d2e] bg-white shadow-xs'
                    : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
                }`}
              >
                조회수
              </button>
            </div>
          </div>

          {/* 지점 필터 알약 탭 */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {locOptions.map(opt => {
              const active = selectedLoc === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedLoc(opt)}
                  className={`text-[11.5px] font-semibold rounded-[16px] px-3 py-1.5 transition-all ${
                    active ? 'bg-[#4f7cff] text-white font-bold shadow-xs' : 'bg-[#f7f4ec] text-[#8b8578] hover:text-[#1a1d2e]'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-5 sm:gap-6 mt-4.5">
            {/* SVG 도넛 차트 */}
            <div className="relative shrink-0">
              <svg viewBox="0 0 200 200" className="w-[170px] h-[170px] sm:w-[186px] sm:h-[186px] block">
                <g transform="rotate(-90 100 100)" fill="none" strokeWidth="30">
                  {/* 배경 트랙 */}
                  <circle cx="100" cy="100" r="72" stroke="#f4efe3" strokeWidth="30" />
                  {/* 동적 채널 원호 */}
                  {channelData.list.map(ch => (
                    ch.dash > 0 && (
                      <circle
                        key={ch.channel}
                        cx="100"
                        cy="100"
                        r="72"
                        stroke={ch.color}
                        strokeDasharray={`${ch.dash} ${CIRCUMFERENCE}`}
                        strokeDashoffset={ch.offset}
                        strokeLinecap="butt"
                        className="transition-all hover:opacity-80 cursor-default"
                        {...tooltip.bind(ch.channel, [
                          { label: '점유율', value: `${ch.pct}%`, color: ch.color, active: true },
                          { label: '업로드', value: `${ch.count}건` },
                          { label: '조회수', value: `${ch.views.toLocaleString()}회` },
                        ])}
                      />
                    )
                  ))}
                </g>
                <text
                  x="100"
                  y="96"
                  fontSize="22"
                  fontWeight="800"
                  fill="#1a1d2e"
                  textAnchor="middle"
                >
                  {chMetric === 'count' ? `${channelData.totalCount}건` : formatViews(channelData.totalViews)}
                </text>
                <text
                  x="100"
                  y="116"
                  fontSize="11"
                  fontWeight="600"
                  fill="#9a9486"
                  textAnchor="middle"
                >
                  {chMetric === 'count' ? '총 콘텐츠' : '총 조회수'}
                </text>
              </svg>
            </div>

            {/* 채널별 리스트 */}
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              {channelData.list.map(ch => (
                <div
                  key={ch.channel}
                  className="flex items-center gap-2 cursor-default"
                  {...tooltip.bind(ch.channel, [
                    { label: '점유율', value: `${ch.pct}%`, color: ch.color, active: true },
                    { label: '업로드', value: `${ch.count}건` },
                    { label: '조회수', value: `${ch.views.toLocaleString()}회` },
                  ])}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ch.color }} />
                  <span className="text-[12.5px] font-semibold text-[#1a1d2e] flex-1 truncate">{ch.channel}</span>
                  <span className="text-[13px] font-extrabold text-[#1a1d2e] w-14 text-right">
                    {chMetric === 'count' ? `${ch.count}건` : formatViews(ch.views)}
                  </span>
                  <span className="text-[11.5px] text-[#9a9486] w-12 text-right">
                    {ch.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. 권역별 조회 비중 */}
        <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
          <div className="flex items-center gap-2.5">
            <span className="text-[14.5px] font-extrabold text-[#1a1d2e]">
              권역별 {regionMetric === 'views' ? '조회' : '건수'} 비중
            </span>
            <div className="ml-auto flex items-center gap-1 bg-[#f7f4ec] rounded-[9px] p-[3px]">
              <button
                type="button"
                onClick={() => setRegionMetric('views')}
                className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                  regionMetric === 'views'
                    ? 'font-bold text-[#1a1d2e] bg-white shadow-xs'
                    : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
                }`}
              >
                조회수
              </button>
              <button
                type="button"
                onClick={() => setRegionMetric('count')}
                className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                  regionMetric === 'count'
                    ? 'font-bold text-[#1a1d2e] bg-white shadow-xs'
                    : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
                }`}
              >
                건수
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3.5 mt-3.5">
            <span className="flex items-center gap-1.5 text-[11px] text-[#6b6558]">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-[#f97316]" />
              중화권 (샤오홍슈·도우인·웨이보)
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#6b6558]">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-[#64748b]" />
              영미·글로벌 (인스타·틱톡)
            </span>
          </div>

          {/* 지점별 스택 바 */}
          <div className="flex flex-col gap-3 mt-4">
            {regionalData.locList.length === 0 ? (
              <div className="text-center py-8 text-[12px] text-[#9a9486]">권역별 데이터가 없습니다.</div>
            ) : (
              regionalData.locList.map(loc => (
                <div
                  key={loc.name}
                  className="flex items-center gap-2.5 cursor-default"
                  {...tooltip.bind(
                    `${loc.name}점 · 권역별 ${regionMetric === 'views' ? '조회' : '건수'}`,
                    [
                      {
                        label: '중화권',
                        color: '#f97316',
                        value: `${regionMetric === 'views' ? formatViews(loc.chinaVal) : `${loc.chinaVal}건`} (${loc.chinaPct}%)`,
                      },
                      {
                        label: '영미·글로벌',
                        color: '#64748b',
                        value: `${regionMetric === 'views' ? formatViews(loc.globalVal) : `${loc.globalVal}건`} (${loc.globalPct}%)`,
                      },
                    ],
                    `합계 ${regionMetric === 'views' ? `${loc.totalVal.toLocaleString()}회` : `${loc.totalCount}건`}`,
                  )}
                >
                  <span className="w-12 text-[12px] font-bold text-[#1a1d2e]">{loc.name}</span>
                  <span className="flex-1 h-[22px] rounded-[5px] bg-[#f4efe3] flex overflow-hidden">
                    {loc.chinaPct > 0 && (
                      <span
                        className="flex items-center justify-center h-full bg-[#f97316] text-white text-[10.5px] font-bold transition-all"
                        style={{ width: `${loc.chinaPct}%` }}
                      >
                        {loc.chinaPct >= 15 ? `${loc.chinaPct}%` : ''}
                      </span>
                    )}
                    {loc.globalPct > 0 && (
                      <span
                        className="flex items-center justify-center h-full bg-[#64748b] text-white text-[10.5px] font-bold transition-all"
                        style={{ width: `${loc.globalPct}%` }}
                      >
                        {loc.globalPct >= 15 ? `${loc.globalPct}%` : ''}
                      </span>
                    )}
                  </span>
                  <span className="w-14 text-right text-[12px] font-bold text-[#1a1d2e]">
                    {regionMetric === 'views' ? formatViews(loc.totalVal) : `${loc.totalCount}건`}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* 하단 요약 카드 2종 */}
          <div className="flex gap-3.5 mt-8">
            <div className="flex-1 bg-[#fff7ed] border border-[#fed7aa] rounded-xl p-3.5">
              <div className="text-[11.5px] font-bold text-[#9a3412]">중화권</div>
              <div className="text-[20px] sm:text-[22px] font-extrabold tracking-tight mt-1.5 text-[#c2410c]">
                {regionMetric === 'views' ? regionalData.allChinaViews.toLocaleString() : `${regionalData.allChinaCount}건`}
              </div>
              <div className="text-[11px] text-[#a16207] mt-1">
                전체의 {regionalData.chinaRatio}%
              </div>
            </div>

            <div className="flex-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5">
              <div className="text-[11.5px] font-bold text-[#475569]">영미·글로벌</div>
              <div className="text-[20px] sm:text-[22px] font-extrabold tracking-tight mt-1.5 text-[#334155]">
                {regionMetric === 'views' ? regionalData.allGlobalViews.toLocaleString() : `${regionalData.allGlobalCount}건`}
              </div>
              <div className="text-[11px] text-[#64748b] mt-1">
                전체의 {regionalData.globalRatio}%
              </div>
            </div>
          </div>
        </div>
      </div>
      {tooltip.node}
    </section>
  )
}
