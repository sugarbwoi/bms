/* ============================================================
   KUDII — Bulk product import
   Paste or upload a CSV/TSV list, review every row, then add.
   Nothing is written until you confirm, and every row is
   validated with the same rules as the single-product form.
   ============================================================ */
import { useMemo, useRef, useState } from 'react'
import { Upload, ClipboardPaste, Check, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { Modal, Field, Textarea, Button, Badge, ErrorBanner } from './ui'
import { store } from '../lib/store'
import { useToast } from '../lib/hooks'
import { parseAmount } from '../lib/utils'

interface ParsedRow {
  name: string
  selling: string
  cost: string
  low: string
  opening: string
  errors: string[]
}

const HEADER_KEYS: Record<string, keyof Omit<ParsedRow, 'errors'>> = {
  name: 'name',
  product: 'name',
  'product name': 'name',
  item: 'name',
  description: 'name',
  selling: 'selling',
  price: 'selling',
  'selling price': 'selling',
  'sell price': 'selling',
  'unit price': 'selling',
  cost: 'cost',
  'cost price': 'cost',
  low: 'low',
  'low stock': 'low',
  'low-stock': 'low',
  'low stock threshold': 'low',
  threshold: 'low',
  reorder: 'low',
  'reorder level': 'low',
  min: 'low',
  'min stock': 'low',
  opening: 'opening',
  'opening stock': 'opening',
  'opening quantity': 'opening',
  stock: 'opening',
  quantity: 'opening',
  qty: 'opening',
  'in stock': 'opening',
}

/** Normalise a header cell so "Selling_Price", "selling-price" and
 *  "selling price" all resolve to the same key. */
function normaliseHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

/** Split a delimited block into trimmed cells, honouring quotes. */
function parseDelimited(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim().length > 0)
  if (!lines.length) return []
  const first = lines[0]
  const delim = (first.match(/\t/g)?.length || 0) > (first.match(/,/g)?.length || 0) ? '\t' : ','
  return lines.map((line) => {
    const out: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"'
            i++
          } else inQ = false
        } else cur += ch
      } else if (ch === '"') {
        inQ = true
      } else if (ch === delim) {
        out.push(cur)
        cur = ''
      } else cur += ch
    }
    out.push(cur)
    return out.map((c) => c.trim())
  })
}

function looksLikeHeader(cells: string[]): boolean {
  const joined = cells.map((c) => c.toLowerCase()).join(' ')
  return /name|product|item|price|cost|stock|qty|quantity/.test(joined) && !/\d/.test(cells[0] || '')
}

function toRows(cells: string[][]): ParsedRow[] {
  if (!cells.length) return []
  let idx: Partial<Record<keyof Omit<ParsedRow, 'errors'>, number>> = { name: 0, selling: 1, cost: 2, low: 3, opening: 4 }
  let data = cells
  if (looksLikeHeader(cells[0])) {
    const map: Partial<Record<keyof Omit<ParsedRow, 'errors'>, number>> = {}
    cells[0].forEach((h, i) => {
      const key = HEADER_KEYS[normaliseHeader(h)]
      if (key && map[key] == null) map[key] = i
    })
    idx = map
    data = cells.slice(1)
  }
  const get = (row: string[], k: keyof Omit<ParsedRow, 'errors'>) => {
    const i = idx[k]
    return i == null ? '' : row[i] ?? ''
  }
  return data.map((row) => {
    const name = get(row, 'name').trim()
    const selling = get(row, 'selling').trim()
    const cost = get(row, 'cost').trim()
    const low = get(row, 'low').trim()
    const opening = get(row, 'opening').trim()
    const errors: string[] = []
    if (name.length < 2) errors.push('Name required')
    if (!selling || parseAmount(selling, 'NGN') <= 0) errors.push('Selling price required')
    if (cost && parseAmount(cost, 'NGN') < 0) errors.push('Cost cannot be negative')
    if (low && Number.isNaN(Number(low))) errors.push('Low-stock must be a number')
    if (opening && Number.isNaN(Number(opening))) errors.push('Opening stock must be a number')
    return { name, selling, cost, low, opening, errors }
  })
}

const EXAMPLE = `name,selling_price,cost_price,low_stock_threshold,opening_stock
Ankara Fabric (6 yards),12000,7500,5,20
Lace Trim (metre),1500,900,10,60
Tailoring Service - Gown,25000,0,0,0`

export function BulkProductImport({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: (added: number) => void }) {
  const toast = useToast()
  const biz = store.activeBusiness()!
  const currency = biz.currency
  const fileRef = useRef<HTMLInputElement>(null)

  const [text, setText] = useState('')
  const [mode, setMode] = useState<'input' | 'review' | 'done'>('input')
  const [result, setResult] = useState<{ added: number; failures: string[] } | null>(null)

  const rows = useMemo(() => toRows(parseDelimited(text)), [text])
  const valid = rows.filter((r) => r.errors.length === 0)
  const invalid = rows.length - valid.length

  const reset = () => {
    setText('')
    setMode('input')
    setResult(null)
  }

  const close = () => {
    reset()
    onClose()
  }

  const onFile = (file: File | null) => {
    if (!file) return
    if (/\.xlsx?$/i.test(file.name)) {
      toast.push('Please save Excel files as CSV first', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setText(String(reader.result || ''))
      setMode('review')
    }
    reader.readAsText(file)
  }

  const commit = () => {
    let added = 0
    const failures: string[] = []
    for (const r of valid) {
      const res = store.createProduct({
        name: r.name,
        selling_price: parseAmount(r.selling, currency) || 0,
        cost_price: parseAmount(r.cost, currency) || 0,
        low_stock_threshold: r.low ? Number(r.low) : 5,
        stock_quantity: r.opening ? Number(r.opening) : 0,
      })
      if (res.ok) added++
      else failures.push(`${r.name}: ${res.error}`)
    }
    setResult({ added, failures })
    setMode('done')
    if (added > 0) toast.push(`${added} product${added === 1 ? '' : 's'} added`, 'success')
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Bulk add products"
      subtitle="Paste a list or upload a CSV. You review everything before it is saved."
      footer={
        mode === 'input' ? (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" disabled={rows.length === 0} onClick={() => setMode('review')}>
              Review {rows.length ? `${rows.length} row${rows.length === 1 ? '' : 's'}` : ''}
            </Button>
          </>
        ) : mode === 'review' ? (
          <>
            <Button variant="ghost" onClick={() => setMode('input')}>
              Back
            </Button>
            <Button variant="primary" disabled={valid.length === 0} onClick={commit}>
              Add {valid.length} product{valid.length === 1 ? '' : 's'}
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        )
      }
    >
      {mode === 'input' && (
        <div className="stack gap-4">
          <Field
            label="Paste your list"
            hint="Columns: name, selling_price, cost_price, low_stock_threshold, opening_stock. Comma or tab separated. A header row is optional."
          >
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={EXAMPLE}
              autoFocus
            />
          </Field>
          <div className="row gap-2 wrap">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,text/csv"
              style={{ display: 'none' }}
              onChange={(e) => onFile(e.target.files?.[0] || null)}
            />
            <Button variant="soft" icon={Upload} onClick={() => fileRef.current?.click()}>
              Upload CSV
            </Button>
            <Button variant="ghost" icon={ClipboardPaste} onClick={() => setText(EXAMPLE)}>
              Use example
            </Button>
          </div>
          <p className="text-xs muted">
            Excel files: choose “Save as CSV” first. Your data is only added after you confirm on the next step.
          </p>
        </div>
      )}

      {mode === 'review' && (
        <div className="stack gap-4">
          <div className="row gap-2 wrap">
            <Badge tone="success" dot>
              {valid.length} ready
            </Badge>
            {invalid > 0 && (
              <Badge tone="warning" dot>
                {invalid} need attention
              </Badge>
            )}
          </div>
          {invalid > 0 && (
            <p className="text-sm muted">
              Rows with issues are skipped. Fix them in your list and paste again, or continue with the {valid.length} valid
              row{valid.length === 1 ? '' : 's'}.
            </p>
          )}
          <div className="table-wrap" style={{ maxHeight: 320, overflow: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="right">Selling</th>
                  <th className="right">Cost</th>
                  <th className="right">Low</th>
                  <th className="right">Opening</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td data-label="Name">{r.name || <span className="muted">—</span>}</td>
                    <td className="right num" data-label="Selling">{r.selling || '—'}</td>
                    <td className="right num" data-label="Cost">{r.cost || '—'}</td>
                    <td className="right num" data-label="Low">{r.low || '—'}</td>
                    <td className="right num" data-label="Opening">{r.opening || '—'}</td>
                    <td data-label="Status">
                      {r.errors.length === 0 ? (
                        <span className="row gap-1" style={{ color: 'var(--success)', alignItems: 'center' }}>
                          <Check size={14} /> Ready
                        </span>
                      ) : (
                        <span className="row gap-1" style={{ color: 'var(--warning)', alignItems: 'center' }}>
                          <AlertTriangle size={14} /> {r.errors[0]}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'done' && result && (
        <div className="stack gap-4">
          <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
            <span className="tl-ic" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--success-soft)', color: 'var(--success)' }}>
              <Check size={18} />
            </span>
            <div>
              <div style={{ fontWeight: 600 }}>
                {result.added} product{result.added === 1 ? '' : 's'} added
              </div>
              <p className="text-sm muted mt-1">
                They are in your catalogue now, with opening stock recorded as a stock movement.
              </p>
            </div>
          </div>
          {result.failures.length > 0 && (
            <ErrorBanner>
              <div className="stack gap-1">
                <span>{result.failures.length} row{result.failures.length === 1 ? '' : 's'} could not be added:</span>
                {result.failures.slice(0, 6).map((f, i) => (
                  <span key={i} className="text-xs">
                    {f}
                  </span>
                ))}
              </div>
            </ErrorBanner>
          )}
          <div className="row gap-2">
            <Button variant="soft" icon={FileSpreadsheet} onClick={reset}>
              Add another batch
            </Button>
            {onDone && result.added > 0 && (
              <Button variant="ghost" onClick={() => { onDone(result.added); close() }}>
                View products
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
