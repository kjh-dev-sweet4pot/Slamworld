import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runBoardingpassSync } from '@/scripts/sync-from-boardingpass.mjs'

export const maxDuration = 60

/** 마지막 동기화 후 이 시간(초)이 지나야 다시 돈다 */
const MIN_GAP_SEC = 120

/**
 * 대시보드가 열려 있는 동안 주기적으로 호출 — 보딩패스 → slamworld 준실시간 동기화.
 * sync_state 잠금으로 여러 사람이 동시에 열어도 한 번만 돈다.
 */
export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 없음' }, { status: 500 })
  const sw = createClient(url, key, { auth: { persistSession: false } })

  const { data: claimed, error } = await sw.rpc('claim_sync', { p_id: 'boardingpass', min_gap: MIN_GAP_SEC })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!claimed) {
    const { data } = await sw.from('sync_state').select('finished_at,ok').eq('id', 'boardingpass').single()
    return NextResponse.json({ synced: false, lastSync: data?.finished_at ?? null })
  }

  try {
    const summary = await runBoardingpassSync({ apply: true })
    const finished = new Date().toISOString()
    await sw.from('sync_state').update({ finished_at: finished, ok: true, message: null }).eq('id', 'boardingpass')
    return NextResponse.json({ synced: true, lastSync: finished, summary })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed'
    await sw.from('sync_state').update({ ok: false, message }).eq('id', 'boardingpass')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
