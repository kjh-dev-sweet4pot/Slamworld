import { buildOwmReport, reportFilename, reportSheets } from '@/lib/owm-report'
import { multiSheetXlsx } from '@/lib/export-report'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** 엑셀 1파일 · 9시트 (주간 요약 + 테이블 8개) */
export async function GET(req: Request) {
  try {
    const r = await buildOwmReport({ month: new URL(req.url).searchParams.get('month') ?? undefined })
    const bytes = multiSheetXlsx(reportSheets(r))
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
