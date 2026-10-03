/* ============================================================
   KUDII — UI Primitives
   ============================================================ */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { X, Search, ChevronDown, AlertCircle, Check } from 'lucide-react'
import { formatMoney } from '../lib/utils'
import type { Minor } from '../lib/types'

/* ---------------- Surface ---------------- */
export function GlassSurface({
  children,
  className = '',
  strong,
  as: Tag = 'div',
  ...rest
}: {
  children?: ReactNode
  className?: string
  strong?: boolean
  as?: any
} & Record<string, any>) {
  return (
    <Tag className={`${strong ? 'glass glass-strong' : 'glass'} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

/* ---------------- Button ---------------- */
type BtnVariant = 'default' | 'primary' | 'accent' | 'soft' | 'ghost' | 'danger'
export function Button({
  children,
  variant = 'default',
  size,
  block,
  icon: Icon,
  loading,
  className = '',
  ...rest
}: {
  children?: ReactNode
  variant?: BtnVariant
  size?: 'sm' | 'lg'
  block?: boolean
  icon?: any
  loading?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = [
    'btn',
    variant !== 'default' ? `btn-${variant}` : '',
    size ? `btn-${size}` : '',
    block ? 'btn-block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button className={cls} {...rest}>
      {loading ? <span className="spin" aria-hidden>◌</span> : Icon ? <Icon size={17} strokeWidth={2} /> : null}
      {children}
    </button>
  )
}

export function IconButton({
  icon: Icon,
  label,
  size,
  variant = 'default',
  className = '',
  ...rest
}: {
  icon: any
  label: string
  size?: 'sm'
  variant?: BtnVariant
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`btn btn-icon ${size === 'sm' ? 'btn-sm' : ''} ${variant !== 'default' ? `btn-${variant}` : ''} ${className}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon size={size === 'sm' ? 16 : 18} strokeWidth={2} />
    </button>
  )
}

/* ---------------- Fields ---------------- */
export function Field({
  label,
  required,
  error,
  hint,
  children,
  htmlFor,
}: {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div className="field">
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="field-error">
          <AlertCircle size={13} /> {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  )
}

export function Input({ invalid, className = '', ...rest }: { invalid?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${invalid ? 'invalid' : ''} ${className}`} {...rest} />
}
export function Textarea({ invalid, className = '', ...rest }: { invalid?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`textarea ${invalid ? 'invalid' : ''} ${className}`} {...rest} />
}
export function Select({ invalid, className = '', children, ...rest }: { invalid?: boolean } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`select ${invalid ? 'invalid' : ''} ${className}`} {...rest}>
      {children}
    </select>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={`search ${className}`}>
      <Search size={17} className="search-ic" />
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted text-sm mt-1">{subtitle}</p>}
          </div>
          <IconButton icon={X} label="Close" variant="ghost" size="sm" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------------- Drawer ---------------- */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2>{title}</h2>
          <IconButton icon={X} label="Close" variant="ghost" size="sm" onClick={onClose} />
        </div>
        <div className="modal-body" style={{ paddingTop: 'var(--s-5)', flex: 1 }}>
          {children}
        </div>
        {footer && <div className="modal-foot">{footer}</div>}
      </aside>
    </>
  )
}

/* ---------------- Badge / Status ---------------- */
export function Badge({
  children,
  tone = 'neutral',
  dot,
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'solid'
  dot?: boolean
}) {
  return (
    <span className={`badge ${tone !== 'neutral' ? `badge-${tone}` : ''}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: any; label: string }> = {
    pending: { tone: 'warning', label: 'Pending' },
    in_progress: { tone: 'info', label: 'In progress' },
    completed: { tone: 'success', label: 'Completed' },
    cancelled: { tone: 'neutral', label: 'Cancelled' },
    open: { tone: 'info', label: 'Open' },
    paid: { tone: 'success', label: 'Paid' },
    partial: { tone: 'warning', label: 'Partially paid' },
    partially_paid: { tone: 'warning', label: 'Partially paid' },
    unpaid: { tone: 'danger', label: 'Unpaid' },
    overpaid: { tone: 'info', label: 'Overpaid' },
    issued: { tone: 'info', label: 'Issued' },
    draft: { tone: 'neutral', label: 'Draft' },
    overdue: { tone: 'danger', label: 'Overdue' },
    active: { tone: 'success', label: 'Active' },
    archived: { tone: 'neutral', label: 'Archived' },
    posted: { tone: 'success', label: 'Posted' },
    refunded: { tone: 'danger', label: 'Refunded' },
    partially_refunded: { tone: 'warning', label: 'Partially refunded' },
    reversed: { tone: 'neutral', label: 'Reversed' },
  }
  const s = map[status] || { tone: 'neutral', label: status }
  return <Badge tone={s.tone} dot>{s.label}</Badge>
}

/* ---------------- Avatar ---------------- */
export function Avatar({ name, size = 'md', src }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; src?: string | null }) {
  const inits = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <span className={`avatar avatar-${size}`} aria-hidden>
      {src ? <img src={src} alt="" /> : inits}
    </span>
  )
}

/* ---------------- Empty / Error / Skeleton ---------------- */
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: any
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-ic">
        <Icon size={26} strokeWidth={1.7} />
      </div>
      <h3>{title}</h3>
      <p className="muted">{message}</p>
      {action && <div className="mt-4 empty-action">{action}</div>}
    </div>
  )
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div className="error-banner" role="alert">
      <AlertCircle size={18} style={{ flex: 'none', marginTop: 1 }} />
      <span>{children}</span>
    </div>
  )
}

export function Skeleton({ h = 16, w = '100%', r }: { h?: number; w?: number | string; r?: number }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />
}

/* ---------------- Segmented / Tabs ---------------- */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: NoInfer<T>) => void
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: NoInfer<T>) => void
}) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Progress ---------------- */
export function ProgressBar({ value, thin }: { value: number; thin?: boolean }) {
  return (
    <div className={`bar ${thin ? 'thin' : ''}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

/* ---------------- Stat ---------------- */
export function Stat({
  label,
  value,
  icon,
  delta,
  deltaLabel,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  delta?: number
  deltaLabel?: string
}) {
  return (
    <div className="stat">
      <span className="stat-label">
        {icon}
        {label}
      </span>
      <span className="stat-value">{value}</span>
      {delta != null && (
        <span className="stat-delta" style={{ color: delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% {deltaLabel || ''}
        </span>
      )}
    </div>
  )
}

/* ---------------- Money ---------------- */
export function Money({ value, currency, className = '', short }: { value: Minor; currency: string; className?: string; short?: boolean }) {
  return <span className={`num ${className}`}>{formatMoney(value, currency, { compact: short })}</span>
}

/* ---------------- Dropdown menu ---------------- */
export function Menu({
  trigger,
  children,
  align = 'right',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && <div className={`menu ${align === 'left' ? 'left' : ''}`}>{children(() => setOpen(false))}</div>}
    </div>
  )
}

export function MenuItem({
  icon: Icon,
  children,
  onClick,
  active,
  danger,
}: {
  icon?: any
  children: ReactNode
  onClick?: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <button className={`menu-item ${active ? 'active' : ''}`} onClick={onClick} style={danger ? { color: 'var(--danger)' } : undefined}>
      {Icon && <Icon size={16} strokeWidth={2} />}
      {children}
    </button>
  )
}

/* ---------------- Section card ---------------- */
export function SectionCard({
  title,
  action,
  children,
  className = '',
  padded = true,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section className={`card ${className}`} style={padded ? undefined : { padding: 0, overflow: 'hidden' }}>
      {title && (
        <div className="section-head" style={padded ? undefined : { padding: 'var(--s-5) var(--s-6) 0' }}>
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/* ---------------- Key-value ---------------- */
export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  )
}

/* ---------------- Toggle ---------------- */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      className={`toggle ${on ? 'on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    />
  )
}

/* ---------------- Copy helper ---------------- */
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      size="sm"
      variant="ghost"
      icon={done ? Check : undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1600)
        } catch {
          /* ignore */
        }
      }}
    >
      {done ? 'Copied' : label}
    </Button>
  )
}

export { ChevronDown }
