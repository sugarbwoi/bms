/* ============================================================
   KUDII — Overview (Business Pulse)
   Answers, in order: what happened, what is owed,
   what needs attention, and what to do next.
   The layout adapts to whether the business sells products,
   delivers services, or both.
   ============================================================ */
import { useMemo, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Briefcase,
  ArrowRight,
  Plus,
  ShoppingBag,
  UserPlus,
  Package,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  CircleDollarSign,
  Receipt as ReceiptIcon,
} from 'lucide-react'
import { useDB, useUser, useBusiness } from '../lib/hooks'
import { store } from '../lib/store'
import { navigate } from '../lib/router'
import { useComposer } from '../components/composer-context'
import { PageHead } from '../components/shell'
import { Button, SectionCard, Avatar, StatusBadge, EmptyState, Badge, ProgressBar } from '../components/ui'
import {
  pulse,
  moneySummary,
  outstanding,
  businessFlavor,
  recentActivity,
  outstandingWork,
  lowStockProducts,
  scope,
  saleBalance,
  saleTotal,
  jobBalance,
  goalProgress,
  salePaymentState,
  jobPaymentState,
} from '../lib/derive'
import {
  formatMoney,
  formatMoneyShort,
  formatDate,
  timeAgo,
  greeting,
  todayISODate,
  daysAgo,
  isOverdue,
  startOfMonth,
} from '../lib/utils'

type RangeKey = 'month' | '30d' | '90d'

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
]

function rangeFor(key: RangeKey) {
  const to = todayISODate()
  if (key === 'month') return { from: startOfMonth().slice(0, 10), to }
  if (key === '30d') return { from: daysAgo(30).slice(0, 10), to }
  return { from: daysAgo(90).slice(0, 10), to }
}

export default function Dashboard() {
  const db = useDB()
  const user = useUser()
  const biz = useBusiness()
  const composer = useComposer()
  const [rangeKey, setRangeKey] = useState<RangeKey>('month')

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'
  const range = rangeFor(rangeKey)

  const p = useMemo(() => pulse(db, businessId, range), [db, businessId, rangeKey])
  const money = useMemo(() => moneySummary(db, businessId, range), [db, businessId, rangeKey])
  const owed = useMemo(() => outstanding(db, businessId), [db, businessId])
  const flavor = useMemo(() => businessFlavor(db, businessId), [db, businessId])
  const activity = useMemo(() => recentActivity(db, businessId, 7), [db, businessId])
  const attention = useMemo(() => outstandingWork(db, businessId), [db, businessId])
  const lowStock = useMemo(() => lowStockProducts(db, businessId), [db, businessId])
  const goals = useMemo(() => scope.goals(db, businessId).filter((g) => g.status === 'active'), [db, businessId])

  const recentSales = useMemo(
    () =>
      scope
        .sales(db, businessId)
        .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
        .slice(0, 5),
    [db, businessId],
  )
  const activeJobs = useMemo(
    () =>
      scope
        .jobs(db, businessId)
        .filter((j) => j.status === 'pending' || j.status === 'in_progress')
        .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
        .slice(0, 5),
    [db, businessId],
  )

  const onboarding = biz ? store.getOnboarding(biz.id) : null
  const showChecklist = onboarding && !onboarding.completed && !onboarding.dismissed

  const hasAnything = recentSales.length > 0 || activeJobs.length > 0 || activity.length > 0

  return (
    <div className="stack gap-6">
      <PageHead
        title={`${greeting()}, ${(user?.name || '').split(' ')[0] || 'there'}`}
        sub={`${biz?.name || 'Your business'} · ${formatDate(todayISODate(), { weekday: 'long', day: 'numeric', month: 'long' })}`}
        actions={
          <>
            <Button variant="soft" icon={UserPlus} onClick={() => composer.open('customer')}>
              Customer
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => composer.open('sale')}>
              New sale
            </Button>
          </>
        }
      />

      {showChecklist && <Checklist onboarding={onboarding} onDismiss={() => biz && store.setOnboarding(biz.id, { dismissed: true })} />}

      {/* ---------- Business Pulse ---------- */}
      <section>
        <div className="section-head">
          <h2>Business pulse</h2>
          <div className="segmented">
            {RANGES.map((r) => (
              <button key={r.key} className={rangeKey === r.key ? 'active' : ''} onClick={() => setRangeKey(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pulse-grid">
          <div className="pulse-card">
            <span className="ic in">
              <TrendingUp size={18} strokeWidth={2.2} />
            </span>
            <div className="v num">{formatMoneyShort(p.moneyIn, currency)}</div>
            <div className="l">
              Money in{' '}
              {p.moneyInDelta !== 0 && (
                <span style={{ color: p.moneyInDelta >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                  · {p.moneyInDelta >= 0 ? '▲' : '▼'} {Math.abs(p.moneyInDelta)}%
                </span>
              )}
            </div>
          </div>

          <div className="pulse-card">
            <span className="ic out">
              <TrendingDown size={18} strokeWidth={2.2} />
            </span>
            <div className="v num">{formatMoneyShort(p.moneyOut, currency)}</div>
            <div className="l">
              Money out{' '}
              {p.moneyOutDelta !== 0 && (
                <span style={{ color: p.moneyOutDelta <= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                  · {p.moneyOutDelta >= 0 ? '▲' : '▼'} {Math.abs(p.moneyOutDelta)}%
                </span>
              )}
            </div>
          </div>

          <div className="pulse-card">
            <span className="ic due">
              <Clock size={18} strokeWidth={2.2} />
            </span>
            <div className="v num">{formatMoneyShort(p.outstanding, currency)}</div>
            <div className="l">
              Owed to you{owed.count > 0 ? ` · ${owed.count} open` : ''}
            </div>
          </div>

          <div className="pulse-card">
            <span className="ic jobs">
              <Briefcase size={18} strokeWidth={2.2} />
            </span>
            <div className="v num">{p.activeJobs}</div>
            <div className="l">Active jobs</div>
          </div>
        </div>

        <div className="row gap-4 mt-4 wrap" style={{ fontSize: 'var(--fs-13)', color: 'var(--text-2)' }}>
          <span>
            <strong style={{ color: 'var(--text)' }}>{formatMoney(money.net, currency)}</strong> net this period
          </span>
          <span className="dim">·</span>
          <span>{p.salesCount} sales</span>
          <span className="dim">·</span>
          <span>{p.newCustomers} new customers</span>
        </div>
      </section>

      {/* ---------- Needs attention ---------- */}
      <div className="grid-main">
        <SectionCard
          title="Needs your attention"
          action={
            <button className="link" onClick={() => navigate('/money')}>
              Money <ArrowRight size={14} />
            </button>
          }
        >
          {attention.length === 0 && lowStock.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="You're all caught up"
              message="No unpaid balances or low stock right now. Nice work."
            />
          ) : (
            <div className="stack gap-1">
              {attention.map((item) => {
                const isJob = item.kind === 'job'
                const cust = db.customers.find((c) => c.id === item.ref.customer_id)
                const overdue = isJob && isOverdue((item.ref as any).due_date)
                return (
                  <button
                    key={`${item.kind}-${item.ref.id}`}
                    className="list-row"
                    onClick={() => navigate(isJob ? `/jobs/${item.ref.id}` : `/sales/${item.ref.id}`)}
                  >
                    <span className="list-main">
                      <span className="list-title">
                        {isJob ? (item.ref as any).title : (item.ref as any).sale_number}
                        {cust ? <span className="muted"> · {cust.name}</span> : null}
                      </span>
                      <span className="list-sub">
                        {isJob ? 'Job' : 'Sale'}
                        {isJob && (item.ref as any).due_date ? ` · due ${formatDate((item.ref as any).due_date)}` : ''}
                        {overdue ? ' · overdue' : ''}
                      </span>
                    </span>
                    <span className="list-end">
                      <span className="num" style={{ fontWeight: 600, color: 'var(--warning)' }}>
                        {formatMoney(item.balance, currency)}
                      </span>
                      <Badge tone={overdue ? 'danger' : 'warning'}>{overdue ? 'Overdue' : 'Unpaid'}</Badge>
                    </span>
                  </button>
                )
              })}

              {lowStock.slice(0, 4).map((prod) => (
                <button key={prod.id} className="list-row" onClick={() => navigate(`/products/${prod.id}`)}>
                  <span className="list-main">
                    <span className="list-title">
                      <AlertTriangle size={14} style={{ color: 'var(--warning)', marginRight: 6, verticalAlign: -2 }} />
                      {prod.name}
                    </span>
                    <span className="list-sub">Low stock</span>
                  </span>
                  <span className="list-end">
                    <span className="num" style={{ fontWeight: 600, color: 'var(--warning)' }}>
                      {prod.stock_quantity} left
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ---------- Adaptive panel ---------- */}
        {flavor === 'product' ? (
          <SectionCard
            title="Recent sales"
            action={
              <button className="link" onClick={() => navigate('/sales')}>
                All sales <ArrowRight size={14} />
              </button>
            }
          >
            {recentSales.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="No sales yet" message="Record your first sale to see it here." action={<Button variant="primary" icon={Plus} onClick={() => composer.open('sale')}>New sale</Button>} />
            ) : (
              <div className="stack gap-1">
                {recentSales.map((s) => {
                  const cust = db.customers.find((c) => c.id === s.customer_id)
                  const state = salePaymentState(db, s)
                  return (
                    <button key={s.id} className="list-row" onClick={() => navigate(`/sales/${s.id}`)}>
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
            )}
          </SectionCard>
        ) : flavor === 'service' ? (
          <SectionCard
            title="Active jobs"
            action={
              <button className="link" onClick={() => navigate('/jobs')}>
                All jobs <ArrowRight size={14} />
              </button>
            }
          >
            {activeJobs.length === 0 ? (
              <EmptyState icon={Briefcase} title="No active jobs" message="Create a job to track work in progress." action={<Button variant="primary" icon={Plus} onClick={() => composer.open('job')}>New job</Button>} />
            ) : (
              <div className="stack gap-1">
                {activeJobs.map((j) => {
                  const cust = db.customers.find((c) => c.id === j.customer_id)
                  const overdue = isOverdue(j.due_date)
                  return (
                    <button key={j.id} className="list-row" onClick={() => navigate(`/jobs/${j.id}`)}>
                      <span className="list-main">
                        <span className="list-title">{j.title}</span>
                        <span className="list-sub">
                          {cust ? cust.name : 'No customer'}
                          {j.due_date ? ` · due ${formatDate(j.due_date)}` : ''}
                        </span>
                      </span>
                      <span className="list-end">
                        <span className="num" style={{ fontWeight: 600 }}>
                          {formatMoney(j.amount, currency)}
                        </span>
                        <StatusBadge status={overdue ? 'overdue' : j.status} />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </SectionCard>
        ) : (
          <SectionCard
            title="Recent sales"
            action={
              <button className="link" onClick={() => navigate('/sales')}>
                All sales <ArrowRight size={14} />
              </button>
            }
          >
            {recentSales.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="No sales yet" message="Record your first sale to see it here." action={<Button variant="primary" icon={Plus} onClick={() => composer.open('sale')}>New sale</Button>} />
            ) : (
              <div className="stack gap-1">
                {recentSales.map((s) => {
                  const cust = db.customers.find((c) => c.id === s.customer_id)
                  const state = salePaymentState(db, s)
                  return (
                    <button key={s.id} className="list-row" onClick={() => navigate(`/sales/${s.id}`)}>
                      <span className="list-main">
                        <span className="list-title mono">{s.sale_number}</span>
                        <span className="list-sub">
                          {cust ? cust.name : 'Walk-in'} · {formatDate(s.sale_date)}
                        </span>
                      </span>
                      <span className="list-end">
                        <span className="num" style={{ fontWeight: 600 }}>
                          {formatMoney(saleBalance(db, s), currency)}
                        </span>
                        <StatusBadge status={state} />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </SectionCard>
        )}
      </div>

      {/* ---------- Goals + Activity ---------- */}
      <div className="grid-main">
        <SectionCard
          title="Activity"
          action={
            <button className="link" onClick={() => navigate('/activity')}>
              See all <ArrowRight size={14} />
            </button>
          }
        >
          {activity.length === 0 ? (
            <EmptyState icon={Sparkles} title="Nothing yet" message="As you add customers, sales and payments, your activity will appear here." />
          ) : (
            <div className="timeline">
              {activity.map((a) => (
                <div key={a.id} className="tl-item">
                  <span className="tl-ic">
                    <ActivityIcon type={a.type} />
                  </span>
                  <div className="tl-body">
                    <div className="tl-title">{a.title}</div>
                    <div className="tl-meta">
                      {a.description ? `${a.description} · ` : ''}
                      {timeAgo(a.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="stack gap-5">
          {goals.length > 0 ? (
            <SectionCard
              title="Goals"
              action={
                <button className="link" onClick={() => navigate('/progress')}>
                  Progress <ArrowRight size={14} />
                </button>
              }
            >
              <div className="stack gap-4">
                {goals.slice(0, 2).map((g) => {
                  const gp = goalProgress(db, g)
                  return (
                    <div key={g.id} className="stack gap-2">
                      <div className="row-between">
                        <span style={{ fontWeight: 500, fontSize: 'var(--fs-14)' }}>{g.title}</span>
                        <span className="num text-sm muted">{gp.pct}%</span>
                      </div>
                      <ProgressBar value={gp.pct} />
                      <span className="text-xs muted">
                        {g.type === 'revenue' ? formatMoney(gp.current, currency) : gp.current} of{' '}
                        {g.type === 'revenue' ? formatMoney(gp.target, currency) : gp.target}
                      </span>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Set a goal">
              <p className="muted text-sm">Give yourself something to aim for this month.</p>
              <Button variant="soft" className="mt-4" icon={TrendingUp} onClick={() => composer.open('goal')}>
                Create a goal
              </Button>
            </SectionCard>
          )}

          <SectionCard title="Quick actions">
            <div className="stack gap-2">
              <QuickAction icon={ShoppingBag} label="Record a sale" onClick={() => composer.open('sale')} />
              <QuickAction icon={Briefcase} label="Create a job" onClick={() => composer.open('job')} />
              <QuickAction icon={CircleDollarSign} label="Record income" onClick={() => composer.open('income')} />
              <QuickAction icon={ReceiptIcon} label="Record an expense" onClick={() => composer.open('expense')} />
              <QuickAction icon={Package} label="Add a product" onClick={() => composer.open('product')} />
            </div>
          </SectionCard>
        </div>
      </div>

      {!hasAnything && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--s-8)' }}>
          <Sparkles size={28} style={{ color: 'var(--accent)', margin: '0 auto var(--s-3)' }} />
          <h2 className="display" style={{ fontSize: 'var(--fs-24)' }}>
            Welcome to KUDII
          </h2>
          <p className="muted mt-2" style={{ maxWidth: 460, margin: '8px auto 0' }}>
            Start by adding a customer or recording a sale. Everything you do shows up here so you always know your money
            and feel in control.
          </p>
          <div className="row gap-3 mt-5" style={{ justifyContent: 'center' }}>
            <Button variant="primary" icon={UserPlus} onClick={() => composer.open('customer')}>
              Add a customer
            </Button>
            <Button variant="soft" icon={ShoppingBag} onClick={() => composer.open('sale')}>
              Record a sale
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- helpers ---------------- */

function QuickAction({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button className="list-row" onClick={onClick}>
      <span className="list-main" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="tl-ic" style={{ width: 30, height: 30 }}>
          <Icon size={16} strokeWidth={2} />
        </span>
        <span className="list-title">{label}</span>
      </span>
      <span className="list-end">
        <ArrowRight size={15} className="dim" />
      </span>
    </button>
  )
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, any> = {
    'sale.created': ShoppingBag,
    'sale.cancelled': ShoppingBag,
    'payment.received': CircleDollarSign,
    'job.created': Briefcase,
    'job.completed': CheckCircle2,
    'customer.created': UserPlus,
    'product.created': Package,
    'product.restocked': Package,
    'stock.adjusted': AlertTriangle,
    'income.recorded': CircleDollarSign,
    'expense.recorded': ReceiptIcon,
    'drawings.recorded': TrendingDown,
    'refund.recorded': ReceiptIcon,
    'invoice.issued': ReceiptIcon,
    'invoice.paid': CheckCircle2,
    'goal.created': TrendingUp,
  }
  const Icon = map[type] || Sparkles
  return <Icon size={16} strokeWidth={2} />
}

function Checklist({ onboarding, onDismiss }: { onboarding: any; onDismiss: () => void }) {
  const items = [
    { key: 'first_customer', label: 'Add your first customer', to: 'customer' as const },
    { key: 'first_sale_or_job', label: 'Record a sale or job', to: 'sale' as const },
    { key: 'first_transaction', label: 'Record income or an expense', to: 'income' as const },
  ]
  const composer = useComposer()
  const doneCount = items.filter((i) => onboarding[i.key]).length
  return (
    <section className="card">
      <div className="section-head">
        <h2>Getting started</h2>
        <button className="link" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
      <div className="checklist">
        {items.map((i) => {
          const done = !!onboarding[i.key]
          return (
            <button key={i.key} className={`check-item ${done ? 'done' : ''}`} onClick={() => !done && composer.open(i.to)}>
              <span className="box">{done ? '✓' : ''}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{i.label}</span>
              {!done && <ArrowRight size={15} className="dim" />}
            </button>
          )
        })}
      </div>
      <div className="text-xs muted mt-3">
        {doneCount} of {items.length} complete
      </div>
    </section>
  )
}
