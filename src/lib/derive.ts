/* ============================================================
   KUDII — Derived State
   Every total here is computed from underlying events.
   Nothing derived is stored as an editable source of truth.
   ============================================================ */

import type {
  DB,
  ID,
  Minor,
  Sale,
  SaleItem,
  Job,
  Invoice,
  InvoiceItem,
  Product,
  Payment,
  PlanId,
} from './types'
import { PLANS } from './plans'
import { startOfMonth, sum, daysAgo } from './utils'

/* ---------------- scoped accessors ---------------- */
export const scope = {
  customers: (db: DB, b: ID) => db.customers.filter((x) => x.business_id === b),
  products: (db: DB, b: ID) => db.products.filter((x) => x.business_id === b),
  jobs: (db: DB, b: ID) => db.jobs.filter((x) => x.business_id === b),
  sales: (db: DB, b: ID) => db.sales.filter((x) => x.business_id === b),
  saleItems: (db: DB, b: ID) => db.saleItems.filter((x) => x.business_id === b),
  transactions: (db: DB, b: ID) => db.transactions.filter((x) => x.business_id === b),
  payments: (db: DB, b: ID) => db.payments.filter((x) => x.business_id === b),
  allocations: (db: DB, b: ID) => db.allocations.filter((x) => x.business_id === b),
  movements: (db: DB, b: ID) => db.stockMovements.filter((x) => x.business_id === b),
  invoices: (db: DB, b: ID) => db.invoices.filter((x) => x.business_id === b),
  invoiceItems: (db: DB, b: ID) => db.invoiceItems.filter((x) => x.business_id === b),
  receipts: (db: DB, b: ID) => db.receipts.filter((x) => x.business_id === b),
  activities: (db: DB, b: ID) => db.activities.filter((x) => x.business_id === b),
  goals: (db: DB, b: ID) => db.goals.filter((x) => x.business_id === b),
}

/* ---------------- Sale maths ---------------- */
export function saleItems(db: DB, saleId: ID): SaleItem[] {
  return db.saleItems.filter((i) => i.sale_id === saleId)
}
export function saleSubtotal(db: DB, saleId: ID): Minor {
  return sum(saleItems(db, saleId), (i) => i.total)
}
export function saleTotal(db: DB, sale: Sale): Minor {
  return Math.max(0, saleSubtotal(db, sale.id) - sale.discount)
}
export function salePaid(db: DB, saleId: ID): Minor {
  return sum(
    db.allocations.filter((a) => a.sale_id === saleId),
    (a) => a.amount,
  )
}
export function saleBalance(db: DB, sale: Sale): Minor {
  return saleTotal(db, sale) - salePaid(db, sale.id)
}
export type PaymentState = 'unpaid' | 'partial' | 'paid' | 'overpaid'
export function paymentState(total: Minor, paid: Minor): PaymentState {
  if (paid <= 0) return 'unpaid'
  if (paid < total) return 'partial'
  if (paid > total) return 'overpaid'
  return 'paid'
}
export function salePaymentState(db: DB, sale: Sale): PaymentState {
  if (sale.status === 'cancelled') return 'unpaid'
  return paymentState(saleTotal(db, sale), salePaid(db, sale.id))
}

/* ---------------- Job maths ---------------- */
export function jobPaid(db: DB, jobId: ID): Minor {
  return sum(
    db.allocations.filter((a) => a.job_id === jobId),
    (a) => a.amount,
  )
}
export function jobBalance(db: DB, job: Job): Minor {
  return Math.max(0, job.amount - jobPaid(db, job.id))
}
export function jobPaymentState(db: DB, job: Job): PaymentState {
  return paymentState(job.amount, jobPaid(db, job.id))
}

/* ---------------- Invoice maths ---------------- */
export function invoiceItems(db: DB, invoiceId: ID): InvoiceItem[] {
  return db.invoiceItems.filter((i) => i.invoice_id === invoiceId)
}
export function invoiceSubtotal(db: DB, invoiceId: ID): Minor {
  return sum(invoiceItems(db, invoiceId), (i) => i.total)
}
export function invoiceTotal(db: DB, invoice: Invoice): Minor {
  return Math.max(0, invoiceSubtotal(db, invoice.id) - invoice.discount)
}
export function invoicePaid(db: DB, invoiceId: ID): Minor {
  return sum(
    db.allocations.filter((a) => a.invoice_id === invoiceId),
    (a) => a.amount,
  )
}
export function invoiceBalance(db: DB, invoice: Invoice): Minor {
  return Math.max(0, invoiceTotal(db, invoice) - invoicePaid(db, invoice.id))
}
export function invoiceEffectiveStatus(db: DB, invoice: Invoice): Invoice['status'] {
  if (invoice.status === 'draft' || invoice.status === 'cancelled') return invoice.status
  const total = invoiceTotal(db, invoice)
  const paid = invoicePaid(db, invoice.id)
  if (paid >= total && total > 0) return 'paid'
  if (paid > 0) return 'partially_paid'
  if (invoice.due_date && new Date(invoice.due_date).getTime() < Date.now()) return 'overdue'
  return 'issued'
}

/* ---------------- Customer maths ---------------- */
export interface CustomerBalance {
  sales: Minor
  jobs: Minor
  invoices: Minor
  total: Minor
  paid: Minor
}
export function customerBalance(db: DB, customerId: ID): CustomerBalance {
  const s = db.sales.filter((x) => x.customer_id === customerId && x.status !== 'cancelled')
  const j = db.jobs.filter((x) => x.customer_id === customerId && x.status !== 'cancelled')
  const inv = db.invoices.filter(
    (x) => x.customer_id === customerId && x.status !== 'cancelled' && x.status !== 'draft',
  )
  const salesBal = sum(s, (x) => Math.max(0, saleBalance(db, x)))
  const jobsBal = sum(j, (x) => Math.max(0, jobBalance(db, x)))
  const invBal = sum(inv, (x) => invoiceBalance(db, x))
  const paid =
    sum(s, (x) => salePaid(db, x.id)) +
    sum(j, (x) => jobPaid(db, x.id)) +
    sum(inv, (x) => invoicePaid(db, x.id))
  return { sales: salesBal, jobs: jobsBal, invoices: invBal, total: salesBal + jobsBal + invBal, paid }
}

/* ---------------- Inventory ---------------- */
export function isLowStock(p: Product): boolean {
  return p.status === 'active' && p.stock_quantity <= p.low_stock_threshold
}
export function lowStockProducts(db: DB, businessId: ID): Product[] {
  return scope
    .products(db, businessId)
    .filter(isLowStock)
    .sort((a, b) => a.stock_quantity - b.stock_quantity)
}
export function inventoryValue(db: DB, businessId: ID): Minor {
  return sum(
    scope.products(db, businessId).filter((p) => p.status === 'active'),
    (p) => p.stock_quantity * p.cost_price,
  )
}

/* ---------------- Money aggregation ---------------- */
export interface Range {
  from: string
  to: string
}
function inRange(dateISO: string, r: Range): boolean {
  const t = new Date(dateISO).getTime()
  return t >= new Date(r.from).getTime() && t <= new Date(r.to).getTime()
}

export interface MoneySummary {
  moneyIn: Minor
  moneyOut: Minor
  net: Minor
  income: Minor
  payments: Minor
  expenses: Minor
  drawings: Minor
  refunds: Minor
}

export function moneySummary(db: DB, businessId: ID, range: Range): MoneySummary {
  const txns = scope.transactions(db, businessId).filter((t) => inRange(t.transaction_date, range))
  const pays = scope
    .payments(db, businessId)
    .filter((p) => p.status !== 'reversed' && inRange(p.payment_date, range))

  const income = sum(txns.filter((t) => t.type === 'income' && t.status === 'posted'), (t) => t.amount)
  const payments = sum(pays, (p) => p.amount)
  const expenses = sum(txns.filter((t) => t.type === 'expense' && t.status === 'posted'), (t) => t.amount)
  const drawings = sum(txns.filter((t) => t.type === 'drawings' && t.status === 'posted'), (t) => t.amount)
  const refunds = sum(txns.filter((t) => t.type === 'refund' && t.status === 'posted'), (t) => t.amount)

  const moneyIn = income + payments
  const moneyOut = expenses + drawings + refunds
  return { moneyIn, moneyOut, net: moneyIn - moneyOut, income, payments, expenses, drawings, refunds }
}

/* ---------------- Outstanding ---------------- */
export interface Outstanding {
  sales: Minor
  jobs: Minor
  invoices: Minor
  total: Minor
  count: number
}
export function outstanding(db: DB, businessId: ID): Outstanding {
  const sales = scope.sales(db, businessId).filter((s) => s.status !== 'cancelled')
  const jobs = scope.jobs(db, businessId).filter((j) => j.status !== 'cancelled')
  const invs = scope
    .invoices(db, businessId)
    .filter((i) => i.status !== 'cancelled' && i.status !== 'draft')

  let count = 0
  const salesBal = sum(sales, (s) => {
    const b = Math.max(0, saleBalance(db, s))
    if (b > 0) count++
    return b
  })
  const jobsBal = sum(jobs, (j) => {
    const b = Math.max(0, jobBalance(db, j))
    if (b > 0) count++
    return b
  })
  const invBal = sum(invs, (i) => {
    const b = invoiceBalance(db, i)
    if (b > 0) count++
    return b
  })
  return { sales: salesBal, jobs: jobsBal, invoices: invBal, total: salesBal + jobsBal + invBal, count }
}

/* ---------------- Dashboard Pulse ---------------- */
export interface Pulse {
  moneyIn: Minor
  moneyOut: Minor
  outstanding: Minor
  activeJobs: number
  moneyInDelta: number // % vs previous period
  moneyOutDelta: number
  newCustomers: number
  salesCount: number
}

function prevRange(r: Range): Range {
  const from = new Date(r.from).getTime()
  const to = new Date(r.to).getTime()
  const span = to - from
  return { from: new Date(from - span).toISOString(), to: new Date(from).toISOString() }
}

export function pulse(db: DB, businessId: ID, range: Range): Pulse {
  const cur = moneySummary(db, businessId, range)
  const prev = moneySummary(db, businessId, prevRange(range))
  const out = outstanding(db, businessId)
  const activeJobs = scope
    .jobs(db, businessId)
    .filter((j) => j.status === 'pending' || j.status === 'in_progress').length
  const newCustomers = scope.customers(db, businessId).filter((c) => inRange(c.created_at, range)).length
  const salesCount = scope.sales(db, businessId).filter((s) => inRange(s.sale_date, range)).length
  const delta = (a: number, b: number) => (b <= 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100))
  return {
    moneyIn: cur.moneyIn,
    moneyOut: cur.moneyOut,
    outstanding: out.total,
    activeJobs,
    moneyInDelta: delta(cur.moneyIn, prev.moneyIn),
    moneyOutDelta: delta(cur.moneyOut, prev.moneyOut),
    newCustomers,
    salesCount,
  }
}

/* ---------------- Progress ---------------- */
export interface ProgressMetrics {
  jobsCompleted: number
  jobsActive: number
  revenueReceived: Minor
  outstanding: Minor
  salesCount: number
  newCustomers: number
  lowStockCount: number
  topProducts: { product: Product; qty: number; revenue: Minor }[]
  monthlySeries: { label: string; value: Minor }[]
}

export function progress(db: DB, businessId: ID, range: Range): ProgressMetrics {
  const jobs = scope.jobs(db, businessId)
  const sales = scope.sales(db, businessId).filter((s) => s.status !== 'cancelled')
  const money = moneySummary(db, businessId, range)

  // top products by units sold in range
  const items = scope.saleItems(db, businessId)
  const saleById = new Map(sales.map((s) => [s.id, s]))
  const byProduct = new Map<ID, { qty: number; revenue: Minor }>()
  for (const it of items) {
    const sale = saleById.get(it.sale_id)
    if (!sale || !inRange(sale.sale_date, range)) continue
    if (!it.product_id) continue
    const cur = byProduct.get(it.product_id) || { qty: 0, revenue: 0 }
    cur.qty += it.quantity
    cur.revenue += it.total
    byProduct.set(it.product_id, cur)
  }
  const topProducts = [...byProduct.entries()]
    .map(([pid, v]) => ({ product: db.products.find((p) => p.id === pid)!, ...v }))
    .filter((x) => x.product)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // last 6 months revenue received
  const series: { label: string; value: Minor }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const from = d.toISOString()
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const m = moneySummary(db, businessId, { from, to })
    series.push({ label: d.toLocaleString(undefined, { month: 'short' }), value: m.moneyIn })
  }

  return {
    jobsCompleted: jobs.filter((j) => j.status === 'completed').length,
    jobsActive: jobs.filter((j) => j.status === 'pending' || j.status === 'in_progress').length,
    revenueReceived: money.moneyIn,
    outstanding: outstanding(db, businessId).total,
    salesCount: sales.filter((s) => inRange(s.sale_date, range)).length,
    newCustomers: scope.customers(db, businessId).filter((c) => inRange(c.created_at, range)).length,
    lowStockCount: lowStockProducts(db, businessId).length,
    topProducts,
    monthlySeries: series,
  }
}

/* ---------------- Goals ---------------- */
export function goalProgress(db: DB, goal: { type: string; target_amount: Minor; start_date: string; end_date: string }) {
  const range = { from: goal.start_date, to: goal.end_date }
  let current = 0
  if (goal.type === 'revenue') {
    current = moneySummary(db, db.session.activeBusinessId || '', range).moneyIn
  } else if (goal.type === 'jobs') {
    current = scope
      .jobs(db, db.session.activeBusinessId || '')
      .filter((j) => j.status === 'completed' && inRange(j.completed_at || j.updated_at, range)).length
  } else if (goal.type === 'sales') {
    current = scope.sales(db, db.session.activeBusinessId || '').filter((s) => inRange(s.sale_date, range)).length
  } else if (goal.type === 'customers') {
    current = scope.customers(db, db.session.activeBusinessId || '').filter((c) => inRange(c.created_at, range)).length
  }
  const target = goal.target_amount || 0
  return { current, target, pct: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0 }
}

/* ---------------- Usage & Limits ---------------- */
export interface Usage {
  products: number
  customers: number
  active_jobs: number
  transactions_this_month: number
  businesses: number
}
export function usage(db: DB, businessId: ID, userId: ID): Usage {
  const monthStart = startOfMonth()
  const txns = scope
    .transactions(db, businessId)
    .filter((t) => new Date(t.transaction_date).getTime() >= new Date(monthStart).getTime())
  const pays = scope
    .payments(db, businessId)
    .filter((p) => new Date(p.payment_date).getTime() >= new Date(monthStart).getTime())
  return {
    products: scope.products(db, businessId).filter((p) => p.status === 'active').length,
    customers: scope.customers(db, businessId).filter((c) => c.status === 'active').length,
    active_jobs: scope
      .jobs(db, businessId)
      .filter((j) => j.status === 'pending' || j.status === 'in_progress').length,
    transactions_this_month: txns.length + pays.length,
    businesses: db.memberships.filter((m) => m.user_id === userId && m.status === 'active').length,
  }
}

export function limitStatus(used: number, limit: number | null): { used: number; limit: number | null; pct: number; atLimit: boolean } {
  if (limit === null) return { used, limit: null, pct: 0, atLimit: false }
  return { used, limit, pct: Math.min(100, Math.round((used / limit) * 100)), atLimit: used >= limit }
}

/* ---------------- Business type inference (adaptive dashboard) ---------------- */
export type BusinessFlavor = 'product' | 'service' | 'mixed'
export function businessFlavor(db: DB, businessId: ID): BusinessFlavor {
  const products = scope.products(db, businessId).length
  const sales = scope.sales(db, businessId).length
  const jobs = scope.jobs(db, businessId).length
  const productScore = products + sales * 2
  const serviceScore = jobs * 2
  if (productScore === 0 && serviceScore === 0) return 'mixed'
  if (productScore > serviceScore * 1.3) return 'product'
  if (serviceScore > productScore * 1.3) return 'service'
  return 'mixed'
}

/* ---------------- Recent helpers ---------------- */
export function recentSales(db: DB, businessId: ID, n = 5): Sale[] {
  return scope
    .sales(db, businessId)
    .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
    .slice(0, n)
}
export function recentActivity(db: DB, businessId: ID, n = 8) {
  return scope
    .activities(db, businessId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, n)
}
export function todayActivity(db: DB, businessId: ID) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return scope
    .activities(db, businessId)
    .filter((a) => new Date(a.created_at).getTime() >= start.getTime())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}
export function outstandingWork(db: DB, businessId: ID) {
  const jobs = scope
    .jobs(db, businessId)
    .filter((j) => j.status === 'pending' || j.status === 'in_progress')
    .map((j) => ({ kind: 'job' as const, ref: j, balance: jobBalance(db, j), due: j.due_date }))
  const sales = scope
    .sales(db, businessId)
    .filter((s) => s.status !== 'cancelled' && saleBalance(db, s) > 0)
    .map((s) => ({ kind: 'sale' as const, ref: s, balance: saleBalance(db, s), due: null as string | null }))
  return [...jobs, ...sales]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 6)
}

export function planOf(db: DB, businessId: ID): PlanId {
  const sub = db.subscriptions.find((s) => s.business_id === businessId)
  if (!sub) return 'go'
  if (sub.status === 'expired' || sub.status === 'cancelled') return 'go'
  return sub.plan
}
export function planLimitsOf(db: DB, businessId: ID) {
  return PLANS[planOf(db, businessId)].limits
}

export { inRange }
