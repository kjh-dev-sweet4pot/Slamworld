'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PendingPublish } from '@/app/api/pending-publish/route'
import { contentMatchesBrand } from '@/lib/brand-content'

const WD = ['일', '월', '화', '수', '목', '금', '토']
const md = (d: string) => `${d.slice(5, 7)}.${d.slice(8, 10)}`
const mdw = (d: string) => `${md(d)} (${WD[new Date(`${d}T00:00:00`).getDay()]})`

function count<T>(list: T[], key: (t: T) => string | null) {
  const m = new Map<string, number>()
  for (const t of list) {
    const k = key(t)
    if (k) m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m].sort((a, b) => b[1] - a[1])
}

const isChina = (r: string) => /중화|중국|대만|홍콩|china/i.test(r)

/** 📅 발행 예정 현황 — 방문 예정 + 최근 30일 방문 완료 중 링크 대기 */
export default function PendingPublishCard({ partnerBrand }: { partnerBrand: string | null }) {
  const [data, setData] = useState<PendingPublish | null>(null)
  useEffect(() => {
    fetch('/api/pending-publish', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setData(d?.items ? d : { items: [], visited30: 0 }))
      .catch(() => setData({ items: [], visited30: 0 }))
  }, [])

  const v = useMemo(() => {
    const items = (data?.items ?? []).filter(i => !partnerBrand || i.companies.some(c => contentMatchesBrand(c, partnerBrand)))
    const upcoming = items.filter(i => !i.done)
    const waiting = items.filter(i => i.done)
    const next = upcoming.map(i => i.date).sort()[0] ?? null
    const nextRows = next ? upcoming.filter(i => i.date === next) : []
    const nextStores = [...new Set(nextRows.map(i => i.store))]
    const opti = items.filter(i => i.companies.some(c => contentMatchesBrand(c, '옵티팜'))).length
    const visited = data?.visited30 ?? 0
    const rate = visited > 0 ? Math.round(((visited - waiting.length) / visited) * 100) : null
    const byDate = count(items, i => `${i.date}|${i.done ? 'done' : 'plan'}`)
      .map(([k, n]) => ({ date: k.slice(0, 10), done: k.endsWith('done'), n }))
      .sort((a, b) => a.date.localeCompare(b.date))
    const max = Math.max(1, ...byDate.map(d => d.n))
    return { items, upcoming, waiting, next, nextRows, nextStores, opti, visited, rate, byDate, max }
  }, [data, partnerBrand])

  const tiers = count(v.nextRows, i => i.tier)
  const regions = count(v.nextRows, i => i.region)

  return (
    <div className="bg-white border border-[#f2ebdd] rounded-[6px] p-[18px] shadow-[0_4px_16px_rgba(30,41,59,0.06)]">
      <h3 className="m-0 text-[18px] font-extrabold text-[#1a1d2e]">📅 발행 예정 현황</h3>
      {!data ? (
        <div className="mt-3 text-[12px] text-[#6b6558]">불러오는 중…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className="bg-[#eef2ff] rounded-[6px] p-3">
              <div className="text-[12px] font-bold text-[#2541a8]">방문 예정</div>
              <div className="text-[20px] font-extrabold mt-1 whitespace-nowrap">{v.upcoming.length}명</div>
              <div className="text-[11px] text-[#4a4538] mt-0.5">
                {v.next ? `${mdw(v.next)} · ${v.nextStores.join(', ')}` : '예정된 방문 없음'}
              </div>
            </div>
            <div className="bg-[#fff4e2] rounded-[6px] p-3">
              <div className="text-[12px] font-bold text-[#8a4b00]">방문 완료 · 링크 대기</div>
              <div className="text-[20px] font-extrabold mt-1 whitespace-nowrap">{v.waiting.length}건</div>
              <div className="text-[11px] text-[#4a4538] mt-0.5">
                최근 30일 방문 {v.visited}명 중{v.rate != null ? ` · 발행률 ${v.rate}%` : ''}
              </div>
            </div>
            <div className="bg-[#faf8f3] rounded-[6px] p-3">
              <div className="text-[12px] font-bold text-[#4a4538]">발행 예정 합계</div>
              <div className="text-[20px] font-extrabold mt-1 whitespace-nowrap">{v.items.length}건</div>
              <div className="text-[11px] text-[#4a4538] mt-0.5">
                옵티팜 포함 {v.opti}건 · 그 외 {v.items.length - v.opti}건
              </div>
            </div>
          </div>

          {v.items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-4 mt-3.5">
              <div>
                <div className="text-[12px] font-extrabold mb-1.5">방문일별 발행 대기</div>
                <div className="flex flex-col gap-[5px] text-[12px]">
                  {v.byDate.map(d => (
                    <div key={`${d.date}${d.done}`} className="flex items-center gap-2">
                      <span className={`w-11 ${d.done ? 'text-[#6b6558]' : 'text-[#2541a8] font-bold'}`}>{md(d.date)}</span>
                      <span className="flex-1 h-2 bg-[#f2ede2] rounded">
                        <span
                          className="block h-2 rounded"
                          style={{ width: `${(d.n / v.max) * 100}%`, background: d.done ? '#f0b35a' : '#3557d6' }}
                        />
                      </span>
                      <span className={`w-[52px] text-right ${d.done ? '' : 'text-[#2541a8] font-bold'}`}>
                        {d.done ? '완료' : '예정'} {d.n}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                {v.next && (
                  <>
                    <div className="text-[12px] font-extrabold mb-1.5">{md(v.next)} 방문 예정 구성</div>
                    <div className="flex flex-wrap gap-[5px]">
                      {tiers.map(([t, n]) => (
                        <span key={t} className="text-[11px] bg-[#f6f0e3] px-2 py-1 rounded-full">{t} {n}</span>
                      ))}
                      {regions.map(([r, n]) => (
                        <span
                          key={r}
                          className={`text-[11px] px-2 py-1 rounded-full ${isChina(r) ? 'bg-[#fdf0ef] text-[#9a2b24]' : 'bg-[#eef2ff] text-[#2541a8]'}`}
                        >
                          {r} {n}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                <div className="text-[11px] text-[#6b6558] mt-2 leading-relaxed">
                  콘텐츠 링크가 등록되면 발행 예정에서 빠지고 콘텐츠로 집계돼요.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
