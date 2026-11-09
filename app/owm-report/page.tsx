'use client'

import { useEffect, useState } from 'react'
import LoginGate from '@/components/LoginGate'
import VisitCalendar, { MiniCalendar } from '@/components/owm/VisitCalendar'
import { weekLabel, weeksSince } from '@/lib/week'

/** 10월부터 이번 주까지 주차 목록 */
const WEEKS = weeksSince('2026-10')
/** 2026.10 ~ 이번 달 */
const MONTHS = (() => {
  const out: string[] = []
  const now = new Date()
  for (let d = new Date(2026, 9, 1); d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  return out
})()
import type { Group, OwmReport, ReportRow, ReportTable, Span, Status } from '@/lib/owm-report'

const COLUMNS = ['방문일', '지점', '인플루언서 핸들', '콘텐츠', '업로드일', '조회수']
const CIRCLED = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧']
const f = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`
const rangeLabel = (r: [string, string]) => (r[1] === '9999-12-31' ? `${f(r[0])} ~` : `${f(r[0])} ~ ${f(r[1])}`)
const people = (t: ReportTable) => new Set(t.rows.map(r => `${r.visit_date}|${r.store}|${r.handle}`)).size
const num = (v: number) => v.toLocaleString('ko-KR')

const CARD = 'bg-white border border-[#f2ebdd] rounded-[6px] shadow-[0_4px_16px_rgba(30,41,59,.06)]'
const GROUPS: [Group, string, string][] = [
  ['owm', 'OWM 전체', '약국 방문 콘텐츠 전체 (옵티팜 노출 무관)'],
  ['optipharm', '옵티팜', '옵티팜이 노출된 콘텐츠'],
]
const TABS: [Status, Span, string][] = [
  ['planned', 'weekly', '방문예정 · 주간'],
  ['planned', 'cumulative', '방문예정 · 누적'],
  ['visited', 'weekly', '방문 · 주간'],
  ['visited', 'cumulative', '방문 · 누적'],
]

function SectionHead({ no, title, sub }: { no: string; title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <div className="text-[12px] font-bold text-[#3557d6] tracking-wide">{no}</div>
      <h2 className="text-[22px] sm:text-[26px] font-extrabold leading-tight">{title}</h2>
      {sub && <p className="text-[13px] text-[#6b6558] mt-1">{sub}</p>}
    </div>
  )
}

function Tile({ label, value, unit, note }: { label: string; value: number; unit?: string; note: string }) {
  return (
    <div className="bg-[#faf8f3] rounded-[6px] px-3 py-3 min-w-0">
      <div className="text-[12px] text-[#6b6558]">{label}</div>
      <div className="text-[20px] sm:text-[24px] font-extrabold tabular-nums truncate">
        {num(value)}
        {unit && <span className="text-[13px] font-bold text-[#6b6558] ml-0.5">{unit}</span>}
      </div>
      <div className="text-[11px] text-[#9a9384]">{note}</div>
    </div>
  )
}

function DataTable({ t }: { t: ReportTable }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] min-w-[720px]">
        <thead className="text-[#6b6558] bg-[#faf8f3]">
          <tr>
            {COLUMNS.map(c => (
              <th key={c} className={`font-bold px-3 py-2 whitespace-nowrap ${c === '조회수' ? 'text-right' : 'text-left'}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-10 text-center text-[#9a9384]">
                해당 기간 데이터가 없어요
              </td>
            </tr>
          )}
          {t.rows.map((r, i) => (
            <tr key={i} className="border-t border-[#f2ebdd]">
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">{r.visit_date}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r.store}</td>
              <td className="px-3 py-2 font-bold whitespace-nowrap">{r.handle}</td>
              <td className="px-3 py-2 max-w-[300px] truncate">
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" title={r.url} className="text-[#3557d6] hover:underline whitespace-nowrap">
                    콘텐츠 열기 ↗
                  </a>
                ) : (
                  <span className="text-[#c4bcaa]">—</span>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">{r.posted_date ?? '—'}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.views != null ? num(r.views) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const shiftDay = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10)
const mondayOfDay = (d: string) => shiftDay(d, -((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7))

/**
 * 방문 리스트 — 맨 위 ◀ 주차 ▶ 가 ①~④ 전체에 적용된다.
 * 주간 = 고른 주(월~일), 누적 = 시작일 ~ 고른 주 일요일. 지난 주의 방문예정은 그 주 방문 전체로.
 */
function GroupTables({ data, group, label, desc, no, week }: { data: OwmReport; group: Group; label: string; desc: string; no: string; week?: string }) {
  const [sel, setSel] = useState(0)
  const [day, setDay] = useState<string | null>(null)
  const raw = TABS.map(([st, sp]) => data.tables.find(t => t.group === group && t.status === st && t.span === sp)!)
  const plannedCum = raw[1]
  const visitedCum = raw[3]
  const start = visitedCum.range[0]
  const defaultWeek = mondayOfDay(raw[0].range[0])
  // 구간은 상단 헤더 기간을 따른다 (주간 모드면 그 주, 아니면 기본 주)
  const wk = week ?? defaultWeek
  const wr: [string, string] = [wk, shiftDay(wk, 6)]
  const firstWeek = mondayOfDay(start)
  const lastPlanned = plannedCum.rows.map(r => r.visit_date).sort().pop() ?? data.today
  const lastWeek = mondayOfDay([lastPlanned, data.today].sort().pop()!)
  const inWeek = (r: ReportRow) => r.visit_date >= wr[0] && r.visit_date <= wr[1]
  const byDate = (a: ReportRow, b: ReportRow) => a.visit_date.localeCompare(b.visit_date) || a.store.localeCompare(b.store)
  const past = wr[0] <= data.today

  const tables: ReportTable[] = [
    { ...raw[0], range: wr, rows: [...plannedCum.rows, ...(past ? visitedCum.rows : [])].filter(inWeek).sort(byDate) },
    { ...raw[1], range: [start, wr[1]], rows: [...plannedCum.rows, ...(past ? visitedCum.rows : [])].filter(r => r.visit_date <= wr[1]).sort(byDate) },
    { ...raw[2], range: wr, rows: visitedCum.rows.filter(inWeek).sort(byDate) },
    { ...raw[3], range: [start, [wr[1], visitedCum.range[1]].sort()[0]], rows: visitedCum.rows.filter(r => r.visit_date <= wr[1]).sort(byDate) },
  ]
  // 지난 주면 방문예정 탭 숨김
  const kstToday = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  const visible = tables.map((_, i) => i).filter(i => !(i < 2 && wr[1] < kstToday))
  const cur = visible.includes(sel) ? sel : visible[0]
  const t = tables[cur]
  const wkUploads = t.rows.filter(r => r.url).length
  const wkViews = t.rows.reduce((a, r) => a + (r.views ?? 0), 0)
  const shown = day ? { ...t, rows: t.rows.filter(r => r.visit_date === day) } : t

  return (
    <section className="mt-10">
      <SectionHead no={no} title={`${label} 방문 리스트`} sub={desc} />
      <div className={`${CARD} overflow-hidden`}>
        {/* 구간 요약 — 기간은 상단 헤더에서 */}
        <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 pt-3">
          <span className="text-[12px] font-bold text-[#6b6558]">구간 {f(wr[0])} ~ {f(wr[1])}</span>
          <span className="ml-auto flex flex-wrap gap-1.5 text-[11.5px]">
            <span className="rounded-full bg-[#eef2ff] text-[#2541a8] font-bold px-2 py-[2px]">방문 {people(t)}명</span>
            <span className="rounded-full bg-[#f6f0e3] text-[#4a4538] font-bold px-2 py-[2px]">업로드 {wkUploads}건</span>
            <span className="rounded-full bg-[#e8f5ee] text-[#1f7a4d] font-bold px-2 py-[2px]">조회수 {num(wkViews)}</span>
          </span>
        </div>
        <div className={`grid grid-cols-2 ${visible.length === 4 ? "sm:grid-cols-4" : ""} gap-2 p-3 border-b border-[#f2ebdd]`}>
          {visible.map(i => tables[i]).map((x, j) => { const i = visible[j]; return (
            <button
              key={x.key}
              type="button"
              onClick={() => {
                setSel(i)
                setDay(null)
              }}
              className={`text-left rounded-[6px] px-3 py-2 transition-colors ${
                i === cur ? 'bg-[#3557d6] text-white' : 'bg-[#faf8f3] hover:bg-[#f2ebdd]'
              }`}
            >
              <div className="text-[12.5px] font-bold">
                {CIRCLED[x.no]} {TABS[i][2]}
              </div>
              <div className={`text-[11.5px] tabular-nums ${i === cur ? 'text-white/75' : 'text-[#6b6558]'}`}>
                {rangeLabel(x.range)} · {people(x)}명
              </div>
            </button>
          )})}
        </div>
        {/* 작은 달력 + 표 */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-4 p-3 sm:p-4">
          <MiniCalendar key={`${t.key}|${wk}`} rows={t.rows} range={t.range} selected={day} onSelect={setDay} />
          <div className="min-w-0">
            {day && <div className="text-[12.5px] font-bold mb-2">{f(day)} 방문 · {people(shown)}명</div>}
            {t.rows.length === 0 ? (
              <p className="text-[13px] text-[#6b6558] py-6 text-center">이 구간에는 방문이 없어요</p>
            ) : (
              <DataTable t={shown} />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function OwmReportPage() {
  return (
    <LoginGate>
      <OwmReportInner />
    </LoginGate>
  )
}

function OwmReportInner() {
  const [data, setData] = useState<OwmReport | null>(null)
  const [error, setError] = useState('')
  // 기간 지정 — 비우면 기본(누적 11/1~오늘, 주간 = 지난주)
  const [mode, setMode] = useState<'all' | 'month' | 'week' | 'range'>('week') // 기본 = 이번 주
  const [mi, setMi] = useState(MONTHS.length - 1)
  const [wi, setWi] = useState(WEEKS.length - 1)
  const [from, setFrom] = useState('2026-09-01')
  const [to, setTo] = useState(new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10))
  const query = mode === 'range' ? (from && to && from <= to ? `?from=${from}&to=${to}` : '') : mode === 'month' ? `?month=${MONTHS[mi]}` : mode === 'week' ? `?week=${WEEKS[wi].start}` : ''
  const canPrev = mode !== 'range' && (mode === 'all' || (mode === 'month' ? mi > 0 : wi > 0))
  const canNext = mode === 'month' ? mi < MONTHS.length - 1 : mode === 'week' ? wi < WEEKS.length - 1 : false
  const step = (n: number) => {
    if (mode === 'all') {
      setMode('month')
      setMi(MONTHS.length - 1)
    } else if (mode === 'month') setMi(i => i + n)
    else setWi(i => i + n)
  }
  const periodText =
    mode === 'range'
      ? `${f(from)}~${f(to)}`
      : mode === 'month'
      ? `${MONTHS[mi].replace('-', '.')} (${Number(MONTHS[mi].slice(5))}월)`
      : mode === 'week'
        ? `${weekLabel(WEEKS[wi]).replace(/ \(.*\)/, '')} · ${f(WEEKS[wi].start)}~${f(WEEKS[wi].end)}`
        : `${MONTHS[0].replace('-', '.')} – ${MONTHS[MONTHS.length - 1].replace('-', '.')} 누적`

  useEffect(() => {
    setData(null)
    setError('')
    fetch(`/api/owm-report${query}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError('불러오기 실패'))
  }, [query])

  const tbl = (g: Group, st: Status, sp: Span) => data?.tables.find(t => t.group === g && t.status === st && t.span === sp)

  return (
    <div className="min-h-screen bg-[#fdf6e9] text-[#1a1d2e] font-sans pb-20 overflow-x-clip">
      <header className="border-b border-[#f2ebdd] bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-7 py-4 flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-[18px] sm:text-[20px] font-extrabold">OWM · 옵티팜 리포트</h1>
            {/* 지금 보고 있는 기간 — 크게 */}
            {data && (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mt-1">
                <span className="text-[15px] sm:text-[17px] font-extrabold text-[#3557d6] tabular-nums">
                  주간 {rangeLabel(data.summary.range)} <span className="text-[12px] font-bold text-[#6b6558]">(월~일)</span>
                </span>
                <span className="text-[15px] sm:text-[17px] font-extrabold text-[#1f7a4d] tabular-nums">누적 {rangeLabel(data.cumulative.range)}</span>
              </div>
            )}
          </div>
          {/* 기간 — 대시보드와 같은 ◀ 기간 ▶ + 전체/월별/주간 */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button type="button" disabled={!canPrev} onClick={() => step(-1)} className="w-[34px] h-[34px] rounded-[6px] border border-[#e3d9c4] bg-white text-[13px] disabled:opacity-30" aria-label="이전 기간">
              ◀
            </button>
            <span className="text-[15px] font-extrabold tabular-nums min-w-[150px] text-center">{periodText}</span>
            <button type="button" disabled={!canNext} onClick={() => step(1)} className="w-[34px] h-[34px] rounded-[6px] border border-[#e3d9c4] bg-white text-[13px] disabled:opacity-30" aria-label="다음 기간">
              ▶
            </button>
            {mode === 'range' && (
              <div className="flex items-center gap-1 text-[12.5px]">
                <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className="h-[34px] rounded-[6px] border border-[#e3d9c4] bg-white px-2" aria-label="시작일" />
                <span>~</span>
                <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className="h-[34px] rounded-[6px] border border-[#e3d9c4] bg-white px-2" aria-label="종료일" />
              </div>
            )}
            <div className="flex gap-[3px] bg-[#f7f4ec] rounded-full p-[3px] text-[12.5px]" role="tablist">
              {(
                [
                  ['all', '전체'],
                  ['month', '월별'],
                  ['week', '주간'],
                  ['range', '기간'],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={mode === k}
                  onClick={() => setMode(k)}
                  className={`rounded-full px-3 py-1 ${mode === k ? 'bg-[#1a1d2e] text-white font-extrabold' : 'text-[#6b6558] font-semibold hover:text-[#1a1d2e]'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <a
            href={`/api/owm-report/xlsx${query}`}
            download
            className="rounded-[6px] bg-[#1f7a4d] hover:bg-[#19663f] text-white px-4 py-2 text-[13px] font-bold shadow-[0_4px_16px_rgba(31,122,77,.2)]"
          >
            엑셀 다운로드
          </a>
        </div>
      </header>


      <div className="max-w-[1480px] mx-auto px-4 sm:px-7 mt-8 xl:grid xl:grid-cols-[232px_minmax(0,1180px)] xl:gap-8 xl:justify-center">
        {/* 왼쪽 달력 위젯 — 지금 조회 중인 기간 표시, 주를 누르면 그 주로 */}
      {data ? (
        <PeriodWidget
          week={data.summary.range}
          cum={data.cumulative.range}
          onPickWeek={start => {
            const i = WEEKS.findIndex(w => w.start === start)
            if (i >= 0) {
              setMode('week')
              setWi(i)
            }
          }}
        />
      ) : (
        <div className="hidden xl:block" />
      )}
      <main className="min-w-0">
        {error && <p className="text-[#e03131] text-[13px]">{error}</p>}
        {!data && !error && <p className="text-[13px] text-[#6b6558]">불러오는 중…</p>}
        {data && (
          <>
            <section>
              <SectionHead
                no="01"
                title="요약"
                sub={`누적 = ${rangeLabel(data.cumulative.range)} · 주간 = ${rangeLabel(data.summary.range)} 업로드 기준`}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {GROUPS.map(([g, label, desc]) => {
                  const w = data.summary[g]
                  const c = data.cumulative[g]
                  const pw = tbl(g, 'planned', 'weekly')
                  const vw = tbl(g, 'visited', 'weekly')
                  const pc = tbl(g, 'planned', 'cumulative')
                  const vc = tbl(g, 'visited', 'cumulative')
                  return (
                    <div key={g} className={`${CARD} p-4 sm:p-5 min-w-0`}>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h3 className="text-[17px] font-extrabold">{label}</h3>
                        <span className="text-[12px] text-[#6b6558]">{desc}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {/* 누적이 위, 주간이 아래 */}
                        <Tile label="누적 노출 조회수" value={c.views} note={rangeLabel(data.cumulative.range)} />
                        <Tile label="누적 업로드 콘텐츠" value={c.uploads} unit="건" note={rangeLabel(data.cumulative.range)} />
                        <Tile label="주간 노출 조회수" value={w.views} note={rangeLabel(data.summary.range)} />
                        <Tile label="주간 업로드 콘텐츠" value={w.uploads} unit="건" note={rangeLabel(data.summary.range)} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
                        {([
                          ['방문·누적', vc],
                          ['방문예정·누적', pc],
                          ['방문·주간', vw],
                          ['방문예정·주간', pw],
                        ] as const).map(([l, t]) => (
                          <div key={l} className="border border-[#f2ebdd] rounded-[6px] px-2.5 py-2">
                            <div className="text-[#6b6558]">{l}</div>
                            <div className="text-[15px] font-extrabold tabular-nums">{t ? people(t) : 0}명</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="mt-10">
              <SectionHead no="02" title="방문 달력" sub={`${rangeLabel(data.cumulative.range)} 기간 · 누가 언제 방문했는지 (예정 포함)`} />
              <VisitCalendar key={`${data.cumulative.range[0]}|${data.cumulative.range[1]}`} data={data} />
            </section>

            {GROUPS.map(([g, label, desc], i) => (
              <GroupTables key={`${g}|${query}`} week={mode === 'week' ? WEEKS[wi].start : undefined} data={data} group={g} label={label} desc={desc} no={`0${i + 3}`} />
            ))}

            <p className="mt-10 text-[12px] text-[#9a9384]">
              생성 {new Date(data.generated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} · 매주 월요일 오전 메일 발송 · 엑셀 = 요약 + ①~⑧
            </p>
          </>
        )}
      </main>
      </div>
    </div>
  )
}

/** 왼쪽 떠 있는 달력 — 주간(파랑)·누적(연두) 구간 표시. 넓은 화면에서만 */
function PeriodWidget({ week, cum, onPickWeek }: { week: [string, string]; cum: [string, string]; onPickWeek: (monday: string) => void }) {
  const [ym, setYm] = useState(week[1].slice(0, 7))
  useEffect(() => setYm(week[0].slice(0, 7)), [week])
  const [y, m] = ym.split('-').map(Number)
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)]
  while (cells.length % 7) cells.push(null)
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
  const shiftYm = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1))
    setYm(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  const nowYm = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 7)
  const cumEnd = cum[1] === '9999-12-31' ? '9999-12-31' : cum[1]
  return (
    <aside className="hidden xl:block sticky top-28 self-start w-[232px] bg-white border border-[#f2ebdd] rounded-[6px] shadow-[0_4px_16px_rgba(30,41,59,.08)] p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <button type="button" disabled={ym <= '2026-10'} onClick={() => shiftYm(-1)} className="w-6 h-6 rounded-[6px] border border-[#e3d9c4] text-[12px] disabled:opacity-30" aria-label="이전 달">
          ‹
        </button>
        <span className="text-[13px] font-extrabold tabular-nums">
          {y}.{String(m).padStart(2, '0')}
        </span>
        <button type="button" disabled={ym >= nowYm} onClick={() => shiftYm(1)} className="w-6 h-6 rounded-[6px] border border-[#e3d9c4] text-[12px] disabled:opacity-30" aria-label="다음 달">
          ›
        </button>
        <span className="ml-auto text-[10.5px] text-[#9a9384]">조회 기간</span>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[#9a9384] mb-1">
        {['월', '화', '수', '목', '금', '토', '일'].map(d => (
          <span key={d} className={d === '일' ? 'text-[#e03131]' : ''}>
            {d}
          </span>
        ))}
      </div>
      <div className="space-y-[2px]">
        {rows.map((r, i) => {
          const mon = r.find(Boolean)
          const monday = mon ? shiftDay(mon, -((new Date(`${mon}T00:00:00Z`).getUTCDay() + 6) % 7)) : null
          const pickable = !!monday && monday >= '2026-09-28'
          return (
            <button
              key={i}
              type="button"
              disabled={!pickable}
              onClick={() => monday && onPickWeek(monday)}
              title="이 주 보기"
              className="grid grid-cols-7 w-full rounded-[6px] hover:ring-1 hover:ring-[#3557d6] disabled:hover:ring-0"
            >
              {r.map((d, j) => {
                if (!d) return <span key={j} />
                const inWeek = d >= week[0] && d <= week[1]
                const inCum = d >= cum[0] && d <= cumEnd
                return (
                  <span
                    key={j}
                    className={`h-7 grid place-items-center text-[11px] tabular-nums ${
                      inWeek ? 'bg-[#3557d6] text-white font-extrabold' : inCum ? 'bg-[#e8f5ee] text-[#1f7a4d] font-bold' : 'text-[#6b6558]'
                    } ${inWeek && (j === 0 || d === week[0]) ? 'rounded-l-[6px]' : ''} ${inWeek && (j === 6 || d === week[1]) ? 'rounded-r-[6px]' : ''}`}
                  >
                    {Number(d.slice(8))}
                  </span>
                )
              })}
            </button>
          )
        })}
      </div>
      <div className="flex gap-3 mt-2 text-[10.5px]">
        <span className="text-[#3557d6] font-bold">■ 주간</span>
        <span className="text-[#1f7a4d] font-bold">■ 누적</span>
        <span className="text-[#9a9384]">줄 누르면 그 주</span>
      </div>
    </aside>
  )
}
