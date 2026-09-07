'use client'
import { createContext, useContext } from 'react'
import type { AccessLevel } from '@/lib/access'
import { canSeeSales } from '@/lib/access'

export interface AccessValue {
  level: AccessLevel
  showSales: boolean
  logout: () => void
}

const AccessContext = createContext<AccessValue | null>(null)

export function AccessProvider({
  level,
  logout,
  children,
}: {
  level: AccessLevel
  logout: () => void
  children: React.ReactNode
}) {
  return (
    <AccessContext.Provider value={{ level, showSales: canSeeSales(level), logout }}>
      {children}
    </AccessContext.Provider>
  )
}

export function useAccess(): AccessValue {
  const ctx = useContext(AccessContext)
  if (!ctx) throw new Error('useAccess requires AccessProvider')
  return ctx
}

/** 로그인 전·테스트용 — Provider 밖이면 매출 노출(기본) */
export function useShowSales(): boolean {
  const ctx = useContext(AccessContext)
  return ctx?.showSales ?? true
}
