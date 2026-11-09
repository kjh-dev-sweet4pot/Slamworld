import { reportOpts, buildOwmReport, reportFilename, reportXlsx } from '@/lib/owm-report'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** 엑셀 1파일 · 9시트 (요약 + 테이블 ①~⑧) */
export async function GET(req: Request) {
  try {
    const r = await buildOwmReport(reportOpts(new URL(req.url).searchParams))
    const bytes = reportXlsx(r)
    return new Response(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(reportFilename(r))}`,
      },
    })
  } catch (e) {
    return new Response(e instanceof Error ? e.message : 'failed', { status: 500 })
  }
}
