import {
  CONTRACT_BRANDS,
  GUIDE_PREP,
  MATCH_PREP,
  PIPELINE_BRANDS,
  LEAD_RANGE,
  type BrandTier,
} from '@/lib/brand-pipeline'

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

export default function BrandPipeline() {
  return (
    <>
      {/* ── 계약 완료 ── */}
      <section id="s-brands" className="mb-10 scroll-mt-20">
        <SectionHeader
          no="02"
          title="계약 완료 브랜드"
          sub="최초 미팅부터 마케팅 시작까지 통상 14~20일이 걸립니다. 가이드 제작과 인플루언서 매칭이 이 구간에 포함됩니다."
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
            미팅에서 마케팅 시작까지 <b className="text-azure-deep">통상 {LEAD_RANGE.min}~{LEAD_RANGE.max}일</b>이 걸립니다.
            계약 후에도 브랜드 톤에 맞는 콘텐츠 가이드를 만들고, 그 가이드에 맞는 인플루언서를 찾아 일정을 조율합니다.
          </p>
        </div>

        <div className="glass flex gap-3.5 flex-wrap px-5 py-2.5 mb-2.5 text-[11px] text-body">
          {[
            ['#9ED2FF', '#0B47B4', '미팅 → 계약'],
            ['#6FBFFF', '#08326E', '계약 → 가이드 착수'],
            ['#3E93F2', '#fff', '가이드 제작'],
            ['#1868F0', '#fff', '인플루언서 매칭'],
            ['#0B47B4', '#fff', '일정 조율 → 시작'],
          ].map(([bg, fg, label]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <i className="w-2.5 h-2 rounded-[2px] inline-block" style={{ background: bg, color: fg }} />
              {label}
            </span>
          ))}
        </div>

        {CONTRACT_BRANDS.map(b => (
          <div key={b.name} className="glass px-5 py-4 mb-2">
            <div className="flex items-baseline gap-2.5 flex-wrap mb-2.5">
              <span className="text-[15px] font-extrabold tracking-tight">{b.name}</span>
              <span className="num text-[10.5px] text-slate">{b.meta}</span>
              <span className="num text-[13px] font-semibold text-azure-deep ml-auto">
                {b.budget}
                <small className="text-[10px] text-slate font-normal ml-1.5">{b.days}일 구간</small>
              </span>
            </div>
            <div className="flex gap-0.5 h-6 rounded overflow-hidden bg-mist">
              {b.segs.map((n, i) => (
                <div key={i} className={`grid place-items-center num text-[9.5px] font-medium whitespace-nowrap overflow-hidden ${SEG_CLASS[i]}`}
                  style={{ flex: n }}>
                  {n}일
                </div>
              ))}
            </div>
            <div className="flex justify-between num text-[9.5px] text-slate mt-1.5">
              <span>최초 미팅</span>
              <span>{b.status}</span>
              <span>마케팅 시작</span>
            </div>
          </div>
        ))}
      </section>

      {/* ── 준비 중 ── */}
      <section id="s-prep" className="mb-10 scroll-mt-20">
        <SectionHeader
          no="03"
          title="준비 중"
          sub="아직 콘텐츠로 나오지 않았지만 진행 중인 작업입니다. 가이드가 확정돼야 매칭이 본격화됩니다."
          right={`가이드 ${GUIDE_PREP.length}건 · 매칭 ${MATCH_PREP.length}건`}
        />

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
                    {m.done} / {m.total}건
                  </span>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(m.total, 12) }).map((_, i) => (
                    <i key={i} className={`flex-1 h-1.5 rounded-[2px] ${i < m.done ? 'bg-azure' : 'bg-mist'}`} />
                  ))}
                </div>
                <div className="flex justify-between num text-[10px] text-slate mt-1">
                  <span>{m.note}</span>
                  <span>{m.eta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 영업 예정 ── */}
      <section id="s-pipeline" className="mb-10 scroll-mt-20">
        <SectionHeader
          no="04"
          title="영업 예정 브랜드"
          sub="아직 계약 전 단계입니다. 예산 규모가 큰 순이며, 확정된 해브블루·옵티팜 등은 위 계약 섹션에 있습니다."
          right={`${PIPELINE_BRANDS.length}개사`}
        />

        {PIPELINE_BRANDS.map((p, i) => (
          <div key={p.name} className="glass px-5 py-3.5 mb-2 flex items-center gap-4 flex-wrap hover:border-sky transition-colors">
            <span className={`num text-[19px] font-semibold w-7 flex-none tracking-tight ${i === 0 ? 'text-azure' : 'text-mist'}`}>
              {String(i + 1).padStart(2, '0')}
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
        ))}
      </section>
    </>
  )
}
