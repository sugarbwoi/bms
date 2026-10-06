/* ============================================================
   KUDIIBot — Provider + control layer
   Owns the ✦ control, the bot panel, the entry briefing and
   contextual popups. Session-aware: the briefing greets once per
   session, and never repeats on navigation.
   ============================================================ */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { store } from '../../lib/store'
import { useDB } from '../../lib/hooks'
import { useRoute } from '../../lib/router'
import { buildInsights, attentionCount } from '../../lib/kudiibot'
import type { Insight, InsightAction, InsightSource, InsightTone } from '../../lib/kudiibot'
import { KudiiBotPanel } from './KudiiBot'
import { Briefing } from './Briefing'
import { ContextPopup } from './ContextPopup'

export interface KudiiPopup {
  id: string
  title: string
  detail: string
  tone?: InsightTone
  source?: InsightSource
  action?: InsightAction
}

interface Ctx {
  open: boolean
  openBot: () => void
  closeBot: () => void
  toggleBot: () => void
  showBriefing: () => void
  pushPopup: (p: Omit<KudiiPopup, 'id'>) => void
}

const BotCtx = createContext<Ctx>({
  open: false,
  openBot: () => {},
  closeBot: () => {},
  toggleBot: () => {},
  showBriefing: () => {},
  pushPopup: () => {},
})
export const useKudiiBot = () => useContext(BotCtx)

const APP_EXCLUDE = new Set([
  '/sign-in',
  '/sign-up',
  '/reset',
  '/onboarding',
  '/how-it-works',
  '/pricing',
  '/security',
  '/faq',
  '/get-started',
])

export function KudiiBotProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [briefingOpen, setBriefingOpen] = useState(false)
  const [popups, setPopups] = useState<KudiiPopup[]>([])

  const openBot = useCallback(() => setOpen(true), [])
  const closeBot = useCallback(() => setOpen(false), [])
  const toggleBot = useCallback(() => setOpen((o) => !o), [])
  const showBriefing = useCallback(() => setBriefingOpen(true), [])

  const pushPopup = useCallback((p: Omit<KudiiPopup, 'id'>) => {
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    setPopups((list) => [...list, { ...p, id }])
  }, [])

  const dismissPopup = useCallback((id: string) => setPopups((list) => list.filter((p) => p.id !== id)), [])

  const value = useMemo(
    () => ({ open, openBot, closeBot, toggleBot, showBriefing, pushPopup }),
    [open, openBot, closeBot, toggleBot, showBriefing, pushPopup],
  )

  return (
    <BotCtx.Provider value={value}>
      {children}
      <KudiiBotLayer
        open={open}
        onOpen={openBot}
        onClose={closeBot}
        briefingOpen={briefingOpen}
        setBriefingOpen={setBriefingOpen}
        popups={popups}
        pushPopup={pushPopup}
        dismissPopup={dismissPopup}
      />
    </BotCtx.Provider>
  )
}

/* ---------------- the visible layer ---------------- */
function KudiiBotLayer({
  open,
  onOpen,
  onClose,
  briefingOpen,
  setBriefingOpen,
  popups,
  pushPopup,
  dismissPopup,
}: {
  open: boolean
  onOpen: () => void
  onClose: () => void
  briefingOpen: boolean
  setBriefingOpen: (v: boolean) => void
  popups: KudiiPopup[]
  pushPopup: (p: Omit<KudiiPopup, 'id'>) => void
  dismissPopup: (id: string) => void
}) {
  const db = useDB()
  const { path } = useRoute()
  const user = store.currentUser()
  const biz = store.activeBusiness()
  const nudgedRef = useRef(false)

  const insights = useMemo<Insight[]>(() => (biz ? buildInsights(db, biz) : []), [db, biz])
  const attention = attentionCount(insights)

  const visible = !!user && !!biz && !APP_EXCLUDE.has(path)

  /* Entry briefing — once per session, per business. */
  useEffect(() => {
    if (!visible || !user || !biz) return
    const key = `kudii.kb.briefed.${user.id}.${biz.id}`
    let already = false
    try {
      already = !!sessionStorage.getItem(key)
    } catch {
      already = false
    }
    if (!already) {
      const t = setTimeout(() => setBriefingOpen(true), 650)
      return () => clearTimeout(t)
    }
  }, [visible, user, biz, setBriefingOpen])

  const markBriefed = useCallback(() => {
    if (user && biz) {
      try {
        sessionStorage.setItem(`kudii.kb.briefed.${user.id}.${biz.id}`, '1')
      } catch {
        /* ignore */
      }
    }
    setBriefingOpen(false)
  }, [user, biz, setBriefingOpen])

  /* A single, non-intrusive nudge after the briefing — only if something is truly urgent. */
  useEffect(() => {
    if (!visible || briefingOpen || nudgedRef.current) return
    if (!user || !biz) return
    const key = `kudii.kb.nudged.${user.id}.${biz.id}`
    try {
      if (sessionStorage.getItem(key)) return
    } catch {
      /* ignore */
    }
    const critical = insights.find((i) => i.tone === 'critical')
    if (!critical) return
    nudgedRef.current = true
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(key, '1')
      } catch {
        /* ignore */
      }
      pushPopup({
        title: critical.title,
        detail: critical.detail,
        tone: critical.tone,
        source: critical.source,
        action: critical.action,
      })
    }, 4200)
    return () => clearTimeout(t)
  }, [visible, briefingOpen, insights, user, biz, pushPopup])

  if (!visible) return null

  return (
    <>
      {/* ✦ control */}
      <button
        className={`kb-fab ${open ? 'open' : ''}`}
        onClick={onOpen}
        aria-label="Open KUDIIBot"
        aria-expanded={open}
      >
        <span className="kb-fab-mark" aria-hidden>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3.4l1.9 5.3 5.3 1.9-5.3 1.9L12 17.8l-1.9-5.3L4.8 10.6l5.3-1.9L12 3.4z"
              fill="currentColor"
            />
          </svg>
        </span>
        {attention > 0 && <span className="kb-fab-badge">{attention}</span>}
      </button>

      <KudiiBotPanel open={open} onClose={onClose} insights={insights} />

      <Briefing open={briefingOpen} onClose={markBriefed} />

      <div className="kb-popups" aria-live="polite">
        {!open &&
          popups.map((p) => (
            <ContextPopup key={p.id} popup={p} onClose={() => dismissPopup(p.id)} />
          ))}
      </div>
    </>
  )
}
