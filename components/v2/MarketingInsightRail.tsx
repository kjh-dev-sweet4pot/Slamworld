'use client'

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'

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
  const names = Object.keys(links).filter(n => n.length >= 2 && text.includes(n)).sort((a, b) => b.length - a.length)
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

function kstLabel(ms: number) {
  return new Date(ms + 9 * 3600_000).toISOString().slice(5, 16).replace('-', '.').replace('T', ' ')
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
  const asking = qa.some(q => q.answer === null && !q.error)

  const load = useCallback(
    (refresh: boolean) => {
      setLoading(true)
      setError(null)
      postInsight({ brand: partnerBrand ?? null, refresh })
        .then(d => {
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

  const bullets = (summary ?? '')
    .split('\n')
    .map(l => l.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)

  return (
    <aside className="flex-1 min-w-[280px] max-w-full lg:max-w-[340px] bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4 self-start">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
        <span className="text-[14px] font-extrabold text-[#1a1d2e]">최근 30일 마케팅 요약</span>
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
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-3 rounded bg-[#f4efe3] animate-pulse" style={{ width: `${90 - i * 12}%` }} />
            ))}
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

      <div className="text-[12.5px] font-bold text-[#1a1d2e]">더 궁금한 점이 있으신가요?</div>
      {qa.length > 0 && (
        <div className="flex flex-col gap-2.5 mt-2.5 max-h-[320px] overflow-y-auto pr-1">
          {qa.map((x, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="self-end max-w-[90%] text-[11.5px] text-white bg-[#4f7cff] rounded-xl rounded-br-sm px-2.5 py-1.5">
                {x.question}
              </div>
              <div
                className={`self-start max-w-[95%] text-[11.5px] leading-relaxed rounded-xl rounded-bl-sm px-2.5 py-1.5 whitespace-pre-wrap ${
                  x.error ? 'text-[#b42318] bg-[#fef2f2]' : 'text-[#2a2d3e] bg-[#fbf9f4]'
                }`}
              >
                {x.answer === null ? '답변 작성 중…' : x.error ? x.answer : <LinkedText text={x.answer} links={x.links ?? links} />}
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
    </aside>
  )
}
