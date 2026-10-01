'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Content } from '@/lib/types'
import type { ProductInfo } from '@/app/api/product-images/route'
import { contentViews } from '@/lib/content-views'
import { V2_CH_COLORS, V2_LOC_COLORS, V2_ORDERED_LOCATIONS, formatViews, normalizeLocationName } from '@/lib/v2-analytics'

type Metric = 'views' | 'likes'

const ALL = '전체'
const PAGE = 8
/** 운영 데이터가 아닌 테스트 상품 */
const JUNK_PRODUCT = /데모|목업|테스트|test/i
const SEEDING_COLOR = '#f59e0b'

interface ProductStat {
  name: string
  posts: number
  influencers: Set<string>
  views: number
  likes: number
  saves: number
  comments: number
  byLocation: Map<string, number>
  byChannel: Map<string, number>
  contents: Content[]
}

/** 한 게시물에 여러 상품이 함께 나가면 ' | ' 로 누적돼 있다 */
function productsOf(c: Content): string[] {
  return String(c.product || '')
    .split(' | ')
    .map(s => s.trim())
    .filter(p => p && !JUNK_PRODUCT.test(p))
}

/** 상품명 표기 차이(공백·대소문자)를 무시하고 매칭 */
const productKey = (name: string) => name.replace(/\s+/g, '').toLowerCase()

function ProductThumb({ src, size }: { src?: string; size: number }) {
  const [failed, setFailed] = useState(false)
  const box = { width: size, height: size }
  if (!src || failed) {
    return <span className="rounded-lg bg-[#f4efe3] grid place-items-center text-[#b5ab96] shrink-0" style={{ ...box, fontSize: size * 0.45 }}>📦</span>
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="rounded-lg object-cover bg-white border border-[#f2ebdd] shrink-0" style={box} />
  )
}

function Bars({ rows, total, color }: { rows: [string, number][]; total: number; color: (k: string) => string }) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map(([k, v]) => {
        const pct = total > 0 ? (v / total) * 100 : 0
        return (
          <div key={k} className="flex items-center gap-2.5">
            <span className="w-[84px] text-[12.5px] font-bold text-[#1a1d2e] truncate">{k.replace(/점$/, '')}</span>
            <span className="flex-1 h-2.5 rounded-full bg-[#f4efe3] overflow-hidden">
              <span className="block h-full rounded-full" style={{ width: `${Math.max(pct, v > 0 ? 2 : 0)}%`, backgroundColor: color(k) }} />
            </span>
            <span className="w-10 text-right text-[12.5px] font-bold text-[#1a1d2e]">{Math.round(pct)}%</span>
          </div>
        )
      })}
    </div>
  )
}

/** 인기 상품 분석 — 상품별 조회수·좋아요 랭킹 + 선택 상품의 지점·채널 편중 */
export default function ProductAnalysisSection({ contents }: { contents: Content[] }) {
  const [loc, setLoc] = useState(ALL)
  const [metric, setMetric] = useState<Metric>('views')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [count, setCount] = useState(PAGE)
  const [info, setInfo] = useState<Record<string, ProductInfo>>({})

  useEffect(() => {
    fetch('/api/product-images', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : {}))
      .then((d: Record<string, ProductInfo>) =>
        setInfo(Object.fromEntries(Object.entries(d).map(([k, v]) => [productKey(k), v]))),
      )
      .catch(() => {})
  }, [])
  const imageByLabel = useMemo(() => {
    const m = new Map<string, string>()
    for (const [k, v] of Object.entries(info)) {
      const label = v.label ?? (v.company ? `[${v.company}] ${k}` : k)
      if (v.image && !m.has(label)) m.set(label, v.image)
    }
    return m
  }, [info])
  /** stats 이름은 이미 표기(label)라 표기 기준으로 찾는다 */
  const imageOf = (label: string) => imageByLabel.get(label) ?? info[productKey(label)]?.image
  /** '[회원사] 제품명' 표기 — 회사 대표 상품은 API 가 실제 제품들로 펼쳐준다 */
  const labelOf = (name: string) => {
    const v = info[productKey(name)]
    return v?.label ?? (v?.company ? `[${v.company}] ${name}` : name)
  }

  const posts = useMemo(() => contents.filter(c => c.upload_url && c.publish_status !== '예정'), [contents])

  const locOptions = useMemo(() => {
    const set = new Set(posts.map(c => normalizeLocationName(c.location)).filter(l => l && l !== '미지정'))
    const ordered = V2_ORDERED_LOCATIONS.filter(l => set.has(l))
    return [ALL, ...ordered, ...[...set].filter(l => !ordered.includes(l)).sort()]
  }, [posts])

  const stats = useMemo(() => {
    const map = new Map<string, ProductStat>()
    for (const c of posts) {
      const location = normalizeLocationName(c.location)
      if (loc !== ALL && location !== loc) continue
      const views = contentViews(c)
      // 같은 게시물 안에서 같은 표기(대표 상품 + 실제 제품)는 한 번만
      for (const name of new Set(productsOf(c).map(labelOf))) {
        const s = map.get(name) ?? {
          name,
          posts: 0,
          influencers: new Set<string>(),
          views: 0,
          likes: 0,
          saves: 0,
          comments: 0,
          byLocation: new Map(),
          byChannel: new Map(),
          contents: [] as Content[],
        }
        s.posts += 1
        s.influencers.add(c.influencer_name)
        s.views += views
        s.likes += c.likes ?? 0
        s.saves += c.saves ?? 0
        s.comments += c.comments ?? 0
        const w = metric === 'views' ? views : (c.likes ?? 0)
        s.byLocation.set(location || '미지정', (s.byLocation.get(location || '미지정') ?? 0) + w)
        s.byChannel.set(c.channel, (s.byChannel.get(c.channel) ?? 0) + w)
        s.contents.push(c)
        map.set(name, s)
      }
    }
    return [...map.values()].sort((a, b) => b[metric] - a[metric])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, loc, metric, info])

  const q = query.trim().toLowerCase()
  const rows = q ? stats.filter(s => s.name.toLowerCase().includes(q)) : stats
  const total = stats.reduce((sum, s) => sum + s[metric], 0)
  const current = rows.find(s => s.name === selected) ?? rows[0] ?? null
  const metricLabel = metric === 'views' ? '조회수' : '좋아요'

  const chip = (active: boolean) =>
    `text-[11.5px] rounded-[16px] px-3 py-1.5 transition-all whitespace-nowrap ${
      active ? 'font-bold text-white bg-[#4f7cff]' : 'font-semibold bg-[#f7f4ec] text-[#6b6558] hover:text-[#1a1d2e]'
    }`

  return (
    <section className="mb-8">
      <div className="text-[18px] font-extrabold tracking-tight text-[#1a1d2e] pt-3 pb-2.5 px-1">인기 상품 분석</div>
      <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex flex-wrap gap-1.5">
            {locOptions.map(l => (
              <button key={l} type="button" className={chip(loc === l)} onClick={() => { setLoc(l); setCount(PAGE) }}>
                {l.replace(/점$/, '')}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="🔍 상품명 검색"
              className="text-[11.5px] text-[#1a1d2e] placeholder-[#a9a294] bg-[#fbf9f4] border border-[#f0e9da] rounded-[10px] px-3 py-1.5 focus:outline-none focus:border-[#4f7cff]"
            />
            <div className="flex items-center gap-1 bg-[#f7f4ec] rounded-[9px] p-[3px]">
              {(['views', 'likes'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                    metric === m ? 'font-bold text-[#1a1d2e] bg-white shadow-xs' : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
                  }`}
                >
                  {m === 'views' ? '조회수' : '좋아요'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="py-12 text-center text-[12px] text-[#9a9486]">이 기간·조건의 상품 데이터가 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-5 mt-4">
            {/* 랭킹 */}
            <div>
              <div className="grid grid-cols-[40px_minmax(0,1fr)_64px_92px_52px] gap-2 items-center px-2.5 pb-2.5 border-b border-[#eee6d6] text-[12.5px] font-bold text-[#1a1d2e]">
                <span className="text-center">순위</span>
                <span>상품명</span>
                <span className="text-right">콘텐츠</span>
                <span className="text-right">{metricLabel}</span>
                <span className="text-right">비중</span>
              </div>
              <div className="flex flex-col gap-1 mt-1.5">
                {rows.slice(0, count).map(s => {
                  const active = s.name === current?.name
                  const rank = stats.indexOf(s)
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setSelected(s.name)}
                      className={`text-left grid grid-cols-[40px_minmax(0,1fr)_64px_92px_52px] gap-2 items-center px-2.5 py-2.5 rounded-xl transition-colors ${
                        active ? 'bg-[#f4f1ff] border border-[#e0dbf5]' : 'hover:bg-[#faf7f0] border border-transparent'
                      }`}
                    >
                      <span
                        className={`justify-self-center text-[11.5px] font-extrabold ${
                          rank < 3 ? 'w-6 h-6 rounded-full grid place-items-center' : 'text-[#1a1d2e]'
                        }`}
                        style={rank < 3 ? { backgroundColor: ['#fdf0c4', '#ecebea', '#fde0cf'][rank], color: '#1a1d2e' } : {}}
                      >
                        {rank + 1}
                      </span>
                      <span className="flex items-center gap-2.5 min-w-0">
                        <ProductThumb src={imageOf(s.name)} size={32} />
                        <span className="text-[14.5px] font-extrabold text-[#1a1d2e] truncate" title={s.name}>{s.name}</span>
                      </span>
                      <span className="text-right text-[13px] font-bold text-[#1a1d2e]">{s.posts}건</span>
                      <span className="text-right text-[14.5px] font-extrabold text-[#1a1d2e]">{s[metric].toLocaleString()}</span>
                      <span className="text-right text-[13px] font-bold text-[#1a1d2e]">
                        {total > 0 ? `${((s[metric] / total) * 100).toFixed(1)}%` : '–'}
                      </span>
                    </button>
                  )
                })}
              </div>
              {rows.length > count && (
                <div className="flex justify-center mt-3">
                  <button
                    type="button"
                    onClick={() => setCount(n => n + PAGE)}
                    className="w-8 h-8 rounded-full bg-[#eef3ff] hover:bg-[#e0ebff] text-[#4f7cff] font-bold grid place-items-center text-[12px] transition-colors"
                    title="더보기"
                  >
                    ⌄
                  </button>
                </div>
              )}
              <div className="text-[10.5px] text-[#9a9486] mt-3 px-1">
                ※ 여러 상품이 함께 노출된 콘텐츠는 각 상품에 모두 합산됩니다. 비중은 상품별 합계 기준입니다.
              </div>
            </div>

            {/* 선택 상품 상세 */}
            {current && (
              <div className="bg-[#fbf9f4] border border-[#f2ebdd] rounded-2xl p-5">
                <div className="flex items-center gap-3.5">
                  <ProductThumb src={imageOf(current.name)} size={64} />
                  <div className="text-[15px] font-extrabold text-[#1a1d2e] leading-snug">{current.name}</div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3.5 text-[13px]">
                  {[
                    ['조회수', current.views.toLocaleString()],
                    ['좋아요', current.likes.toLocaleString()],
                    ['콘텐츠', `${current.posts}건`],
                    ['인플루언서', `${current.influencers.size}명`],
                    ['저장', current.saves.toLocaleString()],
                    ['콘텐츠당 조회', formatViews(Math.round(current.views / Math.max(current.posts, 1)))],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between border-b border-[#efe8da] pb-1.5">
                      <span className="font-bold text-[#1a1d2e]">{k}</span>
                      <span className="font-extrabold text-[#1a1d2e]">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="text-[13px] font-extrabold text-[#1a1d2e] mt-5 mb-2.5">지점별 {metricLabel} 편중</div>
                <Bars
                  rows={[...current.byLocation].sort((a, b) => b[1] - a[1])}
                  total={[...current.byLocation.values()].reduce((a, b) => a + b, 0)}
                  color={k => V2_LOC_COLORS[k] ?? (/시딩/.test(k) ? SEEDING_COLOR : '#9a9486')}
                />

                <div className="text-[13px] font-extrabold text-[#1a1d2e] mt-5 mb-2.5">채널별 {metricLabel} 편중</div>
                <Bars
                  rows={[...current.byChannel].sort((a, b) => b[1] - a[1])}
                  total={[...current.byChannel.values()].reduce((a, b) => a + b, 0)}
                  color={k => V2_CH_COLORS[k] ?? '#9a9486'}
                />

                <div className="text-[13px] font-extrabold text-[#1a1d2e] mt-5 mb-2.5">{metricLabel} 상위 콘텐츠</div>
                <div className="flex flex-col gap-1.5">
                  {[...current.contents]
                    .sort((a, b) => (metric === 'views' ? contentViews(b) - contentViews(a) : (b.likes ?? 0) - (a.likes ?? 0)))
                    .slice(0, 3)
                    .map((c, i) => (
                      <a
                        key={c.id}
                        href={c.upload_url ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2.5 rounded-xl bg-white border border-[#efe8da] px-3 py-2 hover:border-[#4f7cff] transition-colors"
                      >
                        <span className="text-[12px] font-extrabold text-[#9a9486] w-3">{i + 1}</span>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: V2_CH_COLORS[c.channel] ?? '#9a9486' }} />
                        <span className="flex-1 min-w-0 truncate text-[12.5px] font-bold text-[#1a1d2e]">{c.influencer_name}</span>
                        <span className="text-[11.5px] font-semibold text-[#9a9486]">{c.channel}</span>
                        <span className="text-[12.5px] font-extrabold text-[#1a1d2e] w-14 text-right">
                          {formatViews(metric === 'views' ? contentViews(c) : (c.likes ?? 0))}
                        </span>
                      </a>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
