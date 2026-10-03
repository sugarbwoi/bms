/* ============================================================
   KUDII — Transactions
   One place to answer: "What happened in my business?"

   Combines the business's real financial activity into a single,
   searchable, filterable feed:
     • Sales        (what you sold)
     • Payments     (money actually received)
     • Refunds      (money given back)
     • Expenses     (money spent)
     • Income       (other money in)
     • Drawings     (owner taking money out)
     • Jobs         (legacy work records — kept so nothing is lost)

   Nothing here is a new source of truth. Every row is derived
   from records that already exist elsewhere in the app.
   ============================================================ */
import { useMemo, useState } from 'react'
import {
  ShoppingBag,
  CircleDollarSign,
  Undo2,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  Briefcase,
  Plus,
  Search as SearchIcon,
  ReceiptText,
  ListFilter,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import { useDB } from '../lib/hooks'
import { store } from '../lib/store'
import { navigate } from '../lib/router'
import { useComposer } from '../components/composer-context'
import { PageHead } from '../components/shell'
import { Button, SearchInput, Segmented, StatusBadge, EmptyState, SectionCard } from '../components/ui'
import { unifiedTransactions, moneySummary, type Range, type TxnKind } from '../lib/derive'
import { formatMoney, formatDate, startOfMonth, daysAgo } from '../lib/utils'

/* ---------------- range + filters ---------------- */
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

const TYPE_TABS: { value: 'all' | TxnKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sale', label: 'Sales' },
  { value: 'payment', label: 'Payments' },
  { value: 'refund', label: 'Refunds' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'drawings', label: 'Drawings' },
  { value: 'job', label: 'Jobs' },
]

const KIND_ICON: Record<TxnKind, any> = {
  sale: ShoppingBag,
  payment: CircleDollarSign,
  refund: Undo2,
  expense: ArrowUpRight,
  income: ArrowDownLeft,
  drawings: Banknote,
  job: Briefcase,
}

export default function Transactions() {
  const db = useDB()
  const biz = store.activeBusiness()
  const composer = useComposer()

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'

  const [query, setQuery] = useState('')
  const [rangeKey, setRangeKey] = useState<RangeKey>('month')
  const [typeFilter, setTypeFilter] = useState<'all' | TxnKind>('all')

  const range = useMemo(() => rangeFor(rangeKey), [rangeKey])
  const summary = useMemo(() => moneySummary(db, businessId, range), [db, businessId, range])
  const rows = useMemo(() => unifiedTransactions(db, businessId, range), [db, businessId, range])

  const filtered = useMemo(() => {
    let list = rows
    if (typeFilter !== 'all') list = list.filter((r) => r.kind === typeFilter)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.reference.toLowerCase().includes(q) ||
          r.label.toLowerCase().includes(q) ||
          r.customer.toLowerCase().includes(q),
      )
    }
    return list
  }, [rows, typeFilter, query])

  const netPositive = summary.net >= 0

  return (
    <div className="stack gap-6">
      <PageHead
        title="Transactions"
        sub="What happened in your business — sales, payments, refunds and expenses in one place."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => composer.open('sale')}>
            New sale
          </Button>
        }
      />

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
          <span
            className="ic"
            style={{
              background: netPositive ? 'var(--success-soft)' : 'var(--danger-soft)',
              color: netPositive ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {netPositive ? <TrendingUp size={18} strokeWidth={2.2} /> : <TrendingDown size={18} strokeWidth={2.2} />}
          </span>
          <div className="v num" style={{ color: netPositive ? 'var(--success)' : 'var(--danger)' }}>
            {formatMoney(summary.net, currency)}
          </div>
          <div className="l">Net for period</div>
        </div>
        <div className="pulse-card">
          <span className="ic jobs">
            <ReceiptText size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{rows.length}</div>
          <div className="l">Records</div>
        </div>
      </div>

      {/* Filters */}
      <div className="stack gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by reference, type or customer…"
          className="grow"
        />
        <div className="row gap-3 wrap" style={{ alignItems: 'center' }}>
          <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0, flex: '1 1 240px' }}>
            <CalendarDays size={16} style={{ color: 'var(--text-3)', flex: 'none' }} />
            <Segmented value={rangeKey} onChange={setRangeKey} options={RANGE_OPTIONS} />
          </div>
          <div className="row gap-2" style={{ alignItems: 'center', minWidth: 0, flex: '1 1 300px' }}>
            <ListFilter size={16} style={{ color: 'var(--text-3)', flex: 'none' }} />
            <Segmented value={typeFilter} onChange={setTypeFilter} options={TYPE_TABS} />
          </div>
        </div>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={query ? SearchIcon : Wallet}
            title={query ? 'No matches' : 'Nothing here yet'}
            message={
              query
                ? 'Try a different search term or widen the date range.'
                : 'Record a sale, payment or expense and it will show up here.'
            }
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
            {filtered.map((r) => {
              const Icon = KIND_ICON[r.kind]
              const inner = (
                <>
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
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <span className="list-main">
                    <span className="list-title mono">{r.reference}</span>
                    <span className="list-sub">
                      {r.label}
                      {r.customer ? ` · ${r.customer}` : ''} · {formatDate(r.date)}
                    </span>
                  </span>
                  <span className="list-end">
                    <span
                      className="num"
                      style={{ fontWeight: 600, color: r.direction === 'in' ? 'var(--success)' : 'var(--text)' }}
                    >
                      {r.direction === 'in' ? '+' : '−'}
                      {formatMoney(r.amount, currency)}
                    </span>
                    <StatusBadge status={r.status} />
                  </span>
                </>
              )

              return r.href ? (
                <button key={`${r.kind}-${r.id}`} className="list-row" onClick={() => navigate(r.href!)}>
                  {inner}
                </button>
              ) : (
                <div key={`${r.kind}-${r.id}`} className="list-row" style={{ cursor: 'default' }}>
                  {inner}
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
