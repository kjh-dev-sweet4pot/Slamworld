'use client'

import { useContext, useEffect, useMemo, useState } from 'react'
import type { Content } from '@/lib/types'
import type { SeedingGift } from '@/app/api/seeding-gifts/route'
import { contentMatchesBrand } from '@/lib/brand-content'
import { contentViews, contentViewsDisplay } from '@/lib/content-views'
import { contentPostedDate, inPerformanceMonth } from '@/lib/posted-date'
import { GlobalPeriodContext } from '@/components/v2/SectionPeriodScope'
import { REQUEST_CARDS, REQUEST_CARDS_SAMPLE, type RequestCard } from '@/lib/request-cards'

type Range = 'global' | 'week' | 'month'

const KST = 9 * 3600_000
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10)

/** 이번 주(월~일) / 이번 달 — KST 기준 [시작, 끝] */
function rangeBounds(range: 'week' | 'month'): [string, string] {
  const now = Date.now() + KST
  const d = new Date(now)
  if (range === 'month') {
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth()
    return [ymd(Date.UTC(y, m, 1)), ymd(Date.UTC(y, m + 1, 0))]
  }
  const dow = (d.getUTCDay() + 6) % 7 // 월=0
  const mon = now - dow * 86400_000
  return [ymd(mon), ymd(mon + 6 * 86400_000)]
}

const fmtDate = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`

function fmtKst(iso: string) {
  const d = new Date(Date.parse(iso) + KST)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}

function SectionShell({
  no,
  title,
  badge,
  right,
  children,
}: {
  no: number
  title: string
  badge?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mt-4 bg-white/85 border border-[#f0e6d2] rounded-2xl p-4 sm:p-5 shadow-[0_2px_10px_rgba(30,41,59,0.04)]">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-[#1a1d2e] text-white text-[12px] font-extrabold grid place-items-center">{no}</span>
        <h2 className="text-[16px] font-extrabold text-[#1a1d2e]">{title}</h2>
        {badge && <span className="text-[11px] font-bold rounded-md px-1.5 py-0.5 bg-[#eef3ff] text-[#4f7cff]">{badge}</span>}
        <div className="ml-auto">{right}</div>
      </div>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[#e6dfcf] bg-[#fdfaf3] py-8 text-center text-[13px] text-[#8a8270]">
      {children}
    </div>
  )
}

const PAGE = 8

function ContentGrid({ list }: { list: Content[] }) {
  const [shown, setShown] = useState(PAGE)
  useEffect(() => setShown(PAGE), [list])
  if (list.length === 0) return <Empty>이 기간에 올라온 콘텐츠가 아직 없어요</Empty>
  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {list.slice(0, shown).map(c => {
        const posted = contentPostedDate(c)
        const v = contentViewsDisplay(c)
        return (
          <a
            key={c.id}
            href={c.upload_url ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-[#f0e6d2] bg-white p-3 hover:border-[#4f7cff] transition-colors"
          >
            <div className="flex items-center gap-2 text-[11px] text-[#8a8270]">
              <span className="font-bold text-[#6b6558]">{c.channel}</span>
              <span>· {c.location}</span>
              {posted && <span className="ml-auto">{fmtDate(posted)}</span>}
            </div>
            <div className="mt-1 text-[14px] font-extrabold text-[#1a1d2e] truncate">{c.influencer_name}</div>
            <div className="text-[12px] text-[#6b6558] truncate">{c.brands || c.product || '—'}</div>
            <div className="mt-1.5 text-[12px] font-bold text-[#4f7cff]">조회수 {v.value == null ? '—' : `${v.estimated ? '~' : ''}${v.value.toLocaleString()}`}</div>
          </a>
        )
      })}
    </div>
    {list.length > shown && (
      <button
        type="button"
        onClick={() => setShown(n => n + PAGE * 2)}
        className="mt-3 w-full rounded-xl border border-[#eee6d6] bg-white py-2 text-[12.5px] font-bold text-[#6b6558] hover:border-[#4f7cff]"
      >
        더보기 ({shown}/{list.length})
      </button>
    )}
    </>
  )
}

function RangeToggle({
  value,
  onChange,
  globalLabel,
}: {
  value: Range
  onChange: (r: Range) => void
  globalLabel: string
}) {
  const label: Record<Range, string> = { global: globalLabel, week: '이번 주', month: '이번 달' }
  return (
    <div className="inline-flex rounded-full bg-white border border-[#eee6d6] p-1 text-[12.5px] font-bold">
      {(['global', 'week', 'month'] as const).map(r => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`px-3 py-1 rounded-full ${value === r ? 'bg-[#1a1d2e] text-white' : 'text-[#6b6558]'}`}
        >
          {label[r]}
        </button>
      ))}
    </div>
  )
}

/* ── 섹션 3: 요청사항 카드 + 무상 시딩 체크 ── */

const STATUS_TONE: Record<string, string> = {
  접수: 'bg-[#f7f4ec] text-[#6b6558]',
  진행중: 'bg-[#fff1e6] text-[#f97316]',
  완료: 'bg-[#e8f7ee] text-[#16a34a]',
}

function RequestCardView({
  card,
  gifts,
  onToggle,
}: {
  card: RequestCard
  gifts: Map<string, SeedingGift>
  onToggle: (card: RequestCard, handle: string, given: boolean) => void
}) {
  const handles = card.handles ?? []
  const given = handles.filter(h => gifts.has(`${card.id}|${h}`)).length
  return (
    <div className="rounded-xl border border-[#f0e6d2] bg-white p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <div className="text-[11px] text-[#8a8270]">{card.requester} 요청</div>
          <div className="text-[14px] font-extrabold text-[#1a1d2e]">{card.title}</div>
        </div>
        <span className={`ml-auto text-[11px] font-bold rounded-md px-1.5 py-0.5 whitespace-nowrap ${STATUS_TONE[card.status]}`}>
          {card.status}
        </span>
      </div>
      {card.note && <p className="mt-1 text-[12px] text-[#6b6558]">{card.note}</p>}
      {handles.length > 0 && (
        <div className="mt-3">
          <div className="text-[11.5px] font-bold text-[#6b6558] mb-1.5">
            방문 예정 인플루언서 · 지급 {given}/{handles.length}
          </div>
          <ul className="space-y-1">
            {handles.map(h => {
              const g = gifts.get(`${card.id}|${h}`)
              return (
                <li key={h}>
                  <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#fdfaf3] cursor-pointer text-[13px]">
                    <input
                      type="checkbox"
                      checked={!!g}
                      onChange={e => onToggle(card, h, e.target.checked)}
                      className="accent-[#4f7cff]"
                    />
                    <span className="font-bold text-[#1a1d2e]">@{h}</span>
                    <span className="ml-auto text-[11.5px] text-[#8a8270]">{g ? `${fmtKst(g.given_at)} 줬음` : '미지급'}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function RequestSection() {
  const [gifts, setGifts] = useState<SeedingGift[]>([])
  const [missing, setMissing] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/seeding-gifts', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setGifts(d.data ?? [])
        setMissing(!!d.missing)
      })
      .catch(() => {})
  }, [])

  const giftMap = useMemo(() => new Map(gifts.map(g => [`${g.card_id}|${g.handle}`, g])), [gifts])

  const onToggle = async (card: RequestCard, handle: string, given: boolean) => {
    const prev = gifts
    const optimistic = given
      ? [{ card_id: card.id, handle, given_at: new Date().toISOString() }, ...gifts]
      : gifts.filter(g => !(g.card_id === card.id && g.handle === handle))
    setGifts(optimistic)
    const res = await fetch('/api/seeding-gifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: card.id, handle, given }),
    }).catch(() => null)
    if (!res?.ok) return setGifts(prev)
    const d = await res.json()
    if (given && d.data) setGifts(cur => [d.data, ...cur.filter(g => !(g.card_id === card.id && g.handle === handle))])
  }

  const key = q.trim().replace(/^@/, '').toLowerCase()
  const hits = key ? gifts.filter(g => g.handle.includes(key)) : []
  const titleOf = (id: string) => REQUEST_CARDS.find(c => c.id === id)?.title ?? id

  return (
    <SectionShell no={3} title="요청사항 실행 현황" badge={REQUEST_CARDS_SAMPLE ? '샘플 데이터' : undefined}>
      {REQUEST_CARDS_SAMPLE && (
        <p className="mb-3 text-[12px] text-[#b45309]">※ 요청 내용 확정 전이라 화면 예시용 샘플이에요.</p>
      )}
      {missing && <p className="mb-3 text-[12px] text-[#e03131]">※ 체크 저장 테이블이 아직 없어요 (seeding_gifts).</p>}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="인플루언서 ID 검색 (영문·숫자)"
          className="w-full sm:w-72 rounded-full border border-[#eee6d6] bg-white px-4 py-1.5 text-[13px] outline-none focus:border-[#4f7cff]"
        />
        {key && (
          <div className="text-[12.5px] text-[#1a1d2e]">
            {hits.length === 0
              ? '지급 기록 없음'
              : hits.map(g => (
                  <span key={`${g.card_id}|${g.handle}`} className="mr-3">
                    <b>@{g.handle}</b> · {fmtKst(g.given_at)} · {titleOf(g.card_id)}
                  </span>
                ))}
          </div>
        )}
      </div>

      {REQUEST_CARDS.length === 0 ? (
        <Empty>등록된 요청사항이 없어요</Empty>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {REQUEST_CARDS.map(card => (
            <RequestCardView key={card.id} card={card} gifts={giftMap} onToggle={onToggle} />
          ))}
        </div>
      )}
    </SectionShell>
  )
}

/* ── WORK 홈 섹션 1~4 ── */

export default function WorkHomeSections({ contents }: { contents: Content[] }) {
  const global = useContext(GlobalPeriodContext)
  const [range, setRange] = useState<Range>('global')
  // 상단 기간을 바꾸면 다시 상단 기준으로
  useEffect(() => setRange('global'), [global?.mode, global?.month])
  const monthly = global?.mode === 'monthly'
  const globalLabel = monthly ? `${Number(global!.month.slice(5, 7))}월` : '누적'
  const [from, to] = range === 'global' ? ['', ''] : rangeBounds(range)

  const inRange = useMemo(
    () =>
      contents
        .filter(c => {
          if (!c.upload_url) return false
          const d = contentPostedDate(c)
          if (range === 'global') return !monthly || inPerformanceMonth(d, global!.month)
          return !!d && d >= from && d <= to
        })
        .sort((a, b) => contentViews(b) - contentViews(a)),
    [contents, range, monthly, global, from, to],
  )
  const optipharm = useMemo(() => inRange.filter(c => contentMatchesBrand(c.brands, '옵티팜')), [inRange])

  const periodLabel = range === 'global' ? '상단 기간 기준' : `${fmtDate(from)} ~ ${fmtDate(to)}`
  const toggle = (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-[#8a8270]">{periodLabel}</span>
      <RangeToggle value={range} onChange={setRange} globalLabel={globalLabel} />
    </div>
  )

  return (
    <div id="section-work-home">
      <SectionShell no={1} title={`옵티팜 콘텐츠 · ${optipharm.length}건`} badge="by 브랜드슬램" right={toggle}>
        <ContentGrid list={optipharm} />
      </SectionShell>

      <SectionShell no={2} title={`전체 브랜드사 콘텐츠 · ${inRange.length}건`} right={toggle}>
        <ContentGrid list={inRange} />
      </SectionShell>

      <RequestSection />

      <SectionShell no={4} title="자체 약사 콘텐츠" badge="by 브랜드슬램">
        <Empty>약사 콘텐츠 준비 중이에요 · 곧 공개됩니다</Empty>
      </SectionShell>
    </div>
  )
}
