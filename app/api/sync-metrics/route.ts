import { NextRequest, NextResponse } from 'next/server'
import { syncContentMetrics } from '@/lib/apify/sync-metrics'
import type { SyncChannel } from '@/lib/apify/types'
import { SYNC_CHANNELS } from '@/lib/apify/types'

function authorized(req: NextRequest): boolean {
  const secret = process.env.SYNC_METRICS_SECRET
  if (!secret) return process.env.NODE_ENV === 'development'
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    channels?: SyncChannel[]
    limit?: number
    ids?: number[]
    dryRun?: boolean
  } = {}

  try {
    body = await req.json()
  } catch {
    // empty body OK
  }

  const channels = body.channels?.filter(c => SYNC_CHANNELS.includes(c))

  try {
    const summary = await syncContentMetrics({
      channels: channels?.length ? channels : undefined,
      limit: body.limit,
      ids: body.ids,
      dryRun: body.dryRun ?? false,
    })
    return NextResponse.json(summary)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    usage: 'POST /api/sync-metrics',
    channels: SYNC_CHANNELS,
    body: {
      channels: ['인스타그램', '틱톡', '샤오홍슈'],
      limit: 10,
      ids: [1, 2, 3],
      dryRun: true,
    },
    env: ['APIFY_API_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'SYNC_METRICS_SECRET'],
  })
}
