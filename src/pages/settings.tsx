/* ============================================================
   KUDII — Settings
   Appearance, business, plan & usage, data, and account.
   Everything here is honest: no fake toggles, no invented prices.
   ============================================================ */
import { useRef, useState } from 'react'
import {
  Palette,
  Building2,
  CreditCard,
  Database,
  Bell,
  Sparkles,
  LogOut,
  Check,
  Download,
  Upload,
  RotateCcw,
  Plus,
  SwitchCamera,
  Trash2,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { useDB, useUser, useSettings, useToast, useConfirm } from '../lib/hooks'
import { store } from '../lib/store'
import { navigate } from '../lib/router'
import { useComposer } from '../components/composer-context'
import { PageHead } from '../components/shell'
import {
  Button,
  Field,
  Input,
  Textarea,
  Select,
  SectionCard,
  Toggle,
  Badge,
  ProgressBar,
  Modal,
  KV,
} from '../components/ui'
import { PLANS, entitlementsFor } from '../lib/plans'
import { usage, limitStatus, planOf } from '../lib/derive'
import { loadDemo } from '../lib/seed'
import { CURRENCIES, formatMoney, formatDate } from '../lib/utils'
import type { ThemeName, DB, PlanId } from '../lib/types'

const THEMES: { id: ThemeName; name: string; desc: string; swatch: string[] }[] = [
  { id: 'warm', name: 'Warm Glass', desc: 'Soft cream and sage — the KUDII signature.', swatch: ['#F6F3EE', '#879681', '#C8B48A', '#171716'] },
  { id: 'white', name: 'White Glass', desc: 'Bright, clean and airy.', swatch: ['#FFFFFF', '#EDEBE6', '#879681', '#171716'] },
  { id: 'black', name: 'Black Glass', desc: 'Deep, focused and calm at night.', swatch: ['#141414', '#2A2A28', '#879681', '#F4F2EE'] },
  { id: 'champagne', name: 'Champagne Glass', desc: 'Warm gold tones with quiet luxury.', swatch: ['#F7F1E6', '#C8B48A', '#A98C55', '#2A2418'] },
]

export default function Settings() {
  const db = useDB()
  const user = useUser()
  const settings = useSettings(user?.id)
  const toast = useToast()
  const confirm = useConfirm()
  const composer = useComposer()

  const biz = store.activeBusiness()
  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'
  const planId = planOf(db, businessId)
  const plan = PLANS[planId]
  const entitlements = entitlementsFor(planId)
  const use = usage(db, businessId, user?.id || '')
  const sub = store.getSubscription(businessId)
  const businesses = store.listBusinesses()

  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
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
      <PageHead title="Settings" sub="Make KUDII yours — appearance, business, plan, and data." />

      <div className="grid-main">
        <div className="stack gap-5">
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

          {/* Business */}
          <SectionCard
            title="Business"
            action={
              <Button size="sm" variant="ghost" icon={Building2} onClick={() => composer.open('business', { id: biz.id })}>
                Edit
              </Button>
            }
          >
            <dl className="kv">
              <KV label="Name">{biz.name}</KV>
              <KV label="Currency">{biz.currency} ({currency})</KV>
              <KV label="Country">{biz.country || '—'}</KV>
              <KV label="Timezone">{biz.timezone}</KV>
            </dl>
            {biz.description && <p className="text-sm muted mt-4">{biz.description}</p>}
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

          {/* Data */}
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

        {/* Sidebar */}
        <div className="stack gap-5">
          {/* Plan & usage */}
          <SectionCard
            title="Plan"
            action={<Badge tone={planId === 'plus' ? 'success' : 'neutral'}>{plan.name}</Badge>}
          >
            <div className="row-between" style={{ alignItems: 'baseline' }}>
              <div className="stat-value lg num">
                {plan.priceConfigured && plan.priceMinor != null ? formatMoney(plan.priceMinor, plan.currency) : '—'}
                {plan.priceConfigured && <span className="text-sm muted" style={{ fontWeight: 400 }}>/mo</span>}
              </div>
            </div>
            {!plan.priceConfigured && <div className="text-xs muted mt-1">Price not configured yet.</div>}

            <div className="divider" style={{ margin: 'var(--s-5) 0' }} />

            <div className="eyebrow mb-3">Usage</div>
            <div className="stack gap-4">
              <UsageRow label="Products" used={use.products} limit={plan.limits.products} />
              <UsageRow label="Customers" used={use.customers} limit={plan.limits.customers} />
              <UsageRow label="Active jobs" used={use.active_jobs} limit={plan.limits.active_jobs} />
              <UsageRow label="Transactions / month" used={use.transactions_this_month} limit={plan.limits.transactions_per_month} />
              <UsageRow label="Businesses" used={use.businesses} limit={plan.limits.businesses} />
            </div>

            {sub && (
              <div className="text-xs muted mt-4">
                {sub.status === 'active' ? 'Active' : sub.status} · renews {formatDate(sub.current_period_end)}
              </div>
            )}

            <Button variant="primary" block className="mt-4" icon={Zap} onClick={() => setUpgradeOpen(true)}>
              {planId === 'go' ? 'Upgrade to Plus' : 'Manage plan'}
            </Button>
          </SectionCard>

          {/* Multi-business */}
          <SectionCard
            title="Businesses"
            action={
              <Button size="sm" variant="ghost" icon={Plus} onClick={() => composer.open('business')}>
                New
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
            {businesses.length <= 1 && planId === 'go' && (
              <p className="text-xs muted mt-3">
                KUDII Go includes 1 business. Upgrade to Plus to run several.
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

          {/* Account */}
          <SectionCard title="Account">
            <dl className="kv">
              <KV label="Name">{user.name}</KV>
              <KV label="Email">{user.email}</KV>
            </dl>
            <div className="row gap-2 mt-4" style={{ alignItems: 'center', color: 'var(--text-2)' }}>
              <ShieldCheck size={16} />
              <span className="text-xs">Your data is scoped to this business and never shared.</span>
            </div>
            <Button
              variant="ghost"
              block
              className="mt-4"
              icon={LogOut}
              onClick={() => {
                store.signOut()
                navigate('/', { replace: true })
              }}
            >
              Sign out
            </Button>
          </SectionCard>
        </div>
      </div>

      {/* Upgrade modal */}
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        current={planId}
        onChoose={(p) => {
          const res = store.changePlan(businessId, p)
          if (res.ok) {
            toast.push(`Switched to ${PLANS[p].name}`, 'success')
            setUpgradeOpen(false)
          } else {
            toast.push(res.error || 'Could not change plan', 'error')
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
  onChoose,
}: {
  open: boolean
  onClose: () => void
  current: PlanId
  onChoose: (p: PlanId) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Choose your plan" subtitle="Start simple. Upgrade whenever you're ready." size="lg">
      <div className="grid-2">
        {(['go', 'plus'] as PlanId[]).map((pid) => {
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
                {p.priceConfigured && p.priceMinor != null ? formatMoney(p.priceMinor, p.currency) : 'Contact us'}
                {p.priceConfigured && <span className="text-sm muted" style={{ fontWeight: 400 }}>/mo</span>}
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
                onClick={() => onChoose(pid)}
              >
                {active ? 'Current plan' : `Switch to ${p.name}`}
              </Button>
            </div>
          )
        })}
      </div>
      <p className="text-xs muted mt-5" style={{ textAlign: 'center' }}>
        Payments are handled by a secure provider. No card details are stored by KUDII.
      </p>
    </Modal>
  )
}
