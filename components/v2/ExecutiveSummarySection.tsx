'use client'

import { useMemo } from 'react'
import type { Content } from '@/lib/types'
import { V2_MONTHS, formatViews } from '@/lib/v2-analytics'
import { aggregateEmv, contentEmv, contentViews, contentViewsDisplay } from '@/lib/content-views'
import { BRAND_BUDGETS } from '@/lib/brand-budget'
import { canonicalBrand, contentMatchesBrand } from '@/lib/brand-content'
import { contentPeriodDate, inPerformanceMonth } from '@/lib/posted-date'

interface ExecutiveSummarySectionProps {
  contents?: Content[]
  /** 예산·ROI 노출 여부 (회원사 로그인에는 숨김) */
  showRoi?: boolean
}

const CARD = 'bg-white border border-[#f2ebdd] rounded-[6px] shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-[18px]'

function monthStats(rows: Content[]) {
  const uploaded = rows.filter(c => c.upload_url).length
  return {
    views: rows.reduce((s, c) => s + contentViews(c), 0),
    uploaded,
    publishRate: rows.length > 0 ? (uploaded / rows.length) * 100 : 0,
    emv: aggregateEmv(rows).total,
    followers: rows.reduce((s, c) => s + (c.follower_count ?? 0), 0),
  }
}

const brandsOf = (c: Content) =>
  [...new Set((c.brands ?? '').split(/[,，、]/).map(s => s.trim()).filter(Boolean).map(canonicalBrand))]

function Delta({ cur, prev, pt = false }: { cur: number; prev: number; pt?: boolean }) {
  if (!pt && prev <= 0) return <span className="text-[#9a9486]">{cur > 0 ? '신규' : '–'}</span>
  const diff = pt ? cur - prev : ((cur - prev) / prev) * 100
  const up = diff >= 0
  return (
    <span className={`font-extrabold ${up ? 'text-[#16a34a]' : 'text-[#e03131]'}`}>
      {up ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}{pt ? '%p' : '%'}
    </span>
  )
}

export default function ExecutiveSummarySection({ contents = [], showRoi = false }: ExecutiveSummarySectionProps) {
  const data = useMemo(() => {
    const total = monthStats(contents)

    // 데이터가 있는 마지막 달 vs 그 전달
    const monthsWithData = V2_MONTHS.filter(m => contents.some(c => inPerformanceMonth(contentPeriodDate(c), m)))
    const curMonth = monthsWithData[monthsWithData.length - 1] ?? V2_MONTHS[V2_MONTHS.length - 1]
    const prevMonth = V2_MONTHS[V2_MONTHS.indexOf(curMonth) - 1]
    const cur = monthStats(contents.filter(c => inPerformanceMonth(contentPeriodDate(c), curMonth)))
    const prev = monthStats(prevMonth ? contents.filter(c => inPerformanceMonth(contentPeriodDate(c), prevMonth)) : [])

    // ROI — 브랜드별 기 소진 예산 합 vs 해당 브랜드 전체 기간 콘텐츠.
    // 다브랜드 콘텐츠는 태그된 브랜드 수로 N분의 1 배분 (합계 중복 없음)
    // ponytail: 기 소진 캠페인 이후(사용 예정) 콘텐츠도 섞일 수 있음. 캠페인 ID 연동 시 교체
    const spent = new Map<string, number>()
    for (const b of BRAND_BUDGETS) {
      if (b.useStatus === '기 소진' && b.amount > 0) spent.set(b.brand, (spent.get(b.brand) ?? 0) + b.amount * 10_000)
    }
    const roiRows = [...spent].map(([brand, cost]) => {
      let emv = 0, views = 0, uploaded = 0
      for (const c of contents) {
        if (!contentMatchesBrand(c.brands, brand)) continue
        const share = 1 / Math.max(1, brandsOf(c).length)
        emv += contentEmv(c) * share
        views += contentViews(c) * share
        if (c.upload_url) uploaded += share
      }
      return { label: brand, cost, emv, views, uploaded }
    })
    const roiSum = roiRows.reduce(
      (s, r) => ({ cost: s.cost + r.cost, emv: s.emv + r.emv, views: s.views + r.views, uploaded: s.uploaded + r.uploaded }),
      { cost: 0, emv: 0, views: 0, uploaded: 0 },
    )

    // 규모
    const brands = new Set(contents.flatMap(brandsOf))
    const locations = new Set(contents.map(c => c.location).filter(Boolean))
    const perPost = (rows: Content[]) => {
      const up = rows.filter(c => c.upload_url)
      return up.length > 0 ? Math.round(up.reduce((s, c) => s + contentViews(c), 0) / up.length) : 0
    }
    const press = contents.filter(c => c.is_press)
    const general = contents.filter(c => !c.is_press)

    // 신뢰도 — 실측 조회 비중
    const measuredViews = contents.reduce((s, c) => s + (contentViewsDisplay(c).estimated ? 0 : contentViews(c)), 0)

    return {
      total,
      cur,
      prev,
      curLabel: `${Number(curMonth.slice(5))}월`,
      prevLabel: prevMonth ? `${Number(prevMonth.slice(5))}월` : '',
      roiRows,
      roiSum,
      brandCount: brands.size,
      locationCount: locations.size,
      press: { count: press.length, perPost: perPost(press) },
      general: { count: general.length, perPost: perPost(general) },
      measuredPct: total.views > 0 ? (measuredViews / total.views) * 100 : 0,
    }
  }, [contents])

  const { total, cur, prev } = data
  const tiles = [
    { label: '누적 조회수', value: formatViews(total.views), cur: cur.views, prev: prev.views },
    { label: '업로드 완료', value: `${total.uploaded.toLocaleString()}건`, cur: cur.uploaded, prev: prev.uploaded },
    { label: '발행률', value: `${total.publishRate.toFixed(1)}%`, cur: cur.publishRate, prev: prev.publishRate, pt: true },
    { label: '도달 팔로워', value: formatViews(total.followers), cur: cur.followers, prev: prev.followers },
  ]

  return (
    <section className={CARD}>
      <div className="text-[18px] font-extrabold text-[#1a1d2e]">
        핵심 성과 요약{' '}
        <span className="text-[12px] font-medium text-[#6b6558]">
          ( 누적 · 증감은 {data.curLabel} vs {data.prevLabel} )
        </span>
      </div>

      {/* 성과 타일 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        {tiles.map(t => (
          <div key={t.label} className="bg-[#faf8f3] rounded-[6px] p-3">
            <div className="text-[12px] text-[#6b6558]">{t.label}</div>
            <div className="text-[17px] font-extrabold text-[#1a1d2e] mt-1 whitespace-nowrap">{t.value}</div>
            <div className="text-[11px] font-bold mt-0.5 text-[#6b6558]">
              {data.curLabel} <Delta cur={t.cur} prev={t.prev} pt={t.pt} />
            </div>
          </div>
        ))}
      </div>

    </section>
  )
}
