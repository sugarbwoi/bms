/* ============================================================
   KUDIIBot — the panel
   Small, persistent, dismissible. Not a giant chat window:
   a control surface that reads the business and offers the few
   things worth doing now.
   ============================================================ */
import { useEffect } from 'react'
import { X, ArrowRight, Sparkles, UserPlus, ShoppingBag, Package, Banknote, ReceiptText, Compass } from 'lucide-react'
import { navigate } from '../../lib/router'
import { useComposer } from '../composer-context'
import { useKudiiBot } from './KudiiBotProvider'
import { SOURCE_LABEL } from '../../lib/kudiibot'
import type { Insight } from '../../lib/kudiibot'
import { QuickCapture } from './QuickCapture'

const QUICK_ACTIONS = [
  { name: 'sale', label: 'New sale', icon: ShoppingBag },
  { name: 'customer', label: 'New customer', icon: UserPlus },
  { name: 'product', label: 'Add product', icon: Package },
  { name: 'income', label: 'Income', icon: Banknote },
  { name: 'expense', label: 'Expense', icon: ReceiptText },
] as const

export function KudiiBotPanel({
  open,
  onClose,
  insights,
}: {
  open: boolean
  onClose: () => void
  insights: Insight[]
}) {
  const composer = useComposer()
  const { showBriefing } = useKudiiBot()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const runAction = (a: Insight['action']) => {
    if (!a) return
    if (a.kind === 'navigate' && a.to) {
      navigate(a.to)
      onClose()
    } else if (a.kind === 'composer' && a.composer) {
      composer.open(a.composer as any, a.params as any)
      onClose()
    }
  }

  const top = insights.slice(0, 5)

  return (
    <>
      {open && <div className="kb-scrim" onClick={onClose} />}
      <aside className={`kb-panel ${open ? 'open' : ''}`} role="dialog" aria-modal="false" aria-label="KUDIIBot">
        <header className="kb-panel-head">
          <div className="kb-panel-title">
            <span className="kb-mark" aria-hidden>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 3.4l1.9 5.3 5.3 1.9-5.3 1.9L12 17.8l-1.9-5.3L4.8 10.6l5.3-1.9L12 3.4z" fill="currentColor" />
              </svg>
            </span>
            <div>
              <strong>KUDIIBot</strong>
              <span className="kb-panel-sub">Your business, read for you</span>
            </div>
          </div>
          <button className="kb-x" onClick={onClose} aria-label="Close KUDIIBot">
            <X size={16} />
          </button>
        </header>

        <div className="kb-panel-body">
          <QuickCapture />

          <div className="kb-section-label">
            <Sparkles size={13} strokeWidth={2.2} /> Worth your attention
          </div>

          {top.length === 0 ? (
            <div className="kb-quiet">
              <Compass size={20} strokeWidth={1.7} />
              <p>Everything looks steady. KUDII will speak up the moment something needs you.</p>
            </div>
          ) : (
            <ul className="kb-insights">
              {top.map((i) => (
                <li key={i.id} className={`kb-insight tone-${i.tone}`}>
                  <div className="kb-insight-top">
                    <span className="kb-insight-title">{i.title}</span>
                    <span className={`kb-src kb-src-${i.source}`}>{SOURCE_LABEL[i.source]}</span>
                  </div>
                  <p className="kb-insight-detail">{i.detail}</p>
                  {i.action && (
                    <button className="kb-insight-action" onClick={() => runAction(i.action)}>
                      {i.action.label} <ArrowRight size={13} strokeWidth={2.2} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="kb-section-label">Quick actions</div>
          <div className="kb-actions">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.name}
                className="kb-action"
                onClick={() => {
                  composer.open(a.name as any)
                  onClose()
                }}
              >
                <a.icon size={15} strokeWidth={2} />
                {a.label}
              </button>
            ))}
          </div>

          <button
            className="kb-brief-again"
            onClick={() => {
              onClose()
              showBriefing()
            }}
          >
            <Sparkles size={14} strokeWidth={2.2} /> Brief me on the business
          </button>
        </div>
      </aside>
    </>
  )
}
