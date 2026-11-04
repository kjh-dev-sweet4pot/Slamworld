import { NextRequest, NextResponse } from 'next/server'
import { buildOwmReport, reportFilename, reportRangeLabel, reportSheets } from '@/lib/owm-report'
import { multiSheetXlsx } from '@/lib/export-report'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Vercel Cron(월 08:00 KST) 또는 로컬 개발에서만 허용 */
function authorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') return true
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const n = (v: number) => v.toLocaleString('ko-KR')

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const key = process.env.RESEND_API_KEY
  if (!key) return NextResponse.json({ error: 'RESEND_API_KEY 없음' }, { status: 500 })

  try {
    const r = await buildOwmReport({ month: req.nextUrl.searchParams.get('month') ?? undefined })
    const to = (process.env.REPORT_MAIL_TO || 'kjh@slam-global.com').split(',').map(s => s.trim()).filter(Boolean)
    const from = process.env.REPORT_MAIL_FROM || 'BrandSlam <reportDoNotREPLY@slam-global.com>'
    const site = process.env.REPORT_SITE_URL || `${req.nextUrl.origin}/owm-report`
    const [ws, we] = r.summary.range

    const html = `
<div style="font-family:-apple-system,sans-serif;color:#1a1d2e;max-width:640px">
  <h2 style="margin:0 0 4px">OWM · 옵티팜 주간 리포트</h2>
  <p style="margin:0 0 16px;color:#6b6558">${ws} ~ ${we} (월~일)</p>
  <table cellpadding="8" style="border-collapse:collapse;width:100%;font-size:14px">
    <tr style="background:#f7f4ec"><th align="left">구분</th><th align="right">업로드 콘텐츠</th><th align="right">조회수</th></tr>
    <tr><td>OWM 전체</td><td align="right">${n(r.summary.owm.uploads)}건</td><td align="right">${n(r.summary.owm.views)}</td></tr>
    <tr><td>옵티팜</td><td align="right">${n(r.summary.optipharm.uploads)}건</td><td align="right">${n(r.summary.optipharm.views)}</td></tr>
  </table>
  <h3 style="margin:20px 0 8px;font-size:15px">테이블 8개</h3>
  <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px">
    ${r.tables.map(t => `<tr><td>${t.no}. ${esc(t.title)}</td><td style="color:#6b6558">${reportRangeLabel(t)}</td><td align="right">${t.rows.length}건</td></tr>`).join('')}
  </table>
  <p style="margin-top:20px;font-size:13px">첨부 엑셀에 8개 테이블이 있습니다. 메일 오류 시 <a href="${site}">${site}</a> 에서 언제든 받으실 수 있습니다.</p>
</div>`

    const xlsx = Buffer.from(multiSheetXlsx(reportSheets(r))).toString('base64')
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject: `[BrandSlam] OWM·옵티팜 주간 리포트 (${ws} ~ ${we})`,
        html,
        attachments: [{ filename: reportFilename(r), content: xlsx }],
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return NextResponse.json({ error: body }, { status: 502 })
    return NextResponse.json({ ok: true, to, id: body.id })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}
