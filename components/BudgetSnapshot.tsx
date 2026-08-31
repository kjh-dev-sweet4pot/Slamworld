'use client'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  computeBudgetSummary,
  fmtBudgetManwon,
  monthlyBudgetForChart,
  type BudgetStage,
  type MonthlyBudgetChartRow,
} from '@/lib/brand-budget'

const STAGE_COLOR: Record<BudgetStage, string> = {
  '확정 및 진행': '#1868F0',
  '계약 예정': '#F59E0B',
  '10월 예정': '#6366F1',
}

const STAGE_LABEL: Record<BudgetStage, string> = {
  '확정 및 진행': '확보 예산',
  '계약 예정': '계약 예정·검토',
  '10월 예정': '10월 예정',
}

const BAR_COLOR = {
  paid: 'linear-gradient(to top, #16A34A, #4ADE80)',
  payPending: 'linear-gradient(to top, #D97706, #FBBF24)',
  unpaid: 'linear-gradient(to top, #64748B, #94A3B8)',
  plannedReview: 'linear-gradient(to top, #EA580C, #FB923C)',
  plannedOct: 'linear-gradient(to top, #4F46E5, #818CF8)',
} as const

const PAYMENT_LABEL = {
  '입금 완료': '입금 완료',
  '입금 예정': '입금 예정',
  '미입금': '미입금',
} as const

const PAYMENT_COLOR: Record<keyof typeof PAYMENT_LABEL, string> = {
  '입금 완료': '#22C55E',
  '입금 예정': '#F59E0B',
  '미입금': '#94A3B8',
}

function fmtMonthLabel(ym: string) {
  return `${Number(ym.slice(5))}월`
}

function donutSlices(
  total: number,
  segments: { key: BudgetStage; value: number }[],
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
        label: STAGE_LABEL[s.key],
        color: STAGE_COLOR[s.key],
        value: s.value,
        pct: Math.round(ratio * 100),
        dasharray: `${dash} ${gap}`,
        dashoffset: -offset,
      }
      offset += dash
      return item
    })
}

function MonthTooltip({ row }: { row: MonthlyBudgetChartRow }) {
  const confirmed = row.items.filter(i => i.kind === 'confirmed')
  const planned = row.items.filter(i => i.kind === 'planned')
  const byPayment = (['입금 완료', '입금 예정', '미입금'] as const).filter(p =>
    confirmed.some(i => i.payment === p),
  )

  return (
    <div className="owm-budget-tip">
      <div className="owm-budget-tip-title">{fmtMonthLabel(row.month)} · {fmtBudgetManwon(row.total)}만</div>
      {confirmed.length > 0 && (
        <div className="owm-budget-tip-group">
          {byPayment.map(p => (
            <div key={p}>
              <div className="owm-budget-tip-label" style={{ color: PAYMENT_COLOR[p] }}>{PAYMENT_LABEL[p]}</div>
              {confirmed.filter(i => i.payment === p).map(i => (
                <div key={i.brand} className="owm-budget-tip-row">
                  <span>{i.brand}</span>
                  <span className="num">{i.amountLabel}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {planned.length > 0 && (
        <div className="owm-budget-tip-group">
          <div className="owm-budget-tip-label" style={{ color: STAGE_COLOR['계약 예정'] }}>계약 예정·검토</div>
          {planned.filter(i => i.stage === '계약 예정').map(i => (
            <div key={i.brand} className="owm-budget-tip-row">
              <span>{i.brand}</span>
              <span className="num">{i.amountLabel}</span>
            </div>
          ))}
          {planned.some(i => i.stage === '10월 예정') && (
            <>
              <div className="owm-budget-tip-label mt-1" style={{ color: STAGE_COLOR['10월 예정'] }}>10월 예정</div>
              {planned.filter(i => i.stage === '10월 예정').map(i => (
                <div key={i.brand} className="owm-budget-tip-row">
                  <span>{i.brand}</span>
                  <span className="num">{i.amountLabel}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      {row.items.length === 0 && (
        <div className="text-[11px] text-owm-text3">배정 예산 없음</div>
      )}
    </div>
  )
}

function MonthlyBudgetBars({ rows, maxTotal }: { rows: MonthlyBudgetChartRow[]; maxTotal: number }) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="relative h-[200px] w-full">
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

  const segments: { key: BudgetStage; value: number }[] = [
    { key: '확정 및 진행', value: s.byStage['확정 및 진행'].total },
    { key: '계약 예정', value: s.byStage['계약 예정'].total },
    { key: '10월 예정', value: s.byStage['10월 예정'].total },
  ]
  const arcs = donutSlices(s.pipelineTotal, segments)

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
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-6 lg:gap-6 items-start">
          {/* 좌: 월별 확보 — 남는 너비 전부 */}
          <div className="min-w-0 w-full">
            <div className="mb-3">
              <h2 className="text-[14px] font-extrabold tracking-tight">월별 확보 예산</h2>
              <p className="text-[11px] text-slate mt-0.5">확보·계약 예정 포함 (만원) · 막대에 마우스를 올려보세요</p>
            </div>
            <MonthlyBudgetBars rows={monthlyChart} maxTotal={maxMonthly} />
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-[10px] text-slate">
              <span className="inline-flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-[2px] bg-[#22C55E]" /> 입금 완료
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-[2px] bg-[#F59E0B]" /> 입금 예정
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-[2px] bg-[#94A3B8]" /> 미입금
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-[2px] bg-[#EA580C]" /> 계약 예정
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-[2px] bg-[#6366F1]" /> 10월 예정
              </span>
            </div>
          </div>

          {/* 우: 소요 예산 구성 — 고정 폭 */}
          <div className="min-w-0 w-full lg:w-[280px] shrink-0 flex flex-col items-center lg:items-end">
            <div className="w-full mb-3 text-center lg:text-right">
              <h2 className="text-[14px] font-extrabold tracking-tight">소요 예산 구성</h2>
              <p className="text-[11px] text-slate mt-0.5">총액 대비 단계별 비중</p>
            </div>

            {arcs.length === 0 ? (
              <div className="h-40 grid place-items-center text-[13px] text-slate w-full">데이터 없음</div>
            ) : (
              <>
                <div className="relative w-[200px] aspect-square max-h-[200px]">
                  <svg viewBox="0 0 176 176" className="w-full h-full -rotate-90">
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
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 grid place-items-center text-center pointer-events-none px-4">
                    <div>
                      <div className="num text-[18px] font-semibold tracking-tight leading-none">
                        {fmtBudgetManwon(s.pipelineTotal)}
                      </div>
                      <div className="text-[10px] text-slate mt-1">소요 예산 (만원)</div>
                    </div>
                  </div>
                </div>

                <ul className="mt-4 w-full max-w-[280px] space-y-2 lg:ml-auto">
                  {arcs.map(a => (
                    <li key={a.key} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-[2px] flex-none"
                        style={{ background: a.color }}
                      />
                      <span className="text-[12.5px] font-semibold">{a.label}</span>
                      <span className="num text-[11px] text-slate ml-auto whitespace-nowrap">
                        {a.pct}% · {fmtBudgetManwon(a.value)}만
                      </span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2 pt-2 border-t border-mist">
                    <span className="w-2.5 h-2.5 rounded-[2px] flex-none bg-mist" />
                    <span className="text-[12.5px] font-bold text-azure-deep">소요 예산 합계</span>
                    <span className="num text-[11px] font-semibold text-azure-deep ml-auto">
                      100% · {fmtBudgetManwon(s.pipelineTotal)}만
                    </span>
                  </li>
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
