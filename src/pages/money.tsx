/* ============================================================
   KUDII — Money
   The clearest possible picture of money in and money out.
   Every number here is derived from recorded events — payments
   and transactions — never from what you *expect* to receive.
   ============================================================ */
import { useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Receipt as ReceiptIcon,
  Undo2,
  Plus,
  Minus,
  Banknote,
  Clock,
  Search as SearchIcon,
  Scale,
} from 'lucide-react'
import { useDB, useConfirm, useToast } from '../lib/hooks'
import { store } from '../lib/store'
import { navigate } from '../lib/router'
import { useComposer } from '../components/composer-context'
import { PageHead } from '../components/shell'
import {
  Button,
  SearchInput,
  Segmented,
  Badge,
  EmptyState,
  SectionCard,
  ProgressBar,
} from '../components/ui'
import { scope, moneySummary, outstanding, type Range } from '../lib/derive'
import { formatMoney, formatDate, formatDateTime, startOfMonth, daysAgo } from '../lib/utils'
import type { Transaction } from '../lib/types'

type RangeKey = 'month' | '30d' | '90d' | 'all'

function rangeFor(key: RangeKey): Range {
  const to = new Date().toISOString()
  if (key === 'month') return { from: startOfMonth(), to }
  if (key === '30d') return { from: daysAgo(30), to }
  if (key === '90d') return { from: daysAgo(90), to }
  return { from: '2000-01-01T00:00:00.000Z', to }
}

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
]

type LedgerKind = 'payment' | 'income' | 'expense' | 'drawings' | 'refund' | 'reversal'

interface LedgerRow {
  id: string
  kind: LedgerKind
  direction: 'in' | 'out'
  title: string
  sub: string
  amount: number
  date: string
  reversed?: boolean
  txn?: Transaction
  href?: string
}

const LEDGER_TABS: { value: 'all' | LedgerKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'payment', label: 'Payments in' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
  { value: 'drawings', label: 'Drawings' },
  { value: 'refund', label: 'Refunds' },
]

export default function Money() {
  const db = useDB()
  const biz = store.activeBusiness()
  const composer = useComposer()
  const confirm = useConfirm()
  const toast = useToast()

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'

  const [rangeKey, setRangeKey] = useState<RangeKey>('month')
  const [tab, setTab] = useState<'all' | LedgerKind>('all')
  const [query, setQuery] = useState('')

  const range = useMemo(() => rangeFor(rangeKey), [rangeKey])
  const summary = useMemo(() => moneySummary(db, businessId, range), [db, businessId, range])
  const owed = useMemo(() => outstanding(db, businessId), [db, businessId])

  const ledger = useMemo<LedgerRow[]>(() => {
    const rows: LedgerRow[] = []
    const inRange = (iso: string) =>
      new Date(iso).getTime() >= new Date(range.from).getTime() &&
      new Date(iso).getTime() <= new Date(range.to).getTime()

    // payments in
    for (const p of scope.payments(db, businessId)) {
      if (!inRange(p.payment_date)) continue
      const cust = p.customer_id ? db.customers.find((c) => c.id === p.customer_id) : null
      rows.push({
        id: p.id,
        kind: 'payment',
        direction: 'in',
        title: cust ? cust.name : 'Payment received',
        sub: `${p.reference} · ${p.method}`,
        amount: p.amount,
        date: p.payment_date,
        reversed: p.status === 'reversed',
      })
    }

    // transactions
    for (const t of scope.transactions(db, businessId)) {
      if (!inRange(t.transaction_date)) continue
      const kind: LedgerKind =
        t.type === 'income' ? 'income' : t.type === 'expense' ? 'expense' : t.type === 'drawings' ? 'drawings' : t.type === 'refund' ? 'refund' : 'reversal'
      const direction: 'in' | 'out' = t.type === 'income' ? 'in' : 'out'
      rows.push({
        id: t.id,
        kind,
        direction,
        title: t.category || t.type,
        sub: t.description || t.payment_method,
        amount: t.amount,
        date: t.transaction_date,
        reversed: t.status === 'reversed',
        txn: t,
      })
    }

    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return rows
  }, [db, businessId, range])

  const filtered = useMemo(() => {
    let list = ledger
    if (tab !== 'all') list = list.filter((r) => r.kind === tab)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((r) => r.title.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q))
    return list
  }, [ledger, tab, query])

  const reverse = async (row: LedgerRow) => {
    if (!row.txn) return
    const res = await confirm({
      title: 'Reverse this entry?',
      message: 'The original entry is kept for your records and a reversal is added. Nothing is deleted.',
      confirmLabel: 'Reverse entry',
      danger: true,
      requireReason: true,
    })
    if (!res.confirmed) return
    const out = store.reverseTransaction(row.txn.id, res.reason || 'Reversed')
    if (out.ok) toast.push('Entry reversed', 'success')
    else toast.push(out.error || 'Could not reverse', 'error')
  }

  const netPositive = summary.net >= 0

  return (
    <div className="stack gap-6">
      <PageHead
        title="Money"
        sub="What came in, what went out, and what you're still owed."
        actions={
          <div className="row gap-2 wrap">
            <Button variant="soft" icon={ArrowDownLeft} onClick={() => composer.open('income')}>
              Record income
            </Button>
            <Button variant="soft" icon={ArrowUpRight} onClick={() => composer.open('expense')}>
              Record expense
            </Button>
          </div>
        }
      />

      <div className="row-between wrap gap-3" style={{ alignItems: 'center' }}>
        <Segmented value={rangeKey} onChange={setRangeKey} options={RANGE_OPTIONS} />
        <div className="row gap-2 wrap">
          <Button variant="ghost" icon={Banknote} onClick={() => composer.open('drawing')}>
            Record drawing
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="pulse-grid">
        <div className="pulse-card">
          <span className="ic in">
            <ArrowDownLeft size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{formatMoney(summary.moneyIn, currency)}</div>
          <div className="l">Money in</div>
        </div>
        <div className="pulse-card">
          <span className="ic out">
            <ArrowUpRight size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{formatMoney(summary.moneyOut, currency)}</div>
          <div className="l">Money out</div>
        </div>
        <div className="pulse-card">
          <span className="ic" style={{ background: netPositive ? 'var(--success-soft)' : 'var(--danger-soft)', color: netPositive ? 'var(--success)' : 'var(--danger)' }}>
            {netPositive ? <TrendingUp size={18} strokeWidth={2.2} /> : <TrendingDown size={18} strokeWidth={2.2} />}
          </span>
          <div className="v num" style={{ color: netPositive ? 'var(--success)' : 'var(--danger)' }}>
            {formatMoney(summary.net, currency)}
          </div>
          <div className="l">Net for period</div>
        </div>
        <div className="pulse-card">
          <span className="ic due">
            <Clock size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{formatMoney(owed.total, currency)}</div>
          <div className="l">Still owed to you</div>
        </div>
      </div>

      <div className="grid-main">
        <div className="stack gap-5">
          <SectionCard
            title="Money movement"
            action={
              <div className="row gap-2">
                <Button size="sm" variant="ghost" icon={Plus} onClick={() => composer.open('income')}>
                  Income
                </Button>
                <Button size="sm" variant="ghost" icon={Minus} onClick={() => composer.open('expense')}>
                  Expense
                </Button>
              </div>
            }
          >
            <div className="stack gap-3">
              <Breakdown label="Payments received" value={summary.payments} total={summary.moneyIn} currency={currency} tone="success" />
              <Breakdown label="Other income" value={summary.income} total={summary.moneyIn} currency={currency} tone="success" />
              <div className="divider" style={{ margin: 'var(--s-2) 0' }} />
              <Breakdown label="Expenses" value={summary.expenses} total={summary.moneyOut} currency={currency} tone="danger" />
              <Breakdown label="Drawings" value={summary.drawings} total={summary.moneyOut} currency={currency} tone="danger" />
              <Breakdown label="Refunds" value={summary.refunds} total={summary.moneyOut} currency={currency} tone="danger" />
            </div>
          </SectionCard>

          <SectionCard>
            <div className="row gap-3 wrap" style={{ alignItems: 'center' }}>
              <SearchInput value={query} onChange={setQuery} placeholder="Search money entries…" className="grow" />
              <Segmented value={tab} onChange={setTab} options={LEDGER_TABS} />
            </div>

            {filtered.length === 0 ? (
              <div className="mt-5">
                <EmptyState
                  icon={query ? SearchIcon : Wallet}
                  title={query ? 'No matches' : 'Nothing recorded yet'}
                  message={
                    query
                      ? 'Try a different search term.'
                      : 'Record income, an expense, or a customer payment and it will appear here.'
                  }
                  action={
                    !query ? (
                      <div className="row gap-2" style={{ justifyContent: 'center' }}>
                        <Button variant="primary" icon={ArrowDownLeft} onClick={() => composer.open('income')}>
                          Record income
                        </Button>
                        <Button variant="soft" icon={ArrowUpRight} onClick={() => composer.open('expense')}>
                          Record expense
                        </Button>
                      </div>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className="list mt-4">
                {filtered.map((r) => (
                  <div key={`${r.kind}-${r.id}`} className="list-row" style={{ cursor: 'default' }}>
                    <span
                      className="tl-ic"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: r.direction === 'in' ? 'var(--success-soft)' : 'var(--danger-soft)',
                        color: r.direction === 'in' ? 'var(--success)' : 'var(--danger)',
                      }}
                    >
                      {r.kind === 'payment' ? (
                        <CircleDollarSign size={18} strokeWidth={2} />
                      ) : r.kind === 'income' ? (
                        <ArrowDownLeft size={18} strokeWidth={2} />
                      ) : r.kind === 'refund' ? (
                        <Undo2 size={18} strokeWidth={2} />
                      ) : r.kind === 'reversal' ? (
                        <Undo2 size={18} strokeWidth={2} />
                      ) : (
                        <ArrowUpRight size={18} strokeWidth={2} />
                      )}
                    </span>
                    <span className="list-main">
                      <span className="list-title">
                        {r.title}
                        {r.reversed && (
                          <span className="ml-2">
                            <Badge tone="neutral">Reversed</Badge>
                          </span>
                        )}
                      </span>
                      <span className="list-sub">
                        {r.sub ? `${r.sub} · ` : ''}
                        {formatDate(r.date)}
                      </span>
                    </span>
                    <span className="list-end" style={{ alignItems: 'flex-end' }}>
                      <span
                        className="num"
                        style={{ fontWeight: 600, color: r.direction === 'in' ? 'var(--success)' : 'var(--text)' }}
                      >
                        {r.direction === 'in' ? '+' : '−'}
                        {formatMoney(r.amount, currency)}
                      </span>
                      {r.txn && !r.reversed && r.kind !== 'reversal' && (
                        <button className="link text-xs" onClick={() => reverse(r)}>
                          Reverse
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Sidebar: outstanding */}
        <div className="stack gap-5">
          <SectionCard title="Outstanding">
            <div className="stat-value lg num" style={{ color: owed.total > 0 ? 'var(--warning)' : 'var(--success)' }}>
              {formatMoney(owed.total, currency)}
            </div>
            <div className="text-xs muted">
              {owed.count > 0 ? `across ${owed.count} unpaid item${owed.count === 1 ? '' : 's'}` : 'everything is settled'}
            </div>
            <div className="divider" style={{ margin: 'var(--s-5) 0' }} />
            <div className="stack gap-3">
              <MiniRow
                label="Sales"
                value={owed.sales}
                currency={currency}
                onClick={() => navigate('/sales')}
              />
              <MiniRow
                label="Jobs"
                value={owed.jobs}
                currency={currency}
                onClick={() => navigate('/jobs')}
              />
              <MiniRow
                label="Invoices"
                value={owed.invoices}
                currency={currency}
                onClick={() => navigate('/invoices')}
              />
            </div>
          </SectionCard>

          <SectionCard title="Quick actions">
            <div className="stack gap-2">
              <Button variant="soft" block icon={ArrowDownLeft} onClick={() => composer.open('income')}>
                Record income
              </Button>
              <Button variant="soft" block icon={ArrowUpRight} onClick={() => composer.open('expense')}>
                Record expense
              </Button>
              <Button variant="soft" block icon={Banknote} onClick={() => composer.open('drawing')}>
                Record owner drawing
              </Button>
              <Button variant="ghost" block icon={ReceiptIcon} onClick={() => composer.open('payment')}>
                Record a customer payment
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="How this works">
            <p className="text-sm muted">
              Creating a sale, job, or invoice does <strong>not</strong> count as money received. Only recorded
              payments count as money in. That's why your balance sheet always tells the truth.
            </p>
            <div className="row gap-2 mt-4" style={{ alignItems: 'center', color: 'var(--text-2)' }}>
              <Scale size={16} />
              <span className="text-xs">Exact, auditable amounts — never estimates.</span>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

/* ---------------- helpers ---------------- */

function Breakdown({
  label,
  value,
  total,
  currency,
  tone,
}: {
  label: string
  value: number
  total: number
  currency: string
  tone: 'success' | 'danger'
}) {
  const p = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="row-between" style={{ alignItems: 'baseline' }}>
        <span className="text-sm">{label}</span>
        <span className="num text-sm" style={{ fontWeight: 600 }}>
          {formatMoney(value, currency)}
        </span>
      </div>
      <div className="mt-1">
        <ProgressBar value={p} thin />
      </div>
    </div>
  )
}

function MiniRow({
  label,
  value,
  currency,
  onClick,
}: {
  label: string
  value: number
  currency: string
  onClick: () => void
}) {
  return (
    <button className="row-between" style={{ width: '100%', alignItems: 'center' }} onClick={onClick}>
      <span className="text-sm muted">{label}</span>
      <span className="num text-sm" style={{ fontWeight: 600, color: value > 0 ? 'var(--text)' : 'var(--text-3)' }}>
        {formatMoney(value, currency)}
      </span>
    </button>
  )
}
