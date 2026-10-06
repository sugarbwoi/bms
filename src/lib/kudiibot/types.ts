/* ============================================================
   KUDIIBot — shared types
   The intelligence layer that reads the business and turns it
   into plain-language insight and action. Nothing here stores
   new financial data: it only reads what already exists.
   ============================================================ */

import type { ID, Minor } from '../types'

/* Where a statement came from. KUDII never blurs the line
   between a fact it read and a judgement it made. */
export type InsightSource =
  | 'known' // a fact read straight from a record
  | 'calculated' // arithmetic over records
  | 'interpretation' // a judgement over records
  | 'estimate' // an approximation (e.g. profit)
  | 'recommendation' // a suggested next step

export type InsightTone = 'neutral' | 'positive' | 'warning' | 'critical'

/* The six jobs KUDIIBot does for the owner. */
export type InsightCategory =
  | 'get_paid'
  | 'protect_profit'
  | 'save_customer'
  | 'protect_stock'
  | 'understand_month'
  | 'do_today'

export interface InsightAction {
  label: string
  /** navigate → go to a route; composer → open a form; capture → prefill the tell-KUDII box */
  kind: 'navigate' | 'composer' | 'capture'
  to?: string
  composer?: string
  params?: Record<string, any>
  prefill?: string
}

export interface Insight {
  id: string
  category: InsightCategory
  title: string
  detail: string
  source: InsightSource
  tone: InsightTone
  amount?: Minor | null
  action?: InsightAction
  /** priority for ordering — higher first */
  weight: number
}

export interface BriefingMetric {
  label: string
  value: string
  tone?: InsightTone
}

export interface Briefing {
  /** Chief-of-staff greeting, not "Welcome to KUDII". */
  greeting: string
  /** One-line state of the business. */
  headline: string
  /** Supporting sentences. */
  lines: string[]
  metrics: BriefingMetric[]
  /** The 1–4 things worth doing right now. */
  priorities: Insight[]
  /** True when there is genuinely nothing to flag (honest, not fake). */
  quiet: boolean
}

/* ---------------- Natural-language capture ---------------- */

export type DraftKind = 'sale' | 'expense' | 'income' | 'payment' | 'restock' | 'unknown'

export interface DraftLine {
  product_id: string | null
  description: string
  quantity: number
  unit_price: Minor
}

export interface CaptureDraft {
  kind: DraftKind
  raw: string
  /** 0–1: how sure KUDII is it understood. Drives the confirm UI. */
  confidence: number
  amount?: Minor | null
  quantity?: number
  description?: string
  category?: string
  method?: string
  customer_id?: string | null
  customer_name?: string | null
  product_id?: string | null
  product_name?: string | null
  items?: DraftLine[]
  /** Fields KUDII still needs before it can save. */
  missing: string[]
  /** A short, plain-language restatement for the confirmation card. */
  summary: string
}

export interface CaptureResult {
  ok: boolean
  error?: string
  data?: any
  /** what was actually written, for the honest success message */
  wrote?: string
}

export type { ID, Minor }
