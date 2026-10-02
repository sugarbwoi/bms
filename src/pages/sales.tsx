/* ============================================================
   KUDII — Sales
   A sale records what was sold. It is NOT money received.
   Money only moves when a payment is recorded. Sales can be
   unpaid, partially paid, paid, or overpaid — all derived.
   ============================================================ */
import { useMemo, useState } from 'react'
import {
  ShoppingBag,
  Plus,
  ArrowLeft,
  MoreVertical,
  Ban,
  CircleDollarSign,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  Printer,
  User,
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
  saleItems,
  saleSubtotal,
  saleTotal,
  salePaid,
  saleBalance,
  salePaymentState,
} from '../lib/derive'
import { formatMoney, formatDate, formatDateTime } from '../lib/utils'
import type { Receipt, Sale } from '../lib/types'

export default function Sales({ id }: { id?: string }) {
  if (id) return <SaleDetail id={id} />
  return <SaleList />
}

/* ============================================================
   LIST
   ============================================================ */
function SaleList() {
  const db = useDB()
  const biz = store.activeBusiness()
  const composer = useComposer()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'all' | 'open' | 'unpaid' | 'cancelled'>('all')

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'

  const sales = useMemo(() => {
    let list = scope.sales(db, businessId)
    if (tab === 'open') list = list.filter((s) => s.status === 'open')
    if (tab === 'cancelled') list = list.filter((s) => s.status === 'cancelled')
    if (tab === 'unpaid') list = list.filter((s) => s.status !== 'cancelled' && saleBalance(db, s) > 0)
    list = [...list].sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((s) => {
      const cust = db.customers.find((c) => c.id === s.customer_id)
      return s.sale_number.toLowerCase().includes(q) || (cust?.name.toLowerCase().includes(q) ?? false)
    })
  }, [db, businessId, query, tab])

  const all = scope.sales(db, businessId)
  const totalValue = all.filter((s) => s.status !== 'cancelled').reduce((a, s) => a + saleTotal(db, s), 0)
  const unpaidCount = all.filter((s) => s.status !== 'cancelled' && saleBalance(db, s) > 0).length

  return (
    <div className="stack gap-6">
      <PageHead
        title="Sales"
        sub="What you've sold, and what's still owed."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => composer.open('sale')}>
            New sale
          </Button>
        }
      />

      <div className="pulse-grid">
        <div className="pulse-card">
          <span className="ic jobs">
            <ShoppingBag size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{all.filter((s) => s.status !== 'cancelled').length}</div>
          <div className="l">Sales recorded</div>
        </div>
        <div className="pulse-card">
          <span className="ic in">
            <CircleDollarSign size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{formatMoney(totalValue, currency, { compact: true })}</div>
          <div className="l">Total value</div>
        </div>
        <div className="pulse-card">
          <span className="ic due">
            <ReceiptIcon size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{unpaidCount}</div>
          <div className="l">With a balance</div>
        </div>
        <div className="pulse-card">
          <span className="ic out">
            <Ban size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{all.filter((s) => s.status === 'cancelled').length}</div>
          <div className="l">Cancelled</div>
        </div>
      </div>

      <div className="row gap-3 wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by number or customer…" className="grow" />
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'unpaid', label: `Unpaid (${unpaidCount})` },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </div>

      {sales.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={query ? SearchIcon : ShoppingBag}
            title={query ? 'No matches' : 'No sales yet'}
            message={query ? 'Try a different search term.' : 'Record your first sale to start tracking revenue.'}
            action={
              !query ? (
                <Button variant="primary" icon={Plus} onClick={() => composer.open('sale')}>
                  Record a sale
                </Button>
              ) : undefined
            }
          />
        </SectionCard>
      ) : (
        <SectionCard padded={false}>
          <div className="list">
            {sales.map((s) => {
              const cust = db.customers.find((c) => c.id === s.customer_id)
              const state = s.status === 'cancelled' ? 'cancelled' : salePaymentState(db, s)
              return (
                <button key={s.id} className="list-row" onClick={() => navigate(`/sales/${s.id}`)}>
                  <span className="tl-ic" style={{ width: 40, height: 40, borderRadius: 12 }}>
                    <ShoppingBag size={18} strokeWidth={2} />
                  </span>
                  <span className="list-main">
                    <span className="list-title mono">{s.sale_number}</span>
                    <span className="list-sub">
                      {cust ? cust.name : 'Walk-in'} · {formatDate(s.sale_date)}
                    </span>
                  </span>
                  <span className="list-end">
                    <span className="num" style={{ fontWeight: 600 }}>
                      {formatMoney(saleTotal(db, s), currency)}
                    </span>
                    <StatusBadge status={state} />
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
function SaleDetail({ id }: { id: string }) {
  const db = useDB()
  const biz = store.activeBusiness()
  const composer = useComposer()
  const confirm = useConfirm()
  const toast = useToast()
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'

  const sale = db.sales.find((s) => s.id === id && s.business_id === businessId)

  if (!sale) {
    return (
      <div className="stack gap-6">
        <PageHead title="Sale not found" sub="This sale may have been removed." />
        <SectionCard>
          <EmptyState
            icon={ShoppingBag}
            title="We couldn't find that sale"
            message="It may have been deleted or belongs to another business."
            action={
              <Button variant="primary" onClick={() => navigate('/sales')}>
                Back to sales
              </Button>
            }
          />
        </SectionCard>
      </div>
    )
  }

  const items = saleItems(db, sale.id)
  const subtotal = saleSubtotal(db, sale.id)
  const total = saleTotal(db, sale)
  const paid = salePaid(db, sale.id)
  const balance = saleBalance(db, sale)
  const state = salePaymentState(db, sale)
  const cust = db.customers.find((c) => c.id === sale.customer_id)
  const receipts = scope.receipts(db, businessId).filter((r) => r.sale_id === sale.id)

  const cancel = async () => {
    const res = await confirm({
      title: 'Cancel this sale?',
      message: 'Stock will be returned and the sale marked cancelled. This cannot be undone, but the record is kept.',
      confirmLabel: 'Cancel sale',
      danger: true,
      requireReason: true,
    })
    if (!res.confirmed) return
    const r = store.cancelSale(sale.id, res.reason || '')
    if (!r.ok) return toast.push(r.error || 'Could not cancel sale', 'error')
    toast.push('Sale cancelled')
  }

  return (
    <div className="stack gap-6">
      <button className="link" onClick={() => navigate('/sales')} style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={15} /> All sales
      </button>

      <div className="detail-hero">
        <span className="tl-ic" style={{ width: 64, height: 64, borderRadius: 18 }}>
          <ShoppingBag size={28} strokeWidth={1.8} />
        </span>
        <div className="grow" style={{ minWidth: 220 }}>
          <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'var(--fs-28)', letterSpacing: '-0.02em' }} className="mono">
              {sale.sale_number}
            </h1>
            <StatusBadge status={sale.status === 'cancelled' ? 'cancelled' : state} />
          </div>
          <div className="row gap-4 wrap mt-2" style={{ color: 'var(--text-2)', fontSize: 'var(--fs-13)' }}>
            <span>{formatDate(sale.sale_date)}</span>
            {cust && (
              <button className="link" onClick={() => navigate(`/customers/${cust.id}`)}>
                <User size={14} /> {cust.name}
              </button>
            )}
            {!cust && <span>Walk-in customer</span>}
          </div>
        </div>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          {sale.status !== 'cancelled' && balance > 0 && (
            <Button variant="primary" icon={CircleDollarSign} onClick={() => composer.open('payment', { sale_id: sale.id, customer_id: sale.customer_id || undefined })}>
              Record payment
            </Button>
          )}
          <Menu align="right" trigger={({ toggle }) => <IconButton icon={MoreVertical} label="More" variant="ghost" onClick={toggle} />}>
            {(close) => (
              <>
                {receipts[0] && (
                  <MenuItem icon={Printer} onClick={() => { setReceipt(receipts[0]); close() }}>
                    View receipt
                  </MenuItem>
                )}
                {sale.status !== 'cancelled' && (
                  <MenuItem icon={Ban} danger onClick={() => { cancel(); close() }}>
                    Cancel sale
                  </MenuItem>
                )}
              </>
            )}
          </Menu>
        </div>
      </div>

      <div className="grid-main">
        <div className="stack gap-5">
          <SectionCard title="Items">
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="right">Qty</th>
                    <th className="right">Price</th>
                    <th className="right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.description}</td>
                      <td className="right num">{it.quantity}</td>
                      <td className="right num">{formatMoney(it.unit_price, currency)}</td>
                      <td className="right num">{formatMoney(it.total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="totals mt-4">
              <div className="tr">
                <span>Subtotal</span>
                <span className="v num">{formatMoney(subtotal, currency)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="tr">
                  <span>Discount</span>
                  <span className="v num">−{formatMoney(sale.discount, currency)}</span>
                </div>
              )}
              <div className="tr grand">
                <span>Total</span>
                <span className="v num">{formatMoney(total, currency)}</span>
              </div>
            </div>
          </SectionCard>

          {receipts.length > 0 && (
            <SectionCard title="Receipts" padded={false}>
              <div className="list">
                {receipts.map((r) => (
                  <ReceiptRow key={r.id} receipt={r} onOpen={setReceipt} />
                ))}
              </div>
            </SectionCard>
          )}

          {sale.notes && (
            <SectionCard title="Notes">
              <p className="text-sm muted">{sale.notes}</p>
            </SectionCard>
          )}
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
              <StatusBadge status={sale.status === 'cancelled' ? 'cancelled' : state} />
            </div>
            <div className="divider" style={{ margin: 'var(--s-5) 0' }} />
            <dl className="kv">
              <KV label="Total">{formatMoney(total, currency)}</KV>
              <KV label="Paid">{formatMoney(paid, currency)}</KV>
              <KV label="Balance">{formatMoney(balance, currency)}</KV>
            </dl>
          </SectionCard>

          <SectionCard title="Details">
            <dl className="kv">
              <KV label="Sale number">{sale.sale_number}</KV>
              <KV label="Date">{formatDate(sale.sale_date)}</KV>
              <KV label="Customer">{cust ? cust.name : 'Walk-in'}</KV>
              <KV label="Status">{sale.status === 'cancelled' ? 'Cancelled' : 'Open'}</KV>
              <KV label="Recorded">{formatDateTime(sale.created_at)}</KV>
            </dl>
          </SectionCard>
        </div>
      </div>

      <ReceiptView receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  )
}
