/* ============================================================
   KUDII — ReceiptView
   A calm, printable receipt generated from an actual payment.
   Receipts are never invented — they always come from a real
   payment event and show the exact amount that changed hands.
   ============================================================ */
import { useRef } from 'react'
import { Printer, Download, Check } from 'lucide-react'
import { Modal, Button, Badge } from './ui'
import { useDB } from '../lib/hooks'
import { store } from '../lib/store'
import { formatMoney, formatDateTime } from '../lib/utils'
import { BrandMark } from './shell'
import type { Receipt } from '../lib/types'

export function ReceiptView({ receipt, onClose }: { receipt: Receipt | null; onClose: () => void }) {
  const db = useDB()
  const printRef = useRef<HTMLDivElement>(null)
  if (!receipt) return null

  const biz = store.activeBusiness()
  const customer = receipt.customer_id ? db.customers.find((c) => c.id === receipt.customer_id) : null
  const sale = receipt.sale_id ? db.sales.find((s) => s.id === receipt.sale_id) : null
  const invoice = receipt.invoice_id ? db.invoices.find((i) => i.id === receipt.invoice_id) : null
  const job = receipt.job_id ? db.jobs.find((j) => j.id === receipt.job_id) : null
  const currency = biz?.currency || 'NGN'

  const ref = sale?.sale_number || invoice?.invoice_number || job?.title || '—'

  const handlePrint = () => {
    const node = printRef.current
    if (!node) return
    const w = window.open('', '_blank', 'width=420,height=680')
    if (!w) return
    w.document.write(`<!doctype html><html><head><title>${receipt.receipt_number}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        * { box-sizing: border-box; }
        body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #171716; padding: 28px; margin: 0; }
        .rcp { max-width: 340px; margin: 0 auto; }
        .brand { font-weight: 700; letter-spacing: -0.02em; font-size: 20px; }
        .muted { color: #6F6B64; font-size: 12px; }
        .row { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px dashed #E4DFD6; font-size: 13px; }
        .row.total { border-bottom: none; border-top: 2px solid #171716; margin-top: 6px; padding-top: 12px; font-size: 16px; font-weight: 700; }
        .k { color: #6F6B64; }
        .v { font-weight: 600; text-align: right; }
        h1 { font-size: 15px; margin: 0 0 2px; }
        .head { text-align: center; padding-bottom: 14px; border-bottom: 1px solid #E4DFD6; margin-bottom: 12px; }
        .badge { display: inline-block; font-size: 11px; padding: 3px 9px; border-radius: 999px; background: #EAF2E6; color: #3C7A2E; font-weight: 600; }
        .foot { text-align: center; margin-top: 18px; color: #6F6B64; font-size: 11px; }
      </style></head><body><div class="rcp">${node.innerHTML}</div>
      <script>window.onload = function(){ window.print(); }</script>
      </body></html>`)
    w.document.close()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Receipt"
      subtitle={receipt.receipt_number}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" icon={Printer} onClick={handlePrint}>
            Print / Save PDF
          </Button>
        </>
      }
    >
      <div className="receipt" ref={printRef}>
        <div className="receipt-head" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <BrandMark />
            <span style={{ fontWeight: 700, letterSpacing: '-0.02em', fontSize: 'var(--fs-18)' }}>{biz?.name || 'KUDII'}</span>
          </div>
          {biz?.description && <div className="muted text-xs mt-1">{biz.description}</div>}
          <div className="muted text-xs mt-1">{biz?.country || 'Nigeria'}</div>
          <div className="mt-3">
            <Badge tone="success" dot>
              Paid
            </Badge>
          </div>
        </div>

        <div className="receipt-row">
          <span className="k">Receipt no.</span>
          <span className="v mono">{receipt.receipt_number}</span>
        </div>
        <div className="receipt-row">
          <span className="k">Date</span>
          <span className="v">{formatDateTime(receipt.issued_at)}</span>
        </div>
        {customer && (
          <div className="receipt-row">
            <span className="k">Customer</span>
            <span className="v">{customer.name}</span>
          </div>
        )}
        <div className="receipt-row">
          <span className="k">For</span>
          <span className="v">{ref}</span>
        </div>
        <div className="receipt-row">
          <span className="k">Method</span>
          <span className="v" style={{ textTransform: 'capitalize' }}>
            {receipt.payment_method}
          </span>
        </div>

        <div className="receipt-row total">
          <span className="k">Amount paid</span>
          <span className="v num">{formatMoney(receipt.amount, currency)}</span>
        </div>

        <div className="foot muted text-xs mt-5" style={{ textAlign: 'center' }}>
          Thank you for your business.
          <br />
          This receipt was generated by KUDII and reflects a recorded payment.
        </div>
      </div>

      <div className="row gap-2 mt-4" style={{ justifyContent: 'center' }}>
        <span className="muted text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Check size={13} /> Generated from a real payment event — never edited by hand.
        </span>
      </div>
    </Modal>
  )
}

/* A compact receipt list row used inside sale / invoice / job detail pages. */
export function ReceiptRow({ receipt, onOpen }: { receipt: Receipt; onOpen: (r: Receipt) => void }) {
  const biz = store.activeBusiness()
  const currency = biz?.currency || 'NGN'
  return (
    <button className="list-row" onClick={() => onOpen(receipt)}>
      <span className="list-main">
        <span className="list-title mono">{receipt.receipt_number}</span>
        <span className="list-sub">
          {formatDateTime(receipt.issued_at)} · {receipt.payment_method}
        </span>
      </span>
      <span className="list-end num" style={{ fontWeight: 600 }}>
        {formatMoney(receipt.amount, currency)}
      </span>
    </button>
  )
}

export { Download }
