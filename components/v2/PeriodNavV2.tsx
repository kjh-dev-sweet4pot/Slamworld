'use client'

import { V2_MONTHS } from '@/lib/v2-analytics'
import { weekLabel, weeksSince, type WeekInfo } from '@/lib/week'

export type PeriodMode = 'all' | 'monthly'
/** 상단 내비 전용. 주간은 상단 내비에서만 쓴다 */
/** pre = 2026.07 이전 데이터 묶음 */
export type NavMode = PeriodMode | 'weekly' | 'pre'

export const AVAILABLE_WEEKS: WeekInfo[] = weeksSince(V2_MONTHS[0])

export const AVAILABLE_MONTHS = V2_MONTHS

export type AvailableMonth = (typeof AVAILABLE_MONTHS)[number]

interface PeriodNavV2Props {
  mode: NavMode
  onModeChange: (mode: NavMode) => void
  /** 주간 모드에서 AVAILABLE_WEEKS 인덱스 */
  weekIndex?: number
  onWeekChange?: (index: number) => void
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
  weekIndex = AVAILABLE_WEEKS.length - 1,
  onWeekChange,
}: PeriodNavV2Props) {
  if (mode === 'weekly') {
    return (
      <WeeklyNav
        compact={compact}
        weekIndex={weekIndex}
        onWeekChange={i => onWeekChange?.(i)}
        onModeChange={onModeChange}
      />
    )
  }
  if (mode === 'pre') {
    return (
      <PreNav
        compact={compact}
        onNext={() => {
          onModeChange('monthly')
          onMonthChange(AVAILABLE_MONTHS[0])
        }}
        onModeChange={onModeChange}
      />
    )
  }
  const currentIndex = AVAILABLE_MONTHS.indexOf(currentMonth as AvailableMonth)
  const safeIndex = currentIndex >= 0 ? currentIndex : AVAILABLE_MONTHS.length - 1

  const canPrev = mode === 'all' || mode === 'monthly'
  const canNext = mode === 'monthly' && safeIndex < AVAILABLE_MONTHS.length - 1

  const handlePrev = () => {
    if (mode === 'all') {
      onModeChange('monthly')
      onMonthChange(AVAILABLE_MONTHS[AVAILABLE_MONTHS.length - 1])
      return
    }
    if (safeIndex > 0) onMonthChange(AVAILABLE_MONTHS[safeIndex - 1])
    else onModeChange('pre')
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
          : 'flex flex-wrap items-center gap-3 px-4 sm:px-10 py-2.5'
      }
    >
      {/* ◀ 기간 텍스트 ▶ */}
      <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canPrev}
          className={`${compact ? 'w-[24px] h-[24px] text-[9px]' : 'w-[34px] h-[34px] text-[13px]'} rounded-[6px] border grid place-items-center transition-all ${
            canPrev
              ? 'bg-white border-[#e3d9c4] text-[#1a1d2e] hover:bg-[#faf7f0] cursor-pointer'
              : 'bg-white border-[#e3d9c4] text-[#a39c8c] cursor-not-allowed'
          }`}
          title={mode === 'all' ? `${lastMonthLabel} 월간 보기로 전환` : safeIndex > 0 ? '이전 달' : '7월 이전 데이터'}
        >
          ◀
        </button>

        <span
          className={
            compact
              ? 'text-[12px] font-extrabold tracking-normal text-[#1a1d2e] min-w-[128px] text-center select-none'
              : 'text-[15px] font-extrabold text-[#1a1d2e] min-w-[200px] text-center select-none'
          }
        >
          {displayPeriodText}
        </span>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext && mode === 'all'}
          className={`${compact ? 'w-[24px] h-[24px] text-[9px]' : 'w-[34px] h-[34px] text-[13px]'} rounded-[6px] border grid place-items-center transition-all ${
            canNext || mode === 'monthly'
              ? 'bg-white border-[#e3d9c4] text-[#1a1d2e] hover:bg-[#faf7f0] cursor-pointer'
              : 'bg-white border-[#e3d9c4] text-[#a39c8c] cursor-not-allowed'
          }`}
          title={mode === 'monthly' ? (canNext ? '다음 달' : '누적으로 전환') : '다음 기간 (수집 예정)'}
        >
          ▶
        </button>
      </div>

      <ModeSwitch mode={mode} onModeChange={onModeChange} compact={compact} />
    </div>
  )
}

function ModeSwitch({ mode, onModeChange, compact }: { mode: NavMode; onModeChange: (m: NavMode) => void; compact: boolean }) {
  const items: [NavMode, string][] = [['all', '전체'], ['monthly', '월별'], ['weekly', '주간']]
  return (
    <div
      className={`select-none flex items-center bg-[#efe8d8] rounded-full p-[3px] sm:ml-2 ${
        compact ? 'text-[11.5px]' : 'text-[13px]'
      }`}
      role="tablist"
      title="전체 / 월별 / 주간 보기 전환"
    >
      {items.map(([m, label]) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          onClick={() => onModeChange(m)}
          className={`rounded-full transition-all ${compact ? 'px-2.5 py-0.5' : 'px-3.5 py-1'} ${
            mode === m ? 'bg-white text-[#1a1d2e] font-bold shadow-xs' : 'text-[#6b6558] font-medium hover:text-[#1a1d2e]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function PreNav({
  compact,
  onNext,
  onModeChange,
}: {
  compact: boolean
  onNext: () => void
  onModeChange: (m: NavMode) => void
}) {
  const size = compact ? 'w-[24px] h-[24px] text-[9px]' : 'w-[34px] h-[34px] text-[13px]'
  return (
    <div className={compact ? 'flex items-center gap-2.5' : 'flex flex-wrap items-center gap-3 px-4 sm:px-10 py-2.5'}>
      <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
        <button type="button" disabled className={`${size} rounded-[6px] border grid place-items-center bg-white border-[#e3d9c4] text-[#a39c8c] cursor-not-allowed`}>
          ◀
        </button>
        <span
          className={
            compact
              ? 'text-[12px] font-extrabold text-[#1a1d2e] min-w-[128px] text-center select-none'
              : 'text-[15px] font-extrabold text-[#1a1d2e] min-w-[200px] text-center select-none'
          }
        >
          7월 이전 데이터
        </span>
        <button
          type="button"
          onClick={onNext}
          title="2026.07 로"
          className={`${size} rounded-[6px] border grid place-items-center bg-white border-[#e3d9c4] text-[#1a1d2e] hover:bg-[#faf7f0] cursor-pointer`}
        >
          ▶
        </button>
      </div>
      <ModeSwitch mode="monthly" onModeChange={onModeChange} compact={compact} />
    </div>
  )
}

function WeeklyNav({
  compact,
  weekIndex,
  onWeekChange,
  onModeChange,
}: {
  compact: boolean
  weekIndex: number
  onWeekChange: (i: number) => void
  onModeChange: (m: NavMode) => void
}) {
  const last = AVAILABLE_WEEKS.length - 1
  const i = Math.min(Math.max(weekIndex, 0), last)
  const w = AVAILABLE_WEEKS[i]
  const btn = (enabled: boolean) =>
    `${compact ? 'w-[24px] h-[24px] text-[9px]' : 'w-[34px] h-[34px] text-[13px]'} rounded-[6px] border grid place-items-center transition-all ${
      enabled
        ? 'bg-white border-[#e3d9c4] text-[#1a1d2e] hover:bg-[#faf7f0] cursor-pointer'
        : 'bg-white border-[#e3d9c4] text-[#a39c8c] cursor-not-allowed'
    }`
  return (
    <div className={compact ? 'flex items-center gap-2.5' : 'flex flex-wrap items-center gap-3 px-4 sm:px-10 py-2.5'}>
      <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
        <button type="button" onClick={() => onWeekChange(i - 1)} disabled={i <= 0} className={btn(i > 0)} title="이전 주">
          ◀
        </button>
        <span
          className={`text-center select-none text-[#1a1d2e] ${
            compact ? 'text-[12px] font-extrabold min-w-[150px]' : 'flex flex-col leading-tight min-w-[200px] sm:min-w-[230px]'
          }`}
        >
          {compact ? (
            weekLabel(w)
          ) : (
            <>
              <span className="text-[17px] sm:text-[18px] font-extrabold tracking-tight">{weekLabel(w)}</span>
              <span className="text-[11.5px] font-semibold text-[#6b6558]">
                {w.start.slice(5).replace('-', '.')} – {w.end.slice(5).replace('-', '.')}
              </span>
            </>
          )}
        </span>
        <button type="button" onClick={() => onWeekChange(i + 1)} disabled={i >= last} className={btn(i < last)} title="다음 주">
          ▶
        </button>
      </div>
      <ModeSwitch mode="weekly" onModeChange={onModeChange} compact={compact} />
    </div>
  )
}
