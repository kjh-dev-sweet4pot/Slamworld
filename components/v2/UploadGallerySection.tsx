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

// 채널 색 알약 (흰 글씨)
const CHANNEL_COLOR: Record<string, string> = {
  샤오홍슈: '#e03131',
  인스타그램: '#8b5cf6',
  틱톡: '#06b6d4',
  도우인: '#475569',
  웨이보: '#f59e0b',
}

function photoUrl(c: Content) {
  return c.profile_image_url
    || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-photos/by-id/${c.id}`
}

function Avatar({ c }: { c: Content }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className="w-[30px] h-[30px] rounded-full bg-[#ece4d2] text-[#6b6558] grid place-items-center text-[12px] font-extrabold shrink-0">
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
      className="w-[30px] h-[30px] rounded-full object-cover bg-[#ece4d2] shrink-0"
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
    `text-[11px] font-medium rounded-full px-[9px] py-1 border transition-colors whitespace-nowrap ${
      active ? 'text-white bg-[#1a1d2e] border-[#1a1d2e]' : 'text-[#1a1d2e] bg-white border-[#e3d9c4] hover:bg-[#faf8f3]'
    }`
  const cols = 'grid grid-cols-[minmax(0,2.2fr)_80px_repeat(4,minmax(0,1fr))] gap-1.5 min-w-[480px]'

  return (
    <section
      id="section-uploads"
      className="mb-8 scroll-mt-24 min-w-0 bg-white border border-[#f2ebdd] rounded-[6px] p-[18px] shadow-[0_4px_16px_rgba(30,41,59,0.06)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-[18px] font-extrabold text-[#1a1d2e]">
          업로드 인플루언서 <span className="font-medium text-[#6b6558]">( {rows.length}건 )</span>
        </h3>
        <div className="flex-1" />
        <select
          value={channel}
          onChange={e => setChannel(e.target.value)}
          className="text-[12px] font-medium text-[#1a1d2e] bg-white border border-[#e3d9c4] rounded-[8px] px-2.5 py-1.5 focus:outline-none"
        >
          {channelOptions.map(o => (
            <option key={o} value={o}>{o === ALL ? '전체 채널' : o}</option>
          ))}
        </select>
        <div className="flex gap-[3px] bg-[#f7f4ec] rounded-[8px] p-[3px]">
          {(['recent', 'views'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setSort(m)}
              className={`text-[11px] rounded-[6px] px-2 py-[5px] transition-colors ${
                sort === m ? 'font-bold text-[#1a1d2e] bg-white' : 'font-medium text-[#4a4538] hover:text-[#1a1d2e]'
              }`}
            >
              {m === 'recent' ? '최신순' : '조회수순'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-[5px] mt-2.5">
        <button type="button" className={chip(!location)} onClick={() => onLocationChange(null)}>
          전체 지점
        </button>
        {locOptions.map(l => (
          <button key={l} type="button" className={chip(location === l)} onClick={() => onLocationChange(l)}>
            {l.replace('점', '')}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="py-12 text-center text-[12px] text-[#6b6558]">이 기간·조건의 업로드가 없습니다.</div>
      ) : (
        // 좁은 화면은 카드 안에서만 가로 스크롤
        <div className="overflow-x-auto mt-1.5">
          <div className={`${cols} text-[11px] text-[#6b6558] pt-3 pb-1.5 border-b border-[#efe5d0]`}>
            <span>인플루언서</span>
            <span>채널</span>
            <span className="text-right">조회수</span>
            <span className="text-right">좋아요</span>
            <span className="text-right">저장</span>
            <span className="text-right">댓글</span>
          </div>
          {rows.slice(0, count).map(c => {
            const { value, estimated } = contentViewsDisplay(c)
            return (
              <a
                key={c.id}
                href={c.upload_url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className={`${cols} items-center py-2 border-b border-[#f4efe4] text-[12px] text-[#1a1d2e] hover:bg-[#faf8f3] transition-colors`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Avatar c={c} />
                  <span className="min-w-0">
                    <button
                      type="button"
                      onClick={e => {
                        e.preventDefault()
                        onSelectInfluencer?.(c.influencer_name)
                      }}
                      className="block max-w-full text-left text-[12px] font-bold text-[#1a1d2e] truncate hover:underline"
                    >
                      {c.influencer_name}
                    </button>
                    <span className="block text-[10.5px] text-[#6b6558] truncate">
                      {normalizeLocationName(c.location).replace('점', '')} · {(() => {
                        const d = contentPostedDate(c)
                        return d ? `${d.slice(5).replace('-', '.')} 게시` : '게시일 미상'
                      })()}
                    </span>
                  </span>
                </span>
                <span
                  className="text-[10.5px] font-bold text-white rounded-full px-[7px] py-0.5 justify-self-start truncate max-w-full"
                  style={{ backgroundColor: CHANNEL_COLOR[c.channel] ?? '#475569' }}
                >
                  {c.channel}
                </span>
                <span className="text-right font-bold">
                  {value ? `${estimated ? '~' : ''}${value.toLocaleString()}` : '–'}
                </span>
                <span className="text-right">{(c.likes ?? 0).toLocaleString()}</span>
                <span className="text-right">{(c.saves ?? 0).toLocaleString()}</span>
                <span className="text-right">{(c.comments ?? 0).toLocaleString()}</span>
              </a>
            )
          })}
        </div>
      )}

        {rows.length > count && (
          <div className="text-center mt-3">
            <button
              type="button"
              onClick={() => setCount(n => n + PAGE)}
              className="border border-[#e3d9c4] bg-white text-[12px] font-medium text-[#1a1d2e] rounded-full px-4 py-[7px] hover:bg-[#faf8f3] transition-colors"
            >
              더보기 ({rows.length - count}건 남음) ▼
            </button>
          </div>
        )}
    </section>
  )
}
