import type { ReportModel } from './model'
import { createSignatureLoader, downloadBlob } from './assets'
import { buildSheetsHtml, sheetCss } from './sheet-html'

const FONT_LINK_ID = 'report-pdf-font'

/** โหลดฟอนต์ Sarabun (ถ้าโหลดไม่ได้จะใช้ Tahoma/ฟอนต์ระบบแทน) */
const ensureFonts = async () => {
  if (!document.getElementById(FONT_LINK_ID)) {
    const link = document.createElement('link')
    link.id = FONT_LINK_ID
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap'
    document.head.appendChild(link)
    await new Promise<void>((resolve) => {
      link.onload = () => resolve()
      link.onerror = () => resolve()
      window.setTimeout(resolve, 4000)
    })
  }
  try {
    await Promise.all([
      document.fonts.load('400 12px Sarabun', 'กA'),
      document.fonts.load('700 12px Sarabun', 'กA'),
    ])
    await document.fonts.ready
  } catch { /* ใช้ฟอนต์สำรอง */ }
}

/** สร้างไฟล์ PDF แล้วดาวน์โหลดทันที (A4 แนวนอน 1 แผ่นรายงานต่อ 1 หน้า) */
export async function exportPdf(model: ReportModel) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  await ensureFonts()

  // แปลงลายเซ็นเป็น data URI ก่อน กัน canvas ติดปัญหา cross-origin
  const loadSignature = createSignatureLoader()
  const submitter = await loadSignature(model.submitterSignature)
  const approvers = await Promise.all(model.pages.map((page) => loadSignature(page.approverSignature)))
  const printable: ReportModel = {
    ...model,
    submitterSignature: submitter?.dataUri ?? null,
    pages: model.pages.map((page, i) => ({ ...page, approverSignature: approvers[i]?.dataUri ?? null })),
  }

  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:281mm;background:#fff;pointer-events:none'
  host.innerHTML = `<style>${sheetCss}</style>${buildSheetsHtml(printable)}`
  document.body.appendChild(host)

  try {
    await Promise.all(Array.from(host.querySelectorAll('img')).map((img) => img.decode().catch(() => undefined)))

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
    const pageW = 297
    const pageH = 210
    const margin = 8
    const maxW = pageW - margin * 2
    const maxH = pageH - margin * 2

    const sheets = Array.from(host.querySelectorAll<HTMLElement>('.rsheet'))
    for (let i = 0; i < sheets.length; i += 1) {
      const canvas = await html2canvas(sheets[i], { scale: 3, backgroundColor: '#ffffff', useCORS: true, logging: false })
      const ratio = canvas.width / canvas.height
      let width = maxW
      let height = width / ratio
      if (height > maxH) {
        height = maxH
        width = height * ratio
      }
      if (i > 0) pdf.addPage('a4', 'landscape')
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', (pageW - width) / 2, margin, width, height, undefined, 'FAST')
    }

    pdf.setProperties({ title: model.fileBase, author: model.employeeName })
    downloadBlob(pdf.output('blob'), `${model.fileBase}.pdf`)
  } finally {
    host.remove()
  }
}