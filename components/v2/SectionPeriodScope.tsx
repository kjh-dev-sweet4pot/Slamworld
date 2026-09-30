'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Content } from '@/lib/types'
import PeriodNavV2, { AVAILABLE_MONTHS, type PeriodMode } from '@/components/v2/PeriodNavV2'
import { v2TimeBuckets, type V2TimeBucket } from '@/lib/v2-analytics'
import { contentPeriodDate } from '@/lib/posted-date'

export interface SectionPeriod {
  mode: PeriodMode
  month: string
  /** 전체: 6개월 / 월별: 해당 월 주차 */
  buckets: V2TimeBucket[]
  /** 강조할 구간 (전체 모드의 당월). 없으면 -1 */
  highlightIdx: number
  /** 헤더 표기용 (예: '2026.03 ~ 2026.08' / '2026.08') */
  label: string
}

interface SectionPeriodScopeProps {
  contents: Content[]
  children: (scoped: Content[], period: SectionPeriod) => ReactNode
}

/** 상단 기간 내비 상태. 제공되면 모든 섹션이 이를 따르고 섹션별 선택기는 숨긴다 */
export const GlobalPeriodContext = createContext<{ mode: PeriodMode; month: string } | null>(null)

/**
 * 섹션별 독립 기간 선택기 — 상단 기간 내비와 별개로 각 섹션이 자체 전체/월별 상태를 갖는다.
 * 선택기는 섹션 제목 줄 오른쪽에 겹쳐 표시된다.
 */
export default function SectionPeriodScope({ contents, children }: SectionPeriodScopeProps) {
  const global = useContext(GlobalPeriodContext)
  const [localMode, setMode] = useState<PeriodMode>('monthly')
  const [localMonth, setMonth] = useState<string>(AVAILABLE_MONTHS[AVAILABLE_MONTHS.length - 1])
  const mode = global?.mode ?? localMode
  const month = global?.month ?? localMonth

  const scoped = useMemo(
    () => (mode === 'monthly' ? contents.filter(c => contentPeriodDate(c)?.startsWith(month)) : contents),
    [contents, mode, month],
  )

  const period = useMemo<SectionPeriod>(() => {
    const buckets = v2TimeBuckets(mode, month)
    return {
      mode,
      month,
      buckets,
      highlightIdx: mode === 'all' ? buckets.length - 1 : -1,
      label:
        mode === 'all'
          ? `${AVAILABLE_MONTHS[0].replace('-', '.')} ~ ${AVAILABLE_MONTHS[AVAILABLE_MONTHS.length - 1].replace('-', '.')}`
          : month.replace('-', '.'),
    }
  }, [mode, month])

  return (
    <div className="relative">
      {!global && (
      <div className="flex justify-end pt-4 -mb-3 sm:m-0 sm:p-0 sm:absolute sm:right-1 sm:top-[14px] z-10 print:hidden">
        <PeriodNavV2 compact mode={mode} onModeChange={setMode} currentMonth={month} onMonthChange={setMonth} />
      </div>
      )}
      {children(scoped, period)}
    </div>
  )
}
