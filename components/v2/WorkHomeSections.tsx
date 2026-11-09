'use client'

import { useContext, useEffect, useMemo, useState } from 'react'
import type { Content } from '@/lib/types'
import type { RequestItem, Requester } from '@/app/api/requests/route'
import { useAccess } from '@/lib/access-context'
import { contentMatchesBrand } from '@/lib/brand-content'
import { contentViews, contentViewsDisplay } from '@/lib/content-views'
import { contentPostedDate, inPerformanceMonth } from '@/lib/posted-date'
import { GlobalPeriodContext } from '@/components/v2/SectionPeriodScope'
import type { PendingPublish } from '@/app/api/pending-publish/route'

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
  pending,
  right,
  note,
  className = 'mt-4',
  children,
}: {
  no: number
  title: string
  badge?: string
  /** 발행 예정 건수 (null = 불러오는 중) */
  pending?: number | null
  right?: React.ReactNode
  /** 제목 아래 설명 */
  note?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={`${className} min-w-0 bg-white border border-[#f2ebdd] rounded-[6px] p-[18px] shadow-[0_4px_16px_rgba(30,41,59,0.06)]`}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[13px] font-extrabold text-[#3557d6]">{no}</span>
        <h3 className="m-0 text-[18px] font-extrabold text-[#1a1d2e]">{title}</h3>
        {pending !== undefined && (
          <span className="text-[12px] font-extrabold rounded-full px-[9px] py-[3px] bg-[#e6edff] text-[#2541a8]">
            발행 예정 {pending == null ? '…' : `${pending}건`}
          </span>
        )}
        {badge && <span className="text-[11px] rounded-full px-2 py-[3px] bg-[#f6f0e3] text-[#6b6558]">{badge}</span>}
        <div className="ml-auto">{right}</div>
      </div>
      {note && <p className="-mt-2 mb-3 text-[10.5px] text-[#6b6558]">{note}</p>}
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[6px] border border-dashed border-[#d8ccb2] py-8 text-center text-[13px] text-[#6b6558]">
      {children}
    </div>
  )
}

const PAGE = 8
const PENDING_NOTE = '발행 예정 = 방문 예정 + 최근 1달 방문 완료 중 콘텐츠 링크 없는 건'

type PendingItem = PendingPublish['items'][number]

function ContentGrid({ list, pending = [], photos }: { list: Content[]; pending?: PendingItem[]; photos?: Map<string, string> }) {
  const [shown, setShown] = useState(PAGE)
  useEffect(() => setShown(PAGE), [list, pending])
  const total = list.length + pending.length
  if (total === 0) return <Empty>이 기간에 올라온 콘텐츠가 아직 없어요</Empty>
  // 발행 예정은 실제 콘텐츠 뒤에 흐리게 붙인다
  const pendingShown = pending.slice(0, Math.max(0, shown - list.length))
  return (
    <>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {list.slice(0, shown).map(c => {
        const posted = contentPostedDate(c)
        const v = contentViewsDisplay(c)
        return (
          <a
            key={c.id}
            href={c.upload_url ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="group block min-w-0 text-[#1a1d2e] no-underline"
          >
            {/* 썸네일 자리 — 채널·인플루언서·브랜드 */}
            <Thumb c={c} />
            <div className="text-[10.5px] text-[#6b6558] mt-[5px] truncate">
              {posted ? fmtDate(posted) : '—'} · {c.location}
            </div>
            <div className="text-[12px] font-bold">조회수 {v.value == null ? '—' : `${v.estimated ? '~' : ''}${v.value.toLocaleString()}`}</div>
          </a>
        )
      })}
      {pendingShown.map((p, i) => (
        <PendingCard key={`p${i}`} p={p} photo={p.photo ?? photos?.get(p.name.toLowerCase())} />
      ))}
    </div>
    {total > shown && (
      <div className="text-center mt-3">
        <button
          type="button"
          onClick={() => setShown(n => n + PAGE * 2)}
          className="border border-[#e3d9c4] bg-white text-[12px] font-medium px-4 py-[7px] rounded-full text-[#1a1d2e] hover:border-[#3557d6]"
        >
          더보기 ({shown}/{total})
        </button>
      </div>
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
    <div className="inline-flex gap-[3px] rounded-[6px] bg-[#efe6d3] p-[3px] text-[12px]">
      {(['global', 'week', 'month'] as const).map(r => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`px-3 py-1.5 rounded-[6px] ${value === r ? 'bg-white font-bold text-[#1a1d2e]' : 'font-medium text-[#4a4538]'}`}
        >
          {label[r]}
        </button>
      ))}
    </div>
  )
}

/* ── 섹션 3: 요청사항 (C-level · 실무자 → 우리 회사) ── */

const REQUESTER_TONE: Record<Requester, string> = {
  'C-level': 'bg-[#eef2ff] text-[#2f5fd8]',
  실무자: 'bg-[#fff1e6] text-[#c2410c]',
}

function RequestSection() {
  const { level } = useAccess()
  const canEdit = level === 'full'
  const [items, setItems] = useState<RequestItem[]>([])
  const [missing, setMissing] = useState(false)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [requesterName, setRequesterName] = useState('')
  const [requester, setRequester] = useState<Requester>('C-level')
  const [saving, setSaving] = useState(false)
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    fetch('/api/requests', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setItems(d.data ?? [])
        setMissing(!!d.missing)
      })
      .catch(() => {})
  }, [])

  const add = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, requester, requester_name: requesterName }),
    }).catch(() => null)
    setSaving(false)
    setAuthError(res?.status === 401)
    if (!res?.ok) return
    const d = await res.json()
    setItems(cur => [d.data, ...cur])
    setTitle('')
    setBody('')
    setRequesterName('')
    setOpen(false)
  }

  const remove = async (id: string) => {
    const prev = items
    setItems(cur => cur.filter(i => i.id !== id))
    const res = await fetch(`/api/requests?id=${id}`, { method: 'DELETE' }).catch(() => null)
    setAuthError(res?.status === 401)
    if (!res?.ok) setItems(prev)
  }

  return (
    <SectionShell no={3} title="요청사항" className="">
      <p className="-mt-2 mb-3 text-[11px] text-[#6b6558]">C-level · 실무자가 브랜드슬램에 요청한 내용이에요.</p>
      {authError && <p className="mb-3 text-[12px] text-[#e03131]">※ 로그인이 만료됐어요. 로그아웃 후 다시 로그인해 주세요.</p>}
      {missing && <p className="mb-3 text-[12px] text-[#e03131]">※ 요청사항 테이블이 아직 없어요 (requests).</p>}

      {canEdit && (
        <div className="mb-3">
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-full border border-[#e3d9c4] bg-white px-4 py-[7px] text-[12px] font-bold text-[#1a1d2e] hover:border-[#3557d6]"
            >
              + 요청 추가
            </button>
          ) : (
            <div className="rounded-[6px] border border-[#f0e9da] bg-white p-3 space-y-2">
              <div className="flex gap-1.5">
                {(['C-level', '실무자'] as Requester[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRequester(r)}
                    className={`rounded-md px-2.5 py-1 text-[12px] font-bold ${requester === r ? 'bg-[#1a1d2e] text-white' : 'bg-[#f7f4ec] text-[#6b6558]'}`}
                  >
                    By. {r}
                  </button>
                ))}
              </div>
              <input
                value={requesterName}
                onChange={e => setRequesterName(e.target.value)}
                placeholder="요청자 (예: 홍길동 대표)"
                className="w-full rounded-md border border-[#e3d9c4] px-3 py-1.5 text-[13px] outline-none focus:border-[#3557d6]"
              />
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="제목"
                className="w-full rounded-md border border-[#e3d9c4] px-3 py-1.5 text-[13px] outline-none focus:border-[#3557d6]"
              />
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="내용"
                rows={3}
                className="w-full rounded-md border border-[#e3d9c4] px-3 py-1.5 text-[13px] outline-none focus:border-[#3557d6]"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-[12.5px] text-[#6b6558]">
                  취소
                </button>
                <button
                  type="button"
                  onClick={add}
                  disabled={!title.trim() || saving}
                  className="rounded-md bg-[#3557d6] px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-40"
                >
                  {saving ? '저장 중…' : '저장'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <Empty>등록된 요청사항이 없어요</Empty>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map(it => (
            <div key={it.id} className="border border-[#f0e9da] rounded-[6px] px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-extrabold rounded-full px-2 py-[3px] ${REQUESTER_TONE[it.requester]}`}>By. {it.requester}</span>
                {it.requester_name && <span className="text-[12px] font-bold text-[#1a1d2e]">{it.requester_name}</span>}
                <span className="text-[11px] text-[#6b6558]">{fmtKst(it.created_at)}</span>
                {canEdit && (
                  <button type="button" onClick={() => remove(it.id)} className="ml-auto text-[11px] text-[#a39b88] hover:text-[#e03131]">
                    삭제
                  </button>
                )}
              </div>
              <div className="text-[15px] font-extrabold text-[#1a1d2e] mt-2">{it.title}</div>
              {it.body && <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#4a4538]">{it.body}</p>}
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  )
}

/* ── WORK 홈 섹션 1~4 ── */

export default function WorkHomeSections({ contents, children }: { contents: Content[]; children?: React.ReactNode }) {
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
  // 오른쪽은 옵티팜과 겹치지 않는 것만
  const others = useMemo(() => inRange.filter(c => !contentMatchesBrand(c.brands, '옵티팜')), [inRange])

  // 발행 예정: 방문 예정 + 최근 30일 방문 완료 중 콘텐츠 링크 없는 건 (보딩패스)
  const [pending, setPending] = useState<PendingPublish['items'] | null>(null)
  useEffect(() => {
    fetch('/api/pending-publish', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((d: PendingPublish | null) => setPending(d?.items ?? []))
      .catch(() => setPending([]))
  }, [])
  const pendingOpti = pending && pending.filter(p => p.companies.some(c => contentMatchesBrand(c, '옵티팜'))).length
  // 카드로 붙일 발행 예정 — 이번 주/이번 달이면 그 기간 방문일만
  const pendingInRange = useMemo(
    () => (pending ?? []).filter(p => range === 'global' || (p.date >= from && p.date <= to)).sort((a, b) => a.date.localeCompare(b.date)),
    [pending, range, from, to],
  )
  const pendingOptiList = pendingInRange.filter(p => p.companies.some(c => contentMatchesBrand(c, '옵티팜')))
  // 인플루언서 이름 → 프로필 사진 (콘텐츠 데이터에서)
  const photos = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of contents) if (c.profile_image_url) m.set(c.influencer_name.trim().toLowerCase(), c.profile_image_url)
    return m
  }, [contents])

  const periodLabel = range === 'global' ? '상단 기간 기준' : `${fmtDate(from)} ~ ${fmtDate(to)}`
  const toggle = (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-[#6b6558]">{periodLabel}</span>
      <RangeToggle value={range} onChange={setRange} globalLabel={globalLabel} />
    </div>
  )

  return (
    <section id="sec-02" className="scroll-mt-32 mt-7 flex flex-col">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[12px] font-extrabold text-[#3557d6]">02</span>
        <h2 className="m-0 text-[26px] font-extrabold text-[#1a1d2e]">브랜드슬램 실행 현황</h2>
        <div className="ml-auto">{toggle}</div>
      </div>
      <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
        <SectionShell no={1} note={PENDING_NOTE} title={`옵티팜 콘텐츠 · ${optipharm.length}건`} badge="by 브랜드슬램" pending={pendingOpti} className="">
          <ContentGrid list={optipharm} pending={pendingOptiList} photos={photos} />
        </SectionShell>

        <SectionShell no={2} note={PENDING_NOTE} title={`전체 브랜드사 콘텐츠 · ${inRange.length}건`} badge="목록은 옵티팜 제외" pending={pending && pending.length} className="">
          <ContentGrid list={others} pending={pendingInRange} photos={photos} />
        </SectionShell>
      </div>

      <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3.5 items-start">
        <RequestSection />
        <SectionShell no={4} title="자체 약사 콘텐츠" badge="by 브랜드슬램" className="">
          <div className="h-[180px] border border-dashed border-[#d8ccb2] rounded-[6px] flex items-center justify-center text-[13px] text-[#6b6558]">
            약사 콘텐츠 준비 중이에요 · 곧 공개됩니다
          </div>
        </SectionShell>
      </div>

      {children && <div className="mt-3.5">{children}</div>}
    </section>
  )
}

/** 콘텐츠 카드 썸네일 — 인플루언서 프로필 사진, 없으면 베이지 바탕 */
function Thumb({ c }: { c: Content }) {
  const [failed, setFailed] = useState(false)
  const src = c.profile_image_url || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-photos/by-id/${c.id}`
  return (
    <div className="relative aspect-[3/4] rounded-[6px] bg-[#ece4d2] overflow-hidden group-hover:ring-2 group-hover:ring-[#3557d6] transition-shadow">
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div
        className={`absolute inset-x-0 bottom-0 p-2 flex flex-col ${failed ? '' : 'bg-gradient-to-t from-black/70 to-transparent pt-8 text-white'}`}
      >
        <span className={`text-[10px] font-bold ${failed ? 'text-[#6b6558]' : 'text-white/80'}`}>{c.channel}</span>
        <span className="text-[12px] font-extrabold truncate">{c.influencer_name}</span>
        <span className={`text-[10.5px] truncate ${failed ? 'text-[#6b6558]' : 'text-white/80'}`}>{c.brands || c.product || '—'}</span>
      </div>
    </div>
  )
}

/** 발행 예정 카드 — 아직 링크 없는 방문 건. 회색·블러 처리 */
function PendingCard({ p, photo }: { p: PendingItem; photo?: string }) {
  return (
    <div className="block min-w-0 text-[#1a1d2e]" title="발행 예정 · 콘텐츠 링크 대기">
      <div className="relative aspect-[3/4] rounded-[6px] bg-[#e7e3da] overflow-hidden">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover grayscale opacity-55" />
        )}
        {/* 발행 예정 표시 — 점선 테두리 + 가운데 배지 */}
        <div className="absolute inset-0 rounded-[6px] border-2 border-dashed border-white/80" />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11.5px] font-extrabold rounded-full px-3 py-1 bg-[#1a1d2e]/80 text-white">
          ⏳ 발행 예정
        </span>
        <span className="absolute top-2 left-2 text-[10px] font-bold rounded-full px-2 py-[2px] bg-white/90 text-[#6b6558]">
          {p.done ? '방문 완료 · 링크 대기' : '방문 예정'}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-2 flex flex-col bg-gradient-to-t from-black/45 to-transparent pt-8 text-white">
          <span className="text-[12px] font-extrabold truncate">{p.name || '인플루언서'}</span>
          <span className="text-[10.5px] truncate text-white/80">{p.companies.join(',')}</span>
        </div>
      </div>
      <div className="text-[10.5px] text-[#9a9486] mt-[5px] truncate">
        {fmtDate(p.date)} · {p.store}
      </div>
      <div className="text-[12px] font-bold text-[#9a9486]">발행 예정</div>
    </div>
  )
}
