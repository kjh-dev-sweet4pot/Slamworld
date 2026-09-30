'use client'

import { useContext, useEffect, useMemo, useState } from 'react'
import type { Content } from '@/lib/types'
import type { PipelineRegistration } from '@/app/api/pipeline/route'
import { contentPeriodDate, isSeedingLocation } from '@/lib/posted-date'
import { contentMatchesBrand } from '@/lib/brand-content'
import { V2_MONTHS } from '@/lib/v2-analytics'
import { GlobalPeriodContext } from '@/components/v2/SectionPeriodScope'

interface PipelineCountCardProps {
  /** 회원사 범위가 적용된 전체 콘텐츠 (기간 필터는 카드가 자체 적용) */
  contents: Content[]
  partnerBrand?: string | null
}

type Period = 'recent30' | 'all' | `month:${string}`

const DAY = 24 * 3600_000
const VISIT_COLOR = '#4f7cff'
const SEEDING_COLOR = '#f59e0b'

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
}

function inPeriod(date: string | null | undefined, period: Period): boolean {
  if (period === 'all') return true
  if (!date) return false
  if (period === 'recent30') {
    const today = kstToday()
    const from = new Date(Date.parse(today) - 29 * DAY).toISOString().slice(0, 10)
    return date >= from && date <= today
  }
  return date.startsWith(period.slice(6))
}

function periodLabel(period: Period): string {
  if (period === 'all') return '전체 기간'
  if (period === 'recent30') return '최근 30일'
  const m = period.slice(6)
  return `${m.slice(0, 4)}.${m.slice(5)}`
}

/** 진행예정 등록 인플루언서 vs 발행 인플루언서 (고유 인원) */
export default function PipelineCountCard({ contents, partnerBrand }: PipelineCountCardProps) {
  const global = useContext(GlobalPeriodContext)
  const globalPeriod: Period | null = global ? (global.mode === 'all' ? 'all' : `month:${global.month}`) : null
  const [period, setPeriod] = useState<Period>(globalPeriod ?? `month:${V2_MONTHS[V2_MONTHS.length - 1]}`)
  // 상단 기간 내비가 바뀌면 따라간다 ('최근 30일'은 카드 안에서만 임시로 켤 수 있음)
  useEffect(() => {
    if (globalPeriod) setPeriod(globalPeriod)
  }, [globalPeriod])
  const [registrations, setRegistrations] = useState<PipelineRegistration[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/pipeline')
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => !cancelled && setRegistrations(d.data ?? []))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const regs = (registrations ?? []).filter(
      r => inPeriod(r.date, period) && (!partnerBrand || contentMatchesBrand(r.company, partnerBrand)),
    )
    const pubs = contents.filter(
      c => c.upload_url && c.publish_status !== '예정' && inPeriod(contentPeriodDate(c), period),
    )
    // 방문·시딩 둘 다 한 사람은 방문으로 센다 (합계가 고유 인원과 맞도록)
    const split = <T,>(rows: T[], id: (r: T) => string, seeding: (r: T) => boolean) => {
      const visit = new Set<string>()
      const seed = new Set<string>()
      for (const r of rows) (seeding(r) ? seed : visit).add(id(r))
      for (const v of visit) seed.delete(v)
      return { visit: visit.size, seeding: seed.size, total: visit.size + seed.size }
    }
    return {
      registered: split(regs, r => r.influencer_id, r => r.kind === '시딩'),
      published: split(pubs, c => c.influencer_name, c => isSeedingLocation(c.location)),
    }
  }, [registrations, contents, period, partnerBrand])

  const max = Math.max(counts.registered.total, counts.published.total, 1)
  const bars = [
    { label: '진행예정 등록', sub: '방문일 기준', ...counts.registered, loading: registrations === null && !error },
    { label: '발행', sub: '게시일 기준', ...counts.published, loading: false },
  ]

  return (
    <section className="mb-4">
      <div className="text-[18px] font-extrabold tracking-tight text-[#1a1d2e] pt-3 pb-2.5 px-1">
        인플루언서 현황{' '}
        <span className="text-[13px] font-semibold tracking-normal text-[#9a9486]">( {periodLabel(period)} · 고유 인원 )</span>
      </div>
      <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(global ? (['recent30'] as const) : (['recent30', 'all'] as const)).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(global && period === p ? globalPeriod! : p)}
              className={`text-[11.5px] rounded-[16px] px-3 py-1.5 transition-all whitespace-nowrap ${
                period === p ? 'font-bold text-white bg-[#4f7cff]' : 'font-semibold bg-[#f7f4ec] text-[#6b6558] hover:text-[#1a1d2e]'
              }`}
            >
              {periodLabel(p)}
            </button>
          ))}
          {!global && (
          <select
            value={period.startsWith('month:') ? period : ''}
            onChange={e => e.target.value && setPeriod(e.target.value as Period)}
            className={`ml-auto text-[11.5px] font-semibold border rounded-[10px] px-2.5 py-1.5 focus:outline-none ${
              period.startsWith('month:') ? 'text-[#1a1d2e] bg-white border-[#4f7cff]' : 'text-[#6b6558] bg-[#fbf9f4] border-[#f0e9da]'
            }`}
          >
            <option value="" disabled>월별</option>
            {[...V2_MONTHS].reverse().map(m => (
              <option key={m} value={`month:${m}`}>{m.replace('-', '.')}</option>
            ))}
          </select>
          )}
        </div>

        <div className="flex flex-col gap-4 mt-5">
          {bars.map(b => (
            <div key={b.label}>
              <div className="flex items-baseline gap-2">
                <span className="text-[12.5px] font-bold text-[#1a1d2e]">{b.label} 인플루언서</span>
                <span className="text-[10.5px] text-[#9a9486]">{b.sub}</span>
                <span className="ml-auto text-[26px] font-extrabold tracking-tight text-[#1a1d2e] leading-none">
                  {b.loading ? '…' : b.total.toLocaleString()}
                  <span className="text-[13px] font-bold text-[#9a9486] ml-0.5">명</span>
                </span>
              </div>
              <div className="h-3.5 rounded-full bg-[#f4efe3] overflow-hidden mt-2 flex">
                <span
                  className="block h-full transition-all duration-500"
                  style={{ width: b.loading ? '0%' : `${(b.visit / max) * 100}%`, backgroundColor: VISIT_COLOR }}
                />
                <span
                  className="block h-full transition-all duration-500"
                  style={{ width: b.loading ? '0%' : `${(b.seeding / max) * 100}%`, backgroundColor: SEEDING_COLOR }}
                />
              </div>
              <div className="flex gap-4 mt-1.5 text-[11px] text-[#6b6558]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: VISIT_COLOR }} />
                  방문 <b className="text-[#1a1d2e]">{b.loading ? '…' : b.visit}</b>명
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: SEEDING_COLOR }} />
                  시딩 <b className="text-[#1a1d2e]">{b.loading ? '…' : b.seeding}</b>명
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="text-[10.5px] text-[#9a9486] mt-3">
          ※ 날짜가 없는 등록(대부분의 시딩)은 &lsquo;전체 기간&rsquo;에만 집계됩니다. 방문·시딩이 겹치면 방문으로 셉니다.
        </div>

        {error && (
          <div className="text-[11px] text-[#e03131] mt-3">진행예정 등록 데이터를 불러오지 못했습니다.</div>
        )}
      </div>
    </section>
  )
}
