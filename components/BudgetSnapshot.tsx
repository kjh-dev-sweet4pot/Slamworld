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
  budgetMid,
  budgetRowKey,
  budgetRowLabel,
  budgetsForBrand,
  computeBudgetSummary,
  currentBudgetMonth,
  fmtBudgetManwon,
  fmtBudgetRange,
  isLatePayment,
  LATE_UPLOAD_NOTE,
  availableBudgetRows,
  kpiCompanyRows,
  sepAvailableRows,
  unreceivedBudgetRows,
  DISCUSSING_STAGE,
  ENTRY_DISCUSSING_STAGE,
  monthlyDepositChart,
  monthlyUnpaidChart,
  partnerCompanyDonut,
  unknownBudgetRows,
  type BudgetMonthItem,
  type BrandBudget,
  type BudgetStage,
  type PartnerTooltipRow,
} from '@/lib/brand-budget'

const CHART_COLOR = {
  available: '#1868F0',
  used: '#94A3B8',
  unpaid: '#EF4444',
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
            <span>{isLatePayment(payment) ? LATE_UPLOAD_NOTE : budgetPaymentLabel(payment)}</span>
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
    <div className="flex h-2 rounded-full overflow-hidden bg-[#E8F2FF]" title="가용예산 · 미수령">
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

function useDbBudgets() {
  const [rows, setRows] = useState<BrandBudget[] | null>(null)
  const [discussing, setDiscussing] = useState<{ brand: string; amount: number }[]>([])
  const [entryDiscussing, setEntryDiscussing] = useState<{ brand: string; amount: number }[]>([])
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    fetch('/api/budgets')
      .then(r => r.json())
      .then(d => {
        setMissing(!!d.missing)
        setRows(d.rows ?? [])
        setDiscussing(d.discussing ?? [])
        setEntryDiscussing(d.entryDiscussing ?? [])
      })
      .catch(() => setRows([]))
  }, [])
  return { rows, discussing, entryDiscussing, missing }
}

function BudgetCompositionDonut({
  contents,
  budgets,
  onViewBrandContent,
}: {
  contents: Content[]
  budgets: BrandBudget[]
  onViewBrandContent?: (brand: string) => void
}) {
  const { active: hoverBrand, show, hide, setActive: setHoverBrand } = useHoverPopover<string | null>(null)
  const received = partnerCompanyDonut(budgets).slices.filter(s => s.payment === '입금 완료' && !s.spent)
  const slices = received
  const totalWeight = received.reduce((sum, s) => sum + s.weight, 0)
  const count = new Set(received.map(s => s.label.split(' · ')[0])).size
  const paymentByKey = new Map(slices.map(s => [s.key, s.payment]))
  const arcs = donutSlices(
    totalWeight,
    slices.map(s => ({
      key: s.key,
      value: s.weight,
      color: s.color,
      label: s.label,
    })),
  ).sort((a, b) => b.value - a.value)

  const unknownRows = unknownBudgetRows(budgets)
  const brandContents = useMemo(() => {
    if (!hoverBrand || hoverBrand === '__unknown__') return []
    const brand = hoverBrand.includes('::') ? hoverBrand.split('::')[0]! : hoverBrand
    return contentsForBrand(contents, brand)
  }, [contents, hoverBrand])

  if (arcs.length === 0) {
    return <div className="h-40 grid place-items-center text-[13px] text-slate w-full">데이터 없음</div>
  }

  return (
    <div className="relative w-full">
      <div className="relative w-[148px] aspect-square mx-auto">
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
              {fmtBudgetManwon(totalWeight)}
            </div>
            <div className="text-[10px] text-slate mt-1">가용 · {count}개사</div>
          </div>
        </div>
      </div>

      <ul className="mt-3 w-full space-y-0.5">
        {arcs.map(a => {
          const active = hoverBrand === a.key
          const isUnknown = a.key === '__unknown__'
          const late = isLatePayment(paymentByKey.get(a.key))
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
                  ${late
                    ? 'border border-[#EF4444] bg-[#FEF2F2]'
                    : active ? 'bg-azure/8 ring-1 ring-azure/25' : 'hover:bg-slate/5'}`}
                onClick={() => setHoverBrand(prev => (prev === a.key ? null : a.key))}
              >
                <span className="w-2.5 h-2.5 rounded-[2px] flex-none" style={{ background: a.color }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold truncate">{a.label}</span>
                  {late && (
                    <span className="mt-0.5 inline-block rounded border border-[#EF4444] bg-white px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-[#B91C1C]">
                      {LATE_UPLOAD_NOTE}
                    </span>
                  )}
                </span>
                <span className="num text-[11px] text-slate ml-auto whitespace-nowrap">
                  {a.pct}%
                  {isUnknown ? '' : ` · ${fmtBudgetManwon(a.value)}만`}
                </span>
              </button>
              {active && !isUnknown && (
                <div className="absolute right-full top-0 z-30 hidden lg:flex items-stretch pointer-events-auto">
                  <BudgetBrandContentTooltip
                    brand={a.key.includes('::') ? a.key.split('::')[0]! : a.label}
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
                    brand={a.key.includes('::') ? a.key.split('::')[0]! : a.label}
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
    </div>
  )
}

function MonthTooltip({
  month,
  total,
  items,
  caption,
}: {
  month: string
  total: number
  items: BudgetMonthItem[]
  caption?: string
}) {
  const sorted = [...items].sort((a, b) => b.amount - a.amount)
  return (
    <div className="owm-budget-tip owm-budget-tip-partner">
      <div className="owm-budget-tip-title">
        {fmtMonthLabel(month)} · {fmtBudgetManwon(total)}만
        {caption && (
          <span className="block text-[10px] font-semibold text-slate mt-0.5">{caption}</span>
        )}
      </div>
      {sorted.length > 0 ? sorted.map(i => (
        <BudgetTipRow
          key={i.brand}
          brand={i.brand}
          stage={i.stage}
          payment={i.payment}
          amountLabel={i.amountLabel}
        />
      )) : (
        <div className="text-[11px] text-owm-text3">해당 월 없음</div>
      )}
    </div>
  )
}

function barTooltipClass(index: number, total: number) {
  if (index === 0) return 'left-0'
  if (index === total - 1) return 'right-0'
  return 'left-1/2 -translate-x-1/2'
}

type MonthBar = {
  month: string
  total: number
  items: BudgetMonthItem[]
  caption?: string
  segments: { key: string; value: number; color: string }[]
}

function MonthBars({ rows, maxTotal }: { rows: MonthBar[]; maxTotal: number }) {
  const { active: hovered, show, hide, setActive: setHovered } = useHoverPopover<string | null>(null)
  const activeRow = rows.find(r => r.month === hovered)

  return (
    <div className="relative w-full flex flex-col flex-1 min-h-[168px]">
      <div className="relative flex-1 min-h-[140px]">
        {[0.25, 0.5, 0.75, 1].map(ratio => (
          <div
            key={ratio}
            className="absolute left-0 right-0 border-t border-mist/80"
            style={{ bottom: `${ratio * 100}%` }}
          />
        ))}
        <div className="absolute inset-0 flex items-end gap-1 px-0.5">
          {rows.map((row, i) => {
            const hasData = row.total > 0
            const barH = hasData ? Math.max((row.total / maxTotal) * 100, 8) : 0
            const isHover = hovered === row.month
            return (
              <div
                key={row.month}
                className="relative flex-1 h-full flex items-end min-w-0"
                onMouseEnter={() => show(row.month)}
                onMouseLeave={hide}
                onClick={() => setHovered(prev => (prev === row.month ? null : row.month))}
              >
                {isHover && (
                  <div
                    className={`absolute bottom-full z-20 hidden lg:flex flex-col pointer-events-auto
                      ${barTooltipClass(i, rows.length)}`}
                  >
                    <MonthTooltip month={row.month} total={row.total} items={row.items} caption={row.caption} />
                    <div className="owm-hover-bridge-y w-full min-w-[140px]" aria-hidden />
                  </div>
                )}
                {hasData ? (
                  <div
                    className={`mx-auto w-full max-w-10 rounded-t-[3px] overflow-hidden flex flex-col justify-end transition-opacity
                      ${isHover ? 'opacity-90' : 'opacity-100'}`}
                    style={{ height: `${barH}%` }}
                  >
                    {row.segments.filter(s => s.value > 0).map(s => (
                      <div
                        key={s.key}
                        style={{
                          height: `${(s.value / row.total) * 100}%`,
                          background: s.color,
                          minHeight: 2,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mx-auto w-full max-w-10 h-[3px] rounded-t-[2px] bg-mist/90" />
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex gap-1 px-0.5 mt-1">
        {rows.map(row => (
          <div key={row.month} className="flex-1 min-w-0 text-center">
            <span className={`num block text-[9px] font-semibold leading-tight
              ${row.total > 0 || hovered === row.month ? 'text-azure-deep' : 'text-slate/60'}`}>
              {fmtMonthLabel(row.month)}
            </span>
            <span className={`num block text-[9px] font-semibold leading-tight
              ${row.total > 0 ? 'text-body' : 'text-slate/40'}`}>
              {row.total > 0 ? fmtBudgetManwon(row.total) : '0'}
            </span>
          </div>
        ))}
      </div>
      {activeRow && (
        <div className="lg:hidden mt-2 w-full [&_.owm-budget-tip]:w-full [&_.owm-budget-tip]:max-w-none">
          <MonthTooltip
            month={activeRow.month}
            total={activeRow.total}
            items={activeRow.items}
            caption={activeRow.caption}
          />
        </div>
      )}
    </div>
  )
}

function EntryDiscussingList({ rows }: { rows: { brand: string; amount: number }[] }) {
  if (rows.length === 0) return null
  const total = rows.reduce((n, r) => n + r.amount, 0)
  return (
    <div className="mt-3 pt-3 border-t border-[var(--owm-border)] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="shrink-0 sm:w-[148px]">
        <h3 className="text-[13px] font-extrabold tracking-tight text-[#1D4ED8] whitespace-nowrap">{ENTRY_DISCUSSING_STAGE}</h3>
        {total > 0 && (
          <p className="num text-[13px] font-semibold text-[#1D4ED8] mt-0.5">{fmtBudgetManwon(total)}만</p>
        )}
      </div>
      <ul className="flex flex-1 flex-wrap gap-1.5 min-w-0">
        {rows.map(r => (
          <li
            key={r.brand}
            className="flex items-center gap-2 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1.5 text-[12px]"
          >
            <span className="font-semibold truncate">{r.brand}</span>
            <span className={`shrink-0 font-semibold ${r.amount > 0 ? 'num text-[#1D4ED8]' : 'text-[11px] text-slate'}`}>
              {r.amount > 0 ? `${fmtBudgetManwon(r.amount)}만` : '입점 논의중'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DiscussingList({ rows }: { rows: { brand: string; amount: number }[] }) {
  if (rows.length === 0) return null
  const total = rows.reduce((n, r) => n + r.amount, 0)
  return (
    <div className="mt-3 pt-3 border-t border-[var(--owm-border)] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="shrink-0 sm:w-[168px]">
        <h3 className="text-[13px] font-extrabold tracking-tight text-[#166534] whitespace-nowrap">{DISCUSSING_STAGE}</h3>
        {total > 0 && (
          <p className="num text-[13px] font-semibold text-[#15803D] mt-0.5">{fmtBudgetManwon(total)}만</p>
        )}
      </div>
      <ul className="flex flex-1 flex-wrap gap-1.5 min-w-0">
        {rows.map(r => (
          <li
            key={r.brand}
            className="flex items-center gap-2 rounded-md border border-[#86EFAC] bg-[#F0FDF4] px-2.5 py-1.5 text-[12px]"
          >
            <span className="font-semibold truncate">{r.brand}</span>
            <span className={`shrink-0 font-semibold ${r.amount > 0 ? 'num text-[#15803D]' : 'text-[11px] text-slate'}`}>
              {r.amount > 0 ? `${fmtBudgetManwon(r.amount)}만` : '예산 협의중'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function UnreceivedList({ rows }: { rows: PartnerTooltipRow[] }) {
  const total = rows.reduce((n, r) => n + r.amount, 0)
  const late = rows.some(r => isLatePayment(r.payment))
  return (
    <div className="mt-3 pt-3 border-t border-[var(--owm-border)] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="shrink-0 sm:w-[148px]">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[13px] font-extrabold tracking-tight">미수령</h3>
          <span className="num text-[13px] font-semibold text-[#B91C1C]">{fmtBudgetManwon(total)}만</span>
        </div>
        {late && (
          <p className="text-[10px] font-semibold text-[#B91C1C] mt-0.5">{LATE_UPLOAD_NOTE}</p>
        )}
      </div>
      <ul className="flex flex-1 flex-wrap gap-1.5 min-w-0">
        {rows.map(r => (
          <li
            key={r.brand}
            className="flex items-center gap-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-1.5 text-[12px]"
          >
            <span className="font-semibold truncate">{r.brand}</span>
            <span className={`shrink-0 font-semibold ${r.amount > 0 ? 'num text-[#B91C1C]' : 'text-[11px] text-[#B91C1C]'}`}>
              {r.amount > 0
                ? `${fmtBudgetManwon(r.amount)}만`
                : isLatePayment(r.payment)
                  ? '입금 지연'
                  : '예산 협의중'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function BudgetSnapshot({
  onViewBrandContent,
}: {
  onViewBrandContent?: (brand: string) => void
}) {
  const [contents, setContents] = useState<Content[]>([])
  const { rows: budgets, discussing, entryDiscussing, missing } = useDbBudgets()
  const month = currentBudgetMonth()
  const monthNo = Number(month.slice(5))
  const s = computeBudgetSummary(budgets ?? [], month)
  const deposit = monthlyDepositChart(budgets ?? [])
  const unpaid = monthlyUnpaidChart(budgets ?? [])
  const maxMonthly = Math.max(
    ...deposit.map(m => m.total),
    ...unpaid.map(m => m.total),
    1,
  )
  const activeMonths = new Set([
    ...deposit.filter(r => r.total > 0).map(r => r.month),
    ...unpaid.filter(r => r.total > 0).map(r => r.month),
  ])
  const depositBars: MonthBar[] = deposit.filter(r => activeMonths.has(r.month)).map(row => ({
    month: row.month,
    total: row.total,
    items: row.items,
    caption: `가용 ${row.available.toLocaleString()} · 사용 ${row.used.toLocaleString()}`,
    segments: [
      { key: 'available', value: row.available, color: CHART_COLOR.available },
      { key: 'used', value: row.used, color: CHART_COLOR.used },
    ],
  }))
  const unpaidBars: MonthBar[] = unpaid.filter(r => activeMonths.has(r.month)).map(row => ({
    month: row.month,
    total: row.total,
    items: row.items,
    segments: [{ key: 'unpaid', value: row.total, color: CHART_COLOR.unpaid }],
  }))

  useEffect(() => {
    fetch('/api/contents?sort=perf&limit=1000')
      .then(r => r.json())
      .then(d => setContents(d.data ?? []))
      .catch(() => setContents([]))
  }, [])

  const unreceivedRows = unreceivedBudgetRows(budgets ?? [])
  const cards: {
    k: string
    v: string
    d: string
    color: string
    rows: ReturnType<typeof availableBudgetRows>
    emoji: string
    hero?: boolean
  }[] = [
    {
      k: `${monthNo}월 가용예산`,
      v: fmtBudgetManwon(s.sepAvailable),
      d: `${monthNo}월에 쓸 수 있는 입금`,
      color: '#0B47B4',
      rows: sepAvailableRows(budgets ?? [], month),
      emoji: '📅',
      hero: true,
    },
    {
      k: '가용예산',
      v: fmtBudgetManwon(s.availableTotal),
      d: '입금완료 − 사용완료',
      color: KPI_PART_COLOR.secured,
      rows: availableBudgetRows(budgets ?? []),
      emoji: '✅',
    },
    {
      k: '미수령',
      v: fmtBudgetManwon(s.securedPending),
      d: `입금 지연 ${unreceivedRows.length}건`,
      color: '#EF4444',
      rows: unreceivedRows,
      emoji: '⏳',
    },
    {
      k: '계약 예정·검토',
      v: fmtBudgetManwon(s.byStage['계약 예정'].total),
      d: `${s.byStage['계약 예정'].count}개사 · 가용 제외`,
      color: KPI_PART_COLOR.planned,
      rows: kpiCompanyRows('planned', budgets ?? []),
      emoji: '📝',
    },
  ]
  const hero = cards[0]
  const rest = cards.slice(1)

  if (!budgets) return null

  return (
    <section id="s-budget" className="mb-3 scroll-mt-28">
      {missing && (
        <p className="mb-2 text-xs text-owm-text2">예산 테이블이 없습니다. supabase/add-companies.sql 실행 후 동기화가 필요합니다.</p>
      )}
      {!missing && budgets.length === 0 && (
        <p className="mb-2 text-xs text-owm-text2">동기화된 예산이 없습니다. node scripts/sync-from-boardingpass.mjs --apply</p>
      )}
      <div className="mb-2 rounded-xl border border-[var(--owm-border)] bg-white/70 p-2.5 shadow-[var(--owm-shadow)]">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(180px,1.05fr)_auto_minmax(0,2.2fr)] gap-2 items-stretch">
          <BudgetKpiCard
            k={hero.k}
            v={hero.v}
            unit="만원"
            d={hero.d}
            rows={hero.rows}
            color={hero.color}
            emoji={hero.emoji}
          />
          <div className="min-w-0 flex flex-col gap-2 lg:col-span-2">
            <BudgetCompositionBar
              parts={[
                { key: 'available', value: s.availableTotal, color: KPI_PART_COLOR.secured, label: '가용예산' },
                { key: 'unreceived', value: s.securedPending, color: '#EF4444', label: '미수령' },
              ]}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
              {rest.map(p => (
                <BudgetKpiCard
                  key={p.k}
                  k={p.k}
                  v={p.v}
                  unit="만원"
                  d={p.d}
                  rows={p.rows}
                  color={p.color}
                  emoji={p.emoji}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="owm-section">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[14px] font-extrabold tracking-tight">월별 예산</h2>
          <p className="text-[11px] text-slate">같은 눈금 · 만원</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
          <div className="min-w-0 rounded-xl bg-[#F8FAFC] border border-[var(--owm-border)] p-3 flex flex-col">
            <div className="mb-2">
              <h3 className="text-[13px] font-extrabold">가용예산</h3>
            </div>
            <MonthBars rows={depositBars} maxTotal={maxMonthly} />
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-slate">
              <span className="inline-flex items-center gap-1">
                <i className="w-2 h-2 rounded-[2px]" style={{ background: CHART_COLOR.available }} /> 가용
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="w-2 h-2 rounded-[2px]" style={{ background: CHART_COLOR.used }} /> 사용
              </span>
            </div>
          </div>
          <div className="min-w-0 rounded-xl bg-[#F8FAFC] border border-[var(--owm-border)] p-3">
            <BudgetCompositionDonut
              contents={contents}
              budgets={budgets}
              onViewBrandContent={onViewBrandContent}
            />
          </div>
          <div className="min-w-0 rounded-xl bg-[#F8FAFC] border border-[var(--owm-border)] p-3 flex flex-col">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="text-[13px] font-extrabold">미입금 예산</h3>
              <span className="num text-[12px] font-semibold text-[#B91C1C]">{fmtBudgetManwon(s.securedPending)}만</span>
            </div>
            <MonthBars rows={unpaidBars} maxTotal={maxMonthly} />
            <div className="flex gap-x-3 mt-2 text-[10px] text-slate">
              <span className="inline-flex items-center gap-1">
                <i className="w-2 h-2 rounded-[2px]" style={{ background: CHART_COLOR.unpaid }} /> 미입금
              </span>
            </div>
          </div>
        </div>
        <UnreceivedList rows={unreceivedRows} />
        <EntryDiscussingList rows={entryDiscussing} />
        <DiscussingList rows={discussing} />
      </div>
    </section>
  )
}

/** 회원사 로그인용 — 본인 예산만 */
export function PartnerBudgetSnapshot({ brand }: { brand: string }) {
  const { rows: budgets, missing } = useDbBudgets()
  const month = currentBudgetMonth()
  const monthNo = Number(month.slice(5))
  const rows = budgetsForBrand(brand, budgets ?? [])
  const available = rows.filter(b => b.payment === '입금 완료' && b.useStatus !== '기 소진').reduce((s, b) => s + budgetMid(b), 0)
  const sepAvailable = rows.filter(b => b.payment === '입금 완료' && b.useStatus !== '기 소진' && b.marketingMonth === month).reduce((s, b) => s + budgetMid(b), 0)
  const unreceived = rows
    .filter(b => b.stage === '확정 및 진행' && b.payment !== '입금 완료')
    .reduce((s, b) => s + budgetMid(b), 0)
  const spent = rows.filter(b => b.useStatus === '기 소진').reduce((s, b) => s + budgetMid(b), 0)
  const planned = rows.filter(b => b.useStatus === '사용 예정').reduce((s, b) => s + budgetMid(b), 0)

  if (!budgets) return null

  return (
    <section id="s-budget" className="mb-3 scroll-mt-28">
      {missing && (
        <p className="mb-2 text-xs text-owm-text2">예산 테이블이 없습니다. supabase/add-companies.sql 실행 후 동기화가 필요합니다.</p>
      )}
      <div className="mb-2 rounded-xl border border-[var(--owm-border)] bg-white/70 p-2.5 shadow-[var(--owm-shadow)]">
        <div className="owm-sec-title mb-2.5 px-0.5">
          <span className="owm-sec-no">예산</span>
          {brand} 예산
          <span className="text-xs font-normal text-owm-text2">회원사 전용</span>
        </div>
        <div className={`grid gap-2 ${rows.length > 1 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
          <div
            className="owm-kpi-card"
            style={{ '--bc': KPI_PART_COLOR.total } as CSSProperties}
            data-emoji="💰"
          >
            <div className="owm-kpi-header">
              <span className="owm-kpi-dot" />
              <span className="owm-kpi-label">가용예산</span>
            </div>
            <div className="owm-kpi-amount">
              {fmtBudgetManwon(available)}<small>만원</small>
            </div>
            <div className="owm-kpi-divider" />
            <div className="owm-kpi-sub">
              <span>입금 완료만</span>
            </div>
          </div>

          {spent > 0 && (
            <div
              className="owm-kpi-card"
              style={{ '--bc': '#64748B' } as CSSProperties}
              data-emoji="✓"
            >
              <div className="owm-kpi-header">
                <span className="owm-kpi-dot" />
                <span className="owm-kpi-label">기 소진</span>
              </div>
              <div className="owm-kpi-amount">
                {fmtBudgetManwon(spent)}<small>만원</small>
              </div>
              <div className="owm-kpi-divider" />
              <div className="owm-kpi-sub"><span>집행 완료 예산</span></div>
            </div>
          )}

          {planned > 0 && (
            <div
              className="owm-kpi-card"
              style={{ '--bc': KPI_PART_COLOR.secured } as CSSProperties}
              data-emoji="→"
            >
              <div className="owm-kpi-header">
                <span className="owm-kpi-dot" />
                <span className="owm-kpi-label">사용 예정</span>
              </div>
              <div className="owm-kpi-amount">
                {fmtBudgetManwon(planned)}<small>만원</small>
              </div>
              <div className="owm-kpi-divider" />
              <div className="owm-kpi-sub"><span>추가 캠페인 예산</span></div>
            </div>
          )}

          {sepAvailable > 0 && (
            <div
              className="owm-kpi-card"
              style={{ '--bc': '#0B47B4' } as CSSProperties}
              data-emoji="📅"
            >
              <div className="owm-kpi-header">
                <span className="owm-kpi-dot" />
                <span className="owm-kpi-label">{monthNo}월 가용예산</span>
              </div>
              <div className="owm-kpi-amount">
                {fmtBudgetManwon(sepAvailable)}<small>만원</small>
              </div>
              <div className="owm-kpi-divider" />
              <div className="owm-kpi-sub"><span>이번 달 쓸 수 있는 입금</span></div>
            </div>
          )}

          {unreceived > 0 && (
            <div
              className="owm-kpi-card"
              style={{ '--bc': '#EF4444' } as CSSProperties}
              data-emoji="⏳"
            >
              <div className="owm-kpi-header">
                <span className="owm-kpi-dot" />
                <span className="owm-kpi-label">미수령</span>
              </div>
              <div className="owm-kpi-amount">
                {fmtBudgetManwon(unreceived)}<small>만원</small>
              </div>
              <div className="owm-kpi-divider" />
              <div className="owm-kpi-sub"><span>확정 · 입금 전</span></div>
            </div>
          )}

          {available <= 0 && unreceived <= 0 && rows.length > 0 && (
            <div
              className="owm-kpi-card"
              style={{ '--bc': KPI_PART_COLOR.planned } as CSSProperties}
              data-emoji="📝"
            >
              <div className="owm-kpi-header">
                <span className="owm-kpi-dot" />
              <span className="owm-kpi-label">
                {rows.every(b => budgetMid(b) <= 0) ? '예산 협의중' : budgetPaymentLabel(rows[0]?.payment ?? '검토 중')}
              </span>
            </div>
            <div className="owm-kpi-amount">
              {rows.every(b => budgetMid(b) <= 0)
                ? '—'
                : fmtBudgetManwon(rows.reduce((n, b) => n + budgetMid(b), 0))}
              {!rows.every(b => budgetMid(b) <= 0) && <small>만원</small>}
            </div>
              <div className="owm-kpi-divider" />
              <div className="owm-kpi-sub">
                <span>{budgetStageLabel(rows[0]?.stage ?? '미정')} · 가용 제외</span>
              </div>
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <ul className="mt-2.5 space-y-1.5 px-0.5">
            {rows.map(b => (
              <li
                key={budgetRowKey(b)}
                className={`flex items-baseline gap-2 text-[12.5px] py-1.5 border-b border-[var(--owm-border)] last:border-b-0 ${
                  isLatePayment(b.payment) ? 'border-r-2 border-r-[#EF4444] pr-2' : ''
                }`}
              >
                <span
                  className="w-2 h-2 rounded-[2px] shrink-0"
                  style={{ background: budgetItemColor(b.stage, b.payment) }}
                />
                <span className="font-semibold text-owm-text min-w-0 truncate">
                  {budgetRowLabel(b)}
                  {b.useStatus ? ` · ${b.useStatus}` : ''}
                </span>
                <span className="num text-[11px] text-slate ml-auto whitespace-nowrap text-right">
                  {fmtBudgetRange(b)}
                  {isLatePayment(b.payment) ? (
                    <span className="mt-0.5 block rounded border border-[#EF4444] bg-[#FEF2F2] px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-[#B91C1C]">
                      {LATE_UPLOAD_NOTE}
                    </span>
                  ) : b.amount > 0 ? (
                    <> · {budgetPaymentLabel(b.payment)}</>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

