'use client'

import { V2_MONTHS } from '@/lib/v2-analytics'

export type PeriodMode = 'all' | 'monthly'

export const AVAILABLE_MONTHS = V2_MONTHS

export type AvailableMonth = (typeof AVAILABLE_MONTHS)[number]

interface PeriodNavV2Props {
  mode: PeriodMode
  onModeChange: (mode: PeriodMode) => void
  currentMonth: string
  onMonthChange: (month: string) => void
  /** 섹션 헤더용 소형 버전 */
  compact?: boolean
}

export default function PeriodNavV2({
  mode,
  onModeChange,
  currentMonth,
  onMonthChange,
  compact = false,
}: PeriodNavV2Props) {
  const currentIndex = AVAILABLE_MONTHS.indexOf(currentMonth as AvailableMonth)
  const safeIndex = currentIndex >= 0 ? currentIndex : AVAILABLE_MONTHS.length - 1

  const canPrev = mode === 'all' || safeIndex > 0
  const canNext = mode === 'monthly' && safeIndex < AVAILABLE_MONTHS.length - 1

  const handlePrev = () => {
    if (mode === 'all') {
      onModeChange('monthly')
      onMonthChange(AVAILABLE_MONTHS[AVAILABLE_MONTHS.length - 1])
      return
    }
    if (safeIndex > 0) {
      onMonthChange(AVAILABLE_MONTHS[safeIndex - 1])
    }
  }

  const handleNext = () => {
    if (mode === 'all') return
    if (safeIndex < AVAILABLE_MONTHS.length - 1) {
      onMonthChange(AVAILABLE_MONTHS[safeIndex + 1])
    } else {
      // 8월에서 다음으로 가면 전체(누적)로 전환
      onModeChange('all')
    }
  }

  const handleToggle = () => {
    if (mode === 'all') {
      onModeChange('monthly')
      if (!currentMonth || !AVAILABLE_MONTHS.includes(currentMonth as AvailableMonth)) {
        onMonthChange(AVAILABLE_MONTHS[AVAILABLE_MONTHS.length - 1])
      }
    } else {
      onModeChange('all')
    }
  }

  const rangeLabel = `${AVAILABLE_MONTHS[0].replace('-', '.')} – ${AVAILABLE_MONTHS[AVAILABLE_MONTHS.length - 1].replace('-', '.')}`
  const lastMonthLabel = `${Number(AVAILABLE_MONTHS[AVAILABLE_MONTHS.length - 1].slice(5))}월`

  const displayPeriodText =
    mode === 'all'
      ? `${rangeLabel} 누적`
      : `${AVAILABLE_MONTHS[safeIndex].replace('-', '.')} (${Number(AVAILABLE_MONTHS[safeIndex].slice(5))}월)`

  return (
    <div
      className={
        compact
          ? 'flex items-center gap-2.5'
          : 'flex items-center justify-center gap-4 sm:gap-6 px-4 sm:px-6 pt-5 pb-2.5'
      }
    >
      {/* ◀ 기간 텍스트 ▶ */}
      <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canPrev}
          className={`${compact ? 'w-[24px] h-[24px] text-[9px]' : 'w-[32px] h-[32px] text-[12px]'} rounded-full border grid place-items-center transition-all ${
            canPrev
              ? 'bg-white border-[#efe7d6] text-[#6b6558] hover:text-[#1a1d2e] hover:bg-[#faf7f0] shadow-xs cursor-pointer'
              : 'bg-white/60 border-[#f0e9da] text-[#c9c2b2] cursor-not-allowed'
          }`}
          title={mode === 'all' ? `${lastMonthLabel} 월간 보기로 전환` : '이전 달'}
        >
          ◀
        </button>

        <span
          className={
            compact
              ? 'text-[12px] font-extrabold tracking-normal text-[#1a1d2e] min-w-[128px] text-center select-none'
              : 'text-[17px] sm:text-[18px] font-extrabold tracking-tight text-[#1a1d2e] min-w-[200px] sm:min-w-[230px] text-center select-none'
          }
        >
          {displayPeriodText}
        </span>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext && mode === 'all'}
          className={`${compact ? 'w-[24px] h-[24px] text-[9px]' : 'w-[32px] h-[32px] text-[12px]'} rounded-full border grid place-items-center transition-all ${
            canNext || mode === 'monthly'
              ? 'bg-white border-[#efe7d6] text-[#6b6558] hover:text-[#1a1d2e] hover:bg-[#faf7f0] shadow-xs cursor-pointer'
              : 'bg-white/60 border-[#f0e9da] text-[#c9c2b2] cursor-not-allowed'
          }`}
          title={mode === 'monthly' ? (canNext ? '다음 달' : '누적으로 전환') : '다음 기간 (수집 예정)'}
        >
          ▶
        </button>
      </div>

      {/* 전체 / 월별 토글 스위치 */}
      <div
        onClick={handleToggle}
        className={`cursor-pointer select-none flex items-center font-semibold tracking-normal text-[#6b6558] bg-white/70 border border-[#f0e6d2] rounded-full shadow-xs hover:bg-white transition-all ${
          compact ? 'gap-1.5 text-[11.5px] px-2.5 py-1' : 'gap-2.5 text-[13px] px-3.5 py-1.5'
        }`}
        title="전체 / 월별 보기 전환"
      >
        <span className={mode === 'all' ? 'font-extrabold text-[#1a1d2e]' : 'text-[#8b8578]'}>
          전체
        </span>
        <span className="w-[38px] h-[20px] rounded-[12px] bg-[#e6ded0] relative inline-block transition-colors">
          <span
            className={`absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all ${
              mode === 'monthly' ? 'left-[20px]' : 'left-[2px]'
            }`}
          />
        </span>
        <span className={mode === 'monthly' ? 'font-extrabold text-[#1a1d2e]' : 'text-[#8b8578]'}>
          월별
        </span>
      </div>
    </div>
  )
}
