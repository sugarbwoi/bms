/* ============================================================
   KUDII — Export utilities
   ------------------------------------------------------------
   Real, dependency-free exports built on native browser APIs:
     • CSV          — spreadsheet-ready, RFC-4180 quoted
     • Excel        — .xls (Excel-readable HTML table) + .csv
     • PDF          — print-to-PDF via a clean, print-styled window
     • Share        — native share sheet on mobile (Web Share API)

   Nothing here invents data. Callers pass the exact rows they
   already display, so an export always matches the screen.
   ============================================================ */

export type Cell = string | number | null | undefined

/** RFC-4180 safe CSV cell: wrap in quotes, escape embedded quotes. */
function csvCell(v: Cell): string {
  const s = v == null ? '' : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCSV(headers: string[], rows: Cell[][]): string {
  const lines = [headers.map(csvCell).join(',')]
  for (const r of rows) lines.push(r.map(csvCell).join(','))
  return lines.join('\r\n')
}

function escapeHtml(s: Cell): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Excel-readable HTML table (.xls). Excel opens this natively. */
export function toExcelHtml(title: string, headers: string[], rows: Cell[][]): string {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8" /><title>${escapeHtml(title)}</title></head>
<body>
<table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`
}

/* ---------------- download helpers ---------------- */

function triggerDownload(filename: string, content: string, mime: string) {
  // Prepend a UTF-8 BOM for CSV/Excel so Excel reads accents correctly.
  const needsBom = mime.includes('csv') || mime.includes('excel')
  const blob = new Blob([needsBom ? '\uFEFF' + content : content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCSV(filename: string, headers: string[], rows: Cell[][]) {
  triggerDownload(filename, toCSV(headers, rows), 'text/csv;charset=utf-8')
}

export function downloadExcel(filename: string, title: string, headers: string[], rows: Cell[][]) {
  triggerDownload(filename, toExcelHtml(title, headers, rows), 'application/vnd.ms-excel;charset=utf-8')
}

/* ---------------- print / PDF ---------------- */

export interface PrintMeta {
  title: string
  subtitle?: string
  business?: string
  currency?: string
  generatedAt?: string
}

/**
 * Open a clean, print-styled document and invoke the print dialog.
 * The user can "Save as PDF" from there — no PDF library required,
 * and the output is fully theme-neutral (black on white).
 */
export function printTable(meta: PrintMeta, headers: string[], rows: Cell[][]) {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')
  const when = meta.generatedAt || new Date().toLocaleString()
  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>${escapeHtml(meta.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #17150f; margin: 32px; }
  header { border-bottom: 2px solid #17150f; padding-bottom: 12px; margin-bottom: 18px; }
  .brand { font-weight: 800; letter-spacing: 0.14em; font-size: 13px; text-transform: uppercase; }
  h1 { font-size: 22px; margin: 6px 0 2px; }
  .sub { color: #6b655c; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #ddd8ce; font-size: 12px; }
  th { background: #f1ede6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; font-size: 11px; }
  tbody tr:nth-child(even) { background: #faf8f4; }
  footer { margin-top: 20px; color: #9a938a; font-size: 11px; }
  @page { margin: 14mm; }
</style></head>
<body>
  <header>
    <div class="brand">KUDII</div>
    <h1>${escapeHtml(meta.title)}</h1>
    <div class="sub">${escapeHtml(meta.business || '')}${meta.subtitle ? ' · ' + escapeHtml(meta.subtitle) : ''}</div>
  </header>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  <footer>Generated ${escapeHtml(when)} · KUDII — know your money.</footer>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body></html>`

  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return false
  w.document.open()
  w.document.write(html)
  w.document.close()
  return true
}

/* ---------------- native share ---------------- */

export function canShareFiles(): boolean {
  return typeof navigator !== 'undefined' && typeof (navigator as any).canShare === 'function'
}

export interface ShareResult {
  ok: boolean
  shared?: boolean
  cancelled?: boolean
  error?: string
}

/**
 * Share a CSV file through the native share sheet when supported
 * (mobile), otherwise fall back to a download. Never throws.
 */
export async function shareCSV(filename: string, title: string, headers: string[], rows: Cell[][]): Promise<ShareResult> {
  const csv = toCSV(headers, rows)
  const nav: any = typeof navigator !== 'undefined' ? navigator : null
  if (nav && typeof nav.share === 'function' && typeof File !== 'undefined') {
    try {
      const file = new File(['\uFEFF' + csv], filename, { type: 'text/csv;charset=utf-8' })
      if (!nav.canShare || nav.canShare({ files: [file] })) {
        await nav.share({ title, text: title, files: [file] })
        return { ok: true, shared: true }
      }
    } catch (e: any) {
      if (e && e.name === 'AbortError') return { ok: true, cancelled: true }
      // fall through to download
    }
  }
  try {
    downloadCSV(filename, headers, rows)
    return { ok: true, shared: false }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Export failed' }
  }
}

/**
 * Share a block of plain text (e.g. a receipt) through the native share
 * sheet when supported, otherwise copy to the clipboard. Never throws.
 */
export async function shareText(title: string, text: string): Promise<ShareResult> {
  const nav: any = typeof navigator !== 'undefined' ? navigator : null
  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ title, text })
      return { ok: true, shared: true }
    } catch (e: any) {
      if (e && e.name === 'AbortError') return { ok: true, cancelled: true }
      // fall through to clipboard
    }
  }
  try {
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text)
      return { ok: true, shared: false }
    }
  } catch {
    /* ignore */
  }
  return { ok: false, error: 'Sharing is not available on this device' }
}
