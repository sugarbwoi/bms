/* ============================================================
   KUDII — Domain Types
   Amounts are stored as INTEGER MINOR UNITS (kobo / cents).
   Never use floats for money.
   ============================================================ */

export type ID = string
export type Minor = number // integer minor units

export type Role = 'owner' | 'admin' | 'member'
export type MembershipStatus = 'active' | 'invited' | 'disabled'
export type RecordStatus = 'active' | 'archived'
export type ThemeName = 'light' | 'dark'

/* Legacy themes kept only for safe migration of already-saved data. */
export type LegacyThemeName = 'warm' | 'white' | 'black' | 'champagne'

/** Map any previously-saved theme onto the two supported themes. */
export function migrateTheme(theme: string | undefined | null): ThemeName {
  if (theme === 'dark' || theme === 'black') return 'dark'
  return 'light'
}

export interface User {
  id: ID
  email: string
  name: string
  avatar_url: string | null
  password_hash: string
  password_salt: string
  created_at: string
  updated_at: string
}

export interface UserSettings {
  id: ID
  user_id: ID
  theme: ThemeName
  notifications_enabled: boolean
  language: string
  reduce_effects: boolean
  created_at: string
  updated_at: string
}

export interface Business {
  id: ID
  name: string
  description: string
  currency: string
  country: string
  timezone: string
  logo_url: string | null
  theme: ThemeName
  created_at: string
  updated_at: string
}

export interface BusinessMembership {
  id: ID
  business_id: ID
  user_id: ID
  role: Role
  status: MembershipStatus
  created_at: string
  updated_at: string
}

export interface Customer {
  id: ID
  business_id: ID
  name: string
  email: string
  phone: string
  address: string
  notes: string
  status: RecordStatus
  created_at: string
  updated_at: string
}

export interface Product {
  id: ID
  business_id: ID
  name: string
  description: string
  selling_price: Minor
  cost_price: Minor
  sku: string
  stock_quantity: number // server-controlled balance backed by immutable movements
  low_stock_threshold: number
  status: RecordStatus
  created_at: string
  updated_at: string
}

export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface Job {
  id: ID
  business_id: ID
  customer_id: ID | null
  title: string
  description: string
  amount: Minor
  status: JobStatus
  due_date: string | null
  notes: string
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type SaleStatus = 'open' | 'cancelled'

export interface Sale {
  id: ID
  business_id: ID
  customer_id: ID | null
  sale_number: string
  discount: Minor
  status: SaleStatus
  sale_date: string
  notes: string
  created_at: string
  updated_at: string
}

export interface SaleItem {
  id: ID
  sale_id: ID
  business_id: ID
  product_id: ID | null
  description: string
  quantity: number
  unit_price: Minor
  total: Minor
}

export type TransactionType = 'income' | 'expense' | 'refund' | 'reversal' | 'drawings'
export type TransactionStatus = 'posted' | 'reversed'

export interface Transaction {
  id: ID
  business_id: ID
  customer_id: ID | null
  type: TransactionType
  category: string
  amount: Minor
  currency: string
  description: string
  transaction_date: string
  payment_method: string
  reference_type: string | null
  reference_id: ID | null
  status: TransactionStatus
  reversal_of: ID | null
  created_at: string
  updated_at: string
}

export type PaymentStatus = 'posted' | 'refunded' | 'partially_refunded' | 'reversed'

export interface Payment {
  id: ID
  business_id: ID
  customer_id: ID | null
  amount: Minor
  currency: string
  method: string
  reference: string
  payment_date: string
  notes: string
  status: PaymentStatus
  created_at: string
  updated_at: string
}

export interface PaymentAllocation {
  id: ID
  business_id: ID
  payment_id: ID
  sale_id: ID | null
  invoice_id: ID | null
  job_id: ID | null
  amount: Minor
}

export type StockMovementType = 'sale' | 'restock' | 'adjustment' | 'cancellation' | 'refund'

export interface StockMovement {
  id: ID
  business_id: ID
  product_id: ID
  type: StockMovementType
  quantity: number // signed: + increases, - decreases
  balance_after: number
  reason: string
  reference_type: string | null
  reference_id: ID | null
  created_by: ID | null
  created_at: string
}

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'

export interface Invoice {
  id: ID
  business_id: ID
  customer_id: ID | null
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  discount: Minor
  notes: string
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: ID
  invoice_id: ID
  business_id: ID
  product_id: ID | null
  job_id: ID | null
  description: string
  quantity: number
  unit_price: Minor
  total: Minor
}

export interface Receipt {
  id: ID
  business_id: ID
  customer_id: ID | null
  sale_id: ID | null
  invoice_id: ID | null
  job_id: ID | null
  payment_id: ID
  receipt_number: string
  amount: Minor
  payment_method: string
  issued_at: string
}

export interface Activity {
  id: ID
  business_id: ID
  user_id: ID | null
  customer_id: ID | null
  job_id: ID | null
  transaction_id: ID | null
  type: string
  title: string
  description: string
  metadata: Record<string, unknown>
  created_at: string
}

export type GoalStatus = 'active' | 'completed' | 'archived'
export type GoalType = 'revenue' | 'jobs' | 'sales' | 'customers'

export interface Goal {
  id: ID
  business_id: ID
  type: GoalType
  title: string
  target_amount: Minor
  start_date: string
  end_date: string
  status: GoalStatus
  created_at: string
  updated_at: string
}

export type PlanId = 'go' | 'plus'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired'

export interface Subscription {
  id: ID
  business_id: ID
  provider: string
  provider_customer_id: string | null
  provider_subscription_id: string | null
  plan: PlanId
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  created_at: string
  updated_at: string
}

export interface OnboardingState {
  business_id: ID
  theme_selected: boolean
  first_customer: boolean
  first_sale_or_job: boolean
  first_transaction: boolean
  completed: boolean
  dismissed: boolean
}

export interface Session {
  userId: ID | null
  activeBusinessId: ID | null
  expiresAt: number | null
}

export interface DB {
  version: number
  users: User[]
  settings: UserSettings[]
  businesses: Business[]
  memberships: BusinessMembership[]
  customers: Customer[]
  products: Product[]
  jobs: Job[]
  sales: Sale[]
  saleItems: SaleItem[]
  transactions: Transaction[]
  payments: Payment[]
  allocations: PaymentAllocation[]
  stockMovements: StockMovement[]
  invoices: Invoice[]
  invoiceItems: InvoiceItem[]
  receipts: Receipt[]
  activities: Activity[]
  goals: Goal[]
  subscriptions: Subscription[]
  onboarding: OnboardingState[]
  counters: Record<string, number>
  session: Session
}

export interface Result<T> {
  ok: boolean
  data?: T
  error?: string
  fieldErrors?: Record<string, string>
}
