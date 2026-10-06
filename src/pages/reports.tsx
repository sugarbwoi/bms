/* ============================================================
   KUDII — Reports
   Automated, business-owned reports built from real recorded
   events. Daily pulse, weekly, monthly, quarterly and yearly.
   Every figure is derived — nothing here is invented.
   ============================================================ */
import { useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Share2,
  MessageCircle,
  Package,
  Users,
  BarChart3,
  Sparkles,
} from 'lucide-react'
import { useDB, useToast } from '../lib/hooks'
import { store } from '../lib/store'
import { navigate } from '../lib/router'
import { PageHead } from '../components/shell'
import { Button, Segmented, Badge, EmptyState, SectionCard, Menu, MenuItem } from '../components/ui'
import {
  scope,
  moneySummary,
  outstanding,
  saleTotal,
  customerBalance,
  planOf,
  type Range,
} from '../lib/derive'
import { entitlementsFor, PLANS } from '../lib/plans'
import { formatMoney, formatDate } from '../lib/utils'
import { downloadCSV, downloadExcel, printTable, shareCSV } from '../lib/export'

type PeriodKey = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

const PERIOD_WORD: Record<PeriodKey, string> = {
  daily: 'Daily pulse',
  weekly: 'Weekly report',
  monthly: 'Monthly report',
  quarterly: 'Quarterly report',
  yearly: 'Yearly report',
}

/** Compute the real date window for a report period. */
function periodRange(key: PeriodKey): { range: Range; label: string } {
  const now = new Date()
  const to = now.toISOString()
  let from: Date
  let label: string
  switch (key) {
    case 'daily':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      label = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      break
    case 'weekly': {
      const d = new Date(now)
      d.setDate(d.getDate() - 6)
      from = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      label = `Last 7 days to ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`
      break
    }
    case 'monthly':
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      label = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      break
    case 'quarterly': {
      const q = Math.floor(now.getMonth() / 3)
      from = new Date(now.getFullYear(), q * 3, 1)
      label = `Q${q + 1} ${now.getFullYear()}`
      break
    }
    case 'yearly':
    default:
      from = new Date(now.getFullYear(), 0, 1)
      label = String(now.getFullYear())
      break
  }
  return { range: { from: from.toISOString(), to }, label }
}

function inWindow(dateISO: string, r: Range): boolean {
  const t = new Date(dateISO).getTime()
  return t >= new Date(r.from).getTime() && t <= new Date(r.to).getTime()
}

export default function Reports() {
  const db = useDB()
  const toast = useToast()
  const biz = store.activeBusiness()!
  const businessId = biz.id
  const currency = biz.currency

  const [period, setPeriod] = useState<PeriodKey>('monthly')
  const { range, label: periodLabel } = useMemo(() => periodRange(period), [period])

  const plan = planOf(db, businessId)
  const ent = entitlementsFor(plan)

  const summary = useMemo(() => moneySummary(db, businessId, range), [db, businessId, range])
  const owed = useMemo(() => outstanding(db, businessId), [db, businessId])

  const topProducts = useMemo(() => {
    const sales = scope.sales(db, businessId).filter((s) => s.status !== 'cancelled' && inWindow(s.sale_date, range))
    const saleIds = new Set(sales.map((s) => s.id))
    const items = scope.saleItems(db, businessId).filter((i) => saleIds.has(i.sale_id))
    const map = new Map<string, { name: string; qty: number; revenue: number }>()
    for (const it of items) {
      const key = it.product_id || `d:${it.description}`
      const cur = map.get(key) || { name: it.description, qty: 0, revenue: 0 }
      cur.qty += it.quantity
      cur.revenue += it.total
      map.set(key, cur)
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [db, businessId, range])

  const topCustomers = useMemo(() => {
    const sales = scope.sales(db, businessId).filter((s) => s.status !== 'cancelled' && inWindow(s.sale_date, range))
    const map = new Map<string, { name: string; revenue: number; count: number }>()
    for (const s of sales) {
      if (!s.customer_id) continue
      const cust = db.customers.find((c) => c.id === s.customer_id)
      const cur = map.get(s.customer_id) || { name: cust?.name || 'Customer', revenue: 0, count: 0 }
      cur.revenue += saleTotal(db, s)
      cur.count += 1
      map.set(s.customer_id, cur)
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [db, businessId, range])

  const debtors = useMemo(() => {
    return scope
      .customers(db, businessId)
      .map((c) => ({ name: c.name, balance: customerBalance(db, c.id).total }))
      .filter((d) => d.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5)
  }, [db, businessId])

  const reportName = `${biz.name} — ${PERIOD_WORD[period]}`
  const generated = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const netPositive = summary.net >= 0

  /* ---------------- export ---------------- */
  const exportHeaders = ['Metric', 'Value']
  const exportRows = (): (string | number)[][] => {
    const rows: (string | number)[][] = [
      ['Business', biz.name],
      ['Report', reportName],
      ['Period', periodLabel],
      ['Generated', generated],
      ['Money in', formatMoney(summary.moneyIn, currency)],
      ['  Payments received', formatMoney(summary.payments, currency)],
      ['  Other income', formatMoney(summary.income, currency)],
      ['Money out', formatMoney(summary.moneyOut, currency)],
      ['  Expenses', formatMoney(summary.expenses, currency)],
      ['  Drawings', formatMoney(summary.drawings, currency)],
      ['  Refunds', formatMoney(summary.refunds, currency)],
      ['Net', formatMoney(summary.net, currency)],
      ['Still owed to you', formatMoney(owed.total, currency)],
      ['Open balances', owed.count],
    ]
    if (topProducts.length) {
      rows.push(['', ''])
      rows.push(['Top products', 'Revenue'])
      for (const p of topProducts) rows.push([`  ${p.name} (${p.qty})`, formatMoney(p.revenue, currency)])
    }
    if (topCustomers.length) {
      rows.push(['', ''])
      rows.push(['Top customers', 'Sales value'])
      for (const c of topCustomers) rows.push([`  ${c.name} (${c.count})`, formatMoney(c.revenue, currency)])
    }
    return rows
  }
  const stamp = new Date().toISOString().slice(0, 10)
  const baseName = `kudii-report-${period}-${stamp}`

  const doCSV = () => {
    downloadCSV(`${baseName}.csv`, exportHeaders, exportRows())
    toast.push('Report downloaded')
  }
  const doExcel = () => {
    downloadExcel(`${baseName}.xls`, reportName, exportHeaders, exportRows())
    toast.push('Excel report downloaded')
  }
  const doPDF = () => {
    const ok = printTable({ title: reportName, subtitle: periodLabel, business: biz.name, currency }, exportHeaders, exportRows())
    if (!ok) toast.push('Allow pop-ups to save a PDF', 'error')
  }
  const doShare = async () => {
    const res = await shareCSV(`${baseName}.csv`, reportName, exportHeaders, exportRows())
    if (!res.ok) toast.push('Could not share that file', 'error')
    else if (res.shared) toast.push('Shared')
    else if (!res.cancelled) toast.push('Report downloaded')
  }
  const doWhatsApp = () => {
    const lines = [
      `*${reportName}*`,
      `Period: ${periodLabel}`,
      '',
      `Money in: ${formatMoney(summary.moneyIn, currency)}`,
      `Money out: ${formatMoney(summary.moneyOut, currency)}`,
      `Net: ${formatMoney(summary.net, currency)}`,
      `Still owed to you: ${formatMoney(owed.total, currency)} (${owed.count} open)`,
    ]
    if (topProducts[0]) lines.push('', `Top product: ${topProducts[0].name} — ${formatMoney(topProducts[0].revenue, currency)}`)
    lines.push('', 'Generated with KUDII — know your money.')
    const url = `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
    window.open(url, '_blank', 'noopener')
  }

  /* ---------------- gated: reports are a paid feature ---------------- */
  if (!ent.reports) {
    return (
      <div className="stack gap-6">
        <PageHead title="Reports" sub="Automated reports you own, built from your real numbers." />
        <SectionCard>
          <EmptyState
            icon={BarChart3}
            title="Reports are part of KUDII Go"
            message="Daily, weekly, monthly, quarterly and yearly reports — with export and WhatsApp sharing — unlock on KUDII Go and Plus. Your data is always safe; nothing is ever deleted."
            action={
              <Button variant="primary" icon={Sparkles} onClick={() => navigate('/settings?tab=plan')}>
                See plans
              </Button>
            }
          />
        </SectionCard>
      </div>
    )
  }

  const empty = summary.moneyIn === 0 && summary.moneyOut === 0 && topProducts.length === 0

  return (
    <div className="stack gap-6">
      <PageHead
        title="Reports"
        sub="Automated reports you own, built from your real numbers."
        actions={
          <Menu
            align="right"
            trigger={({ toggle }) => (
              <Button variant="soft" icon={Download} onClick={toggle}>
                Export
              </Button>
            )}
          >
            {(close) => (
              <>
                <MenuItem icon={Download} onClick={() => { doCSV(); close() }}>
                  Download CSV
                </MenuItem>
                <MenuItem icon={FileSpreadsheet} onClick={() => { doExcel(); close() }}>
                  Download Excel
                </MenuItem>
                <MenuItem icon={FileText} onClick={() => { doPDF(); close() }}>
                  Print / Save as PDF
                </MenuItem>
                <MenuItem icon={MessageCircle} onClick={() => { doWhatsApp(); close() }}>
                  Send on WhatsApp
                </MenuItem>
                <MenuItem icon={Share2} onClick={() => { doShare(); close() }}>
                  Share
                </MenuItem>
              </>
            )}
          </Menu>
        }
      />

      <div className="row-between wrap gap-3" style={{ alignItems: 'center' }}>
        <Segmented value={period} onChange={setPeriod} options={PERIODS} />
        <Badge tone="info">{PLANS[plan].name}</Badge>
      </div>

      {/* Business-owned report header */}
      <SectionCard>
        <div className="row-between wrap gap-3" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="text-xs muted" style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {biz.name}
            </div>
            <h2 style={{ margin: '4px 0 2px' }}>{PERIOD_WORD[period]}</h2>
            <div className="text-sm muted">
              {periodLabel} · generated {generated}
            </div>
          </div>
          <Button variant="soft" size="sm" icon={MessageCircle} onClick={doWhatsApp}>
            Send on WhatsApp
          </Button>
        </div>
      </SectionCard>

      {empty ? (
        <SectionCard>
          <EmptyState
            icon={BarChart3}
            title="Nothing recorded for this period yet"
            message="Once you record sales, payments or expenses, this report fills in automatically. There are no placeholder numbers here."
            action={
              <Button variant="primary" onClick={() => navigate('/')}>
                Go to Overview
              </Button>
            }
          />
        </SectionCard>
      ) : (
        <>
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
              <SectionCard title="Where the money went">
                <div className="stack gap-3">
                  <ReportLine label="Payments received" value={summary.payments} currency={currency} tone="success" />
                  <ReportLine label="Other income" value={summary.income} currency={currency} tone="success" />
                  <div className="divider" style={{ margin: 'var(--s-2) 0' }} />
                  <ReportLine label="Expenses" value={summary.expenses} currency={currency} tone="danger" />
                  <ReportLine label="Drawings" value={summary.drawings} currency={currency} tone="danger" />
                  <ReportLine label="Refunds" value={summary.refunds} currency={currency} tone="danger" />
                </div>
              </SectionCard>

              <SectionCard title="Top products this period" action={<Package size={16} style={{ color: 'var(--text-3)' }} />}>
                {topProducts.length === 0 ? (
                  <p className="text-sm muted">No product sales recorded in this period.</p>
                ) : (
                  <div className="stack gap-3">
                    {topProducts.map((p, i) => (
                      <div key={i} className="row-between" style={{ alignItems: 'baseline' }}>
                        <span className="text-sm truncate">{p.name}</span>
                        <span className="row gap-3" style={{ alignItems: 'baseline' }}>
                          <span className="text-xs muted">{p.qty} sold</span>
                          <span className="num" style={{ fontWeight: 600 }}>{formatMoney(p.revenue, currency)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="stack gap-5">
              <SectionCard title="Top customers this period" action={<Users size={16} style={{ color: 'var(--text-3)' }} />}>
                {topCustomers.length === 0 ? (
                  <p className="text-sm muted">No customer sales recorded in this period.</p>
                ) : (
                  <div className="stack gap-3">
                    {topCustomers.map((c, i) => (
                      <div key={i} className="row-between" style={{ alignItems: 'baseline' }}>
                        <span className="text-sm truncate">{c.name}</span>
                        <span className="row gap-3" style={{ alignItems: 'baseline' }}>
                          <span className="text-xs muted">{c.count} sale{c.count === 1 ? '' : 's'}</span>
                          <span className="num" style={{ fontWeight: 600 }}>{formatMoney(c.revenue, currency)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Who owes you" action={<Clock size={16} style={{ color: 'var(--text-3)' }} />}>
                {debtors.length === 0 ? (
                  <p className="text-sm muted">Everyone is paid up. Nothing outstanding.</p>
                ) : (
                  <div className="stack gap-3">
                    {debtors.map((d, i) => (
                      <div key={i} className="row-between" style={{ alignItems: 'baseline' }}>
                        <span className="text-sm truncate">{d.name}</span>
                        <span className="num" style={{ fontWeight: 600, color: 'var(--warning)' }}>{formatMoney(d.balance, currency)}</span>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" block onClick={() => navigate('/money')}>
                      Open collections
                    </Button>
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ReportLine({ label, value, currency, tone }: { label: string; value: number; currency: string; tone: 'success' | 'danger' }) {
  return (
    <div className="row-between" style={{ alignItems: 'baseline' }}>
      <span className="text-sm muted">{label}</span>
      <span className="num" style={{ fontWeight: 600, color: tone === 'success' ? 'var(--success)' : 'var(--danger)' }}>
        {formatMoney(value, currency)}
      </span>
    </div>
  )
}
