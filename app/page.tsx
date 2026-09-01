'use client'
import { useEffect, useMemo, useState } from 'react'
import SnapshotBar from '@/components/SnapshotBar'
import BudgetSnapshot from '@/components/BudgetSnapshot'
import SideTopCard from '@/components/SideTopCard'
import SideLiveFeed from '@/components/SideLiveFeed'
import ContentCard from '@/components/ContentCard'
import MonthlyBarChart from '@/components/MonthlyBarChart'
import { aggregateByMonth, toCumulative } from '@/lib/monthly-performance'
import ChannelDonut from '@/components/ChannelDonut'
import RegionDonut from '@/components/RegionDonut'
import BrandPipeline from '@/components/BrandPipeline'
import LocationStatus from '@/components/LocationStatus'
import type { Content, Summary, LocationSummary } from '@/lib/types'
import { channelSummaryFromContents } from '@/lib/channel-summary'
import { contentViews, contentViewsDisplay } from '@/lib/content-views'
import { AUGUST_2026_PINNED, mergePinnedRows, PERF_PINNED } from '@/lib/content-priority'

type Tab = 'perf' | 'month' | 'all'

const CAMPAIGNS = ['전체','명동오픈_0811','남포오픈','신사메가_6월','6월_중화권','6월_영미권','4_5월_영미권','3월_영미권']
const LOCATIONS = ['전체','명동점','남포점','신사점','이태원점','성수점','북촌점','종각점','강남점']
const CHANNELS  = ['전체','샤오홍슈','인스타그램','틱톡','도우인','웨이보']
const PERF_PREVIEW_COUNT = 9
const PERF_MORE_COUNT = 6

const CHANNEL_SHORT: Record<string, string> = {
  '샤오홍슈': '샤오홍슈',
  '인스타그램': '인스타',
  '틱톡': '틱톡',
  '도우인': '도우인',
  '웨이보': '웨이보',
}

function channelRankTags(rows: Content[]): Map<number, string[]> {
  const tags = new Map<number, string[]>()
  const add = (id: number, tag: string) => {
    const list = tags.get(id) ?? []
    if (!list.includes(tag)) list.push(tag)
    tags.set(id, list)
  }
  const metrics = [
    { key: 'views' as const, label: '조회수' },
    { key: 'likes' as const, label: '좋아요' },
    { key: 'saves' as const, label: '저장수' },
  ]
  for (const ch of [...new Set(rows.map(r => r.channel))]) {
    const group = rows.filter(r => r.channel === ch)
    const short = CHANNEL_SHORT[ch] ?? ch
    for (const { key, label } of metrics) {
      let winner: Content | null = null
      for (const row of group) {
        const n = row[key]
        if (n == null || n <= 0) continue
        if (!winner || n > (winner[key] ?? 0)) winner = row
      }
      if (winner) add(winner.id, `#${short} ${label} 1등`)
    }
  }
  return tags
}

function viewsForSort(c: Content): number {
  return contentViews(c)
}

function fmtTableViews(c: Content): string {
  const { value, estimated } = contentViewsDisplay(c)
  if (!value) return '—'
  return estimated ? `~${value.toLocaleString()}` : value.toLocaleString()
}

function SectionHeader({ no, title, sub, right }: {
  no: string; title: string; sub?: string; right?: string
}) {
  return (
    <div className="flex items-end gap-3 flex-wrap mb-3 px-0.5">
      <div>
        <span className="num text-[11px] text-azure tracking-widest">{no}</span>
        <h2 className="text-xl font-extrabold tracking-tight mt-1">{title}</h2>
        {sub && <p className="text-[12.5px] text-body mt-1 leading-relaxed">{sub}</p>}
      </div>
      {right && <span className="num text-[11px] text-slate ml-auto">{right}</span>}
    </div>
  )
}

function monthLabel(ym: string): string {
  return `${Number(ym.slice(5))}월`
}

function monthSub(ym: string): string {
  return `${ym.replace('-', '.')} 방문 기준`
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [locations, setLocations] = useState<LocationSummary[]>([])
  const [monthly, setMonthly] = useState<{ month: string; count: number; views: number; likes: number; saves: number }[]>([])
  const [cumulativeMonth, setCumulativeMonth] = useState<string | undefined>()
  const [contents, setContents] = useState<Content[]>([])
  const [chartContents, setChartContents] = useState<Content[]>([])
  const [chartLoading, setChartLoading] = useState(true)
  const [tab, setTab]           = useState<Tab>('perf')
  const [campaign, setCampaign] = useState('전체')
  const [location, setLocation] = useState('전체')
  const [channel, setChannel]   = useState('전체')
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')
  const [visibleCount, setVisibleCount] = useState(PERF_PREVIEW_COUNT)
  const [selectedMonth, setSelectedMonth] = useState('2026-08')
  const [tableSort, setTableSort] = useState<{ key: 'views' | 'likes' | 'saves'; dir: 'asc' | 'desc' }>({
    key: 'likes',
    dir: 'desc',
  })

  // 요약 데이터
  useEffect(() => {
    fetch('/api/summary')
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok || d.error) {
          setLoadError(d.error ?? '요약 데이터를 불러오지 못했습니다.')
          return
        }
        setSummary(d.summary)
        setLocations(d.locations ?? [])
        setMonthly(d.monthly ?? [])
      })
      .catch(() => setLoadError('요약 데이터를 불러오지 못했습니다.'))
  }, [])

  // 콘텐츠 데이터
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({
      sort: tab === 'all' ? 'date' : 'perf',
      limit: tab === 'all' ? '300' : '1000',
    })
    if (campaign !== '전체') params.set('campaign', campaign)
    if (location !== '전체') params.set('location', location)
    if (channel  !== '전체') params.set('channel',  channel)
    if (tab === 'month') params.set('month', selectedMonth)
    fetch(`/api/contents?${params}`)
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return
        if (!ok || d.error) {
          setLoadError(d.error ?? '콘텐츠 데이터를 불러오지 못했습니다.')
          setContents([])
        } else {
          setContents(d.data ?? [])
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('콘텐츠 데이터를 불러오지 못했습니다.')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [tab, campaign, location, channel, selectedMonth])

  // 도넛 차트용 — 성과순·전체는 필터 기준 전체, 월별은 해당 월만
  useEffect(() => {
    let cancelled = false
    setChartLoading(true)
    const params = new URLSearchParams({ sort: 'date', limit: '1000' })
    if (campaign !== '전체') params.set('campaign', campaign)
    if (location !== '전체') params.set('location', location)
    if (channel !== '전체') params.set('channel', channel)
    if (tab === 'month') params.set('month', selectedMonth)
    fetch(`/api/contents?${params}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        setChartContents(d.data ?? [])
        setChartLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setChartContents([])
        setChartLoading(false)
      })
    return () => { cancelled = true }
  }, [tab, campaign, location, channel, selectedMonth])

  useEffect(() => { setVisibleCount(PERF_PREVIEW_COUNT) }, [campaign, location, channel, selectedMonth])

  useEffect(() => {
    if (tab === 'perf' || tab === 'all') setCumulativeMonth(undefined)
  }, [tab, campaign, location, channel, chartContents])

  const chartChannels = useMemo(() => channelSummaryFromContents(chartContents), [chartContents])
  const filteredMonthly = useMemo(() => aggregateByMonth(chartContents), [chartContents])
  const cumulativeData = useMemo(() => toCumulative(filteredMonthly), [filteredMonthly])
  const chartScopeLabel = tab === 'month' ? `${monthLabel(selectedMonth)} 기준` : '전체 기준'
  const chartAnimKey = `${tab}-${selectedMonth}-${campaign}-${location}-${channel}`

  const rankTags = channelRankTags(contents)

  const cardContents = useMemo(() => {
    if (tab === 'perf') {
      return mergePinnedRows(contents, chartContents, PERF_PINNED)
    }
    if (tab === 'month' && selectedMonth === '2026-08') {
      return mergePinnedRows(contents, chartContents, AUGUST_2026_PINNED)
    }
    return contents
  }, [contents, chartContents, tab, selectedMonth])

  // 전체 탭용 테이블
  const tableContents = [...contents].sort((a, b) => {
    const av = tableSort.key === 'views' ? viewsForSort(a) : (a[tableSort.key] ?? 0)
    const bv = tableSort.key === 'views' ? viewsForSort(b) : (b[tableSort.key] ?? 0)
    return tableSort.dir === 'desc' ? bv - av : av - bv
  }).slice(0, 100)

  const NAV = [
    ['예산', '#s-budget'],
    ['누적 성과', '#s-summary'],
    ['방문형 성과', '#s1'],
    ['확정·진행', '#s-brands'],
    ['준비 중', '#s-prep'],
    ['계약 예정', '#s-pipeline'],
    ['지점 현황', '#s2'],
    ['자료', '#s3'],
  ] as const

  const sideCards = (
    <>
      <SideTopCard
        title={tab === 'month' ? `${monthLabel(selectedMonth)} 좋아요 TOP 3` : '좋아요 TOP 3'}
        emoji="🏆"
        sub={tab === 'month' ? monthSub(selectedMonth) : '전체 기간'}
        metric="likes"
        items={chartContents}
      />
      <SideTopCard
        title={tab === 'month' ? `${monthLabel(selectedMonth)} 조회수 TOP 3` : '조회수 TOP 3'}
        emoji="👀"
        sub={tab === 'month' ? `${monthSub(selectedMonth)} · 역산 포함` : '전체 기간 · 역산 포함'}
        metric="views"
        items={chartContents}
      />
    </>
  )

  return (
    <>
      <header className="owm-hdr">
        <div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight">
            <b className="text-[#2f1c13]">OWM</b>
            <i className="not-italic text-owm-text3 font-normal mx-1">×</i>
            브랜드슬램 인플루언서 리포트
            <span className="align-middle text-[11px] text-owm-blue bg-[#eef3ff] px-2.5 py-0.5 rounded-[10px] ml-2 font-semibold">
              v0.9
            </span>
          </h1>
          <div className="text-[11px] text-owm-text2 mt-1 flex flex-wrap gap-1">
            <span>08.30 기준</span><span className="text-[#bbb]">·</span>
            <span>수동 수집</span><span className="text-[#bbb]">·</span>
            <span>3월 ~ 8월 누적</span>
          </div>
        </div>
        <span className="text-xs text-owm-text2 bg-[#f0f2f7] px-3.5 py-1.5 rounded-2xl border border-owm-border">
          8개 지점
        </span>
      </header>

      <nav className="owm-tab-bar">
        {NAV.map(([label, href]) => (
          <a key={href} href={href} className="owm-tab-btn">{label}</a>
        ))}
      </nav>

      <div className="owm-dashboard-grid max-w-[1920px] mx-auto px-3 sm:px-5 lg:px-8 py-4 pb-24">
          {/* 좌측 사이드 */}
          <aside className="owm-side-col hidden xl:flex flex-col gap-4 sticky top-28 self-start">
            {sideCards}
          </aside>

          {/* 메인 */}
          <main className="min-w-0 w-full">
      {loadError && (
        <div className="owm-info-box mb-3 text-amber-ink border-amber/30 bg-amber/10">
          {loadError}
          <span className="block text-[12px] text-body mt-1">
            Supabase RLS 정책이 막혀 있으면 SQL Editor에서 <code className="text-[11px]">supabase/enable-public-read.sql</code> 을 실행하세요.
          </span>
        </div>
      )}
      {!loadError && summary && summary.total_rows === 0 && (
        <div className="owm-info-box mb-3 text-amber-ink border-amber/30 bg-amber/10">
          Supabase <code className="text-[11px]">contents</code> 테이블에 데이터가 없습니다.
          SQL Editor에서 <code className="text-[11px]">supabase/seed.sql</code> 을 실행해 주세요. (329건)
        </div>
      )}
      <BudgetSnapshot />

      <section id="s-summary" className="scroll-mt-28 mb-3">
        <div className="owm-sec-title">
          <span className="owm-sec-no">00</span>
          누적 성과
          <span className="text-xs font-normal text-owm-text2">8개 지점 · 2026.03 ~ 08</span>
        </div>
        <SnapshotBar summary={summary} />
        <div className="owm-info-box">
          <b className="text-owm-text">수치 기준 —</b> 샤오홍슈·도우인 조회수는 좋아요·저장·댓글로 역산했으며
          상단 누적 조회수에 반영됩니다. 도우인은 실측 조회수가 있으면 실측을 우선합니다.
          지표는 수동 수집이며 마지막 갱신은 2026.08.30입니다.
        </div>
      </section>

      {/* 모바일·태블릿: 사이드 카드 */}
      <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {sideCards}
        <SideLiveFeed />
      </div>

      {/* ── §1 콘텐츠 현황 ── */}
      <section id="s1" className="mb-10 scroll-mt-20">
        <SectionHeader no="01" title="OWM 방문형 콘텐츠 성과"
          sub="명동·북촌 방문형 캠페인 성과입니다. 아래에서 더 볼 수 있습니다."
          right={tab === 'perf'
            ? `${Math.min(visibleCount, contents.length)}건`
            : `${contents.length}건`}
        />

        {/* 탭 */}
        <div className="flex gap-1 bg-white/55 border border-white/75 rounded p-0.5 w-fit mb-3">
          {([['perf','성과순'],['month','월별'],['all','전체']] as [Tab,string][]).map(([t,label]) => (
            <button key={t} onClick={() => {
                if (t !== tab) setLoading(true)
                setTab(t)
              }}
              className={`text-[12.5px] font-semibold px-4 py-2 rounded transition-all
                ${tab===t
                  ? 'bg-azure text-white shadow-[0_2px_8px_rgba(24,104,240,.28)]'
                  : 'text-slate hover:text-azure-deep'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* 필터 */}
        <div className="flex gap-2 flex-wrap mb-4">
          {([
            ['캠페인', CAMPAIGNS, campaign, setCampaign],
            ['지점',   LOCATIONS, location, setLocation],
            ['채널',   CHANNELS,  channel,  setChannel],
          ] as [string, string[], string, (v:string)=>void][]).map(([label, opts, val, setter]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate font-semibold">{label}</span>
              <select value={val} onChange={e => setter(e.target.value)}
                className="text-[12px] bg-white/70 border border-mist rounded px-2 py-1.5
                  text-ink focus:outline-none focus:border-azure">
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          {(campaign !== '전체' || location !== '전체' || channel !== '전체') && (
            <button onClick={() => { setCampaign('전체'); setLocation('전체'); setChannel('전체') }}
              className="text-[11.5px] font-semibold text-slate border border-mist rounded
                px-2.5 py-1.5 hover:border-sky hover:text-azure-deep transition-colors">
              초기화
            </button>
          )}
        </div>

        {(tab === 'perf' || tab === 'all') && (
          <div className="glass p-5 mb-4">
            <span className="num text-[10.5px] text-slate tracking-widest uppercase">누적 성과</span>
            <p className="text-[11px] text-slate mt-1">
              필터 기준 · 누적 업로드(막대) · 누적 조회·좋아요·저장(선)
            </p>
            {chartLoading ? (
              <div className="h-48 mt-4 rounded-lg bg-mist/40 animate-pulse" />
            ) : (
              <MonthlyBarChart
                variant="cumulative"
                data={cumulativeData}
                highlightMonth={cumulativeMonth ?? cumulativeData[cumulativeData.length - 1]?.month}
                onSelectMonth={setCumulativeMonth}
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-4 items-start">
          <div className="min-w-0">
        {/* ── 성과순 ── */}
        {tab === 'perf' && (
          <>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {[...Array(PERF_PREVIEW_COUNT)].map((_, i) => (
                  <div key={i} className="glass-solid h-40 animate-pulse" />
                ))}
              </div>
            ) : contents.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {cardContents.slice(0, visibleCount).map(c => (
                    <ContentCard key={c.id} c={c} tags={rankTags.get(c.id)} />
                  ))}
                </div>
                {(cardContents.length > visibleCount || visibleCount > PERF_PREVIEW_COUNT) && (
                  <div className="mt-3 flex items-center justify-between gap-3 px-1">
                    <p className="text-[12px] text-slate">
                      {visibleCount}건 표시 중
                      {cardContents.length > visibleCount && (
                        <> · 남은 {cardContents.length - visibleCount}건</>
                      )}
                    </p>
                    <div className="flex items-center gap-3">
                      {visibleCount > PERF_PREVIEW_COUNT && (
                        <button
                          type="button"
                          onClick={() => setVisibleCount(PERF_PREVIEW_COUNT)}
                          className="text-[12px] font-semibold text-slate hover:text-azure-deep transition-colors whitespace-nowrap"
                        >
                          접기
                        </button>
                      )}
                      {cardContents.length > visibleCount && (
                        <button
                          type="button"
                          onClick={() => setVisibleCount(n => n + PERF_MORE_COUNT)}
                          className="text-[12px] font-semibold text-azure-deep hover:text-azure transition-colors whitespace-nowrap"
                        >
                          {Math.min(PERF_MORE_COUNT, cardContents.length - visibleCount)}개 더 보기
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="glass px-5 py-10 text-center text-[13px] text-slate">
                필터 조건에 맞는 콘텐츠가 없습니다.
              </div>
            )}
          </>
        )}

        {/* ── 월별 ── */}
        {tab === 'month' && (
          <>
            <div className="glass p-5">
              <span className="num text-[10.5px] text-slate tracking-widest uppercase">월별 성과</span>
              <p className="text-[11px] text-slate mt-1">업로드 건수(막대) · 조회·좋아요·저장(선)</p>
              <MonthlyBarChart
                variant="monthly"
                data={monthly}
                highlightMonth={selectedMonth}
                onSelectMonth={m => {
                  if (m === selectedMonth) return
                  setLoading(true)
                  setSelectedMonth(m)
                }}
              />
              <p className="text-[12.5px] text-body leading-relaxed pt-4 mt-4 border-t border-mist">
                <b className="text-azure-deep">
                  {Number(selectedMonth.slice(5))}월 {monthly.find(m => m.month === selectedMonth)?.count ?? contents.length}건.
                </b>
                {selectedMonth === '2026-08'
                  ? ' 명동점 오픈(8/11) 122건과 남포점 오픈 47건이 같은 달에 진행됐습니다.'
                  : ' 아래에서 해당 월 콘텐츠를 볼 수 있습니다.'}
              </p>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-4">
                {[...Array(PERF_PREVIEW_COUNT)].map((_, i) => (
                  <div key={i} className="glass-solid h-40 animate-pulse" />
                ))}
              </div>
            ) : contents.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-4">
                  {cardContents.slice(0, visibleCount).map(c => (
                    <ContentCard key={c.id} c={c} tags={rankTags.get(c.id)} />
                  ))}
                </div>
                {(cardContents.length > visibleCount || visibleCount > PERF_PREVIEW_COUNT) && (
                  <div className="mt-3 flex items-center justify-between gap-3 px-1">
                    <p className="text-[12px] text-slate">
                      {visibleCount}건 표시 중
                      {cardContents.length > visibleCount && (
                        <> · 남은 {cardContents.length - visibleCount}건</>
                      )}
                    </p>
                    <div className="flex items-center gap-3">
                      {visibleCount > PERF_PREVIEW_COUNT && (
                        <button
                          type="button"
                          onClick={() => setVisibleCount(PERF_PREVIEW_COUNT)}
                          className="text-[12px] font-semibold text-slate hover:text-azure-deep transition-colors whitespace-nowrap"
                        >
                          접기
                        </button>
                      )}
                      {cardContents.length > visibleCount && (
                        <button
                          type="button"
                          onClick={() => setVisibleCount(n => n + PERF_MORE_COUNT)}
                          className="text-[12px] font-semibold text-azure-deep hover:text-azure transition-colors whitespace-nowrap"
                        >
                          {Math.min(PERF_MORE_COUNT, cardContents.length - visibleCount)}개 더 보기
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="glass px-5 py-10 text-center text-[13px] text-slate mt-4">
                {Number(selectedMonth.slice(5))}월에 해당하는 콘텐츠가 없습니다.
              </div>
            )}
          </>
        )}

        {/* ── 전체 테이블 ── */}
        {tab === 'all' && (
          <div className="glass overflow-hidden">
            <div className="grid grid-cols-7 gap-3 px-4 py-2.5 bg-white/40
              num text-[10.5px] text-slate uppercase tracking-wider items-center">
              <div>지점</div><div>인플루언서</div><div>채널</div>
              {([
                ['views', '조회수'],
                ['likes', '좋아요'],
                ['saves', '저장'],
              ] as const).map(([key, label]) => {
                const active = tableSort.key === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTableSort(s =>
                      s.key === key
                        ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
                        : { key, dir: 'desc' }
                    )}
                    className={`text-left transition-colors
                      ${active ? 'text-azure-deep font-semibold' : 'hover:text-azure-deep'}`}
                    title={`${label} ${active && tableSort.dir === 'asc' ? '오름차순' : '내림차순'} 정렬`}
                  >
                    {label}{active ? (tableSort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </button>
                )
              })}
              <div />
            </div>
            {tableContents.map(c => (
              <div
                key={c.id}
                className={`grid grid-cols-7 gap-3 px-4 py-3 text-[12.5px]
                  border-t border-mist transition-colors
                  ${!c.upload_url ? 'opacity-60' : ''}`}
              >
                <div className="font-bold text-azure-deep">{c.location}</div>
                <div>{c.influencer_name}</div>
                <div className="text-slate">{c.channel}</div>
                <div className="num">{fmtTableViews(c)}</div>
                <div className="num">{c.likes?.toLocaleString() ?? '—'}</div>
                <div className="num">{c.saves?.toLocaleString() ?? '—'}</div>
                <div className="flex justify-end">
                  {c.upload_url ? (
                    <a
                      href={c.upload_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-azure-deep
                        hover:text-azure transition-colors whitespace-nowrap"
                    >
                      컨텐츠 보러가기
                      <span className="num text-[10px]">↗</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
          </div>

          <aside className="flex flex-col gap-2.5 w-full shrink-0 lg:sticky lg:top-16 self-start">
            <ChannelDonut
              data={chartChannels}
              scopeLabel={chartScopeLabel}
              animationKey={chartAnimKey}
              loading={chartLoading}
            />
            <RegionDonut
              data={chartChannels}
              scopeLabel={chartScopeLabel}
              animationKey={chartAnimKey}
              loading={chartLoading}
            />
          </aside>
        </div>
      </section>

      <BrandPipeline />

      <LocationStatus locations={locations} />

      {/* ── §3 자료 ── */}
      <section id="s3" className="scroll-mt-20">
        <SectionHeader no="07" title="자료 및 향후 개선"/>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="glass p-5">
            <h3 className="font-bold text-[13.5px] mb-1">관련 링크</h3>
            <p className="text-[11px] text-slate mb-3">원본 데이터</p>
            {[
              ['OWM 명동 본시트','#'],
              ['브랜드슬램 × OWM 종합','#'],
              ['콘텐츠 원본 드라이브','#'],
            ].map(([label, href]) => (
              <a key={label} href={href}
                className="flex items-center gap-2 text-[12.5px] text-body
                  px-2 py-2 rounded transition-colors hover:bg-white/85 hover:text-azure-deep">
                {label}
                <span className="num text-[10.5px] text-slate ml-auto">↗</span>
              </a>
            ))}
          </div>
          <div className="glass p-5">
            <h3 className="font-bold text-[13.5px] mb-1">인플루언서 가이드라인</h3>
            <p className="text-[11px] text-slate mb-3">최종 수정 2026.08.01</p>
            {[
              ['촬영 가이드 (구도 · 조명)', 'https://slam-pick-three.vercel.app/'],
              ['필수 해시태그 · 멘션', 'https://slam-pick-three.vercel.app/'],
              ['유료 광고 표기 규정','#'],
            ].map(([label, href]) => (
              <a key={label} href={href}
                {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="flex items-center gap-2 text-[12.5px] text-body
                  px-2 py-2 rounded transition-colors hover:bg-white/85 hover:text-azure-deep">
                {label}
                <span className="num text-[10.5px] text-slate ml-auto">↗</span>
              </a>
            ))}
          </div>
          <div className="glass p-5">
            <h3 className="font-bold text-[13.5px] mb-1">향후 개선</h3>
            <p className="text-[11px] text-slate mb-3">다음에 열릴 기능</p>
            <div className="relative pl-4 border-l border-mist space-y-3">
              {[
                ['9월 2주','샤오홍슈 추정 조회수 자동 계산 ✓'],
                ['9월 4주','브랜드별 상세 리포트 · 리드타임 시각화'],
                ['10월',  '채널 지표 자동 수집 · 기간 비교'],
              ].map(([q, t], i) => (
                <div key={q} className="relative">
                  <div className={`absolute -left-[21px] top-1 w-2 h-2 rounded-[2px] border-2
                    ${i===0 ? 'border-azure shadow-[0_0_0_3px_rgba(24,104,240,.15)] bg-white' : 'border-sky bg-white'}`}/>
                  <div className="num text-[10px] text-azure tracking-wider">{q}</div>
                  <div className="text-[12.5px] text-body mt-0.5">{t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 px-5 py-4 text-[12.5px] text-body leading-relaxed
          bg-white/50 border-l-[3px] border-azure rounded-r-[6px]">
          <b className="text-azure-deep">참고사항 —</b>{' '}
          조회수 합계는 샤오홍슈·도우인 역산을 반영한 값이며,{' '}
          <b className="text-azure-deep">실제 노출과 차이가 있을 수 있습니다.</b>
        </div>
      </section>

          </main>

          <aside className="owm-side-col hidden xl:block sticky top-28 self-start">
            <SideLiveFeed />
          </aside>
        </div>
    </>
  )
}
