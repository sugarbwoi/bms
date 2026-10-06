/* ============================================================
   KUDIIBot — Business Entry Briefing
   A chief-of-staff greeting on entry. States where the business
   stands and the few things worth doing. Exit closes the briefing
   — it is never a sign-out.
   ============================================================ */
import { useEffect, useMemo } from 'react'
import { X, ArrowRight, Sparkles, LogOut } from 'lucide-react'
import { store } from '../../lib/store'
import { useDB } from '../../lib/hooks'
import { navigate } from '../../lib/router'
import { useComposer } from '../composer-context'
import { useKudiiBot } from './KudiiBotProvider'
import { buildBriefing, SOURCE_LABEL } from '../../lib/kudiibot'
import type { Insight } from '../../lib/kudiibot'

export function Briefing({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDB()
  const user = store.currentUser()
  const biz = store.activeBusiness()
  const composer = useComposer()
  const { openBot } = useKudiiBot()

  const briefing = useMemo(() => (biz ? buildBriefing(db, biz, user?.name) : null), [db, biz, user?.name])

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

  if (!open || !briefing || !biz) return null

  const runAction = (a: Insight['action']) => {
    if (!a) return
    onClose()
    if (a.kind === 'navigate' && a.to) navigate(a.to)
    else if (a.kind === 'composer' && a.composer) composer.open(a.composer as any, a.params as any)
  }

  return (
    <div className="kb-brief-overlay" onClick={onClose}>
      <div className="kb-brief" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Business briefing">
        <header className="kb-brief-head">
          <div className="kb-brief-brand">
            <span className="kb-mark" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 3.4l1.9 5.3 5.3 1.9-5.3 1.9L12 17.8l-1.9-5.3L4.8 10.6l5.3-1.9L12 3.4z" fill="currentColor" />
              </svg>
            </span>
            <span>{biz.name}</span>
          </div>
          <button className="kb-x" onClick={onClose} aria-label="Close briefing">
            <X size={17} />
          </button>
        </header>

        <div className="kb-brief-body">
          <p className="kb-brief-greeting">{briefing.greeting}</p>
          <h2 className="kb-brief-headline">{briefing.headline}</h2>

          {briefing.lines.length > 0 && (
            <div className="kb-brief-lines">
              {briefing.lines.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
            </div>
          )}

          <div className="kb-brief-metrics">
            {briefing.metrics.map((m) => (
              <div key={m.label} className={`kb-metric tone-${m.tone || 'neutral'}`}>
                <span className="kb-metric-label">{m.label}</span>
                <span className="kb-metric-value num">{m.value}</span>
              </div>
            ))}
          </div>

          {briefing.quiet ? (
            <div className="kb-brief-quiet">
              <Sparkles size={16} strokeWidth={2} />
              <span>Nothing needs you right now. Enjoy the calm.</span>
            </div>
          ) : (
            <div className="kb-brief-priorities">
              <div className="kb-section-label">
                <Sparkles size={13} strokeWidth={2.2} /> Do these today
              </div>
              <ul>
                {briefing.priorities.map((p) => (
                  <li key={p.id} className={`kb-brief-item tone-${p.tone}`}>
                    <div className="kb-brief-item-main">
                      <span className="kb-brief-item-title">{p.title}</span>
                      <span className={`kb-src kb-src-${p.source}`}>{SOURCE_LABEL[p.source]}</span>
                    </div>
                    <p className="kb-brief-item-detail">{p.detail}</p>
                    {p.action && (
                      <button className="kb-insight-action" onClick={() => runAction(p.action)}>
                        {p.action.label} <ArrowRight size={13} strokeWidth={2.2} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="kb-brief-foot">
          <button
            className="kb-brief-ask"
            onClick={() => {
              onClose()
              openBot()
            }}
          >
            <Sparkles size={14} strokeWidth={2.2} /> Tell KUDII something
          </button>
          <button className="kb-brief-exit" onClick={onClose}>
            <LogOut size={14} strokeWidth={2.2} /> Exit
          </button>
        </footer>
      </div>
    </div>
  )
}
