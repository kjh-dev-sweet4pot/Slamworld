import type { Content } from '@/lib/types'
import { contentViews, contentViewsDisplay } from '@/lib/content-views'

const HEADERS = [
  '지점',
  '인플루언서',
  'SNS ID',
  '채널',
  '팔로워',
  '캠페인',
  '방문일',
  '브랜드',
  '조회수',
  '조회수구분',
  '좋아요',
  '저장',
  '댓글',
  '업로드 URL',
] as const

export function reportPdfTitle(partnerBrand: string | null): string {
  return partnerBrand
    ? `OWM-${partnerBrand}-리포트`
    : 'OWM-브랜드슬램-인플루언서-리포트'
}

export function influencerXlsxFilename(partnerBrand: string | null): string {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const who = partnerBrand ? `-${partnerBrand}` : ''
  return `OWM-인플루언서${who}-${ymd}.xlsx`
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function colLetter(i: number): string {
  let n = i + 1
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function viewsCell(c: Content): { n: number | null; kind: string } {
  const { value, estimated } = contentViewsDisplay(c)
  if (value == null) return { n: null, kind: '' }
  return { n: contentViews(c), kind: estimated ? '추정' : '실측' }
}

function xlsxCell(col: number, row: number, value: string | number | null): string {
  const r = `${colLetter(col)}${row}`
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${r}"><v>${value}</v></c>`
  }
  return `<c r="${r}" t="inlineStr"><is><t>${xmlEscape(value == null ? '' : String(value))}</t></is></c>`
}

function sheetXml(rows: Content[]): string {
  const header = `<row r="1">${HEADERS.map((h, i) => xlsxCell(i, 1, h)).join('')}</row>`
  const body = rows.map((c, idx) => {
    const row = idx + 2
    const v = viewsCell(c)
    const vals: (string | number | null)[] = [
      c.location ?? '',
      c.influencer_name ?? '',
      c.sns_id ?? '',
      c.channel ?? '',
      c.follower_count,
      c.campaign ?? '',
      c.visit_date ?? '',
      c.brands ?? '',
      v.n,
      v.kind,
      c.likes,
      c.saves,
      c.comments,
      c.upload_url ?? '',
    ]
    return `<row r="${row}">${vals.map((val, i) => xlsxCell(i, row, val)).join('')}</row>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${header}${body}</sheetData>
</worksheet>`
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, n, true)
  return b
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, true)
  return b
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

/** ponytail: uncompressed ZIP — enough for a one-sheet xlsx, no extra lib */
function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  const enc = new TextEncoder()
  for (const f of files) {
    const name = enc.encode(f.name)
    const crc = crc32(f.data)
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(f.data.length), u32(f.data.length),
      u16(name.length), u16(0), name, f.data,
    ])
    locals.push(local)
    centrals.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(f.data.length), u32(f.data.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset),
      name,
    ]))
    offset += local.length
  }
  const central = concat(centrals)
  const eocd = concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(offset), u16(0),
  ])
  return concat([...locals, central, eocd])
}

export function influencerListXlsx(rows: Content[]): Uint8Array {
  const enc = new TextEncoder()
  const xml = (s: string) => enc.encode(s)
  return zipStore([
    { name: '[Content_Types].xml', data: xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`) },
    { name: '_rels/.rels', data: xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`) },
    { name: 'xl/workbook.xml', data: xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="참여 인플루언서" sheetId="1" r:id="rId1"/></sheets>
</workbook>`) },
    { name: 'xl/_rels/workbook.xml.rels', data: xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`) },
    { name: 'xl/styles.xml', data: xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="1"><fill><patternFill patternType="none"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="1"><xf/></cellXfs>
</styleSheet>`) },
    { name: 'xl/worksheets/sheet1.xml', data: xml(sheetXml(rows)) },
  ])
}

export function downloadInfluencerXlsx(rows: Content[], filename: string) {
  const bytes = influencerListXlsx(rows)
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function printReportPdf(title: string) {
  const prev = document.title
  document.title = title
  document.documentElement.classList.add('is-printing')
  const restore = () => {
    document.title = prev
    document.documentElement.classList.remove('is-printing')
    window.removeEventListener('afterprint', restore)
  }
  window.addEventListener('afterprint', restore)
  // ponytail: print() can snapshot before class layout; 50ms ceiling, drop if Chrome ever waits on rAF
  requestAnimationFrame(() => {
    setTimeout(() => window.print(), 50)
  })
}

const SAMPLE: Content = {
  id: 1,
  campaign: '명동오픈_0811',
  location: '명동점',
  brands: 'TestBrand',
  influencer_name: '테스트<이름>',
  sns_id: 'abc',
  profile_url: null,
  channel: '인스타그램',
  follower_count: 1000,
  target_audience: null,
  is_press: false,
  visit_date: '2026-08-11',
  product: null,
  upload_url: 'https://example.com',
  views: 50,
  likes: 2,
  saves: 1,
  comments: 0,
  views_estimated: null,
  views_est_low: null,
  views_est_high: null,
  views_source: 'measured',
}

// ponytail: smoke
if (process.env.NODE_ENV !== 'production') {
  if (xmlEscape('a<b&c>') !== 'a&lt;b&amp;c&gt;') throw new Error('xmlEscape self-check failed')
  const bytes = influencerListXlsx([SAMPLE])
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('xlsx is not a zip')
  const text = new TextDecoder().decode(bytes)
  if (!text.includes('xl/worksheets/sheet1.xml') || !text.includes('테스트&lt;이름&gt;') || !text.includes('실측')) {
    throw new Error('influencerListXlsx self-check failed')
  }
}
