/* ============================================================
   KUDII — Auth
   Email-first, passwordless sign-in. Sign up, verify, recover.
   Calm, premium, warm. No fake email claims.
   ============================================================ */
import { useState } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Wallet,
  Users,
  Layers,
  Check,
  Mail,
} from 'lucide-react'
import { navigate, useRoute } from '../lib/router'
import { store } from '../lib/store'
import { loadDemo } from '../lib/seed'
import { isLiveEmail } from '../lib/email'
import { useToast } from '../lib/hooks'
import { BrandMark } from '../components/shell'
import { Button, Field, Input, ErrorBanner } from '../components/ui'

/* ---------------- Aside (marketing panel) ---------------- */
function AuthAside() {
  return (
    <aside className="auth-aside">
      <button className="brand" onClick={() => navigate('/')} aria-label="KUDII home">
        <BrandMark />
        KUDII
      </button>

      <div className="stack gap-6">
        <p className="auth-quote">
          Know your money.
          <br />
          Feel in control.
        </p>
        <p className="muted" style={{ maxWidth: '34ch' }}>
          A calmer way to run your business. Record what happened, see what is owed, and know what
          needs attention — without spreadsheets or guesswork.
        </p>
        <div className="stack gap-3">
          {[
            { icon: Wallet, t: 'Exact money, always', d: 'Every total is computed from real events.' },
            { icon: Users, t: 'Customers & sales in view', d: 'See who owes what, at a glance.' },
            { icon: Layers, t: 'One account, many businesses', d: 'Keep each business separate.' },
          ].map((f, i) => (
            <div className="row gap-3" key={i}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--tint)',
                  color: 'var(--text)',
                  flex: 'none',
                }}
              >
                <f.icon size={17} strokeWidth={2} />
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--fs-14)' }}>{f.t}</div>
                <div className="text-xs muted">{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="row gap-2 text-xs muted">
        <ShieldCheck size={15} />
        Your data is isolated per business and never sold.
      </div>
    </aside>
  )
}

/* ---------------- Shared shell ---------------- */
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-wrap">
      <AuthAside />
      <div className="auth-main">
        <div className="auth-card rise">{children}</div>
      </div>
    </div>
  )
}

/* ---------------- Code delivery panel ----------------
   Honest about delivery: when no live email provider is wired
   up, we surface the code so the flow can be completed. When a
   real provider is configured, we simply tell the user to check
   their inbox. We never claim an email was sent when it wasn't. */
function CodePanel({ code, email, onUse }: { code?: string; email: string; onUse?: (c: string) => void }) {
  const live = isLiveEmail()
  if (live) {
    return (
      <div className="card card-flat" style={{ background: 'var(--tint)', border: '1px solid var(--border)' }}>
        <div className="row gap-2 text-sm" style={{ alignItems: 'flex-start' }}>
          <Mail size={16} style={{ color: 'var(--text-2)', marginTop: 2, flex: 'none' }} />
          <div>
            <div style={{ fontWeight: 600 }}>Check your email</div>
            <div className="text-xs muted mt-1">
              We sent a secure code to <span className="mono">{email}</span>. It expires in 10 minutes.
            </div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="card card-flat" style={{ background: 'var(--tint)', border: '1px solid var(--border)' }}>
      <div className="row gap-2 text-sm" style={{ alignItems: 'flex-start' }}>
        <Check size={16} style={{ color: 'var(--success)', marginTop: 2, flex: 'none' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>Your code</div>
          <div className="text-xs muted mt-1">
            Email delivery isn’t connected in this build, so your code is shown here. In production it
            arrives by email.
          </div>
          {code && (
            <div className="row-between mt-2" style={{ gap: 8 }}>
              <span className="mono" style={{ fontWeight: 700, letterSpacing: '0.12em' }}>
                {code}
              </span>
              {onUse && (
                <button
                  type="button"
                  className="link text-xs"
                  style={{ color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => onUse(code)}
                >
                  Use this code
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Sign in (email-first, passwordless) ---------------- */
function SignIn() {
  const toast = useToast()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [demoCode, setDemoCode] = useState('')
  const [err, setErr] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setFieldErrors({})
    setLoading(true)
    const res = await store.requestLoginCode(email)
    setLoading(false)
    if (!res.ok) {
      setErr(res.error || '')
      setFieldErrors(res.fieldErrors || {})
      return
    }
    setDemoCode(res.data?.demoCode || '')
    setCode('')
    setStep('code')
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const res = await store.signInWithCode(email, code)
    setLoading(false)
    if (!res.ok) return setErr(res.error || '')
    toast.push('Welcome back')
    navigate(store.activeBusiness() ? '/' : '/onboarding', { replace: true })
  }

  const tryDemo = async () => {
    setDemoLoading(true)
    await loadDemo()
    toast.push('Demo loaded — explore freely')
    navigate('/', { replace: true })
  }

  return (
    <AuthShell>
      <div className="stack gap-2">
        <span className="eyebrow">{step === 'email' ? 'Welcome back' : 'Verify it’s you'}</span>
        <h1 className="display" style={{ fontSize: 'var(--fs-30)' }}>
          {step === 'email' ? 'Sign in to KUDII' : 'Enter your sign-in code'}
        </h1>
        <p className="muted text-sm">
          {step === 'email'
            ? 'Enter your email and we’ll send a secure sign-in code.'
            : 'Enter the code we sent to your email to open your account.'}
        </p>
      </div>

      {step === 'email' ? (
        <form className="stack gap-4 mt-6" onSubmit={requestCode}>
          {err && <ErrorBanner>{err}</ErrorBanner>}
          <Field label="Email" required error={fieldErrors.email}>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              invalid={!!fieldErrors.email}
              autoFocus
            />
          </Field>
          <Button type="submit" variant="primary" block size="lg" loading={loading} disabled={loading}>
            Send sign-in code <ArrowRight size={17} />
          </Button>
        </form>
      ) : (
        <form className="stack gap-4 mt-6" onSubmit={verify}>
          {err && <ErrorBanner>{err}</ErrorBanner>}
          <CodePanel code={demoCode} email={email} onUse={setCode} />
          <Field label="Sign-in code" required>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
          </Field>
          <Button type="submit" variant="primary" block size="lg" loading={loading} disabled={loading}>
            Open my account <ArrowRight size={17} />
          </Button>
          <button
            type="button"
            className="link text-sm row gap-2"
            style={{ color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => {
              setStep('email')
              setErr('')
            }}
          >
            <ArrowLeft size={15} /> Use a different email
          </button>
        </form>
      )}

      <div className="row gap-3 mt-5" style={{ alignItems: 'center' }}>
        <span className="divider" style={{ flex: 1 }} />
        <span className="text-xs muted">or</span>
        <span className="divider" style={{ flex: 1 }} />
      </div>

      <Button
        variant="soft"
        block
        size="lg"
        className="mt-4"
        icon={Sparkles}
        loading={demoLoading}
        disabled={demoLoading}
        onClick={tryDemo}
      >
        Explore the live demo
      </Button>

      <p className="text-sm muted mt-6" style={{ textAlign: 'center' }}>
        New to KUDII?{' '}
        <button
          className="link"
          style={{ color: 'var(--text)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => navigate('/sign-up')}
        >
          Create an account
        </button>
      </p>
    </AuthShell>
  )
}

/* ---------------- Sign up ---------------- */
function SignUp() {
  const toast = useToast()
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [demoCode, setDemoCode] = useState('')
  const [err, setErr] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setFieldErrors({})
    setLoading(true)
    const res = await store.signUp({ name, email, password })
    setLoading(false)
    if (!res.ok) {
      setErr(res.error || '')
      setFieldErrors(res.fieldErrors || {})
      return
    }
    // Account created and session started. Nudge verification, but don't block.
    const v = await store.resendVerification(email)
    if (v.ok) setDemoCode(v.data?.demoCode || '')
    setStep('verify')
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const res = await store.verifyEmail(email, code)
    setLoading(false)
    if (!res.ok) return setErr(res.error || '')
    toast.push('Email verified')
    navigate('/onboarding', { replace: true })
  }

  const skip = () => {
    toast.push('Account created')
    navigate('/onboarding', { replace: true })
  }

  const strength = password.length >= 12 ? 3 : password.length >= 8 ? 2 : password.length > 0 ? 1 : 0

  if (step === 'verify') {
    return (
      <AuthShell>
        <div className="stack gap-2">
          <span className="eyebrow">Almost there</span>
          <h1 className="display" style={{ fontSize: 'var(--fs-30)' }}>
            Verify your email
          </h1>
          <p className="muted text-sm">
            Confirm your email so we can keep your account secure and help you recover it later.
          </p>
        </div>

        <form className="stack gap-4 mt-6" onSubmit={verify}>
          {err && <ErrorBanner>{err}</ErrorBanner>}
          <CodePanel code={demoCode} email={email} onUse={setCode} />
          <Field label="Verification code" required>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
          </Field>
          <Button type="submit" variant="primary" block size="lg" loading={loading} disabled={loading}>
            Verify email <ArrowRight size={17} />
          </Button>
          <Button type="button" variant="ghost" block onClick={skip}>
            Skip for now
          </Button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="stack gap-2">
        <span className="eyebrow">Get started</span>
        <h1 className="display" style={{ fontSize: 'var(--fs-30)' }}>
          Create your account
        </h1>
        <p className="muted text-sm">Start free — ₦0, no card required.</p>
      </div>

      <form className="stack gap-4 mt-6" onSubmit={submit}>
        {err && <ErrorBanner>{err}</ErrorBanner>}
        <Field label="Your name" required error={fieldErrors.name}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Adaeze Okafor"
            invalid={!!fieldErrors.name}
            autoFocus
          />
        </Field>
        <Field label="Email" required error={fieldErrors.email}>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            invalid={!!fieldErrors.email}
          />
        </Field>
        <Field
          label="Password"
          required
          error={fieldErrors.password}
          hint="At least 8 characters. Used to protect your account and for recovery."
        >
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            invalid={!!fieldErrors.password}
          />
        </Field>
        {password.length > 0 && (
          <div className="row gap-2">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 999,
                  background:
                    strength >= n
                      ? n === 1
                        ? 'var(--danger)'
                        : n === 2
                          ? 'var(--warning)'
                          : 'var(--success)'
                      : 'var(--tint)',
                  transition: 'background var(--dur-2)',
                }}
              />
            ))}
          </div>
        )}
        <Button type="submit" variant="primary" block size="lg" loading={loading} disabled={loading}>
          Create account <ArrowRight size={17} />
        </Button>
      </form>

      <p className="text-xs muted mt-4" style={{ textAlign: 'center' }}>
        By continuing you agree to keep your business records honest. We never sell your data.
      </p>

      <p className="text-sm muted mt-6" style={{ textAlign: 'center' }}>
        Already have an account?{' '}
        <button
          className="link"
          style={{ color: 'var(--text)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => navigate('/sign-in')}
        >
          Sign in
        </button>
      </p>
    </AuthShell>
  )
}

/* ---------------- Password reset ---------------- */
function Reset() {
  const toast = useToast()
  const [step, setStep] = useState<'request' | 'confirm'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [demoCode, setDemoCode] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const request = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const res = await store.requestPasswordReset(email)
    setLoading(false)
    if (!res.ok) return setErr(res.error || '')
    setDemoCode(res.data?.demoCode || '')
    setCode('')
    setStep('confirm')
    toast.push('Reset request received')
  }

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const res = await store.resetPassword({ email, code, password })
    setLoading(false)
    if (!res.ok) return setErr(res.error || '')
    toast.push('Password updated — please sign in')
    navigate('/sign-in', { replace: true })
  }

  return (
    <AuthShell>
      <div className="stack gap-2">
        <span className="eyebrow">Password reset</span>
        <h1 className="display" style={{ fontSize: 'var(--fs-30)' }}>
          {step === 'request' ? 'Forgot your password?' : 'Choose a new password'}
        </h1>
        <p className="muted text-sm">
          {step === 'request'
            ? 'Enter your email and we’ll send a reset code.'
            : 'Enter the reset code and set a new password.'}
        </p>
      </div>

      {step === 'request' ? (
        <form className="stack gap-4 mt-6" onSubmit={request}>
          {err && <ErrorBanner>{err}</ErrorBanner>}
          <Field label="Email" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              autoComplete="email"
              autoFocus
            />
          </Field>
          <Button type="submit" variant="primary" block size="lg" loading={loading} disabled={loading}>
            Continue <ArrowRight size={17} />
          </Button>
        </form>
      ) : (
        <form className="stack gap-4 mt-6" onSubmit={confirm}>
          {err && <ErrorBanner>{err}</ErrorBanner>}
          <CodePanel code={demoCode} email={email} onUse={setCode} />
          <Field label="Reset code" required>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your code"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </Field>
          <Field label="New password" required hint="At least 8 characters.">
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
            />
          </Field>
          <Button type="submit" variant="primary" block size="lg" loading={loading} disabled={loading}>
            Update password
          </Button>
        </form>
      )}

      <button
        className="link text-sm mt-6 row gap-2"
        style={{ color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}
        onClick={() => navigate('/sign-in')}
      >
        <ArrowLeft size={15} /> Back to sign in
      </button>
    </AuthShell>
  )
}

/* ---------------- Router ---------------- */
export default function Auth() {
  const { path } = useRoute()
  if (path === '/sign-up') return <SignUp />
  if (path === '/reset') return <Reset />
  return <SignIn />
}
