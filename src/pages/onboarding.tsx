/* ============================================================
   KUDII — Onboarding
   Create the business, choose a theme, and get to the first action.
   ============================================================ */
import { useState } from 'react'
import { ArrowRight, ArrowLeft, Check, Sparkles, Building2, Palette } from 'lucide-react'
import { navigate } from '../lib/router'
import { store } from '../lib/store'
import { useToast } from '../lib/hooks'
import { BrandMark } from '../components/shell'
import { Button, Field, Input, Textarea, Select, ErrorBanner } from '../components/ui'
import { CURRENCIES } from '../lib/utils'
import type { ThemeName } from '../lib/types'

const THEMES: { id: ThemeName; name: string; desc: string; swatch: string[] }[] = [
  { id: 'light', name: 'Light', desc: 'Soft warm off-white, easy on the eyes.', swatch: ['#FAF8F4', '#F1EDE6', '#211E1A', '#6B655C'] },
  { id: 'dark', name: 'Dark', desc: 'Warm charcoal, comfortable for long sessions.', swatch: ['#17150F', '#211E17', '#F3EFE7', '#A8A296'] },
]

export default function Onboarding() {
  const toast = useToast()
  const user = store.currentUser()
  const [step, setStep] = useState(0)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState('NGN')
  const [country, setCountry] = useState('Nigeria')
  const [theme, setTheme] = useState<ThemeName>('light')
  const [err, setErr] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const pickTheme = (t: ThemeName) => {
    setTheme(t)
    if (user) store.updateSettings(user.id, { theme: t })
  }

  const create = () => {
    setErr('')
    setFieldErrors({})
    const res = store.createBusiness({ name, description, currency, country, theme })
    if (!res.ok) {
      setErr(res.error || '')
      setFieldErrors(res.fieldErrors || {})
      setStep(1)
      return
    }
    setSaving(true)
    toast.push('Business created — welcome to KUDII')
    navigate('/', { replace: true })
  }

  const canNext = name.trim().length >= 2

  return (
    <div className="onboard">
      <div className="onboard-card">
        <div className="row-between mb-6">
          <div className="brand">
            <BrandMark />
            KUDII
          </div>
          <button
            className="link text-sm"
            style={{ color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => {
              store.signOut()
              navigate('/')
            }}
          >
            Sign out
          </button>
        </div>

        <div className="steps">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`st ${i < step ? 'done' : i === step ? 'current' : ''}`} />
          ))}
        </div>

        <div className="card card-pad-lg rise">
          {step === 0 && (
            <div className="stack gap-5">
              <div className="stack gap-2">
                <span className="eyebrow">Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</span>
                <h1 className="display" style={{ fontSize: 'var(--fs-30)' }}>
                  Let's set up your business
                </h1>
                <p className="muted">
                  This takes about a minute. You can change everything later in settings. KUDII keeps
                  your records isolated to this business — always.
                </p>
              </div>
              <div className="stack gap-3">
                {[
                  { icon: Building2, t: 'Name your business', d: 'Currency and country apply across KUDII.' },
                  { icon: Palette, t: 'Choose a theme', d: 'Make KUDII feel like yours.' },
                  { icon: Sparkles, t: 'Record your first action', d: 'A customer, a sale or an expense.' },
                ].map((f, i) => (
                  <div className="row gap-3" key={i}>
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        display: 'grid',
                        placeItems: 'center',
                        background: 'var(--tint)',
                        color: 'var(--text)',
                        flex: 'none',
                      }}
                    >
                      <f.icon size={18} strokeWidth={2} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--fs-14)' }}>{f.t}</div>
                      <div className="text-xs muted">{f.d}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="primary" size="lg" block icon={ArrowRight} onClick={() => setStep(1)}>
                Set up my business
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="stack gap-5">
              <div className="stack gap-2">
                <span className="eyebrow">Step 1 of 2</span>
                <h1 className="display" style={{ fontSize: 'var(--fs-26)' }}>
                  Your business details
                </h1>
              </div>
              {err && <ErrorBanner>{err}</ErrorBanner>}
              <Field label="Business name" required error={fieldErrors.name}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Adaeze Fabrics & Tailoring"
                  invalid={!!fieldErrors.name}
                  autoFocus
                />
              </Field>
              <Field label="What do you do?" hint="Optional — helps KUDII adapt to you.">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Bespoke tailoring, fabrics and alterations in Lagos."
                />
              </Field>
              <div className="grid grid-form" style={{ gap: 'var(--s-4)' }}>
                <Field label="Currency">
                  <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code} — {c.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Country">
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Nigeria" />
                </Field>
              </div>
              <div className="row gap-3">
                <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button variant="primary" className="grow" icon={ArrowRight} disabled={!canNext} onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="stack gap-5">
              <div className="stack gap-2">
                <span className="eyebrow">Step 2 of 2</span>
                <h1 className="display" style={{ fontSize: 'var(--fs-26)' }}>
                  Choose your theme
                </h1>
                <p className="muted text-sm">You can switch any time in settings.</p>
              </div>
              <div className="theme-picker">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`theme-opt ${theme === t.id ? 'active' : ''}`}
                    onClick={() => pickTheme(t.id)}
                  >
                    <div className="swatch">
                      {t.swatch.map((c, i) => (
                        <span key={i} style={{ background: c }} />
                      ))}
                    </div>
                    <div className="row-between">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--fs-14)' }}>{t.name}</div>
                        <div className="text-xs muted">{t.desc}</div>
                      </div>
                      {theme === t.id && (
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            background: 'var(--accent)',
                            color: '#fff',
                            display: 'grid',
                            placeItems: 'center',
                            flex: 'none',
                          }}
                        >
                          <Check size={14} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="row gap-3">
                <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="primary" className="grow" loading={saving} disabled={saving} onClick={create}>
                  Create business
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
