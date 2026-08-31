'use client'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  budgetItemColor,
  budgetPaymentLabel,
  budgetStageLabel,
  computeBudgetSummary,
  fmtBudgetManwon,
  monthlyBudgetForChart,
  partnerCompanyDonut,
  partnerCompanyTooltipRows,
  type BudgetStage,
  type MonthlyBudgetChartRow,
  type PartnerTooltipRow,
} from '@/lib/brand-budget'

const BAR_COLOR = {
  paid: 'linear-gradient(to top, #16A34A, #4ADE80)',
  payPending: 'linear-gradient(to top, #D97706, #FBBF24)',
  unpaid: 'linear-gradient(to top, #64748B, #94A3B8)',
  plannedReview: 'linear-gradient(to top, #EA580C, #FB923C)',
  plannedOct: 'linear-gradient(to top, #4F46E5, #818CF8)',
} as const

function fmtMonthLabel(ym: string) {
  return `${Number(ym.slice(5))}월`
}

function donutSlices(
  total: number,
  segments: { key: string; value: number; color: string; label: string }[],
) {
  if (total <= 0) return []
  const r = 68
  const c = 2 * Math.PI * r
  let offset = 0
  return segments
    .filter(s => s.value > 0)
    .map(s => {
      const ratio = s.value / total
      const dash = ratio * c
      const gap = c - dash
      const item = {
        key: s.key,
        label: s.label,
        color: s.color,
        value: s.value,
        pct: Math.round(ratio * 100),
        dasharray: `${dash} ${gap}`,
        dashoffset: -offset,
      }
      offset += dash
      return item
    })
}

const STAGE_LEGEND: { label: string; color: string }[] = [
  { label: '확정 · 입금 완료', color: budgetItemColor('확정 및 진행', '입금 완료') },
  { label: '확정 · 입금 예정', color: budgetItemColor('확정 및 진행', '입금 예정') },
  { label: '확정 · 미입금', color: budgetItemColor('확정 및 진행', '미입금') },
  { label: '계약 예정·검토', color: budgetItemColor('계약 예정', '검토 중') },
  { label: '10월 예정', color: budgetItemColor('10월 예정', '검토 중') },
]

function BudgetTipRow({
  brand,
  stage,
  payment,
  amountLabel,
}: {
  brand: string
  stage: BudgetStage | '미정'
  payment: PartnerTooltipRow['payment']
  amountLabel: string
}) {
  const color = budgetItemColor(stage, payment)
  return (
    <div className="owm-budget-tip-row">
      <span className="flex items-center gap-1.5 min-w-0">
        <i className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: color }} />
        <span className="truncate">{brand}</span>
        <span className="text-[9px] font-semibold shrink-0" style={{ color }}>
          {budgetStageLabel(stage)}
        </span>
        <span className="text-[9px] text-owm-text3 shrink-0">{budgetPaymentLabel(payment)}</span>
      </span>
      <span className="num">{amountLabel}</span>
    </div>
  )
}

function BudgetCompositionTooltip({ rows }: { rows: PartnerTooltipRow[] }) {
  return (
    <div className="owm-budget-tip owm-budget-tip-partner">
      <div className="owm-budget-tip-title">협업 회사 · 예산순</div>
      {rows.map(r => (
        <BudgetTipRow
          key={r.brand}
          brand={r.brand}
          stage={r.stage}
          payment={r.payment}
          amountLabel={r.amountLabel}
        />
      ))}
    </div>
  )
}

function BudgetCompositionDonut({ pipelineTotal }: { pipelineTotal: number }) {
  const [hovered, setHovered] = useState(false)
  const { slices, totalWeight, count } = partnerCompanyDonut()
  const tooltipRows = partnerCompanyTooltipRows()
  const arcs = donutSlices(
    totalWeight,
    slices.map(s => ({
      key: s.key,
      value: s.weight,
      color: s.color,
      label: s.label,
    })),
  ).sort((a, b) => b.value - a.value)

  if (arcs.length === 0) {
    return <div className="h-40 grid place-items-center text-[13px] text-slate w-full">데이터 없음</div>
  }

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div className="absolute bottom-full right-0 mb-2 z-30 pointer-events-none hidden lg:block">
          <BudgetCompositionTooltip rows={tooltipRows} />
        </div>
      )}
      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 pointer-events-none lg:hidden w-[min(100vw-2rem,260px)]">
          <BudgetCompositionTooltip rows={tooltipRows} />
        </div>
      )}

      <div className="relative w-[200px] aspect-square max-h-[200px] mx-auto lg:mr-0 lg:ml-auto">
        <svg viewBox="0 0 176 176" className="w-full h-full -rotate-90 cursor-default">
          <circle cx="88" cy="88" r="68" fill="none" stroke="#E8F2FF" strokeWidth="22" />
          {arcs.map(a => (
            <circle
              key={a.key}
              cx="88"
              cy="88"
              r="68"
              fill="none"
              stroke={a.color}
              strokeWidth="22"
              strokeDasharray={a.dasharray}
              strokeDashoffset={a.dashoffset}
              strokeLinecap="butt"
              className={hovered ? 'opacity-95' : undefined}
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center pointer-events-none px-4">
          <div>
            <div className="num text-[18px] font-semibold tracking-tight leading-none">
              {fmtBudgetManwon(pipelineTotal)}
            </div>
            <div className="text-[10px] text-slate mt-1">소요 예산 · {count}개사</div>
          </div>
        </div>
      </div>

      <ul className="mt-4 w-full max-w-[280px] space-y-2 lg:ml-auto mx-auto lg:mr-0">
        {arcs.map(a => (
          <li key={a.key} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-[2px] flex-none" style={{ background: a.color }} />
            <span className="text-[12.5px] font-semibold truncate">{a.label}</span>
            <span className="num text-[11px] text-slate ml-auto whitespace-nowrap">
              {a.pct}%
              {a.key === '__unknown__' ? '' : ` · ${fmtBudgetManwon(a.value)}만`}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-slate text-center lg:text-right mt-2 max-w-[280px] lg:ml-auto mx-auto lg:mr-0">
        마우스를 올리면 전체 회사 목록
      </p>
    </div>
  )
}

function MonthTooltip({ row }: { row: MonthlyBudgetChartRow }) {
  const items = [...row.items].sort((a, b) => b.amount - a.amount)

  return (
    <div className="owm-budget-tip owm-budget-tip-partner">
      <div className="owm-budget-tip-title">{fmtMonthLabel(row.month)} · {fmtBudgetManwon(row.total)}만</div>
      {items.length > 0 ? items.map(i => (
        <BudgetTipRow
          key={i.brand}
          brand={i.brand}
          stage={i.stage}
          payment={i.payment}
          amountLabel={i.amountLabel}
        />
      )) : (
        <div className="text-[11px] text-owm-text3">배정 예산 없음</div>
      )}
    </div>
  )
}

function MonthlyBudgetBars({ rows, maxTotal }: { rows: MonthlyBudgetChartRow[]; maxTotal: number }) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="relative flex-1 min-h-[240px] w-full">
      {[0.25, 0.5, 0.75, 1].map(ratio => (
        <div
          key={ratio}
          className="absolute left-0 right-0 border-t border-mist/80"
          style={{ bottom: `${ratio * 100}%` }}
        />
      ))}
      <div className="absolute inset-0 flex items-end gap-2 sm:gap-3 px-0.5 pb-0.5 w-full">
        {rows.map(row => {
          const hasData = row.total > 0
          const barH = hasData ? Math.max((row.total / maxTotal) * 100, 8) : 0
          const pct = (n: number) => (row.total > 0 ? (n / row.total) * 100 : 0)
          const paidH = pct(row.paidTotal)
          const payPendingH = pct(row.payPendingTotal)
          const unpaidH = pct(row.unpaidTotal)
          const reviewH = pct(row.plannedReviewTotal)
          const octH = pct(row.plannedOctTotal)
          const isHover = hovered === row.month

          return (
            <div
              key={row.month}
              className="relative flex-1 h-full flex flex-col items-center min-w-0"
              onMouseEnter={() => setHovered(row.month)}
              onMouseLeave={() => setHovered(null)}
            >
              {isHover && hasData && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none">
                  <MonthTooltip row={row} />
                </div>
              )}
              <span className={`num text-[9px] font-semibold mb-1 shrink-0
                ${hasData ? 'text-body' : 'text-mist'}`}>
                {hasData ? `${fmtBudgetManwon(row.total)}만` : '—'}
              </span>
              <div className="flex-1 w-full flex items-end min-h-0">
                {hasData ? (
                  <div
                    className={`w-full rounded-t-[4px] overflow-hidden flex flex-col justify-end
                      shadow-[0_2px_8px_rgba(24,104,240,.15)] transition-opacity
                      ${isHover ? 'opacity-95' : 'opacity-100'}`}
                    style={{ height: `${barH}%` }}
                  >
                    {row.plannedOctTotal > 0 && (
                      <div style={{ height: `${octH}%`, background: BAR_COLOR.plannedOct, minHeight: octH > 0 ? 2 : 0 }} />
                    )}
                    {row.plannedReviewTotal > 0 && (
                      <div style={{ height: `${reviewH}%`, background: BAR_COLOR.plannedReview, minHeight: reviewH > 0 ? 2 : 0 }} />
                    )}
                    {row.unpaidTotal > 0 && (
                      <div style={{ height: `${unpaidH}%`, background: BAR_COLOR.unpaid, minHeight: unpaidH > 0 ? 2 : 0 }} />
                    )}
                    {row.payPendingTotal > 0 && (
                      <div style={{ height: `${payPendingH}%`, background: BAR_COLOR.payPending, minHeight: payPendingH > 0 ? 2 : 0 }} />
                    )}
                    {row.paidTotal > 0 && (
                      <div style={{ height: `${paidH}%`, background: BAR_COLOR.paid, minHeight: paidH > 0 ? 2 : 0 }} />
                    )}
                  </div>
                ) : (
                  <div className="w-full h-[3px] rounded-t-[2px] bg-mist/90" />
                )}
              </div>
              <span className={`num text-[9px] font-semibold mt-1 shrink-0
                ${hasData || isHover ? 'text-azure-deep' : 'text-slate/60'}`}>
                {fmtMonthLabel(row.month)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function BudgetSnapshot() {
  const s = computeBudgetSummary()
  const monthlyChart = monthlyBudgetForChart()
  const maxMonthly = Math.max(...monthlyChart.map(m => m.total), 1)

  const kpis = [
    {
      k: '확보 예산',
      v: fmtBudgetManwon(s.securedTotal),
      unit: '만원',
      d: `입금완료 ${fmtBudgetManwon(s.securedPaid)} · 미입금·예정 ${fmtBudgetManwon(s.securedPending)}`,
    },
    {
      k: '소요 예산',
      v: fmtBudgetManwon(s.pipelineTotal),
      unit: '만원',
      d: '파이프라인 합계 (확정+예정)',
    },
    {
      k: '계약 예정·검토',
      v: fmtBudgetManwon(s.byStage['계약 예정'].total),
      unit: '만원',
      d: `${s.byStage['계약 예정'].count}개사`,
    },
    {
      k: '10월 예정',
      v: fmtBudgetManwon(s.byStage['10월 예정'].total),
      unit: '만원',
      d: `${s.byStage['10월 예정'].count}개사`,
    },
  ]

  return (
    <section id="s-budget" className="mb-3 scroll-mt-28">
      <div className="owm-kpi-grid mb-2">
        {kpis.map(({ k, v, unit, d }) => (
          <div key={k} className="owm-kpi-card" style={{ '--bc': '#4f8cff' } as CSSProperties} data-emoji="💰">
            <div className="owm-kpi-header">
              <span className="owm-kpi-dot" />
              <span className="owm-kpi-label">{k}</span>
            </div>
            <div className="owm-kpi-amount">
              {v}<small>{unit}</small>
            </div>
            <div className="owm-kpi-divider" />
            <div className="owm-kpi-sub"><span>{d}</span></div>
          </div>
        ))}
      </div>

      <div className="owm-section">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-6 lg:gap-6 items-stretch">
          {/* 좌: 월별 확보 — 세로 꽉 채움 */}
          <div className="min-w-0 w-full flex flex-col">
            <div className="mb-3 shrink-0">
              <h2 className="text-[14px] font-extrabold tracking-tight">월별 확보 예산</h2>
              <p className="text-[11px] text-slate mt-0.5">확보·계약 예정 포함 (만원) · 막대에 마우스를 올려보세요</p>
            </div>
            <MonthlyBudgetBars rows={monthlyChart} maxTotal={maxMonthly} />
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 shrink-0 text-[10px] text-slate">
              {STAGE_LEGEND.map(({ label, color }) => (
                <span key={label} className="inline-flex items-center gap-1">
                  <i className="w-2.5 h-2.5 rounded-[2px]" style={{ background: color }} /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* 우: 소요 예산 구성 (협업 회사별) */}
          <div className="min-w-0 w-full lg:w-[280px] shrink-0 flex flex-col items-center lg:items-end">
            <div className="w-full mb-3 text-center lg:text-right">
              <h2 className="text-[14px] font-extrabold tracking-tight">소요 예산 구성</h2>
              <p className="text-[11px] text-slate mt-0.5">협업 회사별 예산 비중 · 마우스를 올려보세요</p>
            </div>
            <BudgetCompositionDonut pipelineTotal={s.pipelineTotal} />
          </div>
        </div>
      </div>
    </section>
  )
}
