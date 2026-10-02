/* ============================================================
   KUDII — Public website
   Home, How It Works, Pricing, Security, FAQ, Get Started
   ============================================================ */
import { useState, type ReactNode } from 'react'
import {
  LayoutGrid,
  Users,
  Briefcase,
  Wallet,
  Package,
  Activity as ActivityIcon,
  TrendingUp,
  Check,
  Plus,
  ArrowRight,
  ShieldCheck,
  Lock,
  EyeOff,
  ServerCog,
  Building2,
  Sparkles,
  Receipt,
  Bell,
  FileText,
  HeartHandshake,
  Clock,
  AlertTriangle,
  XCircle,
  CircleDollarSign,
  Smartphone,
  Globe,
} from 'lucide-react'
import { navigate, useRoute } from '../lib/router'
import { useScrolled } from '../lib/hooks'
import { BrandMark } from '../components/shell'
import { PLANS } from '../lib/plans'
import { formatMoney } from '../lib/utils'

/* ---------------- Nav ---------------- */
const NAV = [
  { to: '/', label: 'Home' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/security', label: 'Security' },
  { to: '/faq', label: 'FAQ' },
]

function MkNav() {
  const scrolled = useScrolled(10)
  const { path } = useRoute()
  const [open, setOpen] = useState(false)
  return (
    <nav className={`mk-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <div className="mk-nav-inner">
          <button className="brand" onClick={() => navigate('/')} aria-label="KUDII home">
            <BrandMark />
            KUDII
          </button>
          <div className="mk-nav-links">
            {NAV.map((n) => (
              <a
                key={n.to}
                href={'#' + n.to}
                className={path === n.to ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(n.to)
                }}
              >
                {n.label}
              </a>
            ))}
          </div>
          <div className="row gap-2">
            <button className="btn btn-ghost" onClick={() => navigate('/sign-in')}>
              Sign in
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/sign-up')}>
              Get started
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

/* ---------------- Footer ---------------- */
function MkFooter() {
  return (
    <footer className="mk-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="brand" style={{ marginBottom: 'var(--s-3)' }}>
              <BrandMark />
              KUDII
            </div>
            <p className="muted text-sm" style={{ maxWidth: '34ch', lineHeight: 1.6 }}>
              Know your money. Feel in control. A calmer way to run the day-to-day of your
              business — customers, work, products and money in one place.
            </p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#/how-it-works" onClick={(e) => (e.preventDefault(), navigate('/how-it-works'))}>
              How it works
            </a>
            <a href="#/pricing" onClick={(e) => (e.preventDefault(), navigate('/pricing'))}>
              Pricing
            </a>
            <a href="#/security" onClick={(e) => (e.preventDefault(), navigate('/security'))}>
              Security
            </a>
            <a href="#/faq" onClick={(e) => (e.preventDefault(), navigate('/faq'))}>
              FAQ
            </a>
          </div>
          <div className="footer-col">
            <h4>Get started</h4>
            <a href="#/sign-up" onClick={(e) => (e.preventDefault(), navigate('/sign-up'))}>
              Create an account
            </a>
            <a href="#/sign-in" onClick={(e) => (e.preventDefault(), navigate('/sign-in'))}>
              Sign in
            </a>
            <a href="#/get-started" onClick={(e) => (e.preventDefault(), navigate('/get-started'))}>
              Start with KUDII Go
            </a>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a href="#/security" onClick={(e) => (e.preventDefault(), navigate('/security'))}>
              Trust & security
            </a>
            <a href="#/faq" onClick={(e) => (e.preventDefault(), navigate('/faq'))}>
              Help
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} KUDII. Made with care for small businesses.</span>
          <span className="row gap-3">
            <span>Nigerian &amp; international</span>
            <span>·</span>
            <span>Prices in ₦ NGN</span>
          </span>
        </div>
      </div>
    </footer>
  )
}

/* ---------------- Shared ---------------- */
function SectionHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="section-head-mk">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {children && <p className="muted">{children}</p>}
    </div>
  )
}

function CtaBand() {
  return (
    <section className="section">
      <div className="container">
        <div className="cta-band">
          <h2 className="display">Know your money. Feel in control.</h2>
          <p className="muted">Start with KUDII Go. Set up your business in minutes — no spreadsheets, no guesswork.</p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/sign-up')}>
              Get started free <ArrowRight size={18} />
            </button>
            <button className="btn btn-soft btn-lg" onClick={() => navigate('/how-it-works')}>
              See how it works
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Product preview mock ---------------- */
function Preview() {
  const bars = [42, 58, 46, 70, 62, 84]
  return (
    <div className="preview">
      <div className="preview-inner">
        <div className="preview-bar">
          <div className="preview-dots">
            <span />
            <span />
            <span />
          </div>
          <span className="text-xs muted" style={{ marginLeft: 'auto' }}>
            Adaeze Fabrics &amp; Tailoring · Overview
          </span>
        </div>
        <div className="preview-body">
          <div>
            <div className="preview-pulse">
              <div className="pv-card">
                <div className="pv-l">Money in</div>
                <div className="pv-v num">₦486,500</div>
              </div>
              <div className="pv-card">
                <div className="pv-l">Money out</div>
                <div className="pv-v num">₦192,000</div>
              </div>
              <div className="pv-card">
                <div className="pv-l">Owed to you</div>
                <div className="pv-v num">₦318,000</div>
              </div>
              <div className="pv-card">
                <div className="pv-l">Active jobs</div>
                <div className="pv-v num">7</div>
              </div>
            </div>
            <div className="pv-card mt-4">
              <div className="pv-l">Money received · last 6 months</div>
              <div className="pv-spark">
                {bars.map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="pv-card">
            <div className="pv-l" style={{ marginBottom: 'var(--s-3)' }}>
              Needs your attention
            </div>
            <div className="stack gap-3">
              <div className="row-between">
                <span className="text-sm">Wedding gown · Chioma</span>
                <span className="badge badge-warning">₦85,000 due</span>
              </div>
              <div className="row-between">
                <span className="text-sm">Lace fabric · 3 low</span>
                <span className="badge badge-danger">Restock</span>
              </div>
              <div className="row-between">
                <span className="text-sm">INV-0007 · Bola</span>
                <span className="badge badge-info">Overdue</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   HOME
   ============================================================ */
function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="eyebrow">For small businesses · Nigeria &amp; beyond</span>
          <h1 className="display">Know your money. Feel in control.</h1>
          <p className="lead">
            KUDII is a calmer way to run your business. Record what happened, see what is owed,
            know what needs attention — and take the next step quickly. No spreadsheets. No
            guesswork.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/sign-up')}>
              Get started <ArrowRight size={18} />
            </button>
            <button className="btn btn-soft btn-lg" onClick={() => navigate('/how-it-works')}>
              How it works
            </button>
          </div>
          <p className="hero-note">Start with KUDII Go — ₦5,000 / month. No card required to explore.</p>
          <Preview />
        </div>
      </section>

      {/* The problem */}
      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Why KUDII" title="Running a business shouldn't feel like guesswork">
            Most owners are not short of hustle. They are short of a clear picture. Money comes in
            and out, work piles up, and the truth lives in notebooks, chats and memory.
          </SectionHead>
          <div className="problem-grid">
            {[
              { icon: XCircle, t: '"Did they pay me?"' },
              { icon: Clock, t: '"What is still owed?"' },
              { icon: AlertTriangle, t: '"What needs attention today?"' },
              { icon: Package, t: '"How much stock is left?"' },
              { icon: CircleDollarSign, t: '"Did I actually make money?"' },
              { icon: FileText, t: '"Where did last month go?"' },
            ].map((p, i) => (
              <div className="problem" key={i}>
                <span className="p-ic">
                  <p.icon size={17} strokeWidth={2} />
                </span>
                <span>{p.t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The product */}
      <section className="section">
        <div className="container">
          <SectionHead eyebrow="The KUDII way" title="Know → Understand → Act → Stay in control">
            KUDII is built around a simple loop. Record events once. Everything else is derived,
            exact and always up to date.
          </SectionHead>
          <div className="steps-row">
            {[
              { n: 1, t: 'Know', d: 'Record sales, jobs, payments and expenses in seconds. KUDII keeps the record straight.' },
              { n: 2, t: 'Understand', d: 'See what came in, what went out, and what is still owed — computed from real events.' },
              { n: 3, t: 'Act', d: 'Restock, follow up, record a payment, finish a job. Clear next steps, not noise.' },
              { n: 4, t: 'Stay in control', d: 'Your dashboard, activity and progress keep the whole business in view.' },
            ].map((s) => (
              <div className="step-card" key={s.n}>
                <div className="step-num">{s.n}</div>
                <h3>{s.t}</h3>
                <p className="muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Split 1 */}
      <section className="section">
        <div className="container">
          <div className="split">
            <div>
              <span className="eyebrow">Money you can trust</span>
              <h2 className="display mt-3">A sale is not money received</h2>
              <p className="muted">
                This is the heart of KUDII. Creating a job, a sale or an invoice never counts as
                income on its own. Money is only recognised when you actually record a payment —
                so your numbers always reflect reality.
              </p>
              <ul>
                <li>
                  <Check size={17} /> Unpaid, partially paid, fully paid and overpaid — all handled
                </li>
                <li>
                  <Check size={17} /> Outstanding balances computed for every customer
                </li>
                <li>
                  <Check size={17} /> Refunds and reversals keep history intact, never overwritten
                </li>
                <li>
                  <Check size={17} /> Every amount stored exactly — never rounded away
                </li>
              </ul>
            </div>
            <div className="split-media">
              <div className="pv-card">
                <div className="pv-l">SALE-0042 · Chioma Nwosu</div>
                <div className="row-between mt-3">
                  <span className="text-sm">Total</span>
                  <span className="num" style={{ fontWeight: 600 }}>
                    ₦120,000
                  </span>
                </div>
                <div className="row-between mt-2">
                  <span className="text-sm">Paid</span>
                  <span className="num" style={{ fontWeight: 600 }}>
                    ₦50,000
                  </span>
                </div>
                <div className="row-between mt-2">
                  <span className="text-sm">Balance</span>
                  <span className="num" style={{ fontWeight: 700, color: 'var(--warning)' }}>
                    ₦70,000
                  </span>
                </div>
                <div className="mt-4">
                  <span className="badge badge-warning">
                    Partially paid
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Split 2 */}
      <section className="section">
        <div className="container">
          <div className="split rev">
            <div>
              <span className="eyebrow">Products &amp; work</span>
              <h2 className="display mt-3">Sell products and run jobs, together</h2>
              <p className="muted">
                Whether you sell fabric or run a service, KUDII adapts to your business. Stock moves
                are controlled and auditable. Jobs move through clear stages. Your dashboard shows
                the sections that matter to you.
              </p>
              <ul>
                <li>
                  <Check size={17} /> Multi-item sales with discounts and receipts
                </li>
                <li>
                  <Check size={17} /> Inventory updated automatically, with full movement history
                </li>
                <li>
                  <Check size={17} /> Jobs with pending, in-progress and completed stages
                </li>
                <li>
                  <Check size={17} /> Low-stock alerts before you run out
                </li>
              </ul>
            </div>
            <div className="split-media">
              <div className="stack gap-3">
                <div className="pv-card row-between">
                  <span className="text-sm">Ankara Fabric (6yd)</span>
                  <span className="badge badge-success">24 in stock</span>
                </div>
                <div className="pv-card row-between">
                  <span className="text-sm">Lace Fabric (5yd)</span>
                  <span className="badge badge-danger">3 · low</span>
                </div>
                <div className="pv-card row-between">
                  <span className="text-sm">Bespoke wedding gown</span>
                  <span className="badge badge-info">In progress</span>
                </div>
                <div className="pv-card row-between">
                  <span className="text-sm">Agbada set</span>
                  <span className="badge badge-success">Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Everything in one calm place" title="Built for the way owners actually work" />
          <div className="feature-grid">
            {[
              { icon: LayoutGrid, t: 'Business Pulse', d: 'A living overview: money in, money out, what is owed, and what needs attention.' },
              { icon: Users, t: 'Customers', d: 'Every customer with their full history, balances and statements in one profile.' },
              { icon: Briefcase, t: 'Jobs', d: 'Track work from start to finish and see exactly what has been paid.' },
              { icon: Package, t: 'Products & stock', d: 'Sell, restock and adjust — every movement recorded and auditable.' },
              { icon: Wallet, t: 'Money', d: 'Income, expenses and drawings, kept separate and always exact.' },
              { icon: Receipt, t: 'Receipts', d: 'A clean receipt from every real payment, ready to share.' },
              { icon: ActivityIcon, t: 'Activity', d: 'A quiet, automatic log of what happened across your business.' },
              { icon: TrendingUp, t: 'Progress', d: 'Goals and momentum calculated from your real numbers.' },
              { icon: Smartphone, t: 'Works on your phone', d: 'A mobile-first experience with a floating action button for quick entry.' },
            ].map((f, i) => (
              <div className="feature" key={i}>
                <div className="f-ic">
                  <f.icon size={21} strokeWidth={1.9} />
                </div>
                <h3>{f.t}</h3>
                <p className="muted">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  )
}

/* ============================================================
   HOW IT WORKS
   ============================================================ */
function HowItWorks() {
  return (
    <section className="section">
      <div className="container">
        <SectionHead eyebrow="How it works" title="From first record to full control">
          KUDII is deliberately simple. You record what happens; KUDII keeps everything else
          consistent, exact and easy to understand.
        </SectionHead>

        <div className="steps-row mb-8">
          {[
            { n: 1, t: 'Set up your business', d: 'Name it, choose your currency and pick a theme that feels like you.' },
            { n: 2, t: 'Add customers & products', d: 'Bring in the people you serve and the things you sell.' },
            { n: 3, t: 'Record sales, jobs & payments', d: 'Capture the day-to-day as it happens — it takes seconds.' },
            { n: 4, t: 'Stay in control', d: 'Watch your pulse, activity and progress update automatically.' },
          ].map((s) => (
            <div className="step-card" key={s.n}>
              <div className="step-num">{s.n}</div>
              <h3>{s.t}</h3>
              <p className="muted">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="stack gap-8">
          <div className="split">
            <div>
              <span className="eyebrow">Know</span>
              <h2 className="display mt-3">Record once. Understand everywhere.</h2>
              <p className="muted">
                Every sale, job, payment and expense is stored as a single event. Totals, balances
                and statuses are derived from those events — so nothing drifts out of sync and
                nothing needs to be re-entered.
              </p>
            </div>
            <div className="split-media">
              <div className="stack gap-3">
                <div className="mini-row">
                  <span className="k">Sale recorded</span>
                  <span className="v">SALE-0042</span>
                </div>
                <div className="mini-row">
                  <span className="k">Payment received</span>
                  <span className="v">₦50,000</span>
                </div>
                <div className="mini-row">
                  <span className="k">Balance (derived)</span>
                  <span className="v" style={{ color: 'var(--warning)' }}>
                    ₦70,000
                  </span>
                </div>
                <div className="mini-row">
                  <span className="k">Stock movement</span>
                  <span className="v">−2 Ankara</span>
                </div>
              </div>
            </div>
          </div>

          <div className="split rev">
            <div>
              <span className="eyebrow">Act</span>
              <h2 className="display mt-3">Clear next steps, not noise</h2>
              <p className="muted">
                KUDII surfaces what needs attention: work that is in progress, balances to collect,
                stock running low, invoices falling due. You always know what to do next.
              </p>
            </div>
            <div className="split-media">
              <div className="stack gap-3">
                <div className="pv-card row-between">
                  <span className="text-sm">Follow up · ₦70,000</span>
                  <span className="badge badge-warning">Collect</span>
                </div>
                <div className="pv-card row-between">
                  <span className="text-sm">Lace fabric</span>
                  <span className="badge badge-danger">Restock</span>
                </div>
                <div className="pv-card row-between">
                  <span className="text-sm">INV-0007 due today</span>
                  <span className="badge badge-info">Invoice</span>
                </div>
              </div>
            </div>
          </div>

          <div className="split">
            <div>
              <span className="eyebrow">Stay in control</span>
              <h2 className="display mt-3">A business you can feel</h2>
              <p className="muted">
                Your dashboard, activity feed and progress view keep the whole picture calm and
                readable. Money is exact. History is permanent. You stay in control.
              </p>
            </div>
            <div className="split-media">
              <div className="pv-card">
                <div className="pv-l">Money received · last 6 months</div>
                <div className="pv-spark">
                  {[42, 58, 46, 70, 62, 84].map((h, i) => (
                    <span key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   PRICING
   ============================================================ */
function Pricing() {
  const go = PLANS.go
  const plus = PLANS.plus
  return (
    <section className="section">
      <div className="container">
        <SectionHead eyebrow="Pricing" title="Simple pricing that grows with you">
          Start with everything you need to run the day-to-day. Move up when you are ready to
          remove every limit.
        </SectionHead>

        <div className="price-grid">
          <div className="price-card">
            <h3>{go.name}</h3>
            <p className="muted text-sm mt-1">{go.tagline}</p>
            <div className="price-tag">
              <span className="amt num">{formatMoney(go.priceMinor!, 'NGN', { compact: true })}</span>
              <span className="per">/ month</span>
            </div>
            <ul className="price-feats">
              {go.features.map((f, i) => (
                <li key={i}>
                  <Check size={16} /> {f}
                </li>
              ))}
            </ul>
            <button className="btn btn-primary btn-block" onClick={() => navigate('/sign-up')}>
              Start with Go
            </button>
          </div>

          <div className="price-card featured">
            <span className="ribbon">Most complete</span>
            <h3>{plus.name}</h3>
            <p className="muted text-sm mt-1">{plus.tagline}</p>
            <div className="price-tag">
              <span className="amt num">Unlimited</span>
            </div>
            <ul className="price-feats">
              {plus.features.map((f, i) => (
                <li key={i}>
                  <Check size={16} /> {f}
                </li>
              ))}
            </ul>
            <button className="btn btn-accent btn-block" onClick={() => navigate('/sign-up')}>
              Get started
            </button>
            <p className="text-xs muted mt-3" style={{ textAlign: 'center' }}>
              KUDII Plus pricing is confirmed with you at upgrade.
            </p>
          </div>
        </div>

        <div className="faq mt-8">
          {[
            { q: 'Do I need a card to start?', a: 'No. You can create your account and explore KUDII Go straight away. Upgrades are confirmed when you are ready.' },
            { q: 'What counts as a transaction?', a: 'Recorded income, expenses and drawings, plus payments you receive. Creating a sale, job or invoice does not count until money actually moves.' },
            { q: 'Can I run more than one business?', a: 'KUDII Go includes one business workspace. KUDII Plus removes the limit so you can run several.' },
            { q: 'What happens if I reach a limit?', a: 'KUDII tells you clearly and invites you to upgrade. Nothing you have recorded is ever lost.' },
          ].map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   SECURITY
   ============================================================ */
function Security() {
  return (
    <section className="section">
      <div className="container">
        <SectionHead eyebrow="Trust & security" title="Built to be trusted with your business">
          Your records are the story of your business. KUDII is designed so that your data stays
          yours, your numbers stay exact, and your history stays intact.
        </SectionHead>

        <div className="feature-grid">
          {[
            { icon: Building2, t: 'Business isolation', d: 'Every record belongs to a single business. Data is scoped at the source, so one business can never see another.' },
            { icon: ShieldCheck, t: 'Server-authoritative', d: 'The client never decides who you are, what you may do, or what your totals are. Those are always determined server-side.' },
            { icon: Lock, t: 'Exact, auditable money', d: 'Amounts are stored in the smallest currency unit and never rounded away. Every figure can be traced to its events.' },
            { icon: EyeOff, t: 'Never destroys history', d: 'Financial records are immutable. Refunds and reversals create new entries — the original is always preserved.' },
            { icon: ServerCog, t: 'Roles & permissions', d: 'Membership and roles are enforced, so the right people see and do the right things.' },
            { icon: HeartHandshake, t: 'No fake functionality', d: 'If a feature is not ready, KUDII says so. There are no placeholder buttons pretending to work.' },
          ].map((f, i) => (
            <div className="feature" key={i}>
              <div className="f-ic">
                <f.icon size={21} strokeWidth={1.9} />
              </div>
              <h3>{f.t}</h3>
              <p className="muted">{f.d}</p>
            </div>
          ))}
        </div>

        <div className="section">
          <div className="split">
            <div>
              <span className="eyebrow">Privacy by design</span>
              <h2 className="display mt-3">Your data is yours</h2>
              <p className="muted">
                KUDII collects only what it needs to run your business. You can export your data and
                request deletion at any time. We do not sell your information, and we do not use it
                to compete with you.
              </p>
            </div>
            <div className="split-media">
              <div className="stack gap-3">
                <div className="mini-row">
                  <span className="k">Data isolation</span>
                  <span className="v">Per business</span>
                </div>
                <div className="mini-row">
                  <span className="k">Money precision</span>
                  <span className="v">Exact minor units</span>
                </div>
                <div className="mini-row">
                  <span className="k">History</span>
                  <span className="v">Immutable</span>
                </div>
                <div className="mini-row">
                  <span className="k">Export</span>
                  <span className="v">Anytime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   FAQ
   ============================================================ */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-q" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {q}
        <Plus size={20} />
      </button>
      {open && <div className="faq-a">{a}</div>}
    </div>
  )
}

function FAQ() {
  const items = [
    { q: 'What is KUDII?', a: 'KUDII is a premium business management app for small businesses. It helps you record what happened, see what is owed, know what needs attention, and take the next step quickly — all in one calm place.' },
    { q: 'Is KUDII accounting software?', a: 'No. KUDII is not traditional accounting software and it is not a spreadsheet. It is a clear, warm way to understand and run your business day to day. It keeps your money exact and your history intact.' },
    { q: 'Does creating a sale mean I have been paid?', a: 'Never. In KUDII, a sale, job or invoice only records the work or the bill. Money is recognised only when you record an actual payment. This is what keeps your numbers honest.' },
    { q: 'Can I handle part payments?', a: 'Yes. KUDII supports unpaid, partially paid, fully paid and even overpaid. Balances are computed for every sale, job, invoice and customer.' },
    { q: 'What if I make a mistake?', a: 'You can refund a payment or reverse a transaction. KUDII never deletes financial history — it records a new, auditable entry so the story stays complete.' },
    { q: 'Does it work on my phone?', a: 'Yes. KUDII is mobile-first, with a floating action button so you can record a sale, a payment or an expense in seconds.' },
    { q: 'What are the plans?', a: 'KUDII Go is ₦5,000 per month with generous limits (50 products, 50 customers, 25 active jobs, 100 transactions a month, 1 business). KUDII Plus removes every limit.' },
    { q: 'Can I run more than one business?', a: 'KUDII Go includes one business workspace. KUDII Plus lets you run several under one account.' },
    { q: 'Is my data safe?', a: 'Your data is isolated per business, scoped server-side, and never sold. You can export your data and request deletion at any time.' },
    { q: 'Is there an AI assistant?', a: 'An AI Assistant is planned and shown as “Coming Soon”. It is not active yet — KUDII does not pretend otherwise.' },
  ]
  return (
    <section className="section">
      <div className="container">
        <SectionHead eyebrow="Questions" title="Frequently asked questions" />
        <div className="faq">
          {items.map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   GET STARTED
   ============================================================ */
function GetStarted() {
  return (
    <section className="section">
      <div className="container">
        <SectionHead eyebrow="Get started" title="Start feeling in control today">
          Create your account, set up your business, and record your first sale in minutes.
        </SectionHead>
        <div className="feature-grid">
          {[
            { icon: Building2, t: '1 · Set up', d: 'Name your business, choose your currency and pick a theme.' },
            { icon: Users, t: '2 · Add people & things', d: 'Add a customer and a product or two to get going.' },
            { icon: Receipt, t: '3 · Record & relax', d: 'Record a sale or job, take a payment, and watch your pulse update.' },
          ].map((f, i) => (
            <div className="feature" key={i}>
              <div className="f-ic">
                <f.icon size={21} strokeWidth={1.9} />
              </div>
              <h3>{f.t}</h3>
              <p className="muted">{f.d}</p>
            </div>
          ))}
        </div>
        <div className="hero-cta mt-8">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/sign-up')}>
            Create your account <ArrowRight size={18} />
          </button>
          <button className="btn btn-soft btn-lg" onClick={() => navigate('/sign-in')}>
            I already have an account
          </button>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Router ---------------- */
export default function Marketing() {
  const { path } = useRoute()
  let page: ReactNode
  switch (path) {
    case '/how-it-works':
      page = <HowItWorks />
      break
    case '/pricing':
      page = <Pricing />
      break
    case '/security':
      page = <Security />
      break
    case '/faq':
      page = <FAQ />
      break
    case '/get-started':
      page = <GetStarted />
      break
    default:
      page = <Home />
  }
  return (
    <div className="mk">
      <MkNav />
      <main style={{ flex: 1 }}>{page}</main>
      <MkFooter />
    </div>
  )
}
