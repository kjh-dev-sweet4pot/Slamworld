'use client'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Content } from '@/lib/types'
import { contentsForBrand } from '@/lib/brand-content'
import { useHoverPopover } from '@/lib/use-hover-popover'
import {
  budgetItemColor,
  budgetPaymentLabel,
  budgetStageLabel,
  computeBudgetSummary,
  fmtBudgetManwon,
  kpiCompanyRows,
  monthlyBudgetForChart,
  partnerCompanyDonut,
  unknownBudgetRows,
  type BudgetKpiKey,
  type BudgetStage,
  type MonthlyBudgetChartRow,
  type PartnerTooltipRow,
} from '@/lib/brand-budget'

const BAR_COLOR = {
  paid: 'linear-gradient(to top, #0B47B4, #1868F0)',
  payPending: 'linear-gradient(to top, #D97706, #FBBF24)',
  unpaid: 'linear-gradient(to top, #DC2626, #EF4444)',
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
    <div className="owm-budget-tip-row items-start">
      <span className="flex items-start gap-1.5 min-w-0 flex-1 overflow-hidden">
        <i className="w-2 h-2 rounded-[2px] shrink-0 mt-1" style={{ background: color }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-owm-text">{brand}</span>
          <span className="flex flex-wrap gap-x-1.5 text-[9px] font-semibold leading-snug" style={{ color }}>
            <span>{budgetStageLabel(stage)}</span>
            <span>{budgetPaymentLabel(payment)}</span>
          </span>
        </span>
      </span>
      <span className="num shrink-0 pl-2">{amountLabel}</span>
    </div>
  )
}

function BudgetBrandContentTooltip({
  brand,
  items,
  onViewContent,
}: {
  brand: string
  items: Content[]
  onViewContent?: (brand: string) => void
}) {
  const preview = items.slice(0, 6)
  return (
    <div className="owm-budget-tip owm-budget-tip-partner pointer-events-auto">
      <div className="owm-budget-tip-title">
        {brand} 콘텐츠
        <span className="block text-[10px] font-semibold text-slate mt-0.5">
          {items.length}건 · 좋아요순
        </span>
      </div>
      {preview.length > 0 ? preview.map(c => (
        <div key={c.id} className="owm-budget-tip-row items-center py-1">
          <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-owm-text">
            {c.influencer_name}
          </span>
          <span className="text-[9px] text-slate shrink-0 mx-1.5">{c.location.replace('점', '')}</span>
          <span className="num text-[10px] font-semibold shrink-0">
            {(c.likes ?? 0).toLocaleString()}
          </span>
        </div>
      )) : (
        <div className="text-[11px] text-owm-text3">연결된 콘텐츠 없음</div>
      )}
      {items.length > preview.length && (
        <div className="text-[9.5px] text-slate mt-1">외 {items.length - preview.length}건</div>
      )}
      {onViewContent && (
        <button
          type="button"
          onClick={() => onViewContent(brand)}
          className="mt-2 w-full text-[11px] font-bold py-1.5 rounded-md bg-azure text-white
            hover:bg-azure-deep transition-colors"
        >
          콘텐츠 보러 가기
        </button>
      )}
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
  const { active: open, show, hide, setActive: setOpen } = useHoverPopover(false)
  return (
    <div
      className={`relative h-full ${open ? 'z-30' : ''}`}
      onMouseEnter={() => show(true)}
      onMouseLeave={hide}
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
        <div className="absolute top-full left-0 z-30 flex flex-col items-start pointer-events-auto">
          <div className="owm-hover-bridge-y w-full min-w-[168px]" aria-hidden />
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

function BudgetCompositionDonut({
  pipelineTotal,
  contents,
  onViewBrandContent,
}: {
  pipelineTotal: number
  contents: Content[]
  onViewBrandContent?: (brand: string) => void
}) {
  const { active: hoverBrand, show, hide, setActive: setHoverBrand } = useHoverPopover<string | null>(null)
  const { slices, totalWeight, count } = partnerCompanyDonut()
  const arcs = donutSlices(
    totalWeight,
    slices.map(s => ({
      key: s.key,
      value: s.weight,
      color: s.color,
      label: s.label,
    })),
  ).sort((a, b) => b.value - a.value)

  const unknownRows = unknownBudgetRows()
  const brandContents = useMemo(() => {
    if (!hoverBrand || hoverBrand === '__unknown__') return []
    return contentsForBrand(contents, hoverBrand)
  }, [contents, hoverBrand])

  if (arcs.length === 0) {
    return <div className="h-40 grid place-items-center text-[13px] text-slate w-full">데이터 없음</div>
  }

  return (
    <div className="relative w-full">
      <div className="relative w-[200px] aspect-square max-h-[200px] mx-auto lg:mr-0 lg:ml-auto">
        <svg viewBox="0 0 176 176" className="w-full h-full -rotate-90 cursor-default">
          <circle cx="88" cy="88" r="68" fill="none" stroke="#E8F2FF" strokeWidth="22" />
          {arcs.map(a => {
            const active = hoverBrand === a.key
            return (
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
                className="transition-opacity"
                style={{ opacity: hoverBrand && !active ? 0.35 : 0.95 }}
              />
            )
          })}
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

      <ul className="mt-4 w-full max-w-[280px] space-y-1 lg:ml-auto mx-auto lg:mr-0">
        {arcs.map(a => {
          const active = hoverBrand === a.key
          const isUnknown = a.key === '__unknown__'
          return (
            <li
              key={a.key}
              className="relative"
              onMouseEnter={() => show(a.key)}
              onMouseLeave={hide}
            >
              <button
                type="button"
                className={`w-full flex items-center gap-2 px-1.5 py-1 rounded-md text-left transition-colors
                  ${active ? 'bg-azure/8 ring-1 ring-azure/25' : 'hover:bg-slate/5'}`}
                onClick={() => setHoverBrand(prev => (prev === a.key ? null : a.key))}
              >
                <span className="w-2.5 h-2.5 rounded-[2px] flex-none" style={{ background: a.color }} />
                <span className="text-[12.5px] font-semibold truncate">{a.label}</span>
                <span className="num text-[11px] text-slate ml-auto whitespace-nowrap">
                  {a.pct}%
                  {isUnknown ? '' : ` · ${fmtBudgetManwon(a.value)}만`}
                </span>
              </button>
              {active && !isUnknown && (
                <div className="absolute right-full top-0 z-30 hidden lg:flex items-stretch pointer-events-auto">
                  <BudgetBrandContentTooltip
                    brand={a.label}
                    items={brandContents}
                    onViewContent={onViewBrandContent}
                  />
                  <div className="owm-hover-bridge-x" aria-hidden />
                </div>
              )}
              {active && isUnknown && unknownRows.length > 0 && (
                <div className="absolute right-full top-0 z-30 hidden lg:flex items-stretch pointer-events-auto">
                  <BudgetCompositionTooltip
                    title={`계약 예정·검토 · ${unknownRows.length}개사`}
                    rows={unknownRows}
                  />
                  <div className="owm-hover-bridge-x" aria-hidden />
                </div>
              )}
              {active && !isUnknown && (
                <div className="lg:hidden mt-1">
                  <BudgetBrandContentTooltip
                    brand={a.label}
                    items={brandContents}
                    onViewContent={onViewBrandContent}
                  />
                </div>
              )}
              {active && isUnknown && unknownRows.length > 0 && (
                <div className="lg:hidden mt-1">
                  <BudgetCompositionTooltip
                    title={`계약 예정·검토 · ${unknownRows.length}개사`}
                    rows={unknownRows}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-[10px] text-slate text-center lg:text-right mt-2 max-w-[280px] lg:ml-auto mx-auto lg:mr-0">
        <span className="hidden lg:inline">회사명에 마우스를 올리면 콘텐츠·검토 회사 목록</span>
        <span className="lg:hidden">회사명을 탭하면 콘텐츠·검토 회사 목록</span>
      </p>
    </div>
  )
}

const CUMULATIVE_LINE = '#0B47B4'

function MonthTooltip({ row }: { row: MonthlyBudgetChartRow }) {
  const items = [...row.items].sort((a, b) => b.amount - a.amount)

  return (
    <div className="owm-budget-tip owm-budget-tip-partner">
      <div className="owm-budget-tip-title">
        {fmtMonthLabel(row.month)} · {fmtBudgetManwon(row.total)}만
        <span className="block text-[10px] font-semibold mt-0.5" style={{ color: CUMULATIVE_LINE }}>
          누적 {fmtBudgetManwon(row.cumulative)}만
        </span>
      </div>
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
  const { active: hovered, show, hide, setActive: setHovered } = useHoverPopover<string | null>(null)
  const activeRow = rows.find(r => r.month === hovered)
  const maxCum = Math.max(...rows.map(r => r.cumulative), 1)
  const n = rows.length
  const linePoints = rows
    .map((row, i) => {
      const x = ((i + 0.5) / n) * 100
      const y = 100 - (row.cumulative / maxCum) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="relative flex-1 min-h-[240px] w-full flex flex-col">
      <div className="relative flex-1 min-h-[200px] w-full flex flex-col">
        <div className="relative flex-1 min-h-0 pt-4">
          <div className="absolute inset-x-0 top-4 bottom-0">
          {[0.25, 0.5, 0.75, 1].map(ratio => (
            <div
              key={ratio}
              className="absolute left-0 right-0 border-t border-mist/80"
              style={{ bottom: `${ratio * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-2 sm:gap-3 px-0.5 pb-0.5 w-full z-[1]">
            {rows.map((row, i) => {
              const hasData = row.total > 0
              const barH = hasData ? Math.max((row.total / maxTotal) * 100, 8) : 0
              const pct = (v: number) => (row.total > 0 ? (v / row.total) * 100 : 0)
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
                  onMouseEnter={() => show(row.month)}
                  onMouseLeave={hide}
                  onClick={() => setHovered(prev => (prev === row.month ? null : row.month))}
                >
                  {isHover && (
                    <div
                      className={`absolute bottom-full z-20 hidden lg:flex flex-col pointer-events-auto
                        ${barTooltipClass(i, rows.length)}`}
                    >
                      <MonthTooltip row={row} />
                      <div className="owm-hover-bridge-y w-full min-w-[168px]" aria-hidden />
                    </div>
                  )}
                  <div className="flex-1 w-full flex items-end min-h-0">
                    {hasData ? (
                      <div className="relative w-full" style={{ height: `${barH}%` }}>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-0.5 num text-[9px] font-semibold text-body whitespace-nowrap pointer-events-none">
                          {fmtBudgetManwon(row.total)}만
                        </span>
                        <div
                          className={`w-full h-full rounded-t-[4px] overflow-hidden flex flex-col justify-end
                            shadow-[0_2px_8px_rgba(24,104,240,.15)] transition-opacity
                            ${isHover ? 'opacity-95' : 'opacity-100'}`}
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
                      </div>
                    ) : (
                      <div className="w-full h-[3px] rounded-t-[2px] bg-mist/90" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-[2]"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <polyline
              fill="none"
              stroke="#fff"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              opacity={0.9}
              points={linePoints}
            />
            <polyline
              fill="none"
              stroke={CUMULATIVE_LINE}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              points={linePoints}
            />
          </svg>

          {rows.map((row, i) => {
            const yPct = (row.cumulative / maxCum) * 100
            const isHover = hovered === row.month
            const prevCum = i > 0 ? rows[i - 1].cumulative : -1
            const showCumLabel = row.cumulative > 0 && row.cumulative !== prevCum
            return (
              <div
                key={`dot-${row.month}`}
                className="absolute z-[3] pointer-events-none flex flex-col items-center"
                style={{
                  left: `${((i + 0.5) / n) * 100}%`,
                  bottom: `${yPct}%`,
                  transform: 'translate(-50%, 50%)',
                }}
              >
                {showCumLabel && (
                  <span
                    className="num text-[9px] font-bold whitespace-nowrap absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+3px)]
                      px-1 rounded bg-white/85"
                    style={{ color: CUMULATIVE_LINE }}
                  >
                    {fmtBudgetManwon(row.cumulative)}만
                  </span>
                )}
                <span
                  className={`block rounded-full border-2 border-white shadow-[0_1px_3px_rgba(12,58,130,.25)]
                    ${isHover ? 'w-2.5 h-2.5' : 'w-2 h-2'}`}
                  style={{ background: CUMULATIVE_LINE }}
                />
              </div>
            )
          })}
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 px-0.5 mt-1 shrink-0">
          {rows.map(row => {
            const isHover = hovered === row.month
            return (
              <div key={row.month} className="flex-1 min-w-0 text-center">
                <span className={`num text-[9px] font-semibold
                  ${row.total > 0 || isHover ? 'text-azure-deep' : 'text-slate/60'}`}>
                  {fmtMonthLabel(row.month)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {activeRow && (
        <div className="lg:hidden mt-3 w-full [&_.owm-budget-tip]:w-full [&_.owm-budget-tip]:max-w-none">
          <MonthTooltip row={activeRow} />
        </div>
      )}
    </div>
  )
}

export default function BudgetSnapshot({
  onViewBrandContent,
}: {
  onViewBrandContent?: (brand: string) => void
}) {
  const [contents, setContents] = useState<Content[]>([])
  const s = computeBudgetSummary()
  const monthlyChart = monthlyBudgetForChart()
  const maxMonthly = Math.max(...monthlyChart.map(m => m.total), 1)

  useEffect(() => {
    fetch('/api/contents?sort=perf&limit=1000')
      .then(r => r.json())
      .then(d => setContents(d.data ?? []))
      .catch(() => setContents([]))
  }, [])

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
                막대: 월별 · 선: 누적 (만원) ·
                <span className="hidden lg:inline"> 막대에 마우스를 올려보세요</span>
                <span className="lg:hidden"> 막대를 탭해주세요</span>
              </p>
            </div>
            <MonthlyBudgetBars rows={monthlyChart} maxTotal={maxMonthly} />
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 shrink-0 text-[10px] text-slate">
              <span className="inline-flex items-center gap-1.5 font-semibold text-body">
                <i className="w-4 h-[2.5px] rounded-full" style={{ background: CUMULATIVE_LINE }} />
                누적 예산
              </span>
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
                <span className="hidden lg:inline"> 마우스를 올려보세요 · (단위 : 만원)</span>
                <span className="lg:hidden"> 탭해주세요 · (단위 : 만원)</span>
              </p>
            </div>
            <BudgetCompositionDonut
              pipelineTotal={s.pipelineTotal}
              contents={contents}
              onViewBrandContent={onViewBrandContent}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
