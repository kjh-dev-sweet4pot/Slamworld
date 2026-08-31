import {
  CONTRACT_BRANDS,
  COMMON_TIMELINE,
  SEPTEMBER_BRAND_STATUS,
  GUIDE_PREP,
  MATCH_PREP,
  REVIEW_BRANDS,
  OCTOBER_BRANDS,
  LEAD_RANGE,
  BUDGET_DISCLAIMER,
  MARKETING_NOTE,
  contractPrepProgress,
  formatContractDate,
  pipelineCatStage,
  type BrandTier,
} from '@/lib/brand-pipeline'
import PipelineCatRunner from '@/components/PipelineCatRunner'

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

function PipelineRow({ p, rank }: { p: typeof REVIEW_BRANDS[0]; rank: number }) {
  return (
    <div className="glass px-5 py-3.5 mb-2 flex items-center gap-4 flex-wrap hover:border-sky transition-colors">
      <span className={`num text-[19px] font-semibold w-7 flex-none tracking-tight ${rank === 1 ? 'text-azure' : 'text-mist'}`}>
        {String(rank).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-[170px]">
        <div className="text-[15px] font-extrabold tracking-tight">{p.name}</div>
        <div className="text-[11.5px] text-body mt-0.5">{p.desc}</div>
      </div>
      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-[3px] ${TIER_STYLE[p.tier]}`}>
        {TIER_LABEL[p.tier]} · {p.budget}
      </span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4].map(s => (
          <i key={s} className={`w-[22px] h-[5px] rounded-[2px] ${s <= p.stage ? 'bg-azure' : 'bg-mist'}`} />
        ))}
        <span className="num text-[10.5px] text-slate ml-1.5 whitespace-nowrap">{p.stageLabel}</span>
      </div>
      <span className="num text-[11px] text-slate whitespace-nowrap">{p.eta}</span>
    </div>
  )
}

export default function BrandPipeline() {
  return (
    <>
      {/* ── 확정 및 진행 ── */}
      <section id="s-brands" className="mb-10 scroll-mt-20">
        <SectionHeader
          no="02"
          title="확정 및 진행 브랜드"
          sub="입금 완료 및 예정 브랜드입니다. 8월 말 가이드 확정 후 9월 초 방문 마케팅을 목표로 합니다."
          right={`${CONTRACT_BRANDS.length}개사 · 예산 규모순`}
        />

        <div className="glass flex flex-wrap items-center gap-6 px-6 py-5 mb-2.5">
          <div>
            <span className="num text-[10.5px] text-slate tracking-widest uppercase">평균 리드타임</span>
            <div className="num text-[52px] font-semibold tracking-tight leading-none text-azure-deep mt-1">
              {LEAD_RANGE.typical}<small className="text-[17px] text-slate ml-1 font-normal">일</small>
            </div>
          </div>
          <p className="flex-1 min-w-[250px] text-[12.5px] text-body leading-relaxed">
            <b className="text-azure-deep">계약서 전달</b> 후 <b className="text-azure-deep">계약 완료</b> 시점부터
            마케팅 시작까지 <b className="text-azure-deep">통상 {LEAD_RANGE.min}~{LEAD_RANGE.max}일</b>
            (평균 {LEAD_RANGE.typical}일)이 걸립니다.
            8월 말까지 가이드라인을 확정하고, 9월 초부터 본격적인 방문·발행을 진행합니다.
          </p>
        </div>

        {CONTRACT_BRANDS.map(b => {
          const stage = pipelineCatStage(b)
          const prepPct = b.contractCompletedOn
            ? contractPrepProgress(b.contractCompletedOn, b.days)
            : 0

          return (
          <div key={b.name} className="glass px-5 py-4 mb-2">
            <div className="flex items-baseline gap-2.5 flex-wrap mb-2.5">
              <span className="text-[15px] font-extrabold tracking-tight">{b.name}</span>
              <span className="num text-[10.5px] text-slate">{b.meta}</span>
              <span className="num text-[13px] font-semibold text-azure-deep ml-auto">
                {b.budget}
                <small className="text-[10px] text-slate font-normal ml-1.5">
                  계약 완료 후 약 {b.days}일
                </small>
              </span>
            </div>

            <PipelineCatRunner stage={stage} prepPct={prepPct}>
            <div className="flex gap-0.5 h-7 rounded overflow-hidden bg-mist items-stretch">
              <div className="flex-none w-[76px] sm:w-[92px] grid place-items-center text-[9px] sm:text-[9.5px] font-semibold bg-[#DCFCE7] text-[#166534] px-1 shrink-0">
                계약서 전달
              </div>

              <div className="flex-none flex flex-col items-center justify-center px-2 bg-white border-x border-mist shrink-0 min-w-[68px]">
                <span className="text-[9px] text-azure-deep font-bold leading-none tracking-tight">
                  ◀ 계약 완료 ▶
                </span>
                {b.contractCompletedOn ? (
                  <span className="num text-[8.5px] text-azure font-bold mt-0.5 whitespace-nowrap">
                    {formatContractDate(b.contractCompletedOn)}
                  </span>
                ) : (
                  <span className="num text-[8px] text-slate mt-0.5 whitespace-nowrap">
                    이후 ~{LEAD_RANGE.typical}일
                  </span>
                )}
              </div>

              <div className="flex flex-1 gap-0.5 min-w-0 h-full">
                {b.segs.map((n, i) => (
                  <div
                    key={i}
                    className={`grid place-items-center num text-[9.5px] font-medium whitespace-nowrap overflow-hidden ${SEG_CLASS[i]}`}
                    style={{ flex: n }}
                  >
                    {n}일
                  </div>
                ))}
              </div>
            </div>
            </PipelineCatRunner>

            <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_auto_1fr_auto] gap-x-2 gap-y-0.5 num text-[9.5px] text-slate mt-1.5 items-center">
              <span>계약서 전달</span>
              <span className="hidden sm:inline text-azure-deep font-semibold">
                {b.contractCompletedOn
                  ? `계약 완료 ${formatContractDate(b.contractCompletedOn)}`
                  : '계약 완료'}
              </span>
              <span className="text-center sm:text-left text-body">
                가이드 · 매칭 · 방문 준비 <span className="text-azure-deep font-semibold">(약 {b.days}일)</span>
              </span>
              <span className="text-right">{b.status}</span>
            </div>
          </div>
          )
        })}
        <p className="mt-3 px-1 text-[11.5px] text-slate leading-relaxed">{BUDGET_DISCLAIMER}</p>
      </section>

      {/* ── 준비 중 ── */}
      <section id="s-prep" className="mb-10 scroll-mt-20">
        <SectionHeader
          no="03"
          title="준비 중 · 진행 일정"
          sub="공통 타임라인과 브랜드별 가이드·매칭 현황입니다."
          right={`가이드 ${GUIDE_PREP.length}건 · 매칭 ${MATCH_PREP.length}건`}
        />

        {/* 공통 타임라인 */}
        <div className="glass p-5 mb-3">
          <h3 className="font-extrabold text-[14px] tracking-tight mb-1">전체 공통 타임라인</h3>
          <p className="text-[11.5px] text-slate mb-4">8월 말 가이드 확정 → 9월 초 방문·발행</p>
          <div className="relative pl-4 border-l border-mist space-y-3">
            {COMMON_TIMELINE.map((m, i) => (
              <div key={m.date} className="relative">
                <div className={`absolute -left-[21px] top-1 w-2 h-2 rounded-[2px] border-2
                  ${i === 0 ? 'border-azure shadow-[0_0_0_3px_rgba(24,104,240,.15)] bg-white' : 'border-sky bg-white'}`} />
                <div className="num text-[10px] text-azure tracking-wider">{m.date}</div>
                <div className="text-[13px] font-bold text-ink mt-0.5">{m.title}</div>
                <div className="text-[12px] text-body mt-0.5">{m.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 9월 브랜드별 현황 */}
        <div className="glass p-5 mb-3">
          <h3 className="font-extrabold text-[14px] tracking-tight mb-1">9월 마케팅 타겟 · 브랜드별 현황</h3>
          <p className="text-[11.5px] text-slate mb-4">가이드라인 및 계획안 진행 상태</p>
          <div className="space-y-3">
            {SEPTEMBER_BRAND_STATUS.map(s => (
              <div key={s.brand} className="py-2 border-b border-mist last:border-0 last:pb-0">
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="text-[13px] font-bold min-w-[5.5rem]">{s.brand}</span>
                  <span className="text-[11.5px] text-body flex-1">{s.status}</span>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="glass p-5">
            <h3 className="font-extrabold text-[14px] tracking-tight">콘텐츠 가이드 제작</h3>
            <p className="text-[11.5px] text-slate mt-0.5 mb-4">브랜드 톤 · 촬영 구도 · 필수 문구</p>
            {GUIDE_PREP.map(g => (
              <div key={g.brand} className="py-3 border-b border-mist last:border-0 last:pb-0">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[13px] font-bold">{g.brand}</span>
                  <span className="text-[11.5px] text-body truncate">{g.detail}</span>
                  <span className="num text-[10.5px] text-slate ml-auto whitespace-nowrap">{g.eta}</span>
                </div>
                <div className="h-[5px] rounded-full bg-mist overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${g.pct}%`,
                    background: 'linear-gradient(90deg,#6FBFFF,#1868F0)',
                  }} />
                </div>
                <div className="flex justify-between num text-[10px] text-slate mt-1">
                  <span>{g.note}</span>
                  <span>{g.pct}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="glass p-5">
            <h3 className="font-extrabold text-[14px] tracking-tight">인플루언서 매칭</h3>
            <p className="text-[11.5px] text-slate mt-0.5 mb-4">섭외 · 일정 조율 · 방문</p>
            {MATCH_PREP.map(m => (
              <div key={m.brand} className="py-3 border-b border-mist last:border-0 last:pb-0">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[13px] font-bold">{m.brand}</span>
                  <span className="text-[11.5px] text-body">{m.detail}</span>
                  <span className="num text-[10.5px] text-slate ml-auto whitespace-nowrap">
                    {m.total > 0 ? `${m.done} / ${m.total}건` : '—'}
                  </span>
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
        </div>

        <p className="mt-3 px-1 text-[11.5px] text-slate leading-relaxed">{MARKETING_NOTE}</p>
      </section>

      {/* ── 계약 예정 및 검토 ── */}
      <section id="s-pipeline" className="mb-10 scroll-mt-20">
        <SectionHeader
          no="04"
          title="계약 예정 및 검토"
          sub="온보딩·계약 검토 중인 브랜드입니다."
          right={`${REVIEW_BRANDS.length}개사`}
        />

        {REVIEW_BRANDS.map((p, i) => (
          <PipelineRow key={p.name} p={p} rank={i + 1} />
        ))}

        <div className="mt-6 mb-3">
          <h3 className="text-[15px] font-extrabold tracking-tight px-0.5">10월 마케팅 예정</h3>
          <p className="text-[12px] text-body mt-1 px-0.5">입점 9월 중 · 마케팅은 10월로 순차 진행</p>
        </div>

        {OCTOBER_BRANDS.map((p, i) => (
          <PipelineRow key={p.name} p={p} rank={i + 1} />
        ))}
      </section>
    </>
  )
}
