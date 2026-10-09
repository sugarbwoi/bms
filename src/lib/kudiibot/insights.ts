/* ============================================================
   KUDIIBot — Insight engine
   Reads the business (via the same derived state the rest of
   KUDII uses) and produces ranked, plain-language insights.
   Every insight is tagged with where it came from so the owner
   always knows fact from judgement.
   ============================================================ */

import type { DB, ID, Minor, Business } from '../types'
import {
  scope,
  moneySummary,
  outstanding,
  lowStockProducts,
  saleBalance,
  saleTotal,
  invoiceBalance,
  invoiceEffectiveStatus,
  isLowStock,
} from '../derive'
import { formatMoney, startOfMonth, daysAgo, sum } from '../utils'
import type { Insight, InsightCategory } from './types'

const DAY = 86400000

function money(v: Minor, biz: Business) {
  return formatMoney(v, biz.currency)
}

/** Whole-month range for "this month". */
function monthRange() {
  const from = startOfMonth()
  const to = new Date().toISOString()
  return { from, to }
}

/** Last sale date (ms) per customer, for dormancy detection. */
function lastSaleByCustomer(db: DB, businessId: ID): Map<ID, number> {
  const map = new Map<ID, number>()
  for (const s of scope.sales(db, businessId)) {
    if (s.status === 'cancelled' || !s.customer_id) continue
    const t = new Date(s.sale_date).getTime()
    if (!map.has(s.customer_id) || t > (map.get(s.customer_id) as number)) map.set(s.customer_id, t)
  }
  return map
}

/* ---------------- GET PAID ---------------- */
function getPaidInsights(db: DB, biz: Business): Insight[] {
  const out: Insight[] = []
  const o = outstanding(db, biz.id)

  if (o.total > 0) {
    out.push({
      id: 'get-paid-total',
      category: 'get_paid',
      title: `${money(o.total, biz)} is still owed to you`,
      detail: `Across ${o.count} unpaid ${o.count === 1 ? 'sale or invoice' : 'sales and invoices'}. Collecting this is the fastest money you can make today.`,
      source: 'calculated',
      tone: o.total > 0 ? 'warning' : 'neutral',
      amount: o.total,
      action: { label: 'See who owes', kind: 'navigate', to: '/money' },
      weight: 90,
    })
  }

  // Overdue invoices (due date passed, balance remaining)
  const overdue = scope
    .invoices(db, biz.id)
    .filter((i) => invoiceEffectiveStatus(db, i) === 'overdue' && invoiceBalance(db, i) > 0)
  if (overdue.length) {
    const total = sum(overdue, (i) => invoiceBalance(db, i))
    out.push({
      id: 'get-paid-overdue',
      category: 'get_paid',
      title: `${overdue.length} overdue ${overdue.length === 1 ? 'invoice' : 'invoices'}`,
      detail: `${money(total, biz)} past its due date. A short reminder usually settles these.`,
      source: 'calculated',
      tone: 'critical',
      amount: total,
      action: { label: 'Open invoices', kind: 'navigate', to: '/invoices' },
      weight: 95,
    })
  }

  // Biggest single debtor
  const debtors = scope
    .customers(db, biz.id)
    .map((c) => {
      const sales = scope
        .sales(db, biz.id)
        .filter((s) => s.customer_id === c.id && s.status !== 'cancelled')
      const bal = sum(sales, (s) => Math.max(0, saleBalance(db, s)))
      return { c, bal }
    })
    .filter((d) => d.bal > 0)
    .sort((a, b) => b.bal - a.bal)
  if (debtors.length && debtors[0].bal > 0) {
    const top = debtors[0]
    out.push({
      id: 'get-paid-top',
      category: 'get_paid',
      title: `${top.c.name} owes the most`,
      detail: `${money(top.bal, biz)} outstanding. A friendly nudge to ${top.c.name} could bring this in.`,
      source: 'known',
      tone: 'neutral',
      amount: top.bal,
      action: { label: `Open ${top.c.name}`, kind: 'navigate', to: `/customers/${top.c.id}` },
      weight: 60,
    })
  }

  return out
}

/* ---------------- PROTECT PROFIT ---------------- */
function protectProfitInsights(db: DB, biz: Business): Insight[] {
  const out: Insight[] = []

  // Selling below cost — a real, verifiable money leak
  const belowCost = scope
    .products(db, biz.id)
    .filter((p) => p.status === 'active' && p.cost_price > 0 && p.selling_price < p.cost_price)
  if (belowCost.length) {
    out.push({
      id: 'profit-below-cost',
      category: 'protect_profit',
      title: `${belowCost.length} ${belowCost.length === 1 ? 'product is' : 'products are'} priced below cost`,
      detail: `${belowCost
        .slice(0, 3)
        .map((p) => p.name)
        .join(', ')}${belowCost.length > 3 ? ' and more' : ''} sell for less than they cost you. Every sale loses money.`,
      source: 'known',
      tone: 'critical',
      action: { label: 'Review pricing', kind: 'navigate', to: '/products' },
      weight: 92,
    })
  }

  // Thin margins — interpretation
  const thin = scope
    .products(db, biz.id)
    .filter(
      (p) =>
        p.status === 'active' &&
        p.cost_price > 0 &&
        p.selling_price >= p.cost_price &&
        (p.selling_price - p.cost_price) / p.selling_price < 0.1,
    )
  if (thin.length) {
    out.push({
      id: 'profit-thin-margin',
      category: 'protect_profit',
      title: `${thin.length} ${thin.length === 1 ? 'product has' : 'products have'} a thin margin`,
      detail: `Under 10% between cost and price. One discount or price rise from a supplier could wipe the profit out.`,
      source: 'interpretation',
      tone: 'warning',
      action: { label: 'Review products', kind: 'navigate', to: '/products' },
      weight: 55,
    })
  }

  // Refunds this month — money that went back out
  const refunds = scope
    .transactions(db, biz.id)
    .filter((t) => t.type === 'refund' && t.status === 'posted' && new Date(t.transaction_date).getTime() >= new Date(startOfMonth()).getTime())
  if (refunds.length) {
    const total = sum(refunds, (t) => t.amount)
    out.push({
      id: 'profit-refunds',
      category: 'protect_profit',
      title: `${money(total, biz)} refunded this month`,
      detail: `Across ${refunds.length} ${refunds.length === 1 ? 'refund' : 'refunds'}. Worth a look at what is coming back and why.`,
      source: 'calculated',
      tone: 'warning',
      amount: total,
      action: { label: 'See transactions', kind: 'navigate', to: '/transactions' },
      weight: 50,
    })
  }

  return out
}

/* ---------------- SAVE THE CUSTOMER ---------------- */
function saveCustomerInsights(db: DB, biz: Business): Insight[] {
  const out: Insight[] = []
  const customers = scope.customers(db, biz.id).filter((c) => c.status === 'active')
  const last = lastSaleByCustomer(db, biz.id)
  const dormantThreshold = Date.now() - 30 * DAY

  const dormant = customers
    .filter((c) => last.has(c.id) && (last.get(c.id) as number) < dormantThreshold)
    .map((c) => ({ c, days: Math.round((Date.now() - (last.get(c.id) as number)) / DAY) }))
    .sort((a, b) => b.days - a.days)

  if (dormant.length) {
    const top = dormant[0]
    out.push({
      id: 'customer-dormant',
      category: 'save_customer',
      title: `${dormant.length} ${dormant.length === 1 ? 'customer has' : 'customers have'} gone quiet`,
      detail: `${top.c.name} last bought ${top.days} days ago. A quick message can bring a regular back before they forget you.`,
      source: 'calculated',
      tone: 'warning',
      action: { label: 'Open customers', kind: 'navigate', to: '/customers' },
      weight: 65,
    })
  }

  // New customers this month — celebrate honestly
  const newCustomers = customers.filter((c) => new Date(c.created_at).getTime() >= new Date(startOfMonth()).getTime())
  if (newCustomers.length >= 3) {
    out.push({
      id: 'customer-new',
      category: 'save_customer',
      title: `${newCustomers.length} new customers this month`,
      detail: `Your customer base is growing. Keep them close — repeat customers are the cheapest sales you will ever make.`,
      source: 'calculated',
      tone: 'positive',
      action: { label: 'See customers', kind: 'navigate', to: '/customers' },
      weight: 40,
    })
  }

  return out
}

/* ---------------- PROTECT STOCK ---------------- */
function protectStockInsights(db: DB, biz: Business): Insight[] {
  const out: Insight[] = []
  const low = lowStockProducts(db, biz.id)
  const outOfStock = low.filter((p) => p.stock_quantity <= 0)
  const runningLow = low.filter((p) => p.stock_quantity > 0)

  if (outOfStock.length) {
    out.push({
      id: 'stock-out',
      category: 'protect_stock',
      title: `${outOfStock.length} ${outOfStock.length === 1 ? 'product is' : 'products are'} out of stock`,
      detail: `${outOfStock
        .slice(0, 3)
        .map((p) => p.name)
        .join(', ')}${outOfStock.length > 3 ? ' and more' : ''} cannot be sold right now. Restock before you lose a sale.`,
      source: 'known',
      tone: 'critical',
      action: { label: 'Restock now', kind: 'navigate', to: '/products' },
      weight: 88,
    })
  }
  if (runningLow.length) {
    out.push({
      id: 'stock-low',
      category: 'protect_stock',
      title: `${runningLow.length} ${runningLow.length === 1 ? 'product is' : 'products are'} running low`,
      detail: `${runningLow
        .slice(0, 3)
        .map((p) => p.name)
        .join(', ')}${runningLow.length > 3 ? ' and more' : ''} ${runningLow.length === 1 ? 'is' : 'are'} at or below your alert level.`,
      source: 'calculated',
      tone: 'warning',
      action: { label: 'Review stock', kind: 'navigate', to: '/products' },
      weight: 70,
    })
  }

  return out
}

/* ---------------- UNDERSTAND THE MONTH ---------------- */
function monthInsights(db: DB, biz: Business): Insight[] {
  const out: Insight[] = []
  const m = moneySummary(db, biz.id, monthRange())
  if (m.moneyIn === 0 && m.moneyOut === 0) return out

  const netWord = m.net >= 0 ? 'ahead' : 'behind'
  out.push({
    id: 'month-summary',
    category: 'understand_month',
    title: `This month you are ${money(Math.abs(m.net), biz)} ${netWord}`,
    detail: `${money(m.moneyIn, biz)} came in and ${money(m.moneyOut, biz)} went out. ${m.net >= 0 ? 'You are keeping more than you spend.' : 'Spending is ahead of income so far.'}`,
    source: 'calculated',
    tone: m.net >= 0 ? 'positive' : 'warning',
    amount: m.net,
    action: { label: 'Open Money', kind: 'navigate', to: '/money' },
    weight: 45,
  })

  return out
}

/* ---------------- PUBLIC: build + rank ---------------- */
export function buildInsights(db: DB, biz: Business): Insight[] {
  const all: Insight[] = [
    ...getPaidInsights(db, biz),
    ...protectProfitInsights(db, biz),
    ...saveCustomerInsights(db, biz),
    ...protectStockInsights(db, biz),
    ...monthInsights(db, biz),
  ]
  return all.sort((a, b) => b.weight - a.weight)
}

export function insightsByCategory(insights: Insight[], category: InsightCategory): Insight[] {
  return insights.filter((i) => i.category === category)
}

/** A tiny, honest health read used by the ✦ control badge. */
export function attentionCount(insights: Insight[]): number {
  return insights.filter((i) => i.tone === 'critical' || i.tone === 'warning').length
}
