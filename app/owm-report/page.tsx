'use client'

import { useEffect, useState } from 'react'
import type { OwmReport, ReportTable } from '@/lib/owm-report'

const COLUMNS = ['방문일', '지점', '인플루언서 핸들', '콘텐츠 URL', '업로드일', '조회수']
const f = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`
const rangeLabel = (t: ReportTable) => (t.range[1] === '9999-12-31' ? `${f(t.range[0])} ~` : `${f(t.range[0])} ~ ${f(t.range[1])}`)

export default function OwmReportPage() {
  const [data, setData] = useState<OwmReport | null>(null)
  const [error, setError] = useState('')
  const [sel, setSel] = useState(0)

  useEffect(() => {
    fetch('/api/owm-report', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError('불러오기 실패'))
  }, [])

  const t = data?.tables[sel]

  return (
    <div className="min-h-screen bg-[#fdf6e9] text-[#1a1d2e] font-sans pb-16">
      <header className="border-b border-[#f0e6d2] bg-white/90">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-7 py-4 flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-[18px] font-extrabold">OWM · 옵티팜 리포트</h1>
            <p className="text-[12px] text-[#8a8270]">by 브랜드슬램 · 11/1부터 누적 · 주간 = 월~일</p>
          </div>
          <a
            href="/api/owm-report/xlsx"
            className="ml-auto rounded-full bg-[#1a1d2e] text-white px-4 py-2 text-[13px] font-bold"
          >
            엑셀 다운로드 (8개 테이블)
          </a>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-7 mt-5">
        {error && <p className="text-[#e03131] text-[13px]">{error}</p>}
        {!data && !error && <p className="text-[13px] text-[#8a8270]">불러오는 중…</p>}
        {data && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([['OWM 전체', data.summary.owm], ['옵티팜', data.summary.optipharm]] as const).map(([label, s]) => (
                <div key={label} className="rounded-2xl bg-white border border-[#f0e6d2] p-4">
                  <div className="text-[12px] text-[#8a8270]">
                    {label} · 지난주 {f(data.summary.range[0])} ~ {f(data.summary.range[1])}
                  </div>
                  <div className="mt-2 flex gap-6">
                    <div>
                      <div className="text-[11.5px] text-[#6b6558]">업로드 콘텐츠</div>
                      <div className="text-[22px] font-extrabold">{s.uploads.toLocaleString()}건</div>
                    </div>
                    <div>
                      <div className="text-[11.5px] text-[#6b6558]">조회수</div>
                      <div className="text-[22px] font-extrabold">{s.views.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2">
              {data.tables.map((x, i) => (
                <button
                  key={x.key}
                  type="button"
                  onClick={() => setSel(i)}
                  className={`text-left rounded-xl border px-3 py-2 ${i === sel ? 'bg-[#1a1d2e] text-white border-[#1a1d2e]' : 'bg-white border-[#f0e6d2]'}`}
                >
                  <div className="text-[12.5px] font-bold">
                    {x.no}. {x.title}
                  </div>
                  <div className={`text-[11.5px] ${i === sel ? 'text-white/70' : 'text-[#8a8270]'}`}>
                    {rangeLabel(x)} · {x.rows.length}건
                  </div>
                </button>
              ))}
            </section>

            {t && (
              <section className="mt-4 rounded-2xl bg-white border border-[#f0e6d2] overflow-x-auto">
                <table className="w-full text-[13px] min-w-[720px]">
                  <thead className="bg-[#f7f4ec] text-[#6b6558]">
                    <tr>
                      {COLUMNS.map(c => (
                        <th key={c} className="text-left font-bold px-3 py-2 whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-[#8a8270]">
                          해당 기간 데이터가 없어요
                        </td>
                      </tr>
                    )}
                    {t.rows.map((r, i) => (
                      <tr key={i} className="border-t border-[#f4efe3]">
                        <td className="px-3 py-2 whitespace-nowrap">{r.visit_date}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.store}</td>
                        <td className="px-3 py-2 font-bold">{r.handle}</td>
                        <td className="px-3 py-2 max-w-[320px] truncate">
                          {r.url ? (
                            <a href={r.url} target="_blank" rel="noreferrer" className="text-[#4f7cff] hover:underline">
                              {r.url}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.posted_date ?? '—'}</td>
                        <td className="px-3 py-2 text-right">{r.views?.toLocaleString() ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
