'use client'

import { useEffect, useMemo, useState } from 'react'
import type { UpcomingVisit } from '@/app/api/upcoming-visits/route'
import { contentMatchesBrand } from '@/lib/brand-content'
import { NEGOTIATIONS } from '@/lib/negotiations'

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

function Badge({ children, tone }: { children: React.ReactNode; tone: 'gray' | 'blue' | 'orange' }) {
  const cls =
    tone === 'blue'
      ? 'bg-[#eef3ff] text-[#4f7cff]'
      : tone === 'orange'
        ? 'bg-[#fff1e6] text-[#f97316]'
        : 'bg-[#f7f4ec] text-[#6b6558]'
  return <span className={`text-[10.5px] font-bold rounded-md px-1.5 py-0.5 whitespace-nowrap ${cls}`}>{children}</span>
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

  return (
    <section className="mb-4">
      <div className="text-[18px] font-extrabold tracking-tight text-[#1a1d2e] pt-3 pb-2.5 px-1">
        방문 일정 인플루언서{' '}
        <span className="text-[13px] font-semibold tracking-normal text-[#9a9486]">
          ( 완료 {visits ? counts.완료 : '…'} · 예정 {visits ? counts.예정 : '…'} )
        </span>
      </div>
      <div className={`grid gap-4 items-start ${partnerBrand ? '' : 'xl:grid-cols-[minmax(0,1fr)_340px]'}`}>
      <div className="min-w-0 bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {stores.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStore(s)}
              className={`text-[11.5px] rounded-[16px] px-3 py-1.5 transition-all whitespace-nowrap ${
                store === s ? 'font-bold text-white bg-[#4f7cff]' : 'font-semibold bg-[#f7f4ec] text-[#6b6558] hover:text-[#1a1d2e]'
              }`}
            >
              {s}
            </button>
          ))}
          <div className="ml-auto flex rounded-[10px] border border-[#f0e9da] overflow-hidden">
            {(['예정', '완료', '전체'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`text-[11.5px] px-3 py-1.5 whitespace-nowrap ${status === s ? 'font-bold text-white bg-[#4f7cff]' : 'font-semibold text-[#6b6558] bg-[#fbf9f4]'}`}
              >
                {s} {visits ? counts[s] : ''}
              </button>
            ))}
          </div>
          <div className="flex rounded-[10px] border border-[#f0e9da] overflow-hidden">
            {(['list', 'calendar'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`text-[11.5px] px-3 py-1.5 ${view === v ? 'font-bold text-white bg-[#1a1d2e]' : 'font-semibold text-[#6b6558] bg-[#fbf9f4]'}`}
              >
                {v === 'list' ? '리스트' : '달력'}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="text-[11px] text-[#e03131] mt-4">방문 예정 데이터를 불러오지 못했습니다.</div>}
        {!error && visits === null && <div className="text-[12px] text-[#9a9486] mt-4">불러오는 중…</div>}
        {visits && view === 'list' && rows.length === 0 && <div className="text-[12px] text-[#9a9486] mt-4">예정된 방문이 없습니다.</div>}

        {visits && rows.length > 0 && view === 'list' && (
          <div className="mt-4 max-h-[420px] overflow-y-auto overflow-x-auto">
            <table className="w-full text-[12px] text-left">
              <thead className="sticky top-0 bg-white text-[#9a9486] text-[11px]">
                <tr>
                  <th className="py-1.5 pr-3 font-semibold">방문일</th>
                  <th className="py-1.5 pr-3 font-semibold">상태</th>
                  <th className="py-1.5 pr-3 font-semibold">지점</th>
                  <th className="py-1.5 pr-3 font-semibold">인플루언서</th>
                  <th className="py-1.5 pr-3 font-semibold">유형</th>
                  <th className="py-1.5 pr-3 font-semibold">티어</th>
                  <th className="py-1.5 pr-3 font-semibold">PPL</th>
                  <th className="py-1.5 font-semibold">브랜드</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(v => (
                  <tr key={`${v.date}|${v.store}|${v.influencer_id}`} className="border-t border-[#f4efe3]">
                    <td className="py-2 pr-3 whitespace-nowrap font-bold text-[#1a1d2e]">{dayLabel(v.date)}</td>
                    <td className="py-2 pr-3">{v.done ? <Badge tone="gray">완료</Badge> : <Badge tone="blue">예정</Badge>}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{v.store}</td>
                    <td className="py-2 pr-3 whitespace-nowrap font-semibold text-[#1a1d2e]">{v.influencer_name}</td>
                    <td className="py-2 pr-3">{v.region ? <Badge tone="gray">{v.region}</Badge> : '-'}</td>
                    <td className="py-2 pr-3">{v.tier ? <Badge tone="blue">{v.tier}</Badge> : '-'}</td>
                    <td className="py-2 pr-3">{v.ppl ? <Badge tone="orange">PPL</Badge> : '-'}</td>
                    <td className="py-2 text-[#6b6558]">{v.companies.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {visits && view === 'calendar' && (
          <div className="mt-4">
            <div className="flex items-center justify-center gap-3 mb-2 text-[13px] font-bold text-[#1a1d2e]">
              <button type="button" onClick={() => shiftMonth(-1)} className="px-2 text-[#9a9486] hover:text-[#1a1d2e]">‹</button>
              {calMonth.replace('-', '.')}
              <button type="button" onClick={() => shiftMonth(1)} className="px-2 text-[#9a9486] hover:text-[#1a1d2e]">›</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10.5px]">
              {WEEKDAYS.map(w => (
                <div key={w} className="text-center font-semibold text-[#9a9486] py-1">{w}</div>
              ))}
              {calCells.map((d, i) => (
                <div
                  key={d ?? `e${i}`}
                  className={`min-h-[72px] rounded-lg p-1 ${d ? 'bg-[#fbf9f4] border border-[#f4efe3]' : ''}`}
                >
                  {d && (
                    <>
                      <div className="font-bold text-[#6b6558]">{Number(d.slice(8))}</div>
                      {(byDate.get(d) ?? []).slice(0, 3).map(v => (
                        <div
                          key={`${v.store}|${v.influencer_id}`}
                          title={`${v.store} · ${v.influencer_name} · ${[v.region, v.tier, v.ppl && 'PPL'].filter(Boolean).join(' · ')}\n${v.companies.join(', ')}`}
                          className={`mt-0.5 truncate rounded px-1 py-0.5 font-semibold ${
                            v.done ? 'bg-[#efece4] text-[#8a8478]' : v.ppl ? 'bg-[#fff1e6] text-[#c2410c]' : 'bg-[#eef3ff] text-[#3b5bdb]'
                          }`}
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
                          className="mt-0.5 text-[10px] font-bold text-[#9a9486] hover:text-[#1a1d2e]"
                        >
                          +{byDate.get(d)!.length - 3}명
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2 text-[10.5px] text-[#6b6558]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[#fff1e6] border border-[#f97316]" />PPL</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[#eef3ff] border border-[#4f7cff]" />예정 방문</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[#efece4] border border-[#8a8478]" />방문 완료</span>
            </div>
          </div>
        )}
        <div className="text-[10.5px] text-[#9a9486] mt-3">※ 보딩패스 배정 기준 · 완료 = 픽업 처리 · 테스트 회원사·취소·시딩·방문일 미정 제외</div>
      </div>
      {!partnerBrand && <NegotiationPanel visits={visits ?? []} />}
      </div>
    </section>
  )
}

/** 협상 진행중 리스트 — 보딩패스 배정 전 (내부 전용). 이미 배정된 사람은 숨긴다 */
function NegotiationPanel({ visits }: { visits: UpcomingVisit[] }) {
  const key = (s: string) => s.toLowerCase().replace(/\s+/g, '')
  const assigned = new Set(visits.map(v => key(v.influencer_name)))
  const list = NEGOTIATIONS.filter(n => !assigned.has(key(n.influencer_name)))
  return (
    <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
      <div className="flex items-baseline gap-2">
        <span className="text-[14px] font-extrabold text-[#1a1d2e]">협상 진행중</span>
        <span className="text-[12px] font-bold text-[#9a9486]">{list.length}명</span>
      </div>
      {list.length === 0 ? (
        <div className="text-[12px] text-[#9a9486] mt-4">협상 중인 인플루언서가 없습니다.</div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 max-h-[640px] overflow-y-auto">
          {list.map(n => (
            <div key={n.influencer_name} className="rounded-xl bg-[#fbf9f4] border border-[#f4efe3] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-bold text-[#1a1d2e] truncate">{n.influencer_name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-[#6b6558]">
                {n.date_text && <span className="font-semibold">{n.date_text}</span>}
                {n.store && <Badge tone="gray">{n.store}</Badge>}
                {n.tiktok && (
                  <a href={`https://www.tiktok.com/@${n.tiktok}`} target="_blank" rel="noreferrer" className="text-[#4f7cff] hover:underline">TT</a>
                )}
                {n.instagram && (
                  <a href={`https://www.instagram.com/${n.instagram}`} target="_blank" rel="noreferrer" className="text-[#4f7cff] hover:underline">IG</a>
                )}
              </div>
              {n.memo && <div className="text-[11px] text-[#9a9486] mt-1">{n.memo}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
