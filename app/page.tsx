'use client'

import { useEffect, useMemo, useState } from 'react'
import LoginGate from '@/components/LoginGate'
import { useAccess } from '@/lib/access-context'
import HeaderV2 from '@/components/v2/HeaderV2'
import PeriodNavV2, { AVAILABLE_MONTHS, type PeriodMode } from '@/components/v2/PeriodNavV2'
import LocationVisitSection from '@/components/v2/LocationVisitSection'
import ExecutionSummarySection from '@/components/v2/ExecutionSummarySection'
import OverallTotalsSection from '@/components/v2/OverallTotalsSection'
import TrendAnalysisSection from '@/components/v2/TrendAnalysisSection'
import CompositionSection from '@/components/v2/CompositionSection'
import FormatAnalysisSection from '@/components/v2/FormatAnalysisSection'
import PopularContentSection from '@/components/v2/PopularContentSection'
import ReportPrintV2 from '@/components/v2/ReportPrintV2'
import SectionPeriodScope, { GlobalPeriodContext } from '@/components/v2/SectionPeriodScope'
import ExecutiveSummarySection from '@/components/v2/ExecutiveSummarySection'
import UploadGallerySection from '@/components/v2/UploadGallerySection'
import ChannelSummaryCard from '@/components/v2/ChannelSummaryCard'
import PipelineCountCard from '@/components/v2/PipelineCountCard'
import ProductAnalysisSection from '@/components/v2/ProductAnalysisSection'
import BudgetSnapshot, { PartnerBudgetSnapshot } from '@/components/BudgetSnapshot'
import type { Content } from '@/lib/types'
import {
  downloadInfluencerXlsx,
  influencerXlsxFilename,
  printReportPdf,
  reportPdfTitle,
} from '@/lib/export-report'
import { contentMatchesBrand } from '@/lib/brand-content'
import { getFallbackContents } from '@/lib/v2-analytics'
import { contentPeriodDate } from '@/lib/posted-date'

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
  const [, setLoading] = useState(true)
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly')
  const [currentMonth, setCurrentMonth] = useState<string>(AVAILABLE_MONTHS[AVAILABLE_MONTHS.length - 1])
  const [selectedInfluencer, setSelectedInfluencer] = useState<string | null>('pada_heli')
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [galleryLocation, setGalleryLocation] = useState<string | null>(null)
  const [showBudgetCollapse, setShowBudgetCollapse] = useState(false)

  // 콘텐츠 데이터 조회 (Supabase)
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch('/api/contents?sort=perf&limit=1000')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.data && d.data.length > 0) {
          setContents(d.data)
        } else {
          setContents(getFallbackContents())
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setContents(getFallbackContents())
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // 회원사 전용 필터 적용
  const scopedContents = useMemo(() => {
    if (!partnerBrand) return contents
    return contents.filter(c => contentMatchesBrand(c.brands, partnerBrand))
  }, [contents, partnerBrand])

  // 지점 필터 (전 섹션 공통)
  const locationContents = useMemo(() => {
    if (!selectedLocation) return scopedContents
    return scopedContents.filter(c => c.location === selectedLocation)
  }, [scopedContents, selectedLocation])

  // 상단 기간 내비(전체/월별) — §1 지점별 방문 현황 영역에만 적용. 나머지 섹션은 각자 기간 선택기 사용
  const filteredContents = useMemo(() => {
    if (periodMode !== 'monthly') return locationContents
    return locationContents.filter(c => contentPeriodDate(c)?.startsWith(currentMonth))
  }, [locationContents, periodMode, currentMonth])

  // 고유 지점 수 (회원사 기준)
  const locationCount = useMemo(() => {
    return new Set(scopedContents.map(c => c.location).filter(Boolean)).size
  }, [scopedContents])

  const handlePrintPdf = () => {
    printReportPdf(reportPdfTitle(partnerBrand))
  }

  const handleDownloadExcel = () => {
    downloadInfluencerXlsx(filteredContents, influencerXlsxFilename(partnerBrand))
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
      <div className="report-screen font-sans min-h-screen pb-16 bg-gradient-to-b from-[#fdf6e9] via-[#fbeed6] via-[38%] via-[#f6e3bf] via-[62%] to-[#f2dcb2] text-[#1a1d2e]">
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
      <div className="bg-[#fdf6e9]/90 backdrop-blur border-b border-[#f0e6d2]">
        <PeriodNavV2
          mode={periodMode}
          onModeChange={setPeriodMode}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
        />
      </div>
      </div>

      {/* B2B 회원사 또는 세일즈 권한 시 예산 정보 (토글 가능) */}
      {(showSales || partnerBrand) && (
        <div className="max-w-[1880px] mx-auto px-4 sm:px-7 mt-3">
          <div className="flex items-center justify-between bg-white/70 border border-[#f0e6d2] rounded-xl px-4 py-2.5">
            <span className="text-xs font-bold text-[#6b6558]">
              💼 {partnerBrand ? `${partnerBrand} 예산 및 집행 현황` : 'B2B 브랜드 예산 현황'}
            </span>
            <button
              type="button"
              onClick={() => setShowBudgetCollapse(!showBudgetCollapse)}
              className="text-xs font-semibold text-[#2f5fd8] hover:underline"
            >
              {showBudgetCollapse ? '접기 ▲' : '열기 ▼'}
            </button>
          </div>
          {showBudgetCollapse && (
            <div className="mt-3">
              {partnerBrand ? (
                <PartnerBudgetSnapshot brand={partnerBrand} />
              ) : (
                <BudgetSnapshot />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 본문 영역 (max-width: 1880px) ── */}
      <GlobalPeriodContext.Provider value={{ mode: periodMode, month: currentMonth }}>
      <main className="max-w-[1880px] mx-auto px-4 sm:px-7 mt-2">
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
        </LocationVisitSection>

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
        </div>
      </main>
      </GlobalPeriodContext.Provider>
    </div>

    {/* ── PDF 인쇄 전용 핵심 요약 보고서 (화면에는 숨김, 인쇄 시 자동 표시) ── */}
    <ReportPrintV2
      partnerBrand={partnerBrand}
      contents={filteredContents}
      periodMode={periodMode}
      currentMonth={currentMonth}
      locationCount={locationCount}
    />
  </>
  )
}
