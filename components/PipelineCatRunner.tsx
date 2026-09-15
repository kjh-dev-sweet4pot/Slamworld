'use client'
import { type ReactNode } from 'react'
import { CONTRACT_STAGES, type PipelineStage } from '@/lib/brand-pipeline'

/** 확정 브랜드 파이프라인 바 — 현재 stage 칸 위에 고양이 */
export default function PipelineCatRunner({
  stage,
  children,
}: {
  stage: PipelineStage
  children: ReactNode
}) {
  return (
    <div className="pipeline-cat-runner relative pt-[52px]">
      <div className="absolute inset-x-0 top-0 z-10 flex gap-0.5 h-[52px] pointer-events-none" aria-hidden>
        {CONTRACT_STAGES.map((_, i) => (
          <div key={CONTRACT_STAGES[i]} className="flex-1 relative min-w-0">
            {stage === i + 1 && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <img
                  src="/pipeline-cat.apng"
                  alt=""
                  decoding="async"
                  className="pipeline-cat-video w-[52px] h-[34px] object-contain"
                />
                <span className="pipeline-cat-arrow" />
                <span className="pipeline-cat-pct text-[9px] font-bold text-azure-deep whitespace-nowrap mt-0.5">
                  {CONTRACT_STAGES[i]}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      {children}
    </div>
  )
}
