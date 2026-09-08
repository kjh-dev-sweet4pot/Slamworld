'use client'
import { createContext, useContext } from 'react'
import {
  canSeeSales,
  partnerBrandOf,
  type AccessSession,
} from '@/lib/access'

export interface AccessValue {
  session: AccessSession
  level: AccessSession['kind']
  showSales: boolean
  partnerBrand: string | null
  logout: () => void
}

const AccessContext = createContext<AccessValue | null>(null)

export function AccessProvider({
  session,
  logout,
  children,
}: {
  session: AccessSession
  logout: () => void
  children: React.ReactNode
}) {
  return (
    <AccessContext.Provider
      value={{
        session,
        level: session.kind,
        showSales: canSeeSales(session),
        partnerBrand: partnerBrandOf(session),
        logout,
      }}
    >
      {children}
    </AccessContext.Provider>
  )
}

export function useAccess(): AccessValue {
  const ctx = useContext(AccessContext)
  if (!ctx) throw new Error('useAccess requires AccessProvider')
  return ctx
}

/** Provider 밖이면 매출 노출(기본) */
export function useShowSales(): boolean {
  const ctx = useContext(AccessContext)
  return ctx?.showSales ?? true
}

export function usePartnerBrand(): string | null {
  const ctx = useContext(AccessContext)
  return ctx?.partnerBrand ?? null
}
