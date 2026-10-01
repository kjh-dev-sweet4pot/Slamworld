'use client'
import { useEffect, useState, type FormEvent } from 'react'
import {
  accessFromPassword,
  clearStoredAccess,
  loadStoredAccess,
  storeAccess,
  type AccessSession,
} from '@/lib/access'
import { AccessProvider } from '@/lib/access-context'
import { APP_VERSION } from '@/lib/changelog'

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AccessSession | null>(null)
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setSession(loadStoredAccess())
    setReady(true)
  }, [])

  function logout() {
    clearStoredAccess()
    setSession(null)
    setPassword('')
    setError('')
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next = accessFromPassword(password)
    if (!next) {
      setError('비밀번호가 올바르지 않습니다.')
      return
    }
    storeAccess(next)
    setSession(next)
    setError('')
    setPassword('')
  }

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-[#fdf6e9] via-[#fbeed6] to-[#f2dcb2] text-[#6b6558] text-sm font-semibold">
        불러오는 중…
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-[#fdf6e9] via-[#fbeed6] via-[38%] via-[#f6e3bf] via-[62%] to-[#f2dcb2] px-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-[380px] rounded-2xl border border-[#f0e6d2] bg-white/90 backdrop-blur-md p-8 shadow-[0_8px_30px_rgba(30,41,59,0.08)]"
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-[0.14em] text-[#9a3412] bg-[#ffedd5] px-2.5 py-0.5 rounded-[7px] uppercase">
              OWM × 브랜드슬램
            </span>
            <span className="text-[10.5px] font-bold text-[#9a3412] bg-[#ffedd5] px-2 py-0.5 rounded-[7px]">v{APP_VERSION}</span>
          </div>
          <h1 className="mt-3 text-[23px] font-extrabold tracking-tight text-[#1a1d2e]">
            리포트 로그인
          </h1>
          <p className="mt-1.5 text-[13px] text-[#6b6558] leading-relaxed">
            관리자 · 미팅 · 회원사 비밀번호로 입장할 수 있습니다.
          </p>

          <label className="mt-6 block">
            <span className="text-[12px] font-bold text-[#6b6558]">비밀번호</span>
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                if (error) setError('')
              }}
              className="mt-1.5 w-full rounded-xl border border-[#e8dfcf] bg-[#fbf9f4] px-4 py-3
                text-[14px] text-[#1a1d2e] placeholder-[#b5ad9c] outline-none transition
                focus:border-[#c2410c] focus:bg-white focus:ring-2 focus:ring-[#c2410c]/10"
              placeholder="비밀번호 입력"
            />
          </label>

          {error && (
            <p className="mt-2 text-[12px] font-semibold text-[#dc2626]">{error}</p>
          )}

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-[#c2410c] py-3 text-[14px] font-extrabold text-white
              shadow-[0_4px_14px_rgba(194,65,12,0.28)] hover:bg-[#9a3412] hover:shadow-[0_6px_18px_rgba(194,65,12,0.34)]
              active:scale-[0.99] transition-all cursor-pointer"
          >
            입장
          </button>
        </form>
      </div>
    )
  }

  return (
    <AccessProvider session={session} logout={logout}>
      {children}
    </AccessProvider>
  )
}
