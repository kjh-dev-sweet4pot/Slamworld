'use client'

import { useEffect, useMemo, useState } from 'react'
import LoginGate from '@/components/LoginGate'
import { useAccess } from '@/lib/access-context'
import HeaderV2 from '@/components/v2/HeaderV2'
import PeriodNavV2, { type PeriodMode } from '@/components/v2/PeriodNavV2'
import LocationVisitSection from '@/components/v2/LocationVisitSection'
import ExecutionSummarySection from '@/components/v2/ExecutionSummarySection'
import OverallTotalsSection from '@/components/v2/OverallTotalsSection'
import TrendAnalysisSection from '@/components/v2/TrendAnalysisSection'
import CompositionSection from '@/components/v2/CompositionSection'
import FormatAnalysisSection from '@/components/v2/FormatAnalysisSection'
import PopularContentSection from '@/components/v2/PopularContentSection'
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
  const [periodMode, setPeriodMode] = useState<PeriodMode>('all')
  const [currentMonth, setCurrentMonth] = useState<string>('2026-08')
  const [selectedInfluencer, setSelectedInfluencer] = useState<string | null>('pada_heli')
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
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

  // 전체(누적) vs 월별 필터 적용
  const filteredContents = useMemo(() => {
    let list = scopedContents

    if (periodMode === 'monthly') {
      list = list.filter(c => c.visit_date?.startsWith(currentMonth))
    }

    if (selectedLocation) {
      list = list.filter(c => c.location === selectedLocation)
    }

    return list
  }, [scopedContents, periodMode, currentMonth, selectedLocation])

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

  const handleSelectLocation = (locName: string) => {
    if (selectedLocation === locName) {
      setSelectedLocation(null)
    } else {
      setSelectedLocation(locName)
    }
  }

  return (
    <div className="font-sans min-h-screen pb-16 bg-gradient-to-b from-[#fdf6e9] via-[#fbeed6] via-[38%] via-[#f6e3bf] via-[62%] to-[#f2dcb2] text-[#1a1d2e]">
      {/* ── 헤더 ── */}
      <HeaderV2
        collectedLabel="08.31 수집 기준 · 자동 수집 · 다음 09.30"
        partnerBrand={partnerBrand}
        locationCount={locationCount}
        onPrintPdf={handlePrintPdf}
        onDownloadExcel={handleDownloadExcel}
        onLogout={logout}
      />

      {/* ── 기간 내비: 화살표 월간 전환 + 전체/월별 토글 (필탭 제거) ── */}
      <PeriodNavV2
        mode={periodMode}
        onModeChange={setPeriodMode}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
      />

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
        />

        {/* ══ §2 실행 성과 요약 ══ */}
        <ExecutionSummarySection contents={filteredContents} />

        {/* ══ §3 전체 합계 ══ */}
        <OverallTotalsSection contents={filteredContents} />

        {/* ══ §4 추이 분석 ══ */}
        <TrendAnalysisSection contents={filteredContents} />

        {/* ══ §5 구성비 분석 ══ */}
        <CompositionSection contents={filteredContents} />

        {/* ══ §6 콘텐츠 형식 분석 ══ */}
        <FormatAnalysisSection contents={filteredContents} />

        {/* ══ §7 인기 콘텐츠 분석 ══ */}
        <div id="section-popular">
          <PopularContentSection
            contents={filteredContents}
            selectedInfluencerName={selectedInfluencer}
            onSelectInfluencer={setSelectedInfluencer}
          />
        </div>
      </main>
    </div>
  )
}
