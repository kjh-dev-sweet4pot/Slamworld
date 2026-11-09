'use client'

import { useEffect, useMemo, useState } from 'react'
import LoginGate from '@/components/LoginGate'
import { useAccess } from '@/lib/access-context'
import HeaderV2 from '@/components/v2/HeaderV2'
import BunnyLayer from '@/components/v2/BunnyLayer'
import PendingPublishCard from '@/components/v2/PendingPublishCard'
import PeriodNavV2, { AVAILABLE_MONTHS, AVAILABLE_WEEKS, type NavMode } from '@/components/v2/PeriodNavV2'
import { inWeek, weekLabel } from '@/lib/week'
import LocationVisitSection from '@/components/v2/LocationVisitSection'
import ExecutionSummarySection from '@/components/v2/ExecutionSummarySection'
import OverallTotalsSection from '@/components/v2/OverallTotalsSection'
import TrendAnalysisSection from '@/components/v2/TrendAnalysisSection'
import CompositionSection from '@/components/v2/CompositionSection'
import FormatAnalysisSection from '@/components/v2/FormatAnalysisSection'
import PopularContentSection from '@/components/v2/PopularContentSection'
import CostEfficiencySection from '@/components/v2/CostEfficiencySection'
import ReportPrintV2 from '@/components/v2/ReportPrintV2'
import SectionPeriodScope, { GlobalPeriodContext } from '@/components/v2/SectionPeriodScope'
import ExecutiveSummarySection from '@/components/v2/ExecutiveSummarySection'
import UploadGallerySection from '@/components/v2/UploadGallerySection'
import ChannelSummaryCard from '@/components/v2/ChannelSummaryCard'
import PipelineCountCard from '@/components/v2/PipelineCountCard'
import UpcomingVisitsCard from '@/components/v2/UpcomingVisitsCard'
import ProductAnalysisSection from '@/components/v2/ProductAnalysisSection'
import WorkHomeSections from '@/components/v2/WorkHomeSections'
import type { Content } from '@/lib/types'
import {
  downloadInfluencerXlsx,
  influencerXlsxFilename,
  printReportPdf,
  reportPdfTitle,
} from '@/lib/export-report'
import { contentMatchesBrand } from '@/lib/brand-content'
import { getFallbackContents } from '@/lib/v2-analytics'
import { contentPeriodDate, inPerformanceMonth, isBeforeV2 } from '@/lib/posted-date'

export default function Dashboard() {
  return (
    <LoginGate>
      <DashboardInner />
    </LoginGate>
  )
}

function DashboardInner() {
  const { showSales, logout, partnerBrand } = useAccess()
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [periodMode, setPeriodMode] = useState<NavMode>('all')
  const [weekIndex, setWeekIndex] = useState<number>(AVAILABLE_WEEKS.length - 1)
  const currentWeek = AVAILABLE_WEEKS[weekIndex]
  const [currentMonth, setCurrentMonth] = useState<string>(AVAILABLE_MONTHS[AVAILABLE_MONTHS.length - 1])
  // 하위 섹션은 전체/월별만 안다 — 주간이면 그 주가 속한 달로 맞춘다
  // 7월 이전 묶음은 하위 섹션에선 전체로 본다
  const sectionMode = periodMode === 'weekly' ? 'monthly' : periodMode === 'pre' ? 'all' : periodMode
  const sectionMonth = periodMode === 'weekly' ? currentWeek.month : currentMonth
  const [selectedInfluencer, setSelectedInfluencer] = useState<string | null>('pada_heli')
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [galleryLocation, setGalleryLocation] = useState<string | null>(null)

  // 콘텐츠 데이터 조회 (Supabase). reload 가 바뀌면 조용히 다시 불러온다
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let cancelled = false
    if (reload === 0) setLoading(true)

    fetch('/api/contents?sort=perf&limit=1000', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.data && d.data.length > 0) {
          setContents(d.data)
        } else if (reload === 0) {
          setContents(getFallbackContents())
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        if (reload === 0) setContents(getFallbackContents())
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reload])

  // 보딩패스 준실시간 동기화 — 화면이 보이는 동안 2분마다 요청, 실제로 돌았으면 다시 불러온다
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== 'visible') return
      fetch('/api/sync-boardingpass/auto', { method: 'POST' })
        .then(r => (r.ok ? r.json() : null))
        .then(d => d?.synced && setReload(n => n + 1))
        .catch(() => {})
    }
    sync()
    const timer = setInterval(sync, 120_000)
    document.addEventListener('visibilitychange', sync)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  // 회원사 전용 필터 적용
  const scopedContents = useMemo(() => {
    // 테스트 데이터(teste2e) 숨김
    // 같은 업로드 링크가 DB 에 여러 줄이면 첫 줄(id 작은 것)만 쓴다
    const seen = new Set<string>()
    const real = [...contents]
      .sort((a, b) => Number(a.id) - Number(b.id))
      .filter(c => !/teste2e/i.test(`${c.location} ${c.brands ?? ''} ${c.campaign ?? ''} ${c.influencer_name}`))
      .filter(c => {
        const u = (c.upload_url ?? '').trim().replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase()
        if (!u) return true
        if (seen.has(u)) return false
        seen.add(u)
        return true
      })
    if (!partnerBrand) return real
    return real.filter(c => contentMatchesBrand(c.brands, partnerBrand))
  }, [contents, partnerBrand])

  // 지점 필터 (전 섹션 공통)
  const locationContents = useMemo(() => {
    if (!selectedLocation) return scopedContents
    return scopedContents.filter(c => c.location === selectedLocation)
  }, [scopedContents, selectedLocation])

  // 상단 기간 내비(전체/월별) — §1 지점별 방문 현황 영역에만 적용. 나머지 섹션은 각자 기간 선택기 사용
  const filteredContents = useMemo(() => {
    if (periodMode === 'pre') return locationContents.filter(c => isBeforeV2(contentPeriodDate(c)))
    if (periodMode === 'weekly') return locationContents.filter(c => inWeek(contentPeriodDate(c), currentWeek))
    if (periodMode !== 'monthly') return locationContents
    return locationContents.filter(c => inPerformanceMonth(contentPeriodDate(c), currentMonth))
  }, [locationContents, periodMode, currentMonth, currentWeek])

  // 고유 지점 수 (회원사 기준)
  const locationCount = useMemo(() => {
    return new Set(scopedContents.map(c => c.location).filter(Boolean)).size
  }, [scopedContents])

  const handlePrintPdf = () => {
    printReportPdf(reportPdfTitle(partnerBrand))
  }

  const handleDownloadExcel = () => {
    // 엑셀은 2026.07 이후만 (7월 이전 보기에선 그 묶음 그대로)
    const rows = periodMode === 'pre' ? filteredContents : filteredContents.filter(c => !isBeforeV2(contentPeriodDate(c)))
    downloadInfluencerXlsx(rows, influencerXlsxFilename(partnerBrand))
  }

  const handleSelectInfluencer = (name: string) => {
    setSelectedInfluencer(name)
    const el = document.getElementById('section-popular')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // 지점 카드 클릭 → 전역 필터 대신 업로드 목록을 해당 지점으로 좁혀서 보여준다
  const handleSelectLocation = (locName: string) => {
    setGalleryLocation(prev => (prev === locName ? null : locName))
    document.getElementById('section-uploads')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }


  // 실제 최종 수집 시각 기준. 동기화 크론은 매일 00:00 UTC(09:00 KST)
  const collectedLabel = useMemo(() => {
    const latest = contents.reduce((max, c) => {
      const t = c.metrics_updated_at ? Date.parse(c.metrics_updated_at) : NaN
      return Number.isFinite(t) && t > max ? t : max
    }, 0)
    if (!latest) return '자동 수집'
    const fmt = (t: number) => {
      const d = new Date(t + 9 * 3600_000)
      return `${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`
    }
    return `${fmt(latest)} 수집 기준 · 자동 수집 · 다음 ${fmt(Date.now() + 24 * 3600_000)}`
  }, [contents])

  return (
    <>
      <div className="report-screen relative isolate font-sans min-h-screen pb-16 bg-gradient-to-b from-[#fdf6e9] via-[#fbeed6] via-[38%] via-[#f6e3bf] via-[62%] to-[#f2dcb2] text-[#1a1d2e]">
      <BunnyLayer />
      {/* ── 헤더 + 기간 내비 (스크롤해도 상단 고정) ── */}
      <div className="sticky top-0 z-50 print:static">
      <HeaderV2
        collectedLabel={collectedLabel}
        partnerBrand={partnerBrand}
        locationCount={locationCount}
        onPrintPdf={handlePrintPdf}
        onDownloadExcel={handleDownloadExcel}
        onLogout={logout}
      />

      {/* ── 기간 내비: 화살표 월간 전환 + 전체/월별 토글 (필탭 제거) ── */}
      <div className="relative bg-[#fdf6e9] border-b border-[#e7e4dc]">
        <PeriodNavV2
          mode={periodMode}
          onModeChange={setPeriodMode}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          weekIndex={weekIndex}
          onWeekChange={setWeekIndex}
        />
        <div className="absolute right-4 sm:right-7 top-1/2 -translate-y-1/2">
          <SectionNav />
        </div>
      </div>
      </div>


      {/* ── 본문 영역 (max-width: 1880px) ── */}
      <GlobalPeriodContext.Provider value={{ mode: sectionMode, month: sectionMonth }}>
      {loading && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/95 border border-[#eee6d6] shadow-[0_6px_20px_rgba(30,41,59,0.12)] rounded-full px-4 py-2 text-[12.5px] font-bold text-[#1a1d2e]">
          <span className="w-4 h-4 rounded-full border-2 border-[#e6dfcf] border-t-[#4f7cff] animate-spin" />
          데이터를 불러오는 중이에요
        </div>
      )}
      <main
        className={`relative z-10 max-w-[1880px] mx-auto px-4 sm:px-7 mt-2 transition-opacity ${loading ? 'opacity-40 pointer-events-none animate-pulse' : ''}`}
        aria-busy={loading}
      >
        {/* 선택된 지점 필터 해제 바 */}
        {selectedLocation && (
          <div className="flex items-center gap-2 mb-3 bg-white/80 border border-[#f0e6d2] rounded-xl px-4 py-2 text-xs text-[#1a1d2e]">
            <span>현재 <b>{selectedLocation}</b> 필터가 적용되어 있습니다.</span>
            <button
              type="button"
              onClick={() => setSelectedLocation(null)}
              className="ml-auto text-xs font-bold text-[#e03131] hover:underline"
            >
              필터 해제 ✕
            </button>
          </div>
        )}

        {/* ══ §1 지점별 방문 현황 ══ */}
        <LocationVisitSection
          contents={filteredContents}
          onSelectInfluencer={handleSelectInfluencer}
          onSelectLocation={handleSelectLocation}
          partnerBrand={partnerBrand}
        >
          {/* 핵심 성과 요약 — KPI 아래 빈 공간을 채우도록 중앙 영역에 배치 */}
          <ExecutiveSummarySection contents={locationContents} showRoi={!partnerBrand} />
          <div className="mt-3.5">
            <PendingPublishCard partnerBrand={partnerBrand} />
          </div>
        </LocationVisitSection>

        {/* ══ WORK 홈: 옵티팜 · 전체 브랜드사 · 요청사항 · 약사 콘텐츠 ══ */}
        <WorkHomeSections contents={scopedContents}>
          {/* 방문 일정 인플루언서 · 협상 진행중 — 02 실행 현황 안으로 */}
          <div id="sec-visits" className="scroll-mt-32">
            <UpcomingVisitsCard partnerBrand={partnerBrand} />
          </div>
        </WorkHomeSections>

        <SectionHead id="sec-03" no="03" title="업로드 · 인플루언서 현황" />

        {/* ══ 업로드 인플루언서 | 인플루언서 현황 + 채널별 성과 ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <UploadGallerySection
            contents={filteredContents}
            location={galleryLocation}
            onLocationChange={setGalleryLocation}
            onSelectInfluencer={handleSelectInfluencer}
          />
          <div className="min-w-0">
            <PipelineCountCard contents={scopedContents} partnerBrand={partnerBrand} />
            <ChannelSummaryCard contents={filteredContents} />
          </div>
        </div>

        <SectionHead id="sec-04" no="04" title="분석" sub="상단 기간을 따라가요" />

        {/* ══ 인기 상품 분석 ══ */}
        <SectionPeriodScope contents={locationContents}>
          {list => <ProductAnalysisSection contents={list} />}
        </SectionPeriodScope>


        {/* ══ §2 실행 성과 요약 ══ */}
        <SectionPeriodScope contents={locationContents}>
          {list => <ExecutionSummarySection contents={list} />}
        </SectionPeriodScope>

        {/* ══ §3 전체 합계 ══ */}
        <SectionPeriodScope contents={locationContents}>
          {(list, period) => (
            <OverallTotalsSection contents={list} period={period} isPartner={!!partnerBrand} />
          )}
        </SectionPeriodScope>

        {/* ══ §4 추이 분석 ══ */}
        <SectionPeriodScope contents={locationContents}>
          {(list, period) => <TrendAnalysisSection contents={list} period={period} />}
        </SectionPeriodScope>

        {/* ══ §5 구성비 분석 ══ */}
        <SectionPeriodScope contents={locationContents}>
          {list => <CompositionSection contents={list} />}
        </SectionPeriodScope>

        {/* ══ §6 콘텐츠 형식 분석 ══ */}
        <SectionPeriodScope contents={locationContents}>
          {list => <FormatAnalysisSection contents={list} />}
        </SectionPeriodScope>

        {/* ══ §7 인기 콘텐츠 분석 ══ */}
        <SectionHead id="sec-05" no="05" title="인기 콘텐츠" />
        <div id="section-popular">
          <SectionPeriodScope contents={locationContents}>
            {list => (
              <PopularContentSection
                contents={list}
                selectedInfluencerName={selectedInfluencer}
                onSelectInfluencer={setSelectedInfluencer}
              />
            )}
          </SectionPeriodScope>
          {showSales && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <CostEfficiencySection />
            </div>
          )}
        </div>
      </main>
      </GlobalPeriodContext.Provider>
    </div>

    {/* ── PDF 인쇄 전용 핵심 요약 보고서 (화면에는 숨김, 인쇄 시 자동 표시) ── */}
    <ReportPrintV2
      partnerBrand={partnerBrand}
      contents={filteredContents}
      periodMode={periodMode === 'pre' ? 'pre' : periodMode}
      weekLabel={weekLabel(currentWeek)}
      currentMonth={currentMonth}
      locationCount={locationCount}
    />
  </>
  )
}

/** 섹션 제목 (01~05) */
function SectionHead({ id, no, title, sub }: { id: string; no: string; title: string; sub?: string }) {
  return (
    <div id={id} className="scroll-mt-32 flex items-baseline gap-2.5 mt-7 mb-3.5 px-1">
      <span className="text-[12px] font-extrabold text-[#3557d6]">{no}</span>
      <h2 className="m-0 text-[26px] font-extrabold tracking-tight text-[#1a1d2e]">{title}</h2>
      {sub && <span className="text-[12px] text-[#6b6558]">{sub}</span>}
    </div>
  )
}

const SECTION_NAV: [string, string][] = [
  ['sec-01', '01 지점'],
  ['sec-02', '02 실행 현황'],
  ['sec-visits', '방문 일정'],
  ['sec-03', '03 업로드'],
  ['sec-04', '04 분석'],
  ['sec-05', '05 인기 콘텐츠'],
]

/** 상단 바 섹션 바로가기 */
function SectionNav() {
  return (
    <nav className="hidden 2xl:flex gap-1 flex-wrap print:hidden">
      {SECTION_NAV.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          className="no-underline text-[12px] font-bold text-[#4a4538] bg-white border border-[#efe5d0] px-2.5 py-1.5 rounded-full hover:text-[#1a1d2e]"
        >
          {label}
        </a>
      ))}
    </nav>
  )
}
