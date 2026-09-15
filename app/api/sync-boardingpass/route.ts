import { NextRequest, NextResponse } from 'next/server'
import { runBoardingpassSync } from '@/scripts/sync-from-boardingpass.mjs'

export const maxDuration = 60

function authorized(req: NextRequest): boolean {
  const secrets = [process.env.CRON_SECRET, process.env.SYNC_METRICS_SECRET].filter(Boolean)
  if (secrets.length === 0) return process.env.NODE_ENV === 'development'
  const auth = req.headers.get('authorization')
  return secrets.some(secret => auth === `Bearer ${secret}`)
}

async function run() {
  try {
    const summary = await runBoardingpassSync({ apply: true })
    return NextResponse.json(summary)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Vercel Cron 은 GET 으로 호출한다. */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return run()
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return run()
}
