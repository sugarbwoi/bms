/* ============================================================
   KUDII — Composer context
   One place to open every create/edit flow from anywhere.
   ============================================================ */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  CustomerForm,
  ProductForm,
  SaleComposer,
  TransactionForm,
  PaymentComposer,
  InvoiceComposer,
  RestockForm,
  AdjustStockForm,
  GoalForm,
  BusinessForm,
} from './forms'

export type ComposerName =
  | 'customer'
  | 'product'
  | 'sale'
  | 'income'
  | 'expense'
  | 'drawing'
  | 'payment'
  | 'invoice'
  | 'restock'
  | 'adjust'
  | 'goal'
  | 'business'

export interface ComposerParams {
  id?: string
  customer_id?: string
  product_id?: string
  sale_id?: string
  invoice_id?: string
  onDone?: (result?: any) => void
}

interface ComposerCtx {
  open: (name: ComposerName, params?: ComposerParams) => void
  close: () => void
}
const Ctx = createContext<ComposerCtx>({ open: () => {}, close: () => {} })
export const useComposer = () => useContext(Ctx)

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ name: ComposerName; params: ComposerParams } | null>(null)
  const open = useCallback((name: ComposerName, params: ComposerParams = {}) => setState({ name, params }), [])
  const close = useCallback(() => setState(null), [])
  const value = useMemo(() => ({ open, close }), [open, close])
  return (
    <Ctx.Provider value={value}>
      {children}
      {state && <Host name={state.name} params={state.params} onClose={close} />}
    </Ctx.Provider>
  )
}

function Host({ name, params, onClose }: { name: ComposerName; params: ComposerParams; onClose: () => void }) {
  const done = (r?: any) => {
    params.onDone?.(r)
    onClose()
  }
  switch (name) {
    case 'customer':
      return <CustomerForm params={params} onClose={onClose} onDone={done} />
    case 'product':
      return <ProductForm params={params} onClose={onClose} onDone={done} />
    case 'sale':
      return <SaleComposer params={params} onClose={onClose} onDone={done} />
    case 'income':
      return <TransactionForm kind="income" params={params} onClose={onClose} onDone={done} />
    case 'expense':
      return <TransactionForm kind="expense" params={params} onClose={onClose} onDone={done} />
    case 'drawing':
      return <TransactionForm kind="drawings" params={params} onClose={onClose} onDone={done} />
    case 'payment':
      return <PaymentComposer params={params} onClose={onClose} onDone={done} />
    case 'invoice':
      return <InvoiceComposer params={params} onClose={onClose} onDone={done} />
    case 'restock':
      return <RestockForm params={params} onClose={onClose} onDone={done} />
    case 'adjust':
      return <AdjustStockForm params={params} onClose={onClose} onDone={done} />
    case 'goal':
      return <GoalForm params={params} onClose={onClose} onDone={done} />
    case 'business':
      return <BusinessForm params={params} onClose={onClose} onDone={done} />
    default:
      return null
  }
}
