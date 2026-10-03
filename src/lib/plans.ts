/* ============================================================
   KUDII — Plans, Entitlements, Limits
   The Plus price is intentionally NOT invented — it is configurable.
   ============================================================ */

import type { Minor, PlanId } from './types'

export interface PlanLimits {
  products: number | null // null = unlimited
  customers: number | null
  active_jobs: number | null
  transactions_per_month: number | null
  businesses: number | null
}

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  /** null = price not yet configured (do not invent a Plus price) */
  priceMinor: Minor | null
  priceConfigured: boolean
  currency: string
  limits: PlanLimits
  features: string[]
  highlight?: boolean
}

export const PLANS: Record<PlanId, Plan> = {
  go: {
    id: 'go',
    name: 'KUDII Go',
    tagline: 'Everything you need to run the day-to-day.',
    priceMinor: 500000, // ₦5,000
    priceConfigured: true,
    currency: 'NGN',
    limits: {
      products: 50,
      customers: 50,
      active_jobs: 25,
      transactions_per_month: 100,
      businesses: 1,
    },
    features: [
      'Up to 50 products',
      'Up to 50 customers',
      'Up to 25 transactions',
      '100 transactions / month',
      '1 business workspace',
      'Customers, Products, Transactions & Sales',
      'Money: money in, money out & net',
      'Receipts & basic activity',
      'Basic overview & progress',
      'Light & Dark themes',
    ],
  },
  plus: {
    id: 'plus',
    name: 'KUDII Plus',
    tagline: 'Run KUDII without usage limits.',
    priceMinor: null, // configurable later — never invented
    priceConfigured: false,
    currency: 'NGN',
    limits: {
      products: null,
      customers: null,
      active_jobs: null,
      transactions_per_month: null,
      businesses: null,
    },
    features: [
      'Unlimited products',
      'Unlimited customers',
      'Unlimited sales & transactions',
      'Unlimited transactions',
      'Advanced progress & insights',
      'Full overview & reports',
      'Light & Dark themes',
      'Future AI Assistant when released',
    ],
    highlight: true,
  },
}

export interface Entitlements {
  plan: PlanId
  unlimited: boolean
  advancedProgress: boolean
  fullDashboard: boolean
  reports: boolean
  allThemes: boolean
  aiAssistant: boolean
}

export function entitlementsFor(plan: PlanId): Entitlements {
  const plus = plan === 'plus'
  return {
    plan,
    unlimited: plus,
    advancedProgress: plus,
    fullDashboard: plus,
    reports: plus,
    allThemes: plus,
    aiAssistant: false, // AI Assistant is Coming Soon only — never active
  }
}

export function limitFor(plan: PlanId, key: keyof PlanLimits): number | null {
  return PLANS[plan].limits[key]
}
