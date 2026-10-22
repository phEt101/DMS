import { LEFT_ALIGNED_COLUMNS, COLUMN_PERCENT, SIGNATURE_DOTS, dateLine, saleLine } from './model'
import type { ReportModel, ReportPage } from './model'

export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!)

/**
 * สไตล์ของแผ่นรายงาน ใช้ร่วมกันทั้ง preview บนจอและ PDF/Print
 * ใช้หน่วย pt เพื่อให้ขนาดบนจอ = ขนาดบนกระดาษ A4 แนวนอน (1 แผ่นต่อ 1 หน้า)
 */
export const sheetCss = `
.rsheet{box-sizing:border-box;background:#fff;color:#000;font-family:"Sarabun","Noto Sans Thai Looped",Tahoma,Arial,sans-serif;font-size:8.5pt;line-height:1.25;break-inside:avoid}
.rsheet h2{margin:0 0 3pt;text-align:center;font-size:15pt;font-weight:700}
.rsheet .rl{font-size:10.5pt;font-weight:700}
.rsheet table{border-collapse:collapse;table-layout:fixed}
.rsheet table.rt{width:100%;margin-top:5pt}
.rsheet table.rt th,.rsheet table.rt td{height:14pt;padding:1pt 3pt;border:.75pt solid #000;text-align:center;vertical-align:middle;overflow-wrap:anywhere;white-space:pre-line}
.rsheet table.rt th{background:#e9e9e9;font-size:9pt;font-weight:700}
.rsheet table.rt td.l{text-align:left}
.rsheet table.rsig{width:100%;margin-top:8pt}
.rsheet table.rsig td{width:50%;padding:0;border:0;text-align:center;vertical-align:top;font-size:9pt}
.rsheet .sl{display:flex;align-items:flex-end;justify-content:center;height:32pt}
.rsheet .sl img{max-width:130pt;max-height:32pt}
.rsheet .rnotes{margin-top:5pt;font-size:8pt;font-weight:700}
`

export const buildSheetHtml = (model: ReportModel, page: ReportPage, pageIndex: number) => {
  const { copy } = model
  const body = page.rows.map((cells) => cells
    ? `<tr>${cells.map((cell, i) => `<td${LEFT_ALIGNED_COLUMNS.has(i) ? ' class="l"' : ''}>${escapeHtml(cell)}</td>`).join('')}</tr>`
    : `<tr>${model.headers.map(() => '<td>&nbsp;</td>').join('')}</tr>`).join('')
  const sig = (src: string | null) => src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(copy.sheet.signature)}">` : ''
  return `<section class="rsheet">
    <h2>${escapeHtml(copy.title)}</h2>
    <div class="rl">${escapeHtml(saleLine(model))}</div>
    <div class="rl">${escapeHtml(dateLine(model, pageIndex))}</div>
    <table class="rt"><colgroup>${COLUMN_PERCENT.map((w) => `<col style="width:${w}%">`).join('')}</colgroup>
      <thead><tr>${model.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    <table class="rsig"><tr>
      <td><b>${escapeHtml(copy.sheet.preparedBy)}</b><div class="sl">${sig(model.submitterSignature)}</div>${SIGNATURE_DOTS}<br>(${escapeHtml(model.employeeName)})</td>
      <td><b>${escapeHtml(copy.sheet.approvedBy)}</b><div class="sl">${sig(page.approverSignature)}</div>${SIGNATURE_DOTS}<br>( ${escapeHtml(page.approverName ?? '..............................................')} )</td>
    </tr></table>
    <div class="rnotes">${escapeHtml(copy.sheet.notesTitle)}<br>${copy.sheet.notes.map((note: string) => `- ${escapeHtml(note)}`).join('<br>')}</div>
  </section>`
}

export const buildSheetsHtml = (model: ReportModel) =>
  model.pages.map((page, index) => buildSheetHtml(model, page, index)).join('')