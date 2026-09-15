'use client'
import {
  CONTRACT_BRANDS,
  CONTRACT_STAGES,
  COMMON_TIMELINE,
  SEPTEMBER_BRAND_STATUS,
  GUIDE_PREP,
  MATCH_PREP,
  REVIEW_BRANDS,
  OCTOBER_BRANDS,
  LEAD_RANGE,
  BUDGET_DISCLAIMER,
  MARKETING_NOTE,
  contractStageLabel,
  formatContractDate,
  pipelineContentBrand,
  matchesPartnerBrand,
  type BrandTier,
} from '@/lib/brand-pipeline'
import PipelineCatRunner from '@/components/PipelineCatRunner'
import { LATE_UPLOAD_NOTE } from '@/lib/brand-budget'
import { usePartnerBrand, useShowSales } from '@/lib/access-context'

const SEG_CLASS = [
  'bg-[#9ED2FF] text-azure-deep',
  'bg-sky text-[#08326E]',
  'bg-[#3E93F2] text-white',
  'bg-azure text-white',
  'bg-azure-deep text-white',
]

const TIER_STYLE: Record<BrandTier, string> = {
  large: 'bg-azure text-white',
  mid: 'bg-mist text-azure-deep',
  small: 'bg-slate/20 text-slate',
}

const TIER_LABEL: Record<BrandTier, string> = {
  large: '대형',
  mid: '중형',
  small: '소형',
}

function SectionHeader({ no, title, sub, right }: {
  no: string; title: string; sub?: string; right?: string
}) {
  return (
    <div className="flex items-end gap-3 flex-wrap mb-3 px-0.5">
      <div>
        <span className="num text-[11px] text-azure tracking-widest">{no}</span>
        <h2 className="text-xl font-extrabold tracking-tight mt-1">{title}</h2>
        {sub && <p className="text-[12.5px] text-body mt-1 leading-relaxed max-w-[56ch]">{sub}</p>}
      </div>
      {right && <span className="num text-[11px] text-slate ml-auto">{right}</span>}
    </div>
  )
}

function PipelineRow({
  p,
  rank,
  showSales,
  onViewBrandContent,
}: {
  p: typeof REVIEW_BRANDS[0]
  rank: number
  showSales: boolean
  onViewBrandContent?: (brand: string) => void
}) {
  return (
    <div className="glass px-5 py-3.5 mb-2 flex items-center gap-4 flex-wrap hover:border-sky transition-colors">
      <span className={`num text-[19px] font-semibold w-7 flex-none tracking-tight ${rank === 1 ? 'text-azure' : 'text-mist'}`}>
        {String(rank).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-[170px]">
        {onViewBrandContent ? (
          <button
            type="button"
            onClick={() => onViewBrandContent(pipelineContentBrand(p.name))}
            className="text-[15px] font-extrabold tracking-tight text-left hover:text-azure transition-colors"
          >
            {p.name}
          </button>
        ) : (
          <div className="text-[15px] font-extrabold tracking-tight">{p.name}</div>
        )}
        <div className="text-[11.5px] text-body mt-0.5">{p.desc}</div>
      </div>
      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-[3px] ${TIER_STYLE[p.tier]}`}>
        {showSales ? `${TIER_LABEL[p.tier]} · ${p.budget}` : TIER_LABEL[p.tier]}
      </span>
      <div className="flex items-center gap-1">
        {CONTRACT_STAGES.map((_, i) => (
          <i key={CONTRACT_STAGES[i]} className={`w-[18px] h-[5px] rounded-[2px] ${i + 1 <= p.stage ? 'bg-azure' : 'bg-mist'}`} />
        ))}
        <span className="num text-[10.5px] text-slate ml-1.5 whitespace-nowrap">{p.stageLabel}</span>
      </div>
      <span className="num text-[11px] text-slate whitespace-nowrap">{p.eta}</span>
    </div>
  )
}

export default function BrandPipeline({
  onViewBrandContent,
}: {
  onViewBrandContent?: (brand: string) => void
}) {
  const showSales = useShowSales()
  const partnerBrand = usePartnerBrand()
  const showBudget = showSales || !!partnerBrand
  const byBrand = <T extends { name?: string; brand?: string }>(rows: T[]) =>
    partnerBrand
      ? rows.filter(r => matchesPartnerBrand(r.name ?? r.brand ?? '', partnerBrand))
      : rows

  const contracts = byBrand(CONTRACT_BRANDS)
  const september = byBrand(SEPTEMBER_BRAND_STATUS)
  const guides = byBrand(GUIDE_PREP)
  const matches = byBrand(MATCH_PREP)
  const reviews = byBrand(REVIEW_BRANDS)
  const october = byBrand(OCTOBER_BRANDS)
  const hasConfirmed = contracts.length > 0
  const hasPrep = september.length > 0 || guides.length > 0 || matches.length > 0
  const hasPipeline = reviews.length > 0 || october.length > 0

  return (
    <>
      {/* ── 확정 및 진행 ── */}
      {hasConfirmed && (
      <section id="s-brands" className="mb-10 scroll-mt-20">
        <SectionHeader
          no="02"
          title={partnerBrand ? `${partnerBrand} 진행 현황` : '확정 및 진행 브랜드'}
          sub={partnerBrand
            ? '회원사 전용 진행·리드타임 정보입니다.'
            : showSales
              ? '입금 완료 및 예정 브랜드입니다. 브랜드명을 누르면 콘텐츠 성과로 이동합니다.'
              : '확정·진행 중인 브랜드입니다. 브랜드명을 누르면 콘텐츠 성과로 이동합니다.'}
          right={partnerBrand
            ? undefined
            : showSales ? `${contracts.length}개사 · 예산 규모순` : `${contracts.length}개사`}
        />

        {!partnerBrand && (
        <div className="glass flex flex-wrap items-center gap-6 px-6 py-5 mb-2.5">
          <div>
            <span className="num text-[10.5px] text-slate tracking-widest uppercase">평균 리드타임</span>
            <div className="num text-[52px] font-semibold tracking-tight leading-none text-azure-deep mt-1">
              {LEAD_RANGE.typical}<small className="text-[17px] text-slate ml-1 font-normal">일</small>
            </div>
          </div>
          <p className="flex-1 min-w-[250px] text-[12.5px] text-body leading-relaxed">
            계약 단계: <b className="text-azure-deep">협의중 → 계약 완료 → 입금 완료 → 캠페인 진행중 → 캠페인 종료</b>.
            입금 완료 후 마케팅 시작까지 통상 <b className="text-azure-deep">{LEAD_RANGE.min}~{LEAD_RANGE.max}일</b>
            (평균 {LEAD_RANGE.typical}일)이 걸립니다.
          </p>
        </div>
        )}

        {contracts.map(b => {
          const late = b.meta.includes('입금 지연') || b.status.includes('입금 지연')
          return (
          <div key={b.name} className={`glass px-5 py-4 mb-2 ${late ? 'ring-1 ring-[#EF4444] ring-inset shadow-[inset_-3px_0_0_#EF4444]' : ''}`}>
            <div className="flex items-baseline gap-2.5 flex-wrap mb-2.5">
              {onViewBrandContent && !partnerBrand ? (
                <button
                  type="button"
                  onClick={() => onViewBrandContent(pipelineContentBrand(b.name))}
                  className="text-[15px] font-extrabold tracking-tight hover:text-azure transition-colors"
                >
                  {b.name}
                </button>
              ) : (
                <span className="text-[15px] font-extrabold tracking-tight">{b.name}</span>
              )}
              <span className="num text-[10.5px] text-slate">{b.meta}</span>
              <span className="num text-[13px] font-semibold text-azure-deep ml-auto">
                {showBudget && b.budget && <>{b.budget}</>}
                <small className="text-[10px] text-slate font-normal ml-1.5">
                  {contractStageLabel(b.stage)}
                </small>
              </span>
            </div>

            <PipelineCatRunner stage={b.stage}>
            <div className="flex gap-0.5 h-7 rounded overflow-hidden bg-mist items-stretch">
              {CONTRACT_STAGES.map((label, i) => {
                const done = i + 1 <= b.stage
                const current = i + 1 === b.stage
                return (
                  <div
                    key={label}
                    className={`flex-1 grid place-items-center text-[8.5px] sm:text-[9.5px] font-semibold px-0.5 text-center leading-tight ${
                      done ? SEG_CLASS[i] : 'bg-mist text-slate'
                    } ${current ? 'ring-1 ring-inset ring-azure-deep/40' : ''}`}
                  >
                    {label}
                    {label === '계약 완료' && b.contractCompletedOn && (
                      <span className="num text-[8px] font-bold opacity-80 block">
                        {formatContractDate(b.contractCompletedOn)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            </PipelineCatRunner>

            <div className="flex flex-wrap gap-x-3 gap-y-0.5 num text-[9.5px] text-slate mt-1.5 items-center justify-between">
              <span className="text-body">
                현재 <span className="text-azure-deep font-semibold">{contractStageLabel(b.stage)}</span>
                {b.stage < 5 && (
                  <> · 다음 <span className="font-semibold">{CONTRACT_STAGES[b.stage]}</span></>
                )}
              </span>
              <span className="text-right">
                {late ? (
                  <span className="inline-block rounded border border-[#EF4444] bg-[#FEF2F2] px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-[#B91C1C]">
                    {LATE_UPLOAD_NOTE}
                  </span>
                ) : b.status}
              </span>
            </div>
          </div>
          )
        })}
        {showBudget && (
          <p className="mt-3 px-1 text-[11.5px] text-slate leading-relaxed">{BUDGET_DISCLAIMER}</p>
        )}
      </section>
      )}

      {/* ── 준비 중 ── */}
      {hasPrep && (
      <section id={hasConfirmed ? 's-prep' : 's-brands'} className="mb-10 scroll-mt-20">
        <SectionHeader
          no="03"
          title="준비 중 · 진행 일정"
          sub={partnerBrand ? `${partnerBrand} 가이드·매칭 현황입니다.` : '공통 타임라인과 브랜드별 가이드·매칭 현황입니다.'}
          right={`가이드 ${guides.length}건 · 매칭 ${matches.length}건`}
        />

        {/* 공통 타임라인 */}
        {!partnerBrand && (
        <div className="glass p-5 mb-3">
          <h3 className="font-extrabold text-[14px] tracking-tight mb-1">전체 공통 타임라인</h3>
          <p className="text-[11.5px] text-slate mb-4">8월 말 가이드 확정 → 9월 초 방문·발행</p>
          <div className="relative pl-4 border-l border-mist space-y-3">
            {COMMON_TIMELINE.map((m, i) => (
              <div key={m.title} className="relative">
                <div className={`absolute -left-[21px] top-1 w-2 h-2 rounded-[2px] border-2
                  ${i === 0 ? 'border-azure shadow-[0_0_0_3px_rgba(24,104,240,.15)] bg-white' : 'border-sky bg-white'}`} />
                {m.date && <div className="num text-[10px] text-azure tracking-wider">{m.date}</div>}
                <div className={`text-[13px] font-bold text-ink ${m.date ? 'mt-0.5' : ''}`}>{m.title}</div>
                <div className="text-[12px] text-body mt-0.5">{m.detail}</div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* 9월 브랜드별 현황 */}
        {september.length > 0 && (
        <div className="glass p-5 mb-3">
          <h3 className="font-extrabold text-[14px] tracking-tight mb-1">
            {partnerBrand ? '마케팅 타겟 · 현황' : '9월 마케팅 타겟 · 브랜드별 현황'}
          </h3>
          <p className="text-[11.5px] text-slate mb-4">가이드라인 및 계획안 진행 상태</p>
          <div className="space-y-3">
            {september.map(s => (
              <div key={s.brand} className={`py-2 border-b border-mist last:border-0 last:pb-0 ${
                s.status.includes('입금 지연') ? 'border-r-2 border-r-[#EF4444] pr-2' : ''
              }`}>
                <div className="flex items-baseline gap-2 mb-1.5">
                  {onViewBrandContent && !partnerBrand ? (
                    <button
                      type="button"
                      onClick={() => onViewBrandContent(pipelineContentBrand(s.brand))}
                      className="text-[13px] font-bold min-w-[5.5rem] text-left hover:text-azure transition-colors"
                    >
                      {s.brand}
                    </button>
                  ) : (
                    <span className="text-[13px] font-bold min-w-[5.5rem]">{s.brand}</span>
                  )}
                  {s.status.includes('입금 지연') ? (
                    <span className="ml-auto inline-block rounded border border-[#EF4444] bg-[#FEF2F2] px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-[#B91C1C]">
                      {LATE_UPLOAD_NOTE}
                    </span>
                  ) : (
                    <span className="text-[11.5px] text-body flex-1">{s.status}</span>
                  )}
                  <span className="num text-[10px] text-slate">{s.pct}%</span>
                </div>
                <div className="h-[4px] rounded-full bg-mist overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${s.pct}%`,
                    background: 'linear-gradient(90deg,#6FBFFF,#1868F0)',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {(guides.length > 0 || matches.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {guides.length > 0 && (
          <div className="glass p-5">
            <h3 className="font-extrabold text-[14px] tracking-tight">콘텐츠 가이드 제작</h3>
            <p className="text-[11.5px] text-slate mt-0.5 mb-4">브랜드 톤 · 촬영 구도 · 필수 문구</p>
            {guides.map(g => (
              <div key={g.brand} className="py-3 border-b border-mist last:border-0 last:pb-0">
                <div className="flex items-baseline gap-2 mb-2">
                  {onViewBrandContent && !partnerBrand ? (
                    <button
                      type="button"
                      onClick={() => onViewBrandContent(pipelineContentBrand(g.brand))}
                      className="text-[13px] font-bold text-left hover:text-azure transition-colors"
                    >
                      {g.brand}
                    </button>
                  ) : (
                    <span className="text-[13px] font-bold">{g.brand}</span>
                  )}
                  <span className="text-[11.5px] text-body truncate">{g.detail}</span>
                  {g.eta.includes('입금 지연') || g.note.includes('입금 지연') ? (
                    <span className="ml-auto inline-block rounded border border-[#EF4444] bg-[#FEF2F2] px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-[#B91C1C]">
                      {LATE_UPLOAD_NOTE}
                    </span>
                  ) : (
                    <span className="num text-[10.5px] text-slate ml-auto whitespace-nowrap">{g.eta}</span>
                  )}
                </div>
                <div className="h-[5px] rounded-full bg-mist overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${g.pct}%`,
                    background: 'linear-gradient(90deg,#6FBFFF,#1868F0)',
                  }} />
                </div>
                <div className="flex justify-between num text-[10px] text-slate mt-1">
                  <span>{showBudget ? g.note : ''}</span>
                  <span>{g.pct}%</span>
                </div>
              </div>
            ))}
          </div>
          )}

          {matches.length > 0 && (
          <div className="glass p-5">
            <h3 className="font-extrabold text-[14px] tracking-tight">인플루언서 매칭</h3>
            <p className="text-[11.5px] text-slate mt-0.5 mb-4">섭외 · 일정 조율 · 방문</p>
            {matches.map(m => (
              <div key={m.brand} className="py-3 border-b border-mist last:border-0 last:pb-0">
                <div className="flex items-baseline gap-2 mb-2">
                  {onViewBrandContent && !partnerBrand ? (
                    <button
                      type="button"
                      onClick={() => onViewBrandContent(pipelineContentBrand(m.brand))}
                      className="text-[13px] font-bold text-left hover:text-azure transition-colors"
                    >
                      {m.brand}
                    </button>
                  ) : (
                    <span className="text-[13px] font-bold">{m.brand}</span>
                  )}
                  <span className="text-[11.5px] text-body">{m.detail}</span>
                  {m.note.includes('입금 지연') || m.eta.includes('입금 지연') ? (
                    <span className="ml-auto inline-block rounded border border-[#EF4444] bg-[#FEF2F2] px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-[#B91C1C]">
                      {LATE_UPLOAD_NOTE}
                    </span>
                  ) : (
                    <span className="num text-[10.5px] text-slate ml-auto whitespace-nowrap">
                      {m.total > 0 ? `${m.done} / ${m.total}건` : '—'}
                    </span>
                  )}
                </div>
                {m.total > 0 && (
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(m.total, 12) }).map((_, i) => (
                      <i key={i} className={`flex-1 h-1.5 rounded-[2px] ${i < m.done ? 'bg-azure' : 'bg-mist'}`} />
                    ))}
                  </div>
                )}
                <div className="flex justify-between num text-[10px] text-slate mt-1">
                  <span>{m.note}</span>
                  <span>{m.eta}</span>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
        )}

        {showBudget && !partnerBrand && (
          <p className="mt-3 px-1 text-[11.5px] text-slate leading-relaxed">{MARKETING_NOTE}</p>
        )}
      </section>
      )}

      {/* ── 계약 예정 및 검토 ── */}
      {hasPipeline && (
      <section id={hasConfirmed || hasPrep ? 's-pipeline' : 's-brands'} className="mb-10 scroll-mt-20">
        {reviews.length > 0 && (
          <>
            <SectionHeader
              no="04"
              title="계약 예정 및 검토"
              sub={partnerBrand ? `${partnerBrand} 온보딩·계약 검토 현황입니다.` : '온보딩·계약 검토 중인 브랜드입니다.'}
              right={partnerBrand ? undefined : `${reviews.length}개사`}
            />
            {reviews.map((p, i) => (
              <PipelineRow
                key={p.name}
                p={p}
                rank={i + 1}
                showSales={showBudget}
                onViewBrandContent={partnerBrand ? undefined : onViewBrandContent}
              />
            ))}
          </>
        )}

        {october.length > 0 && (
          <>
            <div className="mt-6 mb-3">
              <h3 className="text-[15px] font-extrabold tracking-tight px-0.5">10월 마케팅 예정</h3>
              <p className="text-[12px] text-body mt-1 px-0.5">입점 9월 중 · 마케팅은 10월로 순차 진행</p>
            </div>
            {october.map((p, i) => (
              <PipelineRow
                key={p.name}
                p={p}
                rank={i + 1}
                showSales={showBudget}
                onViewBrandContent={partnerBrand ? undefined : onViewBrandContent}
              />
            ))}
          </>
        )}
      </section>
      )}
    </>
  )
}
