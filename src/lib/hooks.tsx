/* ============================================================
   KUDII — App hooks & providers
   ============================================================ */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { store } from './store'
import type { Business, DB, User, UserSettings, ThemeName } from './types'

/* ---------------- store subscription ---------------- */
export function useStore() {
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return store
}
export function useDB(): DB {
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return store.db
}
export function useUser(): User | null {
  useDB()
  return store.currentUser()
}
export function useBusiness(): Business | null {
  useDB()
  return store.activeBusiness()
}
export function useSettings(userId?: string | null): UserSettings | null {
  useDB()
  if (!userId) return null
  return store.getSettings(userId)
}

/* ---------------- theme ---------------- */
export function useApplyTheme(theme: ThemeName | undefined | null, reduceEffects?: boolean) {
  useEffect(() => {
    const t: ThemeName = theme === 'dark' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', t)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', t === 'dark' ? '#000000' : '#ffffff')
  }, [theme])
  useEffect(() => {
    document.body.classList.toggle('reduce-effects', !!reduceEffects)
  }, [reduceEffects])
}

/* ---------------- media query ---------------- */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatches(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return matches
}
export const useIsMobile = () => useMediaQuery('(max-width: 760px)')

/* ---------------- scroll position ---------------- */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [threshold])
  return scrolled
}

/* ---------------- toast ---------------- */
export type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}
interface ToastCtx {
  push: (message: string, kind?: ToastKind) => void
}
const ToastContext = createContext<ToastCtx>({ push: () => {} })
export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const push = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span className="ic" aria-hidden>
              {t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'i'}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/* ---------------- confirm dialog ---------------- */
interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
  requireReason?: boolean
}
interface ConfirmState extends ConfirmOptions {
  resolve: (v: { confirmed: boolean; reason?: string }) => void
}
const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<{ confirmed: boolean; reason?: string }>>(
  async () => ({ confirmed: false }),
)
export function useConfirm() {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)
  const [reason, setReason] = useState('')
  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<{ confirmed: boolean; reason?: string }>((resolve) => {
        setReason('')
        setState({ ...o, resolve })
      }),
    [],
  )
  const close = (confirmed: boolean) => {
    state?.resolve({ confirmed, reason: confirmed ? reason.trim() : undefined })
    setState(null)
  }
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="overlay" onClick={() => close(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-head">
              <h2>{state.title}</h2>
            </div>
            <div className="modal-body">
              {state.message && <p className="muted">{state.message}</p>}
              {state.requireReason && (
                <div className="field mt-4">
                  <label className="label">
                    Reason<span className="req">*</span>
                  </label>
                  <textarea
                    className="textarea"
                    placeholder="Tell us why (this is kept for your records)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => close(false)}>
                Cancel
              </button>
              <button
                className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => close(true)}
                disabled={state.requireReason && reason.trim().length < 3}
              >
                {state.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
