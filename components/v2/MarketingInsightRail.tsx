'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'

interface QA {
  question: string
  answer: string | null
  links?: Links
  error?: boolean
}

async function postInsight(body: Record<string, unknown>) {
  const r = await fetch('/api/insight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d.error || '요약을 불러오지 못했습니다')
  return d as { text: string; links?: Links; updatedAt: number }
}

type Links = Record<string, { content: string | null; profile: string | null }>

/** 문장 속 인플루언서 이름 → 콘텐츠 링크 + 프로필 링크 */
function LinkedText({ text, links }: { text: string; links: Links }) {
  const names = Object.keys(links).filter(n => n.length >= 2 && !/^[\d\s.,]+$/.test(n) && text.includes(n)).sort((a, b) => b.length - a.length)
  if (!names.length) return <>{text}</>
  const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'g'))
  const seen = new Set<string>()
  return (
    <>
      {parts.map((part, i): ReactNode => {
        const link = links[part]
        if (!link) return part
        const first = !seen.has(part)
        seen.add(part)
        return (
          <span key={i} className="whitespace-nowrap">
            {link.content ? (
              <a href={link.content} target="_blank" rel="noreferrer" className="font-bold text-[#2f5fd8] hover:underline">
                {part}
              </a>
            ) : (
              <b>{part}</b>
            )}
            {first && link.profile && (
              <a
                href={link.profile}
                target="_blank"
                rel="noreferrer"
                title="프로필 보기"
                className="ml-0.5 text-[10px] font-bold text-[#8b5cf6] bg-[#f3eeff] hover:bg-[#e9e0ff] rounded px-1 py-px align-[1px]"
              >
                프로필
              </a>
            )}
          </span>
        )
      })}
    </>
  )
}

/** 답변 렌더 — 줄 단위로 ## 제목 · 표 · 불릿 · 문단 묶기 */
function AnswerBody({ text, links }: { text: string; links: Links }) {
  type Block = { kind: 'h' | 'table' | 'ul' | 'p'; lines: string[] }
  const blocks: Block[] = []
  for (const raw of text.replace(/\*\*/g, '').split('\n')) {
    const l = raw.trim()
    if (!l) { blocks.push({ kind: 'p', lines: [] }); continue }
    const kind: Block['kind'] = l.startsWith('#') ? 'h' : l.startsWith('|') ? 'table' : /^[-•*]\s/.test(l) ? 'ul' : 'p'
    const last = blocks[blocks.length - 1]
    if (last && last.kind === kind && kind !== 'h' && last.lines.length > 0) last.lines.push(l)
    else blocks.push({ kind, lines: [l] })
  }
  return (
    <div className="flex flex-col gap-2">
      {blocks.filter(b => b.lines.length > 0).map((b, i) => {
        if (b.kind === 'h') {
          return (
            <div key={i} className="text-[13px] font-extrabold text-[#1a1d2e] pb-1.5 border-b border-[#eee6d6]">
              {b.lines[0].replace(/^#+\s*/, '')}
            </div>
          )
        }
        if (b.kind === 'table') {
          const rows = b.lines
            .filter(l => !/^\|[\s:|-]+\|?$/.test(l))
            .map(l => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()))
          const [head, ...body] = rows
          return (
            <div key={i} className="overflow-x-auto -mx-1">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr>{head.map((h, j) => <th key={j} className="text-left font-bold text-[#9a9486] px-1 py-1 border-b border-[#eee6d6] whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {body.map((r, k) => (
                    <tr key={k} className="border-b border-[#f4efe3] last:border-b-0">
                      {r.map((c, j) => (
                        <td key={j} className={`px-1 py-1 ${/^[~\d,.%]+$/.test(c) ? 'text-right font-semibold whitespace-nowrap' : ''}`}>
                          <LinkedText text={c} links={links} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        if (b.kind === 'ul') {
          return (
            <ul key={i} className="flex flex-col gap-1">
              {b.lines.map((l, j) => (
                <li key={j} className="flex gap-1.5">
                  <span className="mt-[7px] w-1 h-1 rounded-full bg-[#8b5cf6] shrink-0" />
                  <span><LinkedText text={l.replace(/^[-•*]\s*/, '')} links={links} /></span>
                </li>
              ))}
            </ul>
          )
        }
        return <p key={i}><LinkedText text={b.lines.join(' ')} links={links} /></p>
      })}
    </div>
  )
}

/** 브라우저에도 30분 저장 — 페이지 새로고침해도 API 안 부름 */
const SUMMARY_TTL = 30 * 60_000
type SavedSummary = { text: string; links?: Links; updatedAt: number }
const summaryKey = (brand?: string | null) => `owm-insight-summary:${brand ?? '*'}`
function readSaved(brand?: string | null): SavedSummary | null {
  try {
    const d = JSON.parse(localStorage.getItem(summaryKey(brand)) || 'null') as SavedSummary | null
    return d && Date.now() - d.updatedAt < SUMMARY_TTL ? d : null
  } catch {
    return null
  }
}
function save(brand: string | null | undefined, d: SavedSummary) {
  try { localStorage.setItem(summaryKey(brand), JSON.stringify(d)) } catch {}
}

function kstLabel(ms: number) {
  return new Date(ms + 9 * 3600_000).toISOString().slice(5, 16).replace('-', '.').replace('T', ' ')
}

const WAIT_TIPS = [
  '💡 알고 계셨나요? 샤오홍슈는 저장 수가 구매 의향을 잘 보여줘요',
  '🔎 이런 질문도 해보세요: "명동점 조회수 1위 인플루언서는?"',
  '📊 이런 질문도 해보세요: "이번 달 인게이지가 가장 높은 채널은?"',
  '✨ 알고 계셨나요? 시딩과 방문 성과를 나눠서 비교할 수 있어요',
  '🛍️ 이런 질문도 해보세요: "가장 많이 노출된 상품은?"',
  '💬 궁금한 건 무엇이든 질문하면 답변해드려요',
  '📈 이런 질문도 해보세요: "지난달 대비 성과가 오른 인원은?"',
]

/** 단계별 진행 문구 + 기다리는 동안 팁·추천 질문 순환 */
function Loading({ steps = ['데이터를 불러오는 중이에요'], tips = false }: { steps?: string[]; tips?: boolean }) {
  const [i, setI] = useState(0)
  const [t, setT] = useState(() => Math.floor(Math.random() * WAIT_TIPS.length))
  useEffect(() => {
    const a = setInterval(() => setI(v => Math.min(v + 1, steps.length - 1)), 1500)
    const b = tips ? setInterval(() => setT(v => (v + 1) % WAIT_TIPS.length), 2800) : undefined
    return () => { clearInterval(a); if (b) clearInterval(b) }
  }, [steps.length, tips])
  return (
    <span className="flex flex-col gap-2 text-[#9a9486]">
      <style>{`@keyframes owmTipIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes owmDot{0%,80%,100%{opacity:.25}40%{opacity:1}}`}</style>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 rounded-full border-2 border-[#e6dfcf] border-t-[#8b5cf6] animate-spin" />
        <span key={i} style={{ animation: 'owmTipIn .35s ease-out' }}>{steps[i]}</span>
        <span className="inline-flex gap-0.5">
          {[0, 1, 2].map(d => (
            <span key={d} className="w-1 h-1 rounded-full bg-[#8b5cf6]" style={{ animation: `owmDot 1.2s ${d * 0.2}s infinite` }} />
          ))}
        </span>
      </span>
      {tips && (
        <span
          key={t}
          className="block text-[11px] leading-relaxed text-[#6b6558] bg-white border border-[#efe7f9] rounded-lg px-2.5 py-2"
          style={{ animation: 'owmTipIn .45s ease-out' }}
        >
          {WAIT_TIPS[t]}
        </span>
      )}
    </span>
  )
}

/** 질문 → 진행 문구 */
function questionSteps(q: string): string[] {
  const topic = q.replace(/[?？!.\s]+$/, '').slice(0, 16)
  return [`'${topic}' 관련 콘텐츠를 찾는 중이에요`, '성과 데이터를 비교하는 중이에요', '답변을 정리하는 중이에요']
}

/** 우측 레일 — 최근 30일 마케팅 집행 요약 (Claude) + 직접 질문 */
export default function MarketingInsightRail({ partnerBrand }: { partnerBrand?: string | null }) {
  const [summary, setSummary] = useState<string | null>(null)
  const [links, setLinks] = useState<Links>({})
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [qa, setQa] = useState<QA[]>([])
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])
  // 새 질문·답변 시 그 질문 위치로 스크롤
  const qaBox = useRef<HTMLDivElement>(null)
  const lastQa = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const box = qaBox.current, el = lastQa.current
    if (!box || !el) return
    box.scrollTo({ top: el.offsetTop, behavior: 'smooth' })
  }, [qa, expanded])
  const asking = qa.some(q => q.answer === null && !q.error)

  const load = useCallback(
    (refresh: boolean) => {
      const saved = readSaved(partnerBrand)
      if (saved) {
        // 30분 안이면 저장본 그대로
        setSummary(saved.text)
        setLinks(saved.links ?? {})
        setUpdatedAt(saved.updatedAt)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      postInsight({ brand: partnerBrand ?? null, refresh })
        .then(d => {
          save(partnerBrand, d)
          setSummary(d.text)
          setLinks(d.links ?? {})
          setUpdatedAt(d.updatedAt)
        })
        .catch(e => setError(e instanceof Error ? e.message : '요약을 불러오지 못했습니다'))
        .finally(() => setLoading(false))
    },
    [partnerBrand],
  )

  useEffect(() => load(false), [load])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || asking) return
    setQuestion('')
    setQa(prev => [...prev, { question: q, answer: null }])
    postInsight({ brand: partnerBrand ?? null, question: q })
      .then(d => setQa(prev => prev.map(x => (x.question === q && x.answer === null ? { ...x, answer: d.text, links: d.links } : x))))
      .catch(err =>
        setQa(prev =>
          prev.map(x =>
            x.question === q && x.answer === null
              ? { ...x, answer: err instanceof Error ? err.message : '답변을 불러오지 못했습니다', error: true }
              : x,
          ),
        ),
      )
  }

  const header = (big: boolean) => (
    <div className="flex items-center gap-2">
      <div className={`${big ? 'text-[16px] font-extrabold' : 'text-[12.5px] font-bold'} text-[#1a1d2e]`}>더 궁금한 점이 있으신가요?</div>
      <button
        type="button"
        onClick={() => setExpanded(!big)}
        className="ml-auto text-[11px] font-bold text-[#6b6558] bg-[#f7f4ec] hover:text-[#1a1d2e] rounded-full px-2.5 py-1 transition-colors whitespace-nowrap"
      >
        {big ? '✕ 닫기' : '⤢ 크게 보기'}
      </button>
    </div>
  )
  const chat = (big: boolean) => (
    <>
      {(qa.length > 0 || big) && (
        <div ref={qaBox} className={`relative flex flex-col gap-2.5 mt-2.5 ${big ? 'flex-1 min-h-0' : 'max-h-[320px]'} overflow-y-auto pr-1`}>
          {qa.map((x, i) => (
            <div key={i} ref={i === qa.length - 1 ? lastQa : undefined} className="flex flex-col gap-1.5">
              <div className={`self-end max-w-[90%] ${big ? 'text-[14px]' : 'text-[11.5px]'} text-white bg-[#4f7cff] rounded-xl rounded-br-sm px-2.5 py-1.5`}>
                {x.question}
              </div>
              <div
                className={`self-start max-w-[95%] ${big ? 'text-[14px]' : 'text-[11.5px]'} leading-relaxed rounded-xl rounded-bl-sm px-3 py-2.5 ${
                  x.error ? 'text-[#b42318] bg-[#fef2f2]' : 'text-[#2a2d3e] bg-[#fbf9f4]'
                }`}
              >
                {x.answer === null ? <Loading steps={questionSteps(x.question)} tips /> : x.error ? x.answer : <AnswerBody text={x.answer} links={x.links ?? links} />}
              </div>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="flex gap-1.5 mt-2.5">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="예: 시딩 성과가 제일 좋은 채널은?"
          maxLength={500}
          className="flex-1 min-w-0 text-[12px] text-[#1a1d2e] placeholder-[#a9a294] bg-[#fbf9f4] border border-[#f0e9da] rounded-[10px] px-2.5 py-2 focus:outline-none focus:border-[#4f7cff]"
        />
        <button
          type="submit"
          disabled={!question.trim() || asking}
          className="text-[12px] font-bold text-white bg-[#4f7cff] hover:bg-[#3f6cef] disabled:opacity-40 rounded-[10px] px-3 transition-colors"
        >
          질문
        </button>
      </form>
    </>
  )

  const bullets = (summary ?? '')
    .split('\n')
    .map(l => l.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)

  return (
    <aside className="flex-1 min-w-[280px] max-w-full lg:max-w-[340px] bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4 self-start">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
        <span className="text-[14px] font-extrabold text-[#1a1d2e]">최근 30일 마케팅 요약</span>
        <span className="text-[9.5px] font-extrabold tracking-wider text-[#7c3aed] bg-[#f3e8ff] px-1.5 py-0.5 rounded-[6px]">BETA</span>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading}
          className="ml-auto text-[11px] font-bold text-[#4f7cff] bg-[#eef3ff] hover:bg-[#e0ebff] disabled:opacity-50 rounded-full px-2.5 py-1 transition-colors whitespace-nowrap"
        >
          {loading ? '요약 중…' : '↻ 다시 요약'}
        </button>
      </div>
      {updatedAt && <div className="text-[11px] text-[#9a9486] mt-1">{kstLabel(updatedAt)} 기준</div>}

      <div className="mt-3">
        {error ? (
          <div className="py-6 text-center text-[12px] text-[#9a9486]">{error}</div>
        ) : loading && !summary ? (
          <div className="py-6 flex justify-center text-[12px]">
            <Loading steps={['콘텐츠를 모으는 중이에요', '최근 30일 성과를 요약하는 중이에요']} />
          </div>
        ) : (
          <ul className={`flex flex-col gap-2 ${loading ? 'opacity-50' : ''}`}>
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-[#2a2d3e]">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#8b5cf6] shrink-0" />
                <span>
                  <LinkedText text={b} links={links} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="h-px bg-[#f4efe3] my-3.5" />

      {expanded ? (
        <div className="text-[11.5px] text-[#9a9486] py-2">크게 보기로 대화 중이에요</div>
      ) : (
        <>
          {header(false)}
          {chat(false)}
        </>
      )}
      {expanded && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setExpanded(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-[860px] h-[85vh] flex flex-col p-5"
            onClick={e => e.stopPropagation()}
          >
            {header(true)}
            {chat(true)}
          </div>
        </div>
      )}
    </aside>
  )
}
