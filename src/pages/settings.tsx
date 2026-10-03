/* ============================================================
   KUDII — Settings
   Account settings (profile, security, appearance, data) are kept
   separate from Business settings (business details, plan, workspaces).
   Everything here is honest: no fake toggles, no invented prices.
   ============================================================ */
import { useRef, useState } from 'react'
import {
  Palette,
  Building2,
  Database,
  Bell,
  Sparkles,
  LogOut,
  Check,
  Download,
  Upload,
  Plus,
  SwitchCamera,
  Trash2,
  ShieldCheck,
  Zap,
  User as UserIcon,
  Mail,
  Clock,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { useDB, useUser, useSettings, useToast, useConfirm } from '../lib/hooks'
import { store } from '../lib/store'
import { navigate, useRoute } from '../lib/router'
import { useComposer } from '../components/composer-context'
import { PageHead } from '../components/shell'
import {
  Button,
  Field,
  Input,
  Textarea,
  SectionCard,
  Toggle,
  Badge,
  ProgressBar,
  Modal,
  KV,
  Tabs,
} from '../components/ui'
import { PLANS, PLAN_ORDER } from '../lib/plans'
import { usage, limitStatus, planOf } from '../lib/derive'
import { loadDemo } from '../lib/seed'
import { formatMoney, formatDate } from '../lib/utils'
import type { ThemeName, DB, PlanId, Subscription } from '../lib/types'

type SettingsTab = 'account' | 'business'

/* Warm, comfortable palettes — never pure white, never pure black. */
const THEMES: { id: ThemeName; name: string; desc: string; swatch: string[] }[] = [
  { id: 'light', name: 'Light', desc: 'Soft warm off-white, easy on the eyes.', swatch: ['#FAF8F4', '#F1EDE6', '#211E1A', '#6B655C'] },
  { id: 'dark', name: 'Dark', desc: 'Warm charcoal, comfortable for long sessions.', swatch: ['#17150F', '#211E17', '#F3EFE7', '#A8A296'] },
]

/* ---------------- subscription state ---------------- */
type SubState = 'free' | 'pending' | 'active' | 'expired' | 'cancelled' | 'failed'

function subState(sub: Subscription | null, planId: PlanId): SubState {
  if (!sub) return planId === 'free' ? 'free' : 'active'
  if (sub.status === 'pending') return 'pending'
  if (sub.status === 'expired') return 'expired'
  if (sub.status === 'cancelled') return 'cancelled'
  if (sub.status === 'failed' || sub.status === 'past_due') return 'failed'
  return planId === 'free' ? 'free' : 'active'
}

const SUB_LABEL: Record<SubState, { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }> = {
  free: { label: 'KUDII Free', tone: 'neutral' },
  pending: { label: 'Payment pending', tone: 'warning' },
  active: { label: 'Active', tone: 'success' },
  expired: { label: 'Expired', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  failed: { label: 'Payment failed', tone: 'danger' },
}

export default function Settings() {
  const db = useDB()
  const user = useUser()
  const settings = useSettings(user?.id)
  const toast = useToast()
  const confirm = useConfirm()
  const composer = useComposer()
  const route = useRoute()

  const biz = store.activeBusiness()
  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'
  const planId = planOf(db, businessId)
  const plan = PLANS[planId]
  const use = usage(db, businessId, user?.id || '')
  const sub = store.getSubscription(businessId)
  const businesses = store.listBusinesses()
  const state = subState(sub, planId)

  const [tab, setTab] = useState<SettingsTab>((route.query.get('tab') as SettingsTab) || 'account')
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName, setProfileName] = useState("")
  const [importText, setImportText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const setTheme = (t: ThemeName) => {
    if (!user) return
    store.updateSettings(user.id, { theme: t })
    toast.push(`Theme set to ${THEMES.find((x) => x.id === t)?.name}`)
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kudii-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.push('Your data was exported', 'success')
  }

  const importData = (text: string) => {
    try {
      const parsed = JSON.parse(text) as DB
      if (!parsed || !Array.isArray(parsed.businesses)) throw new Error('bad')
      store.replaceDB({ ...parsed })
      toast.push('Data imported', 'success')
      setImportOpen(false)
      setImportText('')
    } catch {
      toast.push('That file could not be read', 'error')
    }
  }

  const onFile = (f: File | null) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => importData(String(reader.result || ''))
    reader.readAsText(f)
  }

  const resetAll = async () => {
    const res = await confirm({
      title: 'Erase everything?',
      message: 'This permanently removes all businesses, customers, sales, payments and history from this device. This cannot be undone.',
      confirmLabel: 'Erase everything',
      danger: true,
      requireReason: true,
    })
    if (!res.confirmed) return
    store.resetAll()
    toast.push('Everything was erased')
    navigate('/sign-in', { replace: true })
  }

  const loadDemoData = async () => {
    const res = await confirm({
      title: 'Load a demo business?',
      message: 'This replaces your current data with a sample business so you can explore KUDII. Your real data will be removed.',
      confirmLabel: 'Load demo',
      danger: true,
    })
    if (!res.confirmed) return
    await loadDemo()
    toast.push('Demo business loaded', 'success')
    navigate('/', { replace: true })
  }

  if (!user || !biz) return null

  return (
    <div className="stack gap-6">
      <PageHead title="Settings" sub="Account, business, plan and data — all in one place." />

      <Tabs<SettingsTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'account', label: 'Account' },
          { value: 'business', label: 'Business' },
        ]}
      />

      {tab === 'account' && (
        <div className="grid-main">
          <div className="stack gap-5">
            {/* Profile */}
            <SectionCard
              title="Profile"
              action={
                <Button size="sm" variant="ghost" icon={UserIcon} onClick={() => composer.open('profile' as any)}>
                  Edit
                </Button>
              }
            >
              <dl className="kv">
                <KV label="Name">{user.name}</KV>
                <KV label="Email">
                  <span className="row gap-2" style={{ alignItems: 'center' }}>
                    {user.email}
                    {user.email_verified ? (
                      <Badge tone="success" dot>Verified</Badge>
                    ) : (
                      <Badge tone="warning" dot>Unverified</Badge>
                    )}
                  </span>
                </KV>
              </dl>
              {!user.email_verified && (
                <div className="row-between wrap gap-3 mt-4" style={{ alignItems: 'center' }}>
                  <div className="text-xs muted">Verify your email to secure your account and enable recovery.</div>
                  <Button
                    size="sm"
                    variant="soft"
                    icon={Mail}
                    onClick={async () => {
                      const res = await store.resendVerification(user.email)
                      toast.push(res.ok ? 'Verification code sent' : res.error || 'Could not send code', res.ok ? 'success' : 'error')
                    }}
                  >
                    Send code
                  </Button>
                </div>
              )}
            </SectionCard>

            {/* Appearance */}
            <SectionCard title="Appearance">
              <div className="eyebrow mb-3">Theme</div>
              <div className="theme-picker">
                {THEMES.map((t) => {
                  const active = (settings?.theme || biz.theme) === t.id
                  return (
                    <button
                      key={t.id}
                      className={`theme-opt ${active ? 'active' : ''}`}
                      onClick={() => setTheme(t.id)}
                    >
                      <div className="swatch" style={{ display: 'flex' }}>
                        {t.swatch.map((c, i) => (
                          <span key={i} style={{ background: c, flex: 1 }} />
                        ))}
                      </div>
                      <div className="row-between mt-2" style={{ alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--fs-14)' }}>{t.name}</span>
                        {active && <Check size={15} style={{ color: 'var(--accent)' }} />}
                      </div>
                      <div className="text-xs muted mt-1">{t.desc}</div>
                    </button>
                  )
                })}
              </div>

              <div className="divider" style={{ margin: 'var(--s-5) 0' }} />

              <div className="row-between" style={{ alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Reduce motion</div>
                  <div className="text-xs muted">Turn off animations and blur transitions.</div>
                </div>
                <Toggle
                  on={settings?.reduce_effects || false}
                  onChange={(v) => {
                    store.updateSettings(user.id, { reduce_effects: v })
                    toast.push(v ? 'Motion reduced' : 'Motion restored')
                  }}
                  label="Reduce motion"
                />
              </div>
            </SectionCard>

            {/* Notifications */}
            <SectionCard title="Notifications">
              <div className="row-between" style={{ alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }} className="row gap-2">
                    <Bell size={16} /> Activity notifications
                  </div>
                  <div className="text-xs muted mt-1">Get a nudge when something needs your attention.</div>
                </div>
                <Toggle
                  on={settings?.notifications_enabled ?? true}
                  onChange={(v) => {
                    store.updateSettings(user.id, { notifications_enabled: v })
                    toast.push(v ? 'Notifications on' : 'Notifications off')
                  }}
                  label="Notifications"
                />
              </div>
            </SectionCard>

            {/* Your data */}
            <SectionCard title="Your data">
              <p className="text-sm muted">
                KUDII stores your data on this device. Export a full copy any time — it's yours, always.
              </p>
              <div className="row gap-2 wrap mt-4">
                <Button variant="soft" icon={Download} onClick={exportData}>
                  Export data
                </Button>
                <Button variant="soft" icon={Upload} onClick={() => setImportOpen(true)}>
                  Import data
                </Button>
                <Button variant="ghost" icon={Sparkles} onClick={loadDemoData}>
                  Load demo
                </Button>
              </div>
              <div className="divider" style={{ margin: 'var(--s-5) 0' }} />
              <div className="row-between wrap gap-3" style={{ alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--danger)' }}>Erase everything</div>
                  <div className="text-xs muted">Remove all data from this device. Cannot be undone.</div>
                </div>
                <Button variant="danger" icon={Trash2} onClick={resetAll}>
                  Erase
                </Button>
              </div>
            </SectionCard>
          </div>

          {/* Account sidebar */}
          <div className="stack gap-5">
            <SectionCard title="Security">
              <div className="row gap-2" style={{ alignItems: 'center', color: 'var(--text-2)' }}>
                <ShieldCheck size={16} />
                <span className="text-xs">Signed in securely. Your session is scoped to this device.</span>
              </div>
              <div className="divider" style={{ margin: 'var(--s-5) 0' }} />
              <Button
                variant="ghost"
                block
                icon={LogOut}
                onClick={() => {
                  store.signOut()
                  navigate('/', { replace: true })
                }}
              >
                Sign out
              </Button>
            </SectionCard>

            <SectionCard title="Account">
              <dl className="kv">
                <KV label="Name">{user.name}</KV>
                <KV label="Email">{user.email}</KV>
              </dl>
              <div className="text-xs muted mt-4">
                Account details cover who you are. Business details — name, logo, currency, plan — live under the Business tab.
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {tab === 'business' && (
        <div className="grid-main">
          <div className="stack gap-5">
            {/* Business details */}
            <SectionCard
              title="Business details"
              action={
                <Button size="sm" variant="ghost" icon={Building2} onClick={() => composer.open('business', { id: biz.id })}>
                  Edit
                </Button>
              }
            >
              <dl className="kv">
                <KV label="Name">{biz.name}</KV>
                <KV label="Category">{biz.category || '—'}</KV>
                <KV label="Phone">{biz.phone || '—'}</KV>
                <KV label="Currency">{biz.currency} ({currency})</KV>
                <KV label="Country">{biz.country || '—'}</KV>
                <KV label="Timezone">{biz.timezone}</KV>
              </dl>
              {biz.description && <p className="text-sm muted mt-4">{biz.description}</p>}
            </SectionCard>

            {/* Businesses / workspaces */}
            <SectionCard
              title="Business workspaces"
              action={
                <Button size="sm" variant="ghost" icon={Plus} onClick={() => composer.open('business')}>
                  Add business
                </Button>
              }
            >
              <div className="stack gap-2">
                {businesses.map((b) => {
                  const active = b.id === businessId
                  return (
                    <button
                      key={b.id}
                      className="list-row"
                      style={{ borderRadius: 'var(--r-3)', border: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => {
                        if (!active) {
                          store.switchBusiness(b.id)
                          toast.push(`Switched to ${b.name}`)
                          navigate('/')
                        }
                      }}
                    >
                      <span className="list-main">
                        <span className="list-title">{b.name}</span>
                        <span className="list-sub">{b.currency} · {b.country || '—'}</span>
                      </span>
                      {active ? <Badge tone="success" dot>Current</Badge> : <SwitchCamera size={16} style={{ color: 'var(--text-3)' }} />}
                    </button>
                  )
                })}
              </div>
              {businesses.length < (plan.limits.businesses ?? 99) && planId === 'free' && (
                <p className="text-xs muted mt-3">
                  Multiple businesses are available on KUDII Go and Plus.
                </p>
              )}
              {planId !== 'free' && plan.limits.businesses !== null && (
                <p className="text-xs muted mt-3">
                  {businesses.length} of {plan.limits.businesses} workspaces used on {plan.name}.
                </p>
              )}
            </SectionCard>

            {/* AI Assistant */}
            <SectionCard title="AI Assistant">
              <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                <span className="tl-ic" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <Sparkles size={18} />
                </span>
                <div>
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>KUDII Assistant</span>
                    <Badge tone="info">Coming soon</Badge>
                  </div>
                  <p className="text-xs muted mt-1">
                    Ask questions about your business in plain language. Not available yet — we'll only ship it when it's genuinely useful.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Business sidebar: plan & subscription */}
          <div className="stack gap-5">
            <SectionCard
              title="Plan & subscription"
              action={<Badge tone={SUB_LABEL[state].tone} dot>{SUB_LABEL[state].label}</Badge>}
            >
              <div className="row-between" style={{ alignItems: 'baseline' }}>
                <div className="stat-value lg num">
                  {plan.priceMinor != null ? formatMoney(plan.priceMinor, plan.currency) : '—'}
                  <span className="text-sm muted" style={{ fontWeight: 400 }}>/mo</span>
                </div>
              </div>
              <div className="text-xs muted mt-1">{plan.name}</div>

              {/* Honest status messaging */}
              {state === 'pending' && sub?.pending_plan && (
                <div className="row gap-2 mt-4" style={{ alignItems: 'flex-start', color: 'var(--warning)' }}>
                  <Clock size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span className="text-xs">
                    Payment for {PLANS[sub.pending_plan].name} is pending. Paid features stay locked until payment is confirmed.
                  </span>
                </div>
              )}
              {state === 'expired' && (
                <div className="row gap-2 mt-4" style={{ alignItems: 'flex-start', color: 'var(--danger)' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span className="text-xs">
                    Your subscription expired. Your data is safe — renew to unlock paid actions again.
                  </span>
                </div>
              )}
              {state === 'cancelled' && (
                <div className="row gap-2 mt-4" style={{ alignItems: 'flex-start', color: 'var(--text-2)' }}>
                  <XCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span className="text-xs">
                    Subscription cancelled. You're on KUDII Free limits. Your data is kept.
                  </span>
                </div>
              )}
              {state === 'failed' && (
                <div className="row gap-2 mt-4" style={{ alignItems: 'flex-start', color: 'var(--danger)' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span className="text-xs">
                    The last payment failed. Nothing was unlocked. You can try again any time.
                  </span>
                </div>
              )}
              {state === 'active' && planId !== 'free' && sub && (
                <div className="text-xs muted mt-3">
                  Renews {formatDate(sub.current_period_end)}
                </div>
              )}

              <div className="divider" style={{ margin: 'var(--s-5) 0' }} />

              <div className="eyebrow mb-3">Usage</div>
              <div className="stack gap-4">
                <UsageRow label="Products" used={use.products} limit={plan.limits.products} />
                <UsageRow label="Customers" used={use.customers} limit={plan.limits.customers} />
                <UsageRow label="Transactions / month" used={use.transactions_this_month} limit={plan.limits.transactions_per_month} />
                <UsageRow label="Businesses" used={use.businesses} limit={plan.limits.businesses} />
              </div>

              <Button variant="primary" block className="mt-4" icon={Zap} onClick={() => setUpgradeOpen(true)}>
                {planId === 'free' ? 'Upgrade' : 'Manage plan'}
              </Button>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Upgrade modal */}
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        current={planId}
        businessId={businessId}
        onChoose={(p) => {
          const res = store.changePlan(businessId, p)
          if (res.ok) {
            toast.push(p === 'free' ? 'Switched to KUDII Free' : `Payment pending for ${PLANS[p].name}`, 'success')
          } else {
            toast.push(res.error || 'Could not change plan', 'error')
          }
        }}
        onConfirm={(ref) => {
          const res = store.confirmPlanPayment(businessId, ref)
          if (res.ok) {
            toast.push('Payment confirmed — plan activated', 'success')
            setUpgradeOpen(false)
          } else {
            toast.push(res.error || 'Could not confirm payment', 'error')
          }
        }}
      />

      {/* Import modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import data"
        subtitle="Paste an exported KUDII file, or choose one from your device."
        footer={
          <>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" icon={Upload} onClick={() => importData(importText)} disabled={!importText.trim()}>
              Import
            </Button>
          </>
        }
      >
        <Field label="Paste JSON">
          <Textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={6} placeholder='{ "businesses": [ ... ] }' />
        </Field>
        <div className="mt-4">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
          <Button variant="soft" icon={Upload} onClick={() => fileRef.current?.click()}>
            Choose a file
          </Button>
        </div>
      </Modal>

      {/* Profile edit modal */}
      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Edit profile"
        subtitle="Your name appears across KUDII."
        footer={
          <>
            <Button variant="ghost" onClick={() => setProfileOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={Check}
              onClick={() => {
                const name = profileName.trim()
                if (name.length < 2) {
                  toast.push('Please enter your name', 'error')
                  return
                }
                const res = store.updateProfile(user.id, { name })
                if (res.ok) {
                  toast.push('Profile updated', 'success')
                  setProfileOpen(false)
                } else {
                  toast.push(res.error || 'Could not update profile', 'error')
                }
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Field label="Full name">
          <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Your name" />
        </Field>
        <Field label="Email" hint="Email is your sign-in identity and can't be changed here.">
          <Input value={user.email} disabled />
        </Field>
      </Modal>
    </div>
  )
}

/* ---------------- Usage row ---------------- */
function UsageRow({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const s = limitStatus(used, limit)
  return (
    <div>
      <div className="row-between" style={{ alignItems: 'baseline' }}>
        <span className="text-sm">{label}</span>
        <span className="num text-sm" style={{ fontWeight: 600 }}>
          {used}
          <span className="muted" style={{ fontWeight: 400 }}> / {limit === null ? '∞' : limit}</span>
        </span>
      </div>
      {limit !== null && (
        <div className="mt-1">
          <ProgressBar value={s.pct} thin />
        </div>
      )}
      {s.atLimit && (
        <div className="text-xs mt-1" style={{ color: 'var(--warning)' }}>
          Limit reached — upgrade to keep going.
        </div>
      )}
    </div>
  )
}

/* ---------------- Upgrade modal ---------------- */
function UpgradeModal({
  open,
  onClose,
  current,
  businessId,
  onChoose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  current: PlanId
  businessId: string
  onChoose: (p: PlanId) => void
  onConfirm: (ref: string) => void
}) {
  const [chosen, setChosen] = useState<PlanId | null>(null)
  const [reference, setReference] = useState('')

  const close = () => {
    setChosen(null)
    setReference('')
    onClose()
  }

  // Payment-pending view for a paid plan.
  if (chosen && chosen !== 'free') {
    const p = PLANS[chosen]
    return (
      <Modal open={open} onClose={close} title="Confirm payment" subtitle={`${p.name} · ${formatMoney(p.priceMinor, p.currency)}/month`}>
        <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
          <span className="tl-ic" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Clock size={18} />
          </span>
          <div>
            <div style={{ fontWeight: 600 }}>Payment pending</div>
            <p className="text-xs muted mt-1">
              In production, KUDII hands you to a secure payment provider and unlocks {p.name} only after the provider
              confirms the payment (via webhook). Paid features stay locked until then.
            </p>
          </div>
        </div>

        <div className="divider" style={{ margin: 'var(--s-5) 0' }} />

        <Field label="Payment reference" hint="A reference from your payment provider (bank transfer, card, etc.).">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. TRF-2024-00123" />
        </Field>

        <div className="row gap-2 mt-5">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={Check}
            onClick={() => onConfirm(reference.trim() || `KUDII-${Date.now()}`)}
          >
            Confirm payment (demo)
          </Button>
        </div>
        <p className="text-xs muted mt-4">
          No card details are ever stored by KUDII. This button stands in for the provider's confirmation while KUDII
          runs without a live payment backend.
        </p>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={close} title="Choose your plan" subtitle="Start simple. Upgrade whenever you're ready." size="lg">
      <div className="grid-3">
        {PLAN_ORDER.map((pid) => {
          const p = PLANS[pid]
          const active = pid === current
          return (
            <div key={pid} className="card" style={{ borderColor: p.highlight ? 'var(--accent)' : 'var(--border)' }}>
              <div className="row-between" style={{ alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--fs-18)' }}>{p.name}</span>
                {p.highlight && <Badge tone="success">Most complete</Badge>}
              </div>
              <p className="text-sm muted mt-1">{p.tagline}</p>
              <div className="stat-value lg num mt-3">
                {formatMoney(p.priceMinor, p.currency)}
                <span className="text-sm muted" style={{ fontWeight: 400 }}>/mo</span>
              </div>
              <div className="stack gap-2 mt-4">
                {p.features.map((f) => (
                  <div key={f} className="row gap-2 text-sm" style={{ alignItems: 'center' }}>
                    <Check size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    {f}
                  </div>
                ))}
              </div>
              <Button
                variant={active ? 'soft' : 'primary'}
                block
                className="mt-5"
                disabled={active}
                onClick={() => {
                  if (pid === 'free') {
                    onChoose('free')
                    close()
                  } else {
                    onChoose(pid) // marks payment pending
                    setChosen(pid)
                  }
                }}
              >
                {active ? 'Current plan' : pid === 'free' ? 'Switch to Free' : `Choose ${p.name}`}
              </Button>
            </div>
          )
        })}
      </div>
      <p className="text-xs muted mt-5" style={{ textAlign: 'center' }}>
        Paid features unlock only after payment is confirmed. KUDII never stores your card details.
      </p>
    </Modal>
  )
}
