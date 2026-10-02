/* ============================================================
   KUDII — Activity
   A calm, complete history of everything that happened in the
   business. Every entry is generated from a real event.
   ============================================================ */
import { useMemo, useState } from 'react'
import {
  Activity as ActivityIcon,
  Search as SearchIcon,
  ShoppingCart,
  Briefcase,
  CircleDollarSign,
  FileText,
  Package,
  UserPlus,
  Target,
  Undo2,
  Ban,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import { useDB } from '../lib/hooks'
import { store } from '../lib/store'
import { PageHead } from '../components/shell'
import { SearchInput, Segmented, EmptyState, SectionCard, Badge } from '../components/ui'
import { scope } from '../lib/derive'
import { formatDateTime, timeAgo, startOfDay, daysAgo } from '../lib/utils'
import type { Activity as ActivityRow } from '../lib/types'

type Filter = 'all' | 'money' | 'sales' | 'jobs' | 'invoices' | 'products' | 'customers' | 'other'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'money', label: 'Money' },
  { value: 'sales', label: 'Sales' },
  { value: 'jobs', label: 'Jobs' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'products', label: 'Products' },
  { value: 'customers', label: 'Customers' },
]

const GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'Earlier'] as const
type Group = (typeof GROUP_ORDER)[number]

function groupFor(iso: string): Group {
  const t = new Date(iso).getTime()
  const today = new Date(startOfDay()).getTime()
  if (t >= today) return 'Today'
  if (t >= today - 864e5) return 'Yesterday'
  if (t >= new Date(daysAgo(7)).getTime()) return 'This week'
  return 'Earlier'
}

function matchesFilter(type: string, f: Filter): boolean {
  if (f === 'all') return true
  if (f === 'money') return type.startsWith('payment') || type.startsWith('income') || type.startsWith('expense') || type.startsWith('drawings') || type.startsWith('refund') || type.startsWith('reversal')
  if (f === 'sales') return type.startsWith('sale')
  if (f === 'jobs') return type.startsWith('job')
  if (f === 'invoices') return type.startsWith('invoice')
  if (f === 'products') return type.startsWith('product') || type.startsWith('stock')
  if (f === 'customers') return type.startsWith('customer')
  return true
}

function iconFor(type: string) {
  if (type.startsWith('sale.created')) return ShoppingCart
  if (type.startsWith('sale.cancelled')) return Ban
  if (type.startsWith('job')) return Briefcase
  if (type.startsWith('payment')) return CircleDollarSign
  if (type.startsWith('invoice')) return FileText
  if (type.startsWith('product') || type.startsWith('stock')) return Package
  if (type.startsWith('customer')) return UserPlus
  if (type.startsWith('goal')) return Target
  if (type.startsWith('refund') || type.startsWith('reversal')) return Undo2
  if (type.startsWith('income')) return ArrowDownLeft
  if (type.startsWith('expense') || type.startsWith('drawings')) return ArrowUpRight
  return ActivityIcon
}

function toneFor(type: string): { bg: string; color: string } {
  if (type.startsWith('payment') || type.startsWith('income')) return { bg: 'var(--success-soft)', color: 'var(--success)' }
  if (type.startsWith('expense') || type.startsWith('drawings') || type.startsWith('refund') || type.startsWith('reversal')) return { bg: 'var(--danger-soft)', color: 'var(--danger)' }
  if (type.startsWith('invoice')) return { bg: 'var(--info-soft, var(--accent-soft))', color: 'var(--info, var(--accent))' }
  return { bg: 'var(--surface-2)', color: 'var(--text-2)' }
}

export default function Activity() {
  const db = useDB()
  const biz = store.activeBusiness()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const businessId = biz?.id || ''

  const rows = useMemo(() => {
    let list = scope.activities(db, businessId)
    list = list.filter((a) => matchesFilter(a.type, filter))
    list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((a) => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
    return list
  }, [db, businessId, filter, query])

  const grouped = useMemo(() => {
    const map: Record<Group, ActivityRow[]> = { Today: [], Yesterday: [], 'This week': [], Earlier: [] }
    for (const a of rows) map[groupFor(a.created_at)].push(a)
    return map
  }, [rows])

  const todayCount = scope.activities(db, businessId).filter((a) => groupFor(a.created_at) === 'Today').length

  return (
    <div className="stack gap-6">
      <PageHead
        title="Activity"
        sub="Everything that has happened — in order, and impossible to lose."
        actions={
          <Badge tone="neutral" dot>
            {todayCount} event{todayCount === 1 ? '' : 's'} today
          </Badge>
        }
      />

      <div className="row gap-3 wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search activity…" className="grow" />
        <Segmented value={filter} onChange={setFilter} options={FILTERS} />
      </div>

      {rows.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={query || filter !== 'all' ? SearchIcon : Sparkles}
            title={query || filter !== 'all' ? 'No matching activity' : 'Your history starts here'}
            message={
              query || filter !== 'all'
                ? 'Try a different filter or search term.'
                : 'As you record sales, jobs, payments, and expenses, everything shows up here automatically.'
            }
          />
        </SectionCard>
      ) : (
        <div className="stack gap-6">
          {GROUP_ORDER.map((g) => {
            const items = grouped[g]
            if (!items.length) return null
            return (
              <SectionCard key={g} title={g}>
                <div className="timeline">
                  {items.map((a) => {
                    const Icon = iconFor(a.type)
                    const tone = toneFor(a.type)
                    return (
                      <div className="tl-item" key={a.id}>
                        <span className="tl-ic" style={{ background: tone.bg, color: tone.color }}>
                          <Icon size={15} strokeWidth={2} />
                        </span>
                        <div className="tl-body">
                          <div className="tl-title">{a.title}</div>
                          {a.description && <div className="tl-meta">{a.description}</div>}
                          <div className="tl-meta">{timeAgo(a.created_at)} · {formatDateTime(a.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </SectionCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
