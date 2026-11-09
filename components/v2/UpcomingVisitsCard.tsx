'use client'

import { useEffect, useMemo, useState } from 'react'
import type { UpcomingVisit } from '@/app/api/upcoming-visits/route'
import { contentMatchesBrand } from '@/lib/brand-content'
import { NEGOTIATIONS } from '@/lib/negotiations'
import { SHEET_NEGOTIATIONS } from '@/lib/negotiations-sheet'

interface UpcomingVisitsCardProps {
  partnerBrand?: string | null
}

type View = 'list' | 'calendar'
type StatusFilter = '전체' | '완료' | '예정'

const kstToday = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} (${WEEKDAYS[d.getUTCDay()]})`
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'gray' | 'blue' | 'orange' | 'green' }) {
  const cls =
    tone === 'blue'
      ? 'bg-[#e6edff] text-[#3557d6]'
      : tone === 'green'
        ? 'bg-[#e3f4ea] text-[#1f7a4d]'
      : tone === 'orange'
        ? 'bg-[#fff1dc] text-[#c2410c]'
        : 'bg-[#f7f4ec] text-[#6b6558]'
  return <span className={`text-[10.5px] font-bold rounded-full px-[7px] py-0.5 whitespace-nowrap ${cls}`}>{children}</span>
}

/** 방문 예정 인플루언서 — 지점·유형·티어·PPL (리스트/달력) */
export default function UpcomingVisitsCard({ partnerBrand }: UpcomingVisitsCardProps) {
  const [visits, setVisits] = useState<UpcomingVisit[] | null>(null)
  const [error, setError] = useState(false)
  const [view, setView] = useState<View>('list')
  const [store, setStore] = useState('전체')
  const [status, setStatus] = useState<StatusFilter>('예정')
  const [month, setMonth] = useState<string>(() => kstToday().slice(0, 7))

  useEffect(() => {
    let cancelled = false
    fetch('/api/upcoming-visits')
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => !cancelled && setVisits(d.data ?? []))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [])

  const scoped = useMemo(
    () => (visits ?? []).filter(v => !partnerBrand || v.companies.some(c => contentMatchesBrand(c, partnerBrand))),
    [visits, partnerBrand],
  )
  const stores = useMemo(() => ['전체', ...new Set(scoped.map(v => v.store))], [scoped])
  const storeRows = useMemo(() => (store === '전체' ? scoped : scoped.filter(v => v.store === store)), [scoped, store])
  const counts = useMemo(
    () => ({ 전체: storeRows.length, 완료: storeRows.filter(v => v.done).length, 예정: storeRows.filter(v => !v.done).length }),
    [storeRows],
  )
  // 리스트: 예정은 가까운 날부터, 완료·전체는 최근부터
  const rows = useMemo(() => {
    const list = storeRows.filter(v => status === '전체' || (status === '완료') === v.done)
    return status === '예정' ? list : [...list].reverse()
  }, [storeRows, status])
  const byDate = useMemo(() => {
    const m = new Map<string, UpcomingVisit[]>()
    for (const v of storeRows) m.set(v.date, [...(m.get(v.date) ?? []), v])
    return m
  }, [storeRows])

  const calMonth = month
  const calCells = useMemo(() => {
    const [y, m] = calMonth.split('-').map(Number)
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return [
      ...Array<null>(first).fill(null),
      ...Array.from({ length: days }, (_, i) => `${calMonth}-${String(i + 1).padStart(2, '0')}`),
    ]
  }, [calMonth])
  const shiftMonth = (n: number) => {
    const [y, m] = calMonth.split('-').map(Number)
    const d = new Date(Date.UTC(y, m - 1 + n, 1))
    setMonth(d.toISOString().slice(0, 7))
  }

  // 세그먼트 버튼 (목업 토글)
  const seg = (on: boolean) =>
    `border-0 text-[11px] px-[9px] py-[5px] rounded-[6px] whitespace-nowrap ${on ? 'bg-white font-bold text-[#1a1d2e]' : 'bg-transparent font-medium text-[#4a4538]'}`

  const listView = (
    <div className="min-w-0">
      {visits && rows.length === 0 && <div className="text-[12px] text-[#6b6558] mt-2">예정된 방문이 없습니다.</div>}
      {visits && rows.length > 0 && (
        <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
          <table className="w-full text-[12px] text-left border-collapse">
            <thead className="sticky top-0 bg-white text-[#6b6558] text-[11px]">
              <tr className="border-b border-[#efe5d0]">
                {['방문일', '상태', '지점', '인플루언서', '유형', '티어', 'PPL', '브랜드'].map(h => (
                  <th key={h} className="pb-1.5 pr-1.5 font-normal whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(v => (
                <tr key={`${v.date}|${v.store}|${v.influencer_id}`} className="border-b border-[#f4efe4]">
                  <td className="py-2 pr-1.5 whitespace-nowrap">{dayLabel(v.date)}</td>
                  <td className="py-2 pr-1.5">{v.done ? <Badge tone="green">완료</Badge> : <Badge tone="blue">예정</Badge>}</td>
                  <td className="py-2 pr-1.5 whitespace-nowrap">{v.store}</td>
                  <td className="py-2 pr-1.5 whitespace-nowrap font-bold text-[#1a1d2e]">{v.influencer_name}</td>
                  <td className="py-2 pr-1.5 whitespace-nowrap">{v.region || '-'}</td>
                  <td className="py-2 pr-1.5 whitespace-nowrap">{v.tier || '-'}</td>
                  <td className="py-2 pr-1.5">{v.ppl ? <Badge tone="orange">PPL</Badge> : '-'}</td>
                  <td className="py-2">{v.companies.join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const calendarView = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2 text-[13px] font-extrabold text-[#1a1d2e]">
        <button type="button" aria-label="이전 달" onClick={() => shiftMonth(-1)} className="border-0 bg-transparent text-[14px] text-[#1a1d2e]">‹</button>
        {calMonth.replace('-', '.')}
        <button type="button" aria-label="다음 달" onClick={() => shiftMonth(1)} className="border-0 bg-transparent text-[14px] text-[#1a1d2e]">›</button>
        <span className="ml-auto text-[10.5px] font-medium text-[#c2410c]">■ PPL</span>
        <span className="text-[10.5px] font-medium text-[#3557d6]">■ 예정 방문</span>
        <span className="text-[10.5px] font-medium text-[#1f7a4d]">■ 방문 완료</span>
      </div>
      <div className="grid grid-cols-7 gap-[3px] mt-2">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-[10.5px] text-[#6b6558]">{w}</div>
        ))}
        {calCells.map((d, i) => (
          <div key={d ?? `e${i}`} className={`min-h-[46px] min-w-0 rounded-[5px] p-[3px] text-[9.5px] leading-[1.3] ${d ? 'bg-[#faf8f3]' : ''}`}>
            {d && (
              <>
                <div className="text-[#6b6558]">{Number(d.slice(8))}</div>
                {(byDate.get(d) ?? []).slice(0, 3).map(v => (
                  <div
                    key={`${v.store}|${v.influencer_id}`}
                    title={`${v.store} · ${v.influencer_name} · ${[v.region, v.tier, v.ppl && 'PPL'].filter(Boolean).join(' · ')}\n${v.companies.join(', ')}`}
                    className={`truncate font-semibold ${v.done ? 'text-[#1f7a4d]' : v.ppl ? 'text-[#c2410c]' : 'text-[#3557d6]'}`}
                  >
                    {v.influencer_name}
                    <span className="font-normal opacity-70"> · {v.store.replace('점', '')}{v.tier ? ` · ${v.tier}` : ''}</span>
                  </div>
                ))}
                {(byDate.get(d)?.length ?? 0) > 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('전체')
                      setView('list')
                    }}
                    title={byDate.get(d)!.slice(3).map(v => `${v.influencer_name} · ${v.store}`).join('\n')}
                    className="font-bold text-[#3557d6]"
                  >
                    +{byDate.get(d)!.length - 3}명
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <section className="mb-4 bg-white border border-[#f2ebdd] rounded-[6px] p-[18px] shadow-[0_4px_16px_rgba(30,41,59,0.06)]">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-[18px] font-extrabold text-[#1a1d2e]">
          방문 일정 인플루언서{' '}
          <span className="text-[12px] font-medium text-[#6b6558]">
            ( 완료 {visits ? counts.완료 : '…'} · 예정 {visits ? counts.예정 : '…'} )
          </span>
        </h3>
        <div className="flex-1" />
        <div className="flex gap-[3px] bg-[#f7f4ec] rounded-[8px] p-[3px]">
          {(['예정', '완료', '전체'] as const).map(s => (
            <button key={s} type="button" onClick={() => setStatus(s)} className={seg(status === s)}>
              {s} {visits ? counts[s] : ''}
            </button>
          ))}
        </div>
        <div className="flex gap-[3px] bg-[#f7f4ec] rounded-[8px] p-[3px]">
          {(['list', 'calendar'] as const).map(v => (
            <button key={v} type="button" onClick={() => setView(v)} className={seg(view === v)}>
              {v === 'list' ? '리스트' : '달력'}
            </button>
          ))}
        </div>
      </div>

      {/* 지점 칩 */}
      <div className="flex flex-wrap gap-[5px] mt-2.5">
        {stores.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStore(s)}
            className={`text-[11px] font-medium rounded-full px-2.5 py-1 border whitespace-nowrap ${
              store === s ? 'border-[#3557d6] bg-[#3557d6] text-white' : 'border-[#e3d9c4] bg-white text-[#4a4538] hover:text-[#1a1d2e]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <div className="text-[11px] text-[#e03131] mt-3">방문 예정 데이터를 불러오지 못했습니다.</div>}
      {!error && visits === null && <div className="text-[12px] text-[#6b6558] mt-3">불러오는 중…</div>}

      {/* 리스트 모드: 넓은 화면은 리스트+달력 나란히 */}
      {visits && view === 'list' && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-[18px] mt-3">
          {listView}
          <div className="hidden xl:block">{calendarView}</div>
        </div>
      )}
      {visits && view === 'calendar' && <div className="mt-3">{calendarView}</div>}

      <div className="text-[10.5px] text-[#6b6558] mt-2.5">※ 보딩패스 배정 기준 · 완료 = 픽업 처리 · 테스트 회원사·취소·시딩·방문일 미정 제외</div>

      {!partnerBrand && <NegotiationPanel visits={visits ?? []} />}
    </section>
  )
}

const ALL_NEGOTIATIONS = [...NEGOTIATIONS, ...SHEET_NEGOTIATIONS]
const NEGOTIATION_GROUPS = ['전체', ...new Set(ALL_NEGOTIATIONS.map(n => n.group ?? '기타'))]

function followerLabel(n: number): string {
  return n >= 10_000 ? `${Math.round(n / 1_000) / 10}만` : n.toLocaleString()
}

/** 협상 진행중 리스트 — 보딩패스 배정 전 (내부 전용). 이미 배정된 사람은 숨긴다 */
function NegotiationPanel({ visits }: { visits: UpcomingVisit[] }) {
  const [group, setGroup] = useState('전체')
  const key = (s: string) => s.toLowerCase().replace(/\s+/g, '')
  const assigned = new Set(visits.map(v => key(v.influencer_name)))
  const open = ALL_NEGOTIATIONS.filter(n => !assigned.has(key(n.influencer_name)))
  const list = group === '전체' ? open : open.filter(n => (n.group ?? '기타') === group)
  return (
    <div className="mt-4 pt-3.5 border-t border-dashed border-[#e3d9c4]">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="m-0 text-[17px] font-extrabold text-[#1a1d2e]">
          협상 진행중 <span className="font-medium text-[#6b6558]">{list.length}명</span>
        </h4>
        <span className="text-[11px] font-bold text-white bg-[#d6336c] px-2 py-[3px] rounded-full">관리자 전용</span>
      </div>
      <div className="flex flex-wrap gap-[5px] mt-2">
        {NEGOTIATION_GROUPS.map(g => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={`text-[11px] font-medium rounded-full px-[9px] py-1 border whitespace-nowrap ${
              group === g ? 'border-[#3557d6] bg-[#3557d6] text-white' : 'border-[#e3d9c4] bg-white text-[#4a4538] hover:text-[#1a1d2e]'
            }`}
          >
            {g} {g === '전체' ? open.length : open.filter(n => (n.group ?? '기타') === g).length}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="text-[12px] text-[#6b6558] mt-3">협상 중인 인플루언서가 없습니다.</div>
      ) : (
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 max-h-[640px] overflow-y-auto">
          {list.map(n => (
            <div key={`${n.group}|${n.influencer_name}`} className="min-w-0 rounded-[6px] border border-[#f0e9da] p-2.5 text-[12px]">
              <div className="font-extrabold text-[#1a1d2e] truncate">{n.influencer_name}</div>
              <div className="flex flex-wrap items-center gap-1 text-[11px] text-[#6b6558]">
                {n.followers && <span>팔로워 {followerLabel(n.followers)}</span>}
                {n.followers && n.date_text && <span>·</span>}
                {n.date_text && <span className="text-[#8a4b00]">{n.date_text}</span>}
                {group === '전체' && n.group && <Badge tone="gray">{n.group}</Badge>}
                {n.store && <Badge tone="blue">{n.store}</Badge>}
              </div>
              {(n.url || n.tiktok || n.instagram) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {n.url && (n.url.includes('instagram') ? <SnsBadge kind="ig" href={n.url} /> : <SnsBadge kind="xhs" href={n.url} />)}
                  {n.instagram && !n.url?.includes('instagram') && <SnsBadge kind="ig" href={`https://www.instagram.com/${n.instagram}`} />}
                  {n.tiktok && <SnsBadge kind="tt" href={`https://www.tiktok.com/@${n.tiktok}`} />}
                </div>
              )}
              {n.memo && <div className="text-[11px] text-[#6b6558] mt-1">{n.memo}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** SNS 프로필 바로가기 배지 */
function SnsBadge({ kind, href }: { kind: 'ig' | 'xhs' | 'tt'; href: string }) {
  const base = 'inline-flex items-center justify-center gap-1 h-7 px-[9px] rounded-[6px] text-[11px] font-extrabold text-white no-underline hover:opacity-90'
  if (kind === 'ig')
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label="인스타그램 프로필 열기" className={base} style={{ background: 'linear-gradient(45deg,#f09433,#dc2743 50%,#bc1888)' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="#fff" />
        </svg>
        IG
      </a>
    )
  if (kind === 'xhs')
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label="샤오홍슈 프로필 열기" className={base} style={{ background: '#ff2442' }}>
        小红书
      </a>
    )
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label="틱톡 프로필 열기" className={base} style={{ background: '#111111' }}>
      <svg width="12" height="13" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
        <path d="M16 3c.4 2.4 1.9 4 4.5 4.3v3.2c-1.7 0-3.2-.5-4.5-1.4v6.4a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.3a2.4 2.4 0 1 0 1.5 2.2V3H16z" />
      </svg>
      TT
    </a>
  )
}
