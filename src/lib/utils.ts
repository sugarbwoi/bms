/* ============================================================
   KUDII — Utilities: money, ids, dates, formatting
   ============================================================ */

import type { Minor } from './types'

/* ---------------- IDs ---------------- */
export function uid(prefix = 'id'): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return `${prefix}_${rnd}`
}

/* ---------------- Money (integer minor units) ---------------- */

const CURRENCY_DECIMALS: Record<string, number> = {
  NGN: 2,
  USD: 2,
  GBP: 2,
  EUR: 2,
  GHS: 2,
  KES: 2,
  ZAR: 2,
  JPY: 0,
  XOF: 0,
}

export function currencyDecimals(currency: string): number {
  return CURRENCY_DECIMALS[currency] ?? 2
}

export const CURRENCIES = [
  { code: 'NGN', symbol: '₦', label: 'Nigerian Naira' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GHS', symbol: '₵', label: 'Ghanaian Cedi' },
  { code: 'KES', symbol: 'KSh', label: 'Kenyan Shilling' },
  { code: 'ZAR', symbol: 'R', label: 'South African Rand' },
]

export function currencySymbol(currency: string): string {
  return CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency
}

/** Convert a major-unit number (e.g. 5000.50) to integer minor units (500050). */
export function toMinor(major: number, currency = 'NGN'): Minor {
  const d = currencyDecimals(currency)
  return Math.round(major * Math.pow(10, d))
}

/** Convert integer minor units to a major-unit number. */
export function toMajor(minor: Minor, currency = 'NGN'): number {
  const d = currencyDecimals(currency)
  return minor / Math.pow(10, d)
}

/** Parse a user-entered amount string into integer minor units. Returns null if invalid. */
export function parseAmount(input: string, currency = 'NGN'): Minor | null {
  if (input == null) return null
  const cleaned = String(input).replace(/[^0-9.\-]/g, '').trim()
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const n = Number(cleaned)
  if (!isFinite(n)) return null
  return toMinor(n, currency)
}

/**
 * Format minor units as a grouped amount with the currency symbol, e.g. ₦1,000.50.
 * Uses a fixed 'en-US' grouping so amounts look identical on every device/locale,
 * and the app's own currency symbol map so the symbol is always consistent with
 * inputs and headline figures (never the "NGN 1,000" code fallback).
 * Never changes the stored value.
 */
export function formatMoney(minor: Minor, currency = 'NGN'): string {
  const d = currencyDecimals(currency)
  const value = minor / Math.pow(10, d)
  const sym = currencySymbol(currency)
  const sign = value < 0 ? '-' : ''
  const num = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
  return `${sign}${sym}${num}`
}

/**
 * Format minor units as a grouped number with currency symbol, no decimals.
 * Used for headline KPIs. Always uses exact thousands grouping (1,000 / 1,000,000),
 * never compact "k"/"M" notation, so amounts are never ambiguous.
 */
export function formatMoneyShort(minor: Minor, currency = 'NGN'): string {
  const d = currencyDecimals(currency)
  const value = minor / Math.pow(10, d)
  const sym = currencySymbol(currency)
  const sign = value < 0 ? '-' : ''
  return `${sign}${sym}${Math.abs(Math.round(value)).toLocaleString('en-US')}`
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

/** Format a quantity/stock number with thousands grouping (1,000). Never changes stored value. */
export function formatQty(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

/* ---------------- Dates ---------------- */

export function nowISO(): string {
  return new Date().toISOString()
}

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}w ago`
  return formatDate(iso)
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate).getTime() < new Date(todayISODate()).getTime()
}

export function startOfMonth(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}
export function startOfDay(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
}
export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

/* ---------------- Misc ---------------- */

export function initials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0
  return clamp(Math.round((part / whole) * 100), 0, 100)
}

export function sum<T>(arr: T[], fn: (t: T) => number): number {
  return arr.reduce((a, b) => a + fn(b), 0)
}

export function groupBy<T>(arr: T[], fn: (t: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = fn(item)
    ;(acc[k] ||= []).push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/* ---------------- Validation helpers ---------------- */

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

/** Loose Nigerian + international phone validation. */
export function isPhone(v: string): boolean {
  const cleaned = v.replace(/[\s\-()]/g, '')
  return /^(\+?\d{7,15})$/.test(cleaned)
}

export function normalizePhone(v: string): string {
  return v.replace(/[\s\-()]/g, '')
}
