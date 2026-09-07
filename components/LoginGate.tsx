'use client'
import { useEffect, useState, type FormEvent } from 'react'
import {
  accessFromPassword,
  clearStoredAccess,
  loadStoredAccess,
  storeAccess,
  type AccessLevel,
} from '@/lib/access'
import { AccessProvider } from '@/lib/access-context'

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [level, setLevel] = useState<AccessLevel | null>(null)
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLevel(loadStoredAccess())
    setReady(true)
  }, [])

  function logout() {
    clearStoredAccess()
    setLevel(null)
    setPassword('')
    setError('')
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next = accessFromPassword(password.trim())
    if (!next) {
      setError('비밀번호가 올바르지 않습니다.')
      return
    }
    storeAccess(next)
    setLevel(next)
    setError('')
    setPassword('')
  }

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-owm-bg text-owm-text2 text-sm">
        불러오는 중…
      </div>
    )
  }

  if (!level) {
    return (
      <div className="min-h-screen grid place-items-center bg-owm-bg px-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-[360px] rounded-[14px] border border-owm-border bg-white p-7 shadow-[var(--owm-shadow)]"
        >
          <p className="text-[11px] font-semibold tracking-widest text-owm-blue uppercase">
            OWM × 브랜드슬램
          </p>
          <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-owm-text">
            리포트 로그인
          </h1>
          <p className="mt-1.5 text-[12.5px] text-owm-text2 leading-relaxed">
            비밀번호를 입력하면 대시보드를 볼 수 있습니다.
          </p>

          <label className="mt-6 block">
            <span className="text-[11px] font-semibold text-owm-text2">비밀번호</span>
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                if (error) setError('')
              }}
              className="mt-1.5 w-full rounded-lg border border-owm-border bg-[#f8f9fb] px-3.5 py-2.5
                text-[14px] text-owm-text outline-none focus:border-owm-blue focus:bg-white"
              placeholder="비밀번호 입력"
            />
          </label>

          {error && (
            <p className="mt-2 text-[12px] font-medium text-[#DC2626]">{error}</p>
          )}

          <button
            type="submit"
            className="mt-5 w-full rounded-lg bg-azure py-2.5 text-[13.5px] font-bold text-white
              shadow-[0_2px_8px_rgba(24,104,240,.28)] hover:brightness-105 transition"
          >
            입장
          </button>
        </form>
      </div>
    )
  }

  return (
    <AccessProvider level={level} logout={logout}>
      {children}
    </AccessProvider>
  )
}
