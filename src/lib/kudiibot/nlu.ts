/* ============================================================
   KUDIIBot — Natural-language capture
   The user tells KUDII what happened in plain words. KUDII works
   out where the information belongs, shows a compact confirmation,
   and only then saves. It never guesses silently on money.
   ============================================================ */

import type { DB, Business, ID, Minor } from '../types'
import { store } from '../store'
import { scope, saleBalance } from '../derive'
import { parseAmount, toMinor, formatMoney, todayISODate } from '../utils'
import type { CaptureDraft, DraftKind, DraftLine, CaptureResult } from './types'

/* ---------------- number + money extraction ---------------- */

const CURRENCY_RE = /(?:₦|ngn|naira|n)\s*([\d][\d,]*(?:\.\d+)?)\s*(k|m|thousand|million)?/gi
const BARE_RE = /\b([\d][\d,]*(?:\.\d+)?)\s*(k|m|thousand|million)?\b/gi

function scale(n: number, suffix?: string): number {
  const s = (suffix || '').toLowerCase()
  if (s === 'k' || s === 'thousand') return n * 1000
  if (s === 'm' || s === 'million') return n * 1_000_000
  return n
}

interface NumHit {
  value: number
  index: number
  currency: boolean
}

function extractNumbers(text: string): NumHit[] {
  const hits: NumHit[] = []
  let m: RegExpExecArray | null
  CURRENCY_RE.lastIndex = 0
  while ((m = CURRENCY_RE.exec(text))) {
    hits.push({ value: scale(parseFloat(m[1].replace(/,/g, '')), m[2]), index: m.index, currency: true })
  }
  BARE_RE.lastIndex = 0
  while ((m = BARE_RE.exec(text))) {
    // skip if this position was already captured as a currency hit
    const idx = m.index
    if (hits.some((h) => Math.abs(h.index - idx) < 3)) continue
    hits.push({ value: scale(parseFloat(m[1].replace(/,/g, '')), m[2]), index: idx, currency: false })
  }
  return hits.sort((a, b) => a.index - b.index)
}

/* ---------------- quantity extraction ---------------- */

const UNIT_RE =
  /(\d+(?:\.\d+)?)\s*(x|×|pcs|pieces?|units?|bags?|cartons?|boxes?|dozens?|packs?|bottles?|kg|kilos?|litres?|liters?|sachets?|crates?|pairs?|sets?|rolls?|yards?|bundles?)/i

function extractQuantity(text: string): number | null {
  const m = text.match(UNIT_RE)
  if (!m) return null
  const n = parseFloat(m[1])
  return isNaN(n) ? null : n
}

/* ---------------- entity matching ---------------- */

function matchByName<T extends { id: ID; name: string }>(text: string, items: T[]): T | null {
  const lower = text.toLowerCase()
  let best: T | null = null
  for (const it of items) {
    const n = it.name.toLowerCase().trim()
    if (n.length < 2) continue
    if (lower.includes(n)) {
      if (!best || it.name.length > best.name.length) best = it
    }
  }
  return best
}

/** Pull a plausible product name from "3 bags of rice" → "rice". */
function guessProductName(text: string): string | null {
  const m = text.match(/(?:of|for)\s+([a-z0-9][a-z0-9\s'&-]{1,40})/i)
  if (m) {
    return m[1]
      .replace(/\b(to|from|for|at|today|yesterday|please|each|per)\b.*$/i, '')
      .trim()
  }
  return null
}

/* ---------------- intent detection ---------------- */

function detectKind(text: string): DraftKind {
  const t = text.toLowerCase()
  const has = (...words: string[]) => words.some((w) => new RegExp(`\\b${w}\\b`).test(t))

  // Restock: buying stock for inventory
  if (has('stock', 'restock', 'restocked', 'inventory') && has('bought', 'buy', 'add', 'added', 'received', 'supplied', 'restock', 'restocked', 'purchased')) {
    return 'restock'
  }
  // A customer paying you
  if (has('paid', 'pay', 'settled', 'cleared', 'remitted') && !has('i', 'we') && has('me', 'us', 'customer', 'he', 'she', 'they')) {
    return 'payment'
  }
  // Sale
  if (has('sold', 'sell', 'sale', 'sold')) return 'sale'
  // Income (money received that is not a customer settling a balance)
  if (has('received', 'earned', 'income', 'got', 'collected', 'consultation', 'service', 'delivery')) return 'income'
  // Expense
  if (has('spent', 'spend', 'bought', 'buy', 'purchased', 'paid', 'expense', 'rent', 'fuel', 'transport', 'salary', 'salaries', 'bill', 'bills', 'diesel', 'electricity', 'repairs')) {
    return 'expense'
  }
  return 'unknown'
}

const EXPENSE_CATEGORY_HINTS: [RegExp, string][] = [
  [/rent|shop rent|lease/i, 'Rent'],
  [/fuel|petrol|diesel|transport|bus|transport|delivery/i, 'Transport'],
  [/salary|salaries|wages|staff|worker/i, 'Salaries'],
  [/electric|electricity|nepa|water|utility|utilities|internet|data|airtime/i, 'Utilities'],
  [/material|materials|fabric|raw/i, 'Materials'],
  [/market|marketing|advert|ad|promo|flyer/i, 'Marketing'],
  [/repair|repairs|fix|maintenance/i, 'Repairs'],
  [/equipment|machine|tool/i, 'Equipment'],
]

function guessExpenseCategory(text: string): string {
  for (const [re, cat] of EXPENSE_CATEGORY_HINTS) if (re.test(text)) return cat
  return 'Other'
}

const METHOD_HINTS: [RegExp, string][] = [
  [/transfer|bank|online|credit alert/i, 'transfer'],
  [/pos|card|swipe/i, 'card'],
  [/cash|hand/i, 'cash'],
  [/ussd/i, 'ussd'],
]

function guessMethod(text: string): string {
  for (const [re, m] of METHOD_HINTS) if (re.test(text)) return m
  return 'cash'
}

/* ---------------- the parser ---------------- */

export function parseCapture(raw: string, db: DB, biz: Business): CaptureDraft {
  const text = (raw || '').trim()
  const kind = detectKind(text)
  const numbers = extractNumbers(text)
  const currencyHit = numbers.find((n) => n.currency)
  // amount: prefer the currency-tagged number, else the largest number
  const amountMajor = currencyHit ? currencyHit.value : numbers.length ? Math.max(...numbers.map((n) => n.value)) : null
  const amount: Minor | null = amountMajor != null ? toMinor(amountMajor, biz.currency) : null

  const products = scope.products(db, biz.id)
  const customers = scope.customers(db, biz.id).filter((c) => c.status === 'active')
  const product = matchByName(text, products)
  const customer = matchByName(text, customers)

  const quantity = extractQuantity(text)
  const method = guessMethod(text)
  const missing: string[] = []

  const base: CaptureDraft = {
    kind,
    raw: text,
    confidence: 0.4,
    amount,
    quantity: quantity ?? undefined,
    method,
    customer_id: customer?.id ?? null,
    customer_name: customer?.name ?? null,
    product_id: product?.id ?? null,
    product_name: product?.name ?? null,
    missing,
    summary: '',
  }

  switch (kind) {
    case 'sale': {
      const qty = quantity ?? 1
      const unitPrice = amount != null ? Math.round(amount / qty) : product?.selling_price ?? 0
      const description = product?.name || guessProductName(text) || 'Item'
      const line: DraftLine = {
        product_id: product?.id ?? null,
        description,
        quantity: qty,
        unit_price: unitPrice,
      }
      base.items = [line]
      base.description = description
      if (!product && !guessProductName(text)) missing.push('product')
      if (amount == null && !product) missing.push('amount')
      base.confidence = (product ? 0.35 : 0) + (amount != null ? 0.35 : 0) + (customer ? 0.2 : 0) + 0.1
      base.summary = `Sold ${qty} × ${description}${amount != null ? ` for ${formatMoney(amount, biz.currency)}` : ''}${customer ? ` to ${customer.name}` : ''}.`
      break
    }
    case 'payment': {
      if (amount == null) missing.push('amount')
      if (!customer) missing.push('customer')
      base.confidence = (amount != null ? 0.4 : 0) + (customer ? 0.4 : 0) + 0.1
      base.summary = `${customer ? customer.name : 'A customer'} paid ${amount != null ? formatMoney(amount, biz.currency) : '—'}${method ? ` by ${method}` : ''}.`
      break
    }
    case 'income': {
      if (amount == null) missing.push('amount')
      base.category = guessExpenseCategory(text) === 'Other' ? 'Sales' : guessExpenseCategory(text)
      base.description = guessProductName(text) || 'Income'
      base.confidence = (amount != null ? 0.5 : 0) + (customer ? 0.2 : 0) + 0.1
      base.summary = `Received ${amount != null ? formatMoney(amount, biz.currency) : '—'}${base.description ? ` for ${base.description}` : ''}.`
      break
    }
    case 'expense': {
      if (amount == null) missing.push('amount')
      base.category = guessExpenseCategory(text)
      base.description = guessProductName(text) || base.category
      base.confidence = (amount != null ? 0.5 : 0) + 0.2
      base.summary = `Spent ${amount != null ? formatMoney(amount, biz.currency) : '—'} on ${base.description}.`
      break
    }
    case 'restock': {
      const qty = quantity ?? 1
      const unitCost = amount != null ? Math.round(amount / qty) : product?.cost_price ?? 0
      base.quantity = qty
      if (!product) missing.push('product')
      if (amount == null && !product) missing.push('amount')
      base.confidence = (product ? 0.4 : 0) + (quantity != null ? 0.3 : 0) + (amount != null ? 0.2 : 0)
      base.summary = `Restocked ${qty} × ${product ? product.name : 'item'}${amount != null ? ` for ${formatMoney(amount, biz.currency)}` : ''}.`
      break
    }
    default: {
      base.confidence = 0.1
      base.summary = 'KUDII is not sure what this is yet.'
      missing.push('intent')
    }
  }

  base.confidence = Math.max(0, Math.min(1, base.confidence))
  return base
}

/* ---------------- the committer ---------------- */

export function commitDraft(draft: CaptureDraft, db: DB, biz: Business): CaptureResult {
  switch (draft.kind) {
    case 'sale': {
      const items = (draft.items || []).filter((i) => i.quantity > 0 && i.unit_price >= 0)
      if (!items.length) return { ok: false, error: 'Add at least one item.' }
      const res = store.createSale({
        customer_id: draft.customer_id || null,
        items: items.map((i) => ({
          product_id: i.product_id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        sale_date: todayISODate(),
      })
      if (!res.ok) return { ok: false, error: res.error }
      const total = items.reduce((a, i) => a + i.quantity * i.unit_price, 0)
      return { ok: true, data: res.data, wrote: `Sale recorded for ${formatMoney(total, biz.currency)}.` }
    }
    case 'payment': {
      if (!draft.amount || draft.amount <= 0) return { ok: false, error: 'Enter an amount greater than zero.' }
      // Smart default: allocate to the customer's oldest unpaid sale, if any.
      let target: { type: 'sale' | 'invoice'; id: ID } | null = null
      if (draft.customer_id) {
        const open = scope
          .sales(db, biz.id)
          .filter((s) => s.customer_id === draft.customer_id && s.status !== 'cancelled' && saleBalance(db, s) > 0)
          .sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime())
        if (open[0]) target = { type: 'sale', id: open[0].id }
      }
      const res = store.recordPayment({
        customer_id: draft.customer_id || null,
        target,
        amount: draft.amount,
        method: draft.method || 'cash',
        payment_date: todayISODate(),
        notes: 'Recorded by KUDIIBot',
      })
      if (!res.ok) return { ok: false, error: res.error }
      return {
        ok: true,
        data: res.data,
        wrote: `Payment of ${formatMoney(draft.amount, biz.currency)} recorded${draft.customer_name ? ` from ${draft.customer_name}` : ''}.`,
      }
    }
    case 'income': {
      if (!draft.amount || draft.amount <= 0) return { ok: false, error: 'Enter an amount greater than zero.' }
      const res = store.recordIncome({
        category: draft.category || 'Sales',
        amount: draft.amount,
        description: draft.description || 'Income',
        transaction_date: todayISODate(),
        payment_method: draft.method || 'cash',
        customer_id: draft.customer_id || null,
      })
      if (!res.ok) return { ok: false, error: res.error }
      return { ok: true, data: res.data, wrote: `Income of ${formatMoney(draft.amount, biz.currency)} recorded.` }
    }
    case 'expense': {
      if (!draft.amount || draft.amount <= 0) return { ok: false, error: 'Enter an amount greater than zero.' }
      const res = store.recordExpense({
        category: draft.category || 'Other',
        amount: draft.amount,
        description: draft.description || draft.category || 'Expense',
        transaction_date: todayISODate(),
        payment_method: draft.method || 'cash',
      })
      if (!res.ok) return { ok: false, error: res.error }
      return { ok: true, data: res.data, wrote: `Expense of ${formatMoney(draft.amount, biz.currency)} recorded.` }
    }
    case 'restock': {
      if (!draft.product_id) return { ok: false, error: 'Which product did you restock?' }
      const qty = draft.quantity || 1
      const res = store.restock(draft.product_id, qty, {
        reason: 'Restock recorded by KUDIIBot',
        cost_price: draft.amount && qty ? Math.round(draft.amount / qty) : undefined,
      })
      if (!res.ok) return { ok: false, error: res.error }
      return { ok: true, data: res.data, wrote: `Restocked ${qty} × ${draft.product_name || 'item'}.` }
    }
    default:
      return { ok: false, error: 'KUDII is not sure what this is yet. Try: "sold 2 bags of rice for 5000".' }
  }
}

/** Parse a plain amount string typed into the confirmation card. */
export function amountFromInput(v: string, biz: Business): Minor | null {
  return parseAmount(v, biz.currency)
}
