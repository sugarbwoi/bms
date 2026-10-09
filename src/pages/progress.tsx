/* ============================================================
   KUDII — Progress
   Goals, momentum, and the honest numbers behind them.
   Everything is derived from real recorded events.
   ============================================================ */
import { useMemo, useState } from 'react'
import {
  Target,
  Plus,
  TrendingUp,
  Clock,
  ShoppingCart,
  Users,
  CircleDollarSign,
  PackageX,
  BarChart3,
  MoreVertical,
  Pencil,
  Check,
  Archive,
} from 'lucide-react'
import { useDB, useToast } from '../lib/hooks'
import { store } from '../lib/store'
import { navigate } from '../lib/router'
import { useComposer } from '../components/composer-context'
import { PageHead } from '../components/shell'
import {
  Button,
  IconButton,
  Segmented,
  EmptyState,
  SectionCard,
  ProgressBar,
  Badge,
  Menu,
  MenuItem,
} from '../components/ui'
import { progress, goalProgress, scope, lowStockProducts, outstanding, type Range } from '../lib/derive'
import { formatMoney, formatDate, startOfMonth, daysAgo } from '../lib/utils'
import type { Goal } from '../lib/types'

type RangeKey = 'month' | '30d' | '90d' | 'year'

function rangeFor(key: RangeKey): Range {
  const to = new Date().toISOString()
  if (key === 'month') return { from: startOfMonth(), to }
  if (key === '30d') return { from: daysAgo(30), to }
  if (key === '90d') return { from: daysAgo(90), to }
  return { from: daysAgo(365), to }
}

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'year', label: '12 months' },
]

const GOAL_LABELS: Record<string, string> = {
  revenue: 'Revenue received',
  sales: 'Sales made',
  customers: 'New customers',
}

export default function Progress() {
  const db = useDB()
  const biz = store.activeBusiness()
  const composer = useComposer()
  const toast = useToast()

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'

  const [rangeKey, setRangeKey] = useState<RangeKey>('month')
  const range = useMemo(() => rangeFor(rangeKey), [rangeKey])
  const m = useMemo(() => progress(db, businessId, range), [db, businessId, range])
  const owed = useMemo(() => outstanding(db, businessId), [db, businessId])
  const low = useMemo(() => lowStockProducts(db, businessId), [db, businessId])
  const goals = useMemo(
    () => scope.goals(db, businessId).filter((g) => g.status !== 'archived').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [db, businessId],
  )

  const maxSeries = Math.max(1, ...m.monthlySeries.map((s) => s.value))

  return (
    <div className="stack gap-6">
      <PageHead
        title="Progress"
        sub="Your momentum, goals, and the numbers that prove it."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => composer.open('goal')}>
            Set a goal
          </Button>
        }
      />

      <Segmented value={rangeKey} onChange={setRangeKey} options={RANGE_OPTIONS} />

      {/* Headline metrics */}
      <div className="pulse-grid">
        <div className="pulse-card">
          <span className="ic in">
            <CircleDollarSign size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{formatMoney(m.revenueReceived, currency)}</div>
          <div className="l">Revenue received</div>
        </div>
        <div className="pulse-card">
          <span className="ic due">
            <Clock size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{formatMoney(owed.total, currency)}</div>
          <div className="l">Outstanding</div>
        </div>
        <div className="pulse-card">
          <span className="ic">
            <ShoppingCart size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{m.salesCount}</div>
          <div className="l">Sales made</div>
        </div>
        <div className="pulse-card">
          <span className="ic">
            <Users size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{m.newCustomers}</div>
          <div className="l">New customers</div>
        </div>
      </div>

      <div className="grid-main">
        <div className="stack gap-5">
          {/* Revenue trend */}
          <SectionCard title="Revenue received" action={<Badge tone="neutral">last 6 months</Badge>}>
            <div className="row" style={{ alignItems: 'flex-end', gap: 'var(--s-3)', height: 180 }}>
              {m.monthlySeries.map((s, i) => {
                const h = Math.round((s.value / maxSeries) * 150)
                return (
                  <div key={i} className="stack gap-2" style={{ flex: '1 1 0', minWidth: 0, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <span
                      className="text-xs muted num"
                      style={{ fontSize: 10, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {s.value > 0 ? formatMoney(s.value, currency) : ''}
                    </span>
                    <div
                      title={formatMoney(s.value, currency)}
                      style={{
                        width: '100%',
                        maxWidth: 46,
                        height: Math.max(4, h),
                        borderRadius: 8,
                        background: 'linear-gradient(180deg, var(--accent), var(--accent-2, var(--accent)))',
                        opacity: s.value > 0 ? 1 : 0.25,
                        transition: 'height .4s var(--ease)',
                      }}
                    />
                    <span className="text-xs muted">{s.label}</span>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          {/* Goals */}
          <SectionCard
            title="Goals"
            action={
              <Button size="sm" variant="ghost" icon={Plus} onClick={() => composer.open('goal')}>
                New goal
              </Button>
            }
          >
            {goals.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No goals yet"
                message="Set a target — like ₦500,000 revenue this month — and watch it fill up."
                action={
                  <Button variant="primary" icon={Plus} onClick={() => composer.open('goal')}>
                    Set your first goal
                  </Button>
                }
              />
            ) : (
              <div className="stack gap-5">
                {goals.map((g) => (
                  <GoalRow key={g.id} goal={g} currency={currency} />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Top products */}
          <SectionCard title="Top products" action={<Badge tone="neutral">by revenue</Badge>}>
            {m.topProducts.length === 0 ? (
              <p className="text-sm muted">No product sales in this period yet.</p>
            ) : (
              <div className="stack gap-4">
                {m.topProducts.map((tp, i) => (
                  <div key={tp.product.id} className="row gap-3" style={{ alignItems: 'center' }}>
                    <span className="tl-ic" style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-2)', color: 'var(--text-2)', fontWeight: 700 }}>
                      {i + 1}
                    </span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="row-between" style={{ alignItems: 'baseline' }}>
                        <button className="link truncate" onClick={() => navigate(`/products/${tp.product.id}`)}>
                          {tp.product.name}
                        </button>
                        <span className="num text-sm" style={{ fontWeight: 600 }}>
                          {formatMoney(tp.revenue, currency)}
                        </span>
                      </div>
                      <div className="text-xs muted mt-1">{tp.qty} sold</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Sidebar */}
        <div className="stack gap-5">
          <SectionCard title="This period at a glance">
            <div className="stack gap-4">
              <Metric icon={<CircleDollarSign size={16} />} label="Outstanding" value={formatMoney(owed.total, currency)} />
              <Metric icon={<PackageX size={16} />} label="Low stock items" value={String(m.lowStockCount)} />
              <Metric icon={<ShoppingCart size={16} />} label="Sales made" value={String(m.salesCount)} />
              <Metric icon={<Users size={16} />} label="New customers" value={String(m.newCustomers)} />
            </div>
          </SectionCard>

          {low.length > 0 && (
            <SectionCard title="Needs restocking">
              <div className="stack gap-3">
                {low.slice(0, 5).map((p) => (
                  <button key={p.id} className="row-between" style={{ width: '100%', alignItems: 'center' }} onClick={() => navigate(`/products/${p.id}`)}>
                    <span className="text-sm truncate">{p.name}</span>
                    <Badge tone={p.stock_quantity <= 0 ? 'danger' : 'warning'}>
                      {p.stock_quantity} left
                    </Badge>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Reports">
            <div className="stack gap-2">
              <Button variant="primary" block icon={BarChart3} onClick={() => navigate('/reports')}>
                Automated reports
              </Button>
              <Button variant="soft" block icon={CircleDollarSign} onClick={() => navigate('/money')}>
                Money in & out
              </Button>
              <Button variant="ghost" block icon={TrendingUp} onClick={() => navigate('/sales')}>
                Sales history
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Goal row ---------------- */
function GoalRow({ goal, currency }: { goal: Goal; currency: string }) {
  const db = useDB()
  const toast = useToast()
  const composer = useComposer()
  const p = goalProgress(db, goal)
  const isRevenue = goal.type === 'revenue'
  const done = p.pct >= 100

  const complete = () => {
    store.updateGoal(goal.id, { status: 'completed' })
    toast.push('Goal completed', 'success')
  }
  const archive = () => {
    store.updateGoal(goal.id, { status: 'archived' })
    toast.push('Goal archived')
  }

  return (
    <div>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>{goal.title}</span>
            {goal.status === 'completed' && <Badge tone="success" dot>Completed</Badge>}
          </div>
          <div className="text-xs muted mt-1">
            {GOAL_LABELS[goal.type]} · {formatDate(goal.start_date)} → {formatDate(goal.end_date)}
          </div>
        </div>
        <Menu align="right" trigger={({ toggle }) => <IconButton icon={MoreVertical} label="Goal options" variant="ghost" size="sm" onClick={toggle} />}>
          {(close) => (
            <>
              <MenuItem icon={Pencil} onClick={() => { composer.open('goal', { id: goal.id }); close() }}>
                Edit
              </MenuItem>
              {goal.status !== 'completed' && (
                <MenuItem icon={Check} onClick={() => { complete(); close() }}>
                  Mark complete
                </MenuItem>
              )}
              <MenuItem icon={Archive} danger onClick={() => { archive(); close() }}>
                Archive
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
      <div className="row-between mt-3" style={{ alignItems: 'baseline' }}>
        <span className="num" style={{ fontWeight: 600 }}>
          {isRevenue ? formatMoney(p.current, currency) : p.current}
          <span className="muted" style={{ fontWeight: 400 }}>
            {' '}/ {isRevenue ? formatMoney(p.target, currency) : p.target}
          </span>
        </span>
        <span className="text-sm" style={{ fontWeight: 600, color: done ? 'var(--success)' : 'var(--text-2)' }}>
          {p.pct}%
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar value={p.pct} />
      </div>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="row-between" style={{ alignItems: 'center' }}>
      <span className="row gap-2 text-sm muted" style={{ alignItems: 'center' }}>
        {icon}
        {label}
      </span>
      <span className="num text-sm" style={{ fontWeight: 600 }}>
        {value}
      </span>
    </div>
  )
}
