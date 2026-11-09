/**
 * 솔이사님 요청 — OWM 전체 / 옵티팜 분리 리포트 (서버 전용).
 * 테이블 8개 = 구분(OWM·옵티팜) × 상태(방문예정·방문) × 기간(주간·누적)
 * - 주간: 월~일 (KST). 방문 = 지난주, 방문예정 = 이번 주
 * - 누적: 2026-11-01 부터
 * - 옵티팜 = 회원사 또는 콘텐츠 브랜드에 「옵티팜」 포함
 */
import { createClient } from '@supabase/supabase-js'
import { isTestCompany } from '@/lib/test-companies.mjs'
import { isSeedingLocation, contentPostedDate } from '@/lib/posted-date'
import { contentMatchesBrand } from '@/lib/brand-content'
import { contentViews } from '@/lib/content-views'
import { createServerSupabase } from '@/lib/supabase-server'
import type { Content } from '@/lib/types'
import { col, safeSheetName, sheetRef, styledXlsx, type Cell, type CellValue, type StyledSheet, type Style } from '@/lib/xlsx-styled'

/** 리포트 시작일 — 10월부터 볼 수 있게 */
export const REPORT_START = '2026-10-01'
const PLACEHOLDER_VISIT = '2026-01-01'
const KST = 9 * 3600_000
const DAY = 86400_000

export const COLUMNS = ['방문일', '지점', '인플루언서 핸들', '콘텐츠 URL', '업로드일', '조회수'] as const

export interface ReportRow {
  visit_date: string
  store: string
  handle: string
  url: string | null
  posted_date: string | null
  views: number | null
}

export type Group = 'owm' | 'optipharm'
export type Status = 'planned' | 'visited'
export type Span = 'weekly' | 'cumulative'

export interface ReportTable {
  key: string
  no: number
  group: Group
  status: Status
  span: Span
  title: string
  range: [string, string]
  rows: ReportRow[]
}

export interface WeeklySummary {
  range: [string, string]
  owm: { uploads: number; views: number }
  optipharm: { uploads: number; views: number }
}

export interface OwmReport {
  generated_at: string
  today: string
  tables: ReportTable[]
  /** 주간 = 지난주(월~일) 업로드 기준 */
  summary: WeeklySummary
  /** 누적 = 11/1(또는 해당 월 1일) ~ 오늘 업로드 기준 */
  cumulative: WeeklySummary
}

const ymd = (t: number) => new Date(t).toISOString().slice(0, 10)

/** 기준일(KST)이 속한 주의 월요일 */
function mondayOf(date: string): number {
  const t = Date.parse(`${date}T00:00:00Z`)
  const dow = (new Date(t).getUTCDay() + 6) % 7
  return t - dow * DAY
}

export function handleOf(handle: string | null | undefined, url: string | null | undefined): string {
  const h = handle?.trim().replace(/^@/, '')
  if (h) return h
  const m = (url || '').match(/\/(?:user\/profile\/|@)?([A-Za-z0-9._-]+)\/?(?:\?.*)?$/)
  return m?.[1] ?? ''
}

/** 핸들이 내부 아이디(16자 이상 16진수 등)면 이름으로 보여준다 */
export function displayHandle(handle: string | null | undefined, name: string | null | undefined): string {
  const h = (handle ?? '').trim()
  if (!h || /^[0-9a-f]{16,}$/i.test(h)) return (name ?? '').trim() || h
  return h
}

interface AllocRow {
  status: string | null
  visit_date: string | null
  influencer_id: string | null
  influencers: { name: string | null; sns_url: string | null; instagram_handle: string | null } | null
  companies: { name: string | null; login_id: string | null } | null
  stores: { name: string | null } | null
}

interface Visit {
  date: string
  store: string
  handle: string
  name: string
  companies: string[]
  done: boolean
}

async function loadVisits(start: string): Promise<Visit[]> {
  const url = process.env.BP_SUPABASE_URL
  const key = process.env.BP_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('BoardingPass 환경변수 없음')
  const bp = createClient(url, key, { auth: { persistSession: false } })
  const data: AllocRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await bp
      .from('allocations')
      .select('status,visit_date,influencer_id,influencers(name,sns_url,instagram_handle),companies(name,login_id),stores(name)')
      .gte('visit_date', start)
      .neq('status', 'cancelled')
      .order('visit_date')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    data.push(...((page ?? []) as unknown as AllocRow[]))
    if (!page || page.length < 1000) break
  }
  const byKey = new Map<string, Visit>()
  for (const r of data) {
    if (!r.influencer_id || !r.visit_date || isTestCompany(r.companies)) continue
    const store = r.stores?.name?.trim() || '미정'
    if (isSeedingLocation(store)) continue
    const date = r.visit_date.slice(0, 10)
    if (date === PLACEHOLDER_VISIT) continue
    const k = `${date}|${store}|${r.influencer_id}`
    let v = byKey.get(k)
    if (!v) {
      v = {
        date,
        store,
        handle: handleOf(r.influencers?.instagram_handle, r.influencers?.sns_url),
        name: r.influencers?.name?.trim() || '',
        companies: [],
        done: false,
      }
      byKey.set(k, v)
    }
    if (r.status === 'picked_up') v.done = true
    const c = r.companies?.name?.trim()
    if (c && !v.companies.includes(c)) v.companies.push(c)
  }
  return [...byKey.values()]
}

async function loadContents(): Promise<Content[]> {
  const sb = createServerSupabase()
  const out: Content[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('contents').select('*').range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...((data ?? []) as Content[]))
    if (!data || data.length < 1000) break
  }
  return out
}

const isOpti = (names: (string | null | undefined)[]) => names.some(n => contentMatchesBrand(n, '옵티팜'))

/**
 * month 지정(YYYY-MM) 시 그 달 마감 기준 리포트: 누적 = 그 달 전체, 주간 = 마지막 주(월~말일)
 * 미지정 시 오늘 기준: 누적 = 11/1~, 방문·주간 = 지난주, 방문예정·주간 = 이번 주
 */
export async function buildOwmReport(opts: { month?: string; from?: string; to?: string; week?: string } = {}, now = Date.now()): Promise<OwmReport> {
  let start = REPORT_START
  let end = '9999-12-31'
  let today = ymd(now + KST)
  let thisWeek: [string, string]
  let lastWeek: [string, string]
  let visitWeek: [string, string] | undefined
  const isYmd = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d)
  if (isYmd(opts.week)) {
    // 주차 보기: 주간 = 그 주(월~일), 누적 = 그 달 1일 ~ 그 주 일요일(오늘까지)
    const mon = mondayOf(opts.week!)
    const wk: [string, string] = [ymd(mon), ymd(mon + 6 * DAY)]
    // 누적은 그 주가 속한 달(목요일 기준) 1일부터 — 월별 누적
    const monthStart = `${ymd(mon + 3 * DAY).slice(0, 7)}-01`
    if (monthStart > start) start = monthStart
    end = wk[1]
    if (today > end) today = end
    thisWeek = lastWeek = wk
    // 방문·주간 = 그 전주 (방문예정은 그 주)
    visitWeek = [ymd(mon - 7 * DAY), ymd(mon - DAY)]
  } else if (isYmd(opts.from) && isYmd(opts.to) && opts.from! <= opts.to!) {
    // 기간 지정: 누적 = from~to, 주간 = to 가 속한 주(from 이후)
    start = opts.from!
    end = opts.to!
    if (today > end) today = end
    const mon = ymd(mondayOf(end))
    thisWeek = lastWeek = [mon < start ? start : mon, end]
  } else if (opts.month && /^\d{4}-\d{2}$/.test(opts.month)) {
    const [y, m] = opts.month.split('-').map(Number)
    start = `${opts.month}-01`
    end = ymd(Date.UTC(y, m, 0))
    today = end
    thisWeek = lastWeek = [ymd(mondayOf(end)), end]
  } else {
    const thisMon = mondayOf(today)
    thisWeek = [ymd(thisMon), ymd(thisMon + 6 * DAY)]
    lastWeek = [ymd(thisMon - 7 * DAY), ymd(thisMon - DAY)]
  }

  const loadFrom = visitWeek && visitWeek[0] < start ? visitWeek[0] : start
  const [visits, contents] = await Promise.all([loadVisits(loadFrom), loadContents()])

  // 방문 → 콘텐츠 연결: 핸들 또는 이름 + 방문일
  const contentIndex = new Map<string, Content[]>()
  const push = (k: string, c: Content) => contentIndex.set(k, [...(contentIndex.get(k) ?? []), c])
  for (const c of contents) {
    if (!c.visit_date || !c.upload_url) continue
    const d = c.visit_date.slice(0, 10)
    const h = handleOf(c.sns_id, c.profile_url).toLowerCase()
    if (h) push(`h|${h}|${d}`, c)
    if (c.influencer_name) push(`n|${c.influencer_name.trim()}|${d}`, c)
  }

  type Expanded = ReportRow & { opti: boolean; done: boolean }
  const expanded: Expanded[] = []
  const used = new Set<Content>()
  for (const v of visits) {
    const hits = new Set([
      ...(contentIndex.get(`h|${v.handle.toLowerCase()}|${v.date}`) ?? []),
      ...(contentIndex.get(`n|${v.name}|${v.date}`) ?? []),
    ])
    const base = { visit_date: v.date, store: v.store, handle: displayHandle(v.handle, v.name), done: v.done }
    const visitOpti = isOpti(v.companies)
    if (!v.done || hits.size === 0) {
      expanded.push({ ...base, url: null, posted_date: null, views: null, opti: visitOpti })
      continue
    }
    for (const c of hits) {
      used.add(c)
      expanded.push({
        ...base,
        url: c.upload_url,
        posted_date: contentPostedDate(c),
        views: contentViews(c) || null,
        opti: visitOpti || isOpti([c.brands]),
      })
    }
  }
  // OWM = 약국 방문 전원: 보딩패스 배정에 없는 콘텐츠(시트 등록 등)도 방문으로 포함
  for (const c of contents) {
    if (used.has(c) || !c.upload_url || !c.visit_date || isSeedingLocation(c.location)) continue
    const d = c.visit_date.slice(0, 10)
    if (d < loadFrom || d > end) continue
    expanded.push({
      visit_date: d,
      store: c.location || '미정',
      handle: displayHandle(handleOf(c.sns_id, c.profile_url), c.influencer_name),
      url: c.upload_url,
      posted_date: contentPostedDate(c),
      views: contentViews(c) || null,
      done: true,
      opti: isOpti([c.brands]),
    })
  }
  expanded.sort((a, b) => a.visit_date.localeCompare(b.visit_date) || a.store.localeCompare(b.store))

  const groups: [Group, string][] = [['owm', 'OWM 전체'], ['optipharm', '옵티팜']]
  const cells: [Status, Span, string][] = [
    ['planned', 'weekly', '방문예정·주간'],
    ['planned', 'cumulative', '방문예정·누적'],
    ['visited', 'weekly', '방문·주간'],
    ['visited', 'cumulative', '방문·누적'],
  ]
  const tables: ReportTable[] = []
  let no = 1
  for (const [group, gLabel] of groups) {
    for (const [status, span, sLabel] of cells) {
      const range: [string, string] =
        span === 'cumulative'
          ? status === 'planned'
            ? [start, end]
            : [start, today]
          : status === 'planned'
            ? thisWeek
            : (visitWeek ?? lastWeek)
      const rows = expanded
        .filter(r => (group === 'owm' || r.opti) && (status === 'visited') === r.done)
        .filter(r => r.visit_date >= range[0] && r.visit_date <= range[1])
        .map(({ opti: _o, done: _d, ...row }) => row)
      tables.push({ key: `${group}-${status}-${span}`, no: no++, group, status, span, title: `${gLabel} ${sLabel}`, range, rows })
    }
  }

  // 주간 요약: 지난주에 업로드된 콘텐츠 수·조회수
  const postedIn = (a: string, b: string) =>
    contents.filter(c => {
      if (!c.upload_url || isSeedingLocation(c.location)) return false
      const d = contentPostedDate(c)
      return !!d && d >= a && d <= b
    })
  const weekly = postedIn(lastWeek[0], lastWeek[1])
  const cumEnd = end < today ? end : today
  const cum = postedIn(start, cumEnd)
  const sum = (list: Content[]) => ({ uploads: list.length, views: list.reduce((s, c) => s + contentViews(c), 0) })

  return {
    generated_at: new Date(now).toISOString(),
    today,
    tables,
    summary: {
      range: lastWeek,
      owm: sum(weekly),
      optipharm: sum(weekly.filter(c => isOpti([c.brands]))),
    },
    cumulative: {
      range: [start, cumEnd],
      owm: sum(cum),
      optipharm: sum(cum.filter(c => isOpti([c.brands]))),
    },
  }
}

export function reportRangeLabel(t: ReportTable): string {
  const f = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`
  if (t.range[1] === '9999-12-31') return `${f(t.range[0])} ~`
  return `${f(t.range[0])} ~ ${f(t.range[1])}`
}

/** 인원 = 방문일·지점·핸들 중복 제거 (콘텐츠 여러 건이어도 1명) */
export const tablePeople = (t: ReportTable) => new Set(t.rows.map(r => `${r.visit_date}|${r.store}|${r.handle}`)).size

export const findTable = (r: OwmReport, group: Group, status: Status, span: Span) =>
  r.tables.find(t => t.group === group && t.status === status && t.span === span)!

const CIRCLED = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧']
export const tableSheetName = (t: ReportTable) => safeSheetName(`${CIRCLED[t.no] ?? t.no} ${t.title.replace('·', ' ')}`)

/** 2026-10-01 → 26년 40주차 (ISO, 월요일 시작) */
const isoWeekOf = (ymd: string) => {
  const d = new Date(`${ymd}T00:00:00Z`)
  const thu = new Date(d)
  thu.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7))
  const y = thu.getUTCFullYear()
  const wk = Math.ceil(((thu.getTime() - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7)
  return { y, wk }
}
const weekRange = (t: ReportTable) => {
  const a = isoWeekOf(t.range[0])
  if (t.range[1] === '9999-12-31') return `${String(a.y).slice(2)}년 ${a.wk}주차 ~`
  const b = isoWeekOf(t.range[1])
  const A = `${String(a.y).slice(2)}년 ${a.wk}주차`
  if (a.y === b.y && a.wk === b.wk) return A
  return `${A} ~ ${a.y === b.y ? '' : `${String(b.y).slice(2)}년 `}${b.wk}주차`
}
const fullRange = (t: ReportTable) => (t.range[1] === '9999-12-31' ? `${t.range[0]} ~` : `${t.range[0]} ~ ${t.range[1]}`)

/* ───────────── 엑셀 워크북 (보고서형 디자인) ───────────── */

const C = {
  navy: '1A1D2E',
  owm: '3557D6',
  opti: '1F7A4D',
  cream: 'FAF8F3',
  owmLight: 'EEF2FF',
  optiLight: 'E8F5EE',
  line: 'E3D9C4',
  grey: '8A8373',
  ink: '2A2620',
  white: 'FFFFFF',
  orange: 'C2410C',
}
const groupColor = (g: Group) => (g === 'owm' ? C.owm : C.opti)
const groupLight = (g: Group) => (g === 'owm' ? C.owmLight : C.optiLight)
const groupName = (g: Group) => (g === 'owm' ? 'OWM 전체' : '옵티팜')

const st = {
  band: (fill: string, sz = 16): Style => ({ font: { b: true, sz, color: C.white }, fill, h: 'left', indent: 1 }),
  bandSub: (fill: string): Style => ({ font: { sz: 10, color: 'D9DCEA' }, fill, h: 'left', indent: 1 }),
  cardHead: (fill: string): Style => ({ font: { b: true, sz: 12, color: C.white }, fill, h: 'center', border: { left: 'thin', right: 'thin', top: 'thin', color: fill } }),
  cardLabel: (fill: string): Style => ({ font: { sz: 9, color: C.grey }, fill, h: 'center', v: 'bottom', border: { left: 'thin', right: 'thin', color: C.line } }),
  cardNum: (fill: string, color: string): Style => ({ font: { b: true, sz: 20, color }, fill, h: 'center', v: 'top', numFmt: '#,##0', border: { left: 'thin', right: 'thin', color: C.line } }),
  pplLabel: { font: { sz: 8, color: C.grey }, fill: C.cream, h: 'center', v: 'bottom', border: { left: 'thin', right: 'thin', top: 'thin', color: C.line } } as Style,
  pplNum: { font: { b: true, sz: 12, color: C.ink }, fill: C.cream, h: 'center', v: 'top', numFmt: '#,##0"명"', border: { left: 'thin', right: 'thin', bottom: 'thin', color: C.line } } as Style,
  section: { font: { b: true, sz: 12, color: C.navy }, border: { bottom: 'medium', color: C.navy }, v: 'bottom' } as Style,
  th: (fill = C.navy): Style => ({ font: { b: true, sz: 10, color: C.white }, fill, h: 'center', border: { left: 'thin', right: 'thin', top: 'thin', bottom: 'thin', color: C.line }, wrap: true }),
  td: (fill?: string, h: Style['h'] = 'left'): Style => ({ fill, h, border: 'thin', font: { sz: 10, color: C.ink } }),
  tdNum: (fill?: string, fmt = '#,##0'): Style => ({ fill, h: 'right', border: 'thin', numFmt: fmt, font: { sz: 10, color: C.ink } }),
  dash: (fill?: string): Style => ({ fill, h: 'center', border: 'thin', font: { sz: 10, color: 'B8B0A0' } }),
  link: (fill?: string): Style => ({ fill, h: 'center', border: 'thin', font: { u: true, sz: 10, color: C.owm } }),
  status: (fill: string | undefined, color: string): Style => ({ fill, h: 'center', border: 'thin', font: { b: true, sz: 9, color } }),
  total: (h: Style['h'] = 'left', fmt?: string): Style => ({ font: { b: true, sz: 10, color: C.navy }, fill: 'F1ECE0', h, numFmt: fmt, border: { top: 'medium', bottom: 'thin', left: 'thin', right: 'thin', color: C.navy } }),
  muted: { font: { sz: 9, color: C.grey }, h: 'left', indent: 1 } as Style,
  kpi: { font: { b: true, sz: 11, color: C.ink }, fill: C.cream, h: 'left', indent: 1, border: { top: 'thin', bottom: 'thin', color: C.line } } as Style,
}

/** 셀 격자 — 병합·높이 관리 (0-based) */
class Grid {
  rows: Cell[][] = []
  merges: string[] = []
  heights: Record<number, number> = {}
  put(r: number, c: number, v: CellValue, s?: Style, extra?: Partial<Cell>) {
    while (this.rows.length <= r) this.rows.push([])
    const row = this.rows[r]
    while (row.length <= c) row.push({ v: null })
    row[c] = { v, s, ...extra }
  }
  /** 범위를 같은 스타일로 채우고 병합 (값은 왼쪽 위) */
  box(r1: number, c1: number, r2: number, c2: number, v: CellValue, s?: Style, extra?: Partial<Cell>) {
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) this.put(r, c, r === r1 && c === c1 ? v : null, s, r === r1 && c === c1 ? extra : undefined)
    if (r2 > r1 || c2 > c1) this.merges.push(`${col(c1)}${r1 + 1}:${col(c2)}${r2 + 1}`)
  }
  h(r: number, pt: number) {
    this.heights[r] = pt
  }
}

const WD = ['일', '월', '화', '수', '목', '금', '토']
const dateLabel = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))} (${WD[new Date(`${d}T00:00:00Z`).getUTCDay()]})` : d || '–')
const sumViews = (rows: ReportRow[]) => rows.reduce((a, x) => a + (x.views ?? 0), 0)
const contentCount = (rows: ReportRow[]) => rows.filter(x => x.url).length

function statusOf(t: ReportTable, x: ReportRow): { label: string; color: string } {
  if (t.status === 'planned') return { label: '방문 예정', color: C.owm }
  if (x.url) return { label: '업로드 완료', color: C.opti }
  return { label: '링크 대기', color: C.orange }
}

/** 「요약」 대시보드 */
function summarySheet(r: OwmReport, weekly = false): StyledSheet {
  const g = new Grid()
  const W = 11 // A..K
  const kst = new Date(Date.parse(r.generated_at) + KST).toISOString().slice(0, 16).replace('T', ' ')
  const [ws, we] = r.summary.range
  const [cs, ce] = r.cumulative.range
  const ppl = (k: Group, s: Status, sp: Span) => tablePeople(findTable(r, k, s, sp))
  // 주간 엑셀: 누적 없이 고른 주만
  const base: Span = weekly ? 'weekly' : 'cumulative'
  const baseKo = weekly ? '주간' : '누적'

  // 타이틀 밴드
  g.box(0, 0, 0, W - 1, 'OWM · 옵티팜 주간 리포트', st.band(C.navy, 16))
  g.h(0, 40)
  g.box(1, 0, 1, W - 1, weekly ? `주간 ${ws} ~ ${we} (월~일)` : `주간 ${ws} ~ ${we} (월~일)   ·   누적 ${cs} ~ ${ce}`, st.bandSub(C.navy))
  g.box(2, 0, 2, W - 1, `생성 ${kst} (KST)   ·   by 브랜드슬램`, st.bandSub(C.navy))
  g.h(1, 18)
  g.h(2, 18)
  g.h(3, 12)

  // KPI 카드
  const card = (k: Group, c0: number) => {
    const fill = groupLight(k)
    const color = groupColor(k)
    const w = k === 'owm' ? r.summary.owm : r.summary.optipharm
    const cu = k === 'owm' ? r.cumulative.owm : r.cumulative.optipharm
    g.box(4, c0, 4, c0 + 3, groupName(k), st.cardHead(color))
    const pair = (row: number, l1: string, n1: number, l2: string, n2: number) => {
      g.box(row, c0, row, c0 + 1, l1, st.cardLabel(fill))
      g.box(row, c0 + 2, row, c0 + 3, l2, st.cardLabel(fill))
      g.box(row + 1, c0, row + 1, c0 + 1, n1, st.cardNum(fill, color))
      g.box(row + 1, c0 + 2, row + 1, c0 + 3, n2, st.cardNum(fill, color))
    }
    pair(5, '주간 노출 조회수', w.views, '주간 업로드 콘텐츠', w.uploads)
    if (weekly) {
      pair(7, '방문예정 인원 · 주간', ppl(k, 'planned', 'weekly'), '방문 인원 · 주간', ppl(k, 'visited', 'weekly'))
      return
    }
    pair(7, '누적 노출 조회수', cu.views, '누적 업로드 콘텐츠', cu.uploads)
    const people: [string, number][] = [
      ['방문예정 · 주간', ppl(k, 'planned', 'weekly')],
      ['방문예정 · 누적', ppl(k, 'planned', 'cumulative')],
      ['방문 · 주간', ppl(k, 'visited', 'weekly')],
      ['방문 · 누적', ppl(k, 'visited', 'cumulative')],
    ]
    people.forEach(([l, n], i) => {
      g.put(9, c0 + i, l, st.pplLabel)
      g.put(10, c0 + i, n, st.pplNum)
    })
  }
  card('owm', 1)
  card('optipharm', 6)
  g.h(4, 26)
  ;[5, 7].forEach(i => g.h(i, 20))
  ;[6, 8].forEach(i => g.h(i, 34))
  g.h(9, 16)
  g.h(10, 22)
  g.box(11, 1, 11, 9, 'OWM 전체 = 약국 방문 콘텐츠 전체(옵티팜 노출 여부 무관)  ·  옵티팜 = 옵티팜이 노출된 콘텐츠  ·  조회수·업로드 = 업로드일 기준', st.muted)

  // 지점별 요약 (누적 방문 기준)
  let R = 13
  g.box(R, 1, R, 9, `지점별 요약  (${baseKo} 방문 기준)`, st.section)
  g.h(R, 24)
  R++
  const vo = findTable(r, 'owm', 'visited', base).rows
  const vp = findTable(r, 'optipharm', 'visited', base).rows
  const stores = [...new Set([...vo, ...vp].map(x => x.store || '(지점 미상)'))].sort((a, b) => a.localeCompare(b, 'ko'))
  const agg = (rows: ReportRow[], store?: string) => {
    const rs = store === undefined ? rows : rows.filter(x => (x.store || '(지점 미상)') === store)
    return [new Set(rs.map(x => `${x.visit_date}|${x.store}|${x.handle}`)).size, contentCount(rs), sumViews(rs)]
  }
  g.box(R, 1, R + 1, 2, '지점', st.th())
  g.box(R, 3, R, 5, 'OWM 전체', st.th(C.owm))
  g.box(R, 6, R, 9, '옵티팜', st.th(C.opti))
  const sub = ['방문 인원', '업로드 콘텐츠', '조회수']
  g.put(R + 1, 3, sub[0], st.th(C.owm))
  g.put(R + 1, 4, sub[1], st.th(C.owm))
  g.box(R + 1, 5, R + 1, 5, sub[2], st.th(C.owm))
  g.put(R + 1, 6, sub[0], st.th(C.opti))
  g.put(R + 1, 7, sub[1], st.th(C.opti))
  g.box(R + 1, 8, R + 1, 9, sub[2], st.th(C.opti))
  R += 2
  const storeRow = (label: string, a: number[], b: number[], total: boolean, i: number) => {
    const fill = total ? undefined : i % 2 ? C.cream : C.white
    const tx = total ? st.total('left') : st.td(fill)
    const nm = (f = '#,##0') => (total ? st.total('right', f) : st.tdNum(fill, f))
    g.box(R, 1, R, 2, label, tx)
    g.put(R, 3, a[0], nm('#,##0"명"'))
    g.put(R, 4, a[1], nm('#,##0"건"'))
    g.put(R, 5, a[2], nm())
    g.put(R, 6, b[0], nm('#,##0"명"'))
    g.put(R, 7, b[1], nm('#,##0"건"'))
    g.box(R, 8, R, 9, b[2], nm())
    R++
  }
  if (!stores.length) {
    g.box(R, 1, R, 9, '방문 기록 없음', st.dash())
    R++
  }
  stores.forEach((s, i) => storeRow(s, agg(vo, s), agg(vp, s), false, i))
  storeRow('합계', agg(vo), agg(vp), true, 0)

  // 조회수 TOP 5
  R++
  g.box(R, 1, R, 9, `조회수 TOP 5 콘텐츠  (${baseKo} 방문 · OWM 전체)`, st.section)
  g.h(R, 24)
  R++
  const optiKeys = new Set(vp.map(x => x.url))
  const top = vo.filter(x => x.views != null && x.views > 0).sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 5)
  g.put(R, 1, '순위', st.th())
  g.put(R, 2, '방문일', st.th())
  g.box(R, 3, R, 4, '지점', st.th())
  g.box(R, 5, R, 6, '인플루언서', st.th())
  g.put(R, 7, '구분', st.th())
  g.put(R, 8, '조회수', st.th())
  g.put(R, 9, '링크', st.th())
  R++
  if (!top.length) {
    g.box(R, 1, R, 9, '조회수 집계된 콘텐츠 없음', st.dash())
    R++
  }
  top.forEach((x, i) => {
    const fill = i % 2 ? C.cream : C.white
    const opti = optiKeys.has(x.url)
    g.put(R, 1, i + 1, { ...st.td(fill, 'center'), font: { b: true, sz: 11, color: i === 0 ? 'B7791F' : C.navy } })
    g.put(R, 2, dateLabel(x.visit_date), st.td(fill, 'center'))
    g.box(R, 3, R, 4, x.store || '–', st.td(fill))
    g.box(R, 5, R, 6, x.handle || '–', st.td(fill))
    g.put(R, 7, opti ? '옵티팜' : 'OWM', st.status(fill, opti ? C.opti : C.owm))
    g.put(R, 8, x.views, { ...st.tdNum(fill), font: { b: true, sz: 10, color: C.ink } })
    if (x.url) g.put(R, 9, '열기 ↗', st.link(fill), { href: x.url })
    else g.put(R, 9, '–', st.dash(fill))
    g.h(R, 20)
    R++
  })

  // 시트 안내
  R++
  g.box(R, 1, R, 9, '시트 안내  (이름을 누르면 이동)', st.section)
  g.h(R, 24)
  R++
  g.box(R, 1, R, 3, '시트', st.th())
  g.box(R, 4, R, 6, '기간', st.th())
  g.put(R, 7, '인원', st.th())
  g.put(R, 8, '콘텐츠', st.th())
  g.put(R, 9, '조회수', st.th())
  R++
  r.tables.filter(t => !weekly || t.span === 'weekly').forEach((t, i) => {
    const fill = i % 2 ? C.cream : C.white
    g.box(R, 1, R, 3, tableSheetName(t), { ...st.link(fill), h: 'left', indent: 1, font: { u: true, sz: 10, color: groupColor(t.group) } }, { location: sheetRef(tableSheetName(t)) })
    g.box(R, 4, R, 6, fullRange(t), st.td(fill, 'center'))
    g.put(R, 7, tablePeople(t), st.tdNum(fill, '#,##0"명"'))
    g.put(R, 8, contentCount(t.rows), st.tdNum(fill, '#,##0"건"'))
    g.put(R, 9, sumViews(t.rows), st.tdNum(fill))
    R++
  })

  return {
    name: '요약',
    rows: g.rows,
    merges: g.merges,
    heights: g.heights,
    widths: [2, 13, 13, 13, 13, 2.5, 13, 13, 13, 13, 2],
    landscape: true,
    fitWidth: true,
    hideGrid: true,
    tabColor: C.navy,
  }
}

/** ①~⑧ 상세 시트 */
function detailSheet(t: ReportTable): StyledSheet {
  const g = new Grid()
  const color = groupColor(t.group)
  const W = 7
  const rows = [...t.rows].sort((a, b) => a.visit_date.localeCompare(b.visit_date) || a.store.localeCompare(b.store, 'ko'))
  const people = tablePeople(t)
  const contents = contentCount(rows)
  const views = sumViews(rows)

  g.box(0, 0, 0, W - 1, `${CIRCLED[t.no] ?? t.no}  ${t.title}`, st.band(color, 15))
  g.h(0, 34)
  g.box(1, 0, 1, W - 1, `기간  ${fullRange(t)}   (${weekRange(t)})   ·   ${groupName(t.group)} · ${t.status === 'planned' ? '방문예정' : '방문'} · ${t.span === 'weekly' ? '주간' : '누적'}`, { font: { b: true, sz: 12, color: C.navy }, h: 'left', indent: 1 })
  g.h(1, 26)
  g.box(2, 0, 2, W - 1, `인원 ${people.toLocaleString()}명   ·   콘텐츠 ${contents.toLocaleString()}건   ·   조회수 합 ${views.toLocaleString()}`, { ...st.kpi, fill: groupLight(t.group), font: { b: true, sz: 11, color } })
  g.h(2, 24)
  g.h(3, 8)
  const HR = 4
  ;['방문일', '지점', '인플루언서', '상태', '업로드일', '조회수', '콘텐츠'].forEach((h, c) => g.put(HR, c, h, st.th(C.navy)))
  g.h(HR, 22)

  let R = HR + 1
  if (!rows.length) {
    g.box(R, 0, R, W - 1, '해당 기간 데이터 없음', st.dash())
    g.h(R, 24)
    R++
  }
  // 방문일별 묶음 — 날짜 셀 세로 병합 + 묶음 단위 줄무늬
  let i = 0
  let band = 0
  while (i < rows.length) {
    let j = i
    while (j < rows.length && rows[j].visit_date === rows[i].visit_date) j++
    const fill = band % 2 ? C.cream : C.white
    g.box(R, 0, R + (j - i) - 1, 0, dateLabel(rows[i].visit_date), { ...st.td(fill, 'center'), font: { b: true, sz: 10, color: C.navy } })
    for (let k = i; k < j; k++, R++) {
      const x = rows[k]
      const s = statusOf(t, x)
      g.put(R, 1, x.store || '–', x.store ? st.td(fill) : st.dash(fill))
      g.put(R, 2, x.handle || '–', x.handle ? st.td(fill) : st.dash(fill))
      g.put(R, 3, s.label, st.status(fill, s.color))
      g.put(R, 4, x.posted_date ? dateLabel(x.posted_date) : '–', x.posted_date ? st.td(fill, 'center') : st.dash(fill))
      g.put(R, 5, x.views ?? '–', x.views == null ? st.dash(fill) : st.tdNum(fill))
      if (x.url) g.put(R, 6, '콘텐츠 열기 ↗', st.link(fill), { href: x.url })
      else g.put(R, 6, '–', st.dash(fill))
      g.h(R, 20)
    }
    i = j
    band++
  }
  // 합계
  g.put(R, 0, '합계', st.total('center'))
  g.put(R, 1, `${rows.length.toLocaleString()}행`, st.total('left'))
  g.put(R, 2, people, st.total('left', '#,##0"명"'))
  g.put(R, 3, null, st.total())
  g.put(R, 4, contents, st.total('center', '#,##0"건"'))
  g.put(R, 5, views, st.total('right', '#,##0'))
  g.put(R, 6, null, st.total())
  g.h(R, 24)

  return {
    name: tableSheetName(t),
    rows: g.rows,
    merges: g.merges,
    heights: g.heights,
    widths: [12, 22, 24, 12, 12, 13, 16],
    freezeRow: HR + 1,
    landscape: true,
    fitWidth: true,
    printTitleRows: [HR + 1, HR + 1],
    hideGrid: true,
    tabColor: color,
  }
}

/** 엑셀 시트: 「요약」 대시보드 + ①~⑧ 상세 */
/** weekly = 고른 주간만 (누적 시트·누적 숫자 제외) — 사이트 엑셀 다운로드용 */
export function reportWorkbook(r: OwmReport, weekly = false): StyledSheet[] {
  // 지난 기간이면 방문예정 시트는 뺀다
  const now = ymd(Date.now() + KST)
  const tables = r.tables.filter(t => !(t.status === 'planned' && t.range[1] < now) && (!weekly || t.span === 'weekly'))
  return [summarySheet(r, weekly), ...tables.map(detailSheet)]
}

export const reportXlsx = (r: OwmReport, weekly = false) => styledXlsx(reportWorkbook(r, weekly))

export const reportFilename = (r: OwmReport, weekly = false) =>
  weekly
    ? `OWM-옵티팜-주간리포트-${r.summary.range[0]}~${r.summary.range[1]}.xlsx`
    : `OWM-옵티팜-리포트-${r.cumulative.range[0]}~${r.cumulative.range[1]}.xlsx`

/** 쿼리 → 리포트 옵션 (?month=YYYY-MM 또는 ?from=YYYY-MM-DD&to=YYYY-MM-DD) */
export const reportOpts = (q: URLSearchParams) => ({
  month: q.get('month') ?? undefined,
  from: q.get('from') ?? undefined,
  to: q.get('to') ?? undefined,
  week: q.get('week') ?? undefined,
})
