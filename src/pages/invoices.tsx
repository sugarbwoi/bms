/* ============================================================
   KUDII — Invoices
   Bill a customer, then track what is owed until it is paid.
   Issuing an invoice is not income — only a recorded payment is.
   ============================================================ */
import { useMemo, useState } from 'react'
import {
  FileText,
  Plus,
  ArrowLeft,
  MoreVertical,
  Pencil,
  CircleDollarSign,
  Send,
  Ban,
  Printer,
  Search as SearchIcon,
  User,
  CalendarClock,
} from 'lucide-react'
import { useDB, useConfirm, useToast } from '../lib/hooks'
import { store } from '../lib/store'
import { navigate } from '../lib/router'
import { useComposer } from '../components/composer-context'
import { PageHead } from '../components/shell'
import {
  Button,
  IconButton,
  SearchInput,
  Segmented,
  Badge,
  StatusBadge,
  EmptyState,
  SectionCard,
  Menu,
  MenuItem,
  KV,
} from '../components/ui'
import { ReceiptView, ReceiptRow } from '../components/receipt'
import {
  scope,
  invoiceItems,
  invoiceSubtotal,
  invoiceTotal,
  invoicePaid,
  invoiceBalance,
  invoiceEffectiveStatus,
} from '../lib/derive'
import { formatMoney, formatDate, isOverdue, timeAgo } from '../lib/utils'
import type { Invoice, InvoiceStatus, Receipt } from '../lib/types'

export default function Invoices({ id }: { id?: string }) {
  if (id) return <InvoiceDetail id={id} />
  return <InvoiceList />
}

type Tab = 'all' | InvoiceStatus

const STATUS_TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'partially_paid', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
]

/* ============================================================
   LIST
   ============================================================ */
function InvoiceList() {
  const db = useDB()
  const biz = store.activeBusiness()
  const composer = useComposer()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('all')

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'
  const all = scope.invoices(db, businessId)

  const rows = useMemo(() => {
    let list = all.map((inv) => ({ inv, status: invoiceEffectiveStatus(db, inv) }))
    if (tab !== 'all') list = list.filter((r) => r.status === tab)
    list = [...list].sort((a, b) => new Date(b.inv.created_at).getTime() - new Date(a.inv.created_at).getTime())
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) => {
      const cust = db.customers.find((c) => c.id === r.inv.customer_id)
      return r.inv.invoice_number.toLowerCase().includes(q) || (cust?.name.toLowerCase().includes(q) ?? false)
    })
  }, [db, businessId, all, tab, query])

  const outstandingTotal = all
    .filter((i) => i.status !== 'cancelled' && i.status !== 'draft')
    .reduce((a, i) => a + invoiceBalance(db, i), 0)
  const paidCount = all.filter((i) => invoiceEffectiveStatus(db, i) === 'paid').length
  const draftCount = all.filter((i) => i.status === 'draft').length
  const overdueCount = all.filter((i) => invoiceEffectiveStatus(db, i) === 'overdue').length

  return (
    <div className="stack gap-6">
      <PageHead
        title="Invoices"
        sub="Bill customers and track exactly what's still owed."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => composer.open('invoice')}>
            New invoice
          </Button>
        }
      />

      <div className="pulse-grid">
        <div className="pulse-card">
          <span className="ic due">
            <CircleDollarSign size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{formatMoney(outstandingTotal, currency)}</div>
          <div className="l">Outstanding</div>
        </div>
        <div className="pulse-card">
          <span className="ic in">
            <FileText size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{paidCount}</div>
          <div className="l">Paid</div>
        </div>
        <div className="pulse-card">
          <span className="ic jobs">
            <Pencil size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{draftCount}</div>
          <div className="l">Drafts</div>
        </div>
        <div className="pulse-card">
          <span className="ic out">
            <CalendarClock size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{overdueCount}</div>
          <div className="l">Overdue</div>
        </div>
      </div>

      <div className="row gap-3 wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search invoices or customers…" className="grow" />
        <Segmented value={tab} onChange={setTab} options={STATUS_TABS} />
      </div>

      {rows.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={query ? SearchIcon : FileText}
            title={query ? 'No matches' : 'No invoices yet'}
            message={query ? 'Try a different search term.' : 'Create an invoice to bill a customer and track payment.'}
            action={
              !query ? (
                <Button variant="primary" icon={Plus} onClick={() => composer.open('invoice')}>
                  Create an invoice
                </Button>
              ) : undefined
            }
          />
        </SectionCard>
      ) : (
        <SectionCard padded={false}>
          <div className="list">
            {rows.map(({ inv, status }) => {
              const cust = db.customers.find((c) => c.id === inv.customer_id)
              const balance = invoiceBalance(db, inv)
              const overdueInv = status === 'overdue'
              return (
                <button key={inv.id} className="list-row" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <span className="tl-ic" style={{ width: 40, height: 40, borderRadius: 12 }}>
                    <FileText size={18} strokeWidth={2} />
                  </span>
                  <span className="list-main">
                    <span className="list-title mono">{inv.invoice_number}</span>
                    <span className="list-sub">
                      {cust ? cust.name : 'No customer'}
                      {inv.due_date ? ` · due ${formatDate(inv.due_date)}` : ''}
                      {overdueInv ? ' · overdue' : ''}
                    </span>
                  </span>
                  <span className="list-end">
                    <span className="num" style={{ fontWeight: 600 }}>
                      {formatMoney(balance > 0 ? balance : invoiceTotal(db, inv), currency)}
                    </span>
                    <StatusBadge status={status} />
                  </span>
                </button>
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

/* ============================================================
   DETAIL
   ============================================================ */
function InvoiceDetail({ id }: { id: string }) {
  const db = useDB()
  const biz = store.activeBusiness()
  const composer = useComposer()
  const confirm = useConfirm()
  const toast = useToast()
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'
  const inv = db.invoices.find((i) => i.id === id && i.business_id === businessId)

  if (!inv) {
    return (
      <div className="stack gap-6">
        <PageHead title="Invoice not found" sub="This invoice may have been removed." />
        <SectionCard>
          <EmptyState
            icon={FileText}
            title="We couldn't find that invoice"
            message="It may have been deleted or belongs to another business."
            action={
              <Button variant="primary" onClick={() => navigate('/invoices')}>
                Back to invoices
              </Button>
            }
          />
        </SectionCard>
      </div>
    )
  }

  const items = invoiceItems(db, inv.id)
  const subtotal = invoiceSubtotal(db, inv.id)
  const total = invoiceTotal(db, inv)
  const paid = invoicePaid(db, inv.id)
  const balance = invoiceBalance(db, inv)
  const status = invoiceEffectiveStatus(db, inv)
  const cust = db.customers.find((c) => c.id === inv.customer_id)
  const receipts = scope.receipts(db, businessId).filter((r) => r.invoice_id === inv.id)

  const issue = () => {
    store.issueInvoice(inv.id)
    toast.push('Invoice issued', 'success')
  }
  const cancel = async () => {
    const res = await confirm({
      title: 'Cancel this invoice?',
      message: 'The invoice is marked cancelled but kept for your history.',
      confirmLabel: 'Cancel invoice',
      danger: true,
    })
    if (!res.confirmed) return
    store.cancelInvoice(inv.id)
    toast.push('Invoice cancelled')
  }

  return (
    <div className="stack gap-6">
      <button className="link" onClick={() => navigate('/invoices')} style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={15} /> All invoices
      </button>

      <div className="detail-hero">
        <span className="tl-ic" style={{ width: 64, height: 64, borderRadius: 18 }}>
          <FileText size={28} strokeWidth={1.8} />
        </span>
        <div className="grow" style={{ minWidth: 220 }}>
          <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'var(--fs-28)', letterSpacing: '-0.02em' }} className="mono">
              {inv.invoice_number}
            </h1>
            <StatusBadge status={status} />
            {status === 'overdue' && <Badge tone="danger" dot>Overdue</Badge>}
          </div>
          <div className="row gap-4 wrap mt-2" style={{ color: 'var(--text-2)', fontSize: 'var(--fs-13)' }}>
            {cust && (
              <button className="link" onClick={() => navigate(`/customers/${cust.id}`)}>
                <User size={14} /> {cust.name}
              </button>
            )}
            <span>Issued {formatDate(inv.issue_date)}</span>
            {inv.due_date && (
              <span className="row gap-1" style={{ alignItems: 'center' }}>
                <CalendarClock size={14} /> Due {formatDate(inv.due_date)}
              </span>
            )}
            <span className="num">{formatMoney(total, currency)}</span>
          </div>
        </div>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          {inv.status === 'draft' && (
            <Button variant="primary" icon={Send} onClick={issue}>
              Issue invoice
            </Button>
          )}
          {inv.status !== 'cancelled' && inv.status !== 'draft' && balance > 0 && (
            <Button
              variant="primary"
              icon={CircleDollarSign}
              onClick={() => composer.open('payment', { invoice_id: inv.id, customer_id: inv.customer_id || undefined })}
            >
              Record payment
            </Button>
          )}
          <Menu align="right" trigger={({ toggle }) => <IconButton icon={MoreVertical} label="More" variant="ghost" onClick={toggle} />}>
            {(close) => (
              <>
                <MenuItem icon={Pencil} onClick={() => { composer.open('invoice', { id: inv.id }); close() }}>
                  Edit invoice
                </MenuItem>
                <MenuItem icon={Printer} onClick={() => { window.print(); close() }}>
                  Print
                </MenuItem>
                <div className="menu-sep" />
                {inv.status !== 'cancelled' && (
                  <MenuItem icon={Ban} danger onClick={() => { cancel(); close() }}>
                    Cancel invoice
                  </MenuItem>
                )}
              </>
            )}
          </Menu>
        </div>
      </div>

      <div className="grid-main">
        <div className="stack gap-5">
          <SectionCard title="Line items" padded={false}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.description}</td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {it.quantity}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {formatMoney(it.unit_price, currency)}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {formatMoney(it.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="totals" style={{ padding: 'var(--s-5) var(--s-6)' }}>
              <div className="tr">
                <span>Subtotal</span>
                <span className="v">{formatMoney(subtotal, currency)}</span>
              </div>
              <div className="tr">
                <span>Discount</span>
                <span className="v">− {formatMoney(inv.discount, currency)}</span>
              </div>
              <div className="tr grand">
                <span>Total</span>
                <span className="v">{formatMoney(total, currency)}</span>
              </div>
            </div>
          </SectionCard>

          {inv.notes && (
            <SectionCard title="Notes">
              <p className="text-sm muted" style={{ whiteSpace: 'pre-wrap' }}>
                {inv.notes}
              </p>
            </SectionCard>
          )}

          <SectionCard title="Receipts" padded={receipts.length === 0}>
            {receipts.length === 0 ? (
              <p className="text-sm muted">No payments recorded against this invoice yet.</p>
            ) : (
              <div className="list">
                {receipts.map((r) => (
                  <ReceiptRow key={r.id} receipt={r} onOpen={setReceipt} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="stack gap-5">
          <SectionCard title="Payment">
            <div className="row-between" style={{ alignItems: 'flex-end' }}>
              <div>
                <div className="stat-value lg num" style={{ color: balance > 0 ? 'var(--warning)' : 'var(--success)' }}>
                  {formatMoney(balance, currency)}
                </div>
                <div className="text-xs muted">{balance > 0 ? 'still owed' : 'fully settled'}</div>
              </div>
              <StatusBadge status={status} />
            </div>
            <div className="divider" style={{ margin: 'var(--s-5) 0' }} />
            <dl className="kv">
              <KV label="Invoice total">{formatMoney(total, currency)}</KV>
              <KV label="Paid">{formatMoney(paid, currency)}</KV>
              <KV label="Balance">{formatMoney(balance, currency)}</KV>
            </dl>
            {inv.status !== 'cancelled' && inv.status !== 'draft' && balance > 0 && (
              <Button
                variant="soft"
                block
                className="mt-4"
                icon={CircleDollarSign}
                onClick={() => composer.open('payment', { invoice_id: inv.id, customer_id: inv.customer_id || undefined })}
              >
                Record a payment
              </Button>
            )}
          </SectionCard>

          <SectionCard title="Details">
            <dl className="kv">
              <KV label="Customer">{cust ? cust.name : 'No customer'}</KV>
              <KV label="Status">
                <StatusBadge status={status} />
              </KV>
              <KV label="Issue date">{formatDate(inv.issue_date)}</KV>
              <KV label="Due date">{inv.due_date ? formatDate(inv.due_date) : 'No due date'}</KV>
              <KV label="Created">{timeAgo(inv.created_at)}</KV>
            </dl>
          </SectionCard>
        </div>
      </div>

      <ReceiptView receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  )
}
