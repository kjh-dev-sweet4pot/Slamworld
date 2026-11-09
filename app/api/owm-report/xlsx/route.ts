import { reportOpts, buildOwmReport, reportFilename, reportXlsx } from '@/lib/owm-report'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** 엑셀 1파일 · 요약 + ①~⑧ (누적 포함). 파일명만 주간 기준 */
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams
    const r = await buildOwmReport(reportOpts(q))
    const bytes = reportXlsx(r)
    return new Response(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(reportFilename(r, true))}`,
      },
    })
  } catch (e) {
    return new Response(e instanceof Error ? e.message : 'failed', { status: 500 })
  }
}
