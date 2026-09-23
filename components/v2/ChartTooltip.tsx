'use client'

import { useCallback, useState, type MouseEvent, type ReactNode } from 'react'

export interface TipRow {
  label: string
  value: string
  color?: string
  /** 호버된 항목 강조 */
  active?: boolean
}

interface TipState {
  x: number
  y: number
  title: string
  rows: TipRow[]
  footer?: string
}

const TIP_WIDTH = 220

/**
 * 차트 호버 툴팁 — 마우스를 따라다니는 fixed 레이어.
 * `bind(...)`를 차트 요소에 spread 하고, `node`를 컴포넌트 어딘가에 렌더링한다.
 */
export function useChartTooltip() {
  const [tip, setTip] = useState<TipState | null>(null)

  const bind = useCallback(
    (title: string, rows: TipRow[], footer?: string) => {
      const update = (e: MouseEvent) => setTip({ x: e.clientX, y: e.clientY, title, rows, footer })
      return {
        onMouseEnter: update,
        onMouseMove: update,
        onMouseLeave: () => setTip(null),
      }
    },
    [],
  )

  let node: ReactNode = null
  if (tip) {
    const flipX = typeof window !== 'undefined' && tip.x + TIP_WIDTH + 24 > window.innerWidth
    const flipY = typeof window !== 'undefined' && tip.y + 40 + tip.rows.length * 22 > window.innerHeight
    node = (
      <div
        className="fixed z-[100] pointer-events-none bg-[#1a1d2e]/95 text-white rounded-xl shadow-[0_8px_24px_rgba(15,23,42,0.28)] px-3 py-2.5 text-[11.5px] min-w-[150px]"
        style={{
          left: tip.x,
          top: tip.y,
          maxWidth: TIP_WIDTH,
          transform: `translate(${flipX ? 'calc(-100% - 14px)' : '14px'}, ${flipY ? 'calc(-100% - 14px)' : '14px'})`,
        }}
      >
        <div className="font-extrabold text-[12px] mb-1.5">{tip.title}</div>
        <div className="flex flex-col gap-1">
          {tip.rows.map(r => (
            <div key={r.label} className={`flex items-center gap-2 ${r.active ? 'font-extrabold' : ''}`}>
              {r.color && <span className="w-2 h-2 rounded-[3px] shrink-0" style={{ backgroundColor: r.color }} />}
              <span className={r.active ? 'text-white' : 'text-white/75'}>{r.label}</span>
              <span className="ml-auto pl-3 font-bold tabular-nums">{r.value}</span>
            </div>
          ))}
        </div>
        {tip.footer && (
          <div className="mt-1.5 pt-1.5 border-t border-white/15 flex text-white/90 font-bold">
            {tip.footer}
          </div>
        )}
      </div>
    )
  }

  return { bind, node }
}
