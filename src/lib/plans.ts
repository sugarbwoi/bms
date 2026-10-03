/* ============================================================
   KUDII — Plans, Entitlements, Limits
   Single source of truth for pricing and limits.
   Never hardcode plan limits anywhere else — read them from here.

   KUDII FREE  — ₦0 / month      — 5 products  — 1 business
   KUDII GO    — ₦5,000 / month  — 20 products — 2 businesses
   KUDII PLUS  — ₦10,000 / month — 50 products — 5 businesses
   ============================================================ */

import type { Minor, PlanId } from './types'

export interface PlanLimits {
  products: number | null // null = unlimited
  customers: number | null
  transactions_per_month: number | null
  businesses: number | null
}

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  priceMinor: Minor
  currency: string
  limits: PlanLimits
  features: string[]
  highlight?: boolean
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'KUDII Free',
    tagline: 'Everything you need to get started.',
    priceMinor: 0,
    currency: 'NGN',
    limits: {
      products: 5,
      customers: null,
      transactions_per_month: null,
      businesses: 1,
    },
    features: [
      'Up to 5 products',
      'Unlimited customers',
      'Unlimited sales & transactions',
      'Money: money in, money out & net',
      'Receipts & activity',
      'Basic overview & progress',
      'Light & Dark themes',
      '1 business workspace',
    ],
  },
  go: {
    id: 'go',
    name: 'KUDII Go',
    tagline: 'Everything you need to run the day-to-day.',
    priceMinor: 500000, // ₦5,000
    currency: 'NGN',
    limits: {
      products: 20,
      customers: null,
      transactions_per_month: null,
      businesses: 2,
    },
    features: [
      'Up to 20 products',
      'Unlimited customers',
      'Unlimited sales & transactions',
      'Money: money in, money out & net',
      'Receipts & activity',
      'Overview, progress & reports',
      'Light & Dark themes',
      'Up to 2 business workspaces',
    ],
  },
  plus: {
    id: 'plus',
    name: 'KUDII Plus',
    tagline: 'Run KUDII at full capacity.',
    priceMinor: 1000000, // ₦10,000
    currency: 'NGN',
    limits: {
      products: 50,
      customers: null,
      transactions_per_month: null,
      businesses: 5,
    },
    features: [
      'Up to 50 products',
      'Unlimited customers',
      'Unlimited sales & transactions',
      'Money: money in, money out & net',
      'Receipts & activity',
      'Advanced progress, reports & insights',
      'Light & Dark themes',
      'Up to 5 business workspaces',
    ],
    highlight: true,
  },
}

export const PLAN_ORDER: PlanId[] = ['free', 'go', 'plus']
export const DEFAULT_PLAN: PlanId = 'free'

export function planById(id: PlanId): Plan {
  return PLANS[id] ?? PLANS[DEFAULT_PLAN]
}

export function isPaidPlan(plan: PlanId): boolean {
  return plan !== 'free'
}

/** Format a plan limit for display: null → "Unlimited". */
export function formatLimit(value: number | null): string {
  return value === null ? 'Unlimited' : String(value)
}

/** How many businesses a plan allows (null → unlimited). */
export function businessAllowance(plan: PlanId): number | null {
  return PLANS[plan].limits.businesses
}

export interface Entitlements {
  plan: PlanId
  unlimited: boolean
  advancedProgress: boolean
  fullDashboard: boolean
  reports: boolean
  allThemes: boolean
  multiBusiness: boolean
  aiAssistant: boolean
}

export function entitlementsFor(plan: PlanId): Entitlements {
  const paid = isPaidPlan(plan)
  const plus = plan === 'plus'
  return {
    plan,
    unlimited: plus,
    advancedProgress: paid,
    fullDashboard: true,
    reports: paid,
    allThemes: true,
    multiBusiness: paid,
    aiAssistant: false, // AI Assistant is Coming Soon only — never active
  }
}

export function limitFor(plan: PlanId, key: keyof PlanLimits): number | null {
  return PLANS[plan].limits[key]
}
