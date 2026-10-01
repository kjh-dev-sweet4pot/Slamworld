'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { APP_VERSION, CHANGELOG } from '@/lib/changelog'

/** 헤더 버전 뱃지 — 누르면 업데이트 소식 */
export default function ChangelogBadge({ className }: { className: string }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${className} hover:brightness-95`} title="업데이트 소식">
        v{APP_VERSION}
      </button>
      {/* 헤더 backdrop-blur 안에선 fixed 가 헤더 기준이 돼서 body 로 뺀다 */}
      {open && createPortal(
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-[520px] max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center px-5 py-4 border-b border-[#f0e6d2]">
              <span className="text-[15px] font-extrabold text-[#1a1d2e]">v{APP_VERSION} 업데이트 소식</span>
              <button type="button" onClick={() => setOpen(false)} className="ml-auto text-[18px] text-[#6b6558] hover:text-[#1a1d2e]">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-2">
              {CHANGELOG.map(e => {
                const isOpen = expanded === e.version
                return (
                  <div key={e.version} className="py-2.5 border-b border-[#f4efe3] last:border-b-0">
                    <div className="text-[12px] font-bold text-[#4f7cff]">{e.date}</div>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : e.version)}
                      className="w-full text-left mt-1 text-[13px] text-[#1a1d2e]"
                    >
                      <span className={isOpen ? '' : 'block truncate'}>
                        • {e.icon} <b>{e.title}(v{e.version})</b> — {e.items[0]}
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
