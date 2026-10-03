/* ============================================================
   KUDII — Forms / Composers
   ============================================================ */
import { useMemo, useState } from 'react'
import { Plus, Trash2, UserPlus, Package, Wallet, TrendingDown, PiggyBank, Receipt, FileText, HandCoins, ArrowUpRight } from 'lucide-react'
import { store } from '../lib/store'
import { navigate } from '../lib/router'
import { useDB, useToast } from '../lib/hooks'
import {
  Modal,
  Field,
  Input,
  Textarea,
  Select,
  Button,
  ErrorBanner,
  IconButton,
  Avatar,
} from './ui'
import { parseAmount, currencySymbol, formatMoney, todayISODate, toMinor, uid } from '../lib/utils'
import { saleBalance, invoiceBalance, invoiceTotal, saleTotal } from '../lib/derive'
import type { Minor, GoalType } from '../lib/types'
import type { ComposerParams } from './composer-context'

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'pos', label: 'POS' },
  { value: 'ussd', label: 'USSD' },
  { value: 'other', label: 'Other' },
]
const INCOME_CATS = ['Sales', 'Consultation', 'Service', 'Delivery', 'Interest', 'Other']
const EXPENSE_CATS = ['Materials', 'Rent', 'Salaries', 'Utilities', 'Transport', 'Marketing', 'Equipment', 'Repairs', 'Other']
const BUSINESS_CATEGORIES = [
  'Retail & Shop',
  'Food & Beverage',
  'Fashion & Apparel',
  'Electronics',
  'Beauty & Personal Care',
  'Services',
  'Wholesale & Distribution',
  'Pharmacy & Health',
  'Agriculture',
  'Construction',
  'Professional Services',
  'Other',
]

function AmountInput({
  value,
  onChange,
  currency,
  placeholder,
  autoFocus,
  invalid,
}: {
  value: string
  onChange: (v: string) => void
  currency: string
  placeholder?: string
  autoFocus?: boolean
  invalid?: boolean
}) {
  return (
    <div className="input-affix">
      <span className="affix">{currencySymbol(currency)}</span>
      <input
        className={`input ${invalid ? 'invalid' : ''}`}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || '0.00'}
        autoFocus={autoFocus}
      />
    </div>
  )
}

/* ---------------- Discount (Stage 8) ---------------- */
/**
 * Compute a discount in integer minor units, clamped per product rules:
 * - Percentage is limited to 0-100.
 * - Fixed amount cannot exceed the subtotal.
 * Never mutates stored values; only used for display + the amount persisted.
 */
function computeDiscount(type: 'percent' | 'fixed', value: string, subtotal: Minor, currency: string): Minor {
  if (type === 'percent') {
    const pct = Math.max(0, Math.min(100, Number(value) || 0))
    return Math.round((subtotal * pct) / 100)
  }
  const raw = parseAmount(value, currency) || 0
  return Math.max(0, Math.min(raw, subtotal))
}

function clampPct(value: string): number {
  return Math.min(100, Math.max(0, Number(value) || 0))
}

function DiscountField({
  type,
  onTypeChange,
  value,
  onChange,
  currency,
  discountMinor,
}: {
  type: 'percent' | 'fixed'
  onTypeChange: (t: 'percent' | 'fixed') => void
  value: string
  onChange: (v: string) => void
  currency: string
  discountMinor: Minor
}) {
  return (
    <Field
      label="Discount"
      hint={type === 'percent' ? 'Percentage of the subtotal (0-100).' : 'Fixed amount, cannot be more than the subtotal.'}
    >
      <div className="discount-field">
        <div className="segmented" role="tablist" aria-label="Discount type">
          <button
            type="button"
            role="tab"
            aria-selected={type === 'percent'}
            className={type === 'percent' ? 'active' : ''}
            onClick={() => onTypeChange('percent')}
          >
            %
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={type === 'fixed'}
            className={type === 'fixed' ? 'active' : ''}
            onClick={() => onTypeChange('fixed')}
          >
            Fixed
          </button>
        </div>
        <div className="discount-input">
          {type === 'percent' ? (
            <div className="input-affix affix-end">
              <input
                className="input"
                inputMode="decimal"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="0"
                aria-label="Discount percentage"
              />
              <span className="affix">%</span>
            </div>
          ) : (
            <AmountInput value={value} onChange={onChange} currency={currency} placeholder="0.00" />
          )}
        </div>
      </div>
      {discountMinor > 0 && <span className="discount-note">= {formatMoney(discountMinor, currency)} off</span>}
    </Field>
  )
}

/* ============================================================
   CUSTOMER
   ============================================================ */
export function CustomerForm({ params, onClose, onDone }: { params: ComposerParams; onClose: () => void; onDone: (result?: any) => void }) {
  const db = useDB()
  const toast = useToast()
  const existing = params.id ? db.customers.find((c) => c.id === params.id) : null
  const [name, setName] = useState(existing?.name || '')
  const [email, setEmail] = useState(existing?.email || '')
  const [phone, setPhone] = useState(existing?.phone || '')
  const [address, setAddress] = useState(existing?.address || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')

  const save = () => {
    setErrors({})
    setErr('')
    const res = existing
      ? store.updateCustomer(existing.id, { name, email, phone, address, notes })
      : store.createCustomer({ name, email, phone, address, notes })
    if (!res.ok) {
      setErrors(res.fieldErrors || {})
      setErr(res.error || '')
      return
    }
    toast.push(existing ? 'Customer updated' : 'Customer added')
    onDone(res.data)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Edit customer' : 'New customer'}
      subtitle={existing ? undefined : 'Add someone you do business with.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            {existing ? 'Save changes' : 'Add customer'}
          </Button>
        </>
      }
    >
      {err && <ErrorBanner>{err}</ErrorBanner>}
      <div className="stack gap-4 mt-2">
        <Field label="Full name" required error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chioma Nwosu" autoFocus invalid={!!errors.name} />
        </Field>
        <div className="grid grid-form" style={{ gap: 'var(--s-4)' }}>
          <Field label="Email" error={errors.email}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" invalid={!!errors.email} />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 803 000 0000" invalid={!!errors.phone} />
          </Field>
        </div>
        <Field label="Address">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city" />
        </Field>
        <Field label="Notes" hint="Anything useful to remember about this customer.">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferences, referrals, reminders…" />
        </Field>
      </div>
    </Modal>
  )
}

/* ============================================================
   PRODUCT
   ============================================================ */
export function ProductForm({ params, onClose, onDone }: { params: ComposerParams; onClose: () => void; onDone: (result?: any) => void }) {
  const db = useDB()
  const biz = store.activeBusiness()!
  const toast = useToast()
  const existing = params.id ? db.products.find((p) => p.id === params.id) : null
  const [name, setName] = useState(existing?.name || '')
  const [description, setDescription] = useState(existing?.description || '')
  const [selling, setSelling] = useState(existing ? String(existing.selling_price / 100) : '')
  const [cost, setCost] = useState(existing ? String(existing.cost_price / 100) : '')
  const [opening, setOpening] = useState('')
  const [low, setLow] = useState(existing ? String(existing.low_stock_threshold) : '5')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')
  const [needsUpgrade, setNeedsUpgrade] = useState(false)

  const save = () => {
    setErrors({})
    setErr('')
    setNeedsUpgrade(false)
    const sellingMinor = parseAmount(selling, biz.currency)
    const costMinor = parseAmount(cost, biz.currency) || 0
    if (existing) {
      const res = store.updateProduct(existing.id, {
        name,
        description,
        selling_price: sellingMinor || 0,
        cost_price: costMinor,
        low_stock_threshold: Number(low) || 0,
      })
      if (!res.ok) {
        setErrors(res.fieldErrors || {})
        setErr(res.error || '')
        return
      }
      toast.push('Product updated')
      onDone(res.data)
    } else {
      const res = store.createProduct({
        name,
        description,
        selling_price: sellingMinor || 0,
        cost_price: costMinor,
        low_stock_threshold: Number(low) || 0,
        stock_quantity: Number(opening) || 0,
      })
      if (!res.ok) {
        setErrors(res.fieldErrors || {})
        const msg = res.error || ''
        if (/limit|upgrade/i.test(msg)) setNeedsUpgrade(true)
        setErr(msg)
        return
      }
      toast.push('Product added')
      onDone(res.data)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Edit product' : 'Add product'}
      subtitle={existing ? undefined : 'Products you sell so KUDII can track sales and stock.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            {existing ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      {err && <ErrorBanner>{err}</ErrorBanner>}
      {needsUpgrade && (
        <div className="row-between mt-3" style={{ gap: 12, flexWrap: 'wrap' }}>
          <span className="text-sm muted">Add more products on a bigger plan.</span>
          <Button
            variant="primary"
            size="sm"
            icon={ArrowUpRight}
            onClick={() => {
              onClose()
              navigate('/settings?tab=plan')
            }}
          >
            See plans
          </Button>
        </div>
      )}
      <div className="stack gap-4 mt-2">
        <Field label="Product name" required error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ankara Fabric (6 yards)" autoFocus invalid={!!errors.name} />
        </Field>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
        </Field>
        <div className="grid grid-form" style={{ gap: 'var(--s-4)' }}>
          <Field label="Selling price" required error={errors.selling_price}>
            <AmountInput value={selling} onChange={setSelling} currency={biz.currency} invalid={!!errors.selling_price} />
          </Field>
          <Field label="Cost price" hint="Used for profit insight.">
            <AmountInput value={cost} onChange={setCost} currency={biz.currency} />
          </Field>
        </div>
        <Field label="Low-stock alert at" hint="KUDII flags this product when stock falls to this level.">
          <Input type="number" min="0" value={low} onChange={(e) => setLow(e.target.value)} />
        </Field>
        {!existing && (
          <Field label="Opening stock" hint="Optional. Creates a restock movement.">
            <Input type="number" min="0" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0" />
          </Field>
        )}
      </div>
    </Modal>
  )
}

/* ============================================================
   SALE
   ============================================================ */
interface Line {
  key: string
  product_id: string | null
  description: string
  quantity: string
  unit_price: string
}
export function SaleComposer({ params, onClose, onDone }: { params: ComposerParams; onClose: () => void; onDone: (result?: any) => void }) {
  const db = useDB()
  const biz = store.activeBusiness()!
  const toast = useToast()
  const products = db.products.filter((p) => p.business_id === biz.id && p.status === 'active')
  const customers = db.customers.filter((c) => c.business_id === biz.id && c.status === 'active')

  const [customerId, setCustomerId] = useState(params.customer_id || '')
  const [lines, setLines] = useState<Line[]>([{ key: uid('l'), product_id: null, description: '', quantity: '1', unit_price: '' }])
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed')
  const [discountPct, setDiscountPct] = useState('')
  const [discountFixed, setDiscountFixed] = useState('')
  const [paid, setPaid] = useState('')
  const [method, setMethod] = useState('transfer')
  const [date, setDate] = useState(todayISODate())
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')

  const subtotal = useMemo(
    () => lines.reduce((a, l) => a + (parseAmount(l.unit_price, biz.currency) || 0) * (Number(l.quantity) || 0), 0),
    [lines, biz.currency],
  )
  const discountValue = discountType === 'percent' ? discountPct : discountFixed
  const discountMinor = computeDiscount(discountType, discountValue, subtotal, biz.currency)
  const discountLabel =
    discountType === 'percent' && discountMinor > 0 ? `Discount (${clampPct(discountPct)}%)` : 'Discount'
  const total = Math.max(0, subtotal - discountMinor)
  const paidMinor = parseAmount(paid, biz.currency) || 0
  const balance = Math.max(0, total - paidMinor)

  const setLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const addLine = () => setLines((ls) => [...ls, { key: uid('l'), product_id: null, description: '', quantity: '1', unit_price: '' }])
  const removeLine = (key: string) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls))

  const onPickProduct = (key: string, pid: string) => {
    const p = products.find((x) => x.id === pid)
    if (!p) {
      setLine(key, { product_id: null })
      return
    }
    setLine(key, { product_id: p.id, description: p.name, unit_price: String(p.selling_price / 100) })
  }

  const save = () => {
    setErr('')
    const items = lines
      .filter((l) => l.description.trim() && Number(l.quantity) > 0)
      .map((l) => ({
        product_id: l.product_id,
        description: l.description.trim(),
        quantity: Number(l.quantity),
        unit_price: parseAmount(l.unit_price, biz.currency) || 0,
      }))
    if (!items.length) {
      setErr('Add at least one product or line to the sale.')
      return
    }
    const res = store.createSale({
      customer_id: customerId || null,
      items,
      discount: discountMinor,
      sale_date: date,
      notes,
      payment: paidMinor > 0 ? { amount: paidMinor, method } : null,
    })
    if (!res.ok) {
      setErr(res.error || '')
      return
    }
    toast.push('Sale recorded')
    onDone(res.data)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New sale"
      subtitle="Products → quantity → payment. KUDII updates stock and receipts for you."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Record sale
          </Button>
        </>
      }
    >
      {err && <ErrorBanner>{err}</ErrorBanner>}
      <div className="composer mt-2">
        <div className="grid grid-form" style={{ gap: 'var(--s-4)' }}>
          <Field label="Customer" hint="Optional — leave blank for walk-in.">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in / no customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sale date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <div className="stack gap-3">
          <span className="label">Items</span>
          {lines.map((l) => {
            const lineTotal = (parseAmount(l.unit_price, biz.currency) || 0) * (Number(l.quantity) || 0)
            return (
              <div className="line-item" key={l.key}>
                <div className="li-name">
                  <Select value={l.product_id || ''} onChange={(e) => onPickProduct(l.key, e.target.value)}>
                    <option value="">Custom line…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                  {!l.product_id && (
                    <Input
                      className="mt-2"
                      value={l.description}
                      onChange={(e) => setLine(l.key, { description: e.target.value })}
                      placeholder="Description"
                    />
                  )}
                </div>
                <Input
                  className="li-qty"
                  type="number"
                  min="1"
                  value={l.quantity}
                  onChange={(e) => setLine(l.key, { quantity: e.target.value })}
                  aria-label="Quantity"
                />
                <div className="li-price">
                  <AmountInput value={l.unit_price} onChange={(v) => setLine(l.key, { unit_price: v })} currency={biz.currency} placeholder="Price" />
                </div>
                <div className="li-total">{formatMoney(lineTotal, biz.currency)}</div>
                <button className="btn btn-icon btn-sm li-del" onClick={() => removeLine(l.key)} aria-label="Remove line" type="button">
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
          <Button variant="soft" size="sm" icon={Plus} onClick={addLine} style={{ alignSelf: 'flex-start' }}>
            Add line
          </Button>
        </div>

        <div className="grid grid-form" style={{ gap: 'var(--s-5)' }}>
          <div className="stack gap-4">
            <DiscountField
              type={discountType}
              onTypeChange={setDiscountType}
              value={discountValue}
              onChange={discountType === 'percent' ? setDiscountPct : setDiscountFixed}
              currency={biz.currency}
              discountMinor={discountMinor}
            />
            <Field label="Amount paid now" hint="Leave blank if not paying yet.">
              <AmountInput value={paid} onChange={setPaid} currency={biz.currency} placeholder="0.00" />
            </Field>
            <Field label="Payment method">
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="totals">
            <div className="tr">
              <span>Subtotal</span>
              <span className="v">{formatMoney(subtotal, biz.currency)}</span>
            </div>
            <div className="tr">
              <span>{discountLabel}</span>
              <span className="v">− {formatMoney(discountMinor, biz.currency)}</span>
            </div>
            <div className="tr grand">
              <span>Total</span>
              <span className="v">{formatMoney(total, biz.currency)}</span>
            </div>
            <div className="tr">
              <span>Paid</span>
              <span className="v">{formatMoney(paidMinor, biz.currency)}</span>
            </div>
            <div className="tr">
              <span>Balance</span>
              <span className="v" style={{ color: balance > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {formatMoney(balance, biz.currency)}
              </span>
            </div>
          </div>
        </div>

        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </Field>
      </div>
    </Modal>
  )
}

/* ============================================================
   TRANSACTION (income / expense / drawings)
   ============================================================ */
export function TransactionForm({
  kind,
  params,
  onClose,
  onDone,
}: {
  kind: 'income' | 'expense' | 'drawings'
  params: ComposerParams
  onClose: () => void
  onDone: (result?: any) => void
}) {
  const db = useDB()
  const biz = store.activeBusiness()!
  const toast = useToast()
  const customers = db.customers.filter((c) => c.business_id === biz.id && c.status === 'active')
  const cats = kind === 'income' ? INCOME_CATS : kind === 'expense' ? EXPENSE_CATS : ['Personal']
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(cats[0])
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayISODate())
  const [method, setMethod] = useState(kind === 'expense' ? 'cash' : 'transfer')
  const [customerId, setCustomerId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')

  const titles = { income: 'Record income', expense: 'Record expense', drawings: 'Record drawing' }
  const subtitles = {
    income: 'Money coming into the business.',
    expense: 'Money going out for the business.',
    drawings: 'Personal withdrawals — kept separate from business expenses.',
  }

  const save = () => {
    setErrors({})
    setErr('')
    const amountMinor = parseAmount(amount, biz.currency)
    if (!amountMinor || amountMinor <= 0) {
      setErrors({ amount: 'Enter an amount.' })
      return
    }
    const payload = {
      amount: amountMinor,
      category,
      description,
      transaction_date: date,
      payment_method: method,
      customer_id: kind === 'income' ? customerId || null : null,
    }
    const res =
      kind === 'income' ? store.recordIncome(payload) : kind === 'expense' ? store.recordExpense(payload) : store.recordDrawing(payload)
    if (!res.ok) {
      setErrors(res.fieldErrors || {})
      setErr(res.error || '')
      return
    }
    toast.push(titles[kind].replace('Record', '') + ' recorded'.trim())
    onDone(res.data)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={titles[kind]}
      subtitle={subtitles[kind]}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      {err && <ErrorBanner>{err}</ErrorBanner>}
      <div className="stack gap-4 mt-2">
        <Field label="Amount" required error={errors.amount}>
          <AmountInput value={amount} onChange={setAmount} currency={biz.currency} autoFocus invalid={!!errors.amount} />
        </Field>
        <div className="grid grid-form" style={{ gap: 'var(--s-4)' }}>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        {kind === 'income' && (
          <Field label="Customer" hint="Optional">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">None</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Payment method">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for?" />
        </Field>
      </div>
    </Modal>
  )
}

/* ============================================================
   PAYMENT
   ============================================================ */
export function PaymentComposer({ params, onClose, onDone }: { params: ComposerParams; onClose: () => void; onDone: (result?: any) => void }) {
  const db = useDB()
  const biz = store.activeBusiness()!
  const toast = useToast()
  const customers = db.customers.filter((c) => c.business_id === biz.id && c.status === 'active')
  const [customerId, setCustomerId] = useState(params.customer_id || '')
  const [target, setTarget] = useState(params.sale_id ? `sale:${params.sale_id}` : params.invoice_id ? `invoice:${params.invoice_id}` : '')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('transfer')
  const [date, setDate] = useState(todayISODate())
  const [notes, setNotes] = useState('')
  const [reference, setReference] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')

  const outstandingItems = useMemo(() => {
    const out: { key: string; label: string; balance: Minor }[] = []
    if (customerId) {
      for (const s of db.sales.filter((x) => x.business_id === biz.id && x.customer_id === customerId && x.status !== 'cancelled')) {
        const b = saleBalance(db, s)
        if (b > 0) out.push({ key: `sale:${s.id}`, label: `${s.sale_number} · Sale`, balance: b })
      }
      for (const i of db.invoices.filter((x) => x.business_id === biz.id && x.customer_id === customerId && x.status !== 'cancelled' && x.status !== 'draft')) {
        const b = invoiceBalance(db, i)
        if (b > 0) out.push({ key: `invoice:${i.id}`, label: `${i.invoice_number} · Invoice`, balance: b })
      }
    }
    return out
  }, [customerId, db, biz.id])

  const selected = outstandingItems.find((o) => o.key === target)

  const save = () => {
    setErrors({})
    setErr('')
    const amountMinor = parseAmount(amount, biz.currency)
    if (!amountMinor || amountMinor <= 0) {
      setErrors({ amount: 'Enter an amount.' })
      return
    }
    let t: { type: 'sale' | 'invoice'; id: string } | null = null
    if (target) {
      const [type, id] = target.split(':')
      t = { type: type as 'sale' | 'invoice', id }
    }
    const res = store.recordPayment({
      customer_id: customerId || null,
      target: t,
      amount: amountMinor,
      method,
      reference,
      payment_date: date,
      notes,
    })
    if (!res.ok) {
      setErrors(res.fieldErrors || {})
      setErr(res.error || '')
      return
    }
    toast.push('Payment recorded · receipt ready')
    onDone(res.data)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Record payment"
      subtitle="Money is recognised only when an actual payment is recorded."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Record payment
          </Button>
        </>
      }
    >
      {err && <ErrorBanner>{err}</ErrorBanner>}
      <div className="stack gap-4 mt-2">
        <Field label="Customer">
          <Select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value)
              setTarget('')
            }}
          >
            <option value="">No customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        {customerId && (
          <Field label="Apply to" hint={outstandingItems.length ? 'Choose what this payment settles.' : 'No outstanding items — recorded as credit.'}>
            <Select
              value={target}
              onChange={(e) => {
                setTarget(e.target.value)
                const s = outstandingItems.find((o) => o.key === e.target.value)
                if (s) setAmount(String(s.balance / 100))
              }}
            >
              <option value="">General credit</option>
              {outstandingItems.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label} — {formatMoney(o.balance, biz.currency)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Amount" required error={errors.amount} hint={selected ? `Balance: ${formatMoney(selected.balance, biz.currency)}` : undefined}>
          <AmountInput value={amount} onChange={setAmount} currency={biz.currency} autoFocus invalid={!!errors.amount} />
        </Field>
        <div className="grid grid-form" style={{ gap: 'var(--s-4)' }}>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        {method === 'transfer' && (
          <Field label="Transfer reference" hint="Bank reference, transaction ID or note for reconciliation.">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. TRF-2024-00123" />
          </Field>
        )}
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </Field>
      </div>
    </Modal>
  )
}

/* ============================================================
   INVOICE
   ============================================================ */
export function InvoiceComposer({ params, onClose, onDone }: { params: ComposerParams; onClose: () => void; onDone: (result?: any) => void }) {
  const db = useDB()
  const biz = store.activeBusiness()!
  const toast = useToast()
  const products = db.products.filter((p) => p.business_id === biz.id && p.status === 'active')
  const customers = db.customers.filter((c) => c.business_id === biz.id && c.status === 'active')
  const [customerId, setCustomerId] = useState(params.customer_id || '')
  const [lines, setLines] = useState<Line[]>([{ key: uid('l'), product_id: null, description: '', quantity: '1', unit_price: '' }])
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed')
  const [discountPct, setDiscountPct] = useState('')
  const [discountFixed, setDiscountFixed] = useState('')
  const [issue, setIssue] = useState(todayISODate())
  const [due, setDue] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'draft' | 'issued'>('issued')
  const [err, setErr] = useState('')

  const subtotal = useMemo(
    () => lines.reduce((a, l) => a + (parseAmount(l.unit_price, biz.currency) || 0) * (Number(l.quantity) || 0), 0),
    [lines, biz.currency],
  )
  const discountValue = discountType === 'percent' ? discountPct : discountFixed
  const discountMinor = computeDiscount(discountType, discountValue, subtotal, biz.currency)
  const discountLabel =
    discountType === 'percent' && discountMinor > 0 ? `Discount (${clampPct(discountPct)}%)` : 'Discount'
  const total = Math.max(0, subtotal - discountMinor)

  const setLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const addLine = () => setLines((ls) => [...ls, { key: uid('l'), product_id: null, description: '', quantity: '1', unit_price: '' }])
  const removeLine = (key: string) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls))
  const onPickProduct = (key: string, pid: string) => {
    const p = products.find((x) => x.id === pid)
    if (!p) return setLine(key, { product_id: null })
    setLine(key, { product_id: p.id, description: p.name, unit_price: String(p.selling_price / 100) })
  }

  const save = () => {
    setErr('')
    const items = lines
      .filter((l) => l.description.trim() && Number(l.quantity) > 0)
      .map((l) => ({
        product_id: l.product_id,
        description: l.description.trim(),
        quantity: Number(l.quantity),
        unit_price: parseAmount(l.unit_price, biz.currency) || 0,
      }))
    if (!items.length) return setErr('Add at least one line item.')
    const res = store.createInvoice({
      customer_id: customerId || null,
      items,
      discount: discountMinor,
      issue_date: issue,
      due_date: due || null,
      notes,
      status,
    })
    if (!res.ok) return setErr(res.error || '')
    toast.push(status === 'issued' ? 'Invoice issued' : 'Invoice saved as draft')
    onDone(res.data)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New invoice"
      subtitle="Bill a customer and track what is owed."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            {status === 'issued' ? 'Issue invoice' : 'Save draft'}
          </Button>
        </>
      }
    >
      {err && <ErrorBanner>{err}</ErrorBanner>}
      <div className="composer mt-2">
        <div className="grid grid-form-3" style={{ gap: 'var(--s-4)' }}>
          <Field label="Customer">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">No customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Issue date">
            <Input type="date" value={issue} onChange={(e) => setIssue(e.target.value)} />
          </Field>
          <Field label="Due date">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </div>

        <div className="stack gap-3">
          <span className="label">Line items</span>
          {lines.map((l) => {
            const lineTotal = (parseAmount(l.unit_price, biz.currency) || 0) * (Number(l.quantity) || 0)
            return (
              <div className="line-item" key={l.key}>
                <div className="li-name">
                  <Select value={l.product_id || ''} onChange={(e) => onPickProduct(l.key, e.target.value)}>
                    <option value="">Custom line…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                  {!l.product_id && (
                    <Input className="mt-2" value={l.description} onChange={(e) => setLine(l.key, { description: e.target.value })} placeholder="Description" />
                  )}
                </div>
                <Input className="li-qty" type="number" min="1" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} />
                <div className="li-price">
                  <AmountInput value={l.unit_price} onChange={(v) => setLine(l.key, { unit_price: v })} currency={biz.currency} placeholder="Price" />
                </div>
                <div className="li-total">{formatMoney(lineTotal, biz.currency)}</div>
                <button className="btn btn-icon btn-sm li-del" onClick={() => removeLine(l.key)} type="button" aria-label="Remove">
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
          <Button variant="soft" size="sm" icon={Plus} onClick={addLine} style={{ alignSelf: 'flex-start' }}>
            Add line
          </Button>
        </div>

        <div className="grid grid-form" style={{ gap: 'var(--s-5)' }}>
          <div className="stack gap-4">
            <DiscountField
              type={discountType}
              onTypeChange={setDiscountType}
              value={discountValue}
              onChange={discountType === 'percent' ? setDiscountPct : setDiscountFixed}
              currency={biz.currency}
              discountMinor={discountMinor}
            />
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="issued">Issue now</option>
                <option value="draft">Save as draft</option>
              </Select>
            </Field>
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, thank you note…" />
            </Field>
          </div>
          <div className="totals">
            <div className="tr">
              <span>Subtotal</span>
              <span className="v">{formatMoney(subtotal, biz.currency)}</span>
            </div>
            <div className="tr">
              <span>{discountLabel}</span>
              <span className="v">− {formatMoney(discountMinor, biz.currency)}</span>
            </div>
            <div className="tr grand">
              <span>Total due</span>
              <span className="v">{formatMoney(total, biz.currency)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ============================================================
   STOCK: RESTOCK + ADJUST
   ============================================================ */
export function RestockForm({ params, onClose, onDone }: { params: ComposerParams; onClose: () => void; onDone: (result?: any) => void }) {
  const db = useDB()
  const biz = store.activeBusiness()!
  const toast = useToast()
  const product = db.products.find((p) => p.id === params.product_id)
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('Restock')
  const [cost, setCost] = useState(product ? String(product.cost_price / 100) : '')
  const [err, setErr] = useState('')
  if (!product) return null

  const save = () => {
    setErr('')
    const n = Number(qty)
    if (!n || n <= 0) return setErr('Enter a quantity greater than zero.')
    const costMinor = cost ? parseAmount(cost, biz.currency) || undefined : undefined
    const res = store.restock(product.id, n, { reason, cost_price: costMinor })
    if (!res.ok) return setErr(res.error || '')
    toast.push(`Restocked ${product.name}`)
    onDone(res.data)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Restock product"
      subtitle={`${product.name} · currently ${product.stock_quantity} in stock`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Add stock
          </Button>
        </>
      }
    >
      {err && <ErrorBanner>{err}</ErrorBanner>}
      <div className="stack gap-4 mt-2">
        <Field label="Quantity to add" required>
          <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus placeholder="0" />
        </Field>
        <Field label="Reason">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Supplier delivery" />
        </Field>
        <Field label="New cost price" hint="Optional — updates the product cost.">
          <AmountInput value={cost} onChange={setCost} currency={biz.currency} />
        </Field>
      </div>
    </Modal>
  )
}

export function AdjustStockForm({ params, onClose, onDone }: { params: ComposerParams; onClose: () => void; onDone: (result?: any) => void }) {
  const db = useDB()
  const toast = useToast()
  const product = db.products.find((p) => p.id === params.product_id)
  const [qty, setQty] = useState(product ? String(product.stock_quantity) : '')
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  if (!product) return null

  const save = () => {
    setErr('')
    const n = Number(qty)
    if (isNaN(n) || n < 0) return setErr('Enter a valid quantity.')
    if (reason.trim().length < 3) return setErr('A reason is required for stock adjustments.')
    const res = store.adjustStock(product.id, n, reason)
    if (!res.ok) return setErr(res.error || '')
    toast.push('Stock adjusted')
    onDone(res.data)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Adjust stock"
      subtitle={`${product.name} · currently ${product.stock_quantity} in stock`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Save adjustment
          </Button>
        </>
      }
    >
      {err && <ErrorBanner>{err}</ErrorBanner>}
      <div className="stack gap-4 mt-2">
        <Field label="New quantity (counted)" required>
          <Input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        </Field>
        <Field label="Reason" required hint="Kept in your stock movement history.">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Damaged, stock count correction" />
        </Field>
      </div>
    </Modal>
  )
}

/* ============================================================
   GOAL
   ============================================================ */
export function GoalForm({ params, onClose, onDone }: { params: ComposerParams; onClose: () => void; onDone: (result?: any) => void }) {
  const db = useDB()
  const biz = store.activeBusiness()!
  const toast = useToast()
  const existing = params.id ? db.goals.find((g) => g.id === params.id) : null
  const [type, setType] = useState<GoalType>(existing?.type || 'revenue')
  const [title, setTitle] = useState(existing?.title || '')
  const [target, setTarget] = useState(existing ? String(existing.target_amount / 100) : '')
  const [start, setStart] = useState(existing?.start_date?.slice(0, 10) || todayISODate())
  const [end, setEnd] = useState(existing?.end_date?.slice(0, 10) || '')
  const [err, setErr] = useState('')

  const save = () => {
    setErr('')
    if (!title.trim()) return setErr('Give your goal a title.')
    if (!end) return setErr('Choose an end date.')
    const targetMinor = type === 'revenue' ? parseAmount(target, biz.currency) || 0 : Number(target) || 0
    if (existing) {
      const res = store.updateGoal(existing.id, { type, title, target_amount: targetMinor, start_date: start, end_date: end })
      if (!res.ok) return setErr(res.error || '')
      toast.push('Goal updated')
      onDone(res.data)
    } else {
      const res = store.createGoal({ type, title, target_amount: targetMinor, start_date: start, end_date: end })
      if (!res.ok) return setErr(res.error || '')
      toast.push('Goal set')
      onDone(res.data)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? 'Edit goal' : 'Set a goal'}
      subtitle="Progress is calculated from your real business data."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            {existing ? 'Save' : 'Set goal'}
          </Button>
        </>
      }
    >
      {err && <ErrorBanner>{err}</ErrorBanner>}
      <div className="stack gap-4 mt-2">
        <Field label="Goal type">
          <Select value={type} onChange={(e) => setType(e.target.value as GoalType)}>
            <option value="revenue">Revenue received</option>
            <option value="sales">Sales recorded</option>
            <option value="customers">New customers</option>
          </Select>
        </Field>
        <Field label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hit ₦1.5M this quarter" autoFocus />
        </Field>
        <Field label={type === 'revenue' ? 'Target amount' : 'Target count'} required>
          {type === 'revenue' ? (
            <AmountInput value={target} onChange={setTarget} currency={biz.currency} />
          ) : (
            <Input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} />
          )}
        </Field>
        <div className="grid grid-form" style={{ gap: 'var(--s-4)' }}>
          <Field label="Start date">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End date" required>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

/* ============================================================
   BUSINESS
   ============================================================ */
export function BusinessForm({ params, onClose, onDone }: { params: ComposerParams; onClose: () => void; onDone: (result?: any) => void }) {
  const db = useDB()
  const toast = useToast()
  const existing = params.id ? db.businesses.find((b) => b.id === params.id) || null : null
  const isCreate = !existing
  const biz = existing || store.activeBusiness()

  const [name, setName] = useState(biz?.name || '')
  const [category, setCategory] = useState(biz?.category || '')
  const [description, setDescription] = useState(biz?.description || '')
  const [phone, setPhone] = useState(biz?.phone || '')
  const [logoUrl, setLogoUrl] = useState(biz?.logo_url || '')
  const [currency, setCurrency] = useState(biz?.currency || 'NGN')
  const [country, setCountry] = useState(biz?.country || 'Nigeria')
  const [timezone, setTimezone] = useState(biz?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos')
  const [err, setErr] = useState('')
  const [needsUpgrade, setNeedsUpgrade] = useState(false)

  const save = () => {
    setErr('')
    setNeedsUpgrade(false)
    if (!name.trim() || name.trim().length < 2) return setErr('Please name your business.')
    if (isCreate) {
      const res = store.createBusiness({ name, category, description, phone, logo_url: logoUrl || null, currency, country, timezone })
      if (!res.ok) {
        const msg = res.error || ''
        if (/multiple businesses|upgrade/i.test(msg)) setNeedsUpgrade(true)
        return setErr(msg)
      }
      toast.push('Business created')
      onDone(res.data)
    } else {
      const res = store.updateBusiness(biz!.id, { name, category, description, phone, logo_url: logoUrl || null, currency, country, timezone })
      if (!res.ok) return setErr(res.error || '')
      toast.push('Business updated')
      onDone(res.data)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isCreate ? 'Add business' : 'Business settings'}
      subtitle={isCreate ? 'Create a separate workspace with its own products, customers and money.' : 'These details appear on your invoices and receipts.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            {isCreate ? 'Create business' : 'Save changes'}
          </Button>
        </>
      }
    >
      {err && <ErrorBanner>{err}</ErrorBanner>}
      {needsUpgrade && (
        <div className="row-between mt-3" style={{ gap: 12, flexWrap: 'wrap' }}>
          <span className="text-sm muted">Unlock more workspaces on a paid plan.</span>
          <Button
            variant="primary"
            size="sm"
            icon={ArrowUpRight}
            onClick={() => {
              onClose()
              navigate('/settings?tab=plan')
            }}
          >
            See plans
          </Button>
        </div>
      )}
      <div className="stack gap-4 mt-2">
        <Field label="Business name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kudii Foods" autoFocus />
        </Field>
        <Field label="Category" hint="Helps KUDII tailor your workspace.">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Choose a category</option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Phone / contact">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
        </Field>
        <div className="grid grid-form" style={{ gap: 'var(--s-4)' }}>
          <Field label="Currency">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Country">
            <Input value={country} onChange={(e) => setCountry(e.target.value)} />
          </Field>
        </div>
        <Field label="Logo URL" hint="Optional. Paste a link to your logo.">
          <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional. A short line about your business." />
        </Field>
        <Field label="Timezone">
          <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Africa/Lagos" />
        </Field>
      </div>
    </Modal>
  )
}
