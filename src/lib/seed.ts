/* ============================================================
   KUDII — Demo seed
   A realistic Nigerian business: Adaeze Fabrics & Tailoring.
   Demonstrates products, sales, payments, invoices and money.
   ============================================================ */

import type { DB, ID, Minor } from './types'
import { emptyDB } from './store'
import { store } from './store'
import { uid, nowISO } from './utils'

const N = (naira: number): Minor => Math.round(naira * 100)

function daysAgoISO(n: number, hour = 10): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
function dateOnly(n: number): string {
  return daysAgoISO(n).slice(0, 10)
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}::${password}::kudii`)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data)
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  let h = 5381
  for (let i = 0; i < data.length; i++) h = ((h << 5) + h + data[i]) >>> 0
  return h.toString(16)
}

export async function buildDemoDB(): Promise<DB> {
  const db = emptyDB()
  const salt = uid('salt')
  const USER: ID = 'usr_demo'
  const BIZ: ID = 'biz_demo'
  const now = nowISO()

  db.users.push({
    id: USER,
    email: 'demo@kudiiofficial.com',
    name: 'Adaeze Okafor',
    avatar_url: null,
    email_verified: true,
    password_hash: await hashPassword('kudii1234', salt),
    password_salt: salt,
    created_at: daysAgoISO(120),
    updated_at: now,
  })
  db.settings.push({
    id: uid('set'),
    user_id: USER,
    theme: 'light',
    notifications_enabled: true,
    language: 'en',
    reduce_effects: false,
    created_at: daysAgoISO(120),
    updated_at: now,
  })
  db.businesses.push({
    id: BIZ,
    name: 'Adaeze Fabrics & Tailoring',
    description: 'Bespoke tailoring, fabrics and ready-to-wear in Lekki, Lagos.',
    category: 'Fashion & tailoring',
    phone: '+2348030000000',
    currency: 'NGN',
    country: 'Nigeria',
    timezone: 'Africa/Lagos',
    logo_url: null,
    theme: 'light',
    created_at: daysAgoISO(120),
    updated_at: now,
  })
  db.memberships.push({
    id: uid('mem'),
    business_id: BIZ,
    user_id: USER,
    role: 'owner',
    status: 'active',
    created_at: daysAgoISO(120),
    updated_at: now,
  })
  db.subscriptions.push({
    id: uid('sub'),
    business_id: BIZ,
    provider: 'manual',
    provider_customer_id: null,
    provider_subscription_id: null,
    plan: 'go',
    pending_plan: null,
    status: 'active',
    current_period_start: daysAgoISO(12),
    current_period_end: daysAgoISO(-18),
    last_payment_reference: 'DEMO-2024-0001',
    last_payment_at: daysAgoISO(12),
    created_at: daysAgoISO(120),
    updated_at: now,
  })
  db.onboarding.push({
    business_id: BIZ,
    theme_selected: true,
    first_customer: true,
    first_sale: true,
    first_transaction: true,
    completed: true,
    dismissed: true,
  })

  /* ---------------- customers ---------------- */
  const customers: { id: ID; name: string; email: string; phone: string; address: string; notes: string; created: number }[] = [
    { id: 'cus_1', name: 'Chioma Nwosu', email: 'chioma@example.com', phone: '+2348031234567', address: '12 Admiralty Way, Lekki', notes: 'Prefers Ankara prints.', created: 88 },
    { id: 'cus_2', name: 'Tunde Bakare', email: 'tunde@example.com', phone: '+2348065551212', address: '5 Bourdillon Rd, Ikoyi', notes: 'Corporate orders.', created: 74 },
    { id: 'cus_3', name: 'Fatima Yusuf', email: 'fatima@example.com', phone: '+2347012345678', address: '21 Gwarinpa Estate, Abuja', notes: '', created: 60 },
    { id: 'cus_4', name: 'Emeka Obi', email: 'emeka@example.com', phone: '+2348099887766', address: '3 Awolowo Rd, Ikoyi', notes: 'Wedding party.', created: 45 },
    { id: 'cus_5', name: 'Ngozi Eze', email: 'ngozi@example.com', phone: '+2348022334455', address: '9 Allen Ave, Ikeja', notes: '', created: 30 },
    { id: 'cus_6', name: 'Bola Adeyemi', email: 'bola@example.com', phone: '+2348133445566', address: '44 Ozumba Mbadiwe, VI', notes: 'Referred by Chioma.', created: 18 },
    { id: 'cus_7', name: 'Ifeanyi Uche', email: 'ifeanyi@example.com', phone: '+2348077665544', address: '7 Oniru Estate, VI', notes: '', created: 9 },
    { id: 'cus_8', name: 'Zainab Bello', email: 'zainab@example.com', phone: '+2348055667788', address: '16 Adeola Odeku, VI', notes: 'Prefers WhatsApp.', created: 4 },
  ]
  for (const c of customers) {
    db.customers.push({
      id: c.id,
      business_id: BIZ,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      notes: c.notes,
      status: 'active',
      created_at: daysAgoISO(c.created),
      updated_at: daysAgoISO(c.created),
    })
  }

  /* ---------------- products ---------------- */
  const products: { id: ID; name: string; desc: string; sell: number; cost: number; stock: number; low: number }[] = [
    { id: 'prd_1', name: 'Ankara Fabric (6 yards)', desc: 'Premium wax print, 6 yards.', sell: 12000, cost: 7500, stock: 24, low: 6 },
    { id: 'prd_2', name: 'Lace Fabric (5 yards)', desc: 'Swiss voile lace.', sell: 28000, cost: 18000, stock: 8, low: 5 },
    { id: 'prd_3', name: 'Ready-to-wear Blouse', desc: 'Tailored women\u2019s blouse.', sell: 15000, cost: 8000, stock: 12, low: 4 },
    { id: 'prd_4', name: 'Agbada Set', desc: 'Three-piece men\u2019s agbada.', sell: 45000, cost: 26000, stock: 5, low: 3 },
    { id: 'prd_5', name: 'Kaftan (Men)', desc: 'Embroidered kaftan.', sell: 22000, cost: 12000, stock: 9, low: 4 },
    { id: 'prd_6', name: 'Head Wrap (Gele)', desc: 'Hand-finished gele.', sell: 6000, cost: 2500, stock: 3, low: 6 },
    { id: 'prd_7', name: 'Aso-oke (Set)', desc: 'Handwoven aso-oke, 2-piece.', sell: 65000, cost: 42000, stock: 4, low: 2 },
    { id: 'prd_8', name: 'Sewing Thread (Pack)', desc: 'Assorted colours.', sell: 2500, cost: 1200, stock: 2, low: 8 },
    { id: 'prd_9', name: 'Beaded Clutch', desc: 'Hand-beaded evening clutch.', sell: 18000, cost: 9000, stock: 6, low: 3 },
    { id: 'prd_10', name: 'Tailored Trousers', desc: 'Slim-fit tailored trousers.', sell: 16000, cost: 8500, stock: 11, low: 4 },
  ]
  const stockBal: Record<string, number> = {}
  for (const p of products) {
    db.products.push({
      id: p.id,
      business_id: BIZ,
      name: p.name,
      description: p.desc,
      selling_price: N(p.sell),
      cost_price: N(p.cost),
      stock_quantity: 0,
      low_stock_threshold: p.low,
      status: 'active',
      created_at: daysAgoISO(110),
      updated_at: now,
    })
    stockBal[p.id] = 0
  }

  function move(productId: ID, type: any, qty: number, reason: string, refType: string | null, refId: ID | null, when: string) {
    const p = db.products.find((x) => x.id === productId)!
    p.stock_quantity += qty
    stockBal[productId] = p.stock_quantity
    db.stockMovements.push({
      id: uid('mov'),
      business_id: BIZ,
      product_id: productId,
      type,
      quantity: qty,
      balance_after: p.stock_quantity,
      reason,
      reference_type: refType,
      reference_id: refId,
      created_by: USER,
      created_at: when,
    })
  }

  // opening stock
  for (const p of products) {
    move(p.id, 'restock', p.stock + 20, 'Opening stock', 'manual', null, daysAgoISO(105))
  }

  /* ---------------- sales ---------------- */
  let saleCounter = 0
  let payCounter = 0
  let rcptCounter = 0

  function addSale(opts: {
    customer: ID | null
    date: number
    items: { pid: ID | null; desc: string; qty: number; price: number }[]
    discount?: number
    paid: number
    method: string
    notes?: string
  }) {
    saleCounter++
    const saleId = `sale_${saleCounter}`
    const when = daysAgoISO(opts.date)
    const sale = {
      id: saleId,
      business_id: BIZ,
      customer_id: opts.customer,
      sale_number: `SALE-${String(saleCounter).padStart(4, '0')}`,
      discount: N(opts.discount || 0),
      status: 'open' as const,
      sale_date: dateOnly(opts.date),
      notes: opts.notes || '',
      created_at: when,
      updated_at: when,
    }
    db.sales.push(sale)
    let subtotal = 0
    for (const it of opts.items) {
      const total = N(it.price * it.qty)
      subtotal += total
      db.saleItems.push({
        id: uid('sli'),
        sale_id: saleId,
        business_id: BIZ,
        product_id: it.pid,
        description: it.desc,
        quantity: it.qty,
        unit_price: N(it.price),
        total,
      })
      if (it.pid) move(it.pid, 'sale', -it.qty, `Sold on ${sale.sale_number}`, 'sale', saleId, when)
    }
    const total = Math.max(0, subtotal - sale.discount)
    db.activities.push({
      id: uid('act'),
      business_id: BIZ,
      user_id: USER,
      customer_id: opts.customer,
      transaction_id: null,
      type: 'sale.created',
      title: 'Sale recorded',
      description: `${sale.sale_number}${opts.customer ? ' \u00b7 ' + db.customers.find((c) => c.id === opts.customer)!.name : ''}`,
      metadata: { sale_id: saleId, total },
      created_at: when,
    })
    if (opts.paid > 0) {
      payCounter++
      rcptCounter++
      const payId = `pay_${payCounter}`
      const amount = N(opts.paid)
      db.payments.push({
        id: payId,
        business_id: BIZ,
        customer_id: opts.customer,
        amount,
        currency: 'NGN',
        method: opts.method,
        reference: `PAY-${String(payCounter).padStart(4, '0')}`,
        payment_date: dateOnly(opts.date),
        notes: `Payment for ${sale.sale_number}`,
        status: 'posted',
        created_at: when,
        updated_at: when,
      })
      const allocated = Math.min(amount, total)
      db.allocations.push({
        id: uid('alc'),
        business_id: BIZ,
        payment_id: payId,
        sale_id: saleId,
        invoice_id: null,
        amount: allocated,
      })
      db.receipts.push({
        id: uid('rcp'),
        business_id: BIZ,
        customer_id: opts.customer,
        sale_id: saleId,
        invoice_id: null,
        payment_id: payId,
        receipt_number: `RCPT-${String(rcptCounter).padStart(4, '0')}`,
        amount,
        payment_method: opts.method,
        issued_at: when,
      })
      db.activities.push({
        id: uid('act'),
        business_id: BIZ,
        user_id: USER,
        customer_id: opts.customer,
        transaction_id: null,
        type: 'payment.received',
        title: 'Payment received',
        description: `${opts.customer ? db.customers.find((c) => c.id === opts.customer)!.name + ' \u00b7 ' : ''}RCPT-${String(rcptCounter).padStart(4, '0')}`,
        metadata: { payment_id: payId, amount },
        created_at: when,
      })
    }
  }

  addSale({ customer: 'cus_1', date: 2, items: [{ pid: 'prd_1', desc: 'Ankara Fabric (6 yards)', qty: 2, price: 12000 }, { pid: 'prd_6', desc: 'Head Wrap (Gele)', qty: 1, price: 6000 }], paid: 30000, method: 'transfer' })
  addSale({ customer: 'cus_2', date: 4, items: [{ pid: 'prd_4', desc: 'Agbada Set', qty: 1, price: 45000 }], discount: 2000, paid: 43000, method: 'transfer' })
  addSale({ customer: null, date: 6, items: [{ pid: 'prd_3', desc: 'Ready-to-wear Blouse', qty: 1, price: 15000 }], paid: 15000, method: 'cash' })
  addSale({ customer: 'cus_4', date: 9, items: [{ pid: 'prd_7', desc: 'Aso-oke (Set)', qty: 2, price: 65000 }, { pid: 'prd_9', desc: 'Beaded Clutch', qty: 2, price: 18000 }], discount: 6000, paid: 100000, method: 'transfer', notes: 'Wedding order \u2014 balance on delivery.' })
  addSale({ customer: 'cus_5', date: 13, items: [{ pid: 'prd_2', desc: 'Lace Fabric (5 yards)', qty: 1, price: 28000 }], paid: 28000, method: 'card' })
  addSale({ customer: 'cus_3', date: 17, items: [{ pid: 'prd_5', desc: 'Kaftan (Men)', qty: 2, price: 22000 }, { pid: 'prd_10', desc: 'Tailored Trousers', qty: 1, price: 16000 }], paid: 30000, method: 'transfer' })
  addSale({ customer: 'cus_6', date: 22, items: [{ pid: 'prd_1', desc: 'Ankara Fabric (6 yards)', qty: 3, price: 12000 }], discount: 1000, paid: 35000, method: 'cash' })
  addSale({ customer: 'cus_7', date: 27, items: [{ pid: 'prd_9', desc: 'Beaded Clutch', qty: 1, price: 18000 }], paid: 18000, method: 'transfer' })
  addSale({ customer: 'cus_8', date: 33, items: [{ pid: 'prd_3', desc: 'Ready-to-wear Blouse', qty: 2, price: 15000 }], paid: 30000, method: 'transfer' })
  addSale({ customer: 'cus_2', date: 40, items: [{ pid: 'prd_4', desc: 'Agbada Set', qty: 2, price: 45000 }], discount: 5000, paid: 85000, method: 'transfer' })

  /* ---------------- expenses / drawings / income ---------------- */
  const txns: { type: any; cat: string; amount: number; desc: string; date: number; method: string }[] = [
    { type: 'expense', cat: 'Rent', amount: 150000, desc: 'Shop rent \u2014 monthly', date: 30, method: 'transfer' },
    { type: 'expense', cat: 'Materials', amount: 85000, desc: 'Fabric restock from Balogun market', date: 26, method: 'cash' },
    { type: 'expense', cat: 'Utilities', amount: 22000, desc: 'Electricity & water', date: 24, method: 'transfer' },
    { type: 'expense', cat: 'Salaries', amount: 120000, desc: 'Tailor assistant wages', date: 22, method: 'transfer' },
    { type: 'expense', cat: 'Marketing', amount: 30000, desc: 'Instagram promotion', date: 15, method: 'card' },
    { type: 'expense', cat: 'Transport', amount: 18000, desc: 'Delivery & logistics', date: 11, method: 'cash' },
    { type: 'expense', cat: 'Materials', amount: 64000, desc: 'Threads, buttons & trims', date: 8, method: 'cash' },
    { type: 'expense', cat: 'Utilities', amount: 20000, desc: 'Generator fuel', date: 5, method: 'cash' },
    { type: 'drawings', cat: 'Personal', amount: 90000, desc: 'Owner withdrawal', date: 20, method: 'transfer' },
    { type: 'drawings', cat: 'Personal', amount: 60000, desc: 'Owner withdrawal', date: 6, method: 'transfer' },
    { type: 'income', cat: 'Consultation', amount: 40000, desc: 'Styling consultation \u2014 private client', date: 3, method: 'transfer' },
    { type: 'expense', cat: 'Rent', amount: 150000, desc: 'Shop rent \u2014 previous month', date: 58, method: 'transfer' },
    { type: 'expense', cat: 'Salaries', amount: 120000, desc: 'Tailor assistant wages', date: 52, method: 'transfer' },
    { type: 'income', cat: 'Consultation', amount: 25000, desc: 'Wardrobe consultation', date: 47, method: 'cash' },
    { type: 'expense', cat: 'Materials', amount: 70000, desc: 'Fabric restock', date: 44, method: 'cash' },
  ]
  for (const t of txns) {
    db.transactions.push({
      id: uid('txn'),
      business_id: BIZ,
      customer_id: null,
      type: t.type,
      category: t.cat,
      amount: N(t.amount),
      currency: 'NGN',
      description: t.desc,
      transaction_date: dateOnly(t.date),
      payment_method: t.method,
      reference_type: null,
      reference_id: null,
      status: 'posted',
      reversal_of: null,
      created_at: daysAgoISO(t.date),
      updated_at: daysAgoISO(t.date),
    })
    db.activities.push({
      id: uid('act'),
      business_id: BIZ,
      user_id: USER,
      customer_id: null,
      transaction_id: null,
      type: `${t.type}.recorded`,
      title: t.type === 'expense' ? 'Expense recorded' : t.type === 'drawings' ? 'Drawing recorded' : 'Income recorded',
      description: `${t.cat} \u00b7 ${t.desc}`,
      metadata: { amount: N(t.amount) },
      created_at: daysAgoISO(t.date),
    })
  }

  /* ---------------- invoices ---------------- */
  let invCounter = 0
  function addInvoice(customer: ID, items: { desc: string; qty: number; price: number }[], status: any, issuedDaysAgo: number, dueDaysFromNow: number, discount = 0) {
    invCounter++
    const invId = `inv_${invCounter}`
    const when = daysAgoISO(issuedDaysAgo)
    const inv = {
      id: invId,
      business_id: BIZ,
      customer_id: customer,
      invoice_number: `INV-${String(invCounter).padStart(4, '0')}`,
      status,
      issue_date: dateOnly(issuedDaysAgo),
      due_date: dateOnly(-dueDaysFromNow),
      discount: N(discount),
      notes: '',
      created_at: when,
      updated_at: when,
    }
    db.invoices.push(inv)
    for (const it of items) {
      db.invoiceItems.push({
        id: uid('ivi'),
        invoice_id: invId,
        business_id: BIZ,
        product_id: null,
        description: it.desc,
        quantity: it.qty,
        unit_price: N(it.price),
        total: N(it.qty * it.price),
      })
    }
    if (status === 'issued') {
      db.activities.push({
        id: uid('act'),
        business_id: BIZ,
        user_id: USER,
        customer_id: customer,
        transaction_id: null,
        type: 'invoice.issued',
        title: 'Invoice issued',
        description: inv.invoice_number,
        metadata: { invoice_id: invId },
        created_at: when,
      })
    }
    return inv
  }
  addInvoice('cus_2', [{ desc: 'Corporate uniform set (balance)', qty: 1, price: 240000 }], 'issued', 6, 8)
  addInvoice('cus_4', [{ desc: 'Wedding party aso-ebi (balance)', qty: 1, price: 520000 }], 'issued', 4, 14)
  addInvoice('cus_3', [{ desc: 'Bulk kaftan order', qty: 10, price: 22000 }], 'draft', 1, 21, 10000)

  /* ---------------- goals ---------------- */
  db.goals.push({
    id: uid('goal'),
    business_id: BIZ,
    type: 'revenue',
    title: 'Q revenue target',
    target_amount: N(1500000),
    start_date: daysAgoISO(30),
    end_date: daysAgoISO(-30),
    status: 'active',
    created_at: daysAgoISO(30),
    updated_at: now,
  })
  db.goals.push({
    id: uid('goal'),
    business_id: BIZ,
    type: 'sales',
    title: 'Complete 12 sales this quarter',
    target_amount: 12,
    start_date: daysAgoISO(30),
    end_date: daysAgoISO(-60),
    status: 'active',
    created_at: daysAgoISO(30),
    updated_at: now,
  })

  db.counters[`${BIZ}:SALE`] = saleCounter
  db.counters[`${BIZ}:PAY`] = payCounter
  db.counters[`${BIZ}:RCPT`] = rcptCounter
  db.counters[`${BIZ}:INV`] = invCounter

  db.session = { userId: USER, activeBusinessId: BIZ, expiresAt: Date.now() + 14 * 864e5 }
  return db
}

export async function loadDemo() {
  const db = await buildDemoDB()
  store.replaceDB(db)
}
