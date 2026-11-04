import { NextResponse } from 'next/server'
import { buildOwmReport } from '@/lib/owm-report'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  try {
    return NextResponse.json(await buildOwmReport({ month: new URL(req.url).searchParams.get('month') ?? undefined }))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}
