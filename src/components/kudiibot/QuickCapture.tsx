/* ============================================================
   KUDIIBot — Quick capture
   "Tell KUDII what happened." Plain words in, a compact
   confirmation out. Nothing is saved until the owner confirms.
   ============================================================ */
import { useMemo, useState } from 'react'
import { Sparkles, ArrowRight, Check, Pencil, X, AlertCircle } from 'lucide-react'
import { useDB, useToast } from '../../lib/hooks'
import { store } from '../../lib/store'
import { scope } from '../../lib/derive'
import { formatMoney, parseAmount } from '../../lib/utils'
import { parseCapture, commitDraft } from '../../lib/kudiibot'
import type { CaptureDraft } from '../../lib/kudiibot'
import { Button, Field, Input, Select } from '../ui'
import { VoiceButton } from './VoiceButton'

const EXAMPLES = [
  'Sold 3 bags of rice for 5000 to Ada',
  'Spent 2000 on transport',
  'Ada paid 5000',
  'Received 15000 for consultation',
  'Restocked 20 cartons of milk for 40000',
]

const KIND_LABEL: Record<string, string> = {
  sale: 'Sale',
  payment: 'Payment received',
  income: 'Income',
  expense: 'Expense',
  restock: 'Restock',
  unknown: 'Not sure yet',
}

export function QuickCapture({ onSaved }: { onSaved?: (msg: string) => void }) {
  const db = useDB()
  const biz = store.activeBusiness()!
  const toast = useToast()

  const [text, setText] = useState('')
  const [draft, setDraft] = useState<CaptureDraft | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const customers = useMemo(() => scope.customers(db, biz.id).filter((c) => c.status === 'active'), [db, biz.id])
  const products = useMemo(() => scope.products(db, biz.id).filter((p) => p.status === 'active'), [db, biz.id])

  const understand = (value?: string) => {
    const raw = (value ?? text).trim()
    setError('')
    if (!raw) return
    const d = parseCapture(raw, db, biz)
    setDraft(d)
  }

  const reset = () => {
    setDraft(null)
    setText('')
    setError('')
  }

  const save = () => {
    if (!draft) return
    setSaving(true)
    setError('')
    const res = commitDraft(draft, db, biz)
    setSaving(false)
    if (!res.ok) {
      setError(res.error || 'KUDII could not save that.')
      return
    }
    toast.push(res.wrote || 'Saved')
    onSaved?.(res.wrote || 'Saved')
    reset()
  }

  const patch = (p: Partial<CaptureDraft>) => setDraft((d) => (d ? { ...d, ...p } : d))

  /* ---------------- confirmation card ---------------- */
  if (draft) {
    const sure = draft.confidence >= 0.6
    const kindLabel = KIND_LABEL[draft.kind] || 'Record'
    return (
      <div className="kb-confirm">
        <div className="kb-confirm-head">
          <span className={`kb-chip kb-chip-${draft.kind}`}>
            <Sparkles size={12} strokeWidth={2.2} /> {kindLabel}
          </span>
          <button className="kb-x" onClick={reset} aria-label="Discard">
            <X size={15} />
          </button>
        </div>

        <p className="kb-confirm-summary">{draft.summary}</p>

        {!sure && draft.missing.length > 0 && (
          <div className="kb-note">
            <AlertCircle size={14} />
            <span>KUDII needs a little more before this is right.</span>
          </div>
        )}

        <div className="kb-confirm-fields">
          {draft.kind === 'sale' && (
            <>
              <Field label="Item">
                <Input
                  value={draft.items?.[0]?.description || ''}
                  onChange={(e) =>
                    patch({ items: [{ ...(draft.items?.[0] as any), description: e.target.value }] })
                  }
                  placeholder="What did you sell?"
                />
              </Field>
              <div className="kb-two">
                <Field label="Quantity">
                  <Input
                    type="number"
                    min="1"
                    value={String(draft.items?.[0]?.quantity ?? 1)}
                    onChange={(e) =>
                      patch({ items: [{ ...(draft.items?.[0] as any), quantity: Number(e.target.value) || 1 }] })
                    }
                  />
                </Field>
                <Field label="Total">
                  <Input
                    value={draft.amount != null ? String(draft.amount / 100) : ''}
                    onChange={(e) => {
                      const amt = parseAmount(e.target.value, biz.currency) || 0
                      const qty = draft.items?.[0]?.quantity || 1
                      patch({
                        amount: amt,
                        items: [{ ...(draft.items?.[0] as any), unit_price: Math.round(amt / qty) }],
                      })
                    }}
                    placeholder="0"
                  />
                </Field>
              </div>
              <Field label="Customer (optional)">
                <Select
                  value={draft.customer_id || ''}
                  onChange={(e) => {
                    const c = customers.find((x) => x.id === e.target.value)
                    patch({ customer_id: e.target.value || null, customer_name: c?.name || null })
                  }}
                >
                  <option value="">Walk-in / no customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}

          {draft.kind === 'payment' && (
            <>
              <Field label="Customer">
                <Select
                  value={draft.customer_id || ''}
                  onChange={(e) => {
                    const c = customers.find((x) => x.id === e.target.value)
                    patch({ customer_id: e.target.value || null, customer_name: c?.name || null })
                  }}
                >
                  <option value="">Choose a customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount">
                <Input
                  value={draft.amount != null ? String(draft.amount / 100) : ''}
                  onChange={(e) => patch({ amount: parseAmount(e.target.value, biz.currency) || 0 })}
                  placeholder="0"
                />
              </Field>
            </>
          )}

          {(draft.kind === 'income' || draft.kind === 'expense') && (
            <>
              <Field label={draft.kind === 'income' ? 'What for' : 'What for'}>
                <Input value={draft.description || ''} onChange={(e) => patch({ description: e.target.value })} placeholder="Description" />
              </Field>
              <Field label="Amount">
                <Input
                  value={draft.amount != null ? String(draft.amount / 100) : ''}
                  onChange={(e) => patch({ amount: parseAmount(e.target.value, biz.currency) || 0 })}
                  placeholder="0"
                />
              </Field>
            </>
          )}

          {draft.kind === 'restock' && (
            <>
              <Field label="Product">
                <Select
                  value={draft.product_id || ''}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value)
                    patch({ product_id: e.target.value || null, product_name: p?.name || null })
                  }}
                >
                  <option value="">Choose a product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quantity">
                <Input type="number" min="1" value={String(draft.quantity ?? 1)} onChange={(e) => patch({ quantity: Number(e.target.value) || 1 })} />
              </Field>
            </>
          )}

          {draft.kind === 'unknown' && (
            <p className="muted text-sm">
              Try something like <em>“sold 2 bags of rice for 5000”</em> or <em>“spent 2000 on fuel”</em>.
            </p>
          )}
        </div>

        {error && (
          <div className="kb-note kb-note-danger">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="kb-confirm-actions">
          <Button variant="ghost" size="sm" icon={Pencil} onClick={reset}>
            Start over
          </Button>
          <Button variant="primary" size="sm" icon={Check} loading={saving} disabled={draft.kind === 'unknown'} onClick={save}>
            Save
          </Button>
        </div>
      </div>
    )
  }

  /* ---------------- input state ---------------- */
  return (
    <div className="kb-capture">
      <div className="kb-capture-box">
        <Sparkles size={16} className="kb-capture-ic" />
        <input
          className="kb-capture-input"
          value={text}
          placeholder="Tell KUDII what happened…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') understand()
          }}
          aria-label="Tell KUDII what happened"
        />
        <VoiceButton onResult={(t) => { setText(t); understand(t) }} onError={(m) => setError(m)} />
        <button className="kb-go" onClick={() => understand()} aria-label="Understand" disabled={!text.trim()}>
          <ArrowRight size={16} strokeWidth={2.2} />
        </button>
      </div>

      {error && (
        <div className="kb-note kb-note-danger">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="kb-examples">
        {EXAMPLES.map((ex) => (
          <button key={ex} className="kb-example" onClick={() => { setText(ex); understand(ex) }}>
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}
