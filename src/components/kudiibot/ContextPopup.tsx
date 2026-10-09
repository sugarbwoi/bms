/* ============================================================
   KUDIIBot — Contextual popup
   Small, Liquid Glass, dismissible, non-intrusive. Appears when
   something genuinely needs the owner, then gets out of the way.
   ============================================================ */
import { useEffect } from 'react'
import { X, ArrowRight } from 'lucide-react'
import { navigate } from '../../lib/router'
import { useComposer } from '../composer-context'
import { SOURCE_LABEL } from '../../lib/kudiibot'
import type { KudiiPopup } from './KudiiBotProvider'

export function ContextPopup({ popup, onClose }: { popup: KudiiPopup; onClose: () => void }) {
  const composer = useComposer()

  useEffect(() => {
    const t = setTimeout(onClose, 14000)
    return () => clearTimeout(t)
  }, [onClose])

  const runAction = () => {
    const a = popup.action
    if (!a) return
    onClose()
    if (a.kind === 'navigate' && a.to) navigate(a.to)
    else if (a.kind === 'composer' && a.composer) composer.open(a.composer as any, a.params as any)
  }

  return (
    <div className={`kb-popup tone-${popup.tone || 'neutral'}`} role="status">
      <button className="kb-x" onClick={onClose} aria-label="Dismiss">
        <X size={14} />
      </button>
      <div className="kb-popup-top">
        <span className="kb-popup-title">{popup.title}</span>
        {popup.source && <span className={`kb-src kb-src-${popup.source}`}>{SOURCE_LABEL[popup.source]}</span>}
      </div>
      <p className="kb-popup-detail">{popup.detail}</p>
      {popup.action && (
        <button className="kb-insight-action" onClick={runAction}>
          {popup.action.label} <ArrowRight size={13} strokeWidth={2.2} />
        </button>
      )}
    </div>
  )
}
