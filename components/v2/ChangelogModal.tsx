'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { APP_VERSION, CHANGELOG } from '@/lib/changelog'

/** 헤더 버전 뱃지 — 누르면 업데이트 소식 */
export default function ChangelogBadge({ className }: { className: string }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 60, left: 16 })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button type="button" ref={btn}
        onClick={() => {
          // 버전 뱃지 바로 아래에 띄운다
          const r = btn.current?.getBoundingClientRect()
          if (r) setPos({ top: r.bottom + 8, left: Math.max(16, Math.min(r.left, window.innerWidth - 496)) })
          setOpen(true)
        }} className={`${className} hover:brightness-95`} title="업데이트 소식">
        v{APP_VERSION}
      </button>
      {/* 헤더 backdrop-blur 안에선 fixed 가 헤더 기준이 돼서 body 로 뺀다 */}
      {open && createPortal(
        <div className="fixed inset-0 z-[60] bg-black/25 backdrop-blur-[6px]" onClick={() => setOpen(false)}>
          <div
            style={{ top: pos.top, left: pos.left }}
            className="absolute w-[min(480px,calc(100vw-32px))] bg-white rounded-2xl shadow-[0_12px_40px_rgba(30,41,59,0.18)] border border-[#eef0f4] max-h-[min(420px,75vh)] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center px-4 py-3.5 border-b border-[#eef0f4]">
              <span className="text-[14px] font-extrabold text-[#1a1d2e]">v{APP_VERSION} 업데이트 소식</span>
              <button type="button" onClick={() => setOpen(false)} className="ml-auto text-[15px] text-[#6b6558] hover:text-[#1a1d2e]">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto">
              {CHANGELOG.map(e => {
                const isOpen = expanded === e.version
                return (
                  <div key={e.version} className="px-4 py-2 border-b border-[#f1f2f5] last:border-b-0 odd:bg-white even:bg-[#f8f9fb]">
                    <div className="text-[11.5px] font-bold text-[#4f7cff]">{e.date}</div>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : e.version)}
                      className="w-full text-left mt-0.5 text-[12.5px] text-[#1a1d2e]"
                    >
                      <span className={isOpen ? '' : 'block truncate'}>
                        <span className="text-[#4f7cff]">•</span> {e.icon} <b>{e.title}(v{e.version})</b> — {e.items[0]}
                      </span>
                    </button>
                    {isOpen && (
                      <ul className="mt-1.5 ml-4 flex flex-col gap-1">
                        {e.items.map(item => (
                          <li key={item} className="text-[12.5px] text-[#4a4d5e] list-disc">
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
