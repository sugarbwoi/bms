/* ============================================================
   KUDII — Products & Inventory
   Products with a controlled stock balance backed by immutable
   stock movements. You never type a new balance silently —
   every change is a recorded movement with a reason.
   ============================================================ */
import { useMemo, useState } from 'react'
import {
  Package,
  Plus,
  ArrowLeft,
  MoreVertical,
  Pencil,
  Archive,
  ArchiveRestore,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  AlertTriangle,
  Search as SearchIcon,
  TrendingUp,
  Upload,
} from 'lucide-react'
import { useDB, useConfirm, useToast, useUser } from '../lib/hooks'
import { store } from '../lib/store'
import { navigate } from '../lib/router'
import { useComposer } from '../components/composer-context'
import { BulkProductImport } from '../components/BulkProductImport'
import { PageHead } from '../components/shell'
import { planOf, usage } from '../lib/derive'
import { PLANS } from '../lib/plans'
import {
  Button,
  IconButton,
  SearchInput,
  Segmented,
  Badge,
  EmptyState,
  SectionCard,
  Menu,
  MenuItem,
  KV,
  ProgressBar,
} from '../components/ui'
import { scope, isLowStock, lowStockProducts, inventoryValue } from '../lib/derive'
import { formatMoney, formatDate, formatDateTime, timeAgo } from '../lib/utils'
import type { Product, StockMovement } from '../lib/types'

export default function Products({ id }: { id?: string }) {
  if (id) return <ProductDetail id={id} />
  return <ProductList />
}

/* ============================================================
   LIST
   ============================================================ */
function ProductList() {
  const db = useDB()
  const biz = store.activeBusiness()
  const composer = useComposer()
  const user = useUser()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'all' | 'low' | 'archived'>('all')
  const [bulkOpen, setBulkOpen] = useState(false)

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'

  const all = scope.products(db, businessId)
  const low = lowStockProducts(db, businessId)

  const plan = biz ? planOf(db, biz.id) : 'free'
  const limit = PLANS[plan].limits.products
  const use = user ? usage(db, businessId, user.id) : null
  const atLimit = limit !== null && !!use && use.products >= limit

  const products = useMemo(() => {
    let list = all.filter((p) => p.status === 'active')
    if (tab === 'low') list = low
    if (tab === 'archived') list = all.filter((p) => p.status === 'archived')
    list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((p) => p.name.toLowerCase().includes(q))
  }, [db, businessId, query, tab])

  const invValue = inventoryValue(db, businessId)

  return (
    <div className="stack gap-6">
      <PageHead
        title="Products"
        sub="What you sell, what it costs, and what's in stock."
        actions={
          <div className="row gap-2 wrap">
            <Button variant="soft" icon={Upload} onClick={() => setBulkOpen(true)}>
              Bulk add
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => composer.open('product')}>
              Add product
            </Button>
          </div>
        }
      />

      <div className="pulse-grid">
        <div className="pulse-card">
          <span className="ic neutral">
            <Package size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{all.filter((p) => p.status === 'active').length}</div>
          <div className="l">Active products</div>
        </div>
        <div className="pulse-card">
          <span className="ic due">
            <AlertTriangle size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{low.length}</div>
          <div className="l">Low on stock</div>
        </div>
        <div className="pulse-card">
          <span className="ic in">
            <TrendingUp size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{formatMoney(invValue, currency)}</div>
          <div className="l">Stock value (at cost)</div>
        </div>
        <div className="pulse-card">
          <span className="ic out">
            <Boxes size={18} strokeWidth={2.2} />
          </span>
          <div className="v num">{all.reduce((a, p) => a + p.stock_quantity, 0)}</div>
          <div className="l">Total units</div>
        </div>
      </div>

      {limit !== null && use && (
        <div className="row-between" style={{ gap: 12, flexWrap: 'wrap' }}>
          <span className="text-sm muted">
            {use.products} of {limit} products on {PLANS[plan].name}
            {atLimit ? ' — limit reached' : ''}
          </span>
          {atLimit && (
            <Button variant="soft" size="sm" onClick={() => navigate('/settings?tab=plan')}>
              Upgrade for more
            </Button>
          )}
        </div>
      )}

      <div className="row gap-3 wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search products…" className="grow" />
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: 'All' },
            { value: 'low', label: `Low stock (${low.length})` },
            { value: 'archived', label: 'Archived' },
          ]}
        />
      </div>

      {products.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={query ? SearchIcon : Package}
            title={query ? 'No matches' : tab === 'low' ? 'Nothing is low on stock' : 'No products yet'}
            message={
              query
                ? 'Try a different search term.'
                : tab === 'low'
                  ? 'All your products are above their low-stock threshold.'
                  : 'Add your first product to track prices, costs and stock.'
            }
            action={
              !query && tab === 'all' ? (
                <div className="row gap-2 wrap" style={{ justifyContent: 'center' }}>
                  <Button variant="primary" icon={Plus} onClick={() => composer.open('product')}>
                    Add a product
                  </Button>
                  <Button variant="soft" icon={Upload} onClick={() => setBulkOpen(true)}>
                    Bulk add
                  </Button>
                </div>
              ) : undefined
            }
          />
        </SectionCard>
      ) : (
        <SectionCard padded={false}>
          <div className="list">
            {products.map((p) => (
              <button key={p.id} className="list-row" onClick={() => navigate(`/products/${p.id}`)}>
                <span className="tl-ic" style={{ width: 40, height: 40, borderRadius: 12 }}>
                  <Package size={18} strokeWidth={2} />
                </span>
                <span className="list-main">
                  <span className="list-title">
                    {p.name}
                    {isLowStock(p) && (
                      <span className="badge badge-warning" style={{ marginLeft: 8 }}>
                        Low
                      </span>
                    )}
                  </span>
                  <span className="list-sub">
                    {formatMoney(p.selling_price, currency)}
                  </span>
                </span>
                <span className="list-end">
                  <span className="num" style={{ fontWeight: 600 }}>
                    {p.stock_quantity}
                  </span>
                  <span className="text-xs muted">in stock</span>
                </span>
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      <BulkProductImport open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={() => setBulkOpen(false)} />
    </div>
  )
}

/* ============================================================
   DETAIL
   ============================================================ */
function ProductDetail({ id }: { id: string }) {
  const db = useDB()
  const biz = store.activeBusiness()
  const composer = useComposer()
  const confirm = useConfirm()
  const toast = useToast()

  const businessId = biz?.id || ''
  const currency = biz?.currency || 'NGN'

  const product = db.products.find((p) => p.id === id && p.business_id === businessId)

  if (!product) {
    return (
      <div className="stack gap-6">
        <PageHead title="Product not found" sub="This product may have been removed." />
        <SectionCard>
          <EmptyState
            icon={Package}
            title="We couldn't find that product"
            message="It may have been deleted or belongs to another business."
            action={
              <Button variant="primary" onClick={() => navigate('/products')}>
                Back to products
              </Button>
            }
          />
        </SectionCard>
      </div>
    )
  }

  const movements = scope
    .movements(db, businessId)
    .filter((m) => m.product_id === product.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const sold = movements.filter((m) => m.type === 'sale').reduce((a, m) => a + Math.abs(m.quantity), 0)
  const restocked = movements.filter((m) => m.type === 'restock').reduce((a, m) => a + m.quantity, 0)
  const margin = product.selling_price - product.cost_price
  const marginPct = product.selling_price > 0 ? Math.round((margin / product.selling_price) * 100) : 0
  const stockPct = product.low_stock_threshold > 0 ? Math.min(100, Math.round((product.stock_quantity / (product.low_stock_threshold * 4)) * 100)) : 100

  const archive = async () => {
    const next = product.status === 'active' ? 'archived' : 'active'
    const res = await confirm({
      title: next === 'archived' ? 'Archive this product?' : 'Restore this product?',
      message:
        next === 'archived'
          ? 'It will be hidden from your active products. Sales history is kept.'
          : 'It will appear in your active products again.',
      confirmLabel: next === 'archived' ? 'Archive' : 'Restore',
      danger: next === 'archived',
    })
    if (!res.confirmed) return
    store.setProductStatus(product.id, next)
    toast.push(next === 'archived' ? 'Product archived' : 'Product restored')
  }

  return (
    <div className="stack gap-6">
      <button className="link" onClick={() => navigate('/products')} style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={15} /> All products
      </button>

      <div className="detail-hero">
        <span className="tl-ic" style={{ width: 64, height: 64, borderRadius: 18 }}>
          <Package size={28} strokeWidth={1.8} />
        </span>
        <div className="grow" style={{ minWidth: 220 }}>
          <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'var(--fs-28)', letterSpacing: '-0.02em' }}>{product.name}</h1>
            {isLowStock(product) && (
              <Badge tone="warning" dot>
                Low stock
              </Badge>
            )}
            <Badge tone={product.status === 'active' ? 'success' : 'neutral'} dot>
              {product.status === 'active' ? 'Active' : 'Archived'}
            </Badge>
          </div>
          <div className="row gap-4 wrap mt-2" style={{ color: 'var(--text-2)', fontSize: 'var(--fs-13)' }}>
            <span>Sells for {formatMoney(product.selling_price, currency)}</span>
            {product.cost_price > 0 && <span>Costs {formatMoney(product.cost_price, currency)}</span>}
          </div>
        </div>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Button variant="soft" icon={ArrowDownToLine} onClick={() => composer.open('restock', { product_id: product.id })}>
            Restock
          </Button>
          <Button variant="primary" icon={SlidersHorizontal} onClick={() => composer.open('adjust', { product_id: product.id })}>
            Adjust stock
          </Button>
          <Menu align="right" trigger={({ toggle }) => <IconButton icon={MoreVertical} label="More" variant="ghost" onClick={toggle} />}>
            {(close) => (
              <>
                <MenuItem icon={Pencil} onClick={() => { composer.open('product', { id: product.id }); close() }}>
                  Edit product
                </MenuItem>
                <div className="menu-sep" />
                <MenuItem icon={product.status === 'active' ? Archive : ArchiveRestore} danger={product.status === 'active'} onClick={() => { archive(); close() }}>
                  {product.status === 'active' ? 'Archive product' : 'Restore product'}
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      </div>

      <div className="grid-main">
        <SectionCard title="Stock movements" action={<Badge tone="info">{movements.length} records</Badge>}>
          {movements.length === 0 ? (
            <p className="muted text-sm">No stock movements yet. Restock this product to begin.</p>
          ) : (
            <div className="list">
              {movements.map((m) => (
                <MovementRow key={m.id} m={m} />
              ))}
            </div>
          )}
        </SectionCard>

        <div className="stack gap-5">
          <SectionCard title="Stock">
            <div className="row-between" style={{ alignItems: 'flex-end' }}>
              <div>
                <div className="stat-value lg num">{product.stock_quantity}</div>
                <div className="text-xs muted">units on hand</div>
              </div>
              <Badge tone={isLowStock(product) ? 'warning' : 'success'}>
                {isLowStock(product) ? 'Reorder soon' : 'Healthy'}
              </Badge>
            </div>
            <div className="mt-4">
              <ProgressBar value={stockPct} />
              <div className="row-between mt-2 text-xs muted">
                <span>Low-stock alert at {product.low_stock_threshold}</span>
                <span>{stockPct}%</span>
              </div>
            </div>
            <div className="divider" style={{ margin: 'var(--s-5) 0' }} />
            <dl className="kv">
              <KV label="Sold">{sold} units</KV>
              <KV label="Restocked">{restocked} units</KV>
              <KV label="Stock value">{formatMoney(product.stock_quantity * product.cost_price, currency)}</KV>
            </dl>
          </SectionCard>

          <SectionCard title="Pricing">
            <dl className="kv">
              <KV label="Selling price">{formatMoney(product.selling_price, currency)}</KV>
              <KV label="Cost price">{formatMoney(product.cost_price, currency)}</KV>
              <KV label="Margin">
                <span style={{ color: margin >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {formatMoney(margin, currency)} ({marginPct}%)
                </span>
              </KV>
              <KV label="Added">{formatDate(product.created_at)}</KV>
            </dl>
            {product.description && (
              <div className="mt-4">
                <div className="eyebrow">Description</div>
                <p className="text-sm muted mt-1">{product.description}</p>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

function MovementRow({ m }: { m: StockMovement }) {
  const labels: Record<string, string> = {
    sale: 'Sold',
    restock: 'Restocked',
    adjustment: 'Adjusted',
    cancellation: 'Sale cancelled',
    refund: 'Refunded',
  }
  const positive = m.quantity > 0
  const Icon = positive ? ArrowUpFromLine : ArrowDownToLine
  const tone = positive ? 'var(--success)' : 'var(--danger)'
  return (
    <div className="list-row static">
      <span className="tl-ic" style={{ width: 34, height: 34, background: positive ? 'var(--success-soft)' : 'var(--danger-soft)', color: tone }}>
        <Icon size={16} strokeWidth={2} />
      </span>
      <span className="list-main">
        <span className="list-title">{labels[m.type] || m.type}</span>
        <span className="list-sub">
          {m.reason}
          {m.reason ? ' · ' : ''}
          {timeAgo(m.created_at)}
        </span>
      </span>
      <span className="list-end">
        <span className="num" style={{ fontWeight: 600, color: tone }}>
          {positive ? '+' : ''}
          {m.quantity}
        </span>
        <span className="text-xs muted">→ {m.balance_after}</span>
      </span>
    </div>
  )
}
