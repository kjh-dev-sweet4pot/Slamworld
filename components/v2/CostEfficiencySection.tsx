'use client'

import { useEffect, useState } from 'react'
import type { CostEfficiencyRow } from '@/app/api/cost-efficiency/route'

const PLATFORM_LABEL: Record<string, string> = { instagram: '인스타그램', xiaohongshu: '샤오홍슈', tiktok: '틱톡' }
const TIER_LABEL: Record<string, string> = { mega: '메가', macro: '매크로', mid: '미드', micro: '마이크로', nano: '나노' }

/** 가성비 리스트 — 조회수 1회당 단가 (관리자 전용) */
export default function CostEfficiencySection() {
  const [rows, setRows] = useState<CostEfficiencyRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch('/api/cost-efficiency')
      .then(r => r.json())
      .then(d => (d.error ? setError(d.error) : setRows(d.rows)))
      .catch(() => setError('불러오지 못했습니다'))
  }, [])

  const list = rows ? (showAll ? rows : rows.slice(0, 10)) : []

  const cols = 'grid grid-cols-[40px_minmax(0,1.6fr)_70px_90px_90px] sm:grid-cols-[40px_minmax(0,1.6fr)_90px_110px_110px] gap-2'

  return (
    <div className="bg-white border border-[#f2ebdd] rounded-[6px] p-[18px] shadow-[0_4px_16px_rgba(30,41,59,0.06)]">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 text-[18px] font-extrabold text-[#1a1d2e]">가성비 리스트</h3>
        <span className="text-[11px] font-bold text-white bg-[#d6336c] rounded-full px-2 py-[3px]">관리자 전용</span>
        <span className="text-[11.5px] text-[#6b6558]">조회수 1회당 단가 · 낮을수록 좋음 · 8만원 일괄 등록분 제외</span>
      </div>

      {error && <div className="py-6 text-center text-[12px] text-[#6b6558]">{error}</div>}
      {!error && !rows && <div className="py-6 text-center text-[12px] text-[#6b6558]">불러오는 중이에요…</div>}

      {rows && (
        <>
          {/* 좁은 화면은 카드 안에서만 가로 스크롤 */}
          <div className="overflow-x-auto mt-1.5">
            <div className={`${cols} min-w-[360px] text-[11px] text-[#6b6558] pt-2.5 pb-1.5 border-b border-[#efe5d0]`}>
              <span>순위</span>
              <span>인플루언서</span>
              <span className="text-right">원가 (만)</span>
              <span className="text-right">조회수</span>
              <span className="text-right">1회당 단가</span>
            </div>
            {list.map((r, i) => (
              <div key={r.name + i} className={`${cols} min-w-[360px] items-center py-2 border-b border-[#f4efe4] text-[12px] text-[#1a1d2e]`}>
                <span className="font-extrabold">{i + 1}</span>
                <span className="min-w-0 truncate">
                  <b>{r.name}</b>{' '}
                  <span className="text-[11px] text-[#6b6558]">
                    {PLATFORM_LABEL[r.platform] ?? r.platform}
                    {r.tier ? ` · ${TIER_LABEL[r.tier] ?? r.tier}` : ''}
                  </span>
                </span>
                <span className="text-right whitespace-nowrap">{Math.round(r.cost / 10000).toLocaleString()}</span>
                <span className="text-right whitespace-nowrap">{r.views.toLocaleString()}</span>
                <span className={`text-right whitespace-nowrap font-extrabold ${i < 3 ? 'text-[#3557d6]' : 'text-[#1a1d2e]'}`}>
                  {r.costPerView.toFixed(2)}원
                </span>
              </div>
            ))}
          </div>
          {rows.length > 10 && (
            <div className="text-center mt-2.5">
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="border border-[#e3d9c4] bg-white text-[12px] font-medium text-[#1a1d2e] rounded-full px-3.5 py-1.5 hover:bg-[#faf8f3]"
              >
                {showAll ? '접기' : `전체 ${rows.length}명 보기`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
