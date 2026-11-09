/**
 * 스타일 xlsx 작성기 (의존성 없음)
 * - 셀 스타일 = 객체(글꼴·채우기·테두리·정렬·숫자서식) → styles.xml 자동 등록 (중복 제거)
 * - 열 너비, 행 높이, 틀 고정, 병합, 외부/내부 하이퍼링크, 자동 필터
 * - 인쇄: 가로/세로, 1페이지 너비 맞춤, 반복 머리글 행, 눈금선 숨김, 탭 색
 */
import { zipStore } from '@/lib/export-report'

export interface Font {
  b?: boolean
  i?: boolean
  u?: boolean
  sz?: number
  color?: string // 'RRGGBB'
}
export type Edge = 'thin' | 'medium' | 'hair'
export interface Border {
  left?: Edge
  right?: Edge
  top?: Edge
  bottom?: Edge
  color?: string
}
export interface Style {
  font?: Font
  fill?: string // 'RRGGBB'
  border?: Border | 'thin'
  numFmt?: string // '#,##0'
  h?: 'left' | 'center' | 'right'
  v?: 'top' | 'center' | 'bottom'
  wrap?: boolean
  indent?: number
}

export type CellValue = string | number | null | undefined
export interface Cell {
  v: CellValue
  s?: Style
  /** 외부 링크 */
  href?: string
  /** 내부 링크 (예: "'요약'!A1") */
  location?: string
}
export type Row = (CellValue | Cell)[]

export interface StyledSheet {
  name: string
  rows: Row[]
  widths?: number[]
  /** 행 높이 (0-based 행 인덱스 → pt) */
  heights?: Record<number, number>
  freezeRow?: number // 이 행까지 고정 (1 = 첫 행)
  merges?: string[] // 'A1:F1'
  autoFilterRow?: number // 헤더 행 번호
  autoFilterLastRow?: number // 필터 범위 마지막 행 (합계 행 제외용)
  landscape?: boolean
  fitWidth?: boolean // 1페이지 너비 맞춤
  fitPage?: boolean // 1페이지 전체 맞춤
  printTitleRows?: [number, number] // 인쇄 시 반복할 행 (1-based)
  hideGrid?: boolean
  tabColor?: string
}

const esc = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export const col = (i: number): string => {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

export const safeSheetName = (name: string) => name.replace(/[\\/?*[\]:]/g, '').slice(0, 31)

/** 시트 내부 링크 위치 */
export const sheetRef = (name: string, cell = 'A1') => `'${safeSheetName(name).replace(/'/g, "''")}'!${cell}`

const FONT_NAME = '맑은 고딕'

/** styles.xml 레지스트리 — 스타일 객체를 xf 인덱스로 */
class Registry {
  fonts: string[] = [`<font><sz val="10"/><color rgb="FF2A2620"/><name val="${FONT_NAME}"/><family val="2"/></font>`]
  fills: string[] = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>']
  borders: string[] = ['<border><left/><right/><top/><bottom/><diagonal/></border>']
  numFmts: string[] = []
  xfs: string[] = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>']
  private keys = new Map<string, number>()

  private add(list: string[], xml: string): number {
    const i = list.indexOf(xml)
    if (i >= 0) return i
    list.push(xml)
    return list.length - 1
  }

  font(f?: Font): number {
    if (!f) return 0
    const xml = `<font>${f.b ? '<b/>' : ''}${f.i ? '<i/>' : ''}${f.u ? '<u/>' : ''}<sz val="${f.sz ?? 10}"/><color rgb="FF${(f.color ?? '2A2620').toUpperCase()}"/><name val="${FONT_NAME}"/><family val="2"/></font>`
    return this.add(this.fonts, xml)
  }
  fill(c?: string): number {
    if (!c) return 0
    return this.add(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="FF${c.toUpperCase()}"/><bgColor indexed="64"/></patternFill></fill>`)
  }
  border(b?: Border | 'thin'): number {
    if (!b) return 0
    const x: Border = b === 'thin' ? { left: 'thin', right: 'thin', top: 'thin', bottom: 'thin' } : b
    const color = `<color rgb="FF${(x.color ?? 'E3D9C4').toUpperCase()}"/>`
    const e = (tag: string, st?: Edge) => (st ? `<${tag} style="${st}">${color}</${tag}>` : `<${tag}/>`)
    return this.add(this.borders, `<border>${e('left', x.left)}${e('right', x.right)}${e('top', x.top)}${e('bottom', x.bottom)}<diagonal/></border>`)
  }
  numFmt(code?: string): number {
    if (!code) return 0
    if (code === '#,##0') return 3
    if (code === '0') return 1
    const i = this.numFmts.indexOf(code)
    if (i >= 0) return 164 + i
    this.numFmts.push(code)
    return 164 + this.numFmts.length - 1
  }

  xf(s?: Style): number {
    if (!s) return 0
    const key = JSON.stringify(s)
    const hit = this.keys.get(key)
    if (hit !== undefined) return hit
    const fontId = this.font(s.font)
    const fillId = this.fill(s.fill)
    const borderId = this.border(s.border)
    const numFmtId = this.numFmt(s.numFmt)
    const hasAlign = s.h || s.v || s.wrap || s.indent
    const align = hasAlign
      ? `<alignment${s.h ? ` horizontal="${s.h}"` : ''} vertical="${s.v ?? 'center'}"${s.wrap ? ' wrapText="1"' : ''}${s.indent ? ` indent="${s.indent}"` : ''}/>`
      : '<alignment vertical="center"/>'
    const xml = `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${align}</xf>`
    const idx = this.add(this.xfs, xml)
    this.keys.set(key, idx)
    return idx
  }

  xml(): string {
    const nf = this.numFmts.length
      ? `<numFmts count="${this.numFmts.length}">${this.numFmts.map((c, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(c)}"/>`).join('')}</numFmts>`
      : ''
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${nf}<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts><fills count="${this.fills.length}">${this.fills.join('')}</fills><borders count="${this.borders.length}">${this.borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
  }
}

function sheetXml(sh: StyledSheet, reg: Registry): { xml: string; links: string[] } {
  const links: { ref: string; href?: string; location?: string }[] = []
  let maxCol = 0
  const rows = sh.rows
    .map((r, i) => {
      maxCol = Math.max(maxCol, r.length)
      const cells = r
        .map((raw, j) => {
          const c: Cell = raw !== null && typeof raw === 'object' ? raw : { v: raw }
          const ref = `${col(j)}${i + 1}`
          const xf = reg.xf(c.s)
          const s = xf ? ` s="${xf}"` : ''
          if (c.href || c.location) links.push({ ref, href: c.href, location: c.location })
          if (c.v === null || c.v === undefined || c.v === '') return s ? `<c r="${ref}"${s}/>` : ''
          if (typeof c.v === 'number' && Number.isFinite(c.v)) return `<c r="${ref}"${s}><v>${c.v}</v></c>`
          return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(String(c.v))}</t></is></c>`
        })
        .join('')
      const h = sh.heights?.[i]
      return `<row r="${i + 1}"${h ? ` ht="${h}" customHeight="1"` : ''}>${cells}</row>`
    })
    .join('')
  const grid = sh.hideGrid ? ' showGridLines="0"' : ''
  const pane = sh.freezeRow
    ? `<sheetViews><sheetView${grid} workbookViewId="0"><pane ySplit="${sh.freezeRow}" topLeftCell="A${sh.freezeRow + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${sh.freezeRow + 1}" sqref="A${sh.freezeRow + 1}"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView${grid} workbookViewId="0"/></sheetViews>`
  const fit = sh.fitWidth || sh.fitPage
  const pr =
    sh.tabColor || fit
      ? `<sheetPr>${sh.tabColor ? `<tabColor rgb="FF${sh.tabColor.toUpperCase()}"/>` : ''}${fit ? '<pageSetUpPr fitToPage="1"/>' : ''}</sheetPr>`
      : ''
  const cols = sh.widths?.length
    ? `<cols>${sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : ''
  const last = sh.autoFilterLastRow ?? sh.rows.length
  const filter =
    sh.autoFilterRow && maxCol && last > sh.autoFilterRow ? `<autoFilter ref="A${sh.autoFilterRow}:${col(maxCol - 1)}${last}"/>` : ''
  const merges = sh.merges?.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''
  let ext = 0
  const hl = links.length
    ? `<hyperlinks>${links
        .map(l =>
          l.href ? `<hyperlink ref="${l.ref}" r:id="rId${++ext}"/>` : `<hyperlink ref="${l.ref}" location="${esc(l.location!)}" display="${esc(l.location!)}"/>`,
        )
        .join('')}</hyperlinks>`
    : ''
  const print = sh.fitWidth || sh.fitPage ? '<printOptions horizontalCentered="1"/>' : ''
  const setup = `<pageSetup paperSize="9" orientation="${sh.landscape ? 'landscape' : 'portrait'}"${fit ? ` fitToWidth="1" fitToHeight="${sh.fitPage ? 1 : 0}"` : ''}/>`
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${pr}${pane}<sheetFormatPr defaultRowHeight="18"/>${cols}<sheetData>${rows}</sheetData>${filter}${merges}${hl}${print}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>${setup}</worksheet>`
  return { xml, links: links.filter(l => l.href).map(l => l.href!) }
}

export function styledXlsx(sheets: StyledSheet[]): Uint8Array {
  const enc = new TextEncoder()
  const x = (s: string) => enc.encode(s)
  const reg = new Registry()
  const built = sheets.map(s => sheetXml(s, reg))
  const idx = sheets.map((_, i) => i + 1)
  const titles = sheets
    .map((s, i) =>
      s.printTitleRows
        ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${esc(sheetRef(s.name, `$${s.printTitleRows[0]}:$${s.printTitleRows[1]}`))}</definedName>`
        : '',
    )
    .join('')
  const files: { name: string; data: Uint8Array }[] = [
    {
      name: '[Content_Types].xml',
      data: x(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${idx.map(i => `<Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`),
    },
    {
      name: '_rels/.rels',
      data: x(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    },
    {
      name: 'xl/workbook.xml',
      data: x(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView activeTab="0"/></bookViews>
<sheets>${sheets.map((s, i) => `<sheet name="${esc(safeSheetName(s.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${titles ? `<definedNames>${titles}</definedNames>` : ''}
</workbook>`),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: x(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${idx.map(i => `<Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i}.xml"/>`).join('\n')}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    },
  ]
  built.forEach((b, i) => {
    files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: x(b.xml) })
    if (b.links.length)
      files.push({
        name: `xl/worksheets/_rels/sheet${i + 1}.xml.rels`,
        data: x(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${b.links.map((h, k) => `<Relationship Id="rId${k + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(h)}" TargetMode="External"/>`).join('\n')}
</Relationships>`),
      })
  })
  // styles.xml 은 모든 시트를 만든 뒤 (레지스트리 확정 후)
  files.push({ name: 'xl/styles.xml', data: x(reg.xml()) })
  return zipStore(files)
}
