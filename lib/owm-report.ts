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

export const REPORT_START = '2026-11-01'
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
  summary: WeeklySummary
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
export async function buildOwmReport(opts: { month?: string } = {}, now = Date.now()): Promise<OwmReport> {
  let start = REPORT_START
  let end = '9999-12-31'
  let today = ymd(now + KST)
  let thisWeek: [string, string]
  let lastWeek: [string, string]
  if (opts.month && /^\d{4}-\d{2}$/.test(opts.month)) {
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

  const [visits, contents] = await Promise.all([loadVisits(start), loadContents()])

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
    const base = { visit_date: v.date, store: v.store, handle: v.handle || v.name, done: v.done }
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
    if (d < start || d > end) continue
    expanded.push({
      visit_date: d,
      store: c.location || '미정',
      handle: handleOf(c.sns_id, c.profile_url) || c.influencer_name,
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
            : lastWeek
      const rows = expanded
        .filter(r => (group === 'owm' || r.opti) && (status === 'visited') === r.done)
        .filter(r => r.visit_date >= range[0] && r.visit_date <= range[1])
        .map(({ opti: _o, done: _d, ...row }) => row)
      tables.push({ key: `${group}-${status}-${span}`, no: no++, group, status, span, title: `${gLabel} ${sLabel}`, range, rows })
    }
  }

  // 주간 요약: 지난주에 업로드된 콘텐츠 수·조회수
  const weekly = contents.filter(c => {
    if (!c.upload_url || isSeedingLocation(c.location)) return false
    const d = contentPostedDate(c)
    return !!d && d >= lastWeek[0] && d <= lastWeek[1]
  })
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
  }
}

export function reportRangeLabel(t: ReportTable): string {
  const f = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`
  if (t.range[1] === '9999-12-31') return `${f(t.range[0])} ~`
  return `${f(t.range[0])} ~ ${f(t.range[1])}`
}

export function reportSheets(r: OwmReport) {
  const summary = [
    ['구분', '기간', '업로드 콘텐츠', '조회수'],
    ['OWM 전체', `${r.summary.range[0]} ~ ${r.summary.range[1]}`, r.summary.owm.uploads, r.summary.owm.views],
    ['옵티팜', `${r.summary.range[0]} ~ ${r.summary.range[1]}`, r.summary.optipharm.uploads, r.summary.optipharm.views],
  ]
  return [
    { name: '주간 요약', rows: summary },
    ...r.tables.map(t => ({
      name: `${t.no} ${t.title}`.replace(/[\\/?*[\]:]/g, ''),
      rows: [
        [...COLUMNS] as (string | number | null)[],
        ...t.rows.map(x => [x.visit_date, x.store, x.handle, x.url, x.posted_date, x.views]),
      ],
    })),
  ]
}

export const reportFilename = (r: OwmReport) => `OWM-옵티팜-리포트-${r.today}.xlsx`
