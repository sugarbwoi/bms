/* ============================================================
   KUDII — Customers
   A list of everyone you do business with, and a profile that
   connects every sale, invoice and payment to that person
   so you can see — at a glance — what they owe and what they've paid.
   ============================================================ */
import { useMemo, useState } from 'react'
import {
  UserPlus,
  Search as SearchIcon,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Archive,
  ArchiveRestore,
  CircleDollarSign,
  ShoppingBag,
  FileText,
  Plus,
  Receipt as ReceiptIcon,
} from 'lucide-react'
import { useDB } from '../lib/hooks'
import { store } from '../lib/store'
import { navigate } from '../lib/router'
import { useComposer } from '../components/composer-context'
import { useConfirm, useToast } from '../lib/hooks'
import { PageHead } from '../components/shell'
import {
  Button,
  IconButton,
  SearchInput,
  Segmented,
  Avatar,
  Badge,
  StatusBadge,
  EmptyState,
  SectionCard,
  Menu,
  MenuItem,
  KV,
  Money,
} from '../components/ui'
import {
  scope,
  customerBalance,
  saleBalance,
  saleTotal,
  salePaymentState,
  invoiceBalance,
  invoiceTotal,
  invoiceEffectiveStatus,
} from '../lib/derive'
import { formatMoney, formatDate, timeAgo } from '../lib/utils'
import type { Customer } from '../lib/types'

export default function Customers({ id }: { id?: string }) {
  const db = useDB()
  if (id) return <CustomerProfile id={id} />
  return <CustomerList />
}

/* ============================================================
   LIST
   ============================================================ */
function CustomerList() {
  const db = useDB()
  const biz = store.activeBusiness()
  const composer = useComposer()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'active' | 'archived'>('active')

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'

  const customers = useMemo(() => {
    const list = scope
      .customers(db, businessId)
      .filter((c) => c.status === tab)
      .sort((a, b) => a.name.localeCompare(b.name))
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q),
    )
  }, [db, businessId, query, tab])

  const activeCount = scope.customers(db, businessId).filter((c) => c.status === 'active').length
  const archivedCount = scope.customers(db, businessId).filter((c) => c.status === 'archived').length

  return (
    <div className="stack gap-6">
      <PageHead
        title="Customers"
        sub="Everyone you do business with, and what they owe."
        actions={
          <Button variant="primary" icon={UserPlus} onClick={() => composer.open('customer')}>
            New customer
          </Button>
        }
      />

      <div className="row gap-3 wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email or phone…" className="grow" />
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'active', label: `Active (${activeCount})` },
            { value: 'archived', label: `Archived (${archivedCount})` },
          ]}
        />
      </div>

      {customers.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={query ? SearchIcon : UserPlus}
            title={query ? 'No matches' : tab === 'archived' ? 'No archived customers' : 'No customers yet'}
            message={
              query
                ? 'Try a different search term.'
                : 'Add your first customer to start tracking sales and payments against them.'
            }
            action={
              !query && tab === 'active' ? (
                <Button variant="primary" icon={UserPlus} onClick={() => composer.open('customer')}>
                  Add a customer
                </Button>
              ) : undefined
            }
          />
        </SectionCard>
      ) : (
        <SectionCard padded={false}>
          <div className="list">
            {customers.map((c) => {
              const bal = customerBalance(db, c.id)
              return (
                <button key={c.id} className="list-row" onClick={() => navigate(`/customers/${c.id}`)}>
                  <Avatar name={c.name} />
                  <span className="list-main">
                    <span className="list-title">{c.name}</span>
                    <span className="list-sub">
                      {c.phone || c.email || 'No contact details'}
                    </span>
                  </span>
                  <span className="list-end">
                    {bal.total > 0 ? (
                      <>
                        <span className="num" style={{ fontWeight: 600, color: 'var(--warning)' }}>
                          {formatMoney(bal.total, currency)}
                        </span>
                        <span className="text-xs muted">owed</span>
                      </>
                    ) : (
                      <Badge tone="success" dot>
                        Settled
                      </Badge>
                    )}
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
   PROFILE
   ============================================================ */
function CustomerProfile({ id }: { id: string }) {
  const db = useDB()
  const biz = store.activeBusiness()
  const composer = useComposer()
  const confirm = useConfirm()
  const toast = useToast()
  const [tab, setTab] = useState<'overview' | 'statement'>('overview')

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'

  const customer = db.customers.find((c) => c.id === id && c.business_id === businessId)

  if (!customer) {
    return (
      <div className="stack gap-6">
        <PageHead title="Customer not found" sub="This customer may have been removed." />
        <SectionCard>
          <EmptyState
            icon={SearchIcon}
            title="We couldn't find that customer"
            message="It may have been deleted or belongs to another business."
            action={
              <Button variant="primary" onClick={() => navigate('/customers')}>
                Back to customers
              </Button>
            }
          />
        </SectionCard>
      </div>
    )
  }

  const bal = customerBalance(db, customer.id)
  const sales = scope.sales(db, businessId).filter((s) => s.customer_id === customer.id)
  const invoices = scope.invoices(db, businessId).filter((i) => i.customer_id === customer.id)
  const payments = scope.payments(db, businessId).filter((p) => p.customer_id === customer.id)
  const activities = scope
    .activities(db, businessId)
    .filter((a) => a.customer_id === customer.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const archive = async () => {
    const next = customer.status === 'active' ? 'archived' : 'active'
    const res = await confirm({
      title: next === 'archived' ? 'Archive this customer?' : 'Restore this customer?',
      message:
        next === 'archived'
          ? 'They will be hidden from your active list. Their history is kept safe.'
          : 'They will appear in your active customer list again.',
      confirmLabel: next === 'archived' ? 'Archive' : 'Restore',
      danger: next === 'archived',
    })
    if (!res.confirmed) return
    store.setCustomerStatus(customer.id, next)
    toast.push(next === 'archived' ? 'Customer archived' : 'Customer restored')
  }

  return (
    <div className="stack gap-6">
      <button className="link" onClick={() => navigate('/customers')} style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={15} /> All customers
      </button>

      <div className="detail-hero">
        <Avatar name={customer.name} size="xl" />
        <div className="grow" style={{ minWidth: 220 }}>
          <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'var(--fs-28)', letterSpacing: '-0.02em' }}>{customer.name}</h1>
            <Badge tone={customer.status === 'active' ? 'success' : 'neutral'} dot>
              {customer.status === 'active' ? 'Active' : 'Archived'}
            </Badge>
          </div>
          <div className="row gap-4 wrap mt-2" style={{ color: 'var(--text-2)', fontSize: 'var(--fs-13)' }}>
            {customer.phone && (
              <span className="row gap-1" style={{ alignItems: 'center' }}>
                <Phone size={14} /> {customer.phone}
              </span>
            )}
            {customer.email && (
              <span className="row gap-1" style={{ alignItems: 'center' }}>
                <Mail size={14} /> {customer.email}
              </span>
            )}
            {customer.address && (
              <span className="row gap-1" style={{ alignItems: 'center' }}>
                <MapPin size={14} /> {customer.address}
              </span>
            )}
          </div>
        </div>

        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Button variant="soft" icon={CircleDollarSign} onClick={() => composer.open('payment', { customer_id: customer.id })}>
            Record payment
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => composer.open('sale', { customer_id: customer.id })}>
            New sale
          </Button>
          <Menu
            align="right"
            trigger={({ toggle }) => <IconButton icon={MoreVertical} label="More actions" variant="ghost" onClick={toggle} />}
          >
            {(close) => (
              <>
                <MenuItem icon={Pencil} onClick={() => { composer.open('customer', { id: customer.id }); close() }}>
                  Edit details
                </MenuItem>
                <MenuItem icon={FileText} onClick={() => { composer.open('invoice', { customer_id: customer.id }); close() }}>
                  New invoice
                </MenuItem>
                <div className="menu-sep" />
                <MenuItem icon={customer.status === 'active' ? Archive : ArchiveRestore} danger={customer.status === 'active'} onClick={() => { archive(); close() }}>
                  {customer.status === 'active' ? 'Archive customer' : 'Restore customer'}
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      </div>

      {/* Balance summary */}
      <div className="pulse-grid">
        <div className="pulse-card">
          <span className="ic due">
            <CircleDollarSign size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{formatMoney(bal.total, currency)}</div>
          <div className="l">Outstanding balance</div>
        </div>
        <div className="pulse-card">
          <span className="ic in">
            <ShoppingBag size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{formatMoney(bal.paid, currency)}</div>
          <div className="l">Total paid</div>
        </div>
        <div className="pulse-card">
          <span className="ic neutral">
            <ShoppingBag size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{sales.length}</div>
          <div className="l">Sales</div>
        </div>
      </div>

      <div className="segmented" style={{ alignSelf: 'flex-start' }}>
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          Overview
        </button>
        <button className={tab === 'statement' ? 'active' : ''} onClick={() => setTab('statement')}>
          Statement
        </button>
      </div>

      {tab === 'overview' ? (
        <div className="grid-main">
          <div className="stack gap-5">
            <SectionCard
              title="Sales"
              action={
                <button className="link" onClick={() => composer.open('sale', { customer_id: customer.id })}>
                  <Plus size={14} /> New
                </button>
              }
            >
              {sales.length === 0 ? (
                <p className="muted text-sm">No sales recorded for this customer yet.</p>
              ) : (
                <div className="list">
                  {sales
                    .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
                    .map((s) => (
                      <button key={s.id} className="list-row" onClick={() => navigate(`/sales/${s.id}`)}>
                        <span className="list-main">
                          <span className="list-title mono">{s.sale_number}</span>
                          <span className="list-sub">{formatDate(s.sale_date)}</span>
                        </span>
                        <span className="list-end">
                          <span className="num" style={{ fontWeight: 600 }}>
                            {formatMoney(saleTotal(db, s), currency)}
                          </span>
                          <StatusBadge status={salePaymentState(db, s)} />
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Invoices"
              action={
                <button className="link" onClick={() => composer.open('invoice', { customer_id: customer.id })}>
                  <Plus size={14} /> New
                </button>
              }
            >
              {invoices.length === 0 ? (
                <p className="muted text-sm">No invoices for this customer yet.</p>
              ) : (
                <div className="list">
                  {invoices
                    .sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())
                    .map((i) => (
                      <button key={i.id} className="list-row" onClick={() => navigate(`/invoices/${i.id}`)}>
                        <span className="list-main">
                          <span className="list-title mono">{i.invoice_number}</span>
                          <span className="list-sub">
                            {formatDate(i.issue_date)}
                            {i.due_date ? ` · due ${formatDate(i.due_date)}` : ''}
                          </span>
                        </span>
                        <span className="list-end">
                          <span className="num" style={{ fontWeight: 600 }}>
                            {formatMoney(invoiceTotal(db, i), currency)}
                          </span>
                          <StatusBadge status={invoiceEffectiveStatus(db, i)} />
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="stack gap-5">
            <SectionCard title="Details">
              <dl className="kv">
                <KV label="Status">
                  <Badge tone={customer.status === 'active' ? 'success' : 'neutral'}>{customer.status}</Badge>
                </KV>
                <KV label="Phone">{customer.phone || '—'}</KV>
                <KV label="Email">{customer.email || '—'}</KV>
                <KV label="Address">{customer.address || '—'}</KV>
                <KV label="Added">{formatDate(customer.created_at)}</KV>
              </dl>
              {customer.notes && (
                <div className="mt-4">
                  <div className="eyebrow">Notes</div>
                  <p className="text-sm muted mt-1">{customer.notes}</p>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Recent activity">
              {activities.length === 0 ? (
                <p className="muted text-sm">No activity yet.</p>
              ) : (
                <div className="timeline">
                  {activities.slice(0, 8).map((a) => (
                    <div key={a.id} className="tl-item">
                      <span className="tl-ic">
                        <ReceiptIcon size={15} strokeWidth={2} />
                      </span>
                      <div className="tl-body">
                        <div className="tl-title">{a.title}</div>
                        <div className="tl-meta">{timeAgo(a.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      ) : (
        <Statement customer={customer} currency={currency} />
      )}
    </div>
  )
}

/* ============================================================
   STATEMENT
   A running account: charges (sales and invoices) and
   payments in date order, ending with the balance owed.
   ============================================================ */
function Statement({ customer, currency }: { customer: Customer; currency: string }) {
  const db = useDB()
  const biz = store.activeBusiness()
  const businessId = biz?.id || ''

  const entries = useMemo(() => {
    const rows: { date: string; label: string; ref: string; charge: number; payment: number }[] = []
    for (const s of scope.sales(db, businessId).filter((x) => x.customer_id === customer.id && x.status !== 'cancelled')) {
      rows.push({ date: s.sale_date, label: 'Sale', ref: s.sale_number, charge: saleTotal(db, s), payment: 0 })
    }
    for (const i of scope.invoices(db, businessId).filter((x) => x.customer_id === customer.id && x.status !== 'cancelled' && x.status !== 'draft')) {
      rows.push({ date: i.issue_date, label: 'Invoice', ref: i.invoice_number, charge: invoiceTotal(db, i), payment: 0 })
    }
    for (const p of scope.payments(db, businessId).filter((x) => x.customer_id === customer.id && x.status !== 'reversed')) {
      rows.push({ date: p.payment_date, label: 'Payment', ref: p.reference, charge: 0, payment: p.amount })
    }
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return rows
  }, [db, businessId, customer.id])

  const totalCharges = entries.reduce((a, b) => a + b.charge, 0)
  const totalPayments = entries.reduce((a, b) => a + b.payment, 0)
  const balance = totalCharges - totalPayments

  return (
    <SectionCard title="Statement" action={<Badge tone={balance > 0 ? 'warning' : 'success'}>{balance > 0 ? 'Balance due' : 'Settled'}</Badge>}>
      {entries.length === 0 ? (
        <p className="muted text-sm">No transactions with this customer yet.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th className="right">Charges</th>
                  <th className="right">Payments</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={idx}>
                    <td className="muted" data-label="Date">{formatDate(e.date)}</td>
                    <td data-label="Description">
                      <span style={{ fontWeight: 500 }}>{e.label}</span>
                      <span className="muted mono text-xs"> · {e.ref}</span>
                    </td>
                    <td className="right num" data-label="Charges">{e.charge ? formatMoney(e.charge, currency) : '—'}</td>
                    <td className="right num" data-label="Payments" style={{ color: e.payment ? 'var(--success)' : undefined }}>
                      {e.payment ? formatMoney(e.payment, currency) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="totals mt-4">
            <div className="tr">
              <span>Total charged</span>
              <span className="v num">{formatMoney(totalCharges, currency)}</span>
            </div>
            <div className="tr">
              <span>Total paid</span>
              <span className="v num">{formatMoney(totalPayments, currency)}</span>
            </div>
            <div className="tr grand">
              <span>Balance</span>
              <span className="v num">{formatMoney(balance, currency)}</span>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  )
}
