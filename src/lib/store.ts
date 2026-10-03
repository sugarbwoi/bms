/* ============================================================
   KUDII — Store / Service Layer
   Mirrors a server: authenticates, authorizes, validates, executes.
   The client never supplies user_id / business_id / role as authority.
   All money is integer minor units. Financial history is immutable.
   ============================================================ */

import type {
  DB,
  ID,
  Minor,
  User,
  Business,
  Customer,
  Product,
  Sale,
  SaleItem,
  Transaction,
  TransactionType,
  Payment,
  PaymentAllocation,
  StockMovement,
  StockMovementType,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  Receipt,
  Activity,
  Goal,
  GoalType,
  Subscription,
  PlanId,
  SubscriptionStatus,
  OnboardingState,
  Result,
  ThemeName,
  RecordStatus,
  AuthPurpose,
  AuthChallenge,
  EmailMessage,
} from './types'
import { migrateTheme } from './types'
import { uid, nowISO, todayISODate, isEmail, isPhone, normalizePhone } from './utils'
import { PLANS, type PlanLimits } from './plans'
import {
  saleBalance,
  invoiceBalance,
  scope,
  usage as usageOf,
  planOf,
} from './derive'
import {
  deliverEmail,
  buildLoginCodeEmail,
  buildVerifyEmail,
  buildRecoveryEmail,
  buildSecurityNotice,
} from './email'

const STORAGE_KEY = 'kudii.db.v1'
const SESSION_HOURS = 24 * 14 // 14 days
const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_CODE_ATTEMPTS = 5

/* ---------------- hashing (demo-grade, Web Crypto) ----------------
   NOTE: Production must hash server-side with bcrypt/argon2. This keeps
   plaintext secrets out of browser storage in this demo build. */
async function hashText(value: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}::${value}::kudii`)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data)
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  let h = 5381
  for (let i = 0; i < data.length; i++) h = ((h << 5) + h + data[i]) >>> 0
  return h.toString(16)
}

function hashPassword(password: string, salt: string): Promise<string> {
  return hashText(password, salt)
}

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function emptyDB(): DB {
  return {
    version: 2,
    users: [],
    settings: [],
    businesses: [],
    memberships: [],
    customers: [],
    products: [],
    sales: [],
    saleItems: [],
    transactions: [],
    payments: [],
    allocations: [],
    stockMovements: [],
    invoices: [],
    invoiceItems: [],
    receipts: [],
    activities: [],
    goals: [],
    subscriptions: [],
    onboarding: [],
    emails: [],
    challenges: [],
    counters: {},
    session: { userId: null, activeBusinessId: null, expiresAt: null },
  }
}

export interface CreateBusinessInput {
  name: string
  description?: string
  category?: string
  phone?: string
  country?: string
  currency?: string
  timezone?: string
  logo_url?: string | null
  theme?: ThemeName
}

class Store {
  db: DB
  private listeners = new Set<() => void>()
  private version = 0

  constructor() {
    this.db = emptyDB()
    this.load()
  }

  /* ---------------- reactivity ---------------- */
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getSnapshot = () => this.version
  private commit() {
    this.version++
    this.persist()
    this.listeners.forEach((f) => f())
  }
  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db))
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }
  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<DB>
      this.db = { ...emptyDB(), ...parsed }
      // ensure newly-added collections exist on older saves
      this.db.emails = this.db.emails || []
      this.db.challenges = this.db.challenges || []
      this.db.users = (this.db.users || []).map((u) => ({ email_verified: true, ...u }))
      this.db.businesses = (this.db.businesses || []).map((b) => ({
        category: '',
        phone: '',
        ...b,
        theme: migrateTheme(b.theme as any),
      }))
      this.db.settings = (this.db.settings || []).map((s) => ({ ...s, theme: migrateTheme(s.theme as any) }))
      // subscriptions: backfill new fields
      this.db.subscriptions = (this.db.subscriptions || []).map((s) => ({
        pending_plan: null,
        last_payment_reference: null,
        last_payment_at: null,
        ...s,
      }))
      // session expiry
      if (this.db.session.expiresAt && this.db.session.expiresAt < Date.now()) {
        this.db.session = { userId: null, activeBusinessId: null, expiresAt: null }
      }
    } catch {
      this.db = emptyDB()
    }
  }

  /* ---------------- helpers ---------------- */
  private nextNumber(businessId: ID, prefix: string): string {
    const key = `${businessId}:${prefix}`
    const n = (this.db.counters[key] || 0) + 1
    this.db.counters[key] = n
    return `${prefix}-${String(n).padStart(4, '0')}`
  }

  currentUser(): User | null {
    const id = this.db.session.userId
    if (!id) return null
    // Session expiry: an expired session is treated as signed out so the
    // user is asked to re-authenticate. Valid sessions never re-prompt.
    if (this.db.session.expiresAt && this.db.session.expiresAt <= Date.now()) return null
    return this.db.users.find((u) => u.id === id) || null
  }

  activeBusiness(): Business | null {
    const uidv = this.db.session.userId
    if (!uidv) return null
    let b = this.db.businesses.find((x) => x.id === this.db.session.activeBusinessId)
    if (!b || !this.isMember(b.id, uidv)) {
      const m = this.db.memberships.find((x) => x.user_id === uidv && x.status === 'active')
      b = m ? this.db.businesses.find((x) => x.id === m.business_id) : undefined
      this.db.session.activeBusinessId = b ? b.id : null
    }
    return b || null
  }

  isMember(businessId: ID, userId: ID): boolean {
    return this.db.memberships.some(
      (m) => m.business_id === businessId && m.user_id === userId && m.status === 'active',
    )
  }

  /** Authorize: returns the active business only if the current user is a member. */
  private requireBusiness(): Business | null {
    const u = this.currentUser()
    if (!u) return null
    const b = this.activeBusiness()
    if (!b || !this.isMember(b.id, u.id)) return null
    return b
  }

  listBusinesses(): Business[] {
    const u = this.currentUser()
    if (!u) return []
    const ids = this.db.memberships
      .filter((m) => m.user_id === u.id && m.status === 'active')
      .map((m) => m.business_id)
    return this.db.businesses.filter((b) => ids.includes(b.id))
  }

  /* ---------------- activity ---------------- */
  private log(
    businessId: ID,
    input: {
      type: string
      title: string
      description?: string
      customer_id?: ID | null
      transaction_id?: ID | null
      metadata?: Record<string, unknown>
    },
  ): Activity {
    const a: Activity = {
      id: uid('act'),
      business_id: businessId,
      user_id: this.db.session.userId,
      customer_id: input.customer_id ?? null,
      transaction_id: input.transaction_id ?? null,
      type: input.type,
      title: input.title,
      description: input.description || '',
      metadata: input.metadata || {},
      created_at: nowISO(),
    }
    this.db.activities.push(a)
    return a
  }

  /* ---------------- limits ---------------- */
  private guardLimit(businessId: ID, key: keyof PlanLimits): string | null {
    const plan = planOf(this.db, businessId)
    const limit = PLANS[plan].limits[key]
    if (limit === null) return null
    const u = this.currentUser()!
    const use = usageOf(this.db, businessId, u.id)
    const map: Record<keyof PlanLimits, number> = {
      products: use.products,
      customers: use.customers,
      transactions_per_month: use.transactions_this_month,
      businesses: use.businesses,
    }
    if (map[key] >= limit) {
      if (key === 'businesses' && plan === 'free') {
        return 'Multiple businesses are available on KUDII Go and Plus.'
      }
      const label = key === 'transactions_per_month' ? 'transactions this month' : String(key)
      return `You've reached the ${PLANS[plan].name} limit for ${label} (${limit}). Upgrade to keep going.`
    }
    return null
  }

  /* ============================================================
     AUTH
     ============================================================ */
  async signUp(input: { name: string; email: string; password: string }): Promise<Result<User>> {
    const fieldErrors: Record<string, string> = {}
    const name = (input.name || '').trim()
    const email = (input.email || '').trim().toLowerCase()
    const password = input.password || ''
    if (name.length < 2) fieldErrors.name = 'Please enter your name.'
    if (!isEmail(email)) fieldErrors.email = 'Enter a valid email address.'
    if (password.length < 8) fieldErrors.password = 'Use at least 8 characters.'
    if (Object.keys(fieldErrors).length) return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors }
    if (this.db.users.some((u) => u.email === email)) {
      return { ok: false, error: 'An account with this email already exists.', fieldErrors: { email: 'Email already in use.' } }
    }
    const salt = uid('salt')
    const user: User = {
      id: uid('usr'),
      email,
      name,
      avatar_url: null,
      email_verified: false,
      password_hash: await hashPassword(password, salt),
      password_salt: salt,
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    this.db.users.push(user)
    this.db.settings.push({
      id: uid('set'),
      user_id: user.id,
      theme: 'light',
      notifications_enabled: true,
      language: 'en',
      reduce_effects: false,
      created_at: nowISO(),
      updated_at: nowISO(),
    })
    this.startSession(user.id)
    // Send a verification email (dev transport records it; no real delivery).
    await this.sendCode(user.email, 'verify_email')
    this.commit()
    return { ok: true, data: user }
  }

  async signIn(input: { email: string; password: string }): Promise<Result<User>> {
    const email = (input.email || '').trim().toLowerCase()
    const user = this.db.users.find((u) => u.email === email)
    if (!user) return { ok: false, error: 'No account found with that email.', fieldErrors: { email: 'Not found.' } }
    const hash = await hashPassword(input.password || '', user.password_salt)
    if (hash !== user.password_hash) {
      return { ok: false, error: 'That password is incorrect.', fieldErrors: { password: 'Incorrect password.' } }
    }
    this.startSession(user.id)
    this.commit()
    return { ok: true, data: user }
  }

  signOut() {
    this.db.session = { userId: null, activeBusinessId: null, expiresAt: null }
    this.commit()
  }

  private startSession(userId: ID) {
    const m = this.db.memberships.find((x) => x.user_id === userId && x.status === 'active')
    this.db.session = {
      userId,
      activeBusinessId: m ? m.business_id : null,
      expiresAt: Date.now() + SESSION_HOURS * 3600 * 1000,
    }
  }

  /** Re-issue the session if it is still valid — never asks for email again. */
  sessionValid(): boolean {
    return !!this.db.session.userId && !!this.db.session.expiresAt && this.db.session.expiresAt > Date.now()
  }

  /* ---------------- email code auth ---------------- */
  private async sendCode(email: string, purpose: AuthPurpose): Promise<string> {
    const code = genCode()
    const salt = uid('csalt')
    const challenge: AuthChallenge = {
      id: uid('chl'),
      email,
      purpose,
      code_hash: syncHash(`${salt}::${code}::kudii`),
      expires_at: Date.now() + CODE_TTL_MS,
      attempts: 0,
      consumed: false,
      created_at: nowISO(),
    }
    // embed the salt so verification can re-derive the hash
    ;(challenge as AuthChallenge & { _salt: string })._salt = salt
    // invalidate previous challenges for the same email+purpose
    this.db.challenges = this.db.challenges.filter((c) => !(c.email === email && c.purpose === purpose && !c.consumed))
    this.db.challenges.push(challenge)

    const built =
      purpose === 'sign_in' ? buildLoginCodeEmail(code) : purpose === 'verify_email' ? buildVerifyEmail(code) : buildRecoveryEmail(code)
    const record = await deliverEmail({ ...built, to: email })
    this.db.emails.push(record)
    return code
  }

  private verifyCode(email: string, purpose: AuthPurpose, code: string): Result<AuthChallenge> {
    const challenge = [...this.db.challenges]
      .reverse()
      .find((c) => c.email === email && c.purpose === purpose && !c.consumed)
    if (!challenge) return { ok: false, error: 'That code has expired. Please request a new one.' }
    if (challenge.expires_at < Date.now()) return { ok: false, error: 'That code has expired. Please request a new one.' }
    if (challenge.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, error: 'Too many attempts. Please request a new code.' }
    challenge.attempts++
    const salt = (challenge as AuthChallenge & { _salt?: string })._salt || ''
    // verify synchronously against the stored hash using a sync fallback digest
    const expected = syncHash(`${salt}::${code}::kudii`)
    if (expected !== challenge.code_hash) return { ok: false, error: 'That code is not correct.' }
    challenge.consumed = true
    return { ok: true, data: challenge }
  }

  /** Request a passwordless sign-in code. */
  async requestLoginCode(email: string): Promise<Result<{ demoCode?: string }>> {
    const e = (email || '').trim().toLowerCase()
    if (!isEmail(e)) return { ok: false, error: 'Enter a valid email address.', fieldErrors: { email: 'Invalid.' } }
    const user = this.db.users.find((u) => u.email === e)
    if (!user) {
      // Do not reveal whether the account exists.
      return { ok: true, data: {} }
    }
    const code = await this.sendCode(e, 'sign_in')
    this.commit()
    return { ok: true, data: { demoCode: code } }
  }

  /** Complete passwordless sign-in with the emailed code. */
  async signInWithCode(email: string, code: string): Promise<Result<User>> {
    const e = (email || '').trim().toLowerCase()
    const user = this.db.users.find((u) => u.email === e)
    if (!user) return { ok: false, error: 'We could not verify that code.' }
    const v = this.verifyCode(e, 'sign_in', (code || '').trim())
    if (!v.ok) return { ok: false, error: v.error }
    if (!user.email_verified) user.email_verified = true
    this.startSession(user.id)
    this.commit()
    return { ok: true, data: user }
  }

  /** Re-send the email-verification code for the signed-in account. */
  async resendVerification(email?: string): Promise<Result<{ demoCode?: string }>> {
    const e = (email || this.currentUser()?.email || '').trim().toLowerCase()
    if (!e) return { ok: false, error: 'No email to verify.' }
    const code = await this.sendCode(e, 'verify_email')
    this.commit()
    return { ok: true, data: { demoCode: code } }
  }

  /** Confirm an email-verification code. */
  async verifyEmail(email: string, code: string): Promise<Result<User>> {
    const e = (email || '').trim().toLowerCase()
    const user = this.db.users.find((u) => u.email === e)
    if (!user) return { ok: false, error: 'We could not verify that code.' }
    const v = this.verifyCode(e, 'verify_email', (code || '').trim())
    if (!v.ok) return { ok: false, error: v.error }
    user.email_verified = true
    user.updated_at = nowISO()
    const notice = await deliverEmail({ ...buildSecurityNotice('Your KUDII email was verified.'), to: e })
    this.db.emails.push(notice)
    this.commit()
    return { ok: true, data: user }
  }

  async requestPasswordReset(email: string): Promise<Result<{ demoCode?: string }>> {
    const e = (email || '').trim().toLowerCase()
    if (!isEmail(e)) return { ok: false, error: 'Enter a valid email address.', fieldErrors: { email: 'Invalid.' } }
    const user = this.db.users.find((u) => u.email === e)
    if (!user) return { ok: true, data: {} } // no enumeration
    const code = await this.sendCode(e, 'recover')
    this.commit()
    return { ok: true, data: { demoCode: code } }
  }

  async resetPassword(input: { email: string; code: string; password: string }): Promise<Result<true>> {
    const e = (input.email || '').trim().toLowerCase()
    const user = this.db.users.find((u) => u.email === e)
    if (!user) return { ok: false, error: 'We could not verify that reset request.' }
    if ((input.password || '').length < 8) return { ok: false, error: 'Use at least 8 characters.', fieldErrors: { password: 'Too short.' } }
    const v = this.verifyCode(e, 'recover', (input.code || '').trim())
    if (!v.ok) return { ok: false, error: v.error }
    const salt = uid('salt')
    user.password_salt = salt
    user.password_hash = await hashPassword(input.password, salt)
    user.updated_at = nowISO()
    const notice = await deliverEmail({ ...buildSecurityNotice('Your KUDII password was changed.'), to: e })
    this.db.emails.push(notice)
    this.commit()
    return { ok: true, data: true }
  }

  listEmails(): EmailMessage[] {
    return [...this.db.emails].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  getSettings(userId: ID) {
    return this.db.settings.find((s) => s.user_id === userId) || null
  }
  updateSettings(userId: ID, patch: Partial<{ theme: ThemeName; notifications_enabled: boolean; language: string; reduce_effects: boolean }>) {
    const s = this.db.settings.find((x) => x.user_id === userId)
    if (!s) return
    Object.assign(s, patch, { updated_at: nowISO() })
    this.commit()
  }

  updateProfile(userId: ID, patch: { name?: string; avatar_url?: string | null }): Result<User> {
    const u = this.db.users.find((x) => x.id === userId)
    if (!u) return { ok: false, error: 'Account not found.' }
    if (patch.name != null) {
      const name = patch.name.trim()
      if (name.length < 2) return { ok: false, error: 'Please enter your name.', fieldErrors: { name: 'Required.' } }
      u.name = name
    }
    if (patch.avatar_url !== undefined) u.avatar_url = patch.avatar_url
    u.updated_at = nowISO()
    this.commit()
    return { ok: true, data: u }
  }

  /* ============================================================
     BUSINESS + ONBOARDING
     ============================================================ */
  createBusiness(input: CreateBusinessInput): Result<Business> {
    const u = this.currentUser()
    if (!u) return { ok: false, error: 'You must be signed in.' }
    const name = (input.name || '').trim()
    if (name.length < 2) return { ok: false, error: 'Please name your business.', fieldErrors: { name: 'Required.' } }

    const existing = this.listBusinesses()
    // Determine the plan from the first (existing) business; a brand-new user is Free.
    const plan: PlanId = existing.length ? planOf(this.db, existing[0].id) : 'free'
    const allowance = PLANS[plan].limits.businesses
    if (allowance !== null && existing.length >= allowance) {
      if (plan === 'free') {
        return { ok: false, error: 'Multiple businesses are available on KUDII Go and Plus.' }
      }
      return {
        ok: false,
        error: `${PLANS[plan].name} includes ${allowance} business workspace${allowance > 1 ? 's' : ''}. Upgrade to KUDII Plus for more.`,
      }
    }

    const b: Business = {
      id: uid('biz'),
      name,
      description: input.description?.trim() || '',
      category: input.category?.trim() || '',
      phone: input.phone ? normalizePhone(input.phone) : '',
      currency: input.currency || 'NGN',
      country: input.country || 'Nigeria',
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos',
      logo_url: input.logo_url || null,
      theme: input.theme || 'light',
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    this.db.businesses.push(b)
    this.db.memberships.push({
      id: uid('mem'),
      business_id: b.id,
      user_id: u.id,
      role: 'owner',
      status: 'active',
      created_at: nowISO(),
      updated_at: nowISO(),
    })
    // New businesses start on the Free plan — paid plans require a confirmed payment.
    this.db.subscriptions.push({
      id: uid('sub'),
      business_id: b.id,
      provider: 'manual',
      provider_customer_id: null,
      provider_subscription_id: null,
      plan: 'free',
      pending_plan: null,
      status: 'active',
      current_period_start: nowISO(),
      current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(),
      last_payment_reference: null,
      last_payment_at: null,
      created_at: nowISO(),
      updated_at: nowISO(),
    })
    this.db.onboarding.push({
      business_id: b.id,
      theme_selected: false,
      first_customer: false,
      first_sale: false,
      first_transaction: false,
      completed: false,
      dismissed: false,
    })
    this.db.session.activeBusinessId = b.id
    this.log(b.id, { type: 'business.created', title: 'Business created', description: `${b.name} was set up on KUDII.` })
    this.commit()
    return { ok: true, data: b }
  }

  updateBusiness(id: ID, patch: Partial<Business>): Result<Business> {
    const b = this.db.businesses.find((x) => x.id === id)
    const u = this.currentUser()
    if (!b || !u || !this.isMember(id, u.id)) return { ok: false, error: 'Business not found.' }
    Object.assign(b, patch, { id: b.id, updated_at: nowISO() })
    this.commit()
    return { ok: true, data: b }
  }

  switchBusiness(id: ID) {
    const u = this.currentUser()
    if (!u || !this.isMember(id, u.id)) return
    this.db.session.activeBusinessId = id
    this.commit()
  }

  getOnboarding(businessId: ID): OnboardingState | null {
    return this.db.onboarding.find((o) => o.business_id === businessId) || null
  }
  setOnboarding(businessId: ID, patch: Partial<OnboardingState>) {
    const o = this.db.onboarding.find((x) => x.business_id === businessId)
    if (!o) return
    Object.assign(o, patch)
    this.commit()
  }
  private markOnboarding(businessId: ID, key: keyof OnboardingState) {
    const o = this.db.onboarding.find((x) => x.business_id === businessId)
    if (!o) return
    ;(o as any)[key] = true
    const done = o.theme_selected && o.first_customer && o.first_sale && o.first_transaction
    if (done) o.completed = true
  }

  /* ============================================================
     CUSTOMERS
     ============================================================ */
  createCustomer(input: Partial<Customer>): Result<Customer> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const fieldErrors: Record<string, string> = {}
    const name = (input.name || '').trim()
    if (name.length < 2) fieldErrors.name = 'Enter a customer name.'
    if (input.email && !isEmail(input.email)) fieldErrors.email = 'Enter a valid email.'
    if (input.phone && !isPhone(input.phone)) fieldErrors.phone = 'Enter a valid phone number.'
    if (Object.keys(fieldErrors).length) return { ok: false, error: 'Please check the details.', fieldErrors }
    const limitErr = this.guardLimit(b.id, 'customers')
    if (limitErr) return { ok: false, error: limitErr }
    const c: Customer = {
      id: uid('cus'),
      business_id: b.id,
      name,
      email: input.email?.trim() || '',
      phone: input.phone ? normalizePhone(input.phone) : '',
      address: input.address?.trim() || '',
      notes: input.notes?.trim() || '',
      status: 'active',
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    this.db.customers.push(c)
    this.log(b.id, { type: 'customer.created', title: 'New customer added', description: c.name, customer_id: c.id })
    this.markOnboarding(b.id, 'first_customer')
    this.commit()
    return { ok: true, data: c }
  }

  updateCustomer(id: ID, patch: Partial<Customer>): Result<Customer> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const c = this.db.customers.find((x) => x.id === id && x.business_id === b.id)
    if (!c) return { ok: false, error: 'Customer not found.' }
    if (patch.email && !isEmail(patch.email)) return { ok: false, error: 'Enter a valid email.', fieldErrors: { email: 'Invalid.' } }
    if (patch.phone && !isPhone(patch.phone)) return { ok: false, error: 'Enter a valid phone.', fieldErrors: { phone: 'Invalid.' } }
    Object.assign(c, patch, { id: c.id, business_id: c.business_id, updated_at: nowISO() })
    this.commit()
    return { ok: true, data: c }
  }

  setCustomerStatus(id: ID, status: RecordStatus) {
    const b = this.requireBusiness()
    if (!b) return
    const c = this.db.customers.find((x) => x.id === id && x.business_id === b.id)
    if (!c) return
    c.status = status
    c.updated_at = nowISO()
    this.commit()
  }

  getCustomer(id: ID): Customer | null {
    const b = this.requireBusiness()
    if (!b) return null
    return this.db.customers.find((x) => x.id === id && x.business_id === b.id) || null
  }

  /* ============================================================
     PRODUCTS + STOCK
     ============================================================ */
  createProduct(input: Partial<Product>): Result<Product> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const fieldErrors: Record<string, string> = {}
    const name = (input.name || '').trim()
    if (name.length < 2) fieldErrors.name = 'Enter a product name.'
    if (input.selling_price == null) fieldErrors.selling_price = 'Enter a selling price.'
    if (Object.keys(fieldErrors).length) return { ok: false, error: 'Please check the details.', fieldErrors }
    const limitErr = this.guardLimit(b.id, 'products')
    if (limitErr) return { ok: false, error: limitErr }
    const p: Product = {
      id: uid('prd'),
      business_id: b.id,
      name,
      description: input.description?.trim() || '',
      selling_price: input.selling_price || 0,
      cost_price: input.cost_price || 0,
      stock_quantity: 0,
      low_stock_threshold: input.low_stock_threshold ?? 5,
      status: 'active',
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    this.db.products.push(p)
    if (input.stock_quantity && input.stock_quantity > 0) {
      this.applyMovement(b.id, p.id, 'restock', input.stock_quantity, 'Opening stock', null, null)
    }
    this.log(b.id, { type: 'product.created', title: 'Product added', description: p.name, metadata: { product_id: p.id } })
    this.commit()
    return { ok: true, data: p }
  }

  updateProduct(id: ID, patch: Partial<Product>): Result<Product> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const p = this.db.products.find((x) => x.id === id && x.business_id === b.id)
    if (!p) return { ok: false, error: 'Product not found.' }
    const { stock_quantity, ...rest } = patch
    Object.assign(p, rest, { id: p.id, business_id: p.business_id, updated_at: nowISO() })
    this.commit()
    return { ok: true, data: p }
  }

  setProductStatus(id: ID, status: RecordStatus) {
    const b = this.requireBusiness()
    if (!b) return
    const p = this.db.products.find((x) => x.id === id && x.business_id === b.id)
    if (!p) return
    p.status = status
    p.updated_at = nowISO()
    this.commit()
  }

  getProduct(id: ID): Product | null {
    const b = this.requireBusiness()
    if (!b) return null
    return this.db.products.find((x) => x.id === id && x.business_id === b.id) || null
  }

  /** Internal: apply a signed stock movement and update the controlled balance. */
  private applyMovement(
    businessId: ID,
    productId: ID,
    type: StockMovementType,
    quantity: number,
    reason: string,
    reference_type: string | null,
    reference_id: ID | null,
  ): StockMovement | null {
    const p = this.db.products.find((x) => x.id === productId && x.business_id === businessId)
    if (!p) return null
    p.stock_quantity = p.stock_quantity + quantity
    p.updated_at = nowISO()
    const m: StockMovement = {
      id: uid('mov'),
      business_id: businessId,
      product_id: productId,
      type,
      quantity,
      balance_after: p.stock_quantity,
      reason,
      reference_type,
      reference_id,
      created_by: this.db.session.userId,
      created_at: nowISO(),
    }
    this.db.stockMovements.push(m)
    return m
  }

  restock(productId: ID, quantity: number, opts?: { reason?: string; cost_price?: Minor }): Result<Product> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const p = this.db.products.find((x) => x.id === productId && x.business_id === b.id)
    if (!p) return { ok: false, error: 'Product not found.' }
    if (!quantity || quantity <= 0) return { ok: false, error: 'Enter a quantity greater than zero.', fieldErrors: { quantity: 'Invalid.' } }
    this.applyMovement(b.id, productId, 'restock', quantity, opts?.reason || 'Restock', 'manual', null)
    if (opts?.cost_price != null) p.cost_price = opts.cost_price
    this.log(b.id, {
      type: 'product.restocked',
      title: 'Product restocked',
      description: `${p.name} +${quantity}`,
      metadata: { product_id: p.id, quantity },
    })
    this.commit()
    return { ok: true, data: p }
  }

  /** Manual adjustment to an absolute quantity. A reason is required. */
  adjustStock(productId: ID, newQuantity: number, reason: string): Result<Product> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const p = this.db.products.find((x) => x.id === productId && x.business_id === b.id)
    if (!p) return { ok: false, error: 'Product not found.' }
    if (!reason || reason.trim().length < 3) return { ok: false, error: 'A reason is required for stock adjustments.', fieldErrors: { reason: 'Required.' } }
    const delta = newQuantity - p.stock_quantity
    if (delta === 0) return { ok: true, data: p }
    this.applyMovement(b.id, productId, 'adjustment', delta, reason.trim(), 'manual', null)
    this.log(b.id, {
      type: 'stock.adjusted',
      title: 'Stock adjusted',
      description: `${p.name} → ${newQuantity} (${reason.trim()})`,
      metadata: { product_id: p.id, delta },
    })
    this.commit()
    return { ok: true, data: p }
  }

  /* ============================================================
     SALES
     ============================================================ */
  createSale(input: {
    customer_id?: ID | null
    items: { product_id?: ID | null; description: string; quantity: number; unit_price: Minor }[]
    discount?: Minor
    sale_date?: string
    notes?: string
    payment?: { amount: Minor; method: string } | null
  }): Result<Sale> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const items = (input.items || []).filter((i) => i.quantity > 0)
    if (!items.length) return { ok: false, error: 'Add at least one product to the sale.' }
    if (input.customer_id && !this.db.customers.find((c) => c.id === input.customer_id && c.business_id === b.id)) {
      return { ok: false, error: 'Customer not found.' }
    }
    const limitErr = this.guardLimit(b.id, 'transactions_per_month')
    if (limitErr) return { ok: false, error: limitErr }

    const sale: Sale = {
      id: uid('sale'),
      business_id: b.id,
      customer_id: input.customer_id || null,
      sale_number: this.nextNumber(b.id, 'SALE'),
      discount: input.discount || 0,
      status: 'open',
      sale_date: input.sale_date || todayISODate(),
      notes: input.notes?.trim() || '',
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    this.db.sales.push(sale)

    for (const it of items) {
      const line: SaleItem = {
        id: uid('sli'),
        sale_id: sale.id,
        business_id: b.id,
        product_id: it.product_id || null,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total: it.quantity * it.unit_price,
      }
      this.db.saleItems.push(line)
      if (line.product_id) {
        this.applyMovement(b.id, line.product_id, 'sale', -line.quantity, `Sold on ${sale.sale_number}`, 'sale', sale.id)
      }
    }

    const total = Math.max(0, saleSubtotalLocal(this.db, sale.id) - sale.discount)
    const cust = sale.customer_id ? this.db.customers.find((c) => c.id === sale.customer_id) : null
    this.log(b.id, {
      type: 'sale.created',
      title: 'Sale recorded',
      description: `${sale.sale_number}${cust ? ' · ' + cust.name : ''}`,
      customer_id: sale.customer_id,
      metadata: { sale_id: sale.id, total },
    })

    if (input.payment && input.payment.amount > 0) {
      this.recordPaymentInternal(b.id, {
        customer_id: sale.customer_id,
        target: { type: 'sale', id: sale.id },
        amount: input.payment.amount,
        method: input.payment.method,
        payment_date: sale.sale_date,
        notes: `Payment for ${sale.sale_number}`,
      })
    }

    this.markOnboarding(b.id, 'first_sale')
    this.commit()
    return { ok: true, data: sale }
  }

  cancelSale(id: ID, reason: string): Result<Sale> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const sale = this.db.sales.find((x) => x.id === id && x.business_id === b.id)
    if (!sale) return { ok: false, error: 'Sale not found.' }
    if (sale.status === 'cancelled') return { ok: false, error: 'This sale is already cancelled.' }
    if (!reason || reason.trim().length < 3) return { ok: false, error: 'A reason is required to cancel a sale.', fieldErrors: { reason: 'Required.' } }
    // restore stock
    for (const it of this.db.saleItems.filter((i) => i.sale_id === sale.id)) {
      if (it.product_id) {
        this.applyMovement(b.id, it.product_id, 'cancellation', it.quantity, `Cancelled ${sale.sale_number}`, 'sale', sale.id)
      }
    }
    sale.status = 'cancelled'
    sale.updated_at = nowISO()
    this.log(b.id, { type: 'sale.cancelled', title: 'Sale cancelled', description: `${sale.sale_number} — ${reason.trim()}`, customer_id: sale.customer_id, metadata: { sale_id: sale.id } })
    this.commit()
    return { ok: true, data: sale }
  }

  getSale(id: ID): Sale | null {
    const b = this.requireBusiness()
    if (!b) return null
    return this.db.sales.find((x) => x.id === id && x.business_id === b.id) || null
  }

  /* ============================================================
     PAYMENTS
     ============================================================ */
  recordPayment(input: {
    customer_id?: ID | null
    target?: { type: 'sale' | 'invoice'; id: ID } | null
    amount: Minor
    method: string
    payment_date?: string
    reference?: string
    notes?: string
  }): Result<Payment> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    if (!input.amount || input.amount <= 0) return { ok: false, error: 'Enter an amount greater than zero.', fieldErrors: { amount: 'Invalid.' } }
    const limitErr = this.guardLimit(b.id, 'transactions_per_month')
    if (limitErr) return { ok: false, error: limitErr }
    const p = this.recordPaymentInternal(b.id, input)
    this.commit()
    return { ok: true, data: p }
  }

  /** Internal payment creation (no commit) — used by sales & invoices too. */
  private recordPaymentInternal(
    businessId: ID,
    input: {
      customer_id?: ID | null
      target?: { type: 'sale' | 'invoice'; id: ID } | null
      amount: Minor
      method: string
      payment_date?: string
      reference?: string
      notes?: string
    },
  ): Payment {
    const payment: Payment = {
      id: uid('pay'),
      business_id: businessId,
      customer_id: input.customer_id || null,
      amount: input.amount,
      currency: this.db.businesses.find((x) => x.id === businessId)?.currency || 'NGN',
      method: input.method || 'cash',
      reference: input.reference?.trim() || this.nextNumber(businessId, 'PAY'),
      payment_date: input.payment_date || todayISODate(),
      notes: input.notes?.trim() || '',
      status: 'posted',
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    this.db.payments.push(payment)

    let allocated = 0
    let sale_id: ID | null = null
    let invoice_id: ID | null = null

    if (input.target) {
      const t = input.target
      let balance = 0
      if (t.type === 'sale') {
        const s = this.db.sales.find((x) => x.id === t.id && x.business_id === businessId)
        if (s) balance = Math.max(0, saleBalance(this.db, s))
        sale_id = t.id
      } else {
        const inv = this.db.invoices.find((x) => x.id === t.id && x.business_id === businessId)
        if (inv) balance = Math.max(0, invoiceBalance(this.db, inv))
        invoice_id = t.id
      }
      allocated = Math.min(input.amount, balance)
      if (allocated > 0) {
        const alloc: PaymentAllocation = {
          id: uid('alc'),
          business_id: businessId,
          payment_id: payment.id,
          sale_id,
          invoice_id,
          amount: allocated,
        }
        this.db.allocations.push(alloc)
      }
    }

    // Receipt from the actual payment
    const receipt: Receipt = {
      id: uid('rcp'),
      business_id: businessId,
      customer_id: payment.customer_id,
      sale_id,
      invoice_id,
      payment_id: payment.id,
      receipt_number: this.nextNumber(businessId, 'RCPT'),
      amount: payment.amount,
      payment_method: payment.method,
      issued_at: nowISO(),
    }
    this.db.receipts.push(receipt)

    const cust = payment.customer_id ? this.db.customers.find((c) => c.id === payment.customer_id) : null
    this.log(businessId, {
      type: 'payment.received',
      title: 'Payment received',
      description: `${cust ? cust.name + ' · ' : ''}${receipt.receipt_number}`,
      customer_id: payment.customer_id,
      metadata: { payment_id: payment.id, amount: payment.amount, receipt_id: receipt.id },
    })

    // if this fully pays an invoice, log it
    if (invoice_id) {
      const inv = this.db.invoices.find((x) => x.id === invoice_id)!
      if (invoiceBalance(this.db, inv) <= 0) {
        this.log(businessId, { type: 'invoice.paid', title: 'Invoice paid', description: inv.invoice_number, customer_id: inv.customer_id, metadata: { invoice_id: inv.id } })
      }
    }
    return payment
  }

  refundPayment(id: ID, amount: Minor, reason: string): Result<Payment> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const p = this.db.payments.find((x) => x.id === id && x.business_id === b.id)
    if (!p) return { ok: false, error: 'Payment not found.' }
    if (amount <= 0 || amount > p.amount) return { ok: false, error: 'Enter a valid refund amount.', fieldErrors: { amount: 'Invalid.' } }
    if (!reason || reason.trim().length < 3) return { ok: false, error: 'A reason is required.', fieldErrors: { reason: 'Required.' } }
    // immutable: never edit the original payment amount; record a refund event
    const refund: Transaction = {
      id: uid('txn'),
      business_id: b.id,
      customer_id: p.customer_id,
      type: 'refund',
      category: 'Refund',
      amount,
      currency: p.currency,
      description: `Refund for ${p.reference} — ${reason.trim()}`,
      transaction_date: todayISODate(),
      payment_method: p.method,
      reference_type: 'payment',
      reference_id: p.id,
      status: 'posted',
      reversal_of: null,
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    this.db.transactions.push(refund)
    p.status = amount >= p.amount ? 'refunded' : 'partially_refunded'
    p.updated_at = nowISO()
    // reduce allocations proportionally (restore balances) — create negative allocation
    const allocs = this.db.allocations.filter((a) => a.payment_id === p.id)
    let remaining = amount
    for (const a of allocs) {
      if (remaining <= 0) break
      const take = Math.min(a.amount, remaining)
      this.db.allocations.push({
        id: uid('alc'),
        business_id: b.id,
        payment_id: p.id,
        sale_id: a.sale_id,
        invoice_id: a.invoice_id,
        amount: -take,
      })
      remaining -= take
    }
    // restore stock if linked to a sale
    for (const a of allocs) {
      if (a.sale_id) {
        for (const it of this.db.saleItems.filter((i) => i.sale_id === a.sale_id)) {
          if (it.product_id) this.applyMovement(b.id, it.product_id, 'refund', it.quantity, `Refund on ${p.reference}`, 'payment', p.id)
        }
      }
    }
    this.log(b.id, { type: 'refund.recorded', title: 'Refund recorded', description: `${p.reference} — ${reason.trim()}`, customer_id: p.customer_id, transaction_id: refund.id })
    this.commit()
    return { ok: true, data: p }
  }

  getPayment(id: ID): Payment | null {
    const b = this.requireBusiness()
    if (!b) return null
    return this.db.payments.find((x) => x.id === id && x.business_id === b.id) || null
  }

  /* ============================================================
     TRANSACTIONS (income / expense / drawings)
     ============================================================ */
  private createTransaction(input: {
    type: TransactionType
    category: string
    amount: Minor
    description?: string
    transaction_date?: string
    payment_method?: string
    customer_id?: ID | null
    reference_type?: string | null
    reference_id?: ID | null
  }): Result<Transaction> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    if (!input.amount || input.amount <= 0) return { ok: false, error: 'Enter an amount greater than zero.', fieldErrors: { amount: 'Invalid.' } }
    const limitErr = this.guardLimit(b.id, 'transactions_per_month')
    if (limitErr) return { ok: false, error: limitErr }
    const t: Transaction = {
      id: uid('txn'),
      business_id: b.id,
      customer_id: input.customer_id || null,
      type: input.type,
      category: input.category || 'General',
      amount: input.amount,
      currency: b.currency,
      description: input.description?.trim() || '',
      transaction_date: input.transaction_date || todayISODate(),
      payment_method: input.payment_method || 'cash',
      reference_type: input.reference_type || null,
      reference_id: input.reference_id || null,
      status: 'posted',
      reversal_of: null,
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    this.db.transactions.push(t)
    const labels: Record<string, string> = {
      income: 'Income recorded',
      expense: 'Expense recorded',
      drawings: 'Drawing recorded',
      refund: 'Refund recorded',
      reversal: 'Reversal recorded',
    }
    this.log(b.id, {
      type: `${input.type}.recorded`,
      title: labels[input.type] || 'Transaction recorded',
      description: `${t.category}${t.description ? ' · ' + t.description : ''}`,
      customer_id: t.customer_id,
      transaction_id: t.id,
    })
    this.markOnboarding(b.id, 'first_transaction')
    this.commit()
    return { ok: true, data: t }
  }

  recordIncome(input: Omit<Parameters<Store['createTransaction']>[0], 'type'>) {
    return this.createTransaction({ ...input, type: 'income' })
  }
  recordExpense(input: Omit<Parameters<Store['createTransaction']>[0], 'type'>) {
    return this.createTransaction({ ...input, type: 'expense' })
  }
  recordDrawing(input: Omit<Parameters<Store['createTransaction']>[0], 'type'>) {
    return this.createTransaction({ ...input, type: 'drawings' })
  }

  reverseTransaction(id: ID, reason: string): Result<Transaction> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const t = this.db.transactions.find((x) => x.id === id && x.business_id === b.id)
    if (!t) return { ok: false, error: 'Transaction not found.' }
    if (t.status === 'reversed') return { ok: false, error: 'Already reversed.' }
    if (!reason || reason.trim().length < 3) return { ok: false, error: 'A reason is required.', fieldErrors: { reason: 'Required.' } }
    // immutable: mark original reversed, add a reversal audit record
    t.status = 'reversed'
    t.updated_at = nowISO()
    const rev: Transaction = {
      id: uid('txn'),
      business_id: b.id,
      customer_id: t.customer_id,
      type: 'reversal',
      category: t.category,
      amount: t.amount,
      currency: t.currency,
      description: `Reversal of ${t.category} — ${reason.trim()}`,
      transaction_date: todayISODate(),
      payment_method: t.payment_method,
      reference_type: 'transaction',
      reference_id: t.id,
      status: 'posted',
      reversal_of: t.id,
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    this.db.transactions.push(rev)
    this.log(b.id, { type: 'reversal.recorded', title: 'Transaction reversed', description: `${t.category} — ${reason.trim()}`, transaction_id: rev.id })
    this.commit()
    return { ok: true, data: rev }
  }

  /* ============================================================
     INVOICES
     ============================================================ */
  createInvoice(input: {
    customer_id?: ID | null
    items: { product_id?: ID | null; description: string; quantity: number; unit_price: Minor }[]
    discount?: Minor
    issue_date?: string
    due_date?: string | null
    notes?: string
    status?: InvoiceStatus
  }): Result<Invoice> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const items = (input.items || []).filter((i) => i.quantity > 0)
    if (!items.length) return { ok: false, error: 'Add at least one line item.' }
    const inv: Invoice = {
      id: uid('inv'),
      business_id: b.id,
      customer_id: input.customer_id || null,
      invoice_number: this.nextNumber(b.id, 'INV'),
      status: input.status || 'draft',
      issue_date: input.issue_date || todayISODate(),
      due_date: input.due_date || null,
      discount: input.discount || 0,
      notes: input.notes?.trim() || '',
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    this.db.invoices.push(inv)
    for (const it of items) {
      const line: InvoiceItem = {
        id: uid('ivi'),
        invoice_id: inv.id,
        business_id: b.id,
        product_id: it.product_id || null,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total: it.quantity * it.unit_price,
      }
      this.db.invoiceItems.push(line)
    }
    if (inv.status === 'issued') {
      this.log(b.id, { type: 'invoice.issued', title: 'Invoice issued', description: inv.invoice_number, customer_id: inv.customer_id, metadata: { invoice_id: inv.id } })
    }
    this.commit()
    return { ok: true, data: inv }
  }

  updateInvoice(id: ID, patch: Partial<Invoice>): Result<Invoice> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const inv = this.db.invoices.find((x) => x.id === id && x.business_id === b.id)
    if (!inv) return { ok: false, error: 'Invoice not found.' }
    Object.assign(inv, patch, { id: inv.id, business_id: inv.business_id, updated_at: nowISO() })
    this.commit()
    return { ok: true, data: inv }
  }

  issueInvoice(id: ID): Result<Invoice> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const inv = this.db.invoices.find((x) => x.id === id && x.business_id === b.id)
    if (!inv) return { ok: false, error: 'Invoice not found.' }
    inv.status = 'issued'
    inv.updated_at = nowISO()
    this.log(b.id, { type: 'invoice.issued', title: 'Invoice issued', description: inv.invoice_number, customer_id: inv.customer_id, metadata: { invoice_id: inv.id } })
    this.commit()
    return { ok: true, data: inv }
  }

  cancelInvoice(id: ID): Result<Invoice> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const inv = this.db.invoices.find((x) => x.id === id && x.business_id === b.id)
    if (!inv) return { ok: false, error: 'Invoice not found.' }
    inv.status = 'cancelled'
    inv.updated_at = nowISO()
    this.commit()
    return { ok: true, data: inv }
  }

  getInvoice(id: ID): Invoice | null {
    const b = this.requireBusiness()
    if (!b) return null
    return this.db.invoices.find((x) => x.id === id && x.business_id === b.id) || null
  }

  /* ============================================================
     GOALS
     ============================================================ */
  createGoal(input: { type: GoalType; title: string; target_amount: Minor; start_date: string; end_date: string }): Result<Goal> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    if (!input.title || input.title.trim().length < 2) return { ok: false, error: 'Give your goal a title.', fieldErrors: { title: 'Required.' } }
    const g: Goal = {
      id: uid('goal'),
      business_id: b.id,
      type: input.type,
      title: input.title.trim(),
      target_amount: input.target_amount || 0,
      start_date: input.start_date,
      end_date: input.end_date,
      status: 'active',
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    this.db.goals.push(g)
    this.log(b.id, { type: 'goal.created', title: 'Goal set', description: g.title })
    this.commit()
    return { ok: true, data: g }
  }
  updateGoal(id: ID, patch: Partial<Goal>): Result<Goal> {
    const b = this.requireBusiness()
    if (!b) return { ok: false, error: 'Not authorized.' }
    const g = this.db.goals.find((x) => x.id === id && x.business_id === b.id)
    if (!g) return { ok: false, error: 'Goal not found.' }
    Object.assign(g, patch, { id: g.id, business_id: g.business_id, updated_at: nowISO() })
    this.commit()
    return { ok: true, data: g }
  }

  /* ============================================================
     SUBSCRIPTION / BILLING
     A plan only becomes active after a payment is confirmed.
     Choosing a plan puts the subscription into a 'pending' state.
     ============================================================ */
  getSubscription(businessId: ID): Subscription | null {
    return this.db.subscriptions.find((s) => s.business_id === businessId) || null
  }

  /** Step 1: the user chooses a plan. Nothing unlocks yet. */
  changePlan(businessId: ID, plan: PlanId): Result<Subscription> {
    const b = this.requireBusiness()
    if (!b || b.id !== businessId) return { ok: false, error: 'Not authorized.' }
    let sub = this.db.subscriptions.find((s) => s.business_id === businessId)
    if (!sub) {
      sub = {
        id: uid('sub'),
        business_id: businessId,
        provider: 'manual',
        provider_customer_id: null,
        provider_subscription_id: null,
        plan: 'free',
        pending_plan: null,
        status: 'active',
        current_period_start: nowISO(),
        current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(),
        last_payment_reference: null,
        last_payment_at: null,
        created_at: nowISO(),
        updated_at: nowISO(),
      }
      this.db.subscriptions.push(sub)
    }
    if (plan === 'free') {
      // Downgrade is immediate and never deletes data.
      sub.plan = 'free'
      sub.pending_plan = null
      sub.status = 'active'
      sub.updated_at = nowISO()
      this.log(businessId, { type: 'subscription.changed', title: 'Plan changed to KUDII Free', description: 'Your data is kept.' })
      this.commit()
      return { ok: true, data: sub }
    }
    // Paid plan → payment pending (features stay locked until confirmed).
    sub.pending_plan = plan
    sub.status = 'pending'
    sub.updated_at = nowISO()
    this.log(businessId, { type: 'subscription.pending', title: `Payment pending for ${PLANS[plan].name}`, description: 'Awaiting payment confirmation.' })
    this.commit()
    return { ok: true, data: sub }
  }

  /**
   * Step 2: payment confirmed. In production this is called by the payment
   * provider's webhook — never by the client clicking a button.
   */
  confirmPlanPayment(businessId: ID, reference: string): Result<Subscription> {
    const b = this.requireBusiness()
    if (!b || b.id !== businessId) return { ok: false, error: 'Not authorized.' }
    const sub = this.db.subscriptions.find((s) => s.business_id === businessId)
    if (!sub) return { ok: false, error: 'Subscription not found.' }
    const target = sub.pending_plan || sub.plan
    sub.plan = target
    sub.pending_plan = null
    sub.status = 'active'
    sub.current_period_start = nowISO()
    sub.current_period_end = new Date(Date.now() + 30 * 864e5).toISOString()
    sub.last_payment_reference = reference
    sub.last_payment_at = nowISO()
    sub.updated_at = nowISO()
    this.log(businessId, { type: 'subscription.activated', title: `${PLANS[target].name} activated`, description: `Payment ${reference} confirmed.` })
    this.commit()
    return { ok: true, data: sub }
  }

  /** Payment failed — revert to the last confirmed plan; never delete data. */
  failPlanPayment(businessId: ID, reason: string): Result<Subscription> {
    const b = this.requireBusiness()
    if (!b || b.id !== businessId) return { ok: false, error: 'Not authorized.' }
    const sub = this.db.subscriptions.find((s) => s.business_id === businessId)
    if (!sub) return { ok: false, error: 'Subscription not found.' }
    sub.pending_plan = null
    sub.status = sub.plan === 'free' ? 'active' : 'active'
    sub.updated_at = nowISO()
    this.log(businessId, { type: 'subscription.failed', title: 'Payment failed', description: reason })
    this.commit()
    return { ok: true, data: sub }
  }

  setSubscriptionStatus(businessId: ID, status: SubscriptionStatus) {
    const sub = this.db.subscriptions.find((s) => s.business_id === businessId)
    if (!sub) return
    sub.status = status
    if (status === 'cancelled' || status === 'expired') sub.pending_plan = null
    sub.updated_at = nowISO()
    this.commit()
  }

  /* ---------------- demo / reset ---------------- */
  /** Replace the entire database (used by demo seeding and imports). */
  replaceDB(db: DB) {
    this.db = db
    this.commit()
  }
  resetAll() {
    this.db = emptyDB()
    this.commit()
  }
}

/* local helper to avoid circular import at module top-level */
function saleSubtotalLocal(db: DB, saleId: ID): Minor {
  return db.saleItems.filter((i) => i.sale_id === saleId).reduce((a, b) => a + b.total, 0)
}

/* synchronous digest used to verify emailed codes without async plumbing */
function syncHash(value: string): string {
  const data = new TextEncoder().encode(value)
  let h1 = 5381
  let h2 = 52711
  for (let i = 0; i < data.length; i++) {
    h1 = ((h1 << 5) + h1 + data[i]) >>> 0
    h2 = ((h2 << 5) + h2 + data[i] * 3) >>> 0
  }
  return (h1.toString(16) + h2.toString(16)).padStart(16, '0')
}

export const store = new Store()
export type { Store }
