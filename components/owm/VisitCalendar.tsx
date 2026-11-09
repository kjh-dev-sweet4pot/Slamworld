'use client'

import { useMemo, useState } from 'react'
import type { OwmReport, ReportRow } from '@/lib/owm-report'

type Visit = ReportRow & { done: boolean; opti: boolean }

const WD = ['월', '화', '수', '목', '금', '토', '일']
const pad = (n: number) => String(n).padStart(2, '0')
const ymOf = (d: string) => d.slice(0, 7)
const shiftYm = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
const keyOf = (r: ReportRow) => `${r.visit_date}|${r.store}|${r.handle}`

/** 방문 달력 — 그 기간 동안 누가 언제 방문했는지(예정 포함) */
export default function VisitCalendar({ data }: { data: OwmReport }) {
  const [scope, setScope] = useState<'owm' | 'optipharm'>('owm')
  const [range0, range1] = data.cumulative.range

  // 누적 테이블(방문예정·방문)을 합쳐 1인 1건으로
  const visits = useMemo(() => {
    const opti = new Set(data.tables.filter(t => t.group === 'optipharm').flatMap(t => t.rows.map(keyOf)))
    const m = new Map<string, Visit>()
    for (const t of data.tables) {
      if (t.group !== 'owm' || t.span !== 'cumulative') continue
      for (const r of t.rows) {
        const k = keyOf(r)
        const prev = m.get(k)
        if (!prev || (!prev.url && r.url)) m.set(k, { ...r, done: t.status === 'visited', opti: opti.has(k) })
      }
    }
    return [...m.values()]
  }, [data])

  const shown = scope === 'owm' ? visits : visits.filter(v => v.opti)
  const byDay = useMemo(() => {
    const m = new Map<string, Visit[]>()
    for (const v of shown) m.set(v.visit_date, [...(m.get(v.visit_date) ?? []), v])
    return m
  }, [shown])

  // 10월부터 이번 달(또는 마지막 방문 달)까지 넘겨볼 수 있게
  const nowYm = ymOf(new Date(Date.now() + 9 * 3600_000).toISOString())
  const firstYm = ymOf(range0)
  const lastData = [...byDay.keys()].sort().pop()
  const lastYm = [nowYm, lastData ? ymOf(lastData) : nowYm].sort().pop()!
  const endYm = ymOf(range1 === '9999-12-31' ? nowYm + '-01' : range1)
  // 처음 보여줄 달 = 기간 안 마지막 방문일이 있는 달 (없으면 기간 끝 달)
  const lastInRange = [...byDay.keys()].filter(d => d <= range1).sort().pop()
  const startYm = lastInRange ? ymOf(lastInRange) : endYm
  const [ym, setYm] = useState(startYm < firstYm ? firstYm : startYm > lastYm ? lastYm : startYm)
  const [sel, setSel] = useState<string | null>(null)

  const [y, m] = ym.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const lead = (first.getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${ym}-${pad(i + 1)}`)]
  while (cells.length % 7) cells.push(null)
  const inRange = (d: string) => d >= range0 && d <= range1
  const monthCount = shown.filter(v => ymOf(v.visit_date) === ym).length
  // 누적은 보고 있는 달 말일까지 (월별로 넘기면 같이 바뀜)
  const monthEnd = [`${ym}-${pad(days)}`, data.cumulative.range[1]].sort()[0]
  const cumMonth = shown
    .filter(v => v.url && v.posted_date && v.posted_date >= range0 && v.posted_date <= monthEnd)
    .reduce((a, v) => ({ uploads: a.uploads + 1, views: a.views + (v.views ?? 0) }), { uploads: 0, views: 0 })
  // 이 달 업로드된 콘텐츠 조회수 (방문 행 기준, 중복 없음)
  const monthViews = shown.filter(v => v.posted_date && ymOf(v.posted_date) === ym).reduce((a, v) => a + (v.views ?? 0), 0)
  const selList = sel ? (byDay.get(sel) ?? []).sort((a, b) => a.store.localeCompare(b.store)) : []

  const btn = 'w-8 h-8 rounded-[6px] border border-[#e3d9c4] bg-white grid place-items-center text-[13px] disabled:opacity-30'

  return (
    <div className="bg-white border border-[#f2ebdd] rounded-[6px] shadow-[0_4px_16px_rgba(30,41,59,.06)] p-4 sm:p-[18px]">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} disabled={ym <= firstYm} onClick={() => setYm(shiftYm(ym, -1))} aria-label="이전 달">
          ‹
        </button>
        <div className="text-[17px] font-extrabold tabular-nums">
          {y}.{pad(m)}
        </div>
        <button type="button" className={btn} disabled={ym >= lastYm} onClick={() => setYm(shiftYm(ym, 1))} aria-label="다음 달">
          ›
        </button>
        <span className="text-[12px] text-[#6b6558]">이 달 {monthCount}명</span>
        <div className="ml-auto flex gap-[3px] bg-[#f7f4ec] rounded-[8px] p-[3px]">
          {(
            [
              ['owm', 'OWM 전체'],
              ['optipharm', '옵티팜'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setScope(k)}
              className={`px-3 py-1 rounded-[6px] text-[12px] ${scope === k ? 'bg-white font-bold text-[#1a1d2e]' : 'text-[#4a4538]'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 mt-2 text-[11px]">
        <span className="text-[#1f7a4d]">■ 방문 완료</span>
        <span className="text-[#3557d6]">■ 방문 예정</span>
        <span className="text-[#6b6558]">날짜를 누르면 명단이 나와요</span>
      </div>

      {/* 맨 위 — 누적 조회수 요약 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        <Stat label={`누적 노출 조회수 (~${m}월)`} value={cumMonth.views.toLocaleString('ko-KR')} note={`${md(range0)} ~ ${md(monthEnd)} 업로드 기준`} strong />
        <Stat label={`누적 업로드 (~${m}월)`} value={`${cumMonth.uploads}건`} note={`${md(range0)} ~ ${md(monthEnd)}`} />
        <Stat label={`${m}월 조회수`} value={monthViews.toLocaleString('ko-KR')} note={`${m}월 업로드 콘텐츠 기준`} />
        <Stat label={`${m}월 방문`} value={`${monthCount}명`} note="예정 포함" />
      </div>

      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(84px,120px)] gap-1 mt-3">
        {[...WD, '주간 요약'].map(d => (
          <div key={d} className={`text-center text-[11px] font-bold ${d === '일' ? 'text-[#e03131]' : 'text-[#6b6558]'}`}>
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          // 한 주(7칸)가 끝나면 오른쪽에 주간 요약 칸
          const tail = i % 7 === 6 ? <WeekSummary key={`w${i}`} days={cells.slice(i - 6, i + 1)} byDay={byDay} /> : null
          if (!d) return tail ? [<div key={i} />, tail] : <div key={i} />
          const list = byDay.get(d) ?? []
          const done = list.filter(v => v.done).length
          const off = !inRange(d)
          return [
            <button
              key={d}
              type="button"
              onClick={() => setSel(sel === d ? null : d)}
              className={`text-left min-h-[64px] sm:min-h-[92px] rounded-[6px] p-1.5 border transition-colors ${
                sel === d ? 'border-[#3557d6] bg-[#eef2ff]' : list.length ? 'border-[#f0e9da] bg-[#faf8f3] hover:border-[#3557d6]' : 'border-transparent bg-[#fcfbf8]'
              } ${off ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center text-[11px]">
                <span className="text-[#6b6558]">{Number(d.slice(8))}</span>
                {list.length > 0 && (
                  <span
                    className={`ml-auto rounded-full px-1.5 text-[10px] font-extrabold text-white ${done === list.length ? 'bg-[#1f7a4d]' : done ? 'bg-[#8a6d3b]' : 'bg-[#3557d6]'}`}
                  >
                    {list.length}명
                  </span>
                )}
              </div>
              {/* 좁은 화면은 인원만, 넓으면 이름 3명까지 */}
              <div className="hidden sm:block mt-1 space-y-[1px]">
                {list.slice(0, 3).map(v => (
                  <div key={keyOf(v)} className={`text-[10.5px] leading-tight truncate ${v.done ? 'text-[#1f7a4d]' : 'text-[#3557d6]'}`}>
                    {v.handle}
                  </div>
                ))}
                {list.length > 3 && <div className="text-[10px] text-[#6b6558]">+{list.length - 3}명</div>}
              </div>
            </button>,
            tail,
          ]
        })}
      </div>

      {sel && (
        <div className="mt-4 border-t border-dashed border-[#e3d9c4] pt-3">
          <div className="text-[14px] font-extrabold">
            {md(sel)} 방문 <span className="text-[#6b6558] font-medium">{selList.length}명</span>
          </div>
          {selList.length === 0 ? (
            <p className="text-[12px] text-[#6b6558] mt-2">이 날은 방문이 없어요</p>
          ) : (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {selList.map(v => (
                <div key={keyOf(v)} className="border border-[#f0e9da] rounded-[6px] px-3 py-2 text-[12.5px] min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold truncate">{v.handle}</span>
                    {v.opti && <span className="text-[10px] font-bold rounded-full px-1.5 bg-[#e8f5ee] text-[#1f7a4d]">옵티팜</span>}
                    <span
                      className={`ml-auto text-[10.5px] font-bold rounded-full px-2 py-[1px] ${v.done ? 'bg-[#e8f5ee] text-[#1f7a4d]' : 'bg-[#eef2ff] text-[#3557d6]'}`}
                    >
                      {v.done ? (v.url ? '업로드 완료' : '방문 완료') : '방문 예정'}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-[#6b6558] mt-0.5 flex gap-2">
                    <span>{v.store}</span>
                    {v.views != null && <span>조회수 {v.views.toLocaleString('ko-KR')}</span>}
                    {v.url && (
                      <a href={v.url} target="_blank" rel="noreferrer" className="ml-auto text-[#3557d6] hover:underline">
                        콘텐츠 열기 ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** 작은 달력 — 탭(①~⑧)의 기간·방문일을 한눈에. 날짜를 누르면 그 날만 */
export function MiniCalendar({
  rows,
  range,
  selected,
  onSelect,
}: {
  rows: ReportRow[]
  range: [string, string]
  selected: string | null
  onSelect: (d: string | null) => void
}) {
  const counts = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const r of rows) m.set(r.visit_date, (m.get(r.visit_date) ?? new Set()).add(`${r.store}|${r.handle}`))
    return m
  }, [rows])
  const dates = [...counts.keys()].sort()
  const end = range[1] === '9999-12-31' ? (dates[dates.length - 1] ?? range[0]) : range[1]
  // 달은 구간(주차)을 따라간다 — 따로 넘기는 버튼 없음
  const ym = ymOf(dates[dates.length - 1] ?? end)
  const [y, m] = ym.split('-').map(Number)
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${ym}-${pad(i + 1)}`)]
  const inRange = (d: string) => d >= range[0] && d <= end

  return (
    <div className="w-full max-w-[280px]">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[13px] font-extrabold tabular-nums">
          {y}.{pad(m)}
        </span>
        {selected && (
          <button type="button" onClick={() => onSelect(null)} className="ml-auto text-[11px] text-[#3557d6] hover:underline">
            전체 보기
          </button>
        )}
      </div>
      <div className="grid grid-cols-7 gap-[3px] text-center">
        {WD.map(d => (
          <div key={d} className={`text-[10px] font-bold ${d === '일' ? 'text-[#e03131]' : 'text-[#9a9384]'}`}>
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const n = counts.get(d)?.size ?? 0
          const on = selected === d
          return (
            <button
              key={d}
              type="button"
              disabled={!n}
              onClick={() => onSelect(on ? null : d)}
              title={n ? `${md(d)} ${n}명` : undefined}
              className={`relative aspect-square rounded-[6px] text-[11px] tabular-nums ${
                on
                  ? 'bg-[#1a1d2e] text-white font-extrabold'
                  : n
                    ? 'bg-[#3557d6] text-white font-bold hover:opacity-85'
                    : inRange(d)
                      ? 'bg-[#eef2ff] text-[#6b6558]'
                      : 'text-[#c9c2b2]'
              }`}
            >
              {Number(d.slice(8))}
              {n > 0 && <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-[3px] rounded-full bg-[#f0b35a] text-[#1a1d2e] text-[9px] font-extrabold leading-[15px]">{n}</span>}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2 mt-2 text-[10.5px] text-[#6b6558]">
        <span><span className="inline-block w-2 h-2 rounded-sm bg-[#3557d6] mr-1" />방문일</span>
        <span><span className="inline-block w-2 h-2 rounded-sm bg-[#eef2ff] border border-[#d5ddf7] mr-1" />기간</span>
      </div>
    </div>
  )
}

function Stat({ label, value, note, strong }: { label: string; value: string; note: string; strong?: boolean }) {
  return (
    <div className={`rounded-[6px] px-3 py-2.5 ${strong ? 'bg-[#eef2ff]' : 'bg-[#faf8f3]'}`}>
      <div className={`text-[11.5px] ${strong ? 'text-[#2541a8] font-bold' : 'text-[#6b6558]'}`}>{label}</div>
      <div className="text-[18px] sm:text-[20px] font-extrabold tabular-nums truncate">{value}</div>
      <div className="text-[10.5px] text-[#9a9384]">{note}</div>
    </div>
  )
}

/** 달력 오른쪽 — 그 주 방문 인원 · 조회수 */
function WeekSummary({ days, byDay }: { days: (string | null)[]; byDay: Map<string, Visit[]> }) {
  const list = days.flatMap(d => (d ? (byDay.get(d) ?? []) : []))
  const done = list.filter(v => v.done).length
  const views = list.reduce((a, v) => a + (v.views ?? 0), 0)
  return (
    <div className="rounded-[6px] bg-[#1a1d2e] text-white px-2 py-1.5 flex flex-col justify-center min-h-[64px] sm:min-h-[92px]">
      <div className="text-[10px] text-white/60">방문</div>
      <div className="text-[14px] sm:text-[15px] font-extrabold tabular-nums">{list.length}명</div>
      {list.length > 0 && done < list.length && <div className="text-[10px] text-white/60">예정 {list.length - done}</div>}
      <div className="text-[10px] text-white/60 mt-1">조회수</div>
      <div className="text-[12px] sm:text-[13px] font-extrabold tabular-nums truncate">{views ? views.toLocaleString('ko-KR') : '–'}</div>
    </div>
  )
}
