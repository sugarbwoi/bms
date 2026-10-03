/* ============================================================
   KUDII — Root router
   Decides between the public marketing site and the signed-in
   application, applies the active theme, and routes pages.
   ============================================================ */
import { Suspense, lazy, useEffect } from 'react'
import { useDB, useApplyTheme } from './lib/hooks'
import { useRoute, navigate } from './lib/router'
import { store } from './lib/store'
import { AppShell } from './components/shell'
import { Skeleton } from './components/ui'

/* ---- code-split pages ---- */
const Marketing = lazy(() => import('./pages/marketing'))
const Auth = lazy(() => import('./pages/auth'))
const Onboarding = lazy(() => import('./pages/onboarding'))
const Dashboard = lazy(() => import('./pages/dashboard'))
const Customers = lazy(() => import('./pages/customers'))
const Products = lazy(() => import('./pages/products'))
const Sales = lazy(() => import('./pages/sales'))
const Jobs = lazy(() => import('./pages/jobs'))
const Money = lazy(() => import('./pages/money'))
const Invoices = lazy(() => import('./pages/invoices'))
const Activity = lazy(() => import('./pages/activity'))
const Progress = lazy(() => import('./pages/progress'))
const Settings = lazy(() => import('./pages/settings'))

const MARKETING_ROUTES = new Set([
  '/',
  '/how-it-works',
  '/pricing',
  '/security',
  '/faq',
  '/get-started',
])

const AUTH_ROUTES = new Set(['/sign-in', '/sign-up', '/reset'])

function Loading() {
  return (
    <div className="container" style={{ paddingTop: 'var(--s-9)' }}>
      <div className="stack gap-4">
        <Skeleton h={28} w={220} />
        <Skeleton h={120} r={18} />
        <div className="grid-2">
          <Skeleton h={160} r={18} />
          <Skeleton h={160} r={18} />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const db = useDB()
  const { path } = useRoute()
  const user = store.currentUser()
  const biz = store.activeBusiness()

  const settings = user ? store.getSettings(user.id) : null
  useApplyTheme(settings?.theme || biz?.theme || 'light', settings?.reduce_effects)

  /* Guard: send signed-in users away from auth/marketing entry points,
     and send signed-out users to sign-in when they hit the app. */
  useEffect(() => {
    const isMarketing = MARKETING_ROUTES.has(path)
    const isAuth = AUTH_ROUTES.has(path)

    if (!user) {
      if (!isMarketing && !isAuth) navigate('/sign-in', { replace: true })
      return
    }
    // signed in
    if (isAuth) {
      navigate(biz ? '/' : '/onboarding', { replace: true })
    }
    if (isMarketing && path !== '/') {
      // allow marketing browsing while signed in, but '/' shows the app
    }
  }, [user, biz, path])

  /* -------- signed out -------- */
  if (!user) {
    if (MARKETING_ROUTES.has(path)) {
      return (
        <Suspense fallback={<Loading />}>
          <Marketing />
        </Suspense>
      )
    }
    return (
      <Suspense fallback={<Loading />}>
        <Auth />
      </Suspense>
    )
  }

  /* -------- signed in, no business yet -------- */
  if (!biz) {
    return (
      <Suspense fallback={<Loading />}>
        <Onboarding />
      </Suspense>
    )
  }

  /* -------- signed in + business -------- */
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <AppRoutes />
      </Suspense>
    </AppShell>
  )
}

function AppRoutes() {
  const { path, segments } = useRoute()
  const root = segments[0] || ''

  switch (root) {
    case '':
      return <Dashboard />
    case 'customers':
      return <Customers id={segments[1]} />
    case 'products':
      return <Products id={segments[1]} />
    case 'sales':
      return <Sales id={segments[1]} />
    case 'jobs':
      return <Jobs id={segments[1]} />
    case 'money':
      return <Money />
    case 'invoices':
      return <Invoices id={segments[1]} />
    case 'activity':
      return <Activity />
    case 'progress':
      return <Progress />
    case 'settings':
      return <Settings />
    case 'onboarding':
      navigate('/', { replace: true })
      return <Dashboard />
    default:
      return <NotFound path={path} />
  }
}

function NotFound({ path }: { path: string }) {
  return (
    <div className="empty" style={{ paddingTop: 'var(--s-9)' }}>
      <h1 className="display" style={{ fontSize: 'var(--fs-40)' }}>
        Page not found
      </h1>
      <p className="muted mt-2">
        We couldn't find <span className="mono">{path}</span>.
      </p>
      <button className="btn btn-primary mt-5" onClick={() => navigate('/')}>
        Back to overview
      </button>
    </div>
  )
}
