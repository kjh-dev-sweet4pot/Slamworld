'use client'
import { type CSSProperties, type ReactNode } from 'react'
import type { PipelineCatStage } from '@/lib/brand-pipeline'

function CatMarker() {
  return (
    <div className="pipeline-cat-marker-delivering absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center" aria-hidden>
      <img
        src="/pipeline-cat.apng"
        alt=""
        decoding="async"
        className="pipeline-cat-video w-[52px] h-[34px] object-contain"
      />
      <span className="pipeline-cat-arrow" />
      <span className="pipeline-cat-pct text-[9px] font-bold text-azure-deep whitespace-nowrap mt-0.5">
        전달 중
      </span>
    </div>
  )
}

/** 확정 브랜드 파이프라인 바 — 구간별 고양이 (계약 완료 칸에는 표시 안 함) */
export default function PipelineCatRunner({
  stage,
  prepPct = 0,
  children,
}: {
  stage: PipelineCatStage
  prepPct?: number
  children: ReactNode
}) {
  const prepPos = prepPct <= 0 ? 4 : Math.min(92, Math.max(8, prepPct))

  return (
    <div className="relative pt-[52px]">
      <div className="absolute inset-x-0 top-0 z-10 flex gap-0.5 h-[52px] pointer-events-none" aria-hidden>
        <div className="flex-none w-[76px] sm:w-[92px] relative">
          {stage === 'delivering' && <CatMarker />}
        </div>
        {/* 계약 완료 구간 — 고양이 없음 */}
        <div className="flex-none min-w-[68px]" />
        <div className="flex-1 relative min-w-0">
          {stage === 'prep' && (
            <div
              className="pipeline-cat-marker-prep absolute bottom-0"
              style={{ left: `${prepPos}%`, '--cat-enter-pct': `${prepPos}%` } as CSSProperties}
            >
              <div className="flex flex-col items-center -translate-x-1/2">
                <img
                  src="/pipeline-cat.apng"
                  alt=""
                  decoding="async"
                  className="pipeline-cat-video w-[52px] h-[34px] object-contain"
                />
                <span className="pipeline-cat-arrow" />
                <span className="pipeline-cat-pct num text-[9px] font-bold text-azure-deep whitespace-nowrap mt-0.5">
                  {prepPct}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
