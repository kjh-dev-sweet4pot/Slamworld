'use client'

export interface MonthlyPoint {
  month: string
  count: number
}

interface Props {
  data: MonthlyPoint[]
  highlightMonth?: string
  onSelectMonth?: (month: string) => void
}

export default function MonthlyBarChart({ data, highlightMonth, onSelectMonth }: Props) {
  if (!data.length) {
    return (
      <div className="h-40 flex items-center justify-center text-[13px] text-slate">
        월별 데이터가 없습니다.
      </div>
    )
  }

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const latestMonth = highlightMonth ?? data[data.length - 1]?.month

  return (
    <div className="mt-5">
      {/* Y-axis guide lines */}
      <div className="relative h-44">
        {[0.25, 0.5, 0.75, 1].map(ratio => (
          <div
            key={ratio}
            className="absolute left-0 right-0 border-t border-mist/80"
            style={{ bottom: `${ratio * 100}%` }}
          />
        ))}

        <div className="absolute inset-0 flex items-end gap-2.5 px-0.5">
          {data.map(({ month, count }) => {
            const barPct = Math.max((count / maxCount) * 100, count > 0 ? 6 : 0)
            const isHighlight = month === latestMonth

            return (
              <button
                key={month}
                type="button"
                onClick={() => onSelectMonth?.(month)}
                aria-pressed={isHighlight}
                title={`${month}: ${count}건`}
                className="flex-1 h-full flex flex-col items-center min-w-0 group cursor-pointer
                  rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-azure/40"
              >
                <span className="num text-[11px] font-semibold text-body mb-1.5 shrink-0">
                  {count}
                </span>

                <div className="flex-1 w-full flex items-end min-h-0">
                  <div
                    className={`w-full rounded-t-[4px] transition-all duration-300 ease-out
                      ${isHighlight
                        ? 'shadow-[0_4px_14px_rgba(24,104,240,.28)] bg-gradient-to-b from-[#6FBFFF] to-[#1868F0]'
                        : 'bg-gradient-to-b from-[#E8F2FF] to-[#B8D4FF] group-hover:from-[#C5DFFF] group-hover:to-[#7EB3F5]'}`}
                    style={{ height: `${barPct}%` }}
                  />
                </div>

                <span
                  className={`num text-[10.5px] mt-2 shrink-0 whitespace-nowrap
                    ${isHighlight ? 'font-semibold text-azure-deep' : 'text-slate group-hover:text-azure-deep'}`}
                >
                  {Number(month.slice(5))}월
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
