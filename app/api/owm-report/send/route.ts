import { NextRequest, NextResponse } from 'next/server'
import { buildOwmReport, reportFilename, reportRangeLabel, reportXlsx, tablePeople, findTable } from '@/lib/owm-report'

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

    const [cs, ce] = r.cumulative.range
    const ppl = (g: 'owm' | 'optipharm', st: 'planned' | 'visited', sp: 'weekly' | 'cumulative') =>
      tablePeople(findTable(r, g, st, sp))
    const th = 'style="background:#3557d6;color:#fff;padding:8px 10px;font-size:13px"'
    const td = 'style="border-bottom:1px solid #f2ebdd;padding:8px 10px"'
    const row = (label: string, o: string, p: string) =>
      `<tr><td ${td}>${label}</td><td ${td} align="right"><b>${o}</b></td><td ${td} align="right"><b>${p}</b></td></tr>`
    const html = `
<div style="font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;color:#1a1d2e;max-width:640px">
  <h2 style="margin:0 0 4px">OWM · 옵티팜 주간 리포트</h2>
  <p style="margin:0 0 16px;color:#6b6558;font-size:13px">주간 ${ws} ~ ${we} (월~일) · 누적 ${cs} ~ ${ce}</p>
  <table cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px">
    <tr><th ${th} align="left">항목</th><th ${th} align="right">OWM 전체</th><th ${th} align="right">옵티팜</th></tr>
    ${row('주간 노출 조회수', n(r.summary.owm.views), n(r.summary.optipharm.views))}
    ${row('주간 업로드 콘텐츠', `${n(r.summary.owm.uploads)}건`, `${n(r.summary.optipharm.uploads)}건`)}
    ${row('누적 노출 조회수', n(r.cumulative.owm.views), n(r.cumulative.optipharm.views))}
    ${row('누적 업로드 콘텐츠', `${n(r.cumulative.owm.uploads)}건`, `${n(r.cumulative.optipharm.uploads)}건`)}
    ${row('방문예정 · 주간', `${ppl('owm', 'planned', 'weekly')}명`, `${ppl('optipharm', 'planned', 'weekly')}명`)}
    ${row('방문예정 · 누적', `${ppl('owm', 'planned', 'cumulative')}명`, `${ppl('optipharm', 'planned', 'cumulative')}명`)}
    ${row('방문 · 주간', `${ppl('owm', 'visited', 'weekly')}명`, `${ppl('optipharm', 'visited', 'weekly')}명`)}
    ${row('방문 · 누적', `${ppl('owm', 'visited', 'cumulative')}명`, `${ppl('optipharm', 'visited', 'cumulative')}명`)}
  </table>
  <h3 style="margin:20px 0 8px;font-size:15px">테이블 8개</h3>
  <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px">
    ${r.tables.map(t => `<tr><td>${t.no}. ${esc(t.title)}</td><td style="color:#6b6558">${reportRangeLabel(t)}</td><td align="right">${tablePeople(t)}명 · ${t.rows.length}행</td></tr>`).join('')}
  </table>
  <p style="margin-top:20px;font-size:13px">첨부 엑셀에 「요약」 시트와 8개 테이블(①~⑧)이 있습니다. 언제든 <a href="${site}">${site}</a> 에서 확인·다운로드하실 수 있습니다.</p>
</div>`

    const xlsx = Buffer.from(reportXlsx(r)).toString('base64')
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
