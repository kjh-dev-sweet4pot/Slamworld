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

  return (
    <div className="bg-white border border-[#f2ebdd] rounded-2xl shadow-[0_4px_16px_rgba(30,41,59,0.06)] p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-[14px] font-extrabold text-[#1a1d2e]">가성비 리스트</h3>
        <span className="text-[10px] font-bold text-[#b42318] bg-[#fef2f2] rounded px-1.5 py-0.5">관리자 전용</span>
        <span className="text-[11px] text-[#9a9486]">조회수 1회당 단가 · 낮을수록 좋음 · 8만원 일괄 등록분 제외</span>
      </div>

      {error && <div className="py-6 text-center text-[12px] text-[#9a9486]">{error}</div>}
      {!error && !rows && <div className="py-6 text-center text-[12px] text-[#9a9486]">불러오는 중이에요…</div>}

      {rows && (
        <div className="overflow-x-auto mt-3">
          <table className="w-full min-w-[360px] text-[12px] border-collapse">
            <thead>
              <tr className="text-[11px] text-[#9a9486] border-b border-[#eee6d6]">
                <th className="text-center font-semibold py-2 w-10">순위</th>
                <th className="text-left font-semibold py-2">인플루언서</th>
                <th className="text-right font-semibold py-2">원가</th>
                <th className="text-right font-semibold py-2">조회수</th>
                <th className="text-right font-semibold py-2 pr-1">1회당 단가</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={r.name + i} className="border-b border-[#f7f2e8] last:border-b-0">
                  <td className="text-center py-2 font-extrabold text-[#9a9486]">{i + 1}</td>
                  <td className="py-1.5 max-w-0 w-full">
                    <div className="truncate font-bold text-[#1a1d2e]">{r.name}</div>
                    <div className="text-[10.5px] text-[#9a9486]">
                      {PLATFORM_LABEL[r.platform] ?? r.platform}
                      {r.tier ? ` · ${TIER_LABEL[r.tier] ?? r.tier}` : ''}
                    </div>
                  </td>
                  <td className="py-2 pl-3 text-right whitespace-nowrap">{Math.round(r.cost / 10000).toLocaleString()}만</td>
                  <td className="py-2 pl-3 text-right whitespace-nowrap">{r.views.toLocaleString()}</td>
                  <td className={`py-2 pl-3 pr-1 text-right whitespace-nowrap font-extrabold ${i < 3 ? 'text-[#2f5fd8]' : 'text-[#1a1d2e]'}`}>
                    {r.costPerView.toFixed(2)}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 10 && (
            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="text-[11px] font-bold text-[#4f7cff] bg-[#eef3ff] hover:bg-[#e0ebff] rounded-full px-3 py-1"
              >
                {showAll ? '접기' : `전체 ${rows.length}명 보기`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
