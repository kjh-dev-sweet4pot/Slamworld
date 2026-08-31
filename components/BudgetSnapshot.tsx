'use client'
import { computeBudgetSummary, fmtBudgetManwon, monthlySecuredForChart, type BudgetStage } from '@/lib/brand-budget'

const STAGE_COLOR: Record<BudgetStage, string> = {
  '확정 및 진행': '#1868F0',
  '계약 예정': '#6FBFFF',
  '10월 예정': '#0B47B4',
}

const STAGE_LABEL: Record<BudgetStage, string> = {
  '확정 및 진행': '확보 예산',
  '계약 예정': '계약 예정·검토',
  '10월 예정': '10월 예정',
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

export default function BudgetSnapshot() {
  const s = computeBudgetSummary()
  const monthlyChart = monthlySecuredForChart(s)
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
    <section id="s-budget" className="mb-3 scroll-mt-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-mist border border-mist rounded overflow-hidden mb-2">
        {kpis.map(({ k, v, unit, d }) => (
          <div key={k} className="bg-white/72 backdrop-blur p-4">
            <div className="text-xs font-semibold text-slate">{k}</div>
            <div className="num text-[28px] font-semibold tracking-tight leading-none my-2">
              {v}<span className="text-sm text-slate ml-1">{unit}</span>
            </div>
            <div className="text-[11px] text-body leading-relaxed">{d}</div>
          </div>
        ))}
      </div>

      <div className="glass p-4 md:p-5 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 md:gap-6 items-center">
        {/* 좌: 월별 확보 — 정사각형 (축소) */}
        <div className="shrink-0 mx-auto md:mx-0">
          <div className="mb-1.5">
            <h2 className="text-[13px] font-extrabold tracking-tight">월별 확보 예산</h2>
            <p className="text-[10px] text-slate mt-0.5">계약·확정 월 (만원)</p>
          </div>
          <div className="w-[260px] h-[150px] flex flex-col">
          {monthlyChart.length === 0 ? (
            <div className="flex-1 grid place-items-center text-[13px] text-slate">데이터 없음</div>
          ) : (
            <div className="relative flex-1 min-h-0">
              {[0.25, 0.5, 0.75, 1].map(ratio => (
                <div
                  key={ratio}
                  className="absolute left-0 right-0 border-t border-mist/80"
                  style={{ bottom: `${ratio * 100}%` }}
                />
              ))}
              <div className="absolute inset-0 flex items-end gap-1 px-0.5 pb-0.5">
                {monthlyChart.map(({ month, total, brands }) => {
                  const hasData = total > 0
                  const pct = hasData ? Math.max((total / maxMonthly) * 100, 10) : 0
                  return (
                    <div key={month} className="flex-1 h-full flex flex-col items-center min-w-0">
                      <span className={`num text-[8.5px] font-semibold mb-0.5 shrink-0
                        ${hasData ? 'text-body' : 'text-mist'}`}>
                        {hasData ? `${fmtBudgetManwon(total)}만` : '—'}
                      </span>
                      <div className="flex-1 w-full flex items-end min-h-0">
                        {hasData ? (
                          <div
                            className="w-full rounded-t-[3px] bg-gradient-to-b from-[#6FBFFF] to-[#1868F0]
                              shadow-[0_2px_8px_rgba(24,104,240,.18)]"
                            style={{ height: `${pct}%` }}
                            title={brands.join(', ')}
                          />
                        ) : (
                          <div className="w-full h-[3px] rounded-t-[2px] bg-mist/90" title="예정" />
                        )}
                      </div>
                      <span className={`num text-[8.5px] font-semibold mt-1 shrink-0
                        ${hasData ? 'text-azure-deep' : 'text-slate/60'}`}>
                        {fmtMonthLabel(month)}
                      </span>
                      {hasData && (
                        <span className="text-[7px] text-slate truncate w-full text-center">
                          {brands.length}개사
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* 우: 소요 예산 구성 — 도넛 */}
        <div className="flex flex-col items-center md:items-end justify-center min-h-0 w-full">
          <div className="w-full max-w-[280px] mb-3 text-center md:text-right">
            <h2 className="text-[14px] font-extrabold tracking-tight">소요 예산 구성</h2>
            <p className="text-[11px] text-slate mt-0.5">총액 대비 단계별 비중</p>
          </div>

          {arcs.length === 0 ? (
            <div className="flex-1 grid place-items-center text-[13px] text-slate">데이터 없음</div>
          ) : (
            <>
              <div className="relative w-[220px] aspect-square max-h-[220px]">
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

              <ul className="mt-4 w-full max-w-[280px] space-y-2 md:ml-auto">
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
    </section>
  )
}
