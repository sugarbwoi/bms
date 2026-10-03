/* ============================================================
   KUDII — App Shell
   Top navigation (glass capsule), mobile bottom nav,
   and the Liquid Glass floating action menu.
   ============================================================ */
import { useEffect, useState, type ReactNode } from 'react'
import {
  LayoutGrid,
  Users,
  Briefcase,
  Wallet,
  Package,
  Activity as ActivityIcon,
  TrendingUp,
  Plus,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  Building2,
  Check,
  FileText,
  UserPlus,
  ShoppingBag,
  Banknote,
  ReceiptText,
  Sparkles,
  MoreHorizontal,
  X,
} from 'lucide-react'
import { useDB, useScrolled, useToast, useIsMobile, useUser, useSettings } from '../lib/hooks'
import { useComposer } from './composer-context'
import { store } from '../lib/store'
import { navigate, useRoute } from '../lib/router'
import { Avatar, Menu, MenuItem, IconButton, Button, Drawer } from './ui'
import { planOf } from '../lib/derive'
import { PLANS } from '../lib/plans'
import type { ComposerName } from './composer-context'

export const PRIMARY_NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/money', label: 'Money', icon: Wallet },
]

export const SECONDARY_NAV = [
  { to: '/products', label: 'Products', icon: Package },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/activity', label: 'Activity', icon: ActivityIcon },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
]

function isActive(path: string, to: string): boolean {
  if (to === '/') return path === '/' || path === ''
  return path === to || path.startsWith(to + '/')
}

/* ---------------- Brand ---------------- */
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path
          d="M7 5v14M7 12l7-7M7 12l7 7"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

/* The K mark doubles as the Light/Dark switch.
   The K sits left in Light and slides right in Dark. */
export function ThemeSwitch() {
  const user = useUser()
  const settings = useSettings(user?.id)
  const biz = store.activeBusiness()
  const theme = settings?.theme || biz?.theme || 'light'
  const isDark = theme === 'dark'

  const toggle = () => {
    if (!user) return
    store.updateSettings(user.id, { theme: isDark ? 'light' : 'dark' })
  }

  return (
    <button
      type="button"
      className={`theme-switch ${isDark ? 'dark' : 'light'}`}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
    >
      <span className="ts-track" aria-hidden>
        <span className="ts-thumb">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 5v14M7 12l7-7M7 12l7 7"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
    </button>
  )
}

/* ---------------- Top Navigation ---------------- */
export function TopNav() {
  const db = useDB()
  const scrolled = useScrolled()
  const { path } = useRoute()
  const composer = useComposer()
  const user = store.currentUser()
  const biz = store.activeBusiness()
  const businesses = store.listBusinesses()
  const plan = biz ? planOf(db, biz.id) : 'go'

  return (
    <nav className={`topnav ${scrolled ? 'scrolled' : ''}`} aria-label="Primary">
      <div className="brand-wrap">
        <ThemeSwitch />
        <button className="brand" onClick={() => navigate('/')} aria-label="KUDII home">
          KUDII
        </button>
      </div>

      <div className="nav-links">
        {PRIMARY_NAV.map((n) => (
          <button
            key={n.to}
            className={`nav-link ${isActive(path, n.to) ? 'active' : ''}`}
            onClick={() => navigate(n.to)}
          >
            <n.icon size={17} strokeWidth={2} />
            {n.label}
          </button>
        ))}
        <Menu
          align="right"
          trigger={({ open, toggle }) => (
            <button className={`nav-link ${open ? 'active' : ''}`} onClick={toggle}>
              <MoreHorizontal size={17} strokeWidth={2} />
              More
              <ChevronDown size={14} strokeWidth={2.4} />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="menu-label">Workspace</div>
              {SECONDARY_NAV.map((n) => (
                <MenuItem
                  key={n.to}
                  icon={n.icon}
                  active={isActive(path, n.to)}
                  onClick={() => {
                    navigate(n.to)
                    close()
                  }}
                >
                  {n.label}
                </MenuItem>
              ))}
              <div className="menu-sep" />
              <MenuItem
                icon={SettingsIcon}
                onClick={() => {
                  navigate('/settings')
                  close()
                }}
              >
                Settings
              </MenuItem>
            </>
          )}
        </Menu>
      </div>

      <div className="nav-actions">
        <Button variant="primary" size="sm" icon={Plus} onClick={() => composer.open('sale')}>
          New sale
        </Button>
        {businesses.length > 1 && (
          <Menu
            trigger={({ toggle }) => (
              <button className="btn btn-soft btn-sm" onClick={toggle} title="Switch business">
                <Building2 size={16} />
                <span className="hide-mobile">{biz?.name}</span>
                <ChevronDown size={14} />
              </button>
            )}
          >
            {(close) => (
              <>
                <div className="menu-label">Businesses</div>
                {businesses.map((b) => (
                  <MenuItem
                    key={b.id}
                    icon={b.id === biz?.id ? Check : Building2}
                    active={b.id === biz?.id}
                    onClick={() => {
                      store.switchBusiness(b.id)
                      close()
                    }}
                  >
                    {b.name}
                  </MenuItem>
                ))}
                <div className="menu-sep" />
                <MenuItem
                  icon={Plus}
                  onClick={() => {
                    composer.open('business')
                    close()
                  }}
                >
                  Business settings
                </MenuItem>
              </>
            )}
          </Menu>
        )}
        <Menu
          trigger={({ toggle }) => (
            <button
              onClick={toggle}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              aria-label="Account menu"
            >
              <Avatar name={user?.name || '?'} size="sm" />
            </button>
          )}
        >
          {(close) => (
            <>
              <div style={{ padding: '10px 12px 6px' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--fs-14)' }}>{user?.name}</div>
                <div className="text-xs muted">{user?.email}</div>
                <div className="mt-2">
                  <span className="badge badge-info" style={{ fontSize: 10 }}>
                    {PLANS[plan].name}
                  </span>
                </div>
              </div>
              <div className="menu-sep" />
              <MenuItem
                icon={Building2}
                onClick={() => {
                  navigate('/settings')
                  close()
                }}
              >
                Business & settings
              </MenuItem>
              <MenuItem
                icon={TrendingUp}
                onClick={() => {
                  navigate('/settings?tab=plan')
                  close()
                }}
              >
                Plan & usage
              </MenuItem>
              <div className="menu-sep" />
              <MenuItem
                icon={LogOut}
                danger
                onClick={() => {
                  store.signOut()
                  navigate('/')
                  close()
                }}
              >
                Sign out
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </nav>
  )
}

/* ---------------- Bottom nav (mobile) ---------------- */
export function BottomNav() {
  const { path } = useRoute()
  const [moreOpen, setMoreOpen] = useState(false)
  const composer = useComposer()

  const items = [
    PRIMARY_NAV[0],
    PRIMARY_NAV[1],
    PRIMARY_NAV[2],
    PRIMARY_NAV[3],
  ]

  return (
    <>
      <nav className="bottom-nav" aria-label="Primary mobile">
        {items.map((n) => (
          <button
            key={n.to}
            className={`bn-item ${isActive(path, n.to) ? 'active' : ''}`}
            onClick={() => navigate(n.to)}
          >
            <n.icon size={20} strokeWidth={2} />
            {n.label}
          </button>
        ))}
        <button className={`bn-item ${moreOpen ? 'active' : ''}`} onClick={() => setMoreOpen(true)}>
          <MoreHorizontal size={20} strokeWidth={2} />
          More
        </button>
      </nav>

      <Drawer open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="mnav-list">
          {SECONDARY_NAV.map((n) => (
            <button
              key={n.to}
              className={`mnav-item ${isActive(path, n.to) ? 'active' : ''}`}
              onClick={() => {
                navigate(n.to)
                setMoreOpen(false)
              }}
            >
              <n.icon size={19} strokeWidth={2} />
              {n.label}
            </button>
          ))}
          <button
            className={`mnav-item ${isActive(path, '/settings') ? 'active' : ''}`}
            onClick={() => {
              navigate('/settings')
              setMoreOpen(false)
            }}
          >
            <SettingsIcon size={19} strokeWidth={2} />
            Settings
          </button>
          <div className="divider" style={{ margin: 'var(--s-3) 0' }} />
          <button
            className="mnav-item"
            onClick={() => {
              composer.open('payment')
              setMoreOpen(false)
            }}
          >
            <Banknote size={19} strokeWidth={2} />
            Record payment
          </button>
          <button
            className="mnav-item"
            onClick={() => {
              composer.open('invoice')
              setMoreOpen(false)
            }}
          >
            <FileText size={19} strokeWidth={2} />
            New invoice
          </button>
          <div className="divider" style={{ margin: 'var(--s-3) 0' }} />
          <button
            className="mnav-item"
            style={{ color: 'var(--danger)' }}
            onClick={() => {
              store.signOut()
              navigate('/')
              setMoreOpen(false)
            }}
          >
            <LogOut size={19} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </Drawer>
    </>
  )
}

/* ---------------- Floating Action Menu ---------------- */
interface FabAction {
  name: ComposerName
  label: string
  icon: any
}

const FAB_ACTIONS: FabAction[] = [
  { name: 'customer', label: 'New customer', icon: UserPlus },
  { name: 'sale', label: 'New sale', icon: ShoppingBag },
  { name: 'job', label: 'New job', icon: Briefcase },
  { name: 'product', label: 'Add product', icon: Package },
  { name: 'income', label: 'Record income', icon: Banknote },
  { name: 'expense', label: 'Record expense', icon: ReceiptText },
]

export function FloatingActionMenu() {
  const [open, setOpen] = useState(false)
  const composer = useComposer()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {open && <div className="fab-scrim" onClick={() => setOpen(false)} />}
      <div className="fab-wrap">
        {open && (
          <div className="fab-menu" role="menu">
            {FAB_ACTIONS.map((a, i) => (
              <button
                key={a.name}
                className="fab-item"
                style={{ animationDelay: `${i * 34}ms` }}
                onClick={() => {
                  setOpen(false)
                  composer.open(a.name)
                }}
              >
                <span className="fi-ic">
                  <a.icon size={15} strokeWidth={2.2} />
                </span>
                {a.label}
              </button>
            ))}
          </div>
        )}
        <button
          className={`fab ${open ? 'open' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close quick actions' : 'Open quick actions'}
          aria-expanded={open}
        >
          {open ? <X size={24} strokeWidth={2.2} /> : <Plus size={26} strokeWidth={2.2} />}
        </button>
      </div>
    </>
  )
}

/* ---------------- App Shell wrapper ---------------- */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <TopNav />
      <main className="app-main">{children}</main>
      <BottomNav />
      <FloatingActionMenu />
    </div>
  )
}

/* ---------------- Small shared bits ---------------- */
export function PageHead({
  title,
  sub,
  actions,
}: {
  title: string
  sub?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export { Sparkles, IconButton }
