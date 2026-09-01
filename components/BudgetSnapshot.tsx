'use client'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  budgetItemColor,
  budgetPaymentLabel,
  budgetStageLabel,
  computeBudgetSummary,
  fmtBudgetManwon,
  kpiCompanyRows,
  monthlyBudgetForChart,
  partnerCompanyDonut,
  partnerCompanyTooltipRows,
  type BudgetKpiKey,
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
  { label: '차후 예산', color: budgetItemColor('10월 예정', '검토 중') },
]

const KPI_PART_COLOR = {
  secured: '#1868F0',
  planned: '#EA580C',
  oct: '#6366F1',
  total: '#0B47B4',
} as const

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

function BudgetCompositionTooltip({
  title = '협업 회사 · 예산순',
  rows,
}: {
  title?: string
  rows: PartnerTooltipRow[]
}) {
  return (
    <div className="owm-budget-tip owm-budget-tip-partner">
      <div className="owm-budget-tip-title">{title}</div>
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

function BudgetKpiCard({
  k,
  v,
  unit,
  d,
  rows,
  color = KPI_PART_COLOR.total,
  emoji = '💰',
}: {
  k: string
  v: string
  unit: string
  d: string
  rows: PartnerTooltipRow[]
  color?: string
  emoji?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={`relative h-full ${open ? 'z-30' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className="owm-kpi-card cursor-default h-full"
        style={{ '--bc': color } as CSSProperties}
        data-emoji={emoji}
        onClick={() => setOpen(prev => !prev)}
      >
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
      {open && rows.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-30 pointer-events-none">
          <BudgetCompositionTooltip title={`${k} · ${rows.length}개사`} rows={rows} />
        </div>
      )}
    </div>
  )
}

function BudgetCompositionBar({
  parts,
}: {
  parts: { key: string; value: number; color: string; label: string }[]
}) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  if (total <= 0) return null
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-[#E8F2FF]" title="예산 총액 구성">
      {parts.filter(p => p.value > 0).map(p => (
        <div
          key={p.key}
          className="h-full min-w-[3px] transition-[width]"
          style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
          title={`${p.label} ${fmtBudgetManwon(p.value)}만`}
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
            <div className="text-[10px] text-slate mt-1">예산 총액 · {count}개사</div>
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
        <span className="hidden lg:inline">마우스를 올리면 전체 회사 목록</span>
        <span className="lg:hidden">탭해주세요</span>
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

function barTooltipClass(index: number, total: number) {
  if (index === 0) return 'left-0'
  if (index === total - 1) return 'right-0'
  return 'left-1/2 -translate-x-1/2'
}

function MonthlyBudgetBars({ rows, maxTotal }: { rows: MonthlyBudgetChartRow[]; maxTotal: number }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const activeRow = rows.find(r => r.month === hovered)

  return (
    <div className="relative flex-1 min-h-[240px] w-full flex flex-col">
      <div className="relative flex-1 min-h-[200px] w-full">
      {[0.25, 0.5, 0.75, 1].map(ratio => (
        <div
          key={ratio}
          className="absolute left-0 right-0 border-t border-mist/80"
          style={{ bottom: `${ratio * 100}%` }}
        />
      ))}
      <div className="absolute inset-0 flex items-end gap-2 sm:gap-3 px-0.5 pb-0.5 w-full">
        {rows.map((row, i) => {
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
              onClick={() => setHovered(prev => (prev === row.month ? null : row.month))}
            >
              {isHover && hasData && (
                <div
                  className={`absolute bottom-full mb-2 z-20 pointer-events-none hidden lg:block
                    ${barTooltipClass(i, rows.length)}`}
                >
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

      {activeRow && activeRow.total > 0 && (
        <div className="lg:hidden mt-3 w-full [&_.owm-budget-tip]:w-full [&_.owm-budget-tip]:max-w-none">
          <MonthTooltip row={activeRow} />
        </div>
      )}
    </div>
  )
}

export default function BudgetSnapshot() {
  const s = computeBudgetSummary()
  const monthlyChart = monthlyBudgetForChart()
  const maxMonthly = Math.max(...monthlyChart.map(m => m.total), 1)

  const partKpis: {
    key: Exclude<BudgetKpiKey, 'pipeline'>
    k: string
    v: string
    d: string
    color: string
    amount: number
  }[] = [
    {
      key: 'secured',
      k: '확보 예산',
      v: fmtBudgetManwon(s.securedTotal),
      d: `입금완료 ${fmtBudgetManwon(s.securedPaid)} · 미입금·예정 ${fmtBudgetManwon(s.securedPending)}`,
      color: KPI_PART_COLOR.secured,
      amount: s.securedTotal,
    },
    {
      key: 'planned',
      k: '계약 예정·검토',
      v: fmtBudgetManwon(s.byStage['계약 예정'].total),
      d: `${s.byStage['계약 예정'].count}개사`,
      color: KPI_PART_COLOR.planned,
      amount: s.byStage['계약 예정'].total,
    },
    {
      key: 'oct',
      k: '차후 예산',
      v: fmtBudgetManwon(s.byStage['10월 예정'].total),
      d: `${s.byStage['10월 예정'].count}개사 · 10월~`,
      color: KPI_PART_COLOR.oct,
      amount: s.byStage['10월 예정'].total,
    },
  ]

  return (
    <section id="s-budget" className="mb-3 scroll-mt-28">
      <div className="mb-2 rounded-xl border border-[var(--owm-border)] bg-white/70 p-2.5 shadow-[var(--owm-shadow)]">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(180px,1.05fr)_auto_minmax(0,2.2fr)] gap-2 items-stretch">
          <BudgetKpiCard
            k="예산 총액"
            v={fmtBudgetManwon(s.pipelineTotal)}
            unit="만원"
            d="확보 + 계약 예정·검토 + 차후"
            rows={kpiCompanyRows('pipeline')}
            color={KPI_PART_COLOR.total}
          />
          <div
            className="hidden lg:flex items-center justify-center px-0.5 text-[20px] font-bold text-slate/35 select-none"
            aria-hidden
          >
            =
          </div>
          <div className="min-w-0 flex flex-col gap-2">
            <BudgetCompositionBar
              parts={partKpis.map(p => ({
                key: p.key,
                value: p.amount,
                color: p.color,
                label: p.k,
              }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
              {partKpis.map((p, i) => (
                <div key={p.key} className="relative flex min-w-0">
                  {i > 0 && (
                    <span
                      className="hidden sm:flex absolute -left-1.5 top-1/2 -translate-y-1/2 z-10
                        w-3 h-3 items-center justify-center text-[11px] font-bold text-slate/40 bg-[#f4f7fb] rounded-full"
                      aria-hidden
                    >
                      +
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <BudgetKpiCard
                      k={p.k}
                      v={p.v}
                      unit="만원"
                      d={p.d}
                      rows={kpiCompanyRows(p.key)}
                      color={p.color}
                      emoji={p.key === 'secured' ? '✅' : p.key === 'planned' ? '📝' : '📅'}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="sm:hidden text-[10px] text-slate text-center">
              예산 총액 = 확보 + 계약 예정·검토 + 차후
            </p>
          </div>
        </div>
      </div>

      <div className="owm-section">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-6 lg:gap-6 items-stretch">
          {/* 좌: 월별 확보 — 세로 꽉 채움 */}
          <div className="min-w-0 w-full flex flex-col">
            <div className="mb-3 shrink-0">
              <h2 className="text-[14px] font-extrabold tracking-tight">월별 확보 예산</h2>
              <p className="text-[11px] text-slate mt-0.5">
                확보·계약 예정 포함 (만원) ·
                <span className="hidden lg:inline"> 막대에 마우스를 올려보세요</span>
                <span className="lg:hidden"> 막대를 탭해주세요</span>
              </p>
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

          {/* 우: 예산 총액 구성 (협업 회사별) */}
          <div className="min-w-0 w-full lg:w-[280px] shrink-0 flex flex-col items-center lg:items-end">
            <div className="w-full mb-3 text-center lg:text-right">
              <h2 className="text-[14px] font-extrabold tracking-tight">예산 총액 구성</h2>
              <p className="text-[11px] text-slate mt-0.5">
                협업 회사별 예산 비중 ·
                <span className="hidden lg:inline"> 마우스를 올려보세요</span>
                <span className="lg:hidden"> 탭해주세요</span>
              </p>
            </div>
            <BudgetCompositionDonut pipelineTotal={s.pipelineTotal} />
          </div>
        </div>
      </div>
    </section>
  )
}
