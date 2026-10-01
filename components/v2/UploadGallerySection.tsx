'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Content } from '@/lib/types'
import { contentViewsDisplay, contentViews } from '@/lib/content-views'
import { normalizeLocationName, V2_ORDERED_LOCATIONS } from '@/lib/v2-analytics'
import { contentPostedDate } from '@/lib/posted-date'

interface UploadGallerySectionProps {
  contents: Content[]
  /** 지점 카드 클릭 등 외부에서 지정한 지점 (예: '명동점') */
  location: string | null
  onLocationChange: (location: string | null) => void
  onSelectInfluencer?: (name: string) => void
}

type SortMode = 'recent' | 'views'

const PAGE = 8
const ALL = '전체'

const CHANNEL_STYLE: Record<string, { bg: string; color: string }> = {
  샤오홍슈: { bg: '#fee2e2', color: '#b42318' },
  틱톡: { bg: '#cffafe', color: '#0e7490' },
  인스타그램: { bg: '#f3e8ff', color: '#6b21a8' },
}

function photoUrl(c: Content) {
  return c.profile_image_url
    || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-photos/by-id/${c.id}`
}

function Avatar({ c }: { c: Content }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className="w-8 h-8 rounded-full bg-[#f4efe3] text-[#6b6558] grid place-items-center text-[12px] font-extrabold shrink-0">
        {c.influencer_name.slice(0, 1)}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl(c)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-8 h-8 rounded-full object-cover bg-[#f4efe3] shrink-0"
    />
  )
}

export default function UploadGallerySection({
  contents,
  location,
  onLocationChange,
  onSelectInfluencer,
}: UploadGallerySectionProps) {
  const [channel, setChannel] = useState(ALL)
  const [sort, setSort] = useState<SortMode>('views')
  const [count, setCount] = useState(PAGE)

  const uploaded = useMemo(() => contents.filter(c => c.upload_url), [contents])

  const locOptions = useMemo(() => {
    const set = new Set(uploaded.map(c => normalizeLocationName(c.location)).filter(Boolean))
    const ordered = V2_ORDERED_LOCATIONS.filter(l => set.has(l))
    // 시딩(기자단·배송) 등 지점 목록에 없는 구분은 뒤에 붙인다
    const rest = [...set].filter(l => !ordered.includes(l) && l !== '미지정').sort()
    return [...ordered, ...rest]
  }, [uploaded])

  const channelOptions = useMemo(
    () => [ALL, ...Array.from(new Set(uploaded.map(c => c.channel).filter(Boolean)))],
    [uploaded],
  )

  const rows = useMemo(() => {
    const list = uploaded.filter(
      c =>
        (!location || normalizeLocationName(c.location) === location) &&
        (channel === ALL || c.channel === channel),
    )
    list.sort((a, b) =>
      sort === 'views'
        ? contentViews(b) - contentViews(a)
        : (contentPostedDate(b) ?? '').localeCompare(contentPostedDate(a) ?? ''),
    )
    // 같은 게시물이 전체 링크·단축 링크로 두 번 저장된 경우가 있어 목록에선 하나만 보인다
    // (DB 행은 그대로, 다른 섹션 합산에도 그대로 포함). 게시일이 있는 행을 우선한다
    const seen = new Map<string, Content>()
    for (const c of list) {
      const key = `${c.influencer_name}|${c.channel}|${normalizeLocationName(c.location)}`
      const prev = seen.get(key)
      if (!prev || (!contentPostedDate(prev) && contentPostedDate(c))) seen.set(key, c)
    }
    const keep = new Set(seen.values())
    return list.filter(c => keep.has(c))
  }, [uploaded, location, channel, sort])

  useEffect(() => setCount(PAGE), [location, channel, sort, contents])

  const chip = (active: boolean) =>
    `text-[11.5px] rounded-[16px] px-3 py-1.5 transition-all whitespace-nowrap ${
      active ? 'font-bold text-white bg-[#4f7cff]' : 'font-semibold bg-[#f7f4ec] text-[#6b6558] hover:text-[#1a1d2e]'
    }`

  return (
    <section id="section-uploads" className="mb-8 scroll-mt-24 min-w-0">
      <div className="text-[18px] font-extrabold tracking-tight text-[#1a1d2e] pt-2 pb-2.5 px-1">
        업로드 인플루언서{' '}
        <span className="text-[13px] font-semibold tracking-normal text-[#9a9486]">( {rows.length}건 )</span>
      </div>

      <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={chip(!location)} onClick={() => onLocationChange(null)}>
            전체 지점
          </button>
          {locOptions.map(l => (
            <button key={l} type="button" className={chip(location === l)} onClick={() => onLocationChange(l)}>
              {l.replace('점', '')}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <select
              value={channel}
              onChange={e => setChannel(e.target.value)}
              className="text-[11.5px] font-semibold text-[#1a1d2e] bg-[#fbf9f4] border border-[#f0e9da] rounded-[10px] px-2.5 py-1.5 focus:outline-none"
            >
              {channelOptions.map(o => (
                <option key={o} value={o}>{o === ALL ? '전체 채널' : o}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 bg-[#f7f4ec] rounded-[9px] p-[3px]">
              {(['views', 'recent'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSort(m)}
                  className={`text-[11.5px] rounded-[7px] px-3 py-1 transition-all ${
                    sort === m ? 'font-bold text-[#1a1d2e] bg-white shadow-xs' : 'font-semibold text-[#9a9486] hover:text-[#1a1d2e]'
                  }`}
                >
                  {m === 'recent' ? '최신순' : '조회수순'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="py-12 text-center text-[12px] text-[#9a9486]">이 기간·조건의 업로드가 없습니다.</div>
        ) : (
          <div className="mt-3">
            <div className="grid grid-cols-[minmax(0,1fr)_76px_92px_150px] gap-3 items-center px-2 pb-2 border-b border-[#eee6d6] text-[11px] font-semibold text-[#9a9486]">
              <span>인플루언서</span>
              <span>채널</span>
              <span className="text-right">조회수</span>
              <span className="text-right">좋아요 · 저장 · 댓글</span>
            </div>
            {rows.slice(0, count).map(c => {
              const { value, estimated } = contentViewsDisplay(c)
              const ch = CHANNEL_STYLE[c.channel] ?? { bg: '#f1f5f9', color: '#475569' }
              return (
                <a
                  key={c.id}
                  href={c.upload_url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="grid grid-cols-[minmax(0,1fr)_76px_92px_150px] gap-3 items-center px-2 py-2 border-b border-[#f7f2e8] last:border-b-0 hover:bg-[#faf7f0] rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Avatar c={c} />
                    <span className="min-w-0">
                      <button
                        type="button"
                        onClick={e => {
                          e.preventDefault()
                          onSelectInfluencer?.(c.influencer_name)
                        }}
                        className="block max-w-full text-left text-[13px] font-bold text-[#1a1d2e] truncate hover:underline"
                      >
                        {c.influencer_name}
                      </button>
                      <span className="block text-[11px] text-[#9a9486] truncate">
                        {normalizeLocationName(c.location).replace('점', '')} · {(() => {
                          const d = contentPostedDate(c)
                          return d ? `${d.slice(5).replace('-', '.')} 게시` : '게시일 미상'
                        })()}
                      </span>
                    </span>
                  </span>
                  <span
                    className="text-[10.5px] font-bold rounded-lg px-2 py-0.5 justify-self-start truncate max-w-full"
                    style={{ backgroundColor: ch.bg, color: ch.color }}
                  >
                    {c.channel}
                  </span>
                  <span className="text-right text-[13.5px] font-extrabold text-[#1a1d2e]">
                    {value ? `${estimated ? '~' : ''}${value.toLocaleString()}` : '–'}
                  </span>
                  <span className="text-right text-[11.5px] text-[#6b6558] whitespace-nowrap">
                    {(c.likes ?? 0).toLocaleString()} · {(c.saves ?? 0).toLocaleString()} · {(c.comments ?? 0).toLocaleString()}
                  </span>
                </a>
              )
            })}
          </div>
        )}

        {rows.length > count && (
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={() => setCount(n => n + PAGE)}
              className="text-[12px] font-bold text-[#4f7cff] bg-[#eef3ff] hover:bg-[#e0ebff] rounded-full px-4 py-2 transition-colors"
            >
              더보기 ({rows.length - count}건 남음) ▼
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
